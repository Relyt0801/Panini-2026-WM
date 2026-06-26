/* ======================================================================
 * Panini WM 2026 – Tauschen
 * Zwei parallele Wege:
 *   Option 1 «Code/Datei» – komplett offline, ein Tausch-Code (oder JSON-Datei)
 *            wird zwischen zwei Sammlern hin- und hergeschickt.
 *   Option 2 «Tauschgruppe» – ein kleiner Render-Server hält Gruppen, geteilte
 *            Bestände und Anfragen vor; Aushandeln & Live-Tausch laufen darüber.
 * Hängt an den globalen Helfern aus app.js (CARDS, cardById, STATE, save, …).
 * ====================================================================== */

/* ---------------------------------------------------------------------- *
 * State & Helfer
 * ---------------------------------------------------------------------- */
// Fest hinterlegter Tauschserver (Render) – Nutzer müssen keine Adresse eingeben.
const TRADE_SERVER = "https://panini-tauschserver.onrender.com";

function ensureTradeState() {
  if (!STATE.trade) STATE.trade = {};
  const t = STATE.trade;
  t.serverUrl = TRADE_SERVER;                 // immer der feste Server
  if (!("group" in t)) t.group = null;       // { id, name, code }
  if (!t.identity) t.identity = null;         // { id, name }
  if (!Array.isArray(t.requests)) t.requests = []; // persistierte Anfragen (Option 2)
}

// Ephemerer UI-Zustand (nicht persistiert)
const TRADE = {
  view: "home",        // home | off-* | on-*
  partner: null,       // Option 1: { name, counts }
  give: {},            // { cardId: qty }  – ich gebe
  receive: {},         // { cardId: qty }  – ich erhalte
  outFile: null,       // fertige Tausch-Nutzlast für den Partner
  incoming: null,      // eingelesene Tausch-Nutzlast (zum Anwenden)
  // Option 2
  members: [],
  activeReqId: null,
  filterNation: "ALL",
  filterText: "",
  onlyTradeable: true,
};

const tradeCountOf = (id) => (STATE.counts[id] || 0);
const partnerCountOf = (id) => (TRADE.partner ? (TRADE.partner.counts[id] || 0) : 0);

// Karten nach WM-Gruppe → Nation → Nummer sortieren (wie die Übersicht)
function tradeSort(ids) {
  return ids.slice().sort((a, b) => {
    const ca = cardById[a], cb = cardById[b];
    const ga = ALL_GROUPS.indexOf(ca.group), gb = ALL_GROUPS.indexOf(cb.group);
    if (ga !== gb) return ga - gb;
    if (ca.sectionName !== cb.sectionName) return ca.sectionName.localeCompare(cb.sectionName, "de");
    return ca.num - cb.num;
  });
}

/* ---- Tausch-Code (Base64, unicode-fest) ------------------------------ */
const CODE_PREFIX = "PWM1-";
function encodeCode(obj) {
  return CODE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}
function decodeCode(raw) {
  let s = String(raw || "").trim();
  if (s.startsWith(CODE_PREFIX)) s = s.slice(CODE_PREFIX.length);
  s = s.replace(/\s+/g, "");
  return JSON.parse(decodeURIComponent(escape(atob(s))));
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast("Code kopiert"), () => toast("Kopieren nicht möglich"));
  } else {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("Code kopiert"); } catch (e) { toast("Kopieren nicht möglich"); }
    ta.remove();
  }
}
function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function pickJsonFile(onParsed) {
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/json,.json,.txt";
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const text = String(r.result).trim();
        const obj = text.startsWith("{") ? JSON.parse(text) : decodeCode(text);
        onParsed(obj, f.name);
      } catch (e) { toast("Datei konnte nicht gelesen werden"); }
    };
    r.readAsText(f);
  };
  inp.click();
}

function myName() {
  return (STATE.trade && STATE.trade.identity && STATE.trade.identity.name) || "Mein Stand";
}

/* ---------------------------------------------------------------------- *
 * Tausch-Kandidaten (Option 1 & Anfragen Option 2)
 * gibt:   ich habe Doppelte (count>=2), Gegenüber fehlt sie (count==0)
 * erhält: Gegenüber hat Doppelte, mir fehlt sie
 * ---------------------------------------------------------------------- */
function giveCandidates(theirCounts) {
  return CARDS.filter((c) => tradeCountOf(c.id) >= 2 && !(theirCounts[c.id] > 0)).map((c) => c.id);
}
function receiveCandidates(theirCounts) {
  return CARDS.filter((c) => (theirCounts[c.id] || 0) >= 2 && tradeCountOf(c.id) === 0).map((c) => c.id);
}
function maxGive(id) { return Math.max(0, tradeCountOf(id) - 1); }
function maxReceive(id, theirCounts) { return Math.max(0, (theirCounts[id] || 0) - 1); }

/* ====================================================================== *
 * Render-Dispatcher
 * ====================================================================== */
function renderTradeTab() {
  ensureTradeState();
  const root = document.getElementById("tradeRoot");
  if (!root) return;
  const v = TRADE.view;
  if (v === "home") root.innerHTML = viewHome();
  else if (v === "off-menu") root.innerHTML = viewOffMenu();
  else if (v === "off-share") root.innerHTML = viewOffShare();
  else if (v === "off-import") root.innerHTML = viewOffImport();
  else if (v === "off-build") root.innerHTML = viewOffBuild();
  else if (v === "off-done") root.innerHTML = viewOffDone();
  else if (v === "off-apply") root.innerHTML = viewOffApply();
  else if (v === "on-setup") root.innerHTML = viewOnSetup();
  else if (v === "on-group") root.innerHTML = viewOnGroup();
  else if (v === "on-request") root.innerHTML = viewOnRequest();
  else if (v === "on-live") root.innerHTML = viewOnLive();
  else root.innerHTML = viewHome();
  wireTradeView();
}

