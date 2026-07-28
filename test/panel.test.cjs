// test/panel.test.cjs — ทดสอบ panel-layout + panel-store ด้วย node
const path = require('path');
const os = require('os');
const esbuild = require('esbuild');
// ใช้ os.tmpdir() — '/tmp' ตายตัวรันบน Windows ไม่ได้
const tmp = (f) => path.join(os.tmpdir(), f);
for (const [src, out] of [['panels/panel-layout.js', tmp('_pl.cjs')], ['panels/panel-store.js', tmp('_ps.cjs')]])
  esbuild.buildSync({ entryPoints: [path.join(__dirname, '../src/' + src)], outfile: out, format: 'cjs', bundle: true, logLevel: 'silent' });
const PL = require(tmp('_pl.cjs'));
const PS = require(tmp('_ps.cjs'));

let pass = 0, fail = 0;
const check = (n, c, i = '') => { if (c) pass++; else { fail++; console.log('  ✗ FAIL:', n, i ? '::' + i : ''); } };

// ── snapZone ──
const rect = { x: 0, y: 0, w: 100, h: 100 };
check('snap ซ้าย', PL.snapZone(5, 50, rect) === 'left');
check('snap ขวา', PL.snapZone(95, 50, rect) === 'right');
check('snap บน', PL.snapZone(50, 5, rect) === 'top');
check('snap ล่าง', PL.snapZone(50, 95, rect) === 'bottom');
check('snap กลาง', PL.snapZone(50, 50, rect) === 'center');
check('snap นอกกรอบ → null', PL.snapZone(150, 50, rect) === null);

// ── dockPanel ──
let root = PL.panel('A', 'เอ');
root = PL.dockPanel(root, 'A', 'right', PL.panel('B', 'บี'));
check('dock ขวา → dock row [A,B]', root.type === 'dock' && root.dir === 'row' && PL.panelIds(root).join() === 'A,B', JSON.stringify(PL.panelIds(root)));
root = PL.dockPanel(root, 'B', 'bottom', PL.panel('C'));
check('dock ล่างของ B → col ซ้อนใน row', PL.panelIds(root).sort().join() === 'A,B,C', PL.panelIds(root));
root = PL.dockPanel(root, 'A', 'left', PL.panel('D'));
check('dock ซ้ายของ A → เป็นพี่น้องใน row เดิม (D ก่อน A)', PL.panelIds(root).includes('D'));

// ── dock ทิศเดียวกัน = แทรกพี่น้อง (ไม่ซ้อน dock เกิน) ──
let r2 = PL.dockPanel(PL.panel('X'), 'X', 'right', PL.panel('Y'));
r2 = PL.dockPanel(r2, 'Y', 'right', PL.panel('Z'));
check('dock row ต่อเนื่อง → children เดียว [X,Y,Z] ไม่ซ้อน', r2.type === 'dock' && r2.children.length === 3, 'children=' + r2.children.length);
check('sizes เท่ากันหลังแทรก', r2.sizes.length === 3 && Math.abs(r2.sizes.reduce((a, b) => a + b, 0) - 1) < 0.01);

// ── tab group ──
let t = PL.addAsTab(PL.panel('A'), 'A', PL.panel('B'));
check('addAsTab → tabs[A,B] active=1', t.type === 'tabs' && t.children.length === 2 && t.active === 1);
t = PL.addAsTab(t, 'A', PL.panel('C'));
check('addAsTab ซ้ำ → 3 แท็บ', t.type === 'tabs' && t.children.length === 3, 'n=' + t.children.length);
const moved = PL.moveTab(t, t.id, 0, 2);
check('moveTab สลับที่ (A ไปท้าย)', moved.children[2].id === 'A', moved.children.map((c) => c.id).join());

// ── splitTab: แยกแท็บออก ──
const sp = PL.splitTab(t, 'C', 'right');
check('splitTab เอา C ออกจากกลุ่มแล้ว dock ขวา', PL.panelIds(sp.root).sort().join() === 'A,B,C' && sp.detached.id === 'C');
check('splitTab: กลุ่มเดิมเหลือ A,B', (() => { let g = null; PL.walk(sp.root, (n) => { if (n.type === 'tabs') g = n; }); return g && g.children.length === 2; })());

// ── removePanel + collapse ──
let rr = PL.dockPanel(PL.panel('A'), 'A', 'right', PL.panel('B'));
rr = PL.removePanel(rr, 'B');
check('removePanel B → ยุบ dock เหลือ panel A เดี่ยว', rr.type === 'panel' && rr.id === 'A', JSON.stringify(rr).slice(0, 60));

// ── resizeDock ──
let rd = PL.dockPanel(PL.panel('A'), 'A', 'right', PL.panel('B'));
rd = PL.resizeDock(rd, rd.id, 0, 0.7);
check('resizeDock → ratio 0.7/0.3', Math.abs(rd.sizes[0] - 0.7) < 0.01 && Math.abs(rd.sizes[1] - 0.3) < 0.01, rd.sizes.join());
rd = PL.resizeDock(rd, rd.id, 0, 0.99);
check('resizeDock clamp (ไม่เกิน 0.95)', rd.sizes[0] <= 0.95, rd.sizes.join());

