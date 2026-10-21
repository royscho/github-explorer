import { create } from 'zustand';

import type { ConnectionType, NetworkState } from '../native';

export interface NetworkStoreValue {
  isOnline: boolean;
  connectionType: ConnectionType;
  isExpensive: boolean;
}

interface NetworkStoreState extends NetworkStoreValue {
  setNetworkState: (state: NetworkState) => void;
}

// Optimistic default: `isOnline: true` avoids flashing an offline banner for the brief window
// before the first real `getNetworkState()` call resolves at app start (§10.3).
const initialState: NetworkStoreValue = {
  isOnline: true,
  connectionType: 'unknown',
  isExpensive: false,
};

export const useNetworkStore = create<NetworkStoreState>()(set => ({
  ...initialState,
  setNetworkState: (state: NetworkState) =>
    set({
      isOnline: state.isConnected,
      connectionType: state.connectionType,
      isExpensive: state.isExpensive,
    }),
}));
