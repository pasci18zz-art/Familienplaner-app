import { useState, type FormEvent } from 'react';
import type { CalendarEvent, EventIcon, Target } from '../model/types';
import { EVENT_ICONS, PERSON, TARGETS, pv } from '../model/persons';
import { newId, repo, storeIdFor, useDevice, useList } from '../data';
import { canEdit, eventsOn, isHidden } from '../lib/events';
import { longDate } from '../lib/dates';
import { useApp } from '../components/AppContext';
import { Icon } from '../components/Icon';
import { EventChip, HolidayBadge, MealButton, PersonRadios, SheetHead } from '../components/Bits';
import { useSortedStores } from '../views/Listen';

/* ---------- Termin ansehen / bearbeiten ---------- */

export function EventSheet({ id, date }: { id?: string; date: string }) {
  const { me, closeSheet, toast } = useApp();
  const dev = useDevice();
  const events = useList('events');
  const existing = id ? events.find((e) => e.id === id) : undefined;

  if (id && !existing) {
    return (
      <>
        <SheetHead title="Termin" />
        <div className="empty">Dieser Termin wurde gelöscht.</div>
      </>
    );
  }
  if (existing && !canEdit(existing, me)) return <EventReadOnly e={existing} date={date} />;
  return <EventForm key={id ?? 'new'} existing={existing} date={date} privateDefault={dev.privateDefault} onDone={(msg) => { closeSheet(); toast(msg); }} />;
}

function EventReadOnly({ e, date }: { e: CalendarEvent; date: string }) {
  const { me, closeSheet } = useApp();
  const hidden = isHidden(e, me);
  const owner = PERSON[e.ownerId].name;
  return (
    <>
      <SheetHead title={hidden ? 'Belegt' : e.title} />
      <div className="stack">
        <div className="card stack" style={pv(e.person)}>
          <div className="row"><Icon name={hidden ? 'lock' : e.icon} /><span style={{ fontWeight: 600 }}>{hidden ? 'Privater Termin' : e.title}</span></div>
          <div className="muted">
            {longDate(date || e.date)}
            {e.endDate ? ` bis ${longDate(e.endDate)}` : ''} · {e.allDay ? 'ganztägig' : `${e.start ?? ''}${e.end ? '–' + e.end : ''} Uhr`}
          </div>
          <div className="row">
            <span className="dot" style={{ background: PERSON[e.person].fg }} />
            {PERSON[e.person].name}
            {e.recur && <> · <Icon name="repeat" size="s" /> jede Woche</>}
          </div>
        </div>
        <div className="lockline">
          <Icon name="lock" size="s" />
          <span>
            {e.source === 'schoolos'
              ? 'Kommt aus School OS. Nur lesbar, Pascal ändert ihn dort.'
              : hidden
                ? `${owner} hat diesen Termin privat gestellt. Du siehst nur, dass ${owner} belegt ist.`
                : `Diesen Termin hat ${owner} angelegt. Nur ${owner} kann ihn ändern.`}
          </span>
        </div>
        <button className="btn" onClick={closeSheet}>Schließen</button>
      </div>
    </>
  );
}

