// panel-ui.js — Panel System แบบ Photoshop: ทุกพื้นที่ของหน้าต่างคือ "แผง" ที่ dock/tab/float ได้
// เขียนใหม่ทั้งไฟล์ (alpha.46) — แทนที่ระบบแผงลอยเดิมใน app.js (makeFloatablePanel/PANELS)
//
//   initPanelSystem()  → ลงทะเบียนแผงทั้งหมด · กู้เลย์เอาต์ · วาดลง #app-root · auto-save
//   showPanel(id) / hidePanel(id) / togglePanel(id) / resetPanels()
//   addPanelButton(id, el)  → ฝากปุ่มพิเศษไว้บนหัวแผง (โมดูลอื่นเรียก · element เดิมถูกใช้ซ้ำทุก render)
//
// เนื้อแผงคือ element เดิมใน index.html (#tree-panel, #content, …) — "ย้ายเข้า" host เท่านั้น ห้ามสร้างใหม่
// เพราะโค้ดทั้งโปรเจกต์อ้าง id เหล่านี้ ($('#panes'), $('#tabs'), $('#props-body'), …)
import { $, el, setStatus, t, onLanguageChanged } from '../core.js';
import { popupMenu } from '../ui.js';
import * as PL from './panel-layout.js';
import { PanelManager } from './panel-store.js';
import { renderPanelLayout } from './panel-renderer.js';

const HOST_ID = 'app-root';
const SRC_ID = 'k-panel-src';                 // ที่พักของเนื้อแผงที่ยังไม่ถูกวาง (ซ่อนอยู่)

// ชื่อแผงที่โค้ด/เมนูเก่าใช้ → id ใหม่
const ALIAS = {
  'tree-panel': 'tree', explorer: 'tree',
  'props-panel': 'props', properties: 'props',
  'outline-panel': 'outline', navigation: 'outline',
  'content': 'docs', panes: 'docs',
};
export const panelId = (id) => ALIAS[id] || id;

// ทะเบียนหน้าตาของแผง (registry ของ PanelManager เก็บแค่บางฟิลด์ จึงแยกเก็บที่นี่)
export const PANEL_DEFS = [
  { id: 'toolbar',   title: 'แถบเครื่องมือ', icon: 'layout',       adopt: '#toolbar',       fixed: true, noHead: true, closable: false, floatable: false },
  { id: 'tree',      title: 'โปรเจกต์',      icon: 'book-content', adopt: '#tree-panel',    defaultSide: 'left',  i18n: 'panel.project' },
  { id: 'outline',   title: 'Navigation',    icon: 'list-ul',      adopt: '#outline-panel', defaultSide: 'left',  i18n: 'panel.navigation' },
  // แผงเอกสารไม่มีหัวแผง (พื้นที่ทำงานหลัก — แถบแท็บเอกสาร #tabs ทำหน้าที่นั้นอยู่แล้ว)
  { id: 'docs',      title: 'เอกสาร',         icon: 'file',         adopt: '#content',       noHead: true, closable: false, floatable: false },
  { id: 'props',     title: 'คุณสมบัติ',      icon: 'clipboard',    adopt: '#props-panel',   defaultSide: 'right', i18n: 'panel.properties' },
  { id: 'statusbar', title: 'แถบสถานะ',      icon: 'grid',         adopt: '#statusbar',     fixed: true, noHead: true, closable: false, floatable: false },
  { id: 'log',       title: 'บันทึก',         icon: 'history',      adopt: '#log-panel',     defaultSide: 'right', closable: true, floatable: true, i18n: 'panel.logTitle' },
  { id: 'search',    title: 'ค้นหา',          icon: 'search',       adopt: '#search-panel',  defaultSide: 'left',  closable: true, floatable: true, i18n: 'panel.searchTitle' },
  { id: 'notes',     title: 'สมุดโน้ตด่วน',    icon: 'note',         adopt: '#notes-panel',   defaultSide: 'right', closable: true, floatable: true, i18n: 'panel.notesTitle' },
  { id: 'comments',  title: 'คอมเมนต์',        icon: 'chat',         adopt: '#comments-panel', defaultSide: 'right', closable: true, floatable: true, i18n: 'panel.commentsTitle' },
  // ── บั๊ก #18: ฟีเจอร์ที่ไม่ใช่เอกสาร เป็นแผง ไม่ใช่แท็บ ──
  { id: 'dashboard', title: 'แดชบอร์ด',        icon: 'grid',         adopt: '#dash-panel',    defaultSide: 'left',  closable: true, floatable: true, i18n: 'panel.dashboardTitle' },
  { id: 'kanban',    title: 'Kanban',          icon: 'grid',         adopt: '#kanban-panel',  defaultSide: 'left',  closable: true, floatable: true, i18n: 'panel.kanbanTitle' },
  { id: 'books',     title: 'จัดการเล่ม',       icon: 'book-content', adopt: '#books-panel',   defaultSide: 'left',  closable: true, floatable: true, i18n: 'panel.booksTitle' },
  { id: 'timeline',  title: 'เส้นเวลา',         icon: 'history',      adopt: '#tl-panel',      defaultSide: 'left',  closable: true, floatable: true, i18n: 'panel.timelineTitle' },
  { id: 'maps',      title: 'แผนที่',           icon: 'layout',       adopt: '#maps-panel',    defaultSide: 'left',  closable: true, floatable: true, i18n: 'panel.mapsTitle' },
  // [alpha.60r1 ข้อ 21] คลังรูปภาพ — ย้ายจากแท็บเอกสารมาเป็นแผงเหมือนฟีเจอร์อื่น
  { id: 'gallery',   title: 'คลังรูปภาพ',       icon: 'image',        adopt: '#gal-panel',     defaultSide: 'left',  closable: true, floatable: true, i18n: 'panel.galleryTitle' },
];
// ชื่อแผงตามภาษาที่โหลดอยู่ (fallback = ชื่อไทยในตาราง) — เรียกใหม่ทุกครั้งที่ render
function titleOf(d) { return d.i18n ? t(d.i18n, d.title) : d.title; }

