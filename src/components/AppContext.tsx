import { createContext, useContext } from 'react';
import type { PersonId } from '../model/types';

export type View = 'heute' | 'woche' | 'monat' | 'einkauf' | 'aufgaben' | 'notizen' | 'mehr' | 'einstellungen';

export type SheetSpec =
  | { type: 'event'; id?: string; date: string }
  | { type: 'meal'; date: string }
  | { type: 'day'; date: string }
  | { type: 'stores' }
  | { type: 'voice'; prefill?: string };

export interface AppCtx {
  me: PersonId;
  layout: 'phone' | 'tablet';
  view: View;
  go: (v: View) => void;
  openSheet: (s: SheetSpec) => void;
  closeSheet: () => void;
  toast: (t: string) => void;
}

export const Ctx = createContext<AppCtx | null>(null);

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp außerhalb von <Ctx.Provider>');
  return c;
}
