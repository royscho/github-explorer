import { useNetworkStore } from './networkStore';

describe('useNetworkStore', () => {
  beforeEach(() => {
    useNetworkStore.setState({
      isOnline: true,
      connectionType: 'unknown',
      isExpensive: false,
    });
  });

  it('defaults to online with an unknown connection type', () => {
    const state = useNetworkStore.getState();
    expect(state.isOnline).toBe(true);
    expect(state.connectionType).toBe('unknown');
    expect(state.isExpensive).toBe(false);
  });

  it('setNetworkState maps a native NetworkState onto the store', () => {
    useNetworkStore.getState().setNetworkState({
      isConnected: false,
      connectionType: 'cellular',
      isExpensive: true,
    });

    const state = useNetworkStore.getState();
    expect(state.isOnline).toBe(false);
    expect(state.connectionType).toBe('cellular');
    expect(state.isExpensive).toBe(true);
  });
});
