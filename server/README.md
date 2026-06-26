# Panini WM 2026 – Tauschgruppen-Server

Winziger, **abhängigkeitsfreier** Node-HTTP-Server für die Live-Tauschgruppe
(Option 2 im Tauschen-Tab). Kein Login, keine Datenbank – nur ein Gruppen-Code,
den sich die Sammler absprechen.

## Lokal starten

```bash
cd server
node index.js          # läuft auf http://localhost:3000
```

Im App-Tab **Tauschen → Tauschgruppe (live)** als Server-Adresse
`http://localhost:3000` eintragen.

## Auf Render deployen (kostenlos)

1. Repo zu GitHub pushen (ist bereits geschehen).
2. Auf [render.com](https://render.com) → **New + → Blueprint** → dieses Repo
   wählen. Render liest `server/render.yaml` und startet `node index.js`.
   *(Alternativ manuell: **New + → Web Service**, Root Directory `server`,
   Build Command leer lassen, Start Command `node index.js`.)*
3. Nach dem Deploy bekommst du eine URL wie
   `https://panini-tauschserver.onrender.com`.
4. Diese URL in der App unter **Tauschen → Tauschgruppe → Server-Adresse**
   eintragen, Anzeigenamen + Gruppen-Code setzen, **Beitreten**.

> Hinweis: Auf dem Render-Free-Plan schläft der Dienst nach Inaktivität ein und
> braucht beim ersten Aufruf ein paar Sekunden. Der Gruppen-Stand wird in
> `data.json` gesichert; auf dem Free-Plan ist die Platte allerdings flüchtig,
> ein Stand kann bei einem Neustart verloren gehen. Wichtige Anfragen liegen
> zusätzlich **lokal in der App** und gehen dort nicht verloren.

## API (für Interessierte)

| Methode & Pfad | Zweck |
|---|---|
| `POST /api/group/join` | `{ code, member:{id,name} }` → Gruppe beitreten/erstellen |
| `POST /api/collection` | `{ groupId, member, have, want }` → tauschbare Karten teilen |
| `GET /api/group/:id/state?member=ID` | Mitglieder + mich betreffende Anfragen |
| `POST /api/request` | Anfrage/Gegenangebot anlegen oder ersetzen |
| `POST /api/request/:id/accept` | `{ side: "from"\|"to" }` → zusagen |
| `POST /api/request/:id/done` | Tausch als ausgeführt markieren |
| `DELETE /api/request/:id` | Anfrage löschen |
| `POST /api/group/:id/leave` | `{ member }` → Gruppe verlassen |

`have` = abgebbare Doppelte (`{ kartenId: menge }`), `want` = fehlende Karten.
Es werden **keine** kompletten Sammlungen übertragen, nur was tauschrelevant ist.
