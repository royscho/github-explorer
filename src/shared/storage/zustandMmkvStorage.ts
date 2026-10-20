import type { StateStorage } from 'zustand/middleware';

import { mmkv } from './mmkv';

export const zustandMmkvStorage: StateStorage = {
  getItem: name => mmkv.getString(name) ?? null,
  setItem: (name, value) => {
    mmkv.set(name, value);
  },
  removeItem: name => {
    mmkv.delete(name);
  },
};
