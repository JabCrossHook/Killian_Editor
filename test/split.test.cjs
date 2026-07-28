// test/split.test.cjs — ทดสอบ split-layout ด้วย node
const path = require('path');
const slOut = require('path').join(require('os').tmpdir(), '_sl.cjs');   // '/tmp' ใช้บน Windows ไม่ได้
require('esbuild').buildSync({ entryPoints: [path.join(__dirname, '../src/layout/split-layout.js')], outfile: slOut, format: 'cjs', bundle: true, logLevel: 'silent' });
const SL = require(slOut);

let pass = 0, fail = 0;
const check = (n, c, i = '') => { if (c) pass++; else { fail++; console.log('  ✗ FAIL:', n, i ? '::' + i : ''); } };

// ── splitPane: ลากไปขอบ ──
let root = SL.leaf('doc1');
root = SL.splitPane(root, root.id, 'right', 'doc2');
check('split ขวา → row [doc1,doc2]', root.type === 'split' && root.dir === 'row' && SL.tabIds(root).join() === 'doc1,doc2', SL.tabIds(root));

root = SL.leaf('a');
root = SL.splitPane(root, root.id, 'bottom', 'b');
check('split ล่าง → col [a,b]', root.type === 'split' && root.dir === 'col' && SL.tabIds(root).join() === 'a,b');

root = SL.leaf('a');
root = SL.splitPane(root, root.id, 'left', 'b');
check('split ซ้าย → row [b,a] (ใหม่อยู่ซ้าย)', SL.tabIds(root).join() === 'b,a', SL.tabIds(root));

// ── recursive split ──
let r = SL.leaf('a');
r = SL.splitPane(r, r.id, 'right', 'b');            // row[a,b]
const bLeaf = (() => { let id = null; SL.walk(r, (n) => { if (n.type === 'leaf' && n.tabId === 'b') id = n.id; }); return id; })();
r = SL.splitPane(r, bLeaf, 'bottom', 'c');          // b กลายเป็น col[b,c]
check('recursive: split b ลง → col ซ้อนใน row', SL.tabIds(r).sort().join() === 'a,b,c', SL.tabIds(r));
check('recursive: โครงถูก (row มี leaf + split)', r.type === 'split' && r.dir === 'row' && r.children.some((c) => c.type === 'split'));

// ── split ทิศเดียวกันต่อเนื่อง → แทรกพี่น้อง (ไม่ซ้อน) ──
let r2 = SL.leaf('x');
r2 = SL.splitPane(r2, r2.id, 'right', 'y');
const yLeaf = (() => { let id = null; SL.walk(r2, (n) => { if (n.tabId === 'y') id = n.id; }); return id; })();
r2 = SL.splitPane(r2, yLeaf, 'right', 'z');
check('split row ต่อเนื่อง → children เดียว [x,y,z]', r2.type === 'split' && r2.children.length === 3, 'n=' + r2.children.length);

// ── resize + snap 50% ──
let rd = SL.splitPane(SL.leaf('a'), 'lroot', 'right', 'b');   // note: target id ไม่ตรง → กลายเป็น root split
rd = SL.leaf('a'); rd = SL.splitPane(rd, rd.id, 'right', 'b');
rd = SL.resizeSplit(rd, rd.id, 0, 0.7);
check('resize → 0.7/0.3', Math.abs(rd.sizes[0] - 0.7) < 0.01 && Math.abs(rd.sizes[1] - 0.3) < 0.01, rd.sizes.join());
rd = SL.resizeSplit(rd, rd.id, 0, 0.52);
check('snap 50% (0.52 → 0.5)', rd.sizes[0] === 0.5 && rd.sizes[1] === 0.5, rd.sizes.join());
rd = SL.resizeSplit(rd, rd.id, 0, 0.99);
check('resize clamp ≤0.95', rd.sizes[0] <= 0.95, rd.sizes.join());

// ── removeLeaf + collapse ──
let rr = SL.leaf('a'); rr = SL.splitPane(rr, rr.id, 'right', 'b');
const bId = (() => { let id = null; SL.walk(rr, (n) => { if (n.tabId === 'b') id = n.id; }); return id; })();
rr = SL.removeLeaf(rr, bId);
check('removeLeaf b → ยุบเหลือ leaf a', rr.type === 'leaf' && rr.tabId === 'a', JSON.stringify(rr));

// ── store: serialize/deserialize + version ──
const layout = SL.splitPane(SL.leaf('a'), 'x', 'right', 'b');
const s2 = SL.leaf('a'); const tree = SL.splitPane(s2, s2.id, 'bottom', 'b');
const str = SL.serializeSplit(tree);
const back = SL.deserializeSplit(str);
check('serialize/deserialize round-trip', back && SL.tabIds(back).join() === 'a,b', back && SL.tabIds(back));
check('version ถูกฝัง', JSON.parse(str).version === SL.SPLIT_VERSION);
check('migrate v0 → v1', (() => { const r = SL.deserializeSplit(JSON.stringify({ root: SL.leaf('old') })); return r && r.tabId === 'old'; })());
check('version อนาคต → null', SL.deserializeSplit(JSON.stringify({ version: 999, root: {} })) === null);

// ── SplitStore ด้วย mock storage ──
const mem = new Map();
const mock = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
const store = new SL.SplitStore(mock, 'sk');
let notified = 0; store.onChange(() => notified++);
store.update(tree);
check('SplitStore.update แจ้ง listener + บันทึก', notified === 1);
const store2 = new SL.SplitStore(mock, 'sk');
check('SplitStore.load คืนค่าเดิม', store2.load() && SL.tabIds(store2.root).join() === 'a,b', store2.root && SL.tabIds(store2.root));

// ── dropZone (ลากแท็บไปขอบ pane) ──
const rect = { x: 0, y: 0, w: 200, h: 100 };
check('dropZone ซ้าย', SL.dropZone(5, 50, rect) === 'left');
check('dropZone ขวา', SL.dropZone(195, 50, rect) === 'right');
check('dropZone บน', SL.dropZone(100, 3, rect) === 'top');
check('dropZone ล่าง', SL.dropZone(100, 97, rect) === 'bottom');
check('dropZone กลาง', SL.dropZone(100, 50, rect) === 'center');
check('dropZone นอกกรอบ → null', SL.dropZone(-5, 50, rect) === null);

// ── recursive ลึกหลายชั้น ──
let deep = SL.leaf('a');
deep = SL.splitPane(deep, deep.id, 'right', 'b');
deep = SL.splitPane(deep, SL.findLeafByTab(deep, 'b').id, 'bottom', 'c');
deep = SL.splitPane(deep, SL.findLeafByTab(deep, 'c').id, 'right', 'd');
check('recursive 3 ชั้น → 4 pane', SL.paneCount(deep) === 4, 'n=' + SL.paneCount(deep));
check('splitDepth ≥ 3', SL.splitDepth(deep) >= 3, 'd=' + SL.splitDepth(deep));
check('findLeafByTab หา pane จาก tabId ได้', SL.findLeafByTab(deep, 'd').tabId === 'd' && SL.findLeafByTab(deep, 'zz') === null);

// ── setLeafTab / moveTabToPane ──
let mv = SL.leaf('a');
mv = SL.splitPane(mv, mv.id, 'right', 'b');
const aId = SL.findLeafByTab(mv, 'a').id;
const swapped = SL.setLeafTab(mv, aId, 'z');
check('setLeafTab เปลี่ยนแท็บใน pane', SL.tabIds(swapped).join() === 'z,b');

let mv2 = SL.leaf('a');
mv2 = SL.splitPane(mv2, mv2.id, 'right', 'b');       // row[a,b]
mv2 = SL.splitPane(mv2, SL.findLeafByTab(mv2, 'b').id, 'bottom', 'c');
mv2 = SL.moveTabToPane(mv2, 'c', SL.findLeafByTab(mv2, 'a').id, 'bottom');
check('moveTabToPane: ย้าย c ไปใต้ a → ยังมี 3 pane ไม่ซ้ำ', SL.tabIds(mv2).sort().join() === 'a,b,c' && SL.paneCount(mv2) === 3, SL.tabIds(mv2));
check('moveTabToPane: pane เดิมของ c ถูกยุบ (b กลับเป็น leaf)', (() => {
  const b = SL.findLeafByTab(mv2, 'b'); return !!b;
})());
const same = SL.moveTabToPane(mv2, 'a', SL.findLeafByTab(mv2, 'a').id, 'right');
check('moveTabToPane ลากกลับที่เดิม → ไม่เปลี่ยน', SL.paneCount(same) === 3, 'n=' + SL.paneCount(same));
const center = SL.moveTabToPane(mv2, 'c', SL.findLeafByTab(mv2, 'b').id, 'center');
check('moveTabToPane center → แทนที่แท็บ (เหลือ 2 pane)', SL.paneCount(center) === 2 && SL.tabIds(center).includes('c'), SL.tabIds(center));

// ── closeTab / removeLeaf ราก / pruneTabs ──
const solo = SL.leaf('solo');
check('removeLeaf pane สุดท้าย → null', SL.removeLeaf(solo, solo.id) === null);
let ct = SL.leaf('a'); ct = SL.splitPane(ct, ct.id, 'right', 'b');
check('closeTab ปิดจาก tabId', SL.tabIds(SL.closeTab(ct, 'b')).join() === 'a');
check('pruneTabs ตัด pane ที่แท็บถูกปิดแล้ว', SL.tabIds(SL.pruneTabs(deep, ['a', 'c'])).sort().join() === 'a,c', SL.tabIds(SL.pruneTabs(deep, ['a', 'c'])));
check('pruneTabs ตัดหมด → null', SL.pruneTabs(ct, []) === null);

// ── SplitManager ──
const memS = new Map();
const mockS = { getItem: (k) => (memS.has(k) ? memS.get(k) : null), setItem: (k, v) => memS.set(k, v), removeItem: (k) => memS.delete(k) };
const sm = new SL.SplitManager({ storage: mockS, key: 'sm-test' });
sm.open('sc1');
check('SplitManager.open pane แรก', sm.paneCount() === 1 && sm.activeTabId() === 'sc1');
sm.splitWith('sc2', 'right');
check('splitWith → 2 pane + โฟกัสไปตัวใหม่', sm.paneCount() === 2 && sm.activeTabId() === 'sc2', sm.tabs().join());
sm.splitWith('sc3', 'bottom');
check('splitWith ต่อจาก pane ที่โฟกัส → 3 pane', sm.paneCount() === 3, sm.tabs().join());
sm.open('sc9');
check('open ในขณะมี pane → แทนที่แท็บใน pane ที่โฟกัส', sm.paneCount() === 3 && sm.tabs().includes('sc9') && !sm.tabs().includes('sc3'));
sm.close('sc9');
check('close → ยุบเหลือ 2 pane', sm.paneCount() === 2, sm.tabs().join());
check('โฟกัสถูกย้ายไป pane ที่ยังอยู่', !!sm.activeTabId() && sm.tabs().includes(sm.activeTabId()));
sm.syncWithPanels(['sc1']);
check('syncWithPanels ตัดแท็บที่ถูกปิดจากระบบอื่น', sm.tabs().join() === 'sc1', sm.tabs().join());

const sm2 = new SL.SplitManager({ storage: mockS, key: 'sm-test' });
check('SplitManager.load กู้เลย์เอาต์', sm2.load() && sm2.tabs().join() === 'sc1');
sm2.close('sc1');
check('ปิด pane สุดท้าย → root ว่าง', sm2.root === null && sm2.paneCount() === 0);
sm2.open('ใหม่');
check('เปิดใหม่หลังว่าง → กลับมาได้', sm2.paneCount() === 1 && sm2.activeTabId() === 'ใหม่');

console.log(`\nsplit: ${pass} ผ่าน, ${fail} ล้มเหลว`);
console.log(fail === 0 ? 'ALL OK' : 'HAS FAILURES');
process.exit(fail === 0 ? 0 : 1);
