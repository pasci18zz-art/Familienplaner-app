import type { BackupFile, CollectionName, Collections, PersonId } from '../model/types';

/**
 * Die einzige Stelle, über die die App Daten liest und schreibt.
 *
 * Heute: LocalRepository (nur auf diesem Gerät).
 * Später: FirestoreRepository oder OneDriveRepository mit derselben Schnittstelle.
 * Die Ansichten merken davon nichts.
 */
export interface Repository {
  /** Lädt gespeicherte Daten. Muss vor allem anderen fertig sein. */
  ready(): Promise<void>;

  /** Alle nicht gelöschten Einträge. Gleiche Referenz, solange sich nichts ändert. */
  list<K extends CollectionName>(name: K): Collections[K][];

  /** Wird bei jeder Änderung der Sammlung aufgerufen. Gibt eine Abmelde-Funktion zurück. */
  subscribe(name: CollectionName, cb: () => void): () => void;

  /** Legt an oder ersetzt. updatedAt wird automatisch gesetzt. */
  put<K extends CollectionName>(name: K, entity: Collections[K]): Promise<void>;

  /** Markiert als gelöscht (bleibt für den Sync als Markierung erhalten). */
  remove(name: CollectionName, id: string): Promise<void>;

  /** Komplette Sicherung inklusive Lösch-Markierungen. */
  exportAll(): Promise<BackupFile>;

  /** Führt eine Sicherung zusammen: pro Eintrag gewinnt die neuere Änderung. */
  importAll(file: BackupFile): Promise<{ added: number; updated: number }>;
}

export type { PersonId };
