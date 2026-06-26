/* Panini WM 2026 Tracker – Logik (Vanilla JS, PWA, ohne Backend) */

const STORAGE_KEY = "paniniWM2026.v2";
const RING_CIRC = 2 * Math.PI * 52;
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
const ALL_GROUPS = ["Spezial", ...GROUP_ORDER, "Extra", "Coca-Cola"];

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
      STATE.partner = STATE.partner || null;
      STATE.tradeWanted = STATE.tradeWanted || {};
      return;
    }
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
 * Helfer
 * ====================================================================== */
const el = (id) => document.getElementById(id);
let CURRENT_TAB = "overview";

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function escapeAttr(s) { return escapeHtml(s); }
let toastTimer;
function toast(msg) { const t = el("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1900); }

function matchesSearch(c, q) {
  if (!q) return true;
  const qn = normalize(q);
  const qNorm = qn.replace(/\s+/g, "");
  return qn.split(/\s+/).every((tok) => c.searchNorm.includes(tok)) || c.searchNorm.includes(qNorm);
}
function isSpecial(c) {
  return c.foil || c.kind === "extra" || c.kind === "coca" || c.role === "Spezial";
}
function byGroupThenName(a, b) {
  const ga = ALL_GROUPS.indexOf(sectionByCode[a].group), gb = ALL_GROUPS.indexOf(sectionByCode[b].group);
  if (ga !== gb) return ga - gb;
  return sectionByCode[a].name.localeCompare(sectionByCode[b].name, "de");
}
function emptyHtml(msg) {
  return `<div class="empty"><div class="big">🔍</div><p>${msg || "Keine Karten gefunden."}</p></div>`;
}

/* ======================================================================
 * Nationen-Dropdown (mit Flaggen, nach WM-Gruppe sortiert)
 * ====================================================================== */
function buildNationOptions() {
  let html = `<option value="ALL">🌍 Alle Nationen</option>`;
  for (const g of ALL_GROUPS) {
    const secs = SECTIONS.filter((s) => s.group === g).sort((a, b) => a.name.localeCompare(b.name, "de"));
    if (!secs.length) continue;
    const label = g === "Spezial" ? "Spezial" : g === "Extra" ? "Extra" : g === "Coca-Cola" ? "Coca-Cola" : "Gruppe " + g;
    html += `<optgroup label="${label}">`;
    for (const s of secs) html += `<option value="${s.code}">${s.flag} ${escapeHtml(s.name)}</option>`;
    html += `</optgroup>`;
  }
  return html;
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
function sectionStats(code) {
  const cs = CARDS.filter((c) => c.sectionCode === code);
  const owned = cs.filter((c) => countOf(c.id) > 0).length;
  return { owned, total: cs.length, pct: cs.length ? owned / cs.length : 0, complete: owned === cs.length && cs.length > 0 };
}

/* ======================================================================
 * Kompakte Karten-Zeile (für Übersicht & Hinzufügen)
 * ====================================================================== */
function specialTag(c) {
  if (c.kind === "extra") return `<span class="s-tag var-${VARIANT_INITIAL[c.variant]}">${c.variant}</span>`;
  if (c.kind === "coca") return `<span class="s-tag cola">CC</span>`;
  if (c.shinyEligible && shinyOf(c.id)) return `<span class="s-tag foil">✨ Glanz</span>`;
  if (c.foil) return `<span class="s-tag foil">✦ Folie</span>`;
  if (c.role === "Mannschaftsfoto") return `<span class="s-tag team-tag">Team</span>`;
  if (c.role === "Spezial") return `<span class="s-tag spec">Spezial</span>`;
  return "";
}
function rowClasses(c) {
  return "row" + (countOf(c.id) > 0 ? " owned" : "") + (shinyOf(c.id) ? " has-shine" : "");
}
function rowInner(c) {
  const n = countOf(c.id);
  const hasName = !!nameOf(c);
  const nameText = hasName ? nameOf(c) : (c.role === "Spieler" ? "Name eintragen" : (c.role || "—"));
  const tag = specialTag(c);
  const shiny = c.shinyEligible
    ? `<button class="r-shine ${shinyOf(c.id) ? "on" : ""}" data-act="shiny" title="Glanz-Variante (DFB)">✨</button>` : "";
  return `
    <span class="r-num">${escapeHtml(c.label)}</span>
    <span class="r-name ${hasName ? "" : "empty"}">${escapeHtml(nameText)}</span>
    ${tag}
    ${shiny}
    <span class="r-cnt ${n >= 2 ? "multi" : ""}">
      <button class="r-step" data-act="minus" aria-label="weniger">−</button>
      <span class="r-val">${n}</span>
      <button class="r-step" data-act="plus" aria-label="mehr">+</button>
    </span>`;
}
function rowHtml(c) {
  return `<div class="${rowClasses(c)}" data-id="${c.id}">${rowInner(c)}</div>`;
}

/* ======================================================================
 * Inkrementelle Updates
 * ====================================================================== */
let prevComplete = new Set();
let firstRender = true;

function refreshRow(id) {
  const c = cardById[id];
  document.querySelectorAll(`.row[data-id="${CSS.escape(id)}"]`).forEach((node) => {
    node.className = rowClasses(c);
    node.innerHTML = rowInner(c);
  });
}
function refreshAddHeader(code) {
  const sec = el("addSections").querySelector(`section.acc[data-section="${CSS.escape(code)}"]`);
  if (!sec) return;
  const ss = sectionStats(code);
  sec.classList.toggle("complete", ss.complete);
  const prog = sec.querySelector(".acc-prog"); if (prog) prog.innerHTML = `<b>${ss.owned}</b>/${ss.total}`;
  const btn = sec.querySelector(".btn-check"); if (btn) btn.textContent = ss.complete ? "Leeren" : "Alle ✓";
  const nm = sec.querySelector(".acc-name");
  if (nm) nm.innerHTML = `${escapeHtml(sectionByCode[code].name)}${ss.complete ? ' <span class="check">✓</span>' : ""}`;
}
function applyChange(ids) {
  refreshStats();
  if (CURRENT_TAB === "add" && addFiltersActive()) {
    renderAddTab();
  } else {
    const secs = new Set();
    for (const id of ids) { refreshRow(id); secs.add(cardById[id].sectionCode); }
    if (CURRENT_TAB === "add") secs.forEach(refreshAddHeader);
  }
  const completeNow = new Set(SECTIONS.filter((s) => s.kind === "team" && sectionStats(s.code).complete).map((s) => s.code));
  if (!firstRender) for (const code of completeNow) if (!prevComplete.has(code)) { burstConfetti(); break; }
  prevComplete = completeNow; firstRender = false;
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
  if (STATE.shiny[id] && countOf(id) === 0) STATE.counts[id] = 1;
  save(); applyChange([id]);
}
function toggleTeam(code) {
  const cs = CARDS.filter((c) => c.sectionCode === code);
  const allOwned = cs.every((c) => countOf(c.id) > 0);
  for (const c of cs) setCount(c.id, allOwned ? 0 : Math.max(1, countOf(c.id)));
  save();
  applyChange(cs.map((c) => c.id));
  toast(allOwned ? "Nation geleert" : "Nation komplett abgehakt");
}

/* Klick-Delegation für Karten-Zeilen (beide Tabs) */
function onRowAreaClick(e) {
  const act = e.target.closest("[data-act]");
  if (act) {
    const a = act.dataset.act;
    if (a === "acc") {
      const code = act.dataset.code;
      if (addUi.open.has(code)) addUi.open.delete(code); else addUi.open.add(code);
      renderAddTab(); return;
    }
    if (a === "nation-all") { toggleTeam(act.dataset.code); return; }
    const row = act.closest(".row"); if (!row) return;
    const id = row.dataset.id;
    if (a === "plus") changeCount(id, +1);
    else if (a === "minus") changeCount(id, -1);
    else if (a === "shiny") toggleShiny(id);
    else if (a === "edit") openEdit(cardById[id]);
    return;
  }
  const row = e.target.closest(".row");
  if (row) toggleOwned(row.dataset.id);
}

/* ======================================================================
 * Übersicht-Tab (flache Liste)
 * ====================================================================== */
const ui = { search: "", nation: "ALL" };

function passesOverview(c) {
  if (ui.nation !== "ALL" && c.sectionCode !== ui.nation) return false;
  return matchesSearch(c, ui.search.trim());
}
function sortGlobal(arr) {
  return arr.slice().sort((a, b) => {
    const ga = ALL_GROUPS.indexOf(a.group), gb = ALL_GROUPS.indexOf(b.group);
    if (ga !== gb) return ga - gb;
    if (a.sectionName !== b.sectionName) return a.sectionName.localeCompare(b.sectionName, "de");
    return a.num - b.num;
  });
}
function renderOverview() {
  refreshStats();
  const visible = sortGlobal(CARDS.filter(passesOverview));
  el("resultInfo").innerHTML = `<b>${visible.length}</b> Karten`;
  el("overviewList").innerHTML = visible.length
    ? visible.map(rowHtml).join("")
    : emptyHtml("Keine Karten – Suche oder Nation anpassen.");
}

/* ======================================================================
 * Hinzufügen-Tab (Nationen als Akkordeons + Filter)
 * ====================================================================== */
const addUi = { search: "", nation: "ALL", onlyMissing: false, onlyDupes: false, onlySpecial: false, open: new Set() };

function addFiltersActive() {
  return !!addUi.search.trim() || addUi.nation !== "ALL" || addUi.onlyMissing || addUi.onlyDupes || addUi.onlySpecial;
}
function addPasses(c) {
  if (addUi.nation !== "ALL" && c.sectionCode !== addUi.nation) return false;
  if (addUi.onlyMissing && countOf(c.id) > 0) return false;
  if (addUi.onlyDupes && countOf(c.id) < 2) return false;
  if (addUi.onlySpecial && !isSpecial(c)) return false;
  if (addUi.search.trim()) return matchesSearch(c, addUi.search.trim());
  return true;
}
function updateAddFilterBadge() {
  let n = 0;
  if (addUi.nation !== "ALL") n++;
  if (addUi.onlyMissing) n++;
  if (addUi.onlyDupes) n++;
  if (addUi.onlySpecial) n++;
  const b = el("addFilterBadge");
  b.textContent = n ? String(n) : ""; b.hidden = !n;
}
function renderAddTab() {
  updateAddFilterBadge();
  const active = addFiltersActive();
  const codes = SECTIONS.map((s) => s.code).sort(byGroupThenName);

  let html = "";
  for (const code of codes) {
    const s = sectionByCode[code];
    const visible = CARDS.filter((c) => c.sectionCode === code && addPasses(c)).sort((a, b) => a.num - b.num);
    if (active && !visible.length) continue;       // beim Filtern leere Nationen ausblenden
    const ss = sectionStats(code);
    const open = active || addUi.open.has(code);
    const sub = s.kind === "team" ? "Gruppe " + s.group : s.conf;

    html += `<section class="acc${ss.complete ? " complete" : ""}${open ? " open" : ""}" data-section="${code}">
      <div class="acc-head" data-act="acc" data-code="${code}">
        <span class="acc-flag">${s.flag}</span>
        <span class="acc-info">
          <span class="acc-name">${escapeHtml(s.name)}${ss.complete ? ' <span class="check">✓</span>' : ""}</span>
          <span class="acc-sub">${sub}</span>
        </span>
        <span class="acc-prog"><b>${ss.owned}</b>/${ss.total}</span>
        <button class="btn-check" data-act="nation-all" data-code="${code}" title="Ganze Nation abhaken / leeren">${ss.complete ? "Leeren" : "Alle ✓"}</button>
        <span class="acc-chev">▾</span>
      </div>
      ${open ? `<div class="acc-body">${visible.length
        ? visible.map(rowHtml).join("")
        : `<p class="muted small acc-empty">Keine passenden Karten</p>`}</div>` : ""}
    </section>`;
  }
  el("addSections").innerHTML = html || emptyHtml("Keine Karten – Filter anpassen.");
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
    () => { STATE.names[c.id] = el("m_name").value.trim(); save(); refreshRow(c.id); toast("Gespeichert"); });
}

/* ======================================================================
 * Liste kopieren (Übersicht-Auswahl)
 * ====================================================================== */
function copyList() {
  const visible = sortGlobal(CARDS.filter(passesOverview));
  if (!visible.length) { toast("Liste ist leer"); return; }
  const lines = visible.map((c) => {
    const n = countOf(c.id);
    const extra = n > 1 ? ` (${n}×)` : "";
    return `${c.label}${nameOf(c) ? " – " + nameOf(c) : ""}${extra}`;
  });
  const scope = ui.nation === "ALL" ? "Alle" : sectionByCode[ui.nation].name;
  const text = `Panini WM 2026 · ${scope} (${lines.length}):\n` + lines.join("\n");
  navigator.clipboard?.writeText(text).then(() => toast(`${lines.length} Karten kopiert`), () => fallbackCopy(text));
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
      save(); renderOverview(); toast("Sammlung importiert");
    } catch (e) { toast("Datei konnte nicht gelesen werden"); } };
    r.readAsText(f);
  };
  inp.click();
}
function resetAll() {
  if (!confirm("Wirklich alles zurücksetzen (Karten, Anzahl, Glanz, Namen)?")) return;
  STATE = { counts: {}, shiny: {}, names: {}, collapsed: {}, partner: null, tradeWanted: {} }; prevComplete = new Set();
  save(); renderOverview(); toast("Zurückgesetzt");
}

