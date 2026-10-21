import React, { createContext, useContext } from 'react';

const TopInsetConsumedContext = createContext(false);

export interface TopInsetConsumedProviderProps {
  /**
   * Whether something rendered above this subtree — a full-width banner, say — already occupies
   * the top safe-area inset. While `true`, `Screen` (via `useTopInsetConsumed`) drops `'top'` from
   * its own edges instead of applying the inset a second time.
   */
  consumed: boolean;
  children: React.ReactNode;
}

// Deliberately generic: `shared/` has no notion of what might be rendered above a `Screen` (an
// offline banner, say) — the feature that renders that thing is the one that knows when it's
// actually occupying the inset, and provides this. See `Screen.tsx`'s `edges` doc for why this
// exists at all: a `SafeAreaView` below something that already cleared the status bar would
// otherwise pad for it again, which is a no-op on Android (whose `SafeAreaView` measures real
// overlap with the window insets and self-corrects) but a visible blank band on iOS, whose
// `SafeAreaView` reads its inset from the root `SafeAreaProvider` regardless of where it sits.
export function TopInsetConsumedProvider({
  consumed,
  children,
}: TopInsetConsumedProviderProps): React.JSX.Element {
  return (
    <TopInsetConsumedContext.Provider value={consumed}>
      {children}
    </TopInsetConsumedContext.Provider>
  );
}

export function useTopInsetConsumed(): boolean {
  return useContext(TopInsetConsumedContext);
}
