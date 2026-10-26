# Devils Rock Trails Website

Die offizielle Website für die Devils Rock Trails in Hennweiler, Rheinland-Pfalz.

## 🚀 Features

- Responsive Design für alle Geräte, Burger-Menü unter 1100px
- Statische Seiten auf Cloudflare Workers (Schriften und Icons lokal, kein Tracking)
- Trail-Status nach Saison, manuell überschreibbar über `status.json`
- Schadensmeldung mit Foto-Upload über einen Cloudflare Worker
- WhatsApp-Zugang mit Cloudflare Turnstile und serverseitiger Prüfung
- Open-Graph-Vorschau, `sitemap.xml`, `robots.txt`, 404-Seite
- Kurzlinks als 301-Weiterleitung im Worker (`REDIRECTS` in `worker/src/index.js`), z. B. `/ctf2026` → `/ctf2027`

## 🛠️ Lokale Entwicklung

```bash
npm install        # einmalig, lädt Font Awesome für die Icon-Sprite
npm run serve      # http://localhost:8000
```

Die Seite muss über einen HTTP-Server am Domain-Root laufen (alle Pfade sind absolut, z. B. `/css/base.css`).

## 🧱 Build: Navigation, Footer und Head

Navigation, Footer und der gemeinsame `<head>`-Block werden **nicht** per JavaScript geladen, sondern von `scripts/build.mjs` direkt in jede Seite geschrieben. Cloudflare Workers liefert die Dateien als Static Assets aus.

1. `components/nav.html` oder `components/footer.html` bearbeiten (oder eine Seite)
2. `npm run build`
3. `npm run check && npm test`
4. `npm run deploy` veröffentlicht die gesamte Website inklusive Worker
5. Geänderte Dateien committen und nach GitHub pushen (Quellcode und CI)

In den Seiten markieren Kommentare die generierten Bereiche – dazwischen nichts von Hand ändern:

```html
<!-- @head --> … <!-- /@head -->
<!-- @nav --> … <!-- /@nav -->
<!-- @footer --> … <!-- /@footer -->
```

Der `@head`-Block erzeugt Favicons, Stylesheets und Open-Graph-Tags aus `<title>`, `<meta name="description">` und `<link rel="canonical">` der Seite. Der Build aktualisiert außerdem `sitemap.xml` (alle Seiten mit Canonical-URL) und die Icon-Sprite.

Die GitHub Action `.github/workflows/check.yml` führt `npm run check` aus und schlägt fehl, wenn ein Build vergessen wurde.

### Neue Seite anlegen

`crew/index.html` kopieren, Titel, Beschreibung, Canonical und Inhalt anpassen, `npm run build` ausführen. Soll sie in die Navigation, den Link in `components/nav.html` ergänzen.

### Icons

Icons sind Font Awesome 6 Free als SVG-Sprite (`assets/icons/icons.svg`):

```html
<svg class="icon" aria-hidden="true"><use href="/assets/icons/icons.svg#bicycle"></use></svg>
```

