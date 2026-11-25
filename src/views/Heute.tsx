import { useEffect, useState } from 'react';
import type { CalendarEvent, PersonId } from '../model/types';
import { PEOPLE, PERSON, pv } from '../model/persons';
import { useList } from '../data';
import { eventsOn, isHidden } from '../lib/events';
import { longDate, nowHM, parseYmd, todayStr } from '../lib/dates';
import { useWeather } from '../lib/weather';
import { useApp } from '../components/AppContext';
import { Icon } from '../components/Icon';
import { Dot, EventChip, HolidayBadge } from '../components/Bits';

function useClock() {
  const [t, setT] = useState(nowHM());
  const [day, setDay] = useState(todayStr());
  useEffect(() => {
    const id = setInterval(() => {
      setT(nowHM());
      setDay(todayStr());
    }, 5000);
    return () => clearInterval(id);
  }, []);
  return { time: t, today: day };
}

const WEATHER_ICON: Record<string, string> = {
  'clear-day': 'frei', 'clear-night': 'moon', 'partly-cloudy-day': 'cloud', 'partly-cloudy-night': 'cloud', cloudy: 'cloud',
  fog: 'fog', wind: 'cloud', rain: 'rain', sleet: 'rain', snow: 'snow', hail: 'rain', thunderstorm: 'storm',
};

function WeatherCard() {
  const { weather, error } = useWeather();
  return (
    <div className="card weathercard">
      <Icon name={weather ? WEATHER_ICON[weather.icon] ?? 'cloud' : 'cloud'} size="l" />
      <div className="temp">{weather?.temp != null ? `${weather.temp}°` : '–'}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{weather ? `${weather.place} · ${weather.text}` : 'Dillenburg'}</div>
        {weather?.max != null && (
          <div className="muted small tab-num">max {weather.max}° · min {weather.min}°</div>
        )}
        {!weather && <div className="muted small">{error ? 'Kein Internet, Wetter folgt' : 'Lädt …'}</div>}
        <div className="src">Quelle: Deutscher Wetterdienst</div>
      </div>
    </div>
  );
}

function MealCard({ date }: { date: string }) {
  const { openSheet } = useApp();
  const meal = useList('meals').find((m) => m.id === date)?.text;
  return (
    <button className="card mealcard linkcard" onClick={() => openSheet({ type: 'meal', date })}>
      <span className="ic"><Icon name="essen" /></span>
      <span style={{ minWidth: 0 }}>
        <span className="label" style={{ display: 'block' }}>Heute gibt es</span>
        <span className="big" style={{ display: 'block' }}>{meal ?? <span className="muted">Noch nichts eingetragen</span>}</span>
      </span>
    </button>
  );
}

function PersonRow({ e, date }: { e: CalendarEvent; date: string }) {
  const { me, openSheet } = useApp();
  const hidden = isHidden(e, me);
  return (
    <button className={`prow${hidden ? ' busy' : ''}`} style={pv(e.person)} onClick={() => openSheet({ type: 'event', id: e.id, date })}>
      <span className="t">{e.allDay ? 'Tag' : e.start}</span>
      <Icon name={hidden ? 'lock' : e.icon} />
      <span className="n">{hidden ? 'Belegt' : e.title}</span>
    </button>
  );
}

function summary(events: CalendarEvent[], s: string, p: PersonId, me: PersonId) {
  const parts = eventsOn(events, s, p).map((e) =>
    isHidden(e, me) ? `${e.start ?? ''} belegt`.trim() : `${e.allDay ? '' : e.start + ' '}${e.title}`,
  );
  return parts.length ? parts.join(' · ') : 'nichts eingetragen';
}

