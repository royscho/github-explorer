import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';

import { Screen } from './Screen';
import { TopInsetConsumedProvider } from './TopInsetContext';

type Edge = 'top' | 'bottom' | 'left' | 'right';
const ALL_EDGES: Edge[] = ['top', 'right', 'bottom', 'left'];

// `SafeAreaView` resolves the `edges` array it's given into a per-edge `'additive' | 'off'` map
// before it reaches the underlying native view — which is what `getByTestId('screen').props.edges`
// actually returns, not the array `Screen` passed in. Asserting against that map is a stronger
// check than asserting the array would have been: it pins what really reaches the native layer.
function edgeConfig(
  included: ReadonlyArray<Edge>,
): Record<Edge, 'additive' | 'off'> {
  return Object.fromEntries(
    ALL_EDGES.map(edge => [edge, included.includes(edge) ? 'additive' : 'off']),
  ) as Record<Edge, 'additive' | 'off'>;
}

function renderScreen(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Screen', () => {
  it('applies the default top/left/right edges', async () => {
    await renderScreen(
      <Screen>
        <Text>content</Text>
      </Screen>,
    );
    expect(screen.getByTestId('screen').props.edges).toEqual(
      edgeConfig(['top', 'left', 'right']),
    );
  });

  it('respects a custom edges prop', async () => {
    await renderScreen(
      <Screen edges={['left', 'right', 'bottom']}>
        <Text>content</Text>
      </Screen>,
    );
    expect(screen.getByTestId('screen').props.edges).toEqual(
      edgeConfig(['left', 'right', 'bottom']),
    );
  });

  // Something above this screen (an offline banner, say) has already applied the top inset — see
  // `TopInsetContext.tsx` for why `Screen` must not apply it a second time.
  it('drops the top edge when something above it has already consumed the inset', async () => {
    await renderScreen(
      <TopInsetConsumedProvider consumed>
        <Screen>
          <Text>content</Text>
        </Screen>
      </TopInsetConsumedProvider>,
    );
    expect(screen.getByTestId('screen').props.edges).toEqual(
      edgeConfig(['left', 'right']),
    );
  });

  it('keeps the top edge when nothing above it has consumed the inset', async () => {
    await renderScreen(
      <TopInsetConsumedProvider consumed={false}>
        <Screen>
          <Text>content</Text>
        </Screen>
      </TopInsetConsumedProvider>,
    );
    expect(screen.getByTestId('screen').props.edges).toEqual(
      edgeConfig(['top', 'left', 'right']),
    );
  });

  // `RepoDetailsScreen` already excludes `'top'` from its own `edges` prop directly (a native-stack
  // header owns that space unconditionally, not just while something else happens to be showing) —
  // this pins that filtering a non-present edge is a no-op, so the context would be harmless there
  // even though it isn't actually used there.
  it('is a no-op filtering an edge that is not present', async () => {
    await renderScreen(
      <TopInsetConsumedProvider consumed>
        <Screen edges={['left', 'right', 'bottom']}>
          <Text>content</Text>
        </Screen>
      </TopInsetConsumedProvider>,
    );
    expect(screen.getByTestId('screen').props.edges).toEqual(
      edgeConfig(['left', 'right', 'bottom']),
    );
  });
});
