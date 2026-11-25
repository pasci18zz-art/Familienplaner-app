import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { PersonId, ShoppingItem, Todo } from '../model/types';
import { PEOPLE, PERSON, pv } from '../model/persons';
import { newId, repo, setDevice, useDevice, useList } from '../data';
import { capitalize, splitItems } from '../lib/parser';
import { shortDate, todayStr } from '../lib/dates';
import { useApp } from '../components/AppContext';
import { Icon } from '../components/Icon';

export function useSortedStores() {
  return [...useList('stores')].sort((a, b) => a.order - b.order);
}

function CheckRow({
  done,
  text,
  color,
  onToggle,
  onDelete,
}: {
  done: boolean;
  text: string;
  color?: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className={`item${done ? ' done' : ''}`}>
      <button className="cbtn" onClick={onToggle} role="checkbox" aria-checked={done} aria-label={text}>
        <span className="cbox" style={!done && color ? { borderColor: color } : undefined}>{done && <Icon name="check" size="s" />}</span>
      </button>
      <span className="txt">{text}</span>
      <button className="iconbtn del" onClick={onDelete} aria-label={`${text} löschen`}><Icon name="x" size="s" /></button>
    </li>
  );
}

export function Einkauf() {
  const { me, openSheet, toast } = useApp();
  const stores = useSortedStores();
  const items = useList('items');
  const dev = useDevice();
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const current = stores.find((s) => s.id === dev.lastStore) ?? stores[0];
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [current?.id]);

  if (!current) {
    return (
      <>
        <div className="pagehead"><h1 className="h1">Einkaufszettel</h1></div>
        <div className="card stack">
          <div className="empty">Noch kein Geschäft angelegt.</div>
          <button className="btn primary" onClick={() => openSheet({ type: 'stores' })}><Icon name="plus" size="s" />Geschäft anlegen</button>
        </div>
      </>
    );
  }

  const mine = items.filter((i) => i.storeId === current.id);
  const open = mine.filter((i) => !i.done).sort((a, b) => a.updatedAt - b.updatedAt);
  const done = mine.filter((i) => i.done);

  const toggle = (i: ShoppingItem) => repo.put('items', { ...i, done: !i.done });
  const add = (e: FormEvent) => {
    e.preventDefault();
    const parts = splitItems(text);
    if (!parts.length) return;
    parts.forEach((t) => repo.put('items', { id: newId(), storeId: current.id, text: t, done: false, ownerId: me, updatedAt: 0 }));
    setText('');
    input.current?.focus();
  };

  return (
    <>
      <div className="pagehead">
        <h1 className="h1">Einkaufszettel</h1>
        <button className="btn small" onClick={() => openSheet({ type: 'stores' })}><Icon name="pencil" size="s" />Geschäfte</button>
      </div>
      <div className="tabs" role="tablist" aria-label="Geschäfte" ref={tabsRef}>
        {stores.map((s) => {
          const n = items.filter((i) => i.storeId === s.id && !i.done).length;
          return (
            <button key={s.id} className="tab" role="tab" aria-selected={s.id === current.id} onClick={() => setDevice({ lastStore: s.id })}>
              {s.name}<span className="cnt">{n}</span>
            </button>
          );
        })}
      </div>
      <section className="card">
        <ul className="items">
          {open.map((i) => (
            <CheckRow key={i.id} done={false} text={i.text} onToggle={() => toggle(i)} onDelete={() => repo.remove('items', i.id)} />
          ))}
          {!open.length && <li className="empty" style={{ padding: '10px 4px' }}>Die Liste für {current.name} ist leer.</li>}
        </ul>
        <form className="addrow" onSubmit={add}>
          <input
            ref={input}
            id="item-new"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Artikel hinzufügen"
            aria-label={`Artikel für ${current.name} hinzufügen`}
            autoComplete="off"
            enterKeyHint="done"
          />
          <button className="iconbtn" type="submit" aria-label="Hinzufügen" style={{ background: 'var(--bg)' }}><Icon name="plus" /></button>
          <button type="button" className="mic-s" onClick={() => openSheet({ type: 'voice', prefill: ` auf die ${current.name}-Liste` })} aria-label="Per Sprache hinzufügen">
            <Icon name="mic" />
          </button>
        </form>
      </section>
      {done.length > 0 && (
        <section className="card" style={{ marginTop: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Erledigt ({done.length})</span>
            <button
              className="btn small ghost"
              onClick={() => {
                done.forEach((i) => repo.remove('items', i.id));
                toast('Erledigte gelöscht');
              }}
            >
              Erledigte löschen
            </button>
          </div>
          <ul className="items">
            {done.map((i) => (
              <CheckRow key={i.id} done text={i.text} onToggle={() => toggle(i)} onDelete={() => repo.remove('items', i.id)} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function TodoCard({ p, todos }: { p: PersonId; todos: Todo[] }) {
  const { me } = useApp();
  const [text, setText] = useState('');
  const open = todos.filter((t) => !t.done).sort((a, b) => a.updatedAt - b.updatedAt);
  const done = todos.filter((t) => t.done);
  const add = (e: FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    repo.put('todos', { id: newId(), person: p, text: capitalize(v), done: false, ownerId: me, updatedAt: 0 });
    setText('');
  };
  return (
    <section className="card todocard" style={pv(p)}>
      <div className="person-h" style={{ fontSize: 18 }}>
        {PERSON[p].name}
        <span className="muted small tab-num" style={{ marginLeft: 'auto', fontWeight: 400 }}>{open.length} offen</span>
      </div>
      <ul className="items">
        {[...open, ...done].map((t) => (
          <CheckRow
            key={t.id}
            done={t.done}
            text={t.text}
            color={PERSON[p].fg}
            onToggle={() => repo.put('todos', { ...t, done: !t.done })}
            onDelete={() => repo.remove('todos', t.id)}
          />
        ))}
        {!todos.length && <li className="empty">Keine Aufgaben</li>}
      </ul>
      <form className="addrow" onSubmit={add}>
        <input
          id={`todo-new-${p}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Aufgabe für ${PERSON[p].name}`}
          aria-label={`Aufgabe für ${PERSON[p].name}`}
          autoComplete="off"
          enterKeyHint="done"
        />
        <button className="iconbtn" type="submit" aria-label="Hinzufügen" style={{ background: 'var(--bg)' }}><Icon name="plus" /></button>
      </form>
    </section>
  );
}

export function Aufgaben() {
  const todos = useList('todos');
  return (
    <>
      <div className="pagehead">
        <h1 className="h1">Aufgaben</h1>
        <span className="muted small">Jeder hat seine Liste, alle sehen alles.</span>
      </div>
      <div className="todocols">
        {PEOPLE.map((p) => <TodoCard key={p} p={p} todos={todos.filter((t) => t.person === p)} />)}
      </div>
    </>
  );
}

export function Notizen() {
  const { me, openSheet, toast } = useApp();
  const notes = [...useList('notes')].sort((a, b) => b.updatedAt - a.updatedAt);
  const [text, setText] = useState('');
  const add = (e: FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    repo.put('notes', { id: newId(), text: v, createdAt: todayStr(), ownerId: me, updatedAt: 0 });
    setText('');
    toast('Notiz angepinnt');
  };
  return (
    <>
      <div className="pagehead"><h1 className="h1">Pinnwand</h1></div>
      <form className="card stack" onSubmit={add} style={{ marginBottom: 14 }}>
        <label className="label" htmlFor="note-new">Neue Notiz</label>
        <textarea id="note-new" value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. Schlüssel liegt bei Oma" />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" type="button" onClick={() => openSheet({ type: 'voice', prefill: 'Notiz ' })}><Icon name="mic" size="s" />Sprechen</button>
          <button className="btn primary" type="submit"><Icon name="pin" size="s" />Anpinnen</button>
        </div>
      </form>
      <div className="notes">
        {notes.map((n) => (
          <article key={n.id} className="card note">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="pin"><Icon name="pin" /></span>
              {n.ownerId === me && (
                <button className="iconbtn" style={{ background: 'none', width: 40, height: 40 }} onClick={() => repo.remove('notes', n.id)} aria-label="Notiz löschen">
                  <Icon name="trash" size="s" />
                </button>
              )}
            </div>
            <div className="body">{n.text}</div>
            <div className="meta">
              <span style={{ color: PERSON[n.ownerId].fg, fontWeight: 600 }}>{PERSON[n.ownerId].name}</span>
              <span className="tab-num">{shortDate(n.createdAt)}</span>
            </div>
          </article>
        ))}
        {!notes.length && <div className="empty">Noch keine Notizen.</div>}
      </div>
    </>
  );
}