let pm = null;
let started = false;
let lastSig = '';                              // ลายเซ็นเลย์เอาต์ที่วาดไปแล้ว (กัน re-render ซ้ำ)
const adopted = new Map();                     // id → element เดิมใน index.html
const extras = new Map();                      // id → [ปุ่มพิเศษบนหัวแผง]
const meta = new Map();                        // id → {title, icon, fixed, noHead}

// ───────── singleton ─────────
export function getPanelManager() {
  if (!pm) pm = new PanelManager();
  return pm;
}
export function loadPanelLayout() { return getPanelManager().load(); }
export function savePanelLayout() { if (pm) pm.store.save(); }

function host() {
  return document.getElementById(HOST_ID) || document.body;
}
function srcHolder() {
  let h = document.getElementById(SRC_ID);
  if (!h) { h = el('div'); h.id = SRC_ID; h.hidden = true; document.body.appendChild(h); }
  return h;
}

// ───────── ลงทะเบียนแผงทั้งหมด ─────────
export function registerPanels() {
  const m = getPanelManager();
  for (const d of PANEL_DEFS) {
    meta.set(d.id, { title: d.title, icon: d.icon, fixed: !!d.fixed, noHead: !!d.noHead });
    const node = d.adopt ? $(d.adopt) : null;
    if (node) adopted.set(d.id, node);
    m.registerPanel(d.id, {
      title: d.title,
      icon: d.icon,
      closable: d.closable !== false,
      floatable: d.floatable !== false,
      defaultSide: d.defaultSide || 'left',
      render: (h) => { const n = adopted.get(d.id); if (n) h.appendChild(n); return n; },
    });
  }
  return m;
}

// เลย์เอาต์ตั้งต้น (Photoshop): เครื่องมือบน · ซ้าย = โปรเจกต์+Navigation เป็นแท็บ · กลาง = เอกสาร · ล่าง = สถานะ
export function defaultLayout() {
  return PL.dock('col', [
    PL.panel('toolbar', 'แถบเครื่องมือ'),
    PL.dock('row', [
      PL.tabs([PL.panel('tree', 'โปรเจกต์'), PL.panel('outline', 'Navigation')], 0),
      PL.panel('docs', 'เอกสาร'),
    ], [0.24, 0.76]),
    PL.panel('statusbar', 'แถบสถานะ'),
  ], [0, 1, 0]);
}

