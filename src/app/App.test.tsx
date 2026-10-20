import React from 'react';
import { render, screen } from '@testing-library/react-native';
import App from './App';

test('renders the Explore screen inside navigation on launch', async () => {
  await render(<App />);

  expect(await screen.findByLabelText('Organization name')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /^Favorites/ })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /^Settings/ })).toBeOnTheScreen();
});
