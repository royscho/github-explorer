import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';

import { FavoriteButton } from './FavoriteButton';

async function renderButton(isFavorite: boolean, onPress = jest.fn()) {
  await render(
    <ThemeProvider>
      <FavoriteButton isFavorite={isFavorite} onPress={onPress} />
    </ThemeProvider>,
  );
  return onPress;
}

describe('FavoriteButton', () => {
  it('is labeled "Add to favorites" when not favorited', async () => {
    await renderButton(false);
    expect(
      screen.getByRole('button', { name: 'Add to favorites' }),
    ).toBeOnTheScreen();
  });

  it('is labeled "Remove from favorites" when favorited', async () => {
    await renderButton(true);
    expect(
      screen.getByRole('button', { name: 'Remove from favorites' }),
    ).toBeOnTheScreen();
  });

  it('calls onPress when pressed', async () => {
    const onPress = await renderButton(false);
    await userEvent.press(
      screen.getByRole('button', { name: 'Add to favorites' }),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
