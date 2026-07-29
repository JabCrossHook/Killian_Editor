// panel-store.js — บันทึก/โหลด layout ของ panel + จัดการเวอร์ชัน schema + state (ข้อ 8)
// รับ storage adapter เข้ามา (default = localStorage) → ทดสอบด้วย mock ได้โดยไม่ต้องมี browser
// + PanelManager = API ระดับสูงที่ UI เรียก (registerPanel/showPanel/dockPanel/floatPanel/groupPanels)
// spec: docs/08-panel-system.md
import * as PL from './panel-layout.js';

export const LAYOUT_VERSION = 1;
const KEY = 'k2-panel-layout';

// storage เริ่มต้น: ใช้ localStorage ถ้ามี, ไม่งั้น in-memory (เช่นตอนรัน node test)
function defaultStorage() {
  if (typeof localStorage !== 'undefined') return localStorage;
  const mem = new Map();
  return { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
}

// ── serialize / deserialize (+ migration) ──
export function serializeLayout(state) {
  return JSON.stringify({ version: LAYOUT_VERSION, root: state.root ?? null, floats: state.floats ?? [] });
}
export function deserializeLayout(str) {
  if (!str) return null;
  let data;
  try { data = JSON.parse(str); } catch { return null; }
  data = migrate(data);
  if (!data || data.version !== LAYOUT_VERSION) return null;
  return { root: data.root ?? null, floats: data.floats ?? [] };
}
// อัปเกรด schema เก่า → ปัจจุบัน (เพิ่ม case เมื่อ bump LAYOUT_VERSION)
function migrate(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.version == null) {           // v0: เก็บ root เปล่า ๆ ไม่มี floats
    data = { version: 1, root: data.root ?? data, floats: [] };
  }
  // if (data.version === 1) { ...ย้ายไป v2... ; data.version = 2; }
  return data;
}

// ── state management ──
export class PanelStore {
  constructor(storage = defaultStorage(), key = KEY) {
    this.storage = storage; this.key = key;
    this.root = null; this.floats = [];
    this.listeners = new Set();
  }
  load() {
    const parsed = deserializeLayout(this.storage.getItem(this.key));
    if (parsed) { this.root = parsed.root; this.floats = parsed.floats; }
    return !!parsed;
  }
  save() { this.storage.setItem(this.key, serializeLayout({ root: this.root, floats: this.floats })); }
  reset() { this.root = null; this.floats = []; this.storage.removeItem(this.key); this._emit(); }
  // อัปเดต layout (ผ่านฟังก์ชันจาก panel-layout) แล้วบันทึก + แจ้ง listener อัตโนมัติ
  update(nextRoot) { this.root = nextRoot; this.save(); this._emit(); }
  setFloats(floats) { this.floats = floats; this.save(); this._emit(); }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit() { for (const fn of this.listeners) fn(this.root, this.floats); }
}

// ────────────────────────────────────────────────────────────────
// PanelManager — API ที่ UI เรียกจริง (ทะเบียนแผง + ทุกคำสั่ง + บันทึกอัตโนมัติ)
//
//   const pm = new PanelManager();
//   pm.registerPanel('outline', { title:'โครงเรื่อง', render: (host)=>{…} });
//   pm.load();                    // กู้เลย์เอาต์ครั้งก่อน (ต้อง register ให้ครบก่อน)
//   pm.showPanel('outline');
//
// ทะเบียน (registry) ไม่ถูกบันทึก — มี render ซึ่ง serialize ไม่ได้
// เลย์เอาต์ที่บันทึกเก็บแค่ id + โครงต้นไม้ แล้วสวมทับทะเบียนตอนเปิดโปรแกรม
// ────────────────────────────────────────────────────────────────
export class PanelManager {
  constructor({ storage, key, store } = {}) {
    this.store = store || new PanelStore(storage, key);
    this.registry = new Map();
  }
  get root() { return this.store.root; }
  get floats() { return this.store.floats; }
  layout() { return { root: this.store.root, floats: this.store.floats }; }

