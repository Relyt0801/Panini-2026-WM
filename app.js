/* Panini WM 2026 Tracker – Logik (Vanilla JS, PWA, ohne Backend) */

const STORAGE_KEY = "paniniWM2026.v2";
const RING_CIRC = 2 * Math.PI * 52;
const MINI_CIRC = 2 * Math.PI * 16;
const VARIANT_INITIAL = { Lila: "L", Bronze: "B", Silber: "S", Gold: "G" };

/* ======================================================================
 * Normalisierung für Suche (Diakritika & Leerzeichen)
 * ====================================================================== */
function normalize(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/* ======================================================================
 * Sektionen + Karten aufbauen
 * ====================================================================== */
const GROUP_ORDER = ["A","B","C","D","E","F","G","H","I","J","K","L"];

const SECTIONS = [
  { code: "FWC",   name: "FWC · Spezial",  flag: "🏆", conf: "Spezial",   group: "Spezial",   kind: "special" },
  ...TEAMS.map((t) => ({ ...t, kind: "team" })),
  { code: "EXTRA", name: "Extra-Sticker",   flag: "✨", conf: "Extra",     group: "Extra",     kind: "extra", bonus: true },
  { code: "COCA",  name: "Coca-Cola",       flag: "🥤", conf: "Coca-Cola", group: "Coca-Cola", kind: "coca",  bonus: true },
];
const sectionByCode = Object.fromEntries(SECTIONS.map((s) => [s.code, s]));

const pad2 = (n) => (n < 10 ? "0" + n : "" + n);

function roleFor(n) {
  if (n === 1) return { role: "Wappen", foil: true };
  if (n === 13) return { role: "Mannschaftsfoto", foil: false };
  return { role: "Spieler", foil: false };
}

function buildCards() {
  const cards = [];

  // FWC 00–19
  for (let n = 0; n < FWC_SLOTS; n++) {
    const name = FWC_NAMES[n] || "";
    const searchRaw = `fwc ${pad2(n)} fwc · spezial ${name} spezial spezial gruppe spezial`;
    cards.push({
      id: `FWC-${n}`, kind: "special", sectionCode: "FWC", sectionName: "FWC · Spezial",
      flag: "🏆", conf: "Spezial", group: "Spezial", num: n, label: `FWC ${pad2(n)}`,
      role: "Spezial", foil: n < 9, name, shinyEligible: false, bonus: false,
      search: searchRaw,
      searchNorm: normalize(searchRaw).replace(/\s+/g, ""),
    });
  }

  // 48 Teams · 1–20
  for (const t of TEAMS) {
    const pl = (typeof PLAYERS !== "undefined" && PLAYERS[t.code]) || {};
    for (let n = 1; n <= TEAM_SLOTS; n++) {
      const { role, foil } = roleFor(n);
      let name = pl[n] || "";
      if (!name && role !== "Spieler") name = role;
      const searchRaw = `${t.code} ${n} ${t.name} ${name} ${role} ${t.conf} gruppe ${t.group || ""}`;
      cards.push({
        id: `${t.code}-${n}`, kind: "team", sectionCode: t.code, sectionName: t.name,
        flag: t.flag, conf: t.conf, group: t.group, num: n, label: `${t.code} ${n}`,
        role, foil, name, shinyEligible: t.code === "GER", bonus: false,
        search: searchRaw.toLowerCase(),
        searchNorm: normalize(searchRaw).replace(/\s+/g, ""),
      });
    }
  }

  // Coca-Cola CC1–CC12 (Bonus)
  for (let n = 1; n <= COCA_SLOTS; n++) {
    const name = (typeof COCA_NAMES !== "undefined" && COCA_NAMES[n]) || "";
    const searchRaw = `coca cc ${n} coca-cola ${name} coca-cola`;
    cards.push({
      id: `COCA-${n}`, kind: "coca", sectionCode: "COCA", sectionName: "Coca-Cola",
      flag: "🥤", conf: "Coca-Cola", group: "Coca-Cola", num: n, label: `CC ${n}`,
      role: "Coca-Cola", foil: true, name,
      shinyEligible: false, bonus: true,
      search: searchRaw.toLowerCase(),
      searchNorm: normalize(searchRaw).replace(/\s+/g, ""),
    });
  }

  // Extra-Sticker: 20 Stars × 4 Varianten
  EXTRA_PLAYERS.forEach((p, idx) => {
    EXTRA_VARIANTS.forEach((v) => {
      const fullName = `${p.name} (${p.team})`;
      const searchRaw = `extra ${v} ${fullName} extra gruppe extra`;
      cards.push({
        id: `EXTRA-${idx}-${VARIANT_INITIAL[v]}`, kind: "extra", sectionCode: "EXTRA",
        sectionName: "Extra-Sticker", flag: p.flag, conf: "Extra", group: "Extra",
        num: idx * 4 + EXTRA_VARIANTS.indexOf(v), label: `Extra · ${v}`,
        role: v, foil: true, variant: v, name: fullName,
        shinyEligible: false, bonus: true,
        search: searchRaw.toLowerCase(),
        searchNorm: normalize(searchRaw).replace(/\s+/g, ""),
      });
    });
  });

  return cards;
}

const CARDS = buildCards();
const cardById = Object.fromEntries(CARDS.map((c) => [c.id, c]));
const BASE_TOTAL = CARDS.filter((c) => !c.bonus).length;

/* ======================================================================
 * Persistenz
 * ====================================================================== */
let STATE = { counts: {}, shiny: {}, names: {}, collapsed: {}, partner: null, tradeWanted: {} };

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      STATE = Object.assign(STATE, JSON.parse(raw));
      // Ensure new fields exist after migration
      STATE.partner = STATE.partner || null;
      STATE.tradeWanted = STATE.tradeWanted || {};
      return;
    }
    // Migration von v1 (owned/dupes -> counts)
    const old = localStorage.getItem("paniniWM2026.v1");
    if (old) {
      const o = JSON.parse(old);
      for (const id in (o.owned || {})) STATE.counts[id] = 1;
      for (const id in (o.dupes || {})) STATE.counts[id] = (STATE.counts[id] || 0) + (o.dupes[id] || 0);
      STATE.names = o.names || {};
    }
  } catch (e) { console.warn("Speicher konnte nicht gelesen werden", e); }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); }