function go(view) { TRADE.view = view; renderTradeTab(); }

/* ---------------------------------------------------------------------- *
 * HOME – Wahl zwischen den beiden Wegen
 * ---------------------------------------------------------------------- */
function viewHome() {
  const grp = STATE.trade.group;
  return `
    <div class="trade-hero">
      <div class="skel-icon">⇄</div>
      <h2 class="skel-title">Tauschen</h2>
      <p class="muted small">Zwei Wege – wähle, wie du tauschen möchtest.</p>
    </div>
    <button class="trade-opt" data-act="go" data-view="off-menu">
      <span class="trade-opt-ic">📨</span>
      <span class="trade-opt-tx">
        <b>Per Tausch-Code / Datei</b>
        <small>Ohne Server. Einen Code oder eine Datei mit dem Tauschpartner austauschen.</small>
      </span>
      <span class="trade-opt-chev">›</span>
    </button>
    <button class="trade-opt" data-act="go" data-view="${grp ? "on-group" : "on-setup"}">
      <span class="trade-opt-ic">🌐</span>
      <span class="trade-opt-tx">
        <b>Live-Lobby</b>
        <small>${grp
          ? `Lobby „${escapeHtml(grp.name)}“ – Mitglieder, Anfragen & Live-Tausch.`
          : "Einer Lobby beitreten: tauschbare Karten sehen, Anfragen senden, live tauschen."}</small>
      </span>
      <span class="trade-opt-chev">›</span>
    </button>`;
}

/* ====================================================================== *
 * OPTION 1 – Code / Datei
 * ====================================================================== */
function backBar(view, label) {
  return `<button class="trade-back" data-act="go" data-view="${view}">‹ ${label || "Zurück"}</button>`;
}

function viewOffMenu() {
  return `
    ${backBar("home")}
    <h3 class="trade-h">Per Tausch-Code / Datei</h3>
    <p class="muted small">Beide Sammler tauschen einen kurzen Code (oder eine Datei) aus.</p>
    <button class="trade-opt" data-act="go" data-view="off-share">
      <span class="trade-opt-ic">📤</span>
      <span class="trade-opt-tx"><b>Meinen Stand teilen</b>
        <small>Erzeugt deinen Tausch-Code. Schick ihn dem Partner, damit er einen Tausch bauen kann.</small></span>
      <span class="trade-opt-chev">›</span>
    </button>
    <button class="trade-opt" data-act="go" data-view="off-import">
      <span class="trade-opt-ic">📥</span>
      <span class="trade-opt-tx"><b>Code / Datei einlesen</b>
        <small>Stand des Partners einlesen und einen Tausch zusammenstellen – oder einen erhaltenen Tausch anwenden.</small></span>
      <span class="trade-opt-chev">›</span>
    </button>`;
}

function viewOffShare() {
  const payload = { t: "coll", v: 1, n: myName(), c: STATE.counts };
  const code = encodeCode(payload);
  return `
    ${backBar("off-menu")}
    <h3 class="trade-h">Meinen Stand teilen</h3>
    <p class="muted small">Sende diesen Code (oder die Datei) an deinen Tauschpartner. Er liest ihn ein und
      stellt einen Tausch zusammen.</p>
    <div class="field"><label>Dein Anzeigename</label>
      <input id="shareName" type="text" value="${escapeAttr(myName())}" placeholder="z. B. Tyler" /></div>
    <textarea class="trade-code" id="shareCode" readonly rows="4">${escapeHtml(code)}</textarea>
    <div class="trade-actions">
      <button class="btn btn-primary" data-act="copy-share">📋 Code kopieren</button>
      <button class="btn" data-act="file-share">💾 Als Datei</button>
    </div>`;
}

function viewOffImport() {
  return `
    ${backBar("off-menu")}
    <h3 class="trade-h">Code / Datei einlesen</h3>
    <p class="muted small">Füge den Code deines Partners ein – oder einen Tausch, den du anwenden sollst.</p>
    <textarea class="trade-code" id="importCode" rows="4" placeholder="Tausch-Code hier einfügen …"></textarea>
    <div class="trade-actions">
      <button class="btn btn-primary" data-act="read-code">Einlesen</button>
      <button class="btn" data-act="file-import">📂 Datei wählen</button>
    </div>`;
}

function readImported(obj, sourceName) {
  if (!obj || typeof obj !== "object") { toast("Unbekanntes Format"); return; }
  // Voller Sammlungs-Stand (Partner möchte tauschen) – auch alte Exporte (counts)
  if (obj.t === "coll" || (obj.counts && !obj.t)) {
    const counts = obj.c || obj.counts || {};
    const name = obj.n || (sourceName ? sourceName.replace(/\.json$/i, "") : "Partner");
    TRADE.partner = { name, counts };
    TRADE.give = {}; TRADE.receive = {};
    go("off-build");
    return;
  }
  // Fertiger Tausch (auf meinen Stand anwenden)
  if (obj.t === "trade") {
    TRADE.incoming = obj;
    go("off-apply");
    return;
  }
  toast("Unbekanntes Format");
}

