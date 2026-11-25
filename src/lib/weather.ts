import { useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { todayStr } from './dates';

/**
 * Wetter von Bright Sky (Daten: Deutscher Wetterdienst), ohne API-Schlüssel.
 * Später zusätzlich: echte Außentemperatur von einem Ecowitt-Gateway im Heimnetz.
 */
const LAT = 50.7397;
const LON = 8.2861;
const PLACE = 'Dillenburg';
const CACHE_KEY = 'weather';
const MAX_AGE = 30 * 60 * 1000;

export interface Weather {
  place: string;
  temp: number | null;
  min: number | null;
  max: number | null;
  icon: string;
  text: string;
  fetchedAt: number;
}

const TEXT: Record<string, string> = {
  'clear-day': 'Sonnig', 'clear-night': 'Klar', 'partly-cloudy-day': 'Leicht bewölkt', 'partly-cloudy-night': 'Leicht bewölkt',
  cloudy: 'Bewölkt', fog: 'Nebel', wind: 'Windig', rain: 'Regen', sleet: 'Schneeregen', snow: 'Schnee', hail: 'Hagel', thunderstorm: 'Gewitter',
};

async function fetchWeather(): Promise<Weather> {
  const cur = await fetch(`https://api.brightsky.dev/current_weather?lat=${LAT}&lon=${LON}&tz=Europe/Berlin`);
  if (!cur.ok) throw new Error(`Bright Sky ${cur.status}`);
  const cj = await cur.json();
  let min: number | null = null;
  let max: number | null = null;
  try {
    const day = await fetch(`https://api.brightsky.dev/weather?lat=${LAT}&lon=${LON}&date=${todayStr()}&tz=Europe/Berlin`);
    if (day.ok) {
      const temps = ((await day.json()).weather as { temperature: number | null }[])
        .map((h) => h.temperature)
        .filter((x): x is number => typeof x === 'number');
      if (temps.length) {
        min = Math.round(Math.min(...temps));
        max = Math.round(Math.max(...temps));
      }
    }
  } catch {
    /* Tageswerte sind optional */
  }
  const w = cj.weather ?? {};
  const icon: string = w.icon ?? 'cloudy';
  return {
    place: PLACE,
    temp: typeof w.temperature === 'number' ? Math.round(w.temperature) : null,
    min,
    max,
    icon,
    text: TEXT[icon] ?? 'Aktuell',
    fetchedAt: Date.now(),
  };
}

export function useWeather() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      let cached: Weather | null = null;
      try {
        const { value } = await Preferences.get({ key: CACHE_KEY });
        if (value) cached = JSON.parse(value);
      } catch {
        /* egal */
      }
      if (cached && alive) setWeather(cached);
      if (cached && Date.now() - cached.fetchedAt < MAX_AGE) return;
      try {
        const fresh = await fetchWeather();
        if (!alive) return;
        setWeather(fresh);
        setError(false);
        void Preferences.set({ key: CACHE_KEY, value: JSON.stringify(fresh) });
      } catch {
        if (alive) setError(true);
      }
    };
    void run();
    const t = setInterval(run, 10 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return { weather, error };
}
