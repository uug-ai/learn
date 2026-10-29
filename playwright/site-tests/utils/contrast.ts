import type { Locator } from '@playwright/test';

export async function textContrast(locator: Locator): Promise<number> {
  return locator.evaluate(element => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is required to measure text contrast');
    context.fillStyle = 'white';
    context.fillRect(0, 0, 1, 1);
    const ancestors: Element[] = [];
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
      ancestors.unshift(ancestor);
    }
    for (const ancestor of ancestors) {
      context.fillStyle = getComputedStyle(ancestor).backgroundColor;
      context.fillRect(0, 0, 1, 1);
    }
    const luminance = (pixels: Uint8ClampedArray): number => {
      const linear = Array.from(pixels.slice(0, 3), channel => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    const background = luminance(context.getImageData(0, 0, 1, 1).data);
    context.fillStyle = getComputedStyle(element).color;
    context.fillRect(0, 0, 1, 1);
    const foreground = luminance(context.getImageData(0, 0, 1, 1).data);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
}