// ───────── วาด ─────────
function renderOpts() {
  for (const d of PANEL_DEFS) {                 // รีเฟรชชื่อตามภาษาปัจจุบัน
    const m = meta.get(d.id) || {};
    meta.set(d.id, { ...m, title: titleOf(d) });
  }
  return {
    meta,
    host: host(),
    headExtras: (id) => extras.get(id) || [],
    renderPanelBody: (id, body) => {
      const node = adopted.get(id);
      if (node) { body.appendChild(node); return node; }
      const def = pm && pm.registry.get(id);
      if (def && def.render) return def.render(body);
      return body;
    },
  };
}

/** วาดใหม่ทั้งต้นไม้ (ข้ามถ้าเลย์เอาต์ไม่เปลี่ยน — กัน ProseMirror ถูกถอด-ใส่โดยไม่จำเป็น) */
// แผงเอกสารต้อง "เห็นเสมอ" — ถ้ามันไปอยู่ในกลุ่มแท็บแล้วไม่ใช่แท็บที่ active
// พื้นที่เขียนทั้งหมด (#tabs/#panes) จะถูกซ่อน ดูเหมือนโปรแกรมพัง (เจอตอน e2e alpha.56)
let _fixingDocs = false;
function ensureDocsVisible() {
  if (_fixingDocs || !pm || !pm.store.root) return;
  const grp = PL.tabGroupOf(pm.store.root, 'docs');
  if (!grp) return;
  const i = grp.children.findIndex((c) => c.id === 'docs');
  if (i < 0 || grp.active === i) return;
  _fixingDocs = true;
  try { pm.store.update(PL.activatePanel(pm.store.root, 'docs')); } finally { _fixingDocs = false; }
}

// 0.56a #3: วาดต้นไม้ใหม่ = ย้าย #content/#tree ออกจาก DOM แล้วใส่กลับ → ตำแหน่งเลื่อนถูกล้างเป็น 0
// ผู้ใช้เลื่อนหน้ากระดาษอยู่ดี ๆ พอขยับแผงทีก็เด้งกลับซ้ายบนทุกครั้ง
// → จำตำแหน่งเลื่อนของทุกกล่องที่เลื่อนได้ก่อนวาด แล้วคืนหลังวาด (ทั้งทันทีและหลัง layout รอบถัดไป)
const SCROLLABLES = '.pane, #tree, #outline, #props-body, .k-panel-body, .k-tab-content, .home-dlg-scroll';
function captureScroll() {
  const out = [];
  for (const e of document.querySelectorAll(SCROLLABLES)) {
    if (e.scrollTop || e.scrollLeft) out.push([e, e.scrollTop, e.scrollLeft]);
  }
  return out;
}
function restoreScroll(saved) {
  const put = () => { for (const [e, top, left] of saved) {
    if (!e.isConnected) continue;
    if (top && e.scrollTop !== top) e.scrollTop = top;
    if (left && e.scrollLeft !== left) e.scrollLeft = left;
  } };
  put();
  requestAnimationFrame(put);        // เผื่อ layout ยังไม่เสร็จตอนใส่กลับ (scrollHeight ยังเป็น 0)
}

export function renderPanels(force) {
  if (!pm) return;
  ensureDocsVisible();
  const sig = JSON.stringify({ r: pm.store.root, f: pm.store.floats });
  if (!force && sig === lastSig) return;
  lastSig = sig;
  const saved = captureScroll();
  renderPanelLayout(host(), pm, renderOpts());
  restoreScroll(saved);
  // เนื้อแผงที่ไม่ได้ถูกวาง → เก็บกลับที่พัก (ต้องอยู่ใน DOM เสมอ ไม่งั้น $('#props-body') คืน null)
  const h = host(), holder = srcHolder();
  for (const [, node] of adopted) if (!h.contains(node)) holder.appendChild(node);
  if (_onLayoutChange) _onLayoutChange();
}

// alpha.50: เลิก chip ▣ มุมจอ → ปุ่ม .tb-toggle บน toolbar แทน
// hook นี้ให้ app.js สั่ง refreshToolbar() ทุกครั้งที่เลย์เอาต์แผงเปลี่ยน (ปุ่มจะได้ sync เอง)
let _onLayoutChange = null;
export function onPanelLayoutChange(fn) { _onLayoutChange = fn; }

// ───────── ถาดแผงที่ปิดไว้ — ปิดแผงแล้วต้อง "เห็นทางกลับ" เสมอ (บทเรียนข้อ 20) ─────────
// บั๊ก #17: มีถาดเดียวปักซ้ายตายตัว → ปิดแผงฝั่งขวา (คุณสมบัติ) แล้ว chip ไปโผล่มุมซ้ายล่าง
// ตอนนี้แยกซ้าย/ขวา แล้วเลือกถาดจาก "ฝั่งที่แผงอยู่ตอนถูกปิดจริง" (ไม่ใช่ defaultSide อย่างเดียว)
const lastSide = new Map();                    // id → 'left' | 'right' (จำจากตำแหน่งจริงบนจอ)

