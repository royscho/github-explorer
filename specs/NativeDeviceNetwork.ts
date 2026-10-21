import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type ConnectionType =
  | 'none'
  | 'wifi'
  | 'cellular'
  | 'ethernet'
  | 'unknown';

export interface NetworkState {
  isConnected: boolean;
  connectionType: ConnectionType;
  isExpensive: boolean;
}

export interface DeviceInfo {
  model: string;
  osVersion: string;
  appVersion: string;
  buildNumber: string;
}

export interface Spec extends TurboModule {
  getNetworkState(): Promise<NetworkState>;
  getDeviceInfo(): Promise<DeviceInfo>;
  isLowPowerMode(): Promise<boolean>;
  startNetworkMonitoring(): Promise<void>;
  stopNetworkMonitoring(): Promise<void>;
  readonly onNetworkStatusChanged: CodegenTypes.EventEmitter<NetworkState>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('DeviceNetwork');
