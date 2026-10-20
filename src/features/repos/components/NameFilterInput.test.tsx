import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';

import { NameFilterInput } from './NameFilterInput';

function renderInput(
  props: Partial<React.ComponentProps<typeof NameFilterInput>> = {},
) {
  return render(
    <ThemeProvider>
      <NameFilterInput
        value={props.value ?? ''}
        onChangeText={props.onChangeText ?? jest.fn()}
      />
    </ThemeProvider>,
  );
}

describe('NameFilterInput', () => {
  it('has an accessible label', async () => {
    await renderInput();
    expect(
      await screen.findByLabelText('Filter repositories by name'),
    ).toBeOnTheScreen();
  });

  it('calls onChangeText with the typed characters', async () => {
    const onChangeText = jest.fn();
    await renderInput({ onChangeText });
    const input = await screen.findByLabelText('Filter repositories by name');
    await userEvent.type(input, 'react');
    // The field stays controlled at value="" across keystrokes (no parent state update here), so
    // each keystroke is simulated against that same baseline — the last call is the final
    // character typed, "t".
    expect(onChangeText).toHaveBeenCalledTimes(5);
    expect(onChangeText).toHaveBeenLastCalledWith('t');
  });
});
