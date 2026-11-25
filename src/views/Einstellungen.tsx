import { useState } from 'react';
import type { BackupFile } from '../model/types';
import { PEOPLE, PERSON, pv } from '../model/persons';
import { repo, setDevice, useDevice, type DeviceMode } from '../data';
import { useApp, type View } from '../components/AppContext';
import { Icon } from '../components/Icon';

export function Mehr() {
  const { go } = useApp();
  const item = (v: View, icon: string, title: string, desc: string) => (
    <button onClick={() => go(v)}>
      <Icon name={icon} />
      <span><span style={{ display: 'block' }}>{title}</span><span className="muted">{desc}</span></span>
      <Icon name="chevR" />
    </button>
  );
  return (
    <>
      <div className="pagehead"><h1 className="h1">Mehr</h1></div>
      <div className="menu">
        {item('monat', 'month', 'Monat', 'Monatsübersicht mit Feiertagen')}
        {item('aufgaben', 'todo', 'Aufgaben', 'Persönliche Listen, für alle sichtbar')}
        {item('notizen', 'notes', 'Pinnwand', 'Gemeinsame Notizen')}
        {item('einstellungen', 'settings', 'Einstellungen', 'Profil, Gerät, Sicherung')}
      </div>
    </>
  );
}

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} role="radio" aria-checked={value === v} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

export function Einstellungen() {
  const { toast } = useApp();
  const dev = useDevice();
  const [backup, setBackup] = useState('');
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState('');

  const doExport = async () => {
    const json = JSON.stringify(await repo.exportAll());
    setBackup(json);
    try {
      await navigator.clipboard.writeText(json);
      toast('Sicherung kopiert');
    } catch {
      toast('Text unten markieren und kopieren');
    }
  };
  const doImport = async () => {
    try {
      const res = await repo.importAll(JSON.parse(importText) as BackupFile);
      setImportMsg(`Fertig: ${res.added} neu, ${res.updated} aktualisiert.`);
      setImportText('');
    } catch (e) {
      setImportMsg(e instanceof SyntaxError ? 'Der Text ist keine gültige Sicherung. Bitte komplett einfügen.' : String((e as Error).message));
    }
  };

  return (
    <>
      <div className="pagehead"><h1 className="h1">Einstellungen</h1></div>
      <div className="setgrid">
        <section className="card setsec">
          <div className="row"><Icon name="family" /><span className="h2">Wer benutzt dieses Gerät?</span></div>
          <div className="radios" role="radiogroup">
            {PEOPLE.map((p) => (
              <label key={p} style={pv(p)}>
                <input type="radio" name="me" checked={dev.me === p} onChange={() => setDevice({ me: p })} />
                <span>{PERSON[p].name}</span>
              </label>
            ))}
          </div>
          <div className="muted small">Bestimmt, welche Termine du ändern darfst. Auf dem Wohnzimmer-Tablet am besten die Person wählen, die es meistens bedient.</div>
        </section>

        <section className="card setsec">
          <div className="row"><Icon name="device" /><span className="h2">Ansicht</span></div>
          <Seg<DeviceMode>
            label="Ansicht"
            value={dev.mode}
            onChange={(v) => setDevice({ mode: v })}
            options={[['auto', 'Automatisch'], ['phone', 'Handy'], ['tablet', 'Tablet']]}
          />
          <div className="muted small">„Automatisch“ nimmt ab 900 Pixel Breite das Wohnzimmer-Layout.</div>
          <div className="setrow">
            <div><div style={{ fontWeight: 600 }}>Neue Termine privat</div><div className="muted small">Andere sehen dann nur „Belegt“</div></div>
            <button className="switch" role="switch" aria-checked={dev.privateDefault} aria-label="Neue Termine privat" onClick={() => setDevice({ privateDefault: !dev.privateDefault })} />
          </div>
        </section>

        <section className="card setsec">
          <div className="row"><Icon name="cloudSync" /><span className="h2">Abgleich zwischen Geräten</span></div>
          <div className="lockline"><Icon name="info" size="s" /><span>Noch nicht aktiv. Im Moment speichert jedes Gerät nur seine eigenen Einträge. Der Abgleich (Firebase oder OneDrive) kommt, sobald ihr euch entschieden habt.</span></div>
          <div className="muted small">Bis dahin kannst du Daten von Hand übertragen: Auf Gerät A „Sicherung kopieren“, den Text z. B. per WhatsApp an dich selbst schicken und auf Gerät B einfügen. Doppelte Einträge entstehen dabei nicht, die neuere Änderung gewinnt.</div>
          <button className="btn" onClick={doExport}><Icon name="copy" size="s" />Sicherung kopieren</button>
          {backup && (
            <textarea readOnly value={backup} aria-label="Sicherung als Text" onFocus={(e) => e.currentTarget.select()} style={{ fontSize: 12, minHeight: 72 }} />
          )}
          <label className="label" htmlFor="import-text">Sicherung einfügen</label>
          <textarea id="import-text" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Kopierten Text hier einfügen" style={{ fontSize: 12, minHeight: 72 }} />
          <button className="btn" onClick={doImport} disabled={!importText.trim()}><Icon name="upload" size="s" />Einfügen und zusammenführen</button>
          {importMsg && <div className="small" role="status">{importMsg}</div>}
        </section>

        <section className="card setsec">
          <div className="row"><Icon name="info" /><span className="h2">Über die App</span></div>
          <div className="muted small">Familienplaner {__APP_VERSION__}. Wetter: Deutscher Wetterdienst über Bright Sky. Feiertage: Hessen, berechnet. Schulferien, Erinnerungen und echte Spracherkennung folgen in den nächsten Phasen.</div>
        </section>
      </div>
    </>
  );
}