const countOf = (id) => STATE.counts[id] || 0;
const shinyOf = (id) => STATE.shiny[id] || 0;
const nameOf = (c) => (STATE.names[c.id] != null ? STATE.names[c.id] : c.name);

/* ======================================================================
 * UI-Status
 * ====================================================================== */
const ui = { search: "", conf: "ALL", team: "ALL", view: "all", sort: "num" };
const el = (id) => document.getElementById(id);

function matchesSearch(c, q) {
  if (!q) return true;
  const qn = normalize(q);
  const qNorm = qn.replace(/\s+/g, "");
  return qn.split(/\s+/).every((tok) => c.searchNorm.includes(tok)) || c.searchNorm.includes(qNorm);
}
function passesView(c) {
  if (ui.view === "owned") return countOf(c.id) > 0;
  if (ui.view === "missing") return countOf(c.id) === 0;
  if (ui.view === "dupes") return countOf(c.id) >= 2 || shinyOf(c.id) >= 2;
  return true;
}
function passesFilter(c) {
  if (ui.conf !== "ALL" && c.group !== ui.conf) return false;
  if (ui.team !== "ALL" && c.sectionCode !== ui.team) return false;
  return passesView(c) && matchesSearch(c, ui.search.trim());
}

/* ======================================================================
 * Statistik
 * ====================================================================== */
function computeStats() {
  let ownedBase = 0, doubles = 0;
  for (const c of CARDS) {
    const n = countOf(c.id);
    if (!c.bonus && n > 0) ownedBase++;
    if (n >= 2) doubles += n - 1;
    const s = shinyOf(c.id);
    if (s >= 2) doubles += s - 1;
  }
  let complete = 0;
  for (const s of SECTIONS) {
    if (s.kind !== "team") continue;
    const cs = CARDS.filter((c) => c.sectionCode === s.code);
    if (cs.length && cs.every((c) => countOf(c.id) > 0)) complete++;
  }
  return { ownedBase, missingBase: BASE_TOTAL - ownedBase, doubles, complete };
}

function refreshStats() {
  const st = computeStats();
  const pct = Math.round((st.ownedBase / BASE_TOTAL) * 100);
  el("ringPct").textContent = pct + "%";
  el("ringCount").textContent = `${st.ownedBase} / ${BASE_TOTAL}`;
  el("ringFg").style.strokeDashoffset = RING_CIRC * (1 - st.ownedBase / BASE_TOTAL);
  el("statOwned").textContent = st.ownedBase;
  el("statMissing").textContent = st.missingBase;
  el("statDupes").textContent = st.doubles;
  el("statComplete").textContent = st.complete;
  return st;
}

/* ======================================================================
 * Rendering (Übersicht-Tab)
 * ====================================================================== */
let prevComplete = new Set();
let firstRender = true;

function sectionStats(code) {
  const cs = CARDS.filter((c) => c.sectionCode === code);
  const owned = cs.filter((c) => countOf(c.id) > 0).length;
  return { owned, total: cs.length, pct: cs.length ? owned / cs.length : 0, complete: owned === cs.length && cs.length > 0 };
}

function sortCards(arr) {
  const a = arr.slice();
  if (ui.sort === "name") a.sort((x, y) => (nameOf(x) || "~").localeCompare(nameOf(y) || "~", "de") || x.num - y.num);
  else if (ui.sort === "missing") a.sort((x, y) => (countOf(x.id) > 0) - (countOf(y.id) > 0) || x.num - y.num);
  else a.sort((x, y) => x.num - y.num);
  return a;
}

