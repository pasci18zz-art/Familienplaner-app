import type { CalendarEvent, Target } from '../model/types';
import { BUSY_STYLE, PERSON, pv } from '../model/persons';
import { canEdit, isHidden, timeLabel } from '../lib/events';
import { holidayOn } from '../lib/holidays';
import { useList } from '../data';
import { useApp } from './AppContext';
import { Icon } from './Icon';

/** Farbiger Termin-Chip. Private Termine anderer Personen erscheinen als "Belegt". */
export function EventChip({ e, date }: { e: CalendarEvent; date: string }) {
  const { me, openSheet } = useApp();
  const hidden = isHidden(e, me);
  const title = hidden ? 'Belegt' : e.title;
  const who = PERSON[e.person].name;
  return (
    <button
      className={`chip${hidden ? ' busy' : canEdit(e, me) ? '' : ' ro'}`}
      style={hidden ? BUSY_STYLE : pv(e.person)}
      onClick={() => openSheet({ type: 'event', id: e.id, date })}
      aria-label={`${who}: ${title}, ${timeLabel(e)}`}
    >
      <Icon name={hidden ? 'lock' : e.icon} size="s" />
      {!e.allDay && <span className="t">{e.start}</span>}
      <span className="n">{title}</span>
      {e.recur && !hidden && <Icon name="repeat" size="s" />}
    </button>
  );
}

export function MealButton({ date }: { date: string }) {
  const { openSheet } = useApp();
  const meals = useList('meals');
  const m = meals.find((x) => x.id === date)?.text;
  return (
    <button
      className={`meal${m ? ' set' : ''}`}
      onClick={() => openSheet({ type: 'meal', date })}
      aria-label={`Was gibt es zu essen? ${m ?? 'noch leer'}`}
    >
      <Icon name="essen" size="s" />
      {m ? <span>{m}</span> : <span className="ph">Was gibt es zu essen?</span>}
    </button>
  );
}

export function HolidayBadge({ date }: { date: string }) {
  const h = holidayOn(date);
  return h ? <span className="badge">{h}</span> : null;
}

export function Dot({ p }: { p: Target }) {
  return <span className="dot" style={{ background: PERSON[p].fg }} />;
}

export function PersonRadios({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: Target;
  onChange: (p: Target) => void;
  options: Target[];
}) {
  return (
    <div className="radios" role="radiogroup">
      {options.map((p) => (
        <label key={p} style={pv(p)}>
          <input type="radio" name={name} value={p} checked={value === p} onChange={() => onChange(p)} />
          <span>{PERSON[p].name}</span>
        </label>
      ))}
    </div>
  );
}

export function SheetHead({ title }: { title: string }) {
  const { closeSheet } = useApp();
  return (
    <div className="sheet-h">
      <h2 className="h2" style={{ fontSize: 19 }}>{title}</h2>
      <button className="iconbtn" onClick={closeSheet} aria-label="Schließen">
        <Icon name="x" />
      </button>
    </div>
  );
}
