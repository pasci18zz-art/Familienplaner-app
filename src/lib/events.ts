import type { CalendarEvent, PersonId, Target } from '../model/types';
import { diffDays } from './dates';

export function occurs(e: CalendarEvent, s: string) {
  if (e.recur === 'weekly') {
    const d = diffDays(e.date, s);
    return d >= 0 && d % 7 === 0;
  }
  if (e.endDate) return s >= e.date && s <= e.endDate;
  return e.date === s;
}

export function eventsOn(events: CalendarEvent[], s: string, person?: Target) {
  return events
    .filter((e) => occurs(e, s) && (!person || e.person === person))
    .sort((a, b) => (a.allDay ? 0 : 1) - (b.allDay ? 0 : 1) || (a.start ?? '').localeCompare(b.start ?? ''));
}

/** Private Termine anderer Personen erscheinen nur als "Belegt". */
export const isHidden = (e: CalendarEvent, me: PersonId) => !!e.private && e.ownerId !== me;

/** Nur eigene Termine dürfen geändert werden. Termine aus School OS sind nur lesbar. */
export const canEdit = (e: CalendarEvent, me: PersonId) => e.ownerId === me && e.source !== 'schoolos';

export const timeLabel = (e: CalendarEvent) => (e.allDay ? 'ganztägig' : e.start ?? '');
