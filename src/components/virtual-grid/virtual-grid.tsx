import { Component, Element, Host, Prop, State, VNode, h, readTask } from '@stencil/core';

@Component({
  tag: 'virtual-grid',
  styleUrl: 'virtual-grid.css',
  shadow: true,
})
export class VirtualGrid {
  @Element() el: HTMLVirtualGridElement;

  private scrollContainer: HTMLDivElement;
  private resizeObserver: ResizeObserver;
  private gap = 10;
  private rowHeightsMap = new Map<number, number>();

  @State() scrollTop: number = 0;
  @State() containerHeight: number;
  @State() numberOfColumns: number;

  @Prop() renderItem: (index: number) => VNode;

  @Prop() items: any[] = [];

  @Prop() itemMaxWidth: number = 200;

  componentDidLoad() {
    this.resizeObserver = new ResizeObserver(() => {
      readTask(() => {
        this.calculateNumberOfColumns();
      });
    });

    this.resizeObserver.observe(this.el);

    this.containerHeight = this.el.clientHeight;
    this.scrollContainer.addEventListener('scroll', this.handleScroll);
    this.calculateNumberOfColumns();
  }

  componentDidRender() {
    if (!this.scrollContainer) return;

    // Seleciona todos os grid-items
    const items = this.scrollContainer.querySelectorAll('.grid-item');

    // Agrupa por linha
    const rowsMap = new Map<number, HTMLElement[]>();
    items.forEach((item: Element) => {
      const rowAttr = item.getAttribute('data-row');
      if (rowAttr !== null) {
        const row = Number(rowAttr);
        if (!rowsMap.has(row)) {
          rowsMap.set(row, []);
        }
        rowsMap.get(row)!.push(item as HTMLElement);
      }
    });

    // Para cada linha, pega a maior altura dos itens e salva no mapa
    rowsMap.forEach((elements, row) => {
      const rowHeight = Math.max(...elements.map(item => item.clientHeight));
      this.rowHeightsMap.set(row, rowHeight);
    });
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
  }

  private handleScroll = () => {
    this.scrollTop = this.scrollContainer.scrollTop;
  };

  private calculateNumberOfColumns() {
    readTask(() => {
      const containerWidth = this.el.clientWidth;
      const itemWidth = this.itemMaxWidth;
      const gap = this.gap;
      this.numberOfColumns = Math.floor((containerWidth + gap) / (itemWidth + gap));
      this.containerHeight = this.el.clientHeight;
    });
  }

  private getAverageRowHeight(): number {
    if (this.rowHeightsMap.size === 0) {
      return 100; // fallback inicial quando não há nenhuma linha medida
    }

    const heights = Array.from(this.rowHeightsMap.values());
    const sum = heights.reduce((acc, height) => acc + height, 0);
    return Math.round(sum / heights.length);
  }

  render() {
    const { gap, numberOfColumns, scrollTop, containerHeight } = this;
    const totalRows = Math.ceil(this.items.length / numberOfColumns);

    // 1. Calcule o topo acumulado de cada linha
    const rowTops: number[] = [];
    let acc = 0;
    for (let i = 0; i < totalRows; i++) {
      rowTops[i] = acc;
      const rowHeight = this.rowHeightsMap.get(i) ?? this.getAverageRowHeight(); // fallback para 100px se ainda não medido
      acc += rowHeight + gap;
    }
    const totalHeight = acc - gap; // Remove gap extra no final

    // 2. Descubra as linhas visíveis
    let firstVisibleRow = 0;
    let lastVisibleRow = totalRows - 1;
    for (let i = 0; i < totalRows; i++) {
      const rowHeight = this.rowHeightsMap.get(i) ?? this.getAverageRowHeight();
      if (rowTops[i] + rowHeight > scrollTop) {
        firstVisibleRow = i;
        break;
      }
    }
    for (let i = firstVisibleRow; i < totalRows; i++) {
      if (rowTops[i] > scrollTop + containerHeight) {
        lastVisibleRow = i;
        break;
      }
    }

    // 3. Calcule o paddingTop
    const paddingTop = rowTops[firstVisibleRow] || 0;

    // 4. Renderize apenas os itens das linhas visíveis
    const rows = [];
    for (let row = firstVisibleRow; row <= lastVisibleRow; row++) {
      const startIdx = row * numberOfColumns;
      const endIdx = Math.min(startIdx + numberOfColumns, this.items.length);
      rows.push(
        <div style={{ display: 'contents' }} key={row}>
          {this.items.slice(startIdx, endIdx).map((item, idx) => (
            <div class="grid-item" key={item} data-row={row} style={{ minHeight: `${100}px` }}>
              <div style={{ height: 'min-content' }}>{this.renderItem(startIdx + idx)}</div>
            </div>
          ))}
        </div>,
      );
    }

    return (
      <Host style={{ 'height': `100%`, 'overflow': 'auto', '--item-width': `${this.itemMaxWidth}px` }}>
        <div
          ref={el => (this.scrollContainer = el)}
          style={{
            position: 'relative',
            height: `100%`,
            overflowY: 'auto',
          }}
        >
          <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
            <div style={{ paddingTop: `${paddingTop}px` }} class="grid">
              {rows}
            </div>
          </div>
        </div>
      </Host>
    );
  }
}
