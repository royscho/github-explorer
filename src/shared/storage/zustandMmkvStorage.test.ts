import { zustandMmkvStorage } from './zustandMmkvStorage';

describe('zustandMmkvStorage', () => {
  it('returns null for a key that was never set', () => {
    expect(zustandMmkvStorage.getItem('never-set')).toBeNull();
  });

  it('persists a value that getItem then returns', () => {
    zustandMmkvStorage.setItem('favorites-storage', '{"state":{}}');
    expect(zustandMmkvStorage.getItem('favorites-storage')).toBe(
      '{"state":{}}',
    );
  });

  it('deletes a key so a later getItem returns null again', () => {
    zustandMmkvStorage.setItem('temp-key', 'value');
    zustandMmkvStorage.removeItem('temp-key');
    expect(zustandMmkvStorage.getItem('temp-key')).toBeNull();
  });
});
