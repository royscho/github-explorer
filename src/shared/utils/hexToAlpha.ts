const HEX_PATTERN = /^#?([0-9a-fA-F]{6})$/;

export function hexToAlpha(hex: string, alpha: number): string {
  const match = HEX_PATTERN.exec(hex);
  if (!match) {
    throw new Error(`hexToAlpha: expected a 6-digit hex color, got "${hex}"`);
  }

  const value = match[1];
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
