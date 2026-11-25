export const pad = (n: number) => String(n).padStart(2, '0');

export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
};

export const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

/** Tage von a bis b (beide YYYY-MM-DD). */
export const diffDays = (a: string, b: string) => Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 864e5);

export const WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export const WDS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export const todayStr = () => ymd(new Date());

export const longDate = (s: string) => {
  const d = parseYmd(s);
  return `${WD[d.getDay()]}, ${d.getDate()}. ${MON[d.getMonth()]}`;
};

export const shortDate = (s: string) => {
  const d = parseYmd(s);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
};

export const isoWeek = (d: Date) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const n = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - n);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y.getTime()) / 864e5 + 1) / 7);
};

export const nowHM = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
