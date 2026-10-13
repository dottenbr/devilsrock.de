# Devils Rock Trails Website

Die offizielle Website für die Devils Rock Trails in Hennweiler, Rheinland-Pfalz.

## 🚀 Features

- Responsive Design für alle Geräte, Burger-Menü unter 1100px
- Statische Seiten ohne externe Abhängigkeiten (Schriften und Icons lokal, keine Cookies, kein Tracking)
- Trail-Status nach Saison, manuell überschreibbar über `status.json`
- Schadensmeldung mit Foto-Upload über einen Cloudflare Worker
- Open-Graph-Vorschau, `sitemap.xml`, `robots.txt`, 404-Seite

## 🛠️ Lokale Entwicklung

```bash
npm install        # einmalig, lädt Font Awesome für die Icon-Sprite
npm run serve      # http://localhost:8000
```

Die Seite muss über einen HTTP-Server am Domain-Root laufen (alle Pfade sind absolut, z. B. `/css/base.css`).

## 🧱 Build: Navigation, Footer und Head

Navigation, Footer und der gemeinsame `<head>`-Block werden **nicht** per JavaScript geladen, sondern von `scripts/build.mjs` direkt in jede Seite geschrieben. GitHub Pages liefert die Dateien danach unverändert aus.

1. `components/nav.html` oder `components/footer.html` bearbeiten (oder eine Seite)
2. `npm run build`
3. Geänderte Dateien committen

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

Das Formular auf `/schaden-melden` sendet an `https://www.devilsrock.de/api/schaden-melden`. Diese Route bedient der Worker in `worker/`; alle anderen Pfade kommen weiter von GitHub Pages. Der Worker schickt die Meldung inkl. bis zu 3 Fotos per Cloudflare Email Sending an `REPORT_TO` und speichert nichts.

- Absender: `trails@send.devilsrock.de`. Nur die Subdomain `send.devilsrock.de` ist für Email Sending eingerichtet; die iCloud-MX/SPF-Einträge der Hauptdomain bleiben unberührt. **Email Routing nicht auf devilsrock.de aktivieren** – das würde die iCloud-Postfächer (julian@, flo@, dom@) abschalten.
- Empfänger und Absender stehen als `vars` in `worker/wrangler.jsonc`.
- Spam-Schutz: Honeypot-Feld, Origin-Prüfung, max. 5 Meldungen pro Minute und IP.
- Fotos werden im Browser auf max. 1600px verkleinert (entfernt auch GPS-Metadaten). Eine E-Mail darf inkl. Anhängen höchstens 5 MiB groß sein; zu große Fotos werden weggelassen und in der Mail aufgelistet.
- Ohne JavaScript funktioniert das Formular auch: der Worker leitet zurück auf `/schaden-melden/#gesendet` bzw. `#fehler`.

```bash
cd worker
wrangler dev       # lokal testen, E-Mails werden nur simuliert
wrangler deploy    # veröffentlichen
wrangler tail      # Live-Logs
```

Einmalige Einrichtung (erledigt am 13.10.2026): `wrangler email sending enable send.devilsrock.de`.

## 📁 Struktur

```text
devilsrock.de/
├── index.html                    # Startseite
├── 404.html                      # Fehlerseite (GitHub Pages)
├── crew/index.html               # /crew – Mitglied werden
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
├── worker/                       # Cloudflare Worker für /api/*
└── assets/                       # docs, fonts, gpx, icons, images, logo, team
```

## 🔗 Links

- **Facebook**: [Devils Rock Trails](https://www.facebook.com/profile.php?id=100076197633953)
- **WhatsApp**: [Community](https://chat.whatsapp.com/CEPt7TiijKc3xoyRv0TyBc?mode=ac_t)
- **Instagram**: [@devils_rock_trail_hennweiler](https://www.instagram.com/devils_rock_trail_hennweiler)

## 👥 Team

- **Julian Fritz** - Vorsitzender Radsport (<julian@devilsrock.de>)
- **Florian Bauer** - Jugendtrainer Radsport (<flo@devilsrock.de>)
- **Dominik Ottenbreit** - Koordination Trailbau (<dom@devilsrock.de>)

---

**Devils Rock Trails** - Mountainbike Trails in Hennweiler, Rheinland-Pfalz
