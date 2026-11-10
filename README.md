# Devils Rock Trails Website

Die offizielle Website für die Devils Rock Trails in Hennweiler, Rheinland-Pfalz.

## 🚀 Features

- Astro (statisch), ausgeliefert von Cloudflare Workers. Schriften, Icons und Bilder lokal, kein Tracking
- Responsive, Burger-Menü unter 960px, Hauptnavigation mit vier Punkten plus „Schaden melden“
- Trail-Status nach Saison, manuell überschreibbar über `public/status.json`
- Schadensmeldung mit Foto-Upload über den Cloudflare Worker
- WhatsApp-Zugang mit Cloudflare Turnstile und serverseitiger Prüfung
- Open-Graph-Vorschau, `sitemap.xml`, `robots.txt`, 404-Seite
- Öffentliche CTF-Seite unter `/ctf2027/` mit Ausschreibung, ohne unbestätigte Sponsoren
- Kurzlinks und alte URLs als 301-Weiterleitung im Worker (`REDIRECTS` in `worker/src/index.js`), z. B. `/ctf2026` → `/ctf2027/`, `/pages/design.html` → `/design/`

## 🛠️ Lokale Entwicklung

Voraussetzung: Node.js 24 (siehe `.nvmrc`, mindestens 22.23.4). Wrangler ist als Projektabhängigkeit fest auf eine Version gepinnt; `npm run deploy` und `npm run preview` nutzen diese Version.

```bash
npm install        # einmalig
npm run dev        # Astro-Dev-Server mit Live-Reload, http://localhost:4321
npm run preview    # Build + echter Worker lokal (wrangler dev), inkl. /api/*
```

`npm run dev` zeigt nur die Seiten. Formulare und `/api/*` funktionieren erst mit `npm run preview`.

## 🧱 Aufbau

```text
src/
├── layouts/Base.astro        # <head>, Navigation, Footer für jede Seite
├── components/               # Nav, Footer, PageHeader, TrailStatus, Icon, Komoot
├── data/site.ts              # Links, Navigation, Routen (GPX/Komoot), Kernteam
├── pages/                    # eine Datei pro Seite, URL = Dateiname mit Slash
│   ├── index.astro           # /
│   ├── crew.astro            # /crew/
│   ├── ctf2027.astro         # /ctf2027/
│   ├── community.astro       # /community/ (Turnstile → /api/community)
│   ├── schaden-melden.astro  # /schaden-melden/ (Formular → /api/schaden-melden)
│   ├── spenden.astro         # /spenden/ (leitet zu PayPal weiter)
│   ├── datenschutz.astro, nutzungsbestimmungen.astro, design.astro, 404.astro
│   └── sitemap.xml.ts        # Liste aller indexierbaren Seiten
├── styles/global.css         # Farben, Schrift, Buttons, Karten, Formulare
└── assets/                   # Bilder, die Astro optimiert (Hero, Team)
public/                       # wird 1:1 veröffentlicht (PDFs, GPX, Logos, Fonts, status.json …)
drafts/                       # NICHT veröffentlicht, z. B. ctf2027-sponsoren/
scripts/verify-dist.mjs       # Prüfung nach jedem Build
worker/                       # Cloudflare Worker und Tests
```

