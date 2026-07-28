// panel-layout.js — โครงต้นไม้เลย์เอาต์ของ panel + ตรรกะ dock/snap/tab/floating (ข้อ 8)
// เป็น pure logic ล้วน (ไม่มี DOM) → ทดสอบด้วย node ได้ · panel-ui.js (opencode) เอาไปวาดจริง
//
// รูปแบบโหนด (recursive):
//   { type:'panel', id, title, collapsed? }                  — ใบ: panel เดี่ยว (collapsed = ปุ่ม ▾ ย่อ)
//   { type:'tabs',  id, children:[panel...], active:number } — กลุ่มแท็บ (หลาย panel ซ้อนเป็นแท็บ)
//   { type:'dock',  id, dir:'row'|'col', children:[...], sizes:[...] } — ผนึกแนวนอน(row)/แนวตั้ง(col)
// floating เก็บแยกนอกต้นไม้: { id, panel, x, y, w, h }
// spec: docs/08-panel-system.md

let _uid = 0;
const nid = (p = 'n') => `${p}${Date.now().toString(36)}${(_uid++).toString(36)}`;

export function panel(id, title = '') { return { type: 'panel', id, title }; }
export function tabs(children, active = 0, id = nid('t')) { return { type: 'tabs', id, children, active }; }
export function dock(dir, children, sizes, id = nid('d')) {
  return { type: 'dock', id, dir, children, sizes: sizes || evenSizes(children.length) };
}
function evenSizes(n) { return Array.from({ length: n }, () => +(1 / n).toFixed(4)); }

// ───────── snap zone: จากตำแหน่งเมาส์เทียบกรอบ → โซนที่จะผนึก ─────────
// คืน 'left'|'right'|'top'|'bottom'|'center'|null
// edge = สัดส่วนความหนาขอบ (0..0.5) ที่ถือว่า "ชนขอบ"
export function snapZone(px, py, rect, edge = 0.25) {
  const { x, y, w, h } = rect;
  if (px < x || px > x + w || py < y || py > y + h) return null;
  const rx = (px - x) / w, ry = (py - y) / h;
  const dl = rx, dr = 1 - rx, dt = ry, db = 1 - ry;
  const min = Math.min(dl, dr, dt, db);
  if (min > edge) return 'center';                 // อยู่กลาง → รวมเป็นแท็บ
  if (min === dl) return 'left';
  if (min === dr) return 'right';
  if (min === dt) return 'top';
  return 'bottom';
}

// ───────── ท่องต้นไม้ ─────────
export function walk(node, fn, parent = null) {
  fn(node, parent);
  if (node.children) for (const c of node.children) walk(c, fn, node);
}
export function findPanel(node, id) {
  let found = null;
  walk(node, (n) => { if (n.type === 'panel' && n.id === id) found = n; });
  return found;
}
// หา container (tabs/dock) + ดัชนีที่ panel id อยู่
function locate(root, id) {
  let res = null;
  walk(root, (n) => {
    if (n.children) {
      const i = n.children.findIndex((c) => (c.type === 'panel' ? c.id === id : c.id === id));
      if (i >= 0) res = { parent: n, index: i };
    }
  });
  return res;
}

// ───────── dock: แทรก panel ใหม่ชิดขอบของ target ─────────
// side: 'left'|'right'|'top'|'bottom'|'center'
// คืน root ใหม่ (immutable-ish: คืนโครงใหม่ ไม่กลายพันธุ์ของเดิม)
export function dockPanel(root, targetId, side, newPanel) {
  root = clone(root);
  if (side === 'center') return addAsTab(root, targetId, newPanel);
  const wantRow = side === 'left' || side === 'right';
  const before = side === 'left' || side === 'top';
  const loc = locate(root, targetId);
  const targetNode = loc ? loc.parent.children[loc.index] : root;

  const makeDock = (existing) => {
    const kids = before ? [panelize(newPanel), existing] : [existing, panelize(newPanel)];
    return dock(wantRow ? 'row' : 'col', kids);
  };
  if (!loc) return makeDock(root);                 // target คือ root
  const parent = loc.parent;
  // ถ้า parent เป็น dock ทิศเดียวกัน → แทรกเป็นพี่น้อง (ไม่ซ้อน dock เกินจำเป็น)
  if (parent.type === 'dock' && parent.dir === (wantRow ? 'row' : 'col')) {
    const at = before ? loc.index : loc.index + 1;
    parent.children.splice(at, 0, panelize(newPanel));
    parent.sizes = evenSizes(parent.children.length);
  } else {
    parent.children[loc.index] = makeDock(parent.children[loc.index]);
  }
  return root;
}
function panelize(p) { return p.type ? p : panel(p.id, p.title); }