Den Namen von [fontawesome.com/search](https://fontawesome.com/search?o=r&m=free) verwenden und `npm run build` ausführen. Der Build nimmt nur Icons auf, deren vollständige Referenz (`icons.svg#name`) wörtlich in einer HTML- oder JS-Datei steht.

## 🚴 Trail-Status

Ohne Eingriff richtet sich der Status nach der Saison:

- **Geöffnet**: 1. April – 31. Oktober
- **Geschlossen**: 1. November – 31. März

Für kurzfristige Sperrungen oder Freigaben `status.json` bearbeiten (geht auch direkt im GitHub-Webinterface, ohne Build):

```json
{
  "mode": "closed",
  "message": "Sturmschäden auf dem XC-Trail – bis auf Weiteres gesperrt.",
  "updated": "2026-10-13"
}
```

- `mode`: `"auto"` (Saison), `"open"` oder `"closed"`
- `message`: optionaler Text, sonst Standardtext
- `updated`: optionales Datum, wird als „Stand: …“ angezeigt

Nach dem Commit dauert es durch Caching bis zu ca. 10 Minuten, bis alle Besucher den neuen Status sehen. Zurück zur Saison-Logik: `"mode": "auto"`.

## 📮 Schadensmeldung (Cloudflare Worker)

Das Formular auf `/schaden-melden` sendet an `https://www.devilsrock.de/api/schaden-melden`. Diese Route und die statische Website bedient der Worker `devilsrock-forms` in `worker/`. Der Worker schickt die Meldung inkl. bis zu 3 Fotos per Cloudflare Email Sending an `REPORT_TO` und speichert nichts.

- Absender: `trails@send.devilsrock.de`. Die Subdomain `send.devilsrock.de` ist für Email Sending eingerichtet. Der Empfang auf der Hauptdomain läuft seit dem 19.10.2026 über Cloudflare Email Routing; die bisherigen iCloud-MX/SPF-Einträge wurden ersetzt. Weiterleitungen benötigen bestätigte Zieladressen. Die Weiterleitungen für `dom@`, `julian@` und `flo@` sind eingerichtet; Flos Zieladresse wurde am 21.10.2026 bestätigt und seine Regel aktiviert. Der Catch-all ist deaktiviert.
- Empfänger und Absender stehen als `vars` in `worker/wrangler.jsonc`.
- Spam-Schutz: Honeypot-Feld, Origin-Prüfung, max. 5 Meldungen pro Minute und IP.
- Fotos werden im Browser auf max. 1600px verkleinert (entfernt auch GPS-Metadaten). Eine E-Mail darf inkl. Anhängen höchstens 5 MiB groß sein; zu große Fotos werden weggelassen und in der Mail aufgelistet.
- Ohne JavaScript funktioniert das Formular auch: der Worker leitet zurück auf `/schaden-melden/#gesendet` bzw. `#fehler`.

```bash
cd worker
wrangler dev       # lokal testen, E-Mails werden nur simuliert
cd .. && npm run deploy  # gesamte Website veröffentlichen
wrangler tail      # Live-Logs
```

Einmalige Einrichtung (erledigt am 13.10.2026): `wrangler email sending enable send.devilsrock.de`.

## ☁️ Hosting und Veröffentlichung

Die Website wird vollständig durch Cloudflare Workers Static Assets ausgeliefert. `www.devilsrock.de` und `devilsrock.de` sind Custom Domains des Workers; die Hauptdomain leitet auf `www` weiter. GitHub ist nur Quellcode-Repository und führt die CI-Prüfungen aus. Ein Push allein veröffentlicht keine Website; zum Deploy `npm run deploy` mit angemeldetem Wrangler ausführen.

`scripts/package-site.mjs` kopiert nur ausdrücklich freigegebene Website-Dateien nach `dist/`. Repository-Dateien, Worker-Quellcode, Tests und Secrets werden niemals als Assets veröffentlicht. `worker/wrangler.jsonc` enthält die Deployment-Konfiguration. Der Worker behält seinen vorhandenen Namen `devilsrock-forms`, damit die E-Mail-Bindung und Secrets erhalten bleiben.

## 🛡️ WhatsApp-Community

Alle Website-Links führen nach `/community/`. Nur diese Seite lädt Cloudflare Turnstile (Managed-Modus, ohne Pre-Clearance). Der öffentliche Sitekey kommt von `GET /api/community`. Das Formular sendet das Einmaltoken an `POST /api/community`; der Worker prüft es mit Cloudflares Siteverify, einschließlich Hostname und Aktion `community`, und leitet erst danach zu WhatsApp weiter.

- Cloudflare-Secrets: `TURNSTILE_SECRET`, `WHATSAPP_INVITE_URL`. Den Einladungslink niemals in HTML, JavaScript, README oder öffentliche Konfiguration schreiben.
- Neuen Einladungslink setzen: `wrangler secret put WHATSAPP_INVITE_URL --config worker/wrangler.jsonc` und den Wert interaktiv eingeben.
- Maximal 10 Versuche pro Minute/IP; keine Freigabe bei fehlender Konfiguration, ungültigem Token oder Ausfall von Cloudflare.
- API-Antworten und Weiterleitung sind nicht cachebar; der Einladungslink wird nicht geloggt.
- `npm test` prüft unter anderem Tokenfehler, Wiederverwendung, falschen Hostnamen/Aktion, Rate Limit und erfolgreiche Weiterleitung.
- Ein einmal freigegebener WhatsApp-Link kann weitergegeben werden. Das Captcha schützt den Zugang über die Website, nicht den direkten Beitritt mit bereits bekanntem Link.

## 📁 Struktur

```text
devilsrock.de/
├── index.html                    # Startseite
├── 404.html                      # Fehlerseite (Cloudflare)
├── community/index.html          # Captcha → /api/community
├── crew/index.html               # /crew – Mitglied werden
├── ctf2027/index.html            # /ctf2027 – CTF 2027 (Kurzlink /ctf2026 leitet per Worker weiter)
├── datenschutz/index.html        # /datenschutz
├── nutzungsbestimmungen/index.html
├── schaden-melden/index.html     # Formular → Worker
├── spenden/index.html            # Weiterleitung zu PayPal
├── pages/design.html             # Design Guidelines
├── pages/nutzungsbestimmungen.html  # alte URL, leitet weiter
├── status.json                   # Trail-Status-Override
├── sitemap.xml, robots.txt, site.webmanifest
├── components/                   # Quellen für @nav / @footer
├── css/                          # fonts, base, components, layout, pages
├── js/
│   ├── site.js                   # Burger-Menü, Navbar, Footer-Jahr
│   ├── animations.js             # Scroll-Animationen
│   ├── trail-status.js           # Trail-Status (nur Startseite)
│   └── damage-form.js            # Schadensmeldung
├── scripts/build.mjs             # statischer Build (s. o.)
├── worker/                       # Cloudflare Worker und Sicherheitstests
├── dist/                         # generierte, veröffentlichbare Dateien (ignoriert)
└── assets/                       # docs, fonts, gpx, icons, images, logo, team
```

## 🔗 Links

- **Facebook**: [Devils Rock Trails](https://www.facebook.com/profile.php?id=100076197633953)
- **WhatsApp**: [Community](https://www.devilsrock.de/community/)
- **Instagram**: [@devils_rock_trail_hennweiler](https://www.instagram.com/devils_rock_trail_hennweiler)

## 👥 Team

- **Julian Fritz** - Vorsitzender Radsport (<julian@devilsrock.de>)
- **Florian Bauer** - Jugendtrainer Radsport (<flo@devilsrock.de>)
- **Dominik Ottenbreit** - Koordination Trailbau (<dom@devilsrock.de>)

---

**Devils Rock Trails** - Mountainbike Trails in Hennweiler, Rheinland-Pfalz
