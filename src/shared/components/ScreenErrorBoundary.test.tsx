import React from 'react';
import { Text } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';

import { ThemeProvider } from '@shared/theme';
import { logger } from '@shared/logger';

import { ScreenErrorBoundary } from './ScreenErrorBoundary';

function Bomb({ shouldThrow }: { shouldThrow: boolean }): React.JSX.Element {
  if (shouldThrow) {
    throw new Error('kaboom');
  }
  return <Text>safe content</Text>;
}

function ThrowingQuery({
  queryFn,
}: {
  queryFn: () => Promise<string>;
}): React.JSX.Element {
  const { data } = useQuery({
    queryKey: ['screen-error-boundary-test'],
    queryFn,
    retry: false,
    throwOnError: true,
  });
  return <Text>{data}</Text>;
}

describe('ScreenErrorBoundary', () => {
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
        <ScreenErrorBoundary>
          <Bomb shouldThrow={false} />
        </ScreenErrorBoundary>
      </ThemeProvider>,
    );
    expect(await screen.findByText('safe content')).toBeOnTheScreen();
  });

  it('renders a fallback with Retry and logs the error when a child throws', async () => {
    await render(
      <ThemeProvider>
        <ScreenErrorBoundary>
          <Bomb shouldThrow />
        </ScreenErrorBoundary>
      </ThemeProvider>,
    );
    expect(await screen.findByText('Something went wrong')).toBeOnTheScreen();
    expect(
      await screen.findByRole('button', { name: 'Retry' }),
    ).toBeOnTheScreen();
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it('resets and re-renders children when Retry is pressed', async () => {
    let shouldThrow = true;
    function FlakyBomb(): React.JSX.Element {
      if (shouldThrow) {
        throw new Error('kaboom');
      }
      return <Text>safe content</Text>;
    }

    await render(
      <ThemeProvider>
        <ScreenErrorBoundary>
          <FlakyBomb />
        </ScreenErrorBoundary>
      </ThemeProvider>,
    );
    const retry = await screen.findByRole('button', { name: 'Retry' });
    shouldThrow = false;
    await userEvent.press(retry);
    expect(await screen.findByText('safe content')).toBeOnTheScreen();
  });

  it('resets a throwOnError query (not just its own state) when Retry is pressed', async () => {
    const queryFn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('recovered');
    const queryClient = new QueryClient();

    await render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ScreenErrorBoundary>
            <ThrowingQuery queryFn={queryFn} />
          </ScreenErrorBoundary>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    const retry = await screen.findByRole('button', { name: 'Retry' });
    await userEvent.press(retry);

    expect(await screen.findByText('recovered')).toBeOnTheScreen();
    expect(queryFn).toHaveBeenCalledTimes(2);
  });
});
