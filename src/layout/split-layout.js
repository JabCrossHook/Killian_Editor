// split-layout.js — มุมมองแยกจอแบบซ้อนได้ (Split View, ข้อ 40)
// pure logic: recursive split tree + drag handle (resize+snap 50%) + store (localStorage/versioning)
// split-ui.js (opencode) เอาไปวาด · ทำงานร่วมกับ Panel System ผ่าน leaf.tabId (อ้างแท็บเดียวกัน)
//
// โหนด (recursive):
//   { type:'leaf',  id, tabId }                                  — pane ที่แสดงแท็บ/เอกสาร 1 ตัว
//   { type:'split', id, dir:'row'|'col', children:[...], sizes:[...] } — แบ่ง row(ซ้าย-ขวา)/col(บน-ล่าง)
// spec: docs/40-split-view.md

let _uid = 0;
const nid = (p = 's') => `${p}${Date.now().toString(36)}${(_uid++).toString(36)}`;

export function leaf(tabId, id = nid('l')) { return { type: 'leaf', id, tabId }; }
export function split(dir, children, sizes, id = nid('sp')) {
  return { type: 'split', id, dir, children, sizes: sizes || even(children.length) };
}
const even = (n) => Array.from({ length: n }, () => +(1 / n).toFixed(4));

// ───────── ท่อง/ค้น ─────────
export function walk(node, fn, parent = null) { fn(node, parent); if (node.children) for (const c of node.children) walk(c, fn, node); }
export function leafIds(root) { const o = []; walk(root, (n) => { if (n.type === 'leaf') o.push(n.id); }); return o; }
export function tabIds(root) { const o = []; walk(root, (n) => { if (n.type === 'leaf') o.push(n.tabId); }); return o; }
function locate(root, id) {
  let res = null;
  walk(root, (n) => { if (n.children) { const i = n.children.findIndex((c) => c.id === id); if (i >= 0) res = { parent: n, index: i }; } });
  return res;
}
export function findLeaf(root, leafId) {
  let f = null; walk(root, (n) => { if (n.type === 'leaf' && n.id === leafId) f = n; }); return f;
}
export function findLeafByTab(root, tabId) {
  let f = null; walk(root, (n) => { if (n.type === 'leaf' && n.tabId === tabId) f = n; }); return f;
}
export function paneCount(root) { return root ? leafIds(root).length : 0; }
// ความลึกของการแบ่ง (root leaf = 0) — ไว้ตรวจว่า recursive split ทำงานจริง
export function splitDepth(node, d = 0) {
  if (!node || !node.children) return d;
  return Math.max(...node.children.map((c) => splitDepth(c, d + 1)));
}

// ───────── โซนปล่อยแท็บ (เหมือน snapZone ของ Panel System) ─────────
// คืน 'left'|'right'|'top'|'bottom'|'center'|null · center = ปล่อยกลาง = แทนที่แท็บใน pane นั้น
export function dropZone(px, py, rect, edge = 0.25) {
  const { x, y, w, h } = rect;
  if (px < x || px > x + w || py < y || py > y + h) return null;
  const rx = (px - x) / w, ry = (py - y) / h;
  const dl = rx, dr = 1 - rx, dt = ry, db = 1 - ry;
  const min = Math.min(dl, dr, dt, db);
  if (min > edge) return 'center';
  if (min === dl) return 'left';
  if (min === dr) return 'right';
  if (min === dt) return 'top';
  return 'bottom';
}

// ───────── split: ลากแท็บไปขอบ pane → แบ่ง (recursive) ─────────
// side: 'left'|'right'|'top'|'bottom' · left/right→row, top/bottom→col
// คืน root ใหม่ (ไม่กลายพันธุ์ของเดิม)
export function splitPane(root, targetLeafId, side, newTabId) {
  root = clone(root);
  const wantRow = side === 'left' || side === 'right';
  const before = side === 'left' || side === 'top';
  const nl = leaf(newTabId);
  const loc = locate(root, targetLeafId);
  const mk = (existing) => split(wantRow ? 'row' : 'col', before ? [nl, existing] : [existing, nl]);

  if (!loc) return mk(root);                        // target คือ root leaf
  const parent = loc.parent;
  if (parent.type === 'split' && parent.dir === (wantRow ? 'row' : 'col')) {
    const at = before ? loc.index : loc.index + 1;  // ทิศเดียวกัน → แทรกพี่น้อง (ไม่ซ้อน split เกิน)
    parent.children.splice(at, 0, nl);
    parent.sizes = even(parent.children.length);
  } else {
    parent.children[loc.index] = mk(parent.children[loc.index]);
  }
  return root;
}

