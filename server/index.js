/* ======================================================================
 * Panini WM 2026 – Tauschgruppen-Server
 * Winziger, abhängigkeitsfreier Node-HTTP-Server (für Render & Co.).
 *
 * Hält je Gruppe:
 *   • Mitglieder + deren tauschbare Karten (have = abgebbare Doppelte,
 *     want = fehlende Karten)
 *   • Anfragen / Gegenangebote / Zusagen
 *
 * Speicherung: im Arbeitsspeicher, periodisch nach data.json gesichert,
 * damit Neustarts den Stand nicht verlieren. Kein Login, nur ein
 * Gruppen-Code, den sich die Sammler absprechen.
 * ====================================================================== */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data.json");
const MEMBER_TTL = 1000 * 60 * 60 * 24 * 30; // 30 Tage Inaktivität -> aufräumen

/* ---- Persistenz ------------------------------------------------------ */
let DB = { groups: {} }; // groups[id] = { id, name, members:{}, requests:{} }

function loadDb() {
  try { DB = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch (e) { DB = { groups: {} }; }
  if (!DB.groups) DB.groups = {};
}
let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    fs.writeFile(DATA_FILE, JSON.stringify(DB), (err) => { if (err) console.error("save failed", err); });
  }, 800);
}
loadDb();

/* ---- Helfer ---------------------------------------------------------- */
function slug(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gruppe";
}
function getGroup(id) { return DB.groups[id]; }
function ensureGroup(code) {
  const id = slug(code);
  if (!DB.groups[id]) DB.groups[id] = { id, name: code, members: {}, requests: {} };
  return DB.groups[id];
}
function pruneMembers(g) {
  const now = Date.now();
  for (const mid in g.members) {
    if (now - (g.members[mid].lastSeen || 0) > MEMBER_TTL) delete g.members[mid];
  }
}

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); } });
  });
}

/* ---- Routing --------------------------------------------------------- */
const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const url = new URL(req.url, "http://x");
  const parts = url.pathname.split("/").filter(Boolean); // z.B. ["api","group","id","state"]

  try {
    // Health / Root
    if (parts.length === 0 || (parts[0] === "api" && parts.length === 1)) {
      return send(res, 200, { ok: true, service: "panini-tauschserver", groups: Object.keys(DB.groups).length });
    }

    if (parts[0] !== "api") return send(res, 404, { error: "not found" });

    // POST /api/group/join { code, member:{id,name} }
    if (req.method === "POST" && parts[1] === "group" && parts[2] === "join") {
      const b = await readBody(req);
      if (!b.code || !b.member || !b.member.id) return send(res, 400, { error: "code & member erforderlich" });
      const g = ensureGroup(b.code);
      g.members[b.member.id] = Object.assign({ have: {}, want: {} }, g.members[b.member.id], {
        id: b.member.id, name: b.member.name || "Sammler", lastSeen: Date.now(),
      });
      scheduleSave();
      return send(res, 200, { group: { id: g.id, name: g.name } });
    }

    // POST /api/collection { groupId, member, have, want }
    if (req.method === "POST" && parts[1] === "collection") {
      const b = await readBody(req);
      const g = getGroup(b.groupId);
      if (!g || !b.member || !b.member.id) return send(res, 404, { error: "gruppe/mitglied unbekannt" });
      g.members[b.member.id] = Object.assign({}, g.members[b.member.id], {
        id: b.member.id, name: b.member.name || (g.members[b.member.id] && g.members[b.member.id].name) || "Sammler",
        have: b.have || {}, want: b.want || {}, counts: b.counts || {}, lastSeen: Date.now(),
      });
      scheduleSave();
      return send(res, 200, { ok: true });
    }

    // GET /api/group/:id/state?member=ID
    if (req.method === "GET" && parts[1] === "group" && parts[3] === "state") {
      const g = getGroup(parts[2]);
      if (!g) return send(res, 404, { error: "gruppe unbekannt" });
      const me = url.searchParams.get("member");
      if (me && g.members[me]) { g.members[me].lastSeen = Date.now(); scheduleSave(); }
      pruneMembers(g);
      const members = Object.values(g.members).map((m) => ({ id: m.id, name: m.name, have: m.have || {}, want: m.want || {}, counts: m.counts || {} }));
      // nur Anfragen, die mich betreffen
      const requests = Object.values(g.requests).filter((r) => !me || r.from === me || r.to === me);
      return send(res, 200, { group: { id: g.id, name: g.name }, members, requests });
    }

    // POST /api/request  (volles Anfrage-Objekt)
    if (req.method === "POST" && parts[1] === "request" && parts.length === 2) {
      const r = await readBody(req);
      const g = getGroup(r.groupId);
      if (!g || !r.id || !r.from || !r.to) return send(res, 400, { error: "ungültige anfrage" });
      const prev = g.requests[r.id] || {};
      g.requests[r.id] = Object.assign({}, prev, r, { ts: Date.now() });
      // Gegenangebot/neue Anfrage setzt Zusagen & Ausführungen zurück
      g.requests[r.id].acceptedBy = r.acceptedBy || {};
      g.requests[r.id].executedBy = r.executedBy || {};
      scheduleSave();
      return send(res, 200, { ok: true, request: g.requests[r.id] });
    }

    // POST /api/request/:id/accept { side }
    if (req.method === "POST" && parts[1] === "request" && parts[3] === "accept") {
      const b = await readBody(req);
      const g = findGroupOfRequest(parts[2]);
      if (!g) return send(res, 404, { error: "anfrage unbekannt" });
      const r = g.requests[parts[2]];
      r.acceptedBy = Object.assign({}, r.acceptedBy, { [b.side]: true });
      r.status = "accepted";
      scheduleSave();
      return send(res, 200, { ok: true, request: r });
    }

    // POST /api/request/:id/done { side }
    if (req.method === "POST" && parts[1] === "request" && parts[3] === "done") {
      const b = await readBody(req);
      const g = findGroupOfRequest(parts[2]);
      if (g && g.requests[parts[2]]) {
        const r = g.requests[parts[2]];
        if (b.side) {
          r.executedBy = Object.assign({}, r.executedBy, { [b.side]: true });
          if (r.executedBy.from && r.executedBy.to) r.status = "done";
        } else {
          r.status = "done";
        }
        scheduleSave();
      }
      return send(res, 200, { ok: true });
    }

    // DELETE /api/request/:id
    if (req.method === "DELETE" && parts[1] === "request") {
      const g = findGroupOfRequest(parts[2]);
      if (g) { delete g.requests[parts[2]]; scheduleSave(); }
      return send(res, 200, { ok: true });
    }

    // POST /api/group/:id/leave { member }
    if (req.method === "POST" && parts[1] === "group" && parts[3] === "leave") {
      const b = await readBody(req);
      const g = getGroup(parts[2]);
      if (g) {
        delete g.members[b.member];
        for (const rid in g.requests) {
          const r = g.requests[rid];
          if (r.from === b.member || r.to === b.member) delete g.requests[rid];
        }
        scheduleSave();
      }
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: "route not found" });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: "server error" });
  }
});

function findGroupOfRequest(rid) {
  for (const id in DB.groups) if (DB.groups[id].requests[rid]) return DB.groups[id];
  return null;
}

server.listen(PORT, () => console.log(`Panini-Tauschserver läuft auf :${PORT}`));