/* ---- Auswahl: was gebe ich, was erhalte ich -------------------------- */
function buildRowsHtml(ids, dir, theirCounts) {
  const map = dir === "give" ? TRADE.give : TRADE.receive;
  if (!ids.length) {
    return `<p class="muted small acc-empty">Keine passenden Karten.</p>`;
  }
  return tradeSort(ids).map((id) => {
    const c = cardById[id];
    const qty = map[id] || 0;
    const max = dir === "give" ? maxGive(id) : maxReceive(id, theirCounts);
    const name = (STATE.names[id] != null ? STATE.names[id] : c.name) || c.role || "—";
    return `<div class="trade-row" data-id="${id}">
      <span class="r-num">${escapeHtml(c.label)}</span>
      <span class="trade-name">${escapeHtml(name)}</span>
      <span class="trade-avail">×${max}</span>
      <span class="r-cnt ${qty >= 1 ? "multi" : ""}">
        <button class="r-step" data-act="t-minus" data-dir="${dir}" aria-label="weniger">−</button>
        <span class="r-val">${qty}</span>
        <button class="r-step" data-act="t-plus" data-dir="${dir}" data-max="${max}" aria-label="mehr">+</button>
      </span>
    </div>`;
  }).join("");
}

function applyTradeFilter(ids) {
  let out = ids;
  if (TRADE.filterNation !== "ALL") out = out.filter((id) => cardById[id].sectionCode === TRADE.filterNation);
  const q = TRADE.filterText.trim();
  if (q) out = out.filter((id) => matchesSearch(cardById[id], q));
  return out;
}

function tradeSummary() {
  const g = Object.values(TRADE.give).reduce((a, b) => a + b, 0);
  const r = Object.values(TRADE.receive).reduce((a, b) => a + b, 0);
  return { g, r };
}

function viewOffBuild() {
  const theirs = TRADE.partner.counts;
  const giveIds = applyTradeFilter(giveCandidates(theirs));
  const recvIds = applyTradeFilter(receiveCandidates(theirs));
  const { g, r } = tradeSummary();
  return `
    ${backBar("off-import")}
    <h3 class="trade-h">Tausch mit „${escapeHtml(TRADE.partner.name)}“</h3>
    <div class="trade-filter">
      <input id="tFilterText" type="search" placeholder="Suche Nummer/Name …" value="${escapeAttr(TRADE.filterText)}" />
      <select id="tFilterNation" aria-label="Nation filtern">${buildNationOptions().replace(
        `value="${TRADE.filterNation}"`, `value="${TRADE.filterNation}" selected`)}</select>
    </div>

    <div class="trade-block">
      <div class="trade-block-head"><h4>Du gibst</h4><span class="trade-badge">${g}</span></div>
      <p class="muted small">Deine Doppelten, die „${escapeHtml(TRADE.partner.name)}“ fehlen.</p>
      <div class="trade-list">${buildRowsHtml(giveIds, "give", theirs)}</div>
    </div>

    <div class="trade-block">
      <div class="trade-block-head"><h4>Du erhältst</h4><span class="trade-badge">${r}</span></div>
      <p class="muted small">Doppelte von „${escapeHtml(TRADE.partner.name)}“, die dir fehlen.</p>
      <div class="trade-list">${buildRowsHtml(recvIds, "receive", theirs)}</div>
    </div>

    <div class="trade-confirm-bar">
      <span class="muted small">Du gibst <b>${g}</b> · du erhältst <b>${r}</b></span>
      <button class="btn btn-primary" data-act="confirm-trade" ${g + r === 0 ? "disabled" : ""}>Tausch bestätigen</button>
    </div>`;
}

// Tausch lokal anwenden: meine Counts anpassen
function applyDeltaToSelf(give, receive) {
  for (const id in give) STATE.counts[id] = Math.max(0, (STATE.counts[id] || 0) - give[id]);
  for (const id in receive) STATE.counts[id] = (STATE.counts[id] || 0) + receive[id];
  for (const id in STATE.counts) if (STATE.counts[id] === 0) delete STATE.counts[id];
}

function confirmOfflineTrade() {
  const give = { ...TRADE.give }, receive = { ...TRADE.receive };
  // 1) eigenen Stand sofort aktualisieren
  applyDeltaToSelf(give, receive);
  save();
  refreshStats();
  // 2) Nutzlast für den Partner bauen (aus seiner Sicht spiegeln)
  TRADE.outFile = {
    t: "trade", v: 1,
    from: myName(),
    to: TRADE.partner.name,
    // Partner-Sicht: er erhält, was ich gebe; er gibt, was ich erhalte
    receive: give,
    give: receive,
  };
  go("off-done");
}

function viewOffDone() {
  const f = TRADE.outFile;
  const code = encodeCode(f);
  const recvList = tradeSort(Object.keys(f.receive));
  const giveList = tradeSort(Object.keys(f.give));
  const li = (ids, map) => ids.length
    ? ids.map((id) => `<li>${escapeHtml(cardById[id].label)} · ${escapeHtml((STATE.names[id] ?? cardById[id].name) || "")} <b>×${map[id]}</b></li>`).join("")
    : `<li class="muted">—</li>`;
  return `
    <div class="trade-done-head">✓ Dein Speicherstand wurde aktualisiert</div>
    <h3 class="trade-h">Speicherstand für „${escapeHtml(f.to)}“ exportieren</h3>
    <p class="muted small">Sende diese Datei (oder den Code) an deinen Tauschpartner. Sobald er sie einliest,
      wird sein Stand passend aktualisiert. Dein Speicherstand wurde bereits automatisch angepasst.</p>

    <div class="trade-block">
      <div class="trade-block-head"><h4>„${escapeHtml(f.to)}“ erhält</h4><span class="trade-badge">${recvList.length}</span></div>
      <ul class="trade-mini-list">${li(recvList, f.receive)}</ul>
    </div>
    <div class="trade-block">
      <div class="trade-block-head"><h4>„${escapeHtml(f.to)}“ gibt</h4><span class="trade-badge">${giveList.length}</span></div>
      <ul class="trade-mini-list">${li(giveList, f.give)}</ul>
    </div>

    <textarea class="trade-code" id="doneCode" readonly rows="3">${escapeHtml(code)}</textarea>
    <div class="trade-actions">
      <button class="btn btn-primary" data-act="file-done">💾 Datei für ${escapeHtml(f.to)}</button>
      <button class="btn" data-act="copy-done">📋 Code kopieren</button>
    </div>
    <div class="trade-actions">
      <button class="btn" data-act="go" data-view="home">Fertig</button>
    </div>`;
}