  // ---- registry ----
  /** Register a panel definition. Must be called before load() so unknown ids can be pruned. */
  registerPanel(id, opts = {}) {
    const def = {
      id,
      title: opts.title || id,
      icon: opts.icon || '',
      render: opts.render || null,
      closable: opts.closable !== false,
      floatable: opts.floatable !== false,
      defaultSide: opts.defaultSide || 'left',
      defaultSize: opts.defaultSize || null,
    };
    this.registry.set(id, def);
    return def;
  }
  unregisterPanel(id) { this.hidePanel(id); return this.registry.delete(id); }
  getPanel(id) { return this.registry.get(id) || null; }
  registered() { return [...this.registry.keys()]; }

  // ---- สถานะ ----
  isDocked(id) { return !!(this.root && PL.hasPanel(this.root, id)); }
  isFloating(id) { return this.floats.some((f) => f.panel.id === id); }
  isOpen(id) { return this.isDocked(id) || this.isFloating(id); }
  openIds() {
    return [...(this.root ? PL.panelIds(this.root) : []), ...this.floats.map((f) => f.panel.id)];
  }
  _node(id) {
    const d = this.registry.get(id);
    return { type: 'panel', id, title: d ? d.title : id };
  }

  // ---- แสดง/ซ่อน ----
  /** Show a panel: docks it on first use, otherwise brings it to front (tab + un-collapse). */
  showPanel(id, opts = {}) {
    const def = this.registry.get(id);
    if (!def) return false;                        // ไม่ได้ลงทะเบียน = ไม่รู้จะวาดอะไร
    if (this.isFloating(id)) { this._toFront(id); return true; }
    if (this.isDocked(id)) {                       // มีอยู่แล้ว → เลื่อนมาหน้า + คลายย่อ
      this.store.update(PL.collapsePanel(PL.activatePanel(this.root, id), id, false));
      return true;
    }
    if (!this.root) { this.store.update(this._node(id)); return true; }
    const side = opts.side || def.defaultSide || 'left';
    const target = this._target(opts.targetId);
    this.store.update(PL.dockPanel(this.root, target, side, this._node(id)));
    return true;
  }
  /** Close a panel (✕) — removes it from the tree and from floating windows. */
  hidePanel(id) {
    // บั๊ก #19: แผงหลัก (docs) ปิดไม่ได้ — ถ้าหลุดออกจากต้นไม้ root จะกลายเป็น null
    // แล้วรอบเปิดโปรแกรมถัดไปจะรีเซ็ตเป็นเลย์เอาต์ตั้งต้น = "แผงทั้งชุดโผล่มาเอง"
    const def = this.registry.get(id);
    if (def && def.closable === false) return false;
    let changed = false;
    if (this.isFloating(id)) {
      this.store.setFloats(this.floats.filter((f) => f.panel.id !== id));
      changed = true;
    }
    if (this.isDocked(id)) { this.store.update(PL.removePanel(this.root, id)); changed = true; }
    return changed;
  }
  togglePanel(id, opts) { return this.isOpen(id) ? this.hidePanel(id) : this.showPanel(id, opts); }

  // ---- ผนึก / ลอย ----
  /** Dock a panel to `side` of `targetId` (moves it if it is floating or docked elsewhere). */
  dockPanel(id, side = 'left', targetId) {
    let node = null;
    const fl = this.floats.find((f) => f.panel.id === id);
    if (fl) { node = fl.panel; this.store.setFloats(this.floats.filter((f) => f !== fl)); }
    if (!node && this.isDocked(id)) {
      const d = PL.detachPanel(this.root, id);     // ย้ายที่: ถอดออกก่อนแล้วค่อยผนึกใหม่
      node = d.detached;
      this.store.update(d.root);
    }
    if (!node) node = this._node(id);
    if (!this.root) { this.store.update({ type: 'panel', id: node.id, title: node.title }); return true; }
    this.store.update(PL.dockPanel(this.root, this._target(targetId), side, node));
    return true;
  }
  /** Pop a panel out into a floating window (⧉). */
  floatPanel(id, box = {}) {
    const def = this.registry.get(id);
    if (def && def.floatable === false) return false;
    if (this.isFloating(id)) { this._toFront(id); return true; }
    let node = this._node(id);
    if (this.isDocked(id)) {
      const d = PL.detachPanel(this.root, id);
      node = d.detached || node;
      this.store.update(d.root);
    }
    const f = PL.makeFloat(node, box.x ?? 80, box.y ?? 80, box.w ?? 360, box.h ?? 260);
    this.store.setFloats([...this.floats, f]);
    return true;
  }
  toggleFloat(id, box) { return this.isFloating(id) ? this.dockPanel(id, box && box.side) : this.floatPanel(id, box); }
  /** Move/resize a floating window (drag + resize handle). */
  moveFloat(id, box = {}) {
    const next = this.floats.map((f) => (f.panel.id === id ? { ...f, ...pick(box, ['x', 'y', 'w', 'h']) } : f));
    this.store.setFloats(next);
    return true;
  }
  _toFront(id) {                                   // ลำดับท้ายอาร์เรย์ = อยู่บนสุด (z-order)
    const f = this.floats.find((x) => x.panel.id === id);
    if (!f) return;
    this.store.setFloats([...this.floats.filter((x) => x !== f), f]);
  }

