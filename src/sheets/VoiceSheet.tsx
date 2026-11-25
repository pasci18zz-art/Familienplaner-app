import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Target } from '../model/types';
import { PEOPLE, PERSON, TARGETS } from '../model/persons';
import { newId, repo, setDevice, useDevice, useList } from '../data';
import { eventsOn, isHidden } from '../lib/events';
import { longDate, todayStr } from '../lib/dates';
import { VOICE_EXAMPLES, parse, splitItems, type ParseResult } from '../lib/parser';
import { useApp } from '../components/AppContext';
import { Icon } from '../components/Icon';
import { PersonRadios, SheetHead } from '../components/Bits';
import { useSortedStores } from '../views/Listen';

/**
 * Sprachbefehl. Heute: Satz eintippen oder über das Mikrofon der Tastatur diktieren.
 * Phase 4: Android-Spracherkennung liefert den Satz direkt.
 * Gespeichert wird immer erst nach "Speichern".
 */
export function VoiceSheet({ prefill }: { prefill?: string }) {
  const { me } = useApp();
  const stores = useSortedStores();
  const dev = useDevice();
  const [text, setText] = useState(prefill ?? '');
  const [heard, setHeard] = useState('');
  const [res, setRes] = useState<ParseResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (el && prefill?.startsWith(' ')) {
      el.focus();
      el.setSelectionRange(0, 0);
    }
  }, [prefill]);

  const run = (t: string) => {
    const v = t.trim();
    if (!v) return;
    setHeard(v);
    setRes(parse(v, { me, stores, currentStoreId: dev.lastStore ?? stores[0]?.id ?? '' }));
  };
  const reset = () => {
    setRes(null);
    setText('');
  };

  return (
    <>
      <SheetHead title="Sprachbefehl" />
      <div className="stack">
        <div className={`wave${res ? ' idle' : ''}`} aria-hidden="true">
          {[...Array(18)].map((_, i) => <i key={i} style={{ animationDelay: `${(i * 0.07).toFixed(2)}s` }} />)}
        </div>
        {res ? (
          <>
            <div className="heard">„{heard}“</div>
            <ResultCard res={res} onDiscard={reset} onExample={(x) => { setText(x); run(x); }} />
          </>
        ) : (
          <>
            <form
              className="addrow"
              style={{ margin: 0 }}
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                run(text);
              }}
            >
              <input
                id="v-input"
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="z. B. Termin morgen 15 Uhr Zahnarzt"
                autoComplete="off"
                autoFocus
                enterKeyHint="go"
                aria-label="Befehl"
              />
              <button className="btn primary" type="submit">Erkennen</button>
            </form>
            <div className="muted small">Tipp: Mit dem Mikrofon-Symbol auf der Tastatur kannst du den Satz einsprechen. Gespeichert wird erst nach „Speichern“.</div>
            <div className="label">Beispiele</div>
            <div className="examples">
              {VOICE_EXAMPLES.map((x) => (
                <button key={x} onClick={() => { setText(x); run(x); }}>{x}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function ResultCard({ res, onDiscard, onExample }: { res: ParseResult; onDiscard: () => void; onExample: (x: string) => void }) {
  const { me, closeSheet, toast } = useApp();
  const events = useList('events');
  const meals = useList('meals');

  const actions = (
    <div className="actions">
      <button type="button" className="btn" onClick={onDiscard}>Verwerfen</button>
      <button className="btn primary" type="submit"><Icon name="check" size="s" />Speichern</button>
    </div>
  );
  const done = (msg: string) => {
    closeSheet();
    toast(msg);
  };

  if (res.kind === 'event') return <EventConfirm res={res} actions={actions} onSaved={() => done('Termin gespeichert')} />;

  if (res.kind === 'shop') return <ShopConfirm res={res} actions={actions} onSaved={() => done('Auf die Liste gesetzt')} />;

  if (res.kind === 'todo') return <TodoConfirm res={res} actions={actions} onSaved={() => done('Aufgabe gespeichert')} />;

  if (res.kind === 'note') {
    return (
      <NoteConfirm
        text={res.text}
        actions={actions}
        onSave={(t) => {
          void repo.put('notes', { id: newId(), text: t, createdAt: todayStr(), ownerId: me, updatedAt: 0 });
          done('Notiz angepinnt');
        }}
      />
    );
  }

  if (res.kind === 'query' || res.kind === 'mealQuery') {
    let title: string;
    let lines: string[];
    if (res.kind === 'mealQuery') {
      title = 'Essen';
      lines = [`${longDate(res.date)}: ${meals.find((m) => m.id === res.date)?.text ?? 'noch nichts eingetragen'}`];
    } else {
      const p = res.person;
      const evs = p === 'alle' ? eventsOn(events, res.date) : [...eventsOn(events, res.date, p), ...eventsOn(events, res.date, 'alle')];
      title = `${p === 'alle' ? 'Wir' : PERSON[p].name} · ${longDate(res.date)}`;
      lines = evs.map((e) => `${e.allDay ? 'Ganztägig' : e.start + ' Uhr'}: ${isHidden(e, me) ? 'Belegt' : e.title}${e.person === 'alle' && p !== 'alle' ? ' (alle)' : ''}`);
      if (!lines.length) lines = ['Nichts eingetragen.'];
    }
    return (
      <div className="card confirm">
        <div className="kind"><Icon name="week" />{title}</div>
        <ul className="answer">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
        <button className="btn" onClick={closeSheet}>Fertig</button>
      </div>
    );
  }

  return (
    <div className="card confirm">
      <div className="kind"><Icon name="info" />Das habe ich nicht verstanden</div>
      <div className="muted">Versuch es zum Beispiel so:</div>
      <div className="examples">
        {VOICE_EXAMPLES.slice(0, 5).map((x) => <button key={x} onClick={() => onExample(x)}>{x}</button>)}
      </div>
      <button className="btn" onClick={onDiscard}>Nochmal</button>
    </div>
  );
}

function EventConfirm({ res, actions, onSaved }: { res: Extract<ParseResult, { kind: 'event' }>; actions: ReactNode; onSaved: () => void }) {
  const { me } = useApp();
  const [title, setTitle] = useState(res.title);
  const [date, setDate] = useState(res.date);
  const [start, setStart] = useState(res.start ?? '');
  const [endDate, setEndDate] = useState(res.endDate ?? '');
  const [person, setPerson] = useState<Target>(res.person);
  return (
    <form
      className="card confirm"
      onSubmit={(e) => {
        e.preventDefault();
        void repo.put('events', {
          id: newId(), ownerId: me, updatedAt: 0, source: 'familienplaner',
          title: title.trim() || res.title, date, person, icon: res.icon,
          allDay: !start, ...(start ? { start } : {}), ...(res.end && start ? { end: res.end } : {}),
          ...(endDate && endDate > date ? { endDate } : {}),
        });
        onSaved();
      }}
    >
      <div className="kind"><Icon name={res.icon} />Termin anlegen?</div>
      <div className="field"><label htmlFor="v-title">Titel</label><input id="v-title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="grid2">
        <div className="field"><label htmlFor="v-date">Datum</label><input type="date" id="v-date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="field"><label htmlFor="v-start">Uhrzeit</label><input type="time" id="v-start" value={start} onChange={(e) => setStart(e.target.value)} /></div>
      </div>
      {res.endDate && <div className="field"><label htmlFor="v-end">Bis</label><input type="date" id="v-end" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>}
      <div className="field"><span className="lbl">Für</span><PersonRadios name="v-person" value={person} onChange={setPerson} options={TARGETS} /></div>
      {actions}
    </form>
  );
}

function ShopConfirm({ res, actions, onSaved }: { res: Extract<ParseResult, { kind: 'shop' }>; actions: ReactNode; onSaved: () => void }) {
  const { me } = useApp();
  const stores = useSortedStores();
  const [items, setItems] = useState(res.items.join(', '));
  const [storeId, setStoreId] = useState(res.storeId || stores[0]?.id || '');
  return (
    <form
      className="card confirm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!storeId) return;
        splitItems(items).forEach((t) => repo.put('items', { id: newId(), storeId, text: t, done: false, ownerId: me, updatedAt: 0 }));
        setDevice({ lastStore: storeId });
        onSaved();
      }}
    >
      <div className="kind"><Icon name="cart" />Auf den Einkaufszettel?</div>
      <div className="field"><label htmlFor="v-items">Artikel (mit Komma getrennt)</label><input id="v-items" value={items} onChange={(e) => setItems(e.target.value)} /></div>
      <div className="field">
        <label htmlFor="v-store">Geschäft</label>
        <select id="v-store" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {res.unknownStore && <div className="muted small">„{res.unknownStore}“ kenne ich nicht. Bitte Geschäft wählen.</div>}
      {actions}
    </form>
  );
}

function TodoConfirm({ res, actions, onSaved }: { res: Extract<ParseResult, { kind: 'todo' }>; actions: ReactNode; onSaved: () => void }) {
  const { me } = useApp();
  const [text, setText] = useState(res.text);
  const [person, setPerson] = useState<Target>(res.person);
  return (
    <form
      className="card confirm"
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim();
        if (!t || person === 'alle') return;
        void repo.put('todos', { id: newId(), person, text: t, done: false, ownerId: me, updatedAt: 0 });
        onSaved();
      }}
    >
      <div className="kind"><Icon name="todo" />Aufgabe anlegen?</div>
      <div className="field"><label htmlFor="v-text">Aufgabe</label><input id="v-text" value={text} onChange={(e) => setText(e.target.value)} /></div>
      <div className="field"><span className="lbl">Für</span><PersonRadios name="v-person" value={person} onChange={setPerson} options={PEOPLE} /></div>
      {actions}
    </form>
  );
}

function NoteConfirm({ text: initial, actions, onSave }: { text: string; actions: ReactNode; onSave: (t: string) => void }) {
  const [text, setText] = useState(initial);
  return (
    <form
      className="card confirm"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSave(text.trim());
      }}
    >
      <div className="kind"><Icon name="pin" />Notiz anpinnen?</div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Notiz" />
      {actions}
    </form>
  );
}