function cardInner(c) {
  const n = countOf(c.id);
  const owned = n > 0;
  const hasName = !!nameOf(c);
  const nameText = hasName ? nameOf(c) : (c.role === "Spieler" ? "Spieler – Name eintragen" : "—");
  let tag = "";
  if (c.kind === "extra") tag = `<span class="s-tag var-${VARIANT_INITIAL[c.variant]}">${c.variant}</span>`;
  else if (c.kind === "coca") tag = `<span class="s-tag cola">Coca-Cola</span>`;
  else if (c.foil) tag = `<span class="s-tag foil">✦ Folie</span>`;
  else if (c.role === "Mannschaftsfoto") tag = `<span class="s-tag team-tag">Team</span>`;
  else if (c.role === "Spezial") tag = `<span class="s-tag spec">Spezial</span>`;

  const shiny = c.shinyEligible
    ? `<button class="shine ${shinyOf(c.id) ? "on" : ""}" data-act="shiny" title="Glänzend (DFB) besitzen">✨</button>`
    : "";

  return `
    <span class="s-num">${c.label}</span>
    <span class="s-name ${hasName ? "" : "empty"}">${escapeHtml(nameText)}</span>
    ${tag}
    <div class="s-row">
      <span class="cnt ${n >= 2 ? "multi" : ""}">
        <button class="step" data-act="minus" aria-label="weniger">−</button>
        <span class="val">${n}</span>
        <button class="step" data-act="plus" aria-label="mehr">+</button>
      </span>
      ${shiny}
      <button class="s-edit" data-act="edit" title="Name bearbeiten">✎</button>
    </div>`;
}

function cardClasses(c) {
  return "sticker"
    + (countOf(c.id) > 0 ? " owned" : "")
    + (c.foil ? " is-foil" : "")
    + (c.kind === "extra" ? " is-extra var-bg-" + VARIANT_INITIAL[c.variant] : "")
    + (c.kind === "coca" ? " is-coca" : "")
    + (shinyOf(c.id) ? " has-shine" : "");
}

function render() {
  const st = refreshStats();
  renderChips();

  const visible = CARDS.filter(passesFilter);
  el("resultInfo").innerHTML = `<b>${visible.length}</b> Karten angezeigt`;

  // Gruppieren nach Sektion, sortiert nach WM-Gruppe
  const ALL_GROUPS = ["Spezial", ...GROUP_ORDER, "Extra", "Coca-Cola"];
  const groupSections = {};
  for (const c of visible) (groupSections[c.sectionCode] ||= []).push(c);

  const host = el("sections");
  const codes = Object.keys(groupSections).sort((a, b) => {
    const ga = ALL_GROUPS.indexOf(sectionByCode[a].group);
    const gb = ALL_GROUPS.indexOf(sectionByCode[b].group);
    if (ga !== gb) return ga - gb;
    return sectionByCode[a].name.localeCompare(sectionByCode[b].name, "de");
  });
  const groups = groupSections;

  if (codes.length === 0) {
    host.innerHTML = `<div class="empty"><div class="big">🔍</div>
      <p>Keine Karten gefunden.<br>Such- oder Filtereinstellungen anpassen.</p></div>`;
  } else {
    let html = "";
    for (const code of codes) {
      const s = sectionByCode[code];
      const ss = sectionStats(code);
      const collapsed = STATE.collapsed[code];
      html += `
      <section class="team${ss.complete ? " complete" : ""}${collapsed ? " collapsed" : ""}" data-section="${code}">
        <div class="team-head">
          <button class="team-toggle" data-act="collapse" data-team="${code}" aria-label="Auf-/Zuklappen">
            <span class="flag-badge">${s.flag}</span>
          </button>
          <span class="team-title" data-act="collapse" data-team="${code}">
            <span class="tname">${escapeHtml(s.name)}${ss.complete ? '<span class="check">✓</span>' : ""}</span>
            <span class="tmeta"><span class="tcode">${code}</span><span class="tconf">${s.kind === "team" ? "Gruppe " + s.group : s.conf}</span></span>
          </span>
          <span class="team-prog">
            <span class="tcount"><b>${ss.owned}</b> / ${ss.total}</span>
            <svg class="mini-ring" viewBox="0 0 40 40"><circle class="mr-bg" cx="20" cy="20" r="16"></circle>
              <circle class="mr-fg" cx="20" cy="20" r="16" style="stroke-dasharray:${MINI_CIRC};stroke-dashoffset:${MINI_CIRC * (1 - ss.pct)}"></circle></svg>
            <button class="btn-check" data-act="team-all" data-team="${code}" title="Ganzes Team abhaken / leeren">${ss.complete ? "Leeren" : "Alle ✓"}</button>
            <span class="chev" data-act="collapse" data-team="${code}">▾</span>
          </span>
        </div>
        <div class="grid">
          ${sortCards(groups[code]).map((c) => `<div class="${cardClasses(c)}" data-id="${c.id}">${cardInner(c)}</div>`).join("")}
        </div>
      </section>`;
    }
    host.innerHTML = html;
  }

  // Konfetti bei frisch komplettem Team
  const completeNow = new Set(SECTIONS.filter((s) => s.kind === "team" && sectionStats(s.code).complete).map((s) => s.code));
  if (!firstRender) for (const code of completeNow) if (!prevComplete.has(code)) { burstConfetti(); break; }
  prevComplete = completeNow; firstRender = false;
}