// ───────── tab group ─────────
// รวม newPanel เป็นแท็บกับ panel เป้าหมาย
export function addAsTab(root, targetId, newPanel) {
  root = clone(root);
  const np = panelize(newPanel);
  const loc = locate(root, targetId);
  if (!loc) {                                       // target คือ root
    if (root.type === 'tabs') { root.children.push(np); root.active = root.children.length - 1; return root; }
    return tabs([root, np], 1);
  }
  if (loc.parent.type === 'tabs') {                 // target อยู่ในกลุ่มแท็บแล้ว → เพิ่มเข้ากลุ่มเดิม
    loc.parent.children.push(np); loc.parent.active = loc.parent.children.length - 1; return root;
  }
  const cur = loc.parent.children[loc.index];       // target เป็น panel ใน dock → ห่อเป็น tabs
  if (cur.type === 'tabs') { cur.children.push(np); cur.active = cur.children.length - 1; }
  else loc.parent.children[loc.index] = tabs([cur, np], 1);
  return root;
}
// เลือกแท็บที่แสดงในกลุ่ม (ตาม index)
export function setActiveTab(root, tabsId, index) {
  root = clone(root);
  let grp = null; walk(root, (n) => { if (n.id === tabsId && n.type === 'tabs') grp = n; });
  if (grp) grp.active = Math.max(0, Math.min(index, grp.children.length - 1));
  return root;
}
// เลื่อน panel ให้เป็นแท็บที่แสดงอยู่ (ใช้ตอน showPanel กับ panel ที่ซ่อนอยู่หลังแท็บอื่น)
export function activatePanel(root, panelId) {
  root = clone(root);
  walk(root, (n) => {
    if (n.type !== 'tabs') return;
    const i = n.children.findIndex((c) => c.id === panelId);
    if (i >= 0) n.active = i;
  });
  return root;
}
// สลับลำดับแท็บภายในกลุ่มเดียวกัน
export function moveTab(root, tabsId, from, to) {
  root = clone(root);
  let grp = null; walk(root, (n) => { if (n.id === tabsId && n.type === 'tabs') grp = n; });
  if (!grp) return root;
  const [m] = grp.children.splice(from, 1);
  grp.children.splice(to, 0, m);
  grp.active = to;
  return root;
}
// แยก panel ออกจากกลุ่มแท็บ → dock ไปด้านที่ระบุ (หรือ float ถ้า side=null → คืน {root, detached})
export function splitTab(root, panelId, side = 'right') {
  root = clone(root);
  const p = findPanel(root, panelId);
  if (!p) return { root, detached: null };
  const detached = { ...p };
  root = removePanel(root, panelId);
  // ถ้าเอาออกแล้วต้นไม้ว่าง (มี panel เดียวอยู่ก่อน) → ตัวที่ถอดมากลายเป็น root เอง
  if (side) root = root ? dockPanel(root, rootFirstPanelId(root), side, detached) : panelize(detached);
  return { root, detached };
}

// รวมหลาย panel ให้เป็น Tab Group เดียว — ยึดตำแหน่งของ ids[0] แล้วดูดตัวที่เหลือเข้ามา
// (ตัวที่เหลือถูกถอดจากที่เดิมก่อน → container ที่ว่างจะยุบเองผ่าน removePanel)
export function groupPanels(root, ids) {
  let out = clone(root);
  if (!Array.isArray(ids) || ids.length < 2) return out;
  const [target, ...rest] = ids;
  if (!findPanel(out, target)) return out;
  for (const id of rest) {
    if (id === target) continue;
    const p = findPanel(out, id);
    if (!p) continue;
    const detached = { ...p };
    out = removePanel(out, id);
    if (!findPanel(out, target)) return out;      // กันกรณีต้นไม้ยุบจน target หาย (ไม่ควรเกิด)
    out = addAsTab(out, target, detached);
  }
  return out;
}