// ── panel-store: serialize/deserialize ──
const layout = { root: PL.dockPanel(PL.panel('A'), 'A', 'right', PL.panel('B')), floats: [] };
const str = PS.serializeLayout(layout);
const back = PS.deserializeLayout(str);
check('serialize/deserialize round-trip', back && PL.panelIds(back.root).join() === 'A,B', back && PL.panelIds(back.root));
check('มี version ใน serialized', JSON.parse(str).version === PS.LAYOUT_VERSION);

// ── migration v0 (ไม่มี version) → v1 ──
const legacy = JSON.stringify({ root: PL.panel('OLD') });     // schema เก่าไม่มี version/floats
const mig = PS.deserializeLayout(legacy);
check('migrate v0 → v1 (เติม floats)', mig && mig.root.id === 'OLD' && Array.isArray(mig.floats));

// ── version mismatch → null ──
check('version อนาคต → null (ปลอดภัย)', PS.deserializeLayout(JSON.stringify({ version: 999, root: {} })) === null);
check('สตริงพัง → null', PS.deserializeLayout('{ไม่ใช่ json') === null);

// ── PanelStore save/load ด้วย mock storage ──
const mem = new Map();
const mock = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
const store = new PS.PanelStore(mock, 'test-key');
store.update(PL.dockPanel(PL.panel('A'), 'A', 'bottom', PL.panel('B')));
let notified = 0; store.onChange(() => notified++);
store.update(PL.removePanel(store.root, 'B'));
check('PanelStore.onChange ถูกเรียก', notified === 1, 'n=' + notified);
const store2 = new PS.PanelStore(mock, 'test-key');
check('PanelStore load จาก storage เดิม', store2.load() && store2.root.id === 'A', JSON.stringify(store2.root));

// ── collapse (ปุ่ม ▾) ──
let cp = PL.dockPanel(PL.panel('A'), 'A', 'right', PL.panel('B'));
cp = PL.collapsePanel(cp, 'A');
check('collapsePanel toggle → true', PL.isCollapsed(cp, 'A') === true);
cp = PL.collapsePanel(cp, 'A', false);
check('collapsePanel(false) → คลายย่อ', PL.isCollapsed(cp, 'A') === false);
check('ย่อ A ไม่กระทบ B', PL.isCollapsed(cp, 'B') === false);

// ── setActiveTab / activatePanel ──
let at = PL.addAsTab(PL.panel('A'), 'A', PL.panel('B'));
at = PL.addAsTab(at, 'A', PL.panel('C'));
check('addAsTab → active ชี้ตัวใหม่ (C)', at.active === 2);
at = PL.setActiveTab(at, at.id, 0);
check('setActiveTab(0)', at.active === 0);
at = PL.setActiveTab(at, at.id, 99);
check('setActiveTab เกินขอบ → clamp ท้ายสุด', at.active === 2, 'active=' + at.active);
at = PL.activatePanel(at, 'B');
check('activatePanel(B) → active=1', at.active === 1);

// ── groupPanels: รวมหลาย panel เป็น Tab Group ──
let gp = PL.dockPanel(PL.panel('A'), 'A', 'right', PL.panel('B'));
gp = PL.dockPanel(gp, 'B', 'bottom', PL.panel('C'));
gp = PL.groupPanels(gp, ['A', 'B', 'C']);
check('groupPanels → panel ครบ 3', PL.panelIds(gp).sort().join() === 'A,B,C', PL.panelIds(gp));
check('groupPanels → เหลือกลุ่มแท็บเดียว', (() => {
  let n = 0; PL.walk(gp, (x) => { if (x.type === 'tabs') n++; }); return n === 1;
})());
check('groupPanels → ต้นไม้ยุบเหลือ tabs เป็น root', gp.type === 'tabs' && gp.children.length === 3, gp.type);
check('groupPanels ids<2 → ไม่เปลี่ยน', PL.panelIds(PL.groupPanels(gp, ['A'])).length === 3);
check('tabGroupOf หา กลุ่มของ B เจอ', !!PL.tabGroupOf(gp, 'B') && PL.tabGroupOf(gp, 'ไม่มี') === null);

// ── detachPanel / removePanel ราก ──
const det = PL.detachPanel(PL.dockPanel(PL.panel('A'), 'A', 'right', PL.panel('B')), 'B');
check('detachPanel คืน node + ต้นไม้ที่เหลือ', det.detached.id === 'B' && det.root.id === 'A');
check('removePanel ราก → null', PL.removePanel(PL.panel('SOLO'), 'SOLO') === null);
check('splitTab panel เดี่ยว → ไม่พัง', PL.splitTab(PL.panel('X'), 'X', 'right').root.id === 'X');
check('PANEL_BUTTONS มี ✕ ▾ ⧉', PL.PANEL_BUTTONS.map((b) => b.icon).join('') === '▾⧉✕');

