import { Preferences } from '@capacitor/preferences';
import {
  COLLECTIONS,
  type BackupFile,
  type CollectionName,
  type Collections,
  type Entity,
} from '../model/types';
import type { Repository } from './repository';

const KEY = (n: CollectionName) => `col:${n}`;

type AnyEntity = Collections[CollectionName];

/**
 * Speichert jede Sammlung als JSON in den Android-SharedPreferences
 * (im Browser: localStorage). Funktioniert komplett offline.
 */
export class LocalRepository implements Repository {
  private maps = new Map<CollectionName, Map<string, AnyEntity>>();
  private views = new Map<CollectionName, AnyEntity[]>();
  private listeners = new Map<CollectionName, Set<() => void>>();
  private loading: Promise<void> | null = null;

  ready(): Promise<void> {
    if (!this.loading) this.loading = this.load();
    return this.loading;
  }

  private async load() {
    for (const n of COLLECTIONS) {
      const m = new Map<string, AnyEntity>();
      try {
        const { value } = await Preferences.get({ key: KEY(n) });
        if (value) for (const e of JSON.parse(value) as AnyEntity[]) m.set(e.id, e);
      } catch {
        /* beschädigte Daten ignorieren, Sammlung startet leer */
      }
      this.maps.set(n, m);
      this.rebuild(n);
    }
  }

  private rebuild(n: CollectionName) {
    this.views.set(n, [...this.maps.get(n)!.values()].filter((e) => !e.deleted));
  }

  private changed(n: CollectionName) {
    this.rebuild(n);
    this.listeners.get(n)?.forEach((cb) => cb());
    // Sofort speichern, damit nichts verloren geht, wenn Android die App beendet.
    void Preferences.set({ key: KEY(n), value: JSON.stringify([...this.maps.get(n)!.values()]) });
  }

  list<K extends CollectionName>(name: K): Collections[K][] {
    return (this.views.get(name) ?? []) as Collections[K][];
  }

  subscribe(name: CollectionName, cb: () => void) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name)!.add(cb);
    return () => {
      this.listeners.get(name)!.delete(cb);
    };
  }

  async put<K extends CollectionName>(name: K, entity: Collections[K]) {
    this.maps.get(name)!.set(entity.id, { ...entity, updatedAt: Date.now() });
    this.changed(name);
  }

  async remove(name: CollectionName, id: string) {
    const m = this.maps.get(name)!;
    const e = m.get(id);
    if (!e) return;
    m.set(id, { ...e, deleted: true, updatedAt: Date.now() } as AnyEntity);
    this.changed(name);
  }

  async exportAll(): Promise<BackupFile> {
    const data = {} as BackupFile['data'];
    for (const n of COLLECTIONS) (data as Record<string, Entity[]>)[n] = [...this.maps.get(n)!.values()];
    return { app: 'familienplaner', version: 1, exportedAt: new Date().toISOString(), data };
  }

  async importAll(file: BackupFile) {
    if (file?.app !== 'familienplaner' || !file.data) throw new Error('Das ist keine Familienplaner-Sicherung.');
    let added = 0;
    let updated = 0;
    for (const n of COLLECTIONS) {
      const incoming = (file.data[n] ?? []) as AnyEntity[];
      if (!incoming.length) continue;
      const m = this.maps.get(n)!;
      for (const e of incoming) {
        if (!e || typeof e.id !== 'string') continue;
        const cur = m.get(e.id);
        if (!cur) {
          m.set(e.id, e);
          added++;
        } else if ((e.updatedAt ?? 0) > (cur.updatedAt ?? 0)) {
          m.set(e.id, e);
          updated++;
        }
      }
      this.changed(n);
    }
    return { added, updated };
  }
}