/* ======================================================================
 * Konfetti
 * ====================================================================== */
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
 * Tab-Navigation
 * ====================================================================== */
function switchTab(tab) {
  CURRENT_TAB = tab;
  document.querySelectorAll(".tab-pane").forEach((p) => { p.hidden = true; });
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  el("pane-" + tab).hidden = false;
  el("hero").hidden = (tab !== "overview");   // Statistiken nur in der Übersicht
  window.scrollTo(0, 0);
  if (tab === "overview") renderOverview();
  else if (tab === "add") renderAddTab();
  else if (tab === "trade") renderTradeTab();
}

/* ======================================================================
 * Tauschen-Tab
 * ====================================================================== */
function partnerCountOf(id) { return STATE.partner ? (STATE.partner.counts[id] || 0) : 0; }

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
    const giveCards = CARDS.filter((c) => countOf(c.id) >= 2 && partnerCountOf(c.id) === 0);
    for (const c of giveCards) setCount(c.id, countOf(c.id) - 1);
    save(); renderTradeTab(); refreshStats(); toast(`${giveCards.length} Karten zugeteilt`);
  };
  el("tradeGetAllBtn").onclick = () => {
    const getCards = CARDS.filter((c) => partnerCountOf(c.id) >= 2 && countOf(c.id) === 0);
    for (const c of getCards) STATE.tradeWanted[c.id] = true;
    save(); renderTradeTab(); toast(`${getCards.length} Karten angefordert`);
  };
  el("tradeConfirmBtn").onclick = () => {
    let count = 0;
    for (const id in STATE.tradeWanted) if (countOf(id) === 0) { setCount(id, 1); count++; }
    STATE.tradeWanted = {};
    save(); refreshStats(); renderTradeTab(); toast(`${count} Karten als erhalten markiert`);
  };
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
  if (!hasPartner) {
    el("tradePartnerStatus").textContent = "Noch kein Partner. JSON-Export der anderen Person importieren.";
    return;
  }
  el("tradePartnerName").value = STATE.partner.name;
  el("tradePartnerStatus").textContent = `Partner: ${STATE.partner.name}`;
  document.querySelectorAll(".partner-name-ref").forEach((s) => s.textContent = STATE.partner.name);

  const giveCards = CARDS.filter((c) => countOf(c.id) >= 2 && partnerCountOf(c.id) === 0);
  const getCards = CARDS.filter((c) => partnerCountOf(c.id) >= 2 && countOf(c.id) === 0);
  const offerCards = CARDS.filter((c) => countOf(c.id) >= 2 && partnerCountOf(c.id) > 0);
  const wantedIds = Object.keys(STATE.tradeWanted);

  el("tradeGiveCount").textContent = giveCards.length;
  el("tradeGetCount").textContent = getCards.length;
  el("tradeOfferCount").textContent = offerCards.length;
  el("tradeWantedCount").textContent = wantedIds.length;
  el("tradeWantedBlock").hidden = wantedIds.length === 0;

  el("tradeGiveList").innerHTML = renderTradeRows(giveCards, "give");
  el("tradeGetList").innerHTML = renderTradeRows(getCards, "want");
  el("tradeOfferList").innerHTML = renderTradeRows(offerCards, null);
  el("tradeWantedList").innerHTML = renderTradeRows(wantedIds.map((id) => cardById[id]).filter(Boolean), "unwant");
}
function renderTradeRows(cards, action) {
  if (!cards.length) return `<p class="muted small" style="padding:8px 0">Keine Karten</p>`;
  return cards.map((c) => {
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
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload());
  }
  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; el("installBtn").hidden = false; });
  el("installBtn").onclick = async () => {
    if (!deferred) { toast("Über das Browser-Menü „Zum Startbildschirm“ installieren"); return; }
    deferred.prompt(); await deferred.userChoice; deferred = null; el("installBtn").hidden = true;
  };
  window.addEventListener("appinstalled", () => { el("installBtn").hidden = true; toast("App installiert 🎉"); });
}