function EventForm({ existing, date, privateDefault, onDone }: { existing?: CalendarEvent; date: string; privateDefault: boolean; onDone: (msg: string) => void }) {
  const { me } = useApp();
  const [title, setTitle] = useState(existing?.title ?? '');
  const [person, setPerson] = useState<Target>(existing?.person ?? me);
  const [d, setD] = useState(existing?.date ?? date);
  const [endDate, setEndDate] = useState(existing?.endDate ?? '');
  const [allDay, setAllDay] = useState(existing?.allDay ?? false);
  const [start, setStart] = useState(existing?.start ?? '');
  const [end, setEnd] = useState(existing?.end ?? '');
  const [icon, setIcon] = useState<EventIcon>(existing?.icon ?? 'termin');
  const [recur, setRecur] = useState(existing?.recur ?? '');
  const [priv, setPriv] = useState(existing?.private ?? privateDefault);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t || !d) return;
    const isAllDay = allDay || !start;
    const ev: CalendarEvent = {
      id: existing?.id ?? newId(),
      ownerId: existing?.ownerId ?? me,
      updatedAt: 0,
      title: t,
      person,
      date: d,
      allDay: isAllDay,
      icon,
      source: existing?.source ?? 'familienplaner',
    };
    if (endDate && endDate > d) ev.endDate = endDate;
    if (!isAllDay) {
      ev.start = start;
      if (end) ev.end = end;
    }
    if (recur === 'weekly') ev.recur = 'weekly';
    if (priv) ev.private = true;
    void repo.put('events', ev);
    onDone('Termin gespeichert');
  };

  return (
    <>
      <SheetHead title={existing ? 'Termin bearbeiten' : 'Neuer Termin'} />
      <form className="stack" onSubmit={save}>
        <div className="field">
          <label htmlFor="ev-title">Titel</label>
          <input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Zahnarzt" required autoFocus={!existing} enterKeyHint="next" />
        </div>
        <div className="field"><span className="lbl">Für</span><PersonRadios name="ev-person" value={person} onChange={setPerson} options={TARGETS} /></div>
        <div className="grid2">
          <div className="field"><label htmlFor="ev-date">Datum</label><input type="date" id="ev-date" value={d} onChange={(e) => setD(e.target.value)} required /></div>
          <div className="field"><label htmlFor="ev-enddate">Bis (optional)</label><input type="date" id="ev-enddate" value={endDate} min={d} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>
        <label className="check"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />Ganztägig</label>
        {!allDay && (
          <div className="grid2">
            <div className="field"><label htmlFor="ev-start">Von</label><input type="time" id="ev-start" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="field"><label htmlFor="ev-end">Bis</label><input type="time" id="ev-end" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
        )}
        <div className="field">
          <span className="lbl">Symbol</span>
          <div className="radios" role="radiogroup">
            {EVENT_ICONS.map(([k, l]) => (
              <label key={k}>
                <input type="radio" name="ev-icon" checked={icon === k} onChange={() => setIcon(k)} />
                <span><Icon name={k} size="s" />{l}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="ev-recur">Wiederholen</label>
          <select id="ev-recur" value={recur} onChange={(e) => setRecur(e.target.value as '' | 'weekly')}>
            <option value="">Nie</option>
            <option value="weekly">Jede Woche</option>
          </select>
        </div>
        <label className="check"><input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} />Privat (andere sehen nur „Belegt“)</label>
        <div className="muted small">Bei Arztterminen nur das Symbol „Arzt“ nutzen, keine Diagnose eintragen.</div>
        <div className="actions">
          {existing && (
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                void repo.remove('events', existing.id);
                onDone('Termin gelöscht');
              }}
            >
              <Icon name="trash" size="s" />{confirmDelete ? 'Wirklich löschen?' : 'Löschen'}
            </button>
          )}
          <button type="submit" className="btn primary"><Icon name="check" size="s" />Speichern</button>
        </div>
      </form>
    </>
  );
}

/* ---------- Essen ---------- */

export function MealSheet({ date }: { date: string }) {
  const { me, closeSheet } = useApp();
  const meal = useList('meals').find((m) => m.id === date);
  const [text, setText] = useState(meal?.text ?? '');
  const save = (e: FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (v) void repo.put('meals', { id: date, date, text: v, ownerId: meal?.ownerId ?? me, updatedAt: 0 });
    else if (meal) void repo.remove('meals', date);
    closeSheet();
  };
  return (
    <>
      <SheetHead title="Was gibt es zu essen?" />
      <form className="stack" onSubmit={save}>
        <div className="muted">{longDate(date)}</div>
        <input id="meal-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. Spaghetti" autoFocus autoComplete="off" enterKeyHint="done" aria-label="Essen" />
        <div className="actions">
          {meal && (
            <button type="button" className="btn danger" onClick={() => { void repo.remove('meals', date); closeSheet(); }}>Leeren</button>
          )}
          <button className="btn primary" type="submit">Speichern</button>
        </div>
      </form>
    </>
  );
}

