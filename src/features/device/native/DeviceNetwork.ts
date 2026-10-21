import type { EventSubscription } from 'react-native';

import NativeDeviceNetwork from '@specs/NativeDeviceNetwork';
import type { DeviceInfo, NetworkState } from '@specs/NativeDeviceNetwork';

export type {
  ConnectionType,
  DeviceInfo,
  NetworkState,
} from '@specs/NativeDeviceNetwork';

export function getNetworkState(): Promise<NetworkState> {
  return NativeDeviceNetwork.getNetworkState();
}

export function getDeviceInfo(): Promise<DeviceInfo> {
  return NativeDeviceNetwork.getDeviceInfo();
}

export function isLowPowerMode(): Promise<boolean> {
  return NativeDeviceNetwork.isLowPowerMode();
}

export function startNetworkMonitoring(): Promise<void> {
  return NativeDeviceNetwork.startNetworkMonitoring();
}

export function stopNetworkMonitoring(): Promise<void> {
  return NativeDeviceNetwork.stopNetworkMonitoring();
}

export function subscribeToNetworkStatus(
  listener: (state: NetworkState) => void,
): EventSubscription {
  return NativeDeviceNetwork.onNetworkStatusChanged(listener);
}