/* Inkrementelles Update einer Karte (schnelles Massen-Abhaken) */
function refreshCard(id) {
  const c = cardById[id];
  const node = el("sections").querySelector(`.sticker[data-id="${CSS.escape(id)}"]`);
  if (node) { node.className = cardClasses(c); node.innerHTML = cardInner(c); }
}
function refreshSectionHeader(code) {
  const sec = el("sections").querySelector(`section[data-section="${CSS.escape(code)}"]`);
  if (!sec) return;
  const ss = sectionStats(code);
  sec.classList.toggle("complete", ss.complete);
  sec.querySelector(".tcount").innerHTML = `<b>${ss.owned}</b> / ${ss.total}`;
  sec.querySelector(".mr-fg").style.strokeDashoffset = MINI_CIRC * (1 - ss.pct);
  const btn = sec.querySelector(".btn-check"); if (btn) btn.textContent = ss.complete ? "Leeren" : "Alle ✓";
  const tn = sec.querySelector(".tname");
  if (tn) tn.innerHTML = `${escapeHtml(sectionByCode[code].name)}${ss.complete ? '<span class="check">✓</span>' : ""}`;
}

/* Nach Zustandsänderung: in 'Alle'-Ansicht schnell inkrementell, sonst neu rendern */
function applyChange(ids) {
  if (ui.view === "all") {
    const secs = new Set();
    for (const id of ids) { refreshCard(id); secs.add(cardById[id].sectionCode); }
    secs.forEach(refreshSectionHeader);
    const st = refreshStats();
    // Konfetti, wenn Team gerade komplett
    const completeNow = new Set(SECTIONS.filter((s) => s.kind === "team" && sectionStats(s.code).complete).map((s) => s.code));
    for (const code of completeNow) if (!prevComplete.has(code)) { burstConfetti(); break; }
    prevComplete = completeNow;
  } else {
    render();
  }
}

/* ======================================================================
 * Aktionen
 * ====================================================================== */
function setCount(id, n) {
  n = Math.max(0, n);
  if (n === 0) delete STATE.counts[id]; else STATE.counts[id] = n;
}
function toggleOwned(id) { setCount(id, countOf(id) > 0 ? 0 : 1); save(); applyChange([id]); }
function changeCount(id, d) { setCount(id, countOf(id) + d); save(); applyChange([id]); }
function toggleShiny(id) {
  if (shinyOf(id)) delete STATE.shiny[id]; else STATE.shiny[id] = 1;
  if (STATE.shiny[id] && countOf(id) === 0) STATE.counts[id] = 1; // glänzend ⇒ besitzt Karte
  save(); applyChange([id]);
}
function toggleTeam(code) {
  const cs = CARDS.filter((c) => c.sectionCode === code);
  const allOwned = cs.every((c) => countOf(c.id) > 0);
  for (const c of cs) setCount(c.id, allOwned ? 0 : Math.max(1, countOf(c.id)));
  save();
  if (ui.view === "all") { cs.forEach((c) => refreshCard(c.id)); refreshSectionHeader(code); const s = refreshStats();
    const completeNow = new Set(SECTIONS.filter((x) => x.kind === "team" && sectionStats(x.code).complete).map((x) => x.code));
    for (const cc of completeNow) if (!prevComplete.has(cc)) { burstConfetti(); break; } prevComplete = completeNow;
  } else render();
  toast(allOwned ? "Team geleert" : "Team komplett abgehakt");
}

/* ======================================================================
 * Modal (Name bearbeiten)
 * ====================================================================== */
let modalSave = null;
function openModal(title, body, onSave) {
  el("modalTitle").textContent = title; el("modalBody").innerHTML = body; modalSave = onSave;
  el("modal").hidden = false;
  const f = el("modalBody").querySelector("input,select"); if (f) setTimeout(() => f.focus(), 30);
}
function closeModal() { el("modal").hidden = true; modalSave = null; }
function openEdit(c) {
  openModal(`Karte ${c.label}`, `
    <div class="field"><label>Name / Bezeichnung</label>
      <input id="m_name" type="text" value="${escapeAttr(nameOf(c))}" placeholder="z. B. Felix Nmecha (MF)" /></div>`,
    () => { STATE.names[c.id] = el("m_name").value.trim(); save(); refreshCard(c.id); toast("Gespeichert"); });
}

/* ======================================================================
 * Übersicht kopieren (Such-/Tauschliste)
 * ====================================================================== */