export function Heute() {
  const { layout, go, me } = useApp();
  const { time, today: s } = useClock();
  const events = useList('events');
  const items = useList('items');
  const stores = useList('stores');
  const todos = useList('todos');
  const notes = useList('notes');

  const alle = eventsOn(events, s, 'alle');
  const openItems = items.filter((i) => !i.done);
  const byStore = [...stores]
    .sort((a, b) => a.order - b.order)
    .map((st) => ({ st, n: openItems.filter((i) => i.storeId === st.id).length }))
    .filter((x) => x.n);
  const openTodos = todos.filter((t) => !t.done);
  const latestNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);

  const shopBox = (
    <button className="card linkcard" onClick={() => go('einkauf')}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="row"><Icon name="cart" /><span className="h2">Einkauf</span></span>
        <span className="muted tab-num">{openItems.length} offen</span>
      </div>
      <ul className="boxlist">
        {byStore.slice(0, 5).map((x) => (
          <li key={x.st.id}><span>{x.st.name}</span><span className="muted tab-num">{x.n}</span></li>
        ))}
        {!byStore.length && <li className="muted">Alles erledigt</li>}
      </ul>
    </button>
  );
  const todoBox = (
    <button className="card linkcard" onClick={() => go('aufgaben')}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="row"><Icon name="todo" /><span className="h2">Aufgaben</span></span>
        <span className="muted tab-num">{openTodos.length} offen</span>
      </div>
      <ul className="boxlist">
        {openTodos.slice(0, 5).map((t) => (
          <li key={t.id}><span>{t.text}</span><span style={{ color: PERSON[t.person].fg, fontWeight: 600 }}>{PERSON[t.person].name}</span></li>
        ))}
        {!openTodos.length && <li className="muted">Nichts offen</li>}
      </ul>
    </button>
  );
  const noteBox = (
    <button className="card linkcard" onClick={() => go('notizen')}>
      <div className="row"><Icon name="pin" /><span className="h2">Pinnwand</span></div>
      <ul className="boxlist">
        {latestNotes.map((n) => <li key={n.id}><span>{n.text}</span></li>)}
        {!latestNotes.length && <li className="muted">Keine Notizen</li>}
      </ul>
    </button>
  );
  const alleStrip = alle.length ? (
    <section className="card alle-strip">
      <span className="row" style={{ fontWeight: 600, color: 'var(--alle)' }}><Icon name="users" />Für alle</span>
      {alle.map((e) => <EventChip key={e.id} e={e} date={s} />)}
    </section>
  ) : null;

  if (layout === 'tablet') {
    return (
      <div className="dash">
        <section className="dash-top">
          <div className="clockbox">
            <div className="clock">{time}</div>
            <div className="date">{longDate(s)} {parseYmd(s).getFullYear()} <HolidayBadge date={s} /></div>
          </div>
          <MealCard date={s} />
          <WeatherCard />
        </section>
        {alleStrip}
        <section className="people">
          {PEOPLE.map((p) => {
            const evs = eventsOn(events, s, p);
            return (
              <section key={p} className="card pcol" style={pv(p)}>
                <div className="person-h"><Dot p={p} />{PERSON[p].name}</div>
                {evs.map((e) => <PersonRow key={e.id} e={e} date={s} />)}
                {!evs.length && <div className="empty">Heute nichts eingetragen</div>}
              </section>
            );
          })}
        </section>
        <section className="boxes">{shopBox}{todoBox}{noteBox}</section>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="today-head">
        <div className="label">Heute · {time}</div>
        <div className="date">{longDate(s)}</div>
        <HolidayBadge date={s} />
      </div>
      <MealCard date={s} />
      <WeatherCard />
      <section className="card">
        <div className="row" style={{ marginBottom: 8 }}><Icon name="bell" size="s" /><span className="h2">Wer hat heute was</span></div>
        <ul className="boxlist">
          {PEOPLE.map((p) => (
            <li key={p}>
              <span style={{ color: PERSON[p].fg, fontWeight: 600, flex: 'none' }}>{PERSON[p].name}</span>
              <span style={{ textAlign: 'right', whiteSpace: 'normal' }}>{summary(events, s, p, me)}</span>
            </li>
          ))}
        </ul>
      </section>
      {alleStrip}
      {PEOPLE.map((p) => {
        const evs = eventsOn(events, s, p);
        return (
          <section key={p} className="person-sec">
            <div className="person-h"><Dot p={p} />{PERSON[p].name}</div>
            {evs.map((e) => <EventChip key={e.id} e={e} date={s} />)}
            {!evs.length && <div className="empty">Nichts eingetragen</div>}
          </section>
        );
      })}
      <div className="two">{shopBox}{todoBox}</div>
      {noteBox}
    </div>
  );
}