/** จดฝั่งของแผงที่ยังเปิดอยู่ — เรียกทุกครั้งหลังวาด ก่อนที่แผงจะถูกปิดแล้วหาตำแหน่งไม่ได้ */
function rememberSides() {
  const h = host();
  const hr = h.getBoundingClientRect();
  if (!hr.width) return;
  for (const d of PANEL_DEFS) {
    if (d.closable === false) continue;
    const node = h.querySelector(`.k-panel[data-panel-id="${d.id}"]`)
      || document.querySelector(`.k-float-panel[data-panel-id="${d.id}"]`);
    if (!node) continue;
    const r = node.getBoundingClientRect();
    if (!r.width) continue;                    // ซ่อนอยู่หลังแท็บอื่น → เก็บค่าเดิมไว้
    lastSide.set(d.id, r.left + r.width / 2 < hr.left + hr.width / 2 ? 'left' : 'right');
  }
}
function sideOf(d) { return lastSide.get(d.id) || d.defaultSide || 'left'; }

function trayEl(side) {
  const id = side === 'right' ? 'k-min-tray-r' : 'k-min-tray-l';
  let tray = document.getElementById(id);
  if (!tray) { tray = el('div', 'k-min-tray'); tray.id = id; document.body.appendChild(tray); }
  return tray;
}

function syncMinTray() {
  rememberSides();
  const closed = PANEL_DEFS.filter((d) => d.closable !== false && !pm.isOpen(d.id));
  const want = new Map(closed.map((d) => [d.id, sideOf(d)]));
  for (const side of ['left', 'right']) {
    const tray = trayEl(side);
    // chip ที่ไม่ควรอยู่ถาดนี้แล้ว (เปิดแผงกลับ หรือย้ายไปอีกฝั่ง) → เอาออก
    for (const chip of [...tray.children]) if (want.get(chip.dataset.key) !== side) chip.remove();
    for (const d of closed) {
      if (want.get(d.id) !== side) continue;
      if (tray.querySelector(`[data-key="${d.id}"]`)) continue;
      const chip = el('div', 'k-min-chip', '▣ ' + titleOf(d));
      chip.dataset.key = d.id;
      chip.title = t('panel.trayRestorePre', 'คลิกเพื่อเรียกแผง "') + titleOf(d) + t('panel.trayRestorePost', '" กลับมา');
      chip.onclick = () => showPanel(d.id, { side: sideOf(d) });   // กลับไปฝั่งเดิมที่เคยอยู่
      tray.appendChild(chip);
    }
    tray.classList.toggle('on', !!tray.children.length);
  }
}

// ───────── เริ่มระบบ ─────────
export function initPanelSystem() {
  const m = getPanelManager();
  if (started) { renderPanels(true); return m; }
  started = true;
  registerPanels();
  srcHolder();
  loadHomes();                                  // บั๊ก #4: ตำแหน่งเดิมของแผงที่ปิดไว้ (ข้ามการเปิด-ปิดโปรแกรม)
  m.load();                                     // กู้เลย์เอาต์ + ตัดแผงที่ไม่รู้จักทิ้ง
  // บั๊ก #19: เดิม "ไม่มี docs" → ล้างทั้งต้นไม้เป็นค่าตั้งต้น = แผงที่ผู้ใช้ปิดไว้โผล่กลับมาทั้งชุด
  // ตอนนี้เสียบแผงเอกสารคืนเข้าเลย์เอาต์เดิมแทน · รีเซ็ตจริงเฉพาะตอนไม่มีเลย์เอาต์เลย (เปิดครั้งแรก)
  if (!m.store.root) m.store.update(defaultLayout());
  else if (!PL.hasPanel(m.store.root, 'docs')) {
    const anchor = PL.panelIds(m.store.root)[0];
    m.store.update(PL.dockPanel(m.store.root, anchor, 'right', PL.panel('docs', 'เอกสาร')));
  }
  m.store.onChange(() => { savePanelLayout(); renderPanels(); });
  onLanguageChanged(() => renderPanels(true));  // เปลี่ยนภาษา → ชื่อแผงเปลี่ยนตาม
  renderPanels(true);
  return m;
}

