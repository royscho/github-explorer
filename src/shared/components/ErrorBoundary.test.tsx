import React from 'react';
import { Text } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';
import { logger } from '@shared/logger';

import { ErrorBoundary } from './ErrorBoundary';

function Bomb({ shouldThrow }: { shouldThrow: boolean }): React.JSX.Element {
  if (shouldThrow) {
    throw new Error('kaboom');
  }
  return <Text>safe content</Text>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when nothing throws', async () => {
    await render(
      <ThemeProvider>
        <ErrorBoundary>
          <Bomb shouldThrow={false} />
        </ErrorBoundary>
      </ThemeProvider>,
    );
    expect(await screen.findByText('safe content')).toBeOnTheScreen();
  });

  it('renders a fallback and logs the error when a child throws', async () => {
    await render(
      <ThemeProvider>
        <ErrorBoundary>
          <Bomb shouldThrow />
        </ErrorBoundary>
      </ThemeProvider>,
    );
    expect(await screen.findByText('Something went wrong')).toBeOnTheScreen();
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it('resets and re-renders children when Restart is pressed', async () => {
    let shouldThrow = true;
    function FlakyBomb(): React.JSX.Element {
      if (shouldThrow) {
        throw new Error('kaboom');
      }
      return <Text>safe content</Text>;
    }

    await render(
      <ThemeProvider>
        <ErrorBoundary>
          <FlakyBomb />
        </ErrorBoundary>
      </ThemeProvider>,
    );
    const restart = await screen.findByRole('button', { name: 'Restart' });
    shouldThrow = false;
    await userEvent.press(restart);
    expect(await screen.findByText('safe content')).toBeOnTheScreen();
  });
});
