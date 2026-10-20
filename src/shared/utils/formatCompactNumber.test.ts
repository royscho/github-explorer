import { formatCompactNumber } from './formatCompactNumber';

describe('formatCompactNumber', () => {
  it('returns small numbers unchanged', () => {
    expect(formatCompactNumber(0)).toBe('0');
    expect(formatCompactNumber(999)).toBe('999');
  });

  it('formats thousands', () => {
    expect(formatCompactNumber(1000)).toBe('1k');
    expect(formatCompactNumber(12345)).toBe('12.3k');
  });

  it('formats millions', () => {
    expect(formatCompactNumber(1_200_000)).toBe('1.2m');
    expect(formatCompactNumber(220_000_000)).toBe('220m');
  });

  it('formats billions', () => {
    expect(formatCompactNumber(2_500_000_000)).toBe('2.5b');
  });

  it('handles negative numbers', () => {
    expect(formatCompactNumber(-12345)).toBe('-12.3k');
  });

  it('bumps to the next unit when rounding would otherwise overflow it', () => {
    expect(formatCompactNumber(999_950)).toBe('1m');
    expect(formatCompactNumber(999_950_000)).toBe('1b');
  });
});