// ───────── คำสั่งที่ app.js/เมนูเรียก ─────────
export function isPanelOpen(id) { return !!pm && pm.isOpen(panelId(id)); }

// บั๊ก #18: แผงฟีเจอร์ (แดชบอร์ด/Kanban/…) ต้องวาดเนื้อหาทุกครั้งที่ถูกเปิด
// app.js ฝากฟังก์ชันวาดไว้ที่นี่ → ครอบคลุมทุกทางเข้า (เมนู · ถาดแผงที่ปิดไว้ · คำสั่ง)
let onShowHook = null;
export function setPanelShowHook(fn) { onShowHook = fn; }

// บั๊ก #4: ปิดแผงแล้วเปิดกลับต้องได้ "ที่เดิม" — จำบริบทตอนปิด (ผนึกข้างไหนของแผงไหน / ลอยอยู่ที่พิกัดใด)
// เก็บลง localStorage ด้วย เพื่อให้ข้ามการเปิด-ปิดโปรแกรมได้เหมือน layout tree
const HOME_KEY = 'k2-panel-home';
const homes = new Map();                       // id → {side,targetId} | {float:{x,y,w,h}}
function loadHomes() {
  try {
    const o = JSON.parse(localStorage.getItem(HOME_KEY) || '{}');
    for (const k of Object.keys(o)) homes.set(k, o[k]);
  } catch {}
}
function saveHomes() {
  try { localStorage.setItem(HOME_KEY, JSON.stringify(Object.fromEntries(homes))); } catch {}
}
/** จดตำแหน่งปัจจุบันของแผงไว้ก่อนปิด */
function rememberHome(pid) {
  const m = getPanelManager();
  const f = (m.floats || []).find((x) => x.panel.id === pid);
  if (f) { homes.set(pid, { float: { x: f.x, y: f.y, w: f.w, h: f.h } }); saveHomes(); return; }
  if (!m.isDocked(pid)) return;
  // อยู่ในกลุ่มแท็บ → จำว่า "เป็นแท็บร่วมกับใคร" เพื่อกลับเข้ากลุ่มเดิม ไม่ใช่แยกออกมาเป็นช่องใหม่
  const grp = PL.tabGroupOf(m.root, pid);
  if (grp && (grp.children || []).length > 1) {
    const other = grp.children.find((c) => c.id !== pid);
    if (other) { homes.set(pid, { targetId: other.id, side: 'center' }); saveHomes(); return; }
  }
  // แถบเครื่องมือ/แถบสถานะกินเต็มความกว้าง → ใช้เป็นจุดอ้างอิงไม่ได้ (ตัดออกก่อน)
  const sib = PL.panelIds(m.root).filter((x) => x !== pid && !(meta.get(x) || {}).fixed);
  const node = document.querySelector(`#${HOST_ID} .k-panel[data-panel-id="${pid}"]`);
  const r = node && node.getBoundingClientRect();
  // เพื่อนบ้านที่ใกล้ที่สุด = จุดยึดตอนเรียกกลับ
  let best = null;
  if (r && r.width) {
    for (const s of sib) {
      const n2 = document.querySelector(`#${HOST_ID} .k-panel[data-panel-id="${s}"]`);
      const r2 = n2 && n2.getBoundingClientRect();
      if (!r2 || !r2.width) continue;
      const d = Math.hypot(r2.left - r.left, r2.top - r.top);
      if (!best || d < best.d) best = { d, id: s, side: r2.left < r.left ? 'right' : 'left' };
    }
  }
  homes.set(pid, { targetId: best ? best.id : 'docs', side: best ? best.side : sideOf({ id: pid }),
                   ratio: currentRatio(pid) });
  saveHomes();
}

// ───────── [alpha.60r1 · ข้อ 22] จำ "สัดส่วน" ของแผง ไม่ใช่แค่ตำแหน่ง ─────────
// เลย์เอาต์ที่ผนึกอยู่เก็บ sizes ไว้ในต้นไม้แล้ว (serializeLayout เก็บทั้ง root)
// แต่แผงที่ "ปิดแล้วเปิดใหม่" จะถูกยัดกลับเข้า dock ด้วยสัดส่วนเฉลี่ยเสมอ
// → ผู้ใช้ที่ย่อแผงโปรเจกต์ให้แคบไว้ ต้องมาลากใหม่ทุกครั้งที่ปิด-เปิด

