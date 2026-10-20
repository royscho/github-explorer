import React from 'react';
import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';

import { OrgSearchInput } from './OrgSearchInput';

function renderInput(
  props: Partial<React.ComponentProps<typeof OrgSearchInput>> = {},
) {
  return render(
    <ThemeProvider>
      <OrgSearchInput
        value={props.value ?? ''}
        onChangeText={props.onChangeText ?? jest.fn()}
        onSubmit={props.onSubmit ?? jest.fn()}
      />
    </ThemeProvider>,
  );
}

describe('OrgSearchInput', () => {
  it('calls onChangeText with the typed characters', async () => {
    const onChangeText = jest.fn();
    await renderInput({ onChangeText });
    const input = await screen.findByLabelText('Organization name');
    await userEvent.type(input, 'facebook');
    // The field stays controlled at value="" across keystrokes (no parent state update here), so
    // each keystroke is simulated against that same baseline — the last call is the final
    // character typed, "k".
    expect(onChangeText).toHaveBeenLastCalledWith('k');
  });

  it('calls onSubmit when the Search button is pressed', async () => {
    const onSubmit = jest.fn();
    await renderInput({ value: 'facebook', onSubmit });
    const button = await screen.findByRole('button', { name: 'Search' });
    await userEvent.press(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls onSubmit on keyboard submit (onSubmitEditing)', async () => {
    const onSubmit = jest.fn();
    await renderInput({ value: 'facebook', onSubmit });
    const input = await screen.findByLabelText('Organization name');
    fireEvent(input, 'submitEditing');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('the Search button has an accessible role and label', async () => {
    await renderInput();
    expect(
      await screen.findByRole('button', { name: 'Search' }),
    ).toBeOnTheScreen();
  });

  it('does not show a clear button when the input is empty', async () => {
    await renderInput({ value: '' });
    expect(
      screen.queryByRole('button', { name: 'Clear organization name' }),
    ).toBeNull();
  });

  it('shows a clear button when the input has text, and clears it on press', async () => {
    const onChangeText = jest.fn();
    await renderInput({ value: 'facebook', onChangeText });
    const clearButton = await screen.findByRole('button', {
      name: 'Clear organization name',
    });
    await userEvent.press(clearButton);
    expect(onChangeText).toHaveBeenCalledWith('');
  });
});
