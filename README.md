# Familienplaner

Gemeinsame Familien-App für Papa, Mama und Pascal: Kalender, Einkaufszettel, Aufgaben, Pinnwand, Wetter und Sprachbefehle.
Läuft als Android-App (Tablet im Wohnzimmer und Handys) und im Browser.

Technik: React + TypeScript + Vite, verpackt mit Capacitor 8. Die APK baut GitHub Actions.

## Stand

| Phase | Inhalt | Stand |
|---|---|---|
| 0 | Gerüst, signierte APK über GitHub Actions | fertig |
| 1 | Profilwahl, Kalender Woche/Monat, Personenfarben, Symbole, Essenszeile, Einkaufszettel, Rechte „nur eigene Termine“ | fertig |
| 2 | Tablet-Dashboard „Heute“, Wetter (DWD) | fertig |
| 2 | Erinnerungen, Morgen-Zusammenfassung, Bildschirm-an, Nachtmodus, Samsung-Akku-Hinweis | offen |
| 3 | Aufgaben, Pinnwand, wöchentliche Termine, private Termine, Feiertage Hessen | fertig |
| 3 | Schulferien Hessen (OpenHolidays), Verknüpfung mit School OS | offen |
| 4 | Sprachbefehle per Text/Tastatur-Diktat mit Bestätigungskarte | fertig |
| 4 | Echte Android-Spracherkennung, Push, Ecowitt, OneDrive-Backup | offen |
| – | Abgleich zwischen Geräten (Firebase oder OneDrive) | offen, Entscheidung steht aus |

**Wichtig:** Solange der Abgleich fehlt, speichert jedes Gerät nur seine eigenen Einträge.
Übergangsweise: Einstellungen → „Sicherung kopieren“ auf Gerät A, auf Gerät B „Sicherung einfügen“.

## App herunterladen

Jede Änderung auf `main` baut automatisch eine neue APK und legt sie als Release **„neueste-version“** ab.

**Direkter Download (bleibt immer gleich):**
https://github.com/pasci18zz-art/Familienplaner-app/releases/download/neueste-version/Familienplaner.apk

1. Link auf dem Handy/Tablet öffnen, `Familienplaner.apk` lädt herunter.
2. Antippen → Installieren. Beim ersten Mal „Installation aus unbekannten Quellen“ erlauben.
3. Warnt Google Play Protect: „Weitere Details“ → „Trotzdem installieren“.
4. Für ein Update einfach dieselbe Datei neu laden und drüber installieren. Die Daten bleiben erhalten.

Samsung: Falls die Installation blockiert wird, unter Einstellungen → Sicherheit und Datenschutz → **Automatische Blockierung** ausschalten.

### Signierung

Ohne eigene Secrets signiert GitHub Actions mit einem Schlüssel, der im Actions-Cache gespeichert wird
(wie bei Standby). Optional kann ein eigener Keystore hinterlegt werden
(Secrets `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`). Achtung: Ein Wechsel des
Schlüssels heißt einmal deinstallieren und neu installieren.

## Entwickeln

```bash
npm install
npm run dev        # im Browser: http://localhost:5173
npm run build      # Typprüfung + Build nach dist/
```

Android lokal (braucht Android Studio): `npx cap add android && npx cap sync android && node scripts/patch-android.mjs`, dann `npx cap open android`.
Der Ordner `android/` wird nicht eingecheckt. Alle Anpassungen (Version, App-Symbol, Startbildschirm) macht `scripts/patch-android.mjs`.

## Aufbau

```
src/
  model/        Datenmodell (CalendarEvent, Meal, Store, ShoppingItem, Todo, Note) und Personen
  data/         Repository-Schnittstelle + LocalRepository (Speicher auf dem Gerät)
  lib/          Datum, Feiertage Hessen, Termin-Logik, Sprach-Parser, Wetter
  views/        Heute, Woche, Monat, Einkauf, Aufgaben, Pinnwand, Einstellungen
  sheets/       Fenster von unten: Termin, Essen, Tag, Geschäfte, Sprachbefehl
```

**Sync später einbauen:** Alle Daten laufen über `Repository` in `src/data/repository.ts`.
Für Firebase oder OneDrive kommt eine zweite Klasse mit derselben Schnittstelle dazu,
in `src/data/index.ts` wird dann nur `new LocalRepository()` ausgetauscht.
Jeder Eintrag hat bereits `id`, `ownerId`, `updatedAt` und eine Lösch-Markierung (`deleted`).

**Rechte:** Termine darf nur ändern, wer sie angelegt hat (`ownerId`). Mit Firebase wird das zusätzlich
serverseitig per Security Rules geprüft (`request.auth.uid == resource.data.ownerId`).

## Datenschutz

- Keine API-Schlüssel in App oder Repo. Bright Sky (Wetter) braucht keinen Schlüssel.
- Arzttermine nur mit Symbol „Arzt“, keine Diagnosen eintragen.
- Einkaufsartikel zeigen keinen Namen an.

## Google-Entwicklerverifizierung (ab 2027)

Damit die App auf zertifizierten Android-Geräten installierbar bleibt, ein kostenloses
„Limited Distribution“-Konto in der Android Developer Console anlegen und den Paketnamen
`de.familie.planer` registrieren.
