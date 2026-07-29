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
  { id: 'home',      title: 'หน้าแรก',         icon: 'home',         adopt: '#home-panel',    defaultSide: 'left',  closable: true, floatable: true, i18n: 'panel.homeTitle' },
  { id: 'comments',  title: 'คอมเมนต์',        icon: 'chat',         adopt: '#comments-panel', defaultSide: 'right', closable: true, floatable: true, i18n: 'panel.commentsTitle' },
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
export function renderPanels(force) {
  if (!pm) return;
  const sig = JSON.stringify({ r: pm.store.root, f: pm.store.floats });
  if (!force && sig === lastSig) return;
  lastSig = sig;
  renderPanelLayout(host(), pm, renderOpts());
  // เนื้อแผงที่ไม่ได้ถูกวาง → เก็บกลับที่พัก (ต้องอยู่ใน DOM เสมอ ไม่งั้น $('#props-body') คืน null)
  const h = host(), holder = srcHolder();
  for (const [, node] of adopted) if (!h.contains(node)) holder.appendChild(node);
  syncMinTray();
}

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
      chip.title = 'คลิกเพื่อเรียกแผง "' + titleOf(d) + '" กลับมา';
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
export function showPanel(id, opts = {}) {
  const m = getPanelManager();
  const pid = panelId(id);
  if (m.isDocked(pid) && !m.isCollapsed(pid)) { m.activatePanel(pid); return true; }
  // เป้าหมายผนึกเริ่มต้น = แผงเอกสาร (ไม่งั้น _target() หยิบ panel ตัวแรก = แถบเครื่องมือ)
  const o = { ...opts };
  if (!o.targetId && m.isDocked('docs') && pid !== 'docs') o.targetId = 'docs';
  return m.showPanel(pid, o);
}
export function hidePanel(id) { return getPanelManager().hidePanel(panelId(id)); }
export function togglePanel(id, opts) {
  const m = getPanelManager();
  const pid = panelId(id);
  return m.isOpen(pid) ? m.hidePanel(pid) : showPanel(pid, opts);
}
export function resetPanels() {
  const m = getPanelManager();
  m.store.reset();
  m.store.update(defaultLayout());
  renderPanels(true);
  setStatus('รีเซ็ตการจัดวางแผงแล้ว');
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
  items.push({ label: '⟲ รีเซ็ตการจัดวางแผงทั้งหมด', click: () => resetPanels() });
  try {
    const { popupMenu } = await import('../app.js');
    const btn = $('#tb-panels');
    const r = btn ? btn.getBoundingClientRect() : { left: 40, bottom: 60 };
    popupMenu(r.left, r.bottom + 4, items);
  } catch {
    const ov = el('div', 'k-overlay');
    const box = el('div', 'k-dialog');
    box.append(el('div', 'k-dlg-title', '📐 จัดการแผง'));
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
export function resetPanelSystem() { lastSig = ''; }
