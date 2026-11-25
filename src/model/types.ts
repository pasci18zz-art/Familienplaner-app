/**
 * Gemeinsames Datenmodell.
 * Später als eigenes Paket mit School OS geteilt (Event, Exam, Lesson).
 *
 * Jeder Eintrag ist ein eigenes Dokument mit eindeutiger ID, Besitzer,
 * Änderungszeit und Lösch-Markierung. Das brauchen beide Sync-Wege
 * (Firebase oder OneDrive), damit sich Änderungen nicht überschreiben.
 */

export type PersonId = 'papa' | 'mama' | 'pascal';
export type Target = PersonId | 'alle';

export interface Entity {
  id: string;
  /** Wer den Eintrag angelegt hat. Nur diese Person darf Termine ändern. */
  ownerId: PersonId;
  /** Millisekunden seit 1970, für "neueste Änderung gewinnt". */
  updatedAt: number;
  /** Gelöschte Einträge bleiben als Markierung, damit andere Geräte es mitbekommen. */
  deleted?: boolean;
}

export type EventIcon =
  | 'termin' | 'arzt' | 'urlaub' | 'frei' | 'schule'
  | 'arbeit' | 'sport' | 'cake' | 'auto';

export interface CalendarEvent extends Entity {
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** Letzter Tag bei mehrtägigen Einträgen (YYYY-MM-DD). */
  endDate?: string;
  allDay: boolean;
  /** HH:MM */
  start?: string;
  end?: string;
  /** Für wen der Termin ist. */
  person: Target;
  icon: EventIcon;
  recur?: 'weekly';
  /** Andere sehen nur "Belegt". */
  private?: boolean;
  /** "schoolos" = aus der Schul-App, für alle nur lesbar. */
  source?: 'familienplaner' | 'schoolos';
  exam?: boolean;
}

/** Ein einfaches Textfeld pro Tag. Kein Essensplan, keine Rezepte. ID = Datum. */
export interface Meal extends Entity {
  date: string;
  text: string;
}

export interface Store extends Entity {
  name: string;
  order: number;
}

/** Einkaufsartikel. ownerId wird gespeichert, aber nie angezeigt. */
export interface ShoppingItem extends Entity {
  storeId: string;
  text: string;
  done: boolean;
}

export interface Todo extends Entity {
  person: PersonId;
  text: string;
  done: boolean;
}

export interface Note extends Entity {
  text: string;
  /** YYYY-MM-DD */
  createdAt: string;
}

export interface Collections {
  events: CalendarEvent;
  meals: Meal;
  stores: Store;
  items: ShoppingItem;
  todos: Todo;
  notes: Note;
}

export type CollectionName = keyof Collections;
export const COLLECTIONS: CollectionName[] = ['events', 'meals', 'stores', 'items', 'todos', 'notes'];

export interface BackupFile {
  app: 'familienplaner';
  version: 1;
  exportedAt: string;
  data: { [K in CollectionName]: Collections[K][] };
}
