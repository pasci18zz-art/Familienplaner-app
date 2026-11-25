import type { EventIcon, PersonId, Store, Target } from '../model/types';
import { addDays, pad, todayStr, ymd } from './dates';

/**
 * Regelparser für Sprachbefehle. Liefert immer nur einen Vorschlag,
 * gespeichert wird erst nach "Speichern" auf der Bestätigungskarte.
 */
export type ParseResult =
  | { kind: 'event'; title: string; date: string; endDate?: string; start?: string; end?: string; allDay: boolean; person: Target; icon: EventIcon }
  | { kind: 'shop'; items: string[]; storeId: string; unknownStore?: string }
  | { kind: 'todo'; text: string; person: PersonId }
  | { kind: 'note'; text: string }
  | { kind: 'query'; person: Target; date: string }
  | { kind: 'mealQuery'; date: string }
  | { kind: 'unknown' };

export interface ParseContext {
  me: PersonId;
  stores: Store[];
  currentStoreId: string;
  now?: Date;
}

const WDN = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
const PW: Record<string, Target> = {
  papa: 'papa', vater: 'papa', papi: 'papa',
  mama: 'mama', mutter: 'mama', mami: 'mama',
  pascal: 'pascal', alle: 'alle', familie: 'alle', uns: 'alle',
};

export const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöüß]/g, '');

export const splitItems = (s: string) =>
  s
    .split(/\s*,\s*|\s+und\s+|\s+sowie\s+/)
    .map((x) => x.replace(/^(noch|bitte|etwas|ein|eine|einen)\s+/i, '').trim())
    .filter(Boolean)
    .map(capitalize);