function copyList() {
  const visible = CARDS.filter(passesFilter);
  if (!visible.length) { toast("Liste ist leer"); return; }
  const title = { owned: "Habe ich", missing: "Fehlen mir", dupes: "Doppelte", all: "Karten" }[ui.view];
  const lines = sortCardsGlobal(visible).map((c) => {
    const n = countOf(c.id);
    const extra = ui.view === "dupes" && n >= 2 ? ` (${n - 1}× doppelt)` : (n > 1 ? ` (${n}×)` : "");
    return `${c.label}${nameOf(c) ? " – " + nameOf(c) : ""}${extra}`;
  });
  const text = `Panini WM 2026 · ${title} (${lines.length}):\n` + lines.join("\n");
  navigator.clipboard?.writeText(text).then(() => toast(`${lines.length} Karten kopiert`), () => fallbackCopy(text));
}
function sortCardsGlobal(arr) {
  const ALL_GROUPS = ["Spezial", ...GROUP_ORDER, "Extra", "Coca-Cola"];
  return arr.slice().sort((a, b) => {
    const ga = ALL_GROUPS.indexOf(a.group), gb = ALL_GROUPS.indexOf(b.group);
    if (ga !== gb) return ga - gb;
    if (a.sectionName !== b.sectionName) return a.sectionName.localeCompare(b.sectionName, "de");
    return a.num - b.num;
  });
}
function fallbackCopy(text) {
  const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
  ta.select(); try { document.execCommand("copy"); toast("Liste kopiert"); } catch (e) { toast("Kopieren nicht möglich"); }
  ta.remove();
}

/* ======================================================================
 * Import / Export / Reset
 * ====================================================================== */