- **Texte ändern:** direkt in `src/pages/*.astro`. Links, Routen und Team stehen in `src/data/site.ts`.
- **Neue Seite:** `src/pages/name.astro` anlegen (z. B. `crew.astro` kopieren), in `src/pages/sitemap.xml.ts` eintragen, bei Bedarf in `mainNav` (`src/data/site.ts`) oder im Footer verlinken.
- **Icons:** `<Icon name="bicycle" />` mit einem Namen von [fontawesome.com/search](https://fontawesome.com/search?o=r&m=free) (Font Awesome 6 Free). Das SVG wird beim Build eingebettet.
- **Bilder:** Fotos nach `src/assets/` legen und mit `<Picture>` aus `astro:assets` einbinden, dann erzeugt der Build AVIF/WebP in passenden Größen. Dateien, die unter fester URL erreichbar sein müssen (PDF, GPX, Logos, `og-image.jpg`), gehören nach `public/`.
- **Interne Links** immer mit Slash am Ende (`/crew/`), sonst leitet Cloudflare erst um.

### Build und Prüfungen

```bash
npm run check      # TypeScript/Astro-Prüfung
npm run build      # astro build + scripts/verify-dist.mjs
npm test           # Worker-Tests
```

`scripts/verify-dist.mjs` lässt den Build fehlschlagen, wenn eine Seite fehlt, ein interner Link oder ein Bild ins Leere zeigt, `sitemap.xml` nicht zu den Seiten passt, Sponsor-Dateien, versteckte Dateien oder die private Mailadresse in `dist/` landen. Die GitHub Action führt alle drei Schritte aus und prüft zusätzlich die Worker-Konfiguration mit `wrangler deploy --dry-run` (ohne zu veröffentlichen). Dependabot schlägt einmal im Monat gebündelte Updates für npm und GitHub Actions vor; Font Awesome 7 ist ausgenommen, weil sich dort Icon-Namen ändern.

npm 11 führt Install-Skripte nur aus, wenn sie in `allowScripts` (package.json) freigegeben sind. Erlaubt sind `esbuild` und `workerd` (prüfen ihre Binärdateien), abgelehnt `@fortawesome/fontawesome-free` (nur Hinweistext) und `fsevents`.

## 🚴 Trail-Status

Ohne Eingriff richtet sich der Status nach der Saison:

- **Geöffnet**: 1. April – 31. Oktober
- **Geschlossen**: 1. November – 31. März

Für kurzfristige Sperrungen oder Freigaben `public/status.json` bearbeiten und veröffentlichen (`npm run deploy`):

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

Nach dem Deploy dauert es durch Caching bis zu ca. 10 Minuten, bis alle Besucher den neuen Status sehen. Zurück zur Saison-Logik: `"mode": "auto"`.

## 📮 Schadensmeldung (Cloudflare Worker)

Das Formular auf `/schaden-melden/` sendet an `https://www.devilsrock.de/api/schaden-melden`. Diese Route und die statische Website bedient der Worker `devilsrock-forms` in `worker/`. Der Worker schickt die Meldung inkl. bis zu 3 Fotos per Cloudflare Email Sending an `REPORT_TO` und speichert nichts.

- Absender: `trails@send.devilsrock.de`. Die Subdomain `send.devilsrock.de` ist für Email Sending eingerichtet. Der Empfang auf der Hauptdomain läuft seit dem 19.10.2026 über Cloudflare Email Routing; die bisherigen iCloud-MX/SPF-Einträge wurden ersetzt. Weiterleitungen benötigen bestätigte Zieladressen. Die Weiterleitungen für `dom@`, `julian@` und `flo@` sind eingerichtet; Flos Zieladresse wurde am 21.10.2026 bestätigt und seine Regel aktiviert. Der Catch-all ist deaktiviert.
- Empfänger und Absender stehen als `vars` in `worker/wrangler.jsonc`.
- Spam-Schutz: Honeypot-Feld, Origin-Prüfung, max. 5 Meldungen pro Minute und IP.
- Fotos werden im Browser auf max. 1600px verkleinert (entfernt auch GPS-Metadaten). Eine E-Mail darf inkl. Anhängen höchstens 5 MiB groß sein; zu große Fotos werden weggelassen und in der Mail aufgelistet.
- Ohne JavaScript funktioniert das Formular auch: der Worker leitet zurück auf `/schaden-melden/#gesendet` bzw. `#fehler`.

```bash
npm run preview    # Build + Worker lokal, E-Mails werden nur simuliert
npm run deploy     # gesamte Website veröffentlichen
wrangler tail      # Live-Logs
```

Einmalige Einrichtung (erledigt am 13.10.2026): `wrangler email sending enable send.devilsrock.de`.

## ☁️ Hosting und Veröffentlichung

Die Website wird vollständig durch Cloudflare Workers Static Assets ausgeliefert. `www.devilsrock.de` und `devilsrock.de` sind Custom Domains des Workers; die Hauptdomain leitet auf `www` weiter. GitHub ist nur Quellcode-Repository und führt die CI-Prüfungen aus. Ein Push allein veröffentlicht keine Website; zum Deploy `npm run deploy` mit angemeldetem Wrangler ausführen.

`npm run deploy` baut die Seite (`astro build` nach `dist/`), prüft sie mit `scripts/verify-dist.mjs`, führt die Worker-Tests aus und veröffentlicht dann mit Wrangler. In `dist/` landen nur die gebauten Seiten und der Inhalt von `public/`. Worker-Quellcode, Tests, `drafts/` und Secrets werden nie als Assets veröffentlicht. `worker/wrangler.jsonc` enthält die Deployment-Konfiguration. Der Worker behält seinen vorhandenen Namen `devilsrock-forms`, damit die E-Mail-Bindung und Secrets erhalten bleiben.

## 🛡️ WhatsApp-Community

Alle Website-Links führen nach `/community/`. Nur diese Seite lädt Cloudflare Turnstile (Managed-Modus, ohne Pre-Clearance). Der öffentliche Sitekey kommt von `GET /api/community`. Das Formular sendet das Einmaltoken an `POST /api/community`; der Worker prüft es mit Cloudflares Siteverify, einschließlich Hostname und Aktion `community`, und leitet erst danach zu WhatsApp weiter.

- Cloudflare-Secrets: `TURNSTILE_SECRET`, `WHATSAPP_INVITE_URL`. Den Einladungslink niemals in HTML, JavaScript, README oder öffentliche Konfiguration schreiben.
- Neuen Einladungslink setzen: `wrangler secret put WHATSAPP_INVITE_URL --config worker/wrangler.jsonc` und den Wert interaktiv eingeben.
- Maximal 10 Versuche pro Minute/IP; keine Freigabe bei fehlender Konfiguration, ungültigem Token oder Ausfall von Cloudflare.
- API-Antworten und Weiterleitung sind nicht cachebar; der Einladungslink wird nicht geloggt.
- `npm test` prüft unter anderem Tokenfehler, Wiederverwendung, falschen Hostnamen/Aktion, Rate Limit und erfolgreiche Weiterleitung.
- Ein einmal freigegebener WhatsApp-Link kann weitergegeben werden. Das Captcha schützt den Zugang über die Website, nicht den direkten Beitritt mit bereits bekanntem Link.

## 🚴 Öffentliche CTF-Seite

Seit dem 10.11.2026 ist `/ctf2027/` samt Ausschreibung öffentlich, über die Navigation erreichbar und in der Sitemap enthalten. Unbestätigte Sponsoren, ihre Logos und der geplante Bike-Service werden nicht veröffentlicht. Die Logos liegen in `drafts/ctf2027-sponsoren/` (außerhalb von `public/`) für spätere bestätigte Zusagen; `scripts/verify-dist.mjs` verhindert, dass sie versehentlich veröffentlicht werden.

`PROTECTED` in `worker/src/index.js` ist leer. Das vorhandene Secret `CTF_PASSWORD` wird für die öffentliche CTF-Seite nicht mehr verwendet.

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
