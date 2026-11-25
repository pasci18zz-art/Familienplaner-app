import { addDays, ymd } from './dates';

/** Ostersonntag (gregorianisch, Gauß/Meeus). */
function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}

const cache = new Map<number, Record<string, string>>();

/** Gesetzliche Feiertage in Hessen. Schulferien kommen später von OpenHolidays (DE-HE). */
function hessen(y: number) {
  const hit = cache.get(y);
  if (hit) return hit;
  const e = easter(y);
  const m: Record<string, string> = {};
  const add = (d: Date, n: string) => (m[ymd(d)] = n);
  add(new Date(y, 0, 1), 'Neujahr');
  add(addDays(e, -2), 'Karfreitag');
  add(addDays(e, 1), 'Ostermontag');
  add(new Date(y, 4, 1), 'Tag der Arbeit');
  add(addDays(e, 39), 'Christi Himmelfahrt');
  add(addDays(e, 50), 'Pfingstmontag');
  add(addDays(e, 60), 'Fronleichnam');
  add(new Date(y, 9, 3), 'Tag der Deutschen Einheit');
  add(new Date(y, 11, 25), '1. Weihnachtstag');
  add(new Date(y, 11, 26), '2. Weihnachtstag');
  cache.set(y, m);
  return m;
}

export const holidayOn = (s: string): string | null => hessen(+s.slice(0, 4))[s] ?? null;
