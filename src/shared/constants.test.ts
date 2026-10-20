import { APP_NAME } from '@shared/constants';

test('resolves shared modules through the @shared alias', () => {
  expect(APP_NAME).toBe('GitHub Explorer');
});
