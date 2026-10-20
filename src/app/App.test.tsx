import React from 'react';
import { render, screen } from '@testing-library/react-native';
import App from './App';
import { APP_NAME } from '@shared/constants';

test('renders the app name', async () => {
  await render(<App />);

  expect(screen.getByText(APP_NAME)).toBeOnTheScreen();
});