/* ======================================================================
 * Init
 * ====================================================================== */
function init() {
  // Guard: alte gecachte HTML-Version -> Cache leeren & neu laden
  if (!el("nationSelect") || !el("addFilterBtn") || !el("tradeImportBtn")) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(() => location.reload());
    return;
  }
  load();

  // Nationen-Dropdowns füllen
  el("nationSelect").innerHTML = buildNationOptions();
  el("addNationSelect").innerHTML = buildNationOptions();

  /* ---- Übersicht ---- */
  el("searchInput").addEventListener("input", (e) => { ui.search = e.target.value; el("searchClear").hidden = !e.target.value; renderOverview(); });
  el("searchClear").onclick = () => { el("searchInput").value = ""; ui.search = ""; el("searchClear").hidden = true; renderOverview(); el("searchInput").focus(); };
  el("nationSelect").onchange = (e) => { ui.nation = e.target.value; renderOverview(); };
  el("overviewList").addEventListener("click", onRowAreaClick);
  el("btnCopyList").onclick = copyList;
  el("btnExport").onclick = exportData;
  el("btnImport").onclick = importData;
  el("btnReset").onclick = resetAll;

  /* ---- Hinzufügen ---- */
  el("addSearchInput").addEventListener("input", (e) => { addUi.search = e.target.value; el("addSearchClear").hidden = !e.target.value; renderAddTab(); });
  el("addSearchClear").onclick = () => { el("addSearchInput").value = ""; addUi.search = ""; el("addSearchClear").hidden = true; renderAddTab(); };
  el("addFilterBtn").onclick = () => { const p = el("addFilterPanel"); p.hidden = !p.hidden; el("addFilterBtn").classList.toggle("active", !p.hidden); };
  el("addNationSelect").onchange = (e) => { addUi.nation = e.target.value; renderAddTab(); };
  el("fltMissing").onchange = (e) => { addUi.onlyMissing = e.target.checked; renderAddTab(); };
  el("fltDupes").onchange = (e) => { addUi.onlyDupes = e.target.checked; renderAddTab(); };
  el("fltSpecial").onchange = (e) => { addUi.onlySpecial = e.target.checked; renderAddTab(); };
  el("addFilterReset").onclick = () => {
    addUi.nation = "ALL"; addUi.onlyMissing = addUi.onlyDupes = addUi.onlySpecial = false;
    el("addNationSelect").value = "ALL"; el("fltMissing").checked = el("fltDupes").checked = el("fltSpecial").checked = false;
    renderAddTab();
  };
  el("addSections").addEventListener("click", onRowAreaClick);

  /* ---- Modal ---- */
  el("modalCancel").onclick = closeModal;
  el("modalSave").onclick = () => { if (modalSave && modalSave() !== false) closeModal(); };
  el("modal").addEventListener("click", (e) => { if (e.target === el("modal")) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el("modal").hidden) closeModal();
    if (e.key === "Enter" && !el("modal").hidden && e.target.tagName === "INPUT") el("modalSave").click();
    if (e.key === "/" && CURRENT_TAB === "overview" && document.activeElement.tagName !== "INPUT") { e.preventDefault(); el("searchInput").focus(); }
  });

  /* ---- Tabs ---- */
  document.querySelectorAll(".tab-btn").forEach((b) => b.onclick = () => switchTab(b.dataset.tab));

  initTradeTab();
  registerSW();

  renderOverview();
}

document.addEventListener("DOMContentLoaded", init);