// ───────── ย่อ/ขยาย (ปุ่ม ▾) — โหนดยังอยู่ในต้นไม้ แค่ติดธง ─────────
export function collapsePanel(root, id, on) {
  root = clone(root);
  const p = findPanel(root, id);
  if (p) p.collapsed = on === undefined ? !p.collapsed : !!on;
  return root;
}
export function isCollapsed(root, id) {
  const p = findPanel(root, id);
  return !!(p && p.collapsed);
}

// ───────── ถอด panel ออกจากต้นไม้ (ไปทำเป็นแผงลอย) ─────────
// คืน { root, detached } — detached = โหนด panel ตัวเดิม (หรือ null ถ้าไม่เจอ)
export function detachPanel(root, id) {
  const p = findPanel(root, id);
  if (!p) return { root: clone(root), detached: null };
  return { root: removePanel(root, id), detached: { ...p, collapsed: false } };
}

// ───────── remove + ยุบโหนดว่าง ─────────
// คืน null ถ้า root เองคือ panel ที่ถูกปิด (= ไม่เหลืออะไรในต้นไม้) — ผู้เรียกต้องรับ null ได้
export function removePanel(root, id) {
  if (!root) return null;
  if (root.type === 'panel') return root.id === id ? null : clone(root);
  root = clone(root);
  const prune = (node) => {
    if (!node.children) return node;
    node.children = node.children
      .filter((c) => !(c.type === 'panel' && c.id === id))
      .map(prune)
      // ยุบ container ที่เหลือลูกเดียว/ว่าง
      .filter((c) => !(c.children && c.children.length === 0));
    if (node.type === 'tabs') {
      if (node.active >= node.children.length) node.active = Math.max(0, node.children.length - 1);
    }
    if (node.type === 'dock') node.sizes = evenSizes(node.children.length);
    return node;
  };
  root = prune(root);
  return collapse(root);
}
// ยุบ dock/tabs ที่เหลือลูกเดียว → เอาลูกนั้นขึ้นมาแทน
function collapse(node) {
  if (!node.children) return node;
  node.children = node.children.map(collapse);
  if ((node.type === 'dock' || node.type === 'tabs') && node.children.length === 1) return node.children[0];
  return node;
}
function rootFirstPanelId(root) {
  let id = null; walk(root, (n) => { if (id === null && n.type === 'panel') id = n.id; });
  return id;
}

// ───────── ปรับ ratio ของ dock (ลาก handle) ─────────
export function resizeDock(root, dockId, index, ratio) {
  root = clone(root);
  let d = null; walk(root, (n) => { if (n.id === dockId && n.type === 'dock') d = n; });
  if (!d || index < 0 || index >= d.sizes.length - 1) return root;
  const pair = d.sizes[index] + d.sizes[index + 1];
  ratio = Math.max(0.05, Math.min(0.95, ratio));
  d.sizes[index] = +(pair * ratio).toFixed(4);
  d.sizes[index + 1] = +(pair * (1 - ratio)).toFixed(4);
  return root;
}

// ───────── floating ─────────
export function makeFloat(p, x = 80, y = 80, w = 360, h = 260) {
  return { id: nid('f'), panel: panelize(p), x, y, w, h };
}

// รายชื่อ panel id ทั้งหมดในต้นไม้ (ไว้ตรวจ/เทส)
export function panelIds(root) {
  const ids = []; walk(root, (n) => { if (n.type === 'panel') ids.push(n.id); }); return ids;
}
export function hasPanel(root, id) { return !!(root && findPanel(root, id)); }
// หากลุ่มแท็บที่ panel นี้อยู่ (null ถ้าเป็น panel เดี่ยว) — UI ใช้วาดหัวแท็บ
export function tabGroupOf(root, panelId) {
  let grp = null;
  walk(root, (n) => { if (n.type === 'tabs' && n.children.some((c) => c.id === panelId)) grp = n; });
  return grp;
}

// ปุ่มมาตรฐานบนหัวแผง — UI (panel-ui.js) เอาไปวาด ตรรกะอยู่ที่ PanelManager
export const PANEL_BUTTONS = [
  { key: 'collapse', icon: '▾', title: 'ย่อ/ขยาย', action: 'collapsePanel' },
  { key: 'float',    icon: '⧉', title: 'ลอย/ผนึก', action: 'toggleFloat' },
  { key: 'close',    icon: '✕', title: 'ปิดแผง',   action: 'hidePanel' },
];

function clone(o) { return JSON.parse(JSON.stringify(o)); }
