# Panini WM 2026 – Sticker-Tracker (PWA)

Eine eigenständige, **installierbare** Web-App (PWA), um den eigenen Bestand an
Panini-Stickern zur Fußball-WM 2026 zu verwalten – schnelles Abhaken in großen
Mengen, doppelte & fehlende Karten im Blick.

## Funktionen

- **Schnell abhaken**: Karte antippen = „habe ich“. Mit **−/+** die Anzahl ändern.
- **Ganzes Team auf einmal**: „Alle ✓“ im Team-Kopf hakt alle 20 Karten ab
  (nochmal drücken = leeren).
- **Anzahl / Doppelte** je Karte zählen (für die Tauschbörse).
- **Glanz-Variante ✨** je Karte – nur für die **DFB-Elf** (Glitzer-Sonderkarten).
- **Extra-Sticker**: eigene Gruppe mit 20 Stars in 4 Varianten
  (Lila / Bronze / Silber / Gold).
- **Übersichten**: oben auf *Doppelte* oder *Fehlen mir* umschalten und per
  **📋 Liste kopieren** als Such-/Tauschliste teilen.
- **Suchen** nach Nummer (`GER 12`), Name (`Nmecha`) oder Extra (`Messi Gold`) –
  Tastenkürzel `/` springt ins Suchfeld.
- **Filtern** nach Konföderation (Chips mit Live-Zählern) und Sektion.
- **Sortieren** nach Nummer, Name oder „Fehlende zuerst“.
- **Fortschritt**: großer Ring (× / 980), Statistik-Kacheln, Mini-Ring je Team,
  Konfetti bei komplettem Team.
- **Installierbar**: „App installieren“ bzw. „Zum Startbildschirm“ – läuft danach
  wie eine native App, **offline** dank Service Worker.
- **Import / Export** (JSON) als Backup, **Zurücksetzen**. Speicherung lokal
  (`localStorage`) – kein Server, kein Login.

## Installieren

1. `index.html` über einen (lokalen) Webserver öffnen – z. B.
   `python3 -m http.server` und dann `http://localhost:8000` aufrufen.
   *(Für PWA-Installation/Offline ist ein Server nötig; reines Datei-Öffnen
   reicht zum Testen der Oberfläche.)*
2. Im Browser **„App installieren“** klicken (Desktop) bzw. am Handy über das
   Menü **„Zum Startbildschirm hinzufügen“**.

## Datensatz

**Echte, vollständige Album-Checkliste** (1:1 aus dem Album übertragen):
980 Basis-Sticker + Bonus-Gruppen.

| Abschnitt | Anzahl | Inhalt |
|-----------|-------:|--------|
| FWC 00–19 | 20 | Logo, Emblem, Maskottchen, Slogan, Ball, 3 Gastgeber, 11 WM-Sieger-Fotos |
| 48 Nationen × 20 | 960 | je Team: **1** Wappen (Folie) · **13** Mannschaftsfoto · Rest echte Spieler |
| Extra-Sticker | 20 × 4 | 20 Stars in Lila / Bronze / Silber / Gold (~1:100, Bonus) |
| Coca-Cola | 12 | CC1–CC12 Promo-Sticker (Bonus) |
| Glanz/Silber ✨ | — | DFB-Parallele (players only) – nur Deutschland |

Alle Spielernamen und Nummern entsprechen der echten Checkliste
(z. B. GER 8 = Ridle Baku, GER 12 = Felix Nmecha) und bleiben per ✎ editierbar.

Alle **48 qualifizierten Nationen** sind enthalten (Gastgeber + 16 UEFA, 6
CONMEBOL, 3 CONCACAF, 10 CAF, 9 AFC, 1 OFC – inkl. Playoff-Sieger Irak & DR Kongo).

Welche Spieler Panini je Nation genau aufnimmt, steht erst zum Release fest. Der
DFB-Kader ist real vorbefüllt; übrige Spielernamen sind **editierbare Vorschau**
(✎) bzw. per Import-Datei ersetzbar.

## Dateien

| Datei | Zweck |
|-------|-------|
| `index.html` | Aufbau der Seite |
| `styles.css` | Design |
| `app.js` | Logik (Abhaken, Filter, Suche, PWA) |
| `data.js` | Teams, FWC-, Extra- & DFB-Daten |
| `manifest.webmanifest` | PWA-Manifest (Name, Icons, Standalone) |
| `service-worker.js` | Offline-Cache (App-Shell) |
| `icons/` | App-Icons (192/512 + maskable) |
