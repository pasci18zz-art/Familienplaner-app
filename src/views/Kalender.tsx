import { useState } from 'react';
import { BUSY_STYLE, PERSON, TARGETS, pv } from '../model/persons';
import { useList } from '../data';
import { eventsOn, isHidden } from '../lib/events';
import { holidayOn } from '../lib/holidays';
import { MON, WD, WDS, addDays, isoWeek, longDate, mondayOf, parseYmd, shortDate, todayStr, ymd } from '../lib/dates';
import { useApp } from '../components/AppContext';
import { Icon } from '../components/Icon';
import { EventChip, HolidayBadge, MealButton } from '../components/Bits';

export function Woche() {
  const { layout, openSheet } = useApp();
  const events = useList('events');
  const [off, setOff] = useState(0);
  const t = todayStr();
  const mon = addDays(mondayOf(new Date()), off * 7);
  const days = [...Array(7)].map((_, i) => ymd(addDays(mon, i)));
  const end = parseYmd(days[6]);
  const range = `${mon.getDate()}.${mon.getMonth() !== end.getMonth() ? ' ' + MON[mon.getMonth()].slice(0, 3) + '.' : ''} – ${end.getDate()}. ${MON[end.getMonth()]}`;
  const tablet = layout === 'tablet';

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="label">KW {isoWeek(mon)}</div>
          <h1 className="h1">{range}</h1>
        </div>
        <div className="weeknav">
          <button className="iconbtn" onClick={() => setOff(off - 1)} aria-label="Vorige Woche"><Icon name="chevL" /></button>
          <button className="btn small" onClick={() => setOff(0)}>Heute</button>
          <button className="iconbtn" onClick={() => setOff(off + 1)} aria-label="Nächste Woche"><Icon name="chevR" /></button>
          <button className="btn small primary" onClick={() => openSheet({ type: 'event', date: days.includes(t) ? t : days[0] })}>
            <Icon name="plus" size="s" />Termin
          </button>
        </div>
      </div>
      <div className={tablet ? 'weekgrid' : 'weeklist'}>
        {days.map((s) => {
          const d = parseYmd(s);
          const evs = eventsOn(events, s);
          const ordered = [...evs.filter((e) => e.person === 'alle'), ...evs.filter((e) => e.person !== 'alle')];
          const isToday = s === t;
          return (
            <div key={s} className={`day${isToday ? ' today' : ''}`} aria-current={isToday ? 'date' : undefined}>
              <div className="day-h">
                <span className="dn">{tablet ? WDS[d.getDay()] : WD[d.getDay()]}</span>
                <span className="dd">{shortDate(s)}</span>
                <HolidayBadge date={s} />
                <button className="add" onClick={() => openSheet({ type: 'event', date: s })} aria-label={`Termin am ${shortDate(s)} hinzufügen`}>
                  <Icon name="plus" size="s" />
                </button>
              </div>
              <MealButton date={s} />
              <div className="chips">
                {ordered.map((e) => <EventChip key={e.id} e={e} date={s} />)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function Monat() {
  const { layout, me, openSheet } = useApp();
  const events = useList('events');
  const [off, setOff] = useState(0);
  const base = new Date();
  const first = new Date(base.getFullYear(), base.getMonth() + off, 1);
  const start = mondayOf(first);
  const t = todayStr();
  const tablet = layout === 'tablet';
  const cells: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    if (i >= 35 && d.getMonth() !== first.getMonth()) break;
    cells.push(ymd(d));
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="label">{first.getFullYear()}</div>
          <h1 className="h1">{MON[first.getMonth()]}</h1>
        </div>
        <div className="weeknav">
          <button className="iconbtn" onClick={() => setOff(off - 1)} aria-label="Voriger Monat"><Icon name="chevL" /></button>
          <button className="btn small" onClick={() => setOff(0)}>Heute</button>
          <button className="iconbtn" onClick={() => setOff(off + 1)} aria-label="Nächster Monat"><Icon name="chevR" /></button>
        </div>
      </div>
      <div className="monthgrid">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((x) => <div key={x} className="mhead">{x}</div>)}
        {cells.map((s) => {
          const d = parseYmd(s);
          const evs = eventsOn(events, s);
          const h = holidayOn(s);
          return (
            <button
              key={s}
              className={`mcell${d.getMonth() !== first.getMonth() ? ' out' : ''}${s === t ? ' today' : ''}${h ? ' hol' : ''}`}
              onClick={() => openSheet({ type: 'day', date: s })}
              aria-label={`${longDate(s)}, ${evs.length} Termine`}
            >
              <span className="num">{d.getDate()}</span>
              {tablet && h && <span className="mhol">{h}</span>}
              {tablet ? (
                <>
                  {evs.slice(0, 3).map((e) => (
                    <div key={e.id} className="mchip" style={isHidden(e, me) ? BUSY_STYLE : pv(e.person)}>
                      {e.allDay ? '' : `${e.start} `}{isHidden(e, me) ? 'Belegt' : e.title}
                    </div>
                  ))}
                  {evs.length > 3 && <div className="mhol muted">+{evs.length - 3} weitere</div>}
                </>
              ) : (
                <div className="mbars">
                  {evs.map((e) => <span key={e.id} className="mbar" style={isHidden(e, me) ? BUSY_STYLE : pv(e.person)} />)}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="row small muted legend">
        {TARGETS.map((p) => (
          <span key={p} className="row" style={{ gap: 6 }}><span className="dot" style={{ background: PERSON[p].fg }} />{PERSON[p].name}</span>
        ))}
        <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: 'var(--holiday)' }} />Feiertag</span>
      </div>
    </>
  );
}
