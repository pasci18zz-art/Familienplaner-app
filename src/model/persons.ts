import type { CSSProperties } from 'react';
import type { EventIcon, PersonId, Target } from './types';

export const PEOPLE: PersonId[] = ['papa', 'mama', 'pascal'];
export const TARGETS: Target[] = ['papa', 'mama', 'pascal', 'alle'];

export const PERSON: Record<Target, { name: string; fg: string; bg: string }> = {
  papa: { name: 'Papa', fg: 'var(--papa)', bg: 'var(--papa-bg)' },
  mama: { name: 'Mama', fg: 'var(--mama)', bg: 'var(--mama-bg)' },
  pascal: { name: 'Pascal', fg: 'var(--pascal)', bg: 'var(--pascal-bg)' },
  alle: { name: 'Alle', fg: 'var(--alle)', bg: 'var(--alle-bg)' },
};

/** CSS-Variablen für Vorder- und Hintergrundfarbe einer Person. */
export const pv = (p: Target): CSSProperties =>
  ({ '--fg-c': PERSON[p].fg, '--bg-c': PERSON[p].bg }) as CSSProperties;

export const BUSY_STYLE = { '--fg-c': 'var(--busy)', '--bg-c': 'var(--busy-bg)' } as CSSProperties;

export const EVENT_ICONS: [EventIcon, string][] = [
  ['termin', 'Termin'], ['arzt', 'Arzt'], ['urlaub', 'Urlaub'], ['frei', 'Frei'], ['schule', 'Schule'],
  ['arbeit', 'Arbeit'], ['sport', 'Sport'], ['cake', 'Geburtstag'], ['auto', 'Auto'],
];