function viewOffApply() {
  const f = TRADE.incoming;
  const recv = f.receive || {}, give = f.give || {};
  const recvList = tradeSort(Object.keys(recv));
  const giveList = tradeSort(Object.keys(give));
  const li = (ids, map) => ids.length
    ? ids.map((id) => `<li>${escapeHtml(cardById[id].label)} · ${escapeHtml((STATE.names[id] ?? cardById[id].name) || "")} <b>×${map[id]}</b></li>`).join("")
    : `<li class="muted">—</li>`;
  // Sicherheits-Hinweis, falls ich Karten gebe, die ich gar nicht (doppelt) habe
  const missing = giveList.filter((id) => (STATE.counts[id] || 0) < give[id]);
  return `
    ${backBar("off-import")}
    <h3 class="trade-h">Tausch von „${escapeHtml(f.from || "Partner")}“ anwenden</h3>
    <p class="muted small">Prüfe den Tausch. Beim Bestätigen wird dein Speicherstand aktualisiert.</p>
    <div class="trade-block">
      <div class="trade-block-head"><h4>Du erhältst</h4><span class="trade-badge">${recvList.length}</span></div>
      <ul class="trade-mini-list">${li(recvList, recv)}</ul>
    </div>
    <div class="trade-block">
      <div class="trade-block-head"><h4>Du gibst</h4><span class="trade-badge">${giveList.length}</span></div>
      <ul class="trade-mini-list">${li(giveList, give)}</ul>
    </div>
    ${missing.length ? `<p class="trade-warn">⚠ ${missing.length} Karte(n) sollst du geben, hast sie aber nicht (mehr).
      Sie werden auf 0 gesetzt.</p>` : ""}
    <div class="trade-confirm-bar">
      <span class="muted small">Du erhältst <b>${recvList.length}</b> · du gibst <b>${giveList.length}</b></span>
      <button class="btn btn-primary" data-act="apply-incoming">Tausch übernehmen</button>
    </div>`;
}

function applyIncomingTrade() {
  const f = TRADE.incoming;
  applyDeltaToSelf(f.give || {}, f.receive || {});
  save(); refreshStats();
  TRADE.incoming = null;
  toast("Tausch übernommen – Stand aktualisiert");
  go("home");
}

/* ====================================================================== *
 * OPTION 2 – Tauschgruppe (Render-Server)
 * ====================================================================== */
let POLL_TIMER = null;
function startPolling() {
  stopPolling();
  POLL_TIMER = setInterval(() => {
    if (CURRENT_TAB === "trade" && (TRADE.view === "on-group" || TRADE.view === "on-live")) {
      syncGroup().catch(() => {});
    }
  }, 5000);
}
function stopPolling() { if (POLL_TIMER) { clearInterval(POLL_TIMER); POLL_TIMER = null; } }

