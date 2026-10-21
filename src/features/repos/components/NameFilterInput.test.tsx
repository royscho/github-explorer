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

  it('does not show a clear button when the input is empty', async () => {
    await renderInput({ value: '' });
    expect(screen.queryByRole('button', { name: 'Clear filter' })).toBeNull();
  });

  it('shows a clear button when the input has text, and clears it on press', async () => {
    const onChangeText = jest.fn();
    await renderInput({ value: 'react', onChangeText });
    const clearButton = await screen.findByRole('button', {
      name: 'Clear filter',
    });
    await userEvent.press(clearButton);
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  // DESIGN §14: 44pt minimum touch target, made up of the 18pt icon plus 18 + 8 of slop.
  // Asserted as a whole object rather than as arithmetic: `right` is capped at the 8pt gap to the
  // wrapper's edge because slop never extends past the parent's bounds, so a larger value here
  // would look like a wider target while actually being clipped back to this one.
  it('gives the clear button a 44pt-wide touch target', async () => {
    await renderInput({ value: 'react' });
    const clearButton = await screen.findByRole('button', {
      name: 'Clear filter',
    });
    expect(clearButton.props.hitSlop).toEqual({
      top: 8,
      bottom: 8,
      left: 18,
      right: 8,
    });
  });
});