  // ---- แท็บ / กลุ่ม ----
  /** Merge panels into a single tab group, anchored at ids[0]. */
  groupPanels(ids) {
    if (!Array.isArray(ids) || ids.length < 2) return false;
    for (const id of ids) if (this.isFloating(id)) this.dockPanel(id, 'center', ids[0]);
    if (!this.root) return false;
    this.store.update(PL.groupPanels(this.root, ids.filter((id) => this.isDocked(id))));
    return true;
  }
  /** Pull a panel out of its tab group and dock it to `side` (null → float it). */
  ungroupPanel(id, side = 'right') {
    if (!this.isDocked(id)) return false;
    if (!side) return this.floatPanel(id);
    this.store.update(PL.splitTab(this.root, id, side).root);
    return true;
  }
  activatePanel(id) {
    if (!this.isDocked(id)) return false;
    this.store.update(PL.activatePanel(this.root, id));
    return true;
  }
  moveTab(tabsId, from, to) {
    if (!this.root) return false;
    this.store.update(PL.moveTab(this.root, tabsId, from, to));
    return true;
  }

  // ---- ย่อ / ปรับขนาด ----
  /** Collapse (▾) — pass `on` to force, omit to toggle. */
  collapsePanel(id, on) {
    if (this.isFloating(id)) {
      const next = this.floats.map((f) => (f.panel.id === id
        ? { ...f, panel: { ...f.panel, collapsed: on === undefined ? !f.panel.collapsed : !!on } } : f));
      this.store.setFloats(next);
      return true;
    }
    if (!this.isDocked(id)) return false;
    this.store.update(PL.collapsePanel(this.root, id, on));
    return true;
  }
  isCollapsed(id) {
    const f = this.floats.find((x) => x.panel.id === id);
    if (f) return !!f.panel.collapsed;
    return !!(this.root && PL.isCollapsed(this.root, id));
  }
  resize(dockId, index, ratio) {
    if (!this.root) return false;
    this.store.update(PL.resizeDock(this.root, dockId, index, ratio));
    return true;
  }

  // ---- persist ----
  save() { this.store.save(); }
  /** Load the saved layout, dropping panels that are no longer registered. */
  load() {
    const ok = this.store.load();
    if (ok && this.registry.size) this._prune();
    return ok;
  }
  reset() { this.store.reset(); }
  onChange(fn) { return this.store.onChange(fn); }

  _prune() {                                       // เลย์เอาต์เก่าอาจอ้างแผงที่ถอดออกจากโปรแกรมแล้ว
    let r = this.store.root;
    if (r) for (const id of PL.panelIds(r)) if (!this.registry.has(id)) r = PL.removePanel(r, id);
    this.store.root = r;
    this.store.floats = this.store.floats.filter((f) => this.registry.has(f.panel.id));
    this.store.save();
    this.store._emit();                            // บั๊ก #19: เดิมเขียน root ตรง ๆ ไม่ผ่าน update()
  }                                                //   → onChange ไม่ยิง UI ค้างกับต้นไม้เก่า
  _target(id) {                                    // เป้าหมายการผนึก: ที่ระบุ → ไม่งั้น panel ตัวแรก
    if (id && PL.hasPanel(this.root, id)) return id;
    return PL.panelIds(this.root)[0];
  }
}

function pick(o, keys) {
  const out = {};
  for (const k of keys) if (o[k] !== undefined) out[k] = o[k];
  return out;
}