/* ---------- Tag (aus der Monatsansicht) ---------- */

export function DaySheet({ date }: { date: string }) {
  const { openSheet } = useApp();
  const evs = eventsOn(useList('events'), date);
  return (
    <>
      <SheetHead title={longDate(date)} />
      <div className="stack">
        <div><HolidayBadge date={date} /></div>
        <MealButton date={date} />
        <div className="chips">
          {evs.map((e) => <EventChip key={e.id} e={e} date={date} />)}
          {!evs.length && <div className="empty">Keine Termine</div>}
        </div>
        <button className="btn primary" onClick={() => openSheet({ type: 'event', date })}><Icon name="plus" size="s" />Termin hinzufügen</button>
      </div>
    </>
  );
}

/* ---------- Geschäfte bearbeiten ---------- */

export function StoresSheet() {
  const { me, closeSheet, toast } = useApp();
  const stores = useSortedStores();
  const items = useList('items');
  const [name, setName] = useState('');
  const [armed, setArmed] = useState<string | null>(null);

  const rename = (id: string, v: string) => {
    const s = stores.find((x) => x.id === id);
    if (s && v.trim() && v.trim() !== s.name) void repo.put('stores', { ...s, name: v.trim() });
  };
  const move = (i: number, dir: number) => {
    const j = i + dir;
    if (j < 0 || j >= stores.length) return;
    const a = stores[i], b = stores[j];
    void repo.put('stores', { ...a, order: b.order });
    void repo.put('stores', { ...b, order: a.order });
  };
  const del = (id: string) => {
    const open = items.filter((i) => i.storeId === id && !i.done);
    if (open.length && armed !== id) {
      setArmed(id);
      toast(`Noch ${open.length} offene Artikel. Nochmal tippen zum Löschen.`);
      return;
    }
    items.filter((i) => i.storeId === id).forEach((i) => repo.remove('items', i.id));
    void repo.remove('stores', id);
    setArmed(null);
  };
  const add = (e: FormEvent) => {
    e.preventDefault();
    const v = name.trim();
    if (!v) return;
    let id = storeIdFor(v) || newId();
    if (stores.some((s) => s.id === id)) id = `${id}-${newId().slice(0, 4)}`;
    const order = stores.length ? Math.max(...stores.map((s) => s.order)) + 1 : 0;
    void repo.put('stores', { id, name: v, order, ownerId: me, updatedAt: 0 });
    setName('');
  };

  return (
    <>
      <SheetHead title="Geschäfte bearbeiten" />
      <div className="stack">
        {stores.map((s, i) => (
          <div key={s.id} className="row">
            <input defaultValue={s.name} onBlur={(e) => rename(s.id, e.target.value)} aria-label={`Name von ${s.name}`} />
            <button className="iconbtn" onClick={() => move(i, -1)} aria-label="Nach oben" disabled={i === 0}><Icon name="up" size="s" /></button>
            <button className="iconbtn" onClick={() => move(i, 1)} aria-label="Nach unten" disabled={i === stores.length - 1}><Icon name="down" size="s" /></button>
            <button className="iconbtn" onClick={() => del(s.id)} aria-label={`${s.name} entfernen`}><Icon name="trash" size="s" /></button>
          </div>
        ))}
        <form className="addrow" onSubmit={add}>
          <input id="store-new" value={name} onChange={(e) => setName(e.target.value)} placeholder="Neues Geschäft" autoComplete="off" />
          <button className="btn primary" type="submit"><Icon name="plus" size="s" />Hinzufügen</button>
        </form>
        <button className="btn" onClick={closeSheet}>Fertig</button>
      </div>
    </>
  );
}
