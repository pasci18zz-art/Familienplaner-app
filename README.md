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

## App installieren (Obtainium)

1. Auf jedem Gerät [Obtainium](https://github.com/ImranR98/Obtainium) installieren.
2. In Obtainium „App hinzufügen“ → URL `https://github.com/pasci18zz-art/familienplaner-app` → Hinzufügen.
3. Installieren. Beim ersten Mal warnt Google Play Protect, weil die App nicht aus dem Play Store kommt.
   „Weitere Details“ → „Trotzdem installieren“. Das ist bei selbst gebauten Apps normal.
4. Obtainium meldet künftig neue Versionen von selbst.

Voraussetzung: Es gibt ein GitHub-Release (siehe unten). Ohne Release findet Obtainium nichts.

## Einmalig: Keystore in GitHub hinterlegen

Ohne Keystore baut GitHub nur eine Test-APK, die sich nicht als Update installieren lässt.

GitHub → dieses Repo → **Settings → Secrets and variables → Actions → New repository secret**.
Diese vier Secrets anlegen:

| Name | Inhalt |
|---|---|
| `KEYSTORE_BASE64` | Keystore-Datei als Base64 (eine lange Zeile) |
| `KEYSTORE_PASSWORD` | Passwort des Keystores |
| `KEY_ALIAS` | `familienplaner` |
| `KEY_PASSWORD` | Passwort des Schlüssels (hier gleich wie oben) |

Keystore-Datei und Passwort zusätzlich sicher aufbewahren (Passwort-Manager, USB-Stick).
Geht der Keystore verloren, müssen alle die App neu installieren und verlieren ihre lokalen Daten.
Der Keystore gehört **nie** ins Repo.

## Neue Version veröffentlichen

1. In `package.json` die `version` erhöhen (z. B. `1.0.0` → `1.1.0`).
2. GitHub → **Releases → Draft a new release** → Tag `v1.1.0` neu anlegen → „Publish release“.
3. GitHub Actions baut die signierte APK und hängt sie an das Release. Obtainium findet sie danach.

Jeder Push auf `main` baut ebenfalls eine APK. Sie liegt dann unter **Actions → Lauf → Artifacts** (zum Testen).

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