/** สัดส่วนของแผงเทียบพี่น้องใน dock เดียวกัน (วัดจาก DOM · 0 = วัดไม่ได้) */
function currentRatio(pid) {
  const node = document.querySelector(`#${HOST_ID} .k-panel[data-panel-id="${pid}"]`);
  const dockEl = node && node.closest('.k-dock');
  if (!node || !dockEl) return 0;
  const row = dockEl.dataset.dir === 'row';
  const r = node.getBoundingClientRect(), dr = dockEl.getBoundingClientRect();
  const total = row ? dr.width : dr.height;
  const mine = row ? r.width : r.height;
  if (!(total > 0) || !(mine > 0)) return 0;
  return Math.max(0.05, Math.min(0.95, mine / total));
}

/** ตั้งสัดส่วนของแผงใน dock แม่ให้เท่ากับ ratio (พี่น้องแบ่งส่วนที่เหลือตามอัตราเดิม) */
function applyRatio(pid, ratio) {
  const m = getPanelManager();
  if (!m.root || !(ratio > 0) || !(ratio < 1)) return false;
  const next = JSON.parse(JSON.stringify(m.root));
  let hit = null;
  PL.walk(next, (n) => {
    if (hit || n.type !== 'dock') return;
    const i = (n.children || []).findIndex((c) => c.type === 'panel' && c.id === pid);
    if (i >= 0 && n.children.length > 1) hit = { node: n, index: i };
  });
  if (!hit) return false;
  const { node, index } = hit;
  const n = node.children.length;
  const sizes = PL.normalizeSizes(
    node.sizes && node.sizes.length === n ? node.sizes : new Array(n).fill(1 / n));
  const restOld = sizes.reduce((a, v, i) => (i === index ? a : a + v), 0);
  const rest = 1 - ratio;
  node.sizes = sizes.map((v, i) => (i === index ? ratio : (restOld > 0 ? v / restOld * rest : rest / (n - 1))));
  m.store.update(next);
  return true;
}

export function showPanel(id, opts = {}) {
  const m = getPanelManager();
  const pid = panelId(id);
  const def = m.registry.get(pid) || {};
  let ok;
  if (m.isDocked(pid) && !m.isCollapsed(pid)) { m.activatePanel(pid); ok = true; }
  else if (m.isCollapsed(pid)) { m.collapsePanel(pid, false); ok = true; }
  else {
    const home = homes.get(pid);
    // แผงที่เคยลอยอยู่ → กลับไปลอยที่เดิม (บั๊ก #4)
    if (!opts.side && !opts.targetId && home && home.float) {
      ok = m.floatPanel(pid, home.float);
    } else {
      // เป้าหมายผนึกเริ่มต้น = ที่เดิมที่จดไว้ · ไม่มีก็ยึดแผงเอกสาร
      // (ไม่งั้น _target() หยิบ panel ตัวแรก = แถบเครื่องมือ)
      const o = { ...opts };
      if (!o.targetId) o.targetId = (home && home.targetId) || 'docs';
      if (!o.side && home && home.side) o.side = home.side;
      if (!m.isDocked(o.targetId)) o.targetId = m.isDocked('docs') ? 'docs' : undefined;
      // ห้ามรวมแผงอื่นเป็นแท็บเดียวกับ "แผงเอกสาร" — จะบังพื้นที่เขียนทั้งหมด
      if (o.side === 'center' && o.targetId === 'docs') o.side = def.defaultSide || 'right';
      // ผนึกซ้าย/ขวาเทียบแผงที่อยู่ในกลุ่มแท็บ = ยัด dock ซ้อนในกลุ่มแท็บ (โครงเพี้ยน) → ยึดแผงเอกสารแทน
      if (o.side !== 'center' && PL.tabGroupOf(m.root, o.targetId) && m.isDocked('docs')) o.targetId = 'docs';
      ok = m.showPanel(pid, o);
      // [ข้อ 22] คืนสัดส่วนที่ผู้ใช้เคยลากไว้ ไม่ใช่แบ่งเท่ากันใหม่ทุกครั้ง
      if (ok && home && home.ratio > 0) { try { applyRatio(pid, home.ratio); } catch {} }
    }
  }
  if (ok && onShowHook) { try { onShowHook(pid); } catch {} }
  return ok;
}
export function hidePanel(id) {
  const pid = panelId(id);
  rememberHome(pid);
  return getPanelManager().hidePanel(pid);
}
// บั๊ก #2 + #10: ปุ่มสวิตช์บนแถบเครื่องมือต้อง "ปิดแผง" ไม่ใช่ "พับ/ย่อ"
// (เดิม togglePanel เรียก collapsePanel → กด Kanban ซ้ำแล้วเหลือแถบหัวแผงเปล่า ๆ ดูเหมือนปิดไม่ได้)
// การพับยังใช้ได้ที่ปุ่ม ▾ บนหัวแผงเหมือนเดิม
export function togglePanel(id, opts) {
  const m = getPanelManager();
  const pid = panelId(id);
  if (m.isOpen(pid)) return hidePanel(pid);
  return showPanel(pid, opts);
}
export function resetPanels() {
  const m = getPanelManager();
  resetPanelHomes();                    // รีเซ็ตทั้งหมด = ลืม "ที่เดิม" ของแผงที่เคยปิดด้วย
  m.store.reset();
  m.store.update(defaultLayout());
  renderPanels(true);
  setStatus(t('panel.layoutReset', 'รีเซ็ตการจัดวางแผงแล้ว'));
  return true;
}
/** รายการแผงสำหรับเมนู "มุมมอง → แผง" */
export function panelMenuItems() {
  const m = getPanelManager();
  return PANEL_DEFS.filter((d) => d.closable !== false).map((d) => ({
    label: (m.isOpen(d.id) ? '☑ ' : '☐ ') + titleOf(d),
    click: () => togglePanel(d.id),
  }));
}
/** สถานะเปิด/ปิดของทุกแผง (ส่งให้เมนู native ติ๊กถูก) */
export function panelToggleState() {
  const m = getPanelManager();
  const o = {};
  for (const d of PANEL_DEFS) o[d.id] = m.isOpen(d.id);
  return o;
}