export function parse(raw: string, ctx: ParseContext): ParseResult {
  const T = ctx.now ?? new Date();
  const personWord = (w?: string): Target | null => {
    const x = (w ?? '').toLowerCase();
    if (['ich', 'mich', 'mir', 'mein', 'meine'].includes(x)) return ctx.me;
    return PW[x] ?? null;
  };
  const nextWd = (wd: number, forceNext: boolean) => {
    let d = (wd - T.getDay() + 7) % 7;
    if (forceNext && d === 0) d = 7;
    return addDays(T, d);
  };

  const takeDate = (str: string) => {
    let s = ` ${str} `;
    let date: string | null = null;
    let endDate: string | undefined;
    const range = s.match(new RegExp(`\\b(?:von|vom)\\s+(${WDN.join('|')})\\s+bis\\s+(${WDN.join('|')})\\b`));
    if (range) {
      const a = nextWd(WDN.indexOf(range[1]), false);
      let b = nextWd(WDN.indexOf(range[2]), false);
      if (b < a) b = addDays(b, 7);
      date = ymd(a);
      endDate = ymd(b);
      s = s.replace(range[0], ' ');
    }
    const one = (re: RegExp, fn: (m: RegExpMatchArray) => string) => {
      if (date) return;
      const m = s.match(re);
      if (m) {
        date = fn(m);
        s = s.replace(m[0], ' ');
      }
    };
    one(/\bübermorgen\b/, () => ymd(addDays(T, 2)));
    one(/\bmorgen\b/, () => ymd(addDays(T, 1)));
    one(/\bheute\b/, () => ymd(T));
    one(/\bin\s+(\d+)\s+tagen\b/, (m) => ymd(addDays(T, +m[1])));
    one(/\b(?:am\s+)?(\d{1,2})\.\s?(\d{1,2})\.?(\d{2,4})?(?=\s)/, (m) => {
      let y = m[3] ? +m[3] : T.getFullYear();
      if (y < 100) y += 2000;
      let d = new Date(y, +m[2] - 1, +m[1]);
      if (!m[3] && ymd(d) < ymd(T)) d = new Date(y + 1, +m[2] - 1, +m[1]);
      return ymd(d);
    });
    one(new RegExp(`\\b(?:am\\s+)?(nächsten|kommenden)?\\s*(${WDN.join('|')})\\b`), (m) => ymd(nextWd(WDN.indexOf(m[2]), !!m[1])));
    return { date: date as string | null, endDate, rest: s.trim() };
  };

  const takeTime = (str: string) => {
    let s = ` ${str} `;
    let start: string | undefined;
    let end: string | undefined;
    const fmt = (h: string | number, m?: string | number) => `${pad(+h)}:${pad(+(m ?? 0))}`;
    const b = s.match(/\bbis\s+(\d{1,2})(?::(\d{2}))?\s*(?:uhr)?\b/);
    if (b && +b[1] < 24) {
      end = fmt(b[1], b[2]);
      s = s.replace(b[0], ' ');
    }
    const a =
      s.match(/\b(?:um\s+|ab\s+)?(\d{1,2})(?::(\d{2}))?\s*uhr(?:\s+(\d{2}))?\b/) ??
      s.match(/\b(?:um|ab)\s+(\d{1,2}):(\d{2})\b/) ??
      s.match(/\bum\s+(\d{1,2})\b/);
    if (a && +a[1] < 24) {
      start = fmt(a[1], a[2] ?? a[3]);
      s = s.replace(a[0], ' ');
    }
    const hb = s.match(/\bum\s+halb\s+(\d{1,2})\b/);
    if (!start && hb) {
      start = fmt(+hb[1] - 1, 30);
      s = s.replace(hb[0], ' ');
    }
    return { start, end, rest: s.trim() };
  };

  const findStore = (phrase: string) => {
    const n = norm(phrase.replace(/(liste|zettel|einkaufs)/g, ''));
    if (!n) return null;
    if (['philips', 'philipps', 'thomasphilips'].includes(n)) {
      const tp = ctx.stores.find((s) => norm(s.name).includes('philipps'));
      if (tp) return tp.id;
    }
    const hit =
      ctx.stores.find((s) => norm(s.name) === n) ??
      ctx.stores.find((s) => norm(s.name).includes(n) || n.includes(norm(s.name)));
    return hit?.id ?? null;
  };

  const text = raw.trim().replace(/[.!]+$/, '');
  const t = text.toLowerCase();
  if (!t) return { kind: 'unknown' };
  let m: RegExpMatchArray | null;

  if (/was gibt('s| es).*essen/.test(t)) return { kind: 'mealQuery', date: takeDate(t).date ?? todayStr() };

  if ((m = t.match(/^was\s+(habe|hab|hat|haben)\s+(ich|papa|mama|pascal|wir)?\s*(.*?)\??$/))) {
    const person: Target = m[2] === 'wir' ? 'alle' : personWord(m[2] ?? 'ich') ?? ctx.me;
    return { kind: 'query', person, date: takeDate(m[3]).date ?? ymd(T) };
  }

  if ((m = t.match(/^(?:schreib\s+|setz\s+)?(.+?)\s+auf\s+(?:die|den|der)?\s*(.*?)(?:-|\s)?(liste|zettel|einkaufszettel|einkaufsliste)\s*(?:setzen|schreiben)?$/))) {
    const found = findStore(m[2]);
    const items = splitItems(text.slice(0, m[1].length + (t.match(/^(schreib|setz)\s+/)?.[0].length ?? 0)).replace(/^(schreib|setz)\s+/i, ''));
    return {
      kind: 'shop',
      items,
      storeId: found ?? ctx.currentStoreId,
      unknownStore: !found && m[2].trim() ? m[2].trim() : undefined,
    };
  }

  if ((m = text.match(/^notiz:?\s+(.+)$/i))) return { kind: 'note', text: capitalize(m[1]) };

  if ((m = text.match(/^(?:aufgabe|to-?do|erinnere\s+mich\s+an):?\s+(.+?)(?:\s+für\s+(\w+))?$/i))) {
    const p = personWord(m[2]);
    return { kind: 'todo', text: capitalize(m[1]), person: p && p !== 'alle' ? p : ctx.me };
  }

  if ((m = t.match(/^(papa|mama|pascal|ich|mutter|vater)\s+(?:hat|habe|hab|ist|bin)\s+(.*?)\s*(urlaub|frei|einen\s+freien\s+tag|krank)\b(.*)$/))) {
    const p = personWord(m[1]) ?? ctx.me;
    const dt = takeDate(`${m[2]} ${m[4]}`);
    const kind = m[3];
    return {
      kind: 'event',
      title: kind === 'urlaub' ? 'Urlaub' : kind === 'krank' ? 'Abwesend' : 'Frei',
      date: dt.date ?? ymd(T),
      endDate: dt.endDate,
      allDay: true,
      person: p,
      icon: kind === 'urlaub' ? 'urlaub' : 'frei',
    };
  }

  const looksLikeEvent =
    /^(termin|neuer termin)\b/.test(t) ||
    /\buhr\b/.test(t) ||
    /\b(morgen|übermorgen|heute|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/.test(t) ||
    /\b\d{1,2}\.\s?\d{1,2}\./.test(t) ||
    /\bum\s+\d{1,2}(:\d{2})?\b/.test(t);
  if (looksLikeEvent) {
    let rest = t.replace(/^(neuer\s+)?termin:?\s*/, '');
    let person: Target | null = null;
    const pm = rest.match(/\bfür\s+(\w+)\b/);
    if (pm && personWord(pm[1])) {
      person = personWord(pm[1]);
      rest = rest.replace(pm[0], ' ');
    }
    const lead = rest.match(/^(papa|mama|pascal|ich)\s+(?:hat|habe|hab)\s+/);
    if (lead) {
      person = person ?? personWord(lead[1]);
      rest = rest.replace(lead[0], '');
    }
    const dt = takeDate(rest);
    const tm = takeTime(dt.rest);
    const title = capitalize(
      tm.rest.replace(/\b(am|um|einen|ein|eine|den|der|die|termin|bitte|hat|habe|neuer)\b/gi, ' ').replace(/\s+/g, ' ').trim(),
    );
    if (!title) return { kind: 'unknown' };
    return {
      kind: 'event',
      title,
      date: dt.date ?? ymd(T),
      endDate: dt.endDate,
      start: tm.start,
      end: tm.end,
      allDay: !tm.start,
      person: person ?? ctx.me,
      icon: guessIcon(title),
    };
  }

  return { kind: 'unknown' };
}

export function guessIcon(t: string): EventIcon {
  const x = t.toLowerCase();
  if (/arzt|zahn|praxis|physio|kranken|impf/.test(x)) return 'arzt';
  if (/urlaub|reise|flug/.test(x)) return 'urlaub';
  if (/geburtstag|feier|party/.test(x)) return 'cake';
  if (/schule|klausur|test|eltern|lehrer/.test(x)) return 'schule';
  if (/training|sport|fußball|yoga|schwimm/.test(x)) return 'sport';
  if (/arbeit|büro|meeting/.test(x)) return 'arbeit';
  if (/auto|werkstatt|tüv|reifen/.test(x)) return 'auto';
  return 'termin';
}

export const VOICE_EXAMPLES = [
  'Milch und Eier auf die Lidl-Liste',
  'Termin morgen 15 Uhr Zahnarzt für Papa',
  'Mama hat Montag Urlaub',
  'Aufgabe Müll rausbringen für Pascal',
  'Notiz Schlüssel liegt bei Oma',
  'Was habe ich morgen?',
  'Was gibt es heute zu essen?',
];
