import { useLayoutEffect, useRef } from 'react';

/** Measure the current capacity envelope, rather than resizing on every sale. */
export function useProductionLayout(capacity: number, maximumSale: string) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const count = element.querySelector<HTMLElement>('.stock-count');
      const sale = element.querySelector<HTMLElement>('.sale-value');
      const button = element.querySelector<HTMLElement>('.sell-button');
      if (!count || !sale || !button) return;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      const width = (node: HTMLElement, text: string) => {
        const style = getComputedStyle(node);
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        return Math.ceil(context.measureText(text).width);
      };
      const digits = String(capacity).length;
      const stock = width(count, '8'.repeat(digits));
      const amount = Math.max(
        width(sale, maximumSale),
        width(sale, '8'.repeat(maximumSale.length)),
      );
      const compact = window.matchMedia('(max-width: 600px)').matches;
      const label = element.querySelector<HTMLElement>('.sell-button > span');
      const sell = Math.ceil(
        (label ? width(label, label.textContent) : 25) +
          amount +
          (compact ? 44 : 54),
      );
      // Two stock groups, their icons, gaps, padding and optional refinery track.
      const stockGroup =
        stock + width(count, `/${String(capacity)}`) + (compact ? 21 : 30);
      const readout = 2 * stockGroup + (compact ? 24 : 116);
      element.style.setProperty('--stock-width', `${String(stock)}px`);
      element.style.setProperty('--sale-width', `${String(sell)}px`);
      element.style.setProperty(
        '--production-width',
        `${String(readout + sell + 14)}px`,
      );
    };
    measure();
    window.addEventListener('resize', measure);
    let active = true;
    void document.fonts.ready.then(() => {
      if (active) measure();
    });
    return () => {
      active = false;
      window.removeEventListener('resize', measure);
    };
  }, [capacity, maximumSale]);
  return ref;
}