async function api(path, opts = {}) {
  const base = (STATE.trade.serverUrl || "").replace(/\/$/, "");
  if (!base) throw new Error("Kein Server hinterlegt");
  const r = await fetch(base + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

function viewOnSetup() {
  const t = STATE.trade;
  return `
    ${backBar("home")}
    <h3 class="trade-h">Lobby beitreten</h3>
    <p class="muted small">Gib deinen Namen und einen Lobby-Code ein. Wer denselben Code nutzt, landet in
      derselben Lobby – jede Lobby ist getrennt. Die Mitgliedschaft bleibt bestehen, bis du sie verlässt.</p>
    <div class="field"><label>Dein Anzeigename</label>
      <input id="srvName" type="text" value="${escapeAttr(t.identity ? t.identity.name : "")}" placeholder="z. B. Tyler" /></div>
    <div class="field"><label>Lobby-Code</label>
      <input id="srvGroup" type="text" value="${escapeAttr(t.group ? t.group.code : "")}" placeholder="z. B. wm2026-freunde" /></div>
    <div class="trade-actions">
      <button class="btn btn-primary" data-act="join-group">Lobby beitreten / erstellen</button>
    </div>
    <p class="muted small">Verbindet sich automatisch mit dem Tauschserver. Beim ersten Mal kann es ein paar
      Sekunden dauern, bis der Server aufwacht.</p>`;
}

async function joinGroup() {
  const name = document.getElementById("srvName").value.trim();
  const code = document.getElementById("srvGroup").value.trim();
  if (!name || !code) { toast("Bitte Namen und Lobby-Code angeben"); return; }
  STATE.trade.serverUrl = TRADE_SERVER;
  const id = (STATE.trade.identity && STATE.trade.identity.id) || ("m_" + Math.random().toString(36).slice(2, 10));
  STATE.trade.identity = { id, name };
  save();
  toast("Verbinde mit Lobby …");
  try {
    const res = await api("/api/group/join", {
      method: "POST",
      body: JSON.stringify({ code, member: { id, name } }),
    });
    STATE.trade.group = { id: res.group.id, name: res.group.name, code };
    save();
    await uploadCollection();
    toast("Gruppe beigetreten");
    go("on-group");
    syncGroup().catch(() => {});   // Mitglieder & Anfragen sofort laden
  } catch (e) {
    toast("Beitritt fehlgeschlagen – Server prüfen");
  }
}

async function uploadCollection() {
  // Nur tauschbare Info teilen: Doppelte (Anzahl≥2) und Lücken (fehlt)
  const have = {}, want = {};
  for (const c of CARDS) {
    const n = STATE.counts[c.id] || 0;
    if (n >= 2) have[c.id] = n - 1;     // abgebbare Menge
    if (n === 0) want[c.id] = 1;        // fehlt mir
  }
  await api("/api/collection", {
    method: "POST",
    body: JSON.stringify({
      groupId: STATE.trade.group.id,
      member: STATE.trade.identity,
      have, want,
    }),
  });
}

async function syncGroup() {
  if (!STATE.trade.group) return;
  const res = await api(`/api/group/${encodeURIComponent(STATE.trade.group.id)}/state?member=${encodeURIComponent(STATE.trade.identity.id)}`);
  TRADE.members = (res.members || []).filter((m) => m.id !== STATE.trade.identity.id);
  // Server-Anfragen mit lokal gespeicherten zusammenführen (lokale überleben Inaktivität)
  mergeRequests(res.requests || []);
  if (CURRENT_TAB === "trade" && (TRADE.view === "on-group" || TRADE.view === "on-live")) renderTradeTab();
}

function mergeRequests(serverReqs) {
  const local = STATE.trade.requests;
  const byId = {};
  for (const r of local) byId[r.id] = r;
  for (const r of serverReqs) {
    const loc = byId[r.id] || {};
    const merged = Object.assign({}, loc, r);
    // Zusagen & Ausführungen beider Seiten vereinen (true bleibt true) –
    // verhindert, dass ein Poll lokale Flags überschreibt (Doppel-Anwendung!)
    merged.acceptedBy = Object.assign({}, loc.acceptedBy, r.acceptedBy);
    merged.executedBy = Object.assign({}, loc.executedBy, r.executedBy);
    byId[r.id] = merged;
  }
  STATE.trade.requests = Object.values(byId).filter((r) => r.status !== "deleted");
  save();
}

function viewOnGroup() {
  const g = STATE.trade.group;
  const reqs = STATE.trade.requests;
  const incoming = reqs.filter((r) => r.to === STATE.trade.identity.id && r.status !== "done");
  const outgoing = reqs.filter((r) => r.from === STATE.trade.identity.id && r.status !== "done");
  const memberRows = TRADE.members.length
    ? TRADE.members.map((m) => {
        const tradeable = countMutualTradeable(m);
        return `<div class="trade-member">
          <span class="tm-name">${escapeHtml(m.name)}</span>
          <span class="tm-count">${tradeable} passende</span>
          <button class="btn trade-btn" data-act="open-request" data-mid="${escapeAttr(m.id)}" ${tradeable ? "" : "disabled"}>Anfrage</button>
        </div>`;
      }).join("")
    : `<p class="muted small acc-empty">Noch keine anderen Mitglieder online.</p>`;

  return `
    ${backBar("home")}
    <div class="trade-group-head">
      <div><h3 class="trade-h">Lobby „${escapeHtml(g.name)}“</h3>
        <span class="muted small">Code: ${escapeHtml(g.code)} · du: ${escapeHtml(STATE.trade.identity.name)}</span></div>
      <button class="btn btn-danger trade-btn" data-act="leave-group">Verlassen</button>
    </div>
    <button class="btn" data-act="refresh-group">↻ Aktualisieren</button>

    <div class="trade-block">
      <div class="trade-block-head"><h4>Mitglieder</h4><span class="trade-badge">${TRADE.members.length}</span></div>
      ${memberRows}
    </div>

    <div class="trade-block">
      <div class="trade-block-head"><h4>Eingehende Anfragen</h4><span class="trade-badge">${incoming.length}</span></div>
      ${reqList(incoming, "in")}
    </div>
    <div class="trade-block">
      <div class="trade-block-head"><h4>Meine Anfragen</h4><span class="trade-badge">${outgoing.length}</span></div>
      ${reqList(outgoing, "out")}
    </div>`;
}

// Wie viele Karten kann ich mit Mitglied m tauschen (Schnittmenge)?
function countMutualTradeable(m) {
  let n = 0;
  for (const id in (m.have || {})) if ((STATE.counts[id] || 0) === 0) n++;       // er hat, mir fehlt
  for (const id in (m.want || {})) if ((STATE.counts[id] || 0) >= 2) n++;        // er braucht, ich doppelt
  return n;
}

function memberName(id) {
  const m = TRADE.members.find((x) => x.id === id);
  return m ? m.name : (id === STATE.trade.identity.id ? STATE.trade.identity.name : "Mitglied");
}

function reqList(reqs, dir) {
  if (!reqs.length) return `<p class="muted small acc-empty">Keine.</p>`;
  return reqs.map((r) => {
    const other = dir === "in" ? r.from : r.to;
    const give = Object.values(r.give || {}).reduce((a, b) => a + b, 0);
    const recv = Object.values(r.receive || {}).reduce((a, b) => a + b, 0);
    const status = statusLabel(r, dir);
    return `<div class="trade-req" data-rid="${escapeAttr(r.id)}">
      <div class="tr-top">
        <span class="tr-who">${escapeHtml(memberName(other))}</span>
        <span class="tr-status ${r.status}">${status}</span>
      </div>
      <div class="tr-sum">Du gibst <b>${dir === "in" ? recv : give}</b> · du erhältst <b>${dir === "in" ? give : recv}</b></div>
      <div class="tr-actions">
        <button class="btn trade-btn" data-act="view-req" data-rid="${escapeAttr(r.id)}">Ansehen</button>
        ${r.status !== "accepted" ? `<button class="btn btn-danger trade-btn" data-act="del-req" data-rid="${escapeAttr(r.id)}">Löschen</button>` : ""}
        ${bothAccepted(r) ? `<button class="btn btn-primary trade-btn" data-act="live-req" data-rid="${escapeAttr(r.id)}">Live tauschen</button>` : ""}
      </div>
    </div>`;
  }).join("");
}

function statusLabel(r, dir) {
  if (bothAccepted(r)) return "bereit";
  if (r.status === "accepted") return "wartet auf Gegenseite";
  if (r.status === "countered") return dir === "in" ? "Gegenangebot erhalten" : "Gegenangebot gesendet";
  if (r.status === "open") return dir === "in" ? "offen" : "gesendet";
  return r.status;
}
function bothAccepted(r) { return !!(r.acceptedBy && r.acceptedBy.from && r.acceptedBy.to); }

/* ---- Anfrage zusammenstellen / Gegenangebot -------------------------- */
function openRequest(memberId, existing) {
  const m = TRADE.members.find((x) => x.id === memberId);
  if (!m && !existing) return;
  TRADE.activeReqId = existing ? existing.id : null;
  TRADE.requestMember = existing ? (existing.from === STATE.trade.identity.id ? existing.to : existing.from) : memberId;
  // Vorbelegen
  if (existing) {
    const iAmFrom = existing.from === STATE.trade.identity.id;
    TRADE.give = { ...(iAmFrom ? existing.give : existing.receive) };
    TRADE.receive = { ...(iAmFrom ? existing.receive : existing.give) };
  } else {
    TRADE.give = {}; TRADE.receive = {};
  }
  go("on-request");
}

function partnerHaveWant() {
  const m = TRADE.members.find((x) => x.id === TRADE.requestMember);
  return m || { have: {}, want: {} };
}

function viewOnRequest() {
  const m = partnerHaveWant();
  // ich gebe: ich doppelt & er will (oder ihm fehlt) ; ich erhalte: er hat doppelt & mir fehlt
  const giveIds = applyTradeFilter(CARDS.filter((c) => tradeCountOf(c.id) >= 2 && (m.want ? m.want[c.id] : true)).map((c) => c.id));
  const recvIds = applyTradeFilter(CARDS.filter((c) => (m.have && m.have[c.id]) && tradeCountOf(c.id) === 0).map((c) => c.id));
  const { g, r } = tradeSummary();
  const editing = !!TRADE.activeReqId;
  return `
    ${backBar("on-group")}
    <h3 class="trade-h">${editing ? "Gegenangebot an" : "Anfrage an"} „${escapeHtml(memberName(TRADE.requestMember))}“</h3>
    <div class="trade-filter">
      <input id="tFilterText" type="search" placeholder="Suche …" value="${escapeAttr(TRADE.filterText)}" />
      <select id="tFilterNation">${buildNationOptions().replace(`value="${TRADE.filterNation}"`, `value="${TRADE.filterNation}" selected`)}</select>
    </div>
    <div class="trade-block">
      <div class="trade-block-head"><h4>Du gibst</h4><span class="trade-badge">${g}</span></div>
      <div class="trade-list">${buildRowsHtml(giveIds, "give", {})}</div>
    </div>
    <div class="trade-block">
      <div class="trade-block-head"><h4>Du erhältst</h4><span class="trade-badge">${r}</span></div>
      <div class="trade-list">${buildRowsHtml(recvIds, "receive", m.have || {})}</div>
    </div>
    <div class="trade-confirm-bar">
      <span class="muted small">gibst <b>${g}</b> · erhältst <b>${r}</b></span>
      <button class="btn btn-primary" data-act="send-request" ${g + r === 0 ? "disabled" : ""}>${editing ? "Gegenangebot senden" : "Anfrage senden"}</button>
    </div>`;
}

async function sendRequest() {
  const target = TRADE.requestMember;
  const give = { ...TRADE.give }, receive = { ...TRADE.receive };
  const id = TRADE.activeReqId || ("r_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
  const req = {
    id, groupId: STATE.trade.group.id,
    from: STATE.trade.identity.id, to: target,
    give, receive,                       // immer aus Sicht von "from"
    status: TRADE.activeReqId ? "countered" : "open",
    acceptedBy: {},                      // Gegenangebot setzt Zustimmung zurück
    ts: Date.now(),
  };
  // Lokal speichern (überlebt Inaktivität), dann an Server
  upsertLocalReq(req);
  try { await api("/api/request", { method: "POST", body: JSON.stringify(req) }); }
  catch (e) { toast("Lokal gespeichert – Server nicht erreichbar"); }
  toast("Anfrage gesendet");
  go("on-group");
}

function upsertLocalReq(req) {
  const i = STATE.trade.requests.findIndex((r) => r.id === req.id);
  if (i >= 0) STATE.trade.requests[i] = Object.assign({}, STATE.trade.requests[i], req);
  else STATE.trade.requests.push(req);
  save();
}

async function deleteRequest(rid) {
  STATE.trade.requests = STATE.trade.requests.filter((r) => r.id !== rid);
  save();
  try { await api(`/api/request/${encodeURIComponent(rid)}`, { method: "DELETE", body: JSON.stringify({ by: STATE.trade.identity.id }) }); } catch (e) {}
  toast("Anfrage gelöscht");
  go("on-group");
}

function getReq(rid) { return STATE.trade.requests.find((r) => r.id === rid); }

async function acceptRequest(rid) {
  const req = getReq(rid); if (!req) return;
  const side = req.from === STATE.trade.identity.id ? "from" : "to";
  req.acceptedBy = Object.assign({}, req.acceptedBy, { [side]: true });
  req.status = "accepted";
  upsertLocalReq(req);
  try { await api(`/api/request/${encodeURIComponent(rid)}/accept`, { method: "POST", body: JSON.stringify({ side }) }); } catch (e) {}
  if (bothAccepted(req)) toast("Beide bereit – jetzt live tauschen");
  else toast("Zugesagt – warte auf Gegenseite");
}

/* ---- Live-Tausch: finale Liste & Ausführung -------------------------- */
function viewOnLive() {
  const req = getReq(TRADE.activeReqId);
  if (!req) { go("on-group"); return ""; }
  const iAmFrom = req.from === STATE.trade.identity.id;
  const iGive = iAmFrom ? req.give : req.receive;
  const iGet = iAmFrom ? req.receive : req.give;
  const other = memberName(iAmFrom ? req.to : req.from);
  const giveIds = tradeSort(Object.keys(iGive));
  const getIds = tradeSort(Object.keys(iGet));
  const li = (ids, map) => ids.length
    ? ids.map((id) => `<li>${escapeHtml(cardById[id].label)} · ${escapeHtml((STATE.names[id] ?? cardById[id].name) || "")} <b>×${map[id]}</b></li>`).join("")
    : `<li class="muted">—</li>`;
  const mine = iAmFrom ? "from" : "to";
  const otherSide = iAmFrom ? "to" : "from";
  const iAccepted = !!(req.acceptedBy && req.acceptedBy[mine]);
  const otherAccepted = !!(req.acceptedBy && req.acceptedBy[otherSide]);
  const iExecuted = !!(req.executedBy && req.executedBy[mine]);
  return `
    ${backBar("on-group")}
    <h3 class="trade-h">Live-Tausch mit „${escapeHtml(other)}“</h3>
    <p class="muted small">Geht die Liste durch. Erst wenn <b>beide</b> akzeptieren, wird der Tausch ausgeführt
      und beide Sammlungen aktualisiert.</p>
    <div class="trade-block">
      <div class="trade-block-head"><h4>Du gibst „${escapeHtml(other)}“</h4><span class="trade-badge">${giveIds.length}</span></div>
      <ul class="trade-mini-list">${li(giveIds, iGive)}</ul>
    </div>
    <div class="trade-block">
      <div class="trade-block-head"><h4>Du erhältst</h4><span class="trade-badge">${getIds.length}</span></div>
      <ul class="trade-mini-list">${li(getIds, iGet)}</ul>
    </div>
    <div class="trade-status-row">
      <span class="${iAccepted ? "ok" : ""}">${iAccepted ? "✓ du akzeptiert" : "○ du offen"}</span>
      <span class="${otherAccepted ? "ok" : ""}">${otherAccepted ? "✓ Gegenseite akzeptiert" : "○ Gegenseite offen"}</span>
    </div>
    <div class="trade-confirm-bar">
      ${iExecuted ? "" : `<button class="btn" data-act="counter-req" data-rid="${escapeAttr(req.id)}">Gegenangebot</button>`}
      ${iExecuted
        ? `<span class="muted small">✓ Ausgeführt – deine Sammlung ist aktualisiert.</span>`
        : bothAccepted(req)
          ? `<button class="btn btn-primary" data-act="execute-req" data-rid="${escapeAttr(req.id)}">Tausch ausführen</button>`
          : `<button class="btn btn-primary" data-act="accept-req" data-rid="${escapeAttr(req.id)}" ${iAccepted ? "disabled" : ""}>Akzeptieren</button>`}
    </div>`;
}

function executeTrade(rid) {
  const req = getReq(rid); if (!req) return;
  if (!bothAccepted(req)) { toast("Noch nicht beide bereit"); return; }
  const mine = req.from === STATE.trade.identity.id ? "from" : "to";
  if (req.executedBy && req.executedBy[mine]) { toast("Schon ausgeführt"); return; }
  const iAmFrom = mine === "from";
  const iGive = iAmFrom ? req.give : req.receive;
  const iGet = iAmFrom ? req.receive : req.give;
  applyDeltaToSelf(iGive, iGet);            // jede Seite wendet ihren Teil genau einmal an
  req.executedBy = Object.assign({}, req.executedBy, { [mine]: true });
  if (req.executedBy.from && req.executedBy.to) req.status = "done";
  upsertLocalReq(req);
  save(); refreshStats();
  api(`/api/request/${encodeURIComponent(rid)}/done`, { method: "POST", body: JSON.stringify({ side: mine }) }).catch(() => {});
  uploadCollection().catch(() => {});
  toast("Tausch ausgeführt – Sammlung aktualisiert 🎉");
  go("on-group");
}

async function leaveGroup() {
  if (!confirm("Lobby wirklich verlassen? Offene Anfragen gehen verloren.")) return;
  try { await api(`/api/group/${encodeURIComponent(STATE.trade.group.id)}/leave`, { method: "POST", body: JSON.stringify({ member: STATE.trade.identity.id }) }); } catch (e) {}
  STATE.trade.group = null;
  STATE.trade.requests = [];
  save();
  toast("Gruppe verlassen");
  go("home");
}

/* ====================================================================== *
 * Event-Verdrahtung pro Render
 * ====================================================================== */
function wireTradeView() {
  const root = document.getElementById("tradeRoot");
  if (!root) return;

  // Stepper / Klicks für Tausch-Zeilen (Delegation)
  root.onclick = (e) => {
    const act = e.target.closest("[data-act]");
    if (!act) return;
    const a = act.dataset.act;

    if (a === "go") { go(act.dataset.view); return; }
    if (a === "copy-share") { copyText(document.getElementById("shareCode").value); return; }
    if (a === "file-share") {
      const payload = { t: "coll", v: 1, n: myName(), c: STATE.counts };
      downloadJson(payload, `panini-stand-${slug(myName())}.json`); return;
    }
    if (a === "read-code") {
      try { readImported(decodeCode(document.getElementById("importCode").value)); }
      catch (err) { toast("Code ungültig"); }
      return;
    }
    if (a === "file-import") { pickJsonFile((obj, name) => readImported(obj, name)); return; }

    if (a === "t-plus" || a === "t-minus") {
      const row = act.closest(".trade-row"); if (!row) return;
      const id = row.dataset.id, dir = act.dataset.dir;
      const map = dir === "give" ? TRADE.give : TRADE.receive;
      if (a === "t-plus") {
        const max = parseInt(act.dataset.max, 10) || 0;
        map[id] = Math.min(max, (map[id] || 0) + 1);
      } else {
        map[id] = Math.max(0, (map[id] || 0) - 1);
        if (map[id] === 0) delete map[id];
      }
      // nur die Zeile + Badges aktualisieren
      const val = row.querySelector(".r-val"); if (val) val.textContent = map[id] || 0;
      const cnt = row.querySelector(".r-cnt"); if (cnt) cnt.classList.toggle("multi", (map[id] || 0) >= 1);
      updateBadges();
      return;
    }

    if (a === "confirm-trade") { confirmOfflineTrade(); return; }
    if (a === "copy-done") { copyText(document.getElementById("doneCode").value); return; }
    if (a === "file-done") { downloadJson(TRADE.outFile, `panini-tausch-fuer-${slug(TRADE.outFile.to)}.json`); return; }
    if (a === "apply-incoming") { applyIncomingTrade(); return; }

    // ---- Option 2
    if (a === "join-group") { joinGroup(); return; }
    if (a === "refresh-group") { syncGroup().then(() => toast("Aktualisiert")).catch(() => toast("Server nicht erreichbar")); return; }
    if (a === "leave-group") { leaveGroup(); return; }
    if (a === "open-request") { openRequest(act.dataset.mid); return; }
    if (a === "send-request") { sendRequest(); return; }
    if (a === "del-req") { deleteRequest(act.dataset.rid); return; }
    if (a === "view-req") { TRADE.activeReqId = act.dataset.rid; go("on-live"); return; }
    if (a === "live-req") { TRADE.activeReqId = act.dataset.rid; go("on-live"); return; }
    if (a === "accept-req") { acceptRequest(act.dataset.rid).then(() => renderTradeTab()); return; }
    if (a === "counter-req") { openRequest(null, getReq(act.dataset.rid)); return; }
    if (a === "execute-req") { executeTrade(act.dataset.rid); return; }
  };

  // Filter-Inputs (Option 1 Build & Option 2 Request)
  const ft = document.getElementById("tFilterText");
  if (ft) ft.oninput = (e) => { TRADE.filterText = e.target.value; rerenderLists(); };
  const fn = document.getElementById("tFilterNation");
  if (fn) fn.onchange = (e) => { TRADE.filterNation = e.target.value; rerenderLists(); };

  const sn = document.getElementById("shareName");
  if (sn) sn.onchange = (e) => {
    const v = e.target.value.trim();
    STATE.trade.identity = Object.assign({ id: (STATE.trade.identity && STATE.trade.identity.id) || ("m_" + Math.random().toString(36).slice(2, 10)) }, STATE.trade.identity, { name: v || "Mein Stand" });
    save(); renderTradeTab();
  };
}

function rerenderLists() {
  // Nur die beiden Tausch-Blöcke neu zeichnen, Fokus im Filter behalten
  if (TRADE.view === "off-build" || TRADE.view === "on-request") renderTradeTab();
}

function updateBadges() {
  const { g, r } = tradeSummary();
  const badges = document.querySelectorAll(".trade-badge");
  // erste = gibst, zweite = erhältst (Reihenfolge im Markup)
  if (badges[0]) badges[0].textContent = g;
  if (badges[1]) badges[1].textContent = r;
  const bar = document.querySelector(".trade-confirm-bar");
  if (bar) {
    const info = bar.querySelector(".muted");
    if (info) info.innerHTML = TRADE.view === "on-request"
      ? `gibst <b>${g}</b> · erhältst <b>${r}</b>`
      : `Du gibst <b>${g}</b> · du erhältst <b>${r}</b>`;
    const btn = bar.querySelector(".btn-primary");
    if (btn) btn.disabled = (g + r === 0);
  }
}

function slug(s) { return String(s).toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "stand"; }

/* ---------------------------------------------------------------------- *
 * Init (von app.js aufgerufen)
 * ---------------------------------------------------------------------- */
function initTradeTab() {
  ensureTradeState();
  startPolling();           // läuft im Hintergrund, fetcht nur bei aktiver Gruppe + offenem Tab
}

// app.js ruft das beim Wechsel auf den Tauschen-Tab auf
function enterTradeTab() {
  ensureTradeState();
  renderTradeTab();
  if (STATE.trade.group) syncGroup().catch(() => {});
}
