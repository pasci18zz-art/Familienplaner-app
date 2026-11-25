import { useSyncExternalStore } from 'react';
import { Preferences } from '@capacitor/preferences';
import type { CollectionName, Collections, PersonId, Store } from '../model/types';
import { LocalRepository } from './localRepository';
import type { Repository } from './repository';

/**
 * Hier wird festgelegt, welcher Speicher benutzt wird.
 * Für den Sync später einfach austauschen, z. B. `new FirestoreRepository()`.
 */
export const repo: Repository = new LocalRepository();

export function useList<K extends CollectionName>(name: K): Collections[K][] {
  return useSyncExternalStore(
    (cb) => repo.subscribe(name, cb),
    () => repo.list(name),
  );
}

export const newId = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

/** Feste IDs, damit nach dem Sync keine doppelten Geschäfte entstehen. */
const DEFAULT_STORES = ['Norma', 'Aldi', 'Thomas Philipps', 'Edeka', 'Rewe', 'dm', 'Lidl', 'Netto', 'Rossmann'];
export const storeIdFor = (name: string) =>
  name.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function seedIfEmpty(owner: PersonId) {
  const { value } = await Preferences.get({ key: 'seeded' });
  if (value) return;
  if (repo.list('stores').length === 0) {
    for (const [i, name] of DEFAULT_STORES.entries()) {
      const s: Store = { id: storeIdFor(name), name, order: i, ownerId: owner, updatedAt: 0 };
      await repo.put('stores', s);
    }
  }
  await Preferences.set({ key: 'seeded', value: '1' });
}

/* ---------- Einstellungen nur für dieses Gerät (werden nicht synchronisiert) ---------- */

export type DeviceMode = 'auto' | 'phone' | 'tablet';
export interface DeviceSettings {
  me: PersonId | null;
  mode: DeviceMode;
  privateDefault: boolean;
  lastStore: string | null;
}

const DEVICE_KEY = 'device';
let device: DeviceSettings = { me: null, mode: 'auto', privateDefault: false, lastStore: null };
const deviceListeners = new Set<() => void>();

export async function loadDevice() {
  try {
    const { value } = await Preferences.get({ key: DEVICE_KEY });
    if (value) device = { ...device, ...JSON.parse(value) };
  } catch {
    /* Standardwerte behalten */
  }
}

export function setDevice(patch: Partial<DeviceSettings>) {
  device = { ...device, ...patch };
  deviceListeners.forEach((cb) => cb());
  void Preferences.set({ key: DEVICE_KEY, value: JSON.stringify(device) });
}

export function useDevice(): DeviceSettings {
  return useSyncExternalStore(
    (cb) => {
      deviceListeners.add(cb);
      return () => deviceListeners.delete(cb);
    },
    () => device,
  );
}
