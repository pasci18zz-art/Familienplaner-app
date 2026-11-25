import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import type { PersonId } from './model/types';
import { PEOPLE, PERSON } from './model/persons';
import { setDevice, useDevice } from './data';
import { Ctx, type AppCtx, type SheetSpec, type View } from './components/AppContext';
import { Icon } from './components/Icon';
import { Heute } from './views/Heute';
import { Monat, Woche } from './views/Kalender';
import { Aufgaben, Einkauf, Notizen } from './views/Listen';
import { Einstellungen, Mehr } from './views/Einstellungen';
import { DaySheet, EventSheet, MealSheet, StoresSheet } from './sheets/Sheets';
import { VoiceSheet } from './sheets/VoiceSheet';

const VIEWS: Record<View, () => JSX.Element> = {
  heute: Heute, woche: Woche, monat: Monat, einkauf: Einkauf,
  aufgaben: Aufgaben, notizen: Notizen, mehr: Mehr, einstellungen: Einstellungen,
};

/* Navigation über den Browser-Verlauf, damit die Android-Zurück-Taste
   erst Fenster schließt, dann zur vorigen Ansicht geht. */
interface NavState { view: View; sheet?: SheetSpec }

function useWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

function Onboarding() {
  return (
    <div className="onboard">
      <div className="card stack" style={{ maxWidth: 440, width: '100%' }}>
        <div className="row"><Icon name="family" size="l" /><h1 className="h1">Familienplaner</h1></div>
        <p className="muted" style={{ margin: 0 }}>Wer benutzt dieses Gerät? Das lässt sich später in den Einstellungen ändern.</p>
        {PEOPLE.map((p: PersonId) => (
          <button key={p} className="btn onboard-btn" style={{ background: PERSON[p].bg, color: PERSON[p].fg, borderColor: 'transparent' }} onClick={() => setDevice({ me: p })}>
            {PERSON[p].name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function App() {
  const dev = useDevice();
  const width = useWidth();
  const layout: 'phone' | 'tablet' = dev.mode === 'auto' ? (width >= 900 ? 'tablet' : 'phone') : dev.mode;
  const [nav, setNav] = useState<NavState>(() => (history.state as NavState | null)?.view ? (history.state as NavState) : { view: 'heute' });
  const [toastText, setToastText] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    history.replaceState({ view: nav.view } satisfies NavState, '');
    const onPop = (e: PopStateEvent) => setNav((e.state as NavState | null) ?? { view: 'heute' });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // nur beim Start
  }, []);

  const go = useCallback((view: View) => {
    const next: NavState = { view };
    if ((history.state as NavState | null)?.sheet) history.replaceState(next, '');
    else history.pushState(next, '');
    setNav(next);
    mainRef.current?.scrollTo(0, 0);
  }, []);

  const openSheet = useCallback((sheet: SheetSpec) => {
    setNav((cur) => {
      const next = { view: cur.view, sheet };
      if (cur.sheet) history.replaceState(next, '');
      else history.pushState(next, '');
      return next;
    });
  }, []);

  const closeSheet = useCallback(() => {
    if ((history.state as NavState | null)?.sheet) history.back();
    else setNav((cur) => ({ view: cur.view }));
  }, []);

  const toast = useCallback((t: string) => {
    setToastText(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastText(''), 2200);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && nav.sheet) closeSheet();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav.sheet, closeSheet]);

  const view: View = layout === 'tablet' && nav.view === 'mehr' ? 'heute' : nav.view;

  const ctx = useMemo<AppCtx | null>(
    () => (dev.me ? { me: dev.me, layout, view, go, openSheet, closeSheet, toast } : null),
    [dev.me, layout, view, go, openSheet, closeSheet, toast],
  );

  if (!ctx) return <Onboarding />;

  const Page = VIEWS[view];
  const navBtn = (v: View, icon: string, label: string) => {
    const active = view === v || (v === 'mehr' && layout === 'phone' && ['monat', 'aufgaben', 'notizen', 'einstellungen'].includes(view));
    return (
      <button key={v} className="nv" onClick={() => go(v)} aria-label={label} aria-current={active ? 'page' : undefined}>
        <Icon name={icon} />
      </button>
    );
  };
  const mic = (
    <button key="mic" className="mic" onClick={() => openSheet({ type: 'voice' })} aria-label="Sprachbefehl">
      <Icon name="mic" />
    </button>
  );

  const s = nav.sheet;
  return (
    <Ctx.Provider value={ctx}>
      <div id="app" className={layout}>
        <main ref={mainRef}>
          <Page />
        </main>
        <nav aria-label="Hauptnavigation">
          {layout === 'phone'
            ? [navBtn('heute', 'home', 'Heute'), navBtn('woche', 'week', 'Woche'), mic, navBtn('einkauf', 'cart', 'Einkauf'), navBtn('mehr', 'dots', 'Mehr')]
            : [
                navBtn('heute', 'home', 'Heute'), navBtn('woche', 'week', 'Woche'), navBtn('monat', 'month', 'Monat'),
                navBtn('einkauf', 'cart', 'Einkauf'), navBtn('aufgaben', 'todo', 'Aufgaben'), navBtn('notizen', 'notes', 'Notizen'),
                navBtn('einstellungen', 'settings', 'Einstellungen'), <span key="sep" className="nav-sep" />, mic,
              ]}
        </nav>
      </div>
      {s && (
        <div id="sheetWrap">
          <div className="scrim" onClick={closeSheet} />
          <div className="sheet" role="dialog" aria-modal="true">
            <div className="grab" />
            {s.type === 'event' && <EventSheet key={`${s.id}-${s.date}`} id={s.id} date={s.date} />}
            {s.type === 'meal' && <MealSheet key={s.date} date={s.date} />}
            {s.type === 'day' && <DaySheet date={s.date} />}
            {s.type === 'stores' && <StoresSheet />}
            {s.type === 'voice' && <VoiceSheet prefill={s.prefill} />}
          </div>
        </div>
      )}
      <div id="toast" className={toastText ? 'on' : ''} role="status" aria-live="polite">{toastText}</div>
    </Ctx.Provider>
  );
}