// เปลี่ยนแท็บที่ pane หนึ่งแสดง (ปล่อยกลาง pane)
export function setLeafTab(root, leafId, tabId) {
  root = clone(root);
  const l = findLeaf(root, leafId);
  if (l) l.tabId = tabId;
  return root;
}

// ───────── ลากแท็บที่เปิดอยู่แล้วไปอีก pane ─────────
// ต่างจาก splitPane ตรงที่ถอด pane เดิมของแท็บออกก่อน — กัน tabId เดียวโผล่สอง pane
// side='center' → แทนที่แท็บใน pane ปลายทาง
export function moveTabToPane(root, tabId, targetLeafId, side = 'right') {
  const src = findLeafByTab(root, tabId);
  if (src && src.id === targetLeafId && side !== 'center') return clone(root);  // ลากกลับที่เดิม
  let out = clone(root);
  if (src) {
    out = removeLeaf(out, src.id);
    if (!out) return leaf(tabId);                       // ถอดแล้วไม่เหลืออะไร → เป็น pane เดียว
    if (!findLeaf(out, targetLeafId)) return out;       // pane ปลายทางยุบหายไปพร้อมกัน
  }
  return side === 'center' ? setLeafTab(out, targetLeafId, tabId)
                           : splitPane(out, targetLeafId, side, tabId);
}

// ───────── drag handle: ปรับ ratio + snap 50% ─────────
// snapPx/totalPx ใช้คำนวณ threshold snap (ถ้าใกล้กึ่งกลางในระยะ snap → 0.5); ถ้าไม่ส่งใช้ ±0.03
export function resizeSplit(root, splitId, index, ratio, snapTol = 0.03) {
  root = clone(root);
  let sp = null; walk(root, (n) => { if (n.id === splitId && n.type === 'split') sp = n; });
  if (!sp || index < 0 || index >= sp.sizes.length - 1) return root;
  const pair = sp.sizes[index] + sp.sizes[index + 1];
  let r = Math.max(0.05, Math.min(0.95, ratio));
  if (Math.abs(r - 0.5) <= snapTol) r = 0.5;        // snap to 50%
  sp.sizes[index] = +(pair * r).toFixed(4);
  sp.sizes[index + 1] = +(pair * (1 - r)).toFixed(4);
  return root;
}

// ───────── remove leaf + ยุบ split ที่เหลือลูกเดียว ─────────
// คืน null ถ้า root เองคือ pane ที่ถูกปิด (ไม่เหลือ pane เลย) — ผู้เรียกต้องรับ null ได้
export function removeLeaf(root, leafId) {
  if (!root) return null;
  if (root.type === 'leaf') return root.id === leafId ? null : clone(root);
  root = clone(root);
  const prune = (n) => {
    if (!n.children) return n;
    n.children = n.children.filter((c) => !(c.type === 'leaf' && c.id === leafId)).map(prune)
      .filter((c) => !(c.children && c.children.length === 0));
    if (n.type === 'split') n.sizes = even(n.children.length);
    return n;
  };
  return collapse(prune(root));
}
// ปิดแท็บ (หา pane จาก tabId ให้เอง)
export function closeTab(root, tabId) {
  const l = root && findLeafByTab(root, tabId);
  return l ? removeLeaf(root, l.id) : (root ? clone(root) : null);
}
// ตัด pane ที่อ้างแท็บซึ่งถูกปิดไปแล้ว (ซิงก์กับ Panel System / แท็บเอกสาร)
export function pruneTabs(root, validTabIds) {
  if (!root) return null;
  const ok = new Set(validTabIds);
  let out = clone(root);
  for (const l of leavesOf(out)) if (!ok.has(l.tabId)) { out = removeLeaf(out, l.id); if (!out) return null; }
  return out;
}
function leavesOf(root) {
  const o = []; walk(root, (n) => { if (n.type === 'leaf') o.push(n); }); return o;
}
function collapse(n) {
  if (!n.children) return n;
  n.children = n.children.map(collapse);
  if (n.type === 'split' && n.children.length === 1) return n.children[0];
  return n;
}

