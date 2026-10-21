import { getLanguageColor } from './constants';

describe('getLanguageColor', () => {
  it('returns the mapped color for a known language', () => {
    expect(getLanguageColor('TypeScript')).toBe('#3178C6');
  });

  it('returns null for an unmapped language', () => {
    expect(getLanguageColor('COBOL')).toBeNull();
  });

  it('returns null when language is null', () => {
    expect(getLanguageColor(null)).toBeNull();
  });
});
