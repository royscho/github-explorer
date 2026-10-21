import { useShallow } from 'zustand/react/shallow';

import { useNetworkStore } from '../store';
import type { NetworkStoreValue } from '../store';

export function useNetworkStatus(): NetworkStoreValue {
  return useNetworkStore(
    useShallow(state => ({
      isOnline: state.isOnline,
      connectionType: state.connectionType,
      isExpensive: state.isExpensive,
    })),
  );
}
