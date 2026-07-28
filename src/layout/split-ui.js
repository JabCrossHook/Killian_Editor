// split-ui.js — Split View (ข้อ 40): แบ่งพื้นที่แก้ไขเป็น 2 ช่อง ซ้าย-ขวา หรือ บน-ล่าง
// รอบก่อนมีแต่การอัปเดต layout tree ในหน่วยความจำ — ไม่มีอะไรขึ้นจอเลย
// ตอนนี้ต่อกับ DOM จริง (#panes) + เส้นคั่นที่ลากได้ + จำสัดส่วน/ทิศทางไว้
import { $, el, setStatus, state } from '../core.js';
import * as SL from '../layout/split-layout.js';

let store = null;
const LS_KEY = 'k2-split-view';

export function getSplitStore() {
  if (!store) { store = new SL.SplitStore(); store.load(); }
  return store;
}

// ---- สถานะที่จำไว้ (ทิศทาง + สัดส่วน) ----
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch { return {}; }
}
function savePrefs(p) { try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch {} }

export function splitDir() { return loadPrefs().dir === 'down' ? 'down' : 'right'; }
export function splitPos() {
  const v = parseFloat(loadPrefs().pos);
  return isFinite(v) && v > 10 && v < 90 ? v : 50;
}
export function isSplit() { return !!(state.compareFile && $('#panes')?.classList.contains('split')); }

// ---- เลือกแท็บที่จะไปอยู่อีกฝั่ง ----
function pickOther(tabId) {
  const files = [...state.tabs.keys()];
  const cur = tabId || state.active?.file || files[0];
  return files.find((f) => f !== cur) || null;
}

// ---- เส้นคั่นที่ลากได้ ----
function ensureDivider() {
  const panes = $('#panes');
  if (!panes) return null;
  let div = panes.querySelector('.k-split-div');
  if (div) return div;
  div = el('div', 'k-split-div');
  div.title = 'ลากเพื่อปรับสัดส่วน (ดับเบิลคลิก = 50%)';
  div.addEventListener('mousedown', (e) => {
    e.preventDefault();
    div.classList.add('k-dragging');
    const horiz = panes.classList.contains('split-h');
    const move = (ev) => {
      const r = panes.getBoundingClientRect();
      const raw = horiz ? ((ev.clientY - r.top) / r.height) * 100
                        : ((ev.clientX - r.left) / r.width) * 100;
      applyPos(snap(raw));
    };
    const up = () => {
      div.classList.remove('k-dragging');
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      savePrefs({ ...loadPrefs(), pos: splitPosLive() });
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
  div.addEventListener('dblclick', () => { applyPos(50); savePrefs({ ...loadPrefs(), pos: 50 }); });
  panes.append(div);
  return div;
}
// ใกล้ครึ่งจอ → ดูดเข้า 50% (กติกาเดียวกับ resizeSplit ในเอนจิน)
function snap(v) {
  const c = Math.max(15, Math.min(85, v));
  return Math.abs(c - 50) < 3 ? 50 : +c.toFixed(1);
}
function splitPosLive() {
  const raw = ($('#panes')?.style.getPropertyValue('--split-pos') || '50%').replace('%', '');
  return parseFloat(raw) || 50;
}
function applyPos(pct) {
  const panes = $('#panes');
  if (panes) panes.style.setProperty('--split-pos', pct + '%');
}

/** เปิดโหมดแยกหน้าจอ (ไม่สลับ) — dir: 'right' = ซ้าย-ขวา · 'down' = บน-ล่าง */
export function createSplit(tabId, dir) {
  const panes = $('#panes');
  if (!panes) return null;
  if (state.tabs.size < 2) { setStatus('ต้องเปิดอย่างน้อย 2 แท็บจึงจะแยกหน้าจอได้'); return null; }
  const other = state.compareFile && state.tabs.has(state.compareFile)
    ? state.compareFile : pickOther(tabId);
  if (!other) { setStatus('ไม่มีแท็บอื่นให้แสดงคู่กัน'); return null; }

  const d = dir || splitDir();
  state.compareFile = other;
  panes.classList.add('split');
  panes.classList.toggle('split-h', d === 'down');
  applyPos(splitPos());
  ensureDivider();
  syncSplitPanes();
  savePrefs({ ...loadPrefs(), dir: d });

  // ให้เอนจิน layout tree รู้ด้วย (ใช้ตอน persist/ทดสอบ)
  const st = getSplitStore();
  const base = st.root && st.root.type ? st.root : SL.leaf(tabId || state.active?.file || 'main');
  try { st.update(SL.splitPane(base, base.id || SL.leafIds(base)[0], d === 'down' ? 'bottom' : 'right', other)); } catch {}

  setStatus('แยกหน้าจอ: ' + (d === 'down' ? 'บน-ล่าง' : 'ซ้าย-ขวา'));
  return { dir: d, right: other };
}

/** ปิดโหมดแยกหน้าจอ */
export function closeSplit() {
  const panes = $('#panes');
  state.compareFile = null;
  if (panes) {
    panes.classList.remove('split', 'split-h');
    panes.querySelector('.k-split-div')?.remove();
  }
  document.querySelectorAll('.pane').forEach((p) => p.classList.remove('compare-on'));
  document.querySelectorAll('.pane .cmp-close').forEach((b) => b.remove());
  setStatus('ยกเลิกแยกหน้าจอแล้ว');
}

/** สลับเปิด/ปิด — เรียกซ้ำด้วยทิศเดิม = ปิด · ทิศใหม่ = เปลี่ยนแนว */
export function toggleSplit(tabId, dir) {
  if (isSplit()) {
    if (dir && dir !== splitDir()) {          // สลับแนวแทนการปิด
      savePrefs({ ...loadPrefs(), dir });
      $('#panes').classList.toggle('split-h', dir === 'down');
      setStatus('แยกหน้าจอ: ' + (dir === 'down' ? 'บน-ล่าง' : 'ซ้าย-ขวา'));
      return true;
    }
    closeSplit();
    return false;
  }
  return !!createSplit(tabId, dir);
}

/** เรียกหลัง activate()/ปิดแท็บ เพื่อคง pane ฝั่งที่สองไว้ */
export function syncSplitPanes() {
  const panes = $('#panes');
  if (!panes || !panes.classList.contains('split')) return;
  const rt = state.compareFile && state.tabs.get(state.compareFile);
  if (!rt || state.compareFile === state.active?.file) { closeSplit(); return; }
  document.querySelectorAll('.pane').forEach((p) => p.classList.remove('compare-on'));
  rt.pane.classList.add('compare-on');
  if (!rt.pane.querySelector('.cmp-close')) {
    const cb = el('div', 'cmp-close', '✕ ปิดแยกจอ');
    cb.onclick = () => closeSplit();
    rt.pane.append(cb);
  }
  ensureDivider();
  applyPos(splitPosLive() || splitPos());
}

// ---- helpers เดิม (ยังใช้ในเทส/โมดูลอื่น) ----
export function getSplitLayout() { return store ? store.root : null; }
export function resetSplit() { closeSplit(); if (store) { store.reset(); store = null; } }
export function getLeaves() {
  if (!store || !store.root) return [];
  return SL.leafIds(store.root).map((id) => SL.findLeaf(store.root, id));
}
export function setLeafTab(leafId, tabId) {
  if (!store || !store.root) return;
  store.update(SL.setLeafTab(store.root, leafId, tabId));
}
export function resetSplitSystem() { store = null; }
