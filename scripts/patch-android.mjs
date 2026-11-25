// Passt das von Capacitor erzeugte Android-Projekt an.
// Läuft in GitHub Actions nach `npx cap add android` / `npx cap sync android`.
// Der Ordner android/ wird nicht eingecheckt, alle Anpassungen stehen hier.
//
// Umgebungsvariablen: VERSION_NAME (z. B. 1.0.0), VERSION_CODE (ganze Zahl, steigt bei jedem Build)

import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'android/app';
const RES = join(ROOT, 'src/main/res');

function edit(file, fn) {
  const before = readFileSync(file, 'utf8');
  const after = fn(before);
  if (after === before) console.warn(`Hinweis: ${file} unverändert`);
  writeFileSync(file, after);
}

function write(file, text) {
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, text.trimStart());
}

// 1. Version
const versionName = process.env.VERSION_NAME || '0.0.0-dev';
const versionCode = parseInt(process.env.VERSION_CODE || '1', 10);
edit(join(ROOT, 'build.gradle'), (s) =>
  s.replace(/versionCode \d+/, `versionCode ${versionCode}`).replace(/versionName "[^"]*"/, `versionName "${versionName}"`),
);
console.log(`Version ${versionName} (${versionCode})`);

// 1b. Ohne eigene Secrets: Release-APK mit dem (im Actions-Cache gespeicherten) Debug-Schlüssel signieren,
//     damit sie installierbar ist und Updates darüber passen.
if (process.env.USE_DEBUG_SIGNING === '1') {
  edit(join(ROOT, 'build.gradle'), (s) =>
    s.includes('signingConfig signingConfigs.debug')
      ? s
      : s.replace(/(buildTypes\s*\{\s*release\s*\{)/, '$1\n            signingConfig signingConfigs.debug'),
  );
  console.log('Release wird mit dem Debug-Schlüssel signiert.');
}

// 2. App-Symbol: blauer Hintergrund, weißer Kalender, drei Personenfarben
const ICON_BODY = 'M36,32h36a6,6 0 0 1 6,6v34a6,6 0 0 1 -6,6h-36a6,6 0 0 1 -6,-6v-34a6,6 0 0 1 6,-6z';
const dot = (x) => `M${x - 4.5},61a4.5,4.5 0 1,0 9,0a4.5,4.5 0 1,0 -9,0z`;
write(
  join(RES, 'drawable/fp_icon_foreground.xml'),
  `
<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
    <path android:fillColor="#FFFFFF" android:pathData="${ICON_BODY}"/>
    <path android:fillColor="#E6F1FB" android:pathData="M30,45h48v-7a6,6 0 0 0 -6,-6h-36a6,6 0 0 0 -6,6z"/>
    <path android:strokeColor="#FFFFFF" android:strokeWidth="4" android:strokeLineCap="round" android:pathData="M42,26v10M66,26v10"/>
    <path android:fillColor="#0F6E56" android:pathData="${dot(42)}"/>
    <path android:fillColor="#993C1D" android:pathData="${dot(54)}"/>
    <path android:fillColor="#534AB7" android:pathData="${dot(66)}"/>
</vector>
`,
);
write(
  join(RES, 'drawable/fp_icon_monochrome.xml'),
  `
<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
    <path android:fillColor="#FFFFFF" android:fillType="evenOdd"
        android:pathData="${ICON_BODY} ${dot(42)} ${dot(54)} ${dot(66)}"/>
    <path android:strokeColor="#FFFFFF" android:strokeWidth="4" android:strokeLineCap="round" android:pathData="M42,26v10M66,26v10"/>
</vector>
`,
);
const adaptive = `
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/fp_icon_foreground"/>
    <monochrome android:drawable="@drawable/fp_icon_monochrome"/>
</adaptive-icon>
`;
write(join(RES, 'mipmap-anydpi-v26/ic_launcher.xml'), adaptive);
write(join(RES, 'mipmap-anydpi-v26/ic_launcher_round.xml'), adaptive);
write(
  join(RES, 'values/ic_launcher_background.xml'),
  `
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#185FA5</color>
</resources>
`,
);

// 3. Startbildschirm: App-Hintergrundfarbe statt Capacitor-Logo
for (const dir of readdirSync(RES)) {
  const f = join(RES, dir, 'splash.png');
  if (dir.startsWith('drawable') && existsSync(f)) rmSync(f);
}
write(
  join(RES, 'drawable/splash.xml'),
  `
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item><color android:color="#F1F0EB"/></item>
</layer-list>
`,
);
edit(join(RES, 'values/styles.xml'), (s) =>
  s.includes('windowSplashScreenBackground')
    ? s
    : s.replace(
        '<item name="android:background">@drawable/splash</item>',
        '<item name="android:background">@drawable/splash</item>\n        <item name="windowSplashScreenBackground">#F1F0EB</item>\n        <item name="windowSplashScreenAnimatedIcon">@drawable/fp_icon_foreground</item>\n        <item name="windowSplashScreenIconBackgroundColor">#185FA5</item>\n        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>',
      ),
);

// 4. Nur Hochformat/Querformat je nach Gerät: nichts erzwingen (Tablet an der Wand meist quer).

console.log('Android-Projekt angepasst.');
