import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';

import { ErrorView } from './ErrorView';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('ErrorView', () => {
  it('renders the message', async () => {
    await renderWithTheme(<ErrorView message="Something went wrong" />);
    expect(await screen.findByText('Something went wrong')).toBeOnTheScreen();
  });

  it('renders no Retry button when onRetry is omitted', async () => {
    await renderWithTheme(<ErrorView message="Oops" />);
    await screen.findByText('Oops');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('calls onRetry when the Retry button is pressed', async () => {
    const onRetry = jest.fn();
    await renderWithTheme(<ErrorView message="Oops" onRetry={onRetry} />);
    const button = await screen.findByRole('button', { name: 'Retry' });
    await userEvent.press(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