// ───────── Layout Store (serialize + version + localStorage) ─────────
export const SPLIT_VERSION = 1;
const KEY = 'k2-split-layout';
function defaultStorage() {
  if (typeof localStorage !== 'undefined') return localStorage;
  const mem = new Map();
  return { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
}
export function serializeSplit(root) { return JSON.stringify({ version: SPLIT_VERSION, root: root ?? null }); }
export function deserializeSplit(str) {
  if (!str) return null;
  let d; try { d = JSON.parse(str); } catch { return null; }
  d = migrate(d);
  if (!d || d.version !== SPLIT_VERSION) return null;
  return d.root ?? null;
}
function migrate(d) {
  if (!d || typeof d !== 'object') return null;
  if (d.version == null) d = { version: 1, root: d.root ?? d };
  return d;
}
export class SplitStore {
  constructor(storage = defaultStorage(), key = KEY) { this.storage = storage; this.key = key; this.root = null; this.listeners = new Set(); }
  load() { const r = deserializeSplit(this.storage.getItem(this.key)); if (r) this.root = r; return !!r; }
  save() { this.storage.setItem(this.key, serializeSplit(this.root)); }
  reset() { this.root = null; this.storage.removeItem(this.key); this._emit(); }
  update(next) { this.root = next; this.save(); this._emit(); }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit() { for (const fn of this.listeners) fn(this.root); }
}

// ────────────────────────────────────────────────────────────────
// SplitManager — API ที่ UI เรียกจริง (จำ pane ที่โฟกัส + บันทึกอัตโนมัติ)
//   const sm = new SplitManager();
//   sm.open('scene-1');                       // pane แรก
//   sm.splitWith('scene-2', 'right');         // ลากแท็บไปขอบขวา → แบ่งจอ
// ────────────────────────────────────────────────────────────────
export class SplitManager {
  constructor({ storage, key, store } = {}) {
    this.store = store || new SplitStore(storage, key);
    this.focusId = null;                       // leaf id ที่กำลังโฟกัส
  }
  get root() { return this.store.root; }
  tabs() { return this.root ? tabIds(this.root) : []; }
  paneCount() { return paneCount(this.root); }
  has(tabId) { return !!(this.root && findLeafByTab(this.root, tabId)); }

  /** Open a tab in the focused pane (creates the first pane when empty). */
  open(tabId) {
    if (!this.root) { this._set(leaf(tabId)); this.focusId = this.root.id; return true; }
    const cur = findLeafByTab(this.root, tabId);
    if (cur) { this.focusId = cur.id; return true; }        // เปิดอยู่แล้ว → แค่ย้ายโฟกัส
    const target = this._focusLeaf();
    this._set(setLeafTab(this.root, target.id, tabId));
    this.focusId = target.id;
    return true;
  }
  /** Drag a tab to a pane edge → split (targetLeafId omitted = focused pane). */
  splitWith(tabId, side = 'right', targetLeafId) {
    if (!this.root) return this.open(tabId);
    const target = (targetLeafId && findLeaf(this.root, targetLeafId)) || this._focusLeaf();
    this._set(this.has(tabId) ? moveTabToPane(this.root, tabId, target.id, side)
                              : splitPane(this.root, target.id, side, tabId));
    const nl = findLeafByTab(this.root, tabId);
    if (nl) this.focusId = nl.id;
    return true;
  }
  /** Move an already-open tab into another pane (side='center' replaces it). */
  moveTab(tabId, targetLeafId, side = 'right') {
    if (!this.root) return false;
    this._set(moveTabToPane(this.root, tabId, targetLeafId, side));
    const nl = this.root && findLeafByTab(this.root, tabId);
    this.focusId = nl ? nl.id : null;
    return true;
  }
  close(tabId) { this._set(closeTab(this.root, tabId)); return true; }
  closePane(leafId) { this._set(removeLeaf(this.root, leafId)); return true; }
  focus(leafId) {
    if (!this.root || !findLeaf(this.root, leafId)) return false;
    this.focusId = leafId; return true;
  }
  activeTabId() { const l = this._focusLeaf(); return l ? l.tabId : null; }
  resize(splitId, index, ratio, snapTol) {
    if (!this.root) return false;
    this._set(resizeSplit(this.root, splitId, index, ratio, snapTol));
    return true;
  }
  /** Drop panes whose tab no longer exists — pass a PanelManager or a list of ids. */
  syncWithPanels(src) {
    const ids = src && typeof src.openIds === 'function' ? src.openIds() : (src || []);
    this._set(pruneTabs(this.root, ids));
    return true;
  }
  load() { const ok = this.store.load(); this._fixFocus(); return ok; }
  save() { this.store.save(); }
  reset() { this.store.reset(); this.focusId = null; }
  onChange(fn) { return this.store.onChange(fn); }

  _set(next) { this.store.update(next || null); this._fixFocus(); }
  _focusLeaf() {
    if (!this.root) return null;
    return (this.focusId && findLeaf(this.root, this.focusId)) || leavesOf(this.root)[0] || null;
  }
  _fixFocus() {                                 // pane ที่โฟกัสอาจถูกยุบไปพร้อมการแก้โครง
    const l = this._focusLeaf();
    this.focusId = l ? l.id : null;
  }
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }
