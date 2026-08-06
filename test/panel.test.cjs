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
// [alpha.62 บั๊ก 21] ปิดแผง = ติดธง hidden — โหนดยัง "จองสล็อต" อยู่ในต้นไม้
// (เดิมตัดออกจากต้นไม้จริง ๆ แล้วตำแหน่ง/สัดส่วนหายทุกครั้ง)
check('hidePanel (✕) → ไม่แสดงผลแล้ว', !pm.isOpen('notes'));
check('hidePanel → สล็อตยังอยู่ในต้นไม้ (ไม่ถูกตัดทิ้ง)',
  pm.isDocked('notes') && pm.isHidden('notes'), JSON.stringify(pm.root).slice(0, 120));
check('hidePanel → เหลือแผงที่เห็นอยู่แค่ 2 ตัว',
  PL.visiblePanelIds(pm.root).sort().join() === 'outline,tree',
  PL.visiblePanelIds(pm.root).join());
check('hidePanel → panelIds ยังนับตัวที่ถูกซ่อนด้วย (ใช้ prune/ค้นสล็อต)',
  PL.panelIds(pm.root).sort().join() === 'notes,outline,tree', PL.panelIds(pm.root).join());

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
// [alpha.62 บั๊ก 21] ปิดตัวสุดท้ายแล้ว root **ไม่กลายเป็น null อีกแล้ว** — โหนดยังอยู่ แค่ติดธง
// (ดีกว่าเดิมด้วย: บั๊ก #19 เคยกลัว root เป็น null แล้วรอบถัดไปรีเซ็ตเป็นเลย์เอาต์ตั้งต้น)
check('ปิดแผงสุดท้าย → ไม่มีแผงที่เห็นอยู่ แต่ต้นไม้ไม่หาย',
  pm3.openIds().length === 0 && pm3.root && pm3.root.id === 'a' && pm3.isHidden('a'));
pm3.showPanel('a');
check('เปิดใหม่หลังปิดหมด → กลับมาที่สล็อตเดิม',
  pm3.root && pm3.root.id === 'a' && pm3.isOpen('a') && !pm3.isHidden('a'));

// ══ บั๊ก #16: สัดส่วนที่ผู้ใช้ปรับเองต้องไม่ถูกล้างตอนเปิด/ปิดแผง ══
{
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  // -- helper บริสุทธิ์ --
  check('#16 normalizeSizes ทำผลรวมเป็น 1 โดยคงอัตราส่วน',
        Math.abs(sum(PL.normalizeSizes([2, 3])) - 1) < 1e-6 &&
        Math.abs(PL.normalizeSizes([2, 3])[0] - 0.4) < 1e-3, JSON.stringify(PL.normalizeSizes([2, 3])));
  check('#16 normalizeSizes ผลรวม 0 → แบ่งเท่ากัน', PL.normalizeSizes([0, 0]).join() === '0.5,0.5');
  const ins = PL.insertSize([0.35, 0.65], 2);
  check('#16 insertSize คงอัตราส่วนเดิมของลูกเก่า',
        ins.length === 3 && Math.abs(ins[0] / ins[1] - 0.35 / 0.65) < 1e-3, JSON.stringify(ins));
  check('#16 insertSize ให้ลูกใหม่ = ส่วนเฉลี่ย 1/(n+1)',
        Math.abs(ins[2] - 1 / 3) < 1e-3 && Math.abs(sum(ins) - 1) < 1e-3, JSON.stringify(ins));
  const insFixed = PL.insertSize([0, 1, 0], 3);      // toolbar/เนื้อหา/statusbar (0 = ขนาดคงที่)
  check('#16 insertSize ไม่ปลุกลูกที่ขนาดเป็น 0 ให้ยืด',
        insFixed[0] === 0 && insFixed[2] === 0, JSON.stringify(insFixed));
  check('#16 keepSizes เก็บอัตราส่วนของลูกที่เหลือ',
        PL.keepSizes([0.2, 0.3, 0.5], [0, 2]).map((v) => +v.toFixed(3)).join() === '0.286,0.714',
        JSON.stringify(PL.keepSizes([0.2, 0.3, 0.5], [0, 2])));

  // -- 16a: เปิดแผงเพิ่มแล้วสัดส่วนเดิมต้องคงอยู่ --
  let d = PL.dock('row', [PL.panel('tree'), PL.panel('docs')], [0.4, 0.6]);
  d = PL.dockPanel(d, 'docs', 'right', PL.panel('props'));
  check('#16a เปิดแผงเพิ่ม → อัตราส่วน tree:docs เดิมยังอยู่ (ไม่กลาย 33/33/33)',
        Math.abs(d.sizes[0] / d.sizes[1] - 0.4 / 0.6) < 1e-3, JSON.stringify(d.sizes));
  check('#16a แผงใหม่ได้ส่วนเฉลี่ย + ผลรวมยังเป็น 1',
        Math.abs(d.sizes[2] - 1 / 3) < 1e-3 && Math.abs(sum(d.sizes) - 1) < 1e-3, JSON.stringify(d.sizes));

  // -- 16b: ปิดแผงใน dock ชั้นใน ต้องไม่แตะสัดส่วนของ dock ชั้นนอก --
  const inner = PL.dock('col', [PL.panel('tree'), PL.panel('outline')], [0.7, 0.3]);
  let outer = PL.dock('col', [PL.panel('toolbar'),
                              PL.dock('row', [inner, PL.panel('docs')], [0.25, 0.75]),
                              PL.panel('statusbar')], [0, 1, 0]);
  const afterOuter = PL.removePanel(outer, 'outline');
  check('#16b ปิดแผงชั้นใน → dock ชั้นนอกยังเป็น [0,1,0] (ไม่โดน reset)',
        afterOuter.sizes.join() === '0,1,0', JSON.stringify(afterOuter.sizes));
  const rowNode = afterOuter.children[1];
  check('#16b dock กลางที่จำนวนลูกไม่เปลี่ยน → สัดส่วน 0.25/0.75 ยังอยู่',
        rowNode.sizes.join() === '0.25,0.75', JSON.stringify(rowNode.sizes));

  // -- ปิดแผงใน dock ที่จำนวนลูกเปลี่ยนจริง → แบ่งส่วนที่หายให้ตัวที่เหลือตามอัตราเดิม --
  const three = PL.dock('row', [PL.panel('a'), PL.panel('b'), PL.panel('c')], [0.2, 0.3, 0.5]);
  const two = PL.removePanel(three, 'b');
  check('#16 ปิดแผง → ตัวที่เหลือคงอัตราส่วนกันเอง (0.2:0.5)',
        Math.abs(two.sizes[0] / two.sizes[1] - 0.2 / 0.5) < 1e-3 && Math.abs(sum(two.sizes) - 1) < 1e-3,
        JSON.stringify(two.sizes));

  // -- ปรับสัดส่วน → เปิดแผง → ปิดแผง → ต้องกลับมาใกล้ค่าที่ปรับไว้ --
  let live = PL.dock('row', [PL.panel('tree'), PL.panel('docs')], [0.4, 0.6]);
  live = PL.resizeDock(live, live.id, 0, 0.28);
  const ratioBefore = live.sizes[0] / live.sizes[1];
  live = PL.dockPanel(live, 'docs', 'right', PL.panel('props'));
  live = PL.removePanel(live, 'props');
  check('#16 ปรับสัดส่วน → เปิดแผง → ปิดแผง → สัดส่วนเดิมกลับมา',
        Math.abs(live.sizes[0] / live.sizes[1] - ratioBefore) < 1e-2,
        JSON.stringify(live.sizes) + ' vs ' + ratioBefore.toFixed(3));
}

// ══ บั๊ก #19: แผงที่ปิดไม่ได้ (docs) ต้องหลุดออกจากต้นไม้ไม่ได้ ══
{
  const { pm: pmG } = mkMgr();
  pmG.registerPanel('docs', { title: 'เอกสาร', closable: false, floatable: false });
  pmG.registerPanel('tree', { title: 'โปรเจกต์' });
  pmG.showPanel('docs');
  pmG.showPanel('tree');
  check('#19 hidePanel แผงที่ closable:false → ปฏิเสธ', pmG.hidePanel('docs') === false);
  check('#19 แผงเอกสารยังอยู่ในต้นไม้ (root ไม่กลายเป็น null)',
        pmG.isDocked('docs') && pmG.root !== null);
  pmG.hidePanel('tree');
  check('#19 แผงที่ปิดได้ยังปิดได้ตามปกติ', !pmG.isOpen('tree') && pmG.isDocked('docs'));
  check('#19 togglePanel แผงที่ปิดไม่ได้ → ไม่ทำอะไร',
        pmG.togglePanel('docs') === false && pmG.isDocked('docs'));
}


// ══ [alpha.60r2 ข้อ 8] schema v2 — จำสัดส่วนของแผง + ตกกลับค่าตั้งต้นเมื่อเลย์เอาต์พัง ══
check('[60r2] LAYOUT_VERSION = 2', PS.LAYOUT_VERSION === 2, PS.LAYOUT_VERSION);
{
  const lay = { root: PL.dockPanel(PL.panel('A'), 'A', 'right', PL.panel('B')), floats: [],
                splitRatios: { A: 0.24, B: 0.76 } };
  const back2 = PS.deserializeLayout(PS.serializeLayout(lay));
  check('[60r2] splitRatios รอด round-trip',
        back2 && back2.splitRatios.A === 0.24 && back2.splitRatios.B === 0.76,
        JSON.stringify(back2 && back2.splitRatios));
}
{
  // v1 ที่บันทึกไว้ก่อนอัปเดต ต้องอ่านได้ ไม่ใช่ถูกทิ้งจนแผงรีเซ็ตทั้งชุด
  const v1 = JSON.stringify({ version: 1, root: PL.panel('OLD'), floats: [] });
  const m1 = PS.deserializeLayout(v1);
  check('[60r2] migrate v1 → v2 (ไม่ทิ้งเลย์เอาต์เดิม)', m1 && m1.root.id === 'OLD');
  check('[60r2] migrate v1 → v2 เติม splitRatios ว่าง',
        m1 && m1.splitRatios && Object.keys(m1.splitRatios).length === 0);
}
{
  // สัดส่วนเพี้ยน (ถูกแก้มือ/ไฟล์เสีย) ต้องถูกกรองทิ้ง ไม่ใช่พาเลย์เอาต์เพี้ยนตาม
  const bad = PS.deserializeLayout(JSON.stringify({ version: 2, root: PL.panel('A'), floats: [],
    splitRatios: { A: 5, B: -1, C: 'x', D: 0.5 } }));
  check('[60r2] กรองสัดส่วนที่ใช้ไม่ได้ทิ้ง',
        bad && Object.keys(bad.splitRatios).join() === 'D', JSON.stringify(bad && bad.splitRatios));
}
{
  // เลย์เอาต์ที่โครงพัง = ตกกลับ null (UI จะสร้าง defaultLayout ให้) ไม่ใช่วาดต้นไม้เสีย
  check('[60r2] dock ที่ไม่มีลูก → null',
        PS.deserializeLayout(JSON.stringify({ version: 2, root: { type: 'dock', children: [] } })) === null);
  check('[60r2] panel ที่ไม่มี id → null',
        PS.deserializeLayout(JSON.stringify({ version: 2, root: { type: 'panel' } })) === null);
  check('[60r2] ชนิดโหนดที่ไม่รู้จัก → null',
        PS.deserializeLayout(JSON.stringify({ version: 2, root: { type: 'ufo' } })) === null);
  check('[60r2] root = null ยังใช้ได้ (ยังไม่เคยมีเลย์เอาต์)',
        PS.deserializeLayout(JSON.stringify({ version: 2, root: null })) !== null);
  check('[60r2] floats ที่ไม่มี panel.id ถูกกรองทิ้ง',
        PS.deserializeLayout(JSON.stringify({ version: 2, root: PL.panel('A'),
          floats: [{ x: 1 }, { panel: { id: 'B' } }] })).floats.length === 1);
}
{
  const { pm: pmR, storage: stR } = mkMgr();
  pmR.registerPanel('tree', { title: 'โปรเจกต์' });
  pmR.showPanel('tree');
  check('[60r2] rememberRatio เก็บค่าที่ลากไว้', pmR.rememberRatio('tree', 0.24) === true);
  check('[60r2] savedRatio อ่านกลับได้', pmR.savedRatio('tree') === 0.24, pmR.savedRatio('tree'));
  check('[60r2] ค่าเดิมซ้ำ → ไม่บันทึกใหม่ (ไม่เขียน storage ทุกเฟรม)',
        pmR.rememberRatio('tree', 0.24) === false);
  check('[60r2] สัดส่วนนอกช่วง → ปฏิเสธ',
        pmR.rememberRatio('tree', 0) === false && pmR.rememberRatio('tree', 1.5) === false &&
        pmR.rememberRatio('tree', NaN) === false);
  check('[60r2] สัดส่วนถูกบันทึกลง storage จริง',
        JSON.parse(stR.getItem('pm-test')).splitRatios.tree === 0.24);
  pmR.reset();
  check('[60r2] reset ล้างสัดส่วนด้วย', pmR.savedRatio('tree') === 0);
}

// ══ [alpha.62 บั๊ก 21] ปิด-เปิดแผงต้องกลับที่เดิมเป๊ะ และไม่ไปแตะแผงอื่น ══
// อาการที่ผู้ใช้เจอ: เอาแผง AI ไปไว้ "ขอบบนของเอกสาร" (dock แนวตั้ง) ปิดแล้วเปิดใหม่
// → ไปโผล่ฝั่งซ้ายจอ เพราะสล็อตถูกตัดทิ้งแล้วต้องเดาตำแหน่งใหม่จากเพื่อนบ้านที่ใกล้ที่สุด
{
  const { pm: pmH } = mkMgr();
  for (const id of ['tree', 'docs', 'ai']) pmH.registerPanel(id, { title: id });
  // โครงจำลองหน้าจอจริง: [ tree | (ai อยู่บน / docs อยู่ล่าง) ]
  pmH.showPanel('tree');
  pmH.dockPanel('docs', 'right', 'tree');       // ลำดับพารามิเตอร์: (id, side, targetId)
  pmH.dockPanel('ai', 'top', 'docs');
  const dockOf = (id) => {
    let hit = null;
    PL.walk(pmH.root, (n) => {
      if (n.type !== 'dock') return;
      const i = (n.children || []).findIndex((c) => c.type === 'panel' && c.id === id);
      if (i >= 0) hit = { dir: n.dir, index: i, dockId: n.id, sizes: (n.sizes || []).slice() };
    });
    return hit;
  };
  const before = dockOf('ai');
  check('[62-21] วางแผง AI ไว้ "บน" เอกสารได้ (dock แนวตั้ง)',
        !!before && before.dir === 'col' && before.index === 0, JSON.stringify(before));
  // ปรับสัดส่วนเองก่อน แล้วค่อยปิด-เปิด — ค่าที่ลากไว้ต้องรอด
  pmH.resize(before.dockId, 0, 0.3);
  const sizesSet = dockOf('ai').sizes.slice();
  const treeDockBefore = dockOf('tree');

  pmH.hidePanel('ai');
  check('[62-21] ปิดแล้วไม่แสดงผล', !pmH.isOpen('ai'));
  check('[62-21] ปิดแล้ว "สล็อต" ยังอยู่ที่เดิมเป๊ะ (dock เดิม · ดัชนีเดิม)',
        JSON.stringify(dockOf('ai')) === JSON.stringify({ ...before, sizes: sizesSet }),
        JSON.stringify(dockOf('ai')));
  check('[62-21] ปิดแล้ว dock ของแผงอื่นไม่ถูกแตะเลย',
        JSON.stringify(dockOf('tree')) === JSON.stringify(treeDockBefore),
        JSON.stringify(dockOf('tree')));

  pmH.showPanel('ai');
  const after = dockOf('ai');
  check('[62-21] เปิดกลับ → อยู่ "บน" เอกสารเหมือนเดิม ไม่เด้งไปฝั่งซ้าย',
        after.dir === 'col' && after.index === 0 && after.dockId === before.dockId,
        JSON.stringify(after));
  check('[62-21] เปิดกลับ → สัดส่วนที่ลากไว้เท่าเดิมเป๊ะ (ไม่ถูกเกลี่ยใหม่)',
        JSON.stringify(after.sizes) === JSON.stringify(sizesSet),
        `${JSON.stringify(after.sizes)} vs ${JSON.stringify(sizesSet)}`);
  check('[62-21] เปิดกลับ → แผงอื่นยังอยู่ที่เดิม ขนาดเดิม',
        JSON.stringify(dockOf('tree')) === JSON.stringify(treeDockBefore),
        JSON.stringify(dockOf('tree')));

  // ปิด-เปิดรัว ๆ 5 รอบ ต้องนิ่งสนิท (อาการเดิมคือ "ขยับทุกครั้ง" สะสมไปเรื่อย ๆ)
  const snap = JSON.stringify(pmH.root);
  for (let i = 0; i < 5; i++) { pmH.hidePanel('ai'); pmH.showPanel('ai'); }
  check('[62-21] ปิด-เปิด 5 รอบ ต้นไม้เหมือนเดิมทุกไบต์',
        JSON.stringify(pmH.root) === snap);

  // ค่าที่บันทึกลง storage ต้องพาธง hidden ไปด้วย → เปิดโปรแกรมใหม่ก็ยังจำว่าปิดไว้ + จำที่อยู่
  pmH.hidePanel('ai');
  const raw = JSON.parse(JSON.stringify(pmH.layout().root));
  const back = PS.deserializeLayout(PS.serializeLayout({ root: raw, floats: [], splitRatios: {} }));
  check('[62-21] ธง hidden รอดการบันทึก/อ่านกลับ (workspace ถูกจำจริง)',
        PL.isPanelHidden(back.root, 'ai') && !PL.isPanelHidden(back.root, 'docs'));
  const afterLoad = (() => { let h = null;
    PL.walk(back.root, (n) => { if (n.type === 'dock') {
      const i = (n.children || []).findIndex((c) => c.type === 'panel' && c.id === 'ai');
      if (i >= 0) h = { dir: n.dir, index: i }; } });
    return h; })();
  check('[62-21] อ่านกลับแล้วสล็อตยังอยู่ "บน" เหมือนเดิม',
        afterLoad && afterLoad.dir === 'col' && afterLoad.index === 0, JSON.stringify(afterLoad));
}

// ที่จับปรับขนาดต้องข้ามแผงที่ถูกซ่อน (ไม่งั้นลากแล้วไปแบ่งกับตัวที่มองไม่เห็น)
{
  const root = PL.dock('row', [PL.panel('a'), PL.panel('b'), PL.panel('c')]);
  const hid = PL.setPanelHidden(root, 'b', true);
  check('[62-21] nodeHidden รู้จักแผงที่ซ่อน', PL.nodeHidden(PL.findPanel(hid, 'b')));
  check('[62-21] container ที่ลูกถูกซ่อนหมด = ถือว่าซ่อนด้วย',
        PL.nodeHidden(PL.setPanelHidden(PL.setPanelHidden(PL.dock('col', [PL.panel('x'), PL.panel('y')]), 'x', true), 'y', true)));
  // a กับ c ติดกันบนจอ (b ซ่อนอยู่) → ลากที่จับต้องแบ่งระหว่าง index 0 กับ 2
  const rs = PL.resizeDockPair(hid, hid.id, 0, 2, 0.25);
  const total = rs.sizes[0] + rs.sizes[2];
  check('[62-21] resizeDockPair แบ่งเฉพาะคู่ที่ระบุ (ข้ามตัวที่ซ่อน)',
        Math.abs(rs.sizes[0] / total - 0.25) < 0.001 && rs.sizes[1] === hid.sizes[1],
        JSON.stringify(rs.sizes));
  check('[62-21] resizeDock เดิมยังทำงานเหมือนเดิม (คู่ติดกัน)',
        Math.abs(PL.resizeDock(root, root.id, 0, 0.5).sizes[0]
                 - PL.resizeDock(root, root.id, 0, 0.5).sizes[1]) < 0.001);
}

console.log(`\npanel: ${pass} ผ่าน, ${fail} ล้มเหลว`);
console.log(fail === 0 ? 'ALL OK' : 'HAS FAILURES');
process.exit(fail === 0 ? 0 : 1);