function exportData() {
  const blob = new Blob([JSON.stringify(STATE, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `panini-wm2026-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  toast("Sammlung exportiert");
}
function importData() {
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/json";
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try {
      STATE = Object.assign({ counts: {}, shiny: {}, names: {}, collapsed: {}, partner: null, tradeWanted: {} }, JSON.parse(r.result));
      STATE.partner = STATE.partner || null;
      STATE.tradeWanted = STATE.tradeWanted || {};
      save(); render(); toast("Sammlung importiert");
    } catch (e) { toast("Datei konnte nicht gelesen werden"); } };
    r.readAsText(f);
  };
  inp.click();
}
function resetAll() {
  if (!confirm("Wirklich alles zurücksetzen (Karten, Anzahl, Glanz, Namen)?")) return;
  STATE = { counts: {}, shiny: {}, names: {}, collapsed: {}, partner: null, tradeWanted: {} }; prevComplete = new Set();
  save(); render(); toast("Zurückgesetzt");
}

/* ======================================================================
 * Hilfen
 * ====================================================================== */
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function escapeAttr(s) { return escapeHtml(s); }
let toastTimer;
function toast(msg) { const t = el("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1900); }

function burstConfetti() {
  const cv = el("confetti"), ctx = cv.getContext("2d");
  cv.width = innerWidth; cv.height = innerHeight;
  const cols = ["#34e0a1", "#3fb6ff", "#7c6bff", "#ffcb52", "#ff5d6c"];
  const ps = Array.from({ length: 110 }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 240, y: innerHeight / 3,
    vx: (Math.random() - .5) * 9, vy: Math.random() * -11 - 4, s: Math.random() * 7 + 4,
    c: cols[(Math.random() * cols.length) | 0], rot: Math.random() * 360, vr: (Math.random() - .5) * 18 }));
  let f = 0;
  (function tick() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const p of ps) { p.vy += .32; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); ctx.restore(); }
    if (++f < 130) requestAnimationFrame(tick); else ctx.clearRect(0, 0, cv.width, cv.height);
  })();
}

/* ======================================================================
 * Setup (Übersicht)
 * ====================================================================== */
function renderChips() {
  const box = el("confChips");
  const counts = {};
  for (const c of CARDS) { const k = c.group; (counts[k] ||= [0, 0]); counts[k][1]++; if (countOf(c.id) > 0) counts[k][0]++; }
  const allOwned = CARDS.filter((c) => countOf(c.id) > 0).length;
  const mk = (val, label, owned, total) => `<button class="chip ${ui.conf === val ? "active" : ""}" data-conf="${val}">${label} <span class="c-count">${owned}/${total}</span></button>`;
  if (!box.childElementCount) {
    let html = mk("ALL", "Alle", allOwned, CARDS.length);
    html += mk("Spezial", "Spezial", (counts["Spezial"] || [0, 0])[0], (counts["Spezial"] || [0, 0])[1]);
    for (const g of GROUP_ORDER) html += mk(g, "Gr. " + g, (counts[g] || [0, 0])[0], (counts[g] || [0, 0])[1]);
    html += mk("Extra", "Extra ✨", (counts["Extra"] || [0, 0])[0], (counts["Extra"] || [0, 0])[1]);
    html += mk("Coca-Cola", "Coca-Cola", (counts["Coca-Cola"] || [0, 0])[0], (counts["Coca-Cola"] || [0, 0])[1]);
    box.innerHTML = html;
    box.onclick = (e) => { const b = e.target.closest(".chip"); if (!b) return; ui.conf = b.dataset.conf; ui.team = "ALL"; render(); };
  } else {
    box.querySelectorAll(".chip").forEach((b) => {
      const v = b.dataset.conf; b.classList.toggle("active", v === ui.conf);
      const cc = b.querySelector(".c-count");
      if (v === "ALL") cc.textContent = `${allOwned}/${CARDS.length}`;
      else cc.textContent = `${(counts[v] || [0, 0])[0]}/${(counts[v] || [0, 0])[1]}`;
    });
  }
}

function onSectionsClick(e) {
  const act = e.target.closest("[data-act]");
  if (act) {
    const a = act.dataset.act;
    if (a === "collapse") { const code = act.dataset.team; STATE.collapsed[code] = !STATE.collapsed[code]; save();
      el("sections").querySelector(`section[data-section="${CSS.escape(code)}"]`).classList.toggle("collapsed"); return; }
    if (a === "team-all") { toggleTeam(act.dataset.team); return; }
    const card = act.closest(".sticker"); if (!card) return;
    const id = card.dataset.id;
    if (a === "plus") changeCount(id, +1);
    else if (a === "minus") changeCount(id, -1);
    else if (a === "shiny") toggleShiny(id);
    else if (a === "edit") openEdit(cardById[id]);
    return;
  }
  const card = e.target.closest(".sticker");
  if (card) toggleOwned(card.dataset.id);
}

/* ======================================================================
 * Tab-Navigation
 * ====================================================================== */
function switchTab(tab) {
  document.querySelectorAll(".tab-pane").forEach(p => { p.hidden = true; });
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  el("pane-" + tab).hidden = false;
  window.scrollTo(0, 0);
  if (tab === "add") renderAddTab();
  if (tab === "trade") renderTradeTab();
}

/* ======================================================================
 * Add Tab
 * ====================================================================== */
const addUi = { search: "", group: "ALL", selected: new Set() };

function initAddTab() {
  // Search
  el("addSearchInput").addEventListener("input", (e) => {
    addUi.search = e.target.value;
    el("addSearchClear").hidden = !e.target.value;
    renderAddTab();
  });
  el("addSearchClear").onclick = () => {
    el("addSearchInput").value = ""; addUi.search = ""; el("addSearchClear").hidden = true; renderAddTab();
  };

  // Group chips
  const box = el("addChips");
  const groups = ["ALL", "Spezial", ...GROUP_ORDER, "Extra", "Coca-Cola"];
  const labels = { ALL: "Alle", Spezial: "Spezial", Extra: "Extra ✨", "Coca-Cola": "Coca-Cola" };
  let html = "";
  for (const g of groups) {
    const lbl = labels[g] || ("Gr. " + g);
    html += `<button class="chip ${addUi.group === g ? "active" : ""}" data-addgroup="${g}">${lbl}</button>`;
  }
  box.innerHTML = html;
  box.onclick = (e) => {
    const b = e.target.closest("[data-addgroup]"); if (!b) return;
    addUi.group = b.dataset.addgroup;
    box.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.addgroup === addUi.group));
    renderAddTab();
  };

  // Select all / mark buttons
  el("addSelAllBtn").onclick = () => {
    const visible = getAddVisible();
    const allSel = visible.every(c => addUi.selected.has(c.id));
    if (allSel) { visible.forEach(c => addUi.selected.delete(c.id)); }
    else { visible.forEach(c => addUi.selected.add(c.id)); }
    renderAddTab();
  };

  el("addMarkBtn").onclick = () => {
    let count = 0;
    for (const id of addUi.selected) {
      if (countOf(id) === 0) { setCount(id, 1); count++; }
    }
    addUi.selected.clear();
    save(); refreshStats(); renderAddTab();
    toast(count > 0 ? `${count} Karten als vorhanden markiert` : "Keine neuen Karten markiert");
  };

  // Card list clicks (delegation)
  el("addSections").addEventListener("click", (e) => {
    // Section "Alle" button
    const secAllBtn = e.target.closest("[data-sec-all]");
    if (secAllBtn) {
      const code = secAllBtn.dataset.secAll;
      const secCards = getAddVisible().filter(c => c.sectionCode === code);
      const allSel = secCards.every(c => addUi.selected.has(c.id));
      if (allSel) secCards.forEach(c => addUi.selected.delete(c.id));
      else secCards.forEach(c => addUi.selected.add(c.id));
      renderAddTab(); return;
    }
    // Card row click (toggle selection)
    const row = e.target.closest(".add-card");
    if (row) {
      const id = row.dataset.id;
      if (addUi.selected.has(id)) addUi.selected.delete(id); else addUi.selected.add(id);
      renderAddTab();
    }
  });
}

function getAddVisible() {
  const q = addUi.search.trim();
  return CARDS.filter(c => {
    if (addUi.group !== "ALL" && c.group !== addUi.group) return false;
    if (q) return matchesSearch(c, q);
    return true;
  });
}

function renderAddTab() {
  const visible = getAddVisible();

  // Update selection count & button state
  const selCount = addUi.selected.size;
  el("addSelCount").textContent = selCount === 0 ? "0 ausgewählt" : `${selCount} ausgewählt`;
  el("addMarkBtn").disabled = selCount === 0;

  // Group by section, sorted by WM-group then name
  const ALL_GROUPS = ["Spezial", ...GROUP_ORDER, "Extra", "Coca-Cola"];
  const bySec = {};
  for (const c of visible) (bySec[c.sectionCode] ||= []).push(c);
  const codes = Object.keys(bySec).sort((a, b) => {
    const ga = ALL_GROUPS.indexOf(sectionByCode[a].group);
    const gb = ALL_GROUPS.indexOf(sectionByCode[b].group);
    if (ga !== gb) return ga - gb;
    return sectionByCode[a].name.localeCompare(sectionByCode[b].name, "de");
  });

  let html = "";
  for (const code of codes) {
    const s = sectionByCode[code];
    const cards = bySec[code].slice().sort((a, b) => a.num - b.num);
    const secCards = cards;
    const allSecSel = secCards.every(c => addUi.selected.has(c.id));
    const subLabel = s.kind === "team" ? "Gruppe " + s.group : s.conf;

    html += `<div class="add-section">
      <div class="add-sec-head">
        <span style="font-size:22px">${s.flag}</span>
        <div class="add-sec-info">
          <span class="add-sec-name">${escapeHtml(s.name)}</span>
          <span class="add-sec-sub">${subLabel}</span>
        </div>
        <button class="btn" data-sec-all="${code}">${allSecSel ? "Alle ab" : "Alle ✓"}</button>
      </div>
      <div class="add-card-list">`;

    for (const c of cards) {
      const n = countOf(c.id);
      const owned = n > 0;
      const sel = addUi.selected.has(c.id);
      const displayName = nameOf(c) || c.role;
      const countLabel = n === 0 ? "0×" : (n === 1 ? "1×" : `${n}×`);
      html += `<div class="add-card${owned ? " owned" : ""}${sel ? " sel" : ""}" data-id="${c.id}">
        <input type="checkbox" class="add-cb" ${sel ? "checked" : ""} tabindex="-1" onclick="return false" />
        <span class="add-card-num">${escapeHtml(c.label)}</span>
        <span class="add-card-name">${escapeHtml(displayName)}</span>
        <span class="add-card-count${n >= 2 ? " multi" : ""}">${countLabel}</span>
      </div>`;
    }

    html += `</div></div>`;
  }

  if (!html) html = `<div class="empty"><div class="big">🔍</div><p>Keine Karten gefunden.</p></div>`;
  el("addSections").innerHTML = html;
}

/* ======================================================================
 * Trade Tab
 * ====================================================================== */
function partnerCountOf(id) {
  return STATE.partner ? (STATE.partner.counts[id] || 0) : 0;
}

function initTradeTab() {
  el("tradeImportBtn").onclick = () => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/json";
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { try {
        const parsed = JSON.parse(r.result);
        const name = el("tradePartnerName").value.trim() || f.name.replace(/\.json$/i, "");
        STATE.partner = { name, counts: parsed.counts || {} };
        STATE.tradeWanted = {};
        save(); renderTradeTab(); toast("Partnersammlung geladen");
      } catch (e) { toast("Datei konnte nicht gelesen werden"); } };
      r.readAsText(f);
    };
    inp.click();
  };

  el("tradeClearBtn").onclick = () => {
    STATE.partner = null; STATE.tradeWanted = {};
    save(); renderTradeTab(); toast("Partner entfernt");
  };

  el("tradeGiveAllBtn").onclick = () => {
    const giveCards = CARDS.filter(c => countOf(c.id) >= 2 && partnerCountOf(c.id) === 0);
    for (const c of giveCards) { setCount(c.id, countOf(c.id) - 1); }
    save(); renderTradeTab(); refreshStats(); toast(`${giveCards.length} Karten zugeteilt`);
  };

  el("tradeGetAllBtn").onclick = () => {
    const getCards = CARDS.filter(c => partnerCountOf(c.id) >= 2 && countOf(c.id) === 0);
    for (const c of getCards) { STATE.tradeWanted[c.id] = true; }
    save(); renderTradeTab(); toast(`${getCards.length} Karten angefordert`);
  };

  el("tradeConfirmBtn").onclick = () => {
    let count = 0;
    for (const id in STATE.tradeWanted) {
      if (countOf(id) === 0) { setCount(id, 1); count++; }
    }
    STATE.tradeWanted = {};
    save(); refreshStats(); renderTradeTab(); toast(`${count} Karten als erhalten markiert`);
  };

  // Delegated clicks on trade lists
  el("tradeContent").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act][data-id]"); if (!btn) return;
    const act = btn.dataset.act, id = btn.dataset.id;
    if (act === "give") { setCount(id, countOf(id) - 1); save(); renderTradeTab(); refreshStats(); }
    else if (act === "want") { STATE.tradeWanted[id] = true; save(); renderTradeTab(); }
    else if (act === "unwant") { delete STATE.tradeWanted[id]; save(); renderTradeTab(); }
  });
}

function renderTradeTab() {
  const hasPartner = !!STATE.partner;
  el("tradeContent").hidden = !hasPartner;
  el("tradeClearBtn").hidden = !hasPartner;

  if (hasPartner) {
    el("tradePartnerName").value = STATE.partner.name;
    el("tradePartnerStatus").textContent = `Partner: ${STATE.partner.name}`;
    // Update partner name references
    document.querySelectorAll(".partner-name-ref").forEach(s => s.textContent = STATE.partner.name);
  } else {
    el("tradePartnerStatus").textContent = "Noch kein Partner. JSON-Export der anderen Person importieren.";
    return;
  }

  const giveCards = CARDS.filter(c => countOf(c.id) >= 2 && partnerCountOf(c.id) === 0);
  const getCards = CARDS.filter(c => partnerCountOf(c.id) >= 2 && countOf(c.id) === 0);
  const offerCards = CARDS.filter(c => countOf(c.id) >= 2 && partnerCountOf(c.id) > 0);
  const wantedIds = Object.keys(STATE.tradeWanted);

  el("tradeGiveCount").textContent = giveCards.length;
  el("tradeGetCount").textContent = getCards.length;
  el("tradeOfferCount").textContent = offerCards.length;
  el("tradeWantedCount").textContent = wantedIds.length;
  el("tradeWantedBlock").hidden = wantedIds.length === 0;

  el("tradeGiveList").innerHTML = renderTradeRows(giveCards, "give");
  el("tradeGetList").innerHTML = renderTradeRows(getCards, "want");
  el("tradeOfferList").innerHTML = renderTradeRows(offerCards, null);
  el("tradeWantedList").innerHTML = renderTradeRows(wantedIds.map(id => cardById[id]).filter(Boolean), "unwant");
}

function renderTradeRows(cards, action) {
  if (!cards.length) return `<p class="muted small" style="padding:8px 0">Keine Karten</p>`;
  return cards.map(c => {
    const n = countOf(c.id);
    const ctLabel = n >= 2 ? `${n}×` : (n === 1 ? "1×" : "0×");
    let btnHtml = "";
    if (action === "give") btnHtml = `<button class="btn trade-btn" data-act="give" data-id="${c.id}">−1 zuteilen</button>`;
    else if (action === "want") btnHtml = `<button class="btn trade-btn" data-act="want" data-id="${c.id}">Anfordern</button>`;
    else if (action === "unwant") btnHtml = `<button class="btn trade-btn btn-danger" data-act="unwant" data-id="${c.id}">Entfernen</button>`;
    return `<div class="trade-row" data-id="${c.id}">
      <span class="trade-num">${escapeHtml(c.label)}</span>
      <span class="trade-name">${escapeHtml(nameOf(c))}</span>
      ${n >= 2 ? `<span class="trade-ct">${ctLabel}</span>` : ""}
      ${btnHtml}
    </div>`;
  }).join("");
}

/* ======================================================================
 * Service Worker + Install
 * ====================================================================== */
function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").then((reg) => {
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          sw.addEventListener("statechange", () => {
            if (sw.state === "activated") window.location.reload();
          });
        });
      }).catch(() => {});
    });
    // Reload when a new SW takes over (handles already-waiting SW case)
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload());
  }
  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; el("installBtn").hidden = false; });
  el("installBtn").onclick = async () => {
    if (!deferred) { toast("Über das Browser-Menü „Zum Startbildschirm" installieren"); return; }
    deferred.prompt(); await deferred.userChoice; deferred = null; el("installBtn").hidden = true;
  };
  window.addEventListener("appinstalled", () => { el("installBtn").hidden = true; toast("App installiert 🎉"); });
}

/* ======================================================================
 * Init
 * ====================================================================== */
function init() {
  // Guard: if key elements are missing the HTML is an old cached version — force reload
  if (!el("addSearchInput") || !el("tradeImportBtn")) {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).finally(() => location.reload());
    return;
  }
  load();

  el("searchInput").addEventListener("input", (e) => { ui.search = e.target.value; el("searchClear").hidden = !e.target.value; render(); });
  el("searchClear").onclick = () => { el("searchInput").value = ""; ui.search = ""; el("searchClear").hidden = true; render(); el("searchInput").focus(); };
  el("sortSelect").onchange = (e) => { ui.sort = e.target.value; render(); };

  document.querySelectorAll("#viewSeg .seg-btn").forEach((b) => {
    b.onclick = () => { ui.view = b.dataset.view; document.querySelectorAll("#viewSeg .seg-btn").forEach((x) => x.classList.toggle("active", x === b)); render(); };
  });

  el("sections").addEventListener("click", onSectionsClick);
  el("btnExpand").onclick = () => { STATE.collapsed = {}; save(); render(); };
  el("btnCollapse").onclick = () => { SECTIONS.forEach((s) => (STATE.collapsed[s.code] = true)); save(); render(); };
  el("btnCopyList").onclick = copyList;

  el("btnExport").onclick = exportData;
  el("btnImport").onclick = importData;
  el("btnReset").onclick = resetAll;

  el("modalCancel").onclick = closeModal;
  el("modalSave").onclick = () => { if (modalSave && modalSave() !== false) closeModal(); };
  el("modal").addEventListener("click", (e) => { if (e.target === el("modal")) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el("modal").hidden) closeModal();
    if (e.key === "Enter" && !el("modal").hidden && e.target.tagName === "INPUT") el("modalSave").click();
    if (e.key === "/" && document.activeElement.tagName !== "INPUT") { e.preventDefault(); el("searchInput").focus(); }
  });

  // Tab navigation
  document.querySelectorAll(".tab-btn").forEach(b => b.onclick = () => switchTab(b.dataset.tab));

  initAddTab();
  initTradeTab();

  registerSW();
  render();
}

document.addEventListener("DOMContentLoaded", init);