/** ฝากปุ่มพิเศษไว้บนหัวแผง — element เดิมถูกนำกลับมาใช้ทุกรอบ render (onclick จึงไม่หาย) */
export function addPanelButton(id, node) {
  const pid = panelId(id);
  const list = extras.get(pid) || [];
  if (!list.includes(node)) list.push(node);
  extras.set(pid, list);
  renderPanels(true);
  return node;
}

// ───────── กล่อง "จัดการแผง" (ปุ่ม 📐 บน toolbar / เมนู) ─────────
export async function togglePanelDialog() {
  const items = panelMenuItems();
  items.push('-');
  items.push({ label: t('panel.resetAll', '⟲ รีเซ็ตการจัดวางแผงทั้งหมด'), click: () => resetPanels() });
  try {
    // popupMenu อยู่ที่ ui.js — app.js แค่ import มาใช้ ไม่ได้ export ต่อ
    // (เดิม `import('../app.js')` จึงได้ undefined ทุกครั้ง → ตกไป fallback ตลอดกาล)
    const btn = $('#tb-panels');
    const r = btn ? btn.getBoundingClientRect() : { left: 40, bottom: 60 };
    if (typeof popupMenu !== 'function') throw new Error('no popupMenu');
    popupMenu(r.left, r.bottom + 4, items);
  } catch {
    const ov = el('div', 'k-overlay');
    const box = el('div', 'k-dialog');
    box.append(el('div', 'k-dlg-title', t('panel.manage', '📐 จัดการแผง')));
    for (const it of items) {
      if (it === '-') { box.append(el('hr')); continue; }
      const row = el('div', 'k-menu-item', it.label);
      row.onclick = () => { it.click(); ov.remove(); };
      box.append(row);
    }
    const closeBtn = el('button', 'k-cancel', 'ปิด');
    closeBtn.onclick = () => ov.remove();
    const btns = el('div', 'k-dlg-btns'); btns.append(closeBtn);
    box.append(btns); ov.append(box); document.body.append(ov);
    ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  }
}

// ───────── cleanup (เปลี่ยนโปรเจกต์) ─────────
export function resetPanelSystem() { lastSig = ''; resetPanelHomes(); }
/** ลืมตำแหน่งเดิมของแผงที่ถูกปิดไว้ (ทั้งในหน่วยความจำและใน localStorage) */
export function resetPanelHomes() {
  homes.clear();
  try { localStorage.removeItem(HOME_KEY); } catch {}
}