// ── PanelManager: registerPanel / showPanel / dockPanel / floatPanel / groupPanels ──
const mkMgr = () => {
  const m = new Map();
  const st = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
  return { pm: new PS.PanelManager({ storage: st, key: 'pm-test' }), storage: st };
};
const { pm, storage } = mkMgr();
pm.registerPanel('outline', { title: 'โครงเรื่อง' });
pm.registerPanel('tree', { title: 'สารบัญ', defaultSide: 'left' });
pm.registerPanel('notes', { title: 'โน้ต' });
check('registerPanel เก็บทะเบียน', pm.registered().join() === 'outline,tree,notes');
check('showPanel ที่ไม่ได้ลงทะเบียน → false', pm.showPanel('ไม่มีจริง') === false);

pm.showPanel('outline');
check('showPanel แรก → เป็น root', pm.root && pm.root.id === 'outline' && pm.isOpen('outline'));
pm.showPanel('tree', { side: 'right' });
check('showPanel ที่สอง → dock row 2 แผง', pm.root.type === 'dock' && PL.panelIds(pm.root).join() === 'outline,tree', PL.panelIds(pm.root));

pm.collapsePanel('tree');
check('PanelManager.collapsePanel (▾)', pm.isCollapsed('tree') === true);
pm.showPanel('tree');
check('showPanel แผงที่ย่ออยู่ → คลายย่อให้', pm.isCollapsed('tree') === false);

pm.floatPanel('outline', { x: 10, y: 20, w: 300, h: 200 });
check('floatPanel (⧉) → ออกจากต้นไม้ไปลอย', pm.isFloating('outline') && !pm.isDocked('outline'));
check('floatPanel → ต้นไม้ยุบเหลือ tree เดี่ยว', pm.root.type === 'panel' && pm.root.id === 'tree', JSON.stringify(pm.root));
check('float เก็บพิกัด', pm.floats[0].x === 10 && pm.floats[0].w === 300);
pm.moveFloat('outline', { x: 55 });
check('moveFloat ย้ายพิกัด', pm.floats[0].x === 55 && pm.floats[0].y === 20);
pm.toggleFloat('outline');
check('toggleFloat → ผนึกกลับเข้าต้นไม้', pm.isDocked('outline') && !pm.isFloating('outline'));

pm.showPanel('notes', { side: 'bottom' });
pm.groupPanels(['tree', 'outline', 'notes']);
check('PanelManager.groupPanels → กลุ่มแท็บเดียว 3 แผง', (() => {
  let g = null; PL.walk(pm.root, (n) => { if (n.type === 'tabs') g = n; });
  return g && g.children.length === 3;
})(), JSON.stringify(pm.root).slice(0, 90));
pm.ungroupPanel('notes', 'right');
check('ungroupPanel → แยกออกจากกลุ่ม', (() => {
  let g = null; PL.walk(pm.root, (n) => { if (n.type === 'tabs') g = n; });
  return g && g.children.length === 2 && PL.panelIds(pm.root).length === 3;
})());

pm.hidePanel('notes');
check('hidePanel (✕) → ปิดจริง', !pm.isOpen('notes') && PL.panelIds(pm.root).sort().join() === 'outline,tree');

// persist + prune ตอน load
let notify = 0; pm.onChange(() => notify++);
pm.showPanel('notes');
check('onChange ยิงเมื่อเลย์เอาต์เปลี่ยน', notify === 1, 'n=' + notify);
const pm2 = new PS.PanelManager({ storage, key: 'pm-test' });
pm2.registerPanel('outline', { title: 'โครงเรื่อง' });
pm2.registerPanel('tree', { title: 'สารบัญ' });      // ไม่ลงทะเบียน notes → ต้องถูกตัดทิ้ง
check('PanelManager.load กู้เลย์เอาต์', pm2.load() && pm2.isOpen('outline') && pm2.isOpen('tree'));
check('load ตัดแผงที่ไม่ได้ลงทะเบียนออก', !pm2.isOpen('notes'), PL.panelIds(pm2.root).join());

// ปิดทุกแผง → root ว่าง แล้วเปิดใหม่ได้
const { pm: pm3 } = mkMgr();
pm3.registerPanel('a', {});
pm3.showPanel('a');
pm3.hidePanel('a');
check('ปิดแผงสุดท้าย → root ว่าง (null)', pm3.root === null && pm3.openIds().length === 0);
pm3.showPanel('a');
check('เปิดใหม่หลังปิดหมด → กลับมาได้', pm3.root && pm3.root.id === 'a');

console.log(`\npanel: ${pass} ผ่าน, ${fail} ล้มเหลว`);
console.log(fail === 0 ? 'ALL OK' : 'HAS FAILURES');
process.exit(fail === 0 ? 0 : 1);
