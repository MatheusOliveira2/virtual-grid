import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'my-component',
  styleUrl: 'my-component.css',
  shadow: true,
})
export class MyComponent {
  private items = Array.from({ length: 10000 }, (_, i) => i);

  private renderItemFunction(item) {
    return (
      <div>
        <img src={`https://picsum.photos/id/${item}/200`} />
      </div>
    );
  }

  render() {
    return (
      <Host>
        <virtual-grid renderItem={item => this.renderItemFunction(item)} items={this.items}></virtual-grid>
      </Host>
    );
  }
}
