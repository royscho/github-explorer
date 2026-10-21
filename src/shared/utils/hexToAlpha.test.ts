import { hexToAlpha } from './hexToAlpha';

describe('hexToAlpha', () => {
  it('converts a hex color and alpha into an rgba() string', () => {
    expect(hexToAlpha('#2F6FED', 0.12)).toBe('rgba(47, 111, 237, 0.12)');
  });

  it('accepts a hex color without a leading #', () => {
    expect(hexToAlpha('2F6FED', 0.12)).toBe('rgba(47, 111, 237, 0.12)');
  });

  it('is case-insensitive', () => {
    expect(hexToAlpha('#2f6fed', 0.12)).toBe('rgba(47, 111, 237, 0.12)');
  });

  it('throws for an invalid hex color', () => {
    expect(() => hexToAlpha('not-a-color', 0.12)).toThrow(
      'hexToAlpha: expected a 6-digit hex color, got "not-a-color"',
    );
  });
});
