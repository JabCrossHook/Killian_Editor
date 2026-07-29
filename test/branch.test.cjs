// test/branch.test.cjs — ทดสอบ branch-graph (เอนจินผังแตกสาย ข้อ 81) ด้วย node
const path = require('path');
const out = require('path').join(require('os').tmpdir(), '_bg.cjs');   // '/tmp' ใช้บน Windows ไม่ได้
require('esbuild').buildSync({ entryPoints: [path.join(__dirname, '../src/branch-graph.js')], outfile: out, format: 'cjs', bundle: true, logLevel: 'silent' });
const BG = require(out);

let pass = 0, fail = 0;
const check = (n, c, i = '') => { if (c) pass++; else { fail++; console.log('  ✗ FAIL:', n, i ? '::' + i : ''); } };

// ฉากทดสอบ: a →(เปิดประตู) b →(หนี) d · a →(หนี) c · c ไม่มีทางเลือก
const scenes = [
  { id: 'a', title: 'เริ่มเรื่อง', chapterName: 'บท 1',
    choices: [{ text: 'เปิดประตู', nextSceneId: 'b' }, { text: 'หนี', nextSceneId: 'c' }] },
  { id: 'b', title: 'ห้องมืด', chapterName: 'บท 1', choices: [{ text: 'เดินต่อ', nextSceneId: 'd' }] },
  { id: 'c', title: 'ทางตัน', chapterName: 'บท 1' },
  { id: 'd', title: 'ตอนจบ', chapterName: 'บท 2' },
  { id: 'z', title: 'ฉากธรรมดา (ไม่อยู่ในผัง)', chapterName: 'บท 2' },
];

// ── buildGraph ──
const g = BG.buildGraph(scenes);
check('buildGraph นับโหนดครบทุกฉาก', g.nodes.length === 5, String(g.nodes.length));
check('buildGraph สร้าง edge ต่อ 1 choice', g.edges.length === 3, String(g.edges.length));
check('edge เก็บ idx อ้างกลับ scenes.json ได้', g.edges[1].from === 'a' && g.edges[1].idx === 1, JSON.stringify(g.edges[1]));
check('ฉากที่ไม่มี choices → choices เป็น []', g.byId.get('c').choices.length === 0);

// ── involvedIds: เฉพาะฉากที่อยู่ในผังจริง ──
const inv = BG.involvedIds(g);
check('ฉากที่ไม่มีใครชี้และไม่มีทางเลือก ไม่อยู่ในผัง', !inv.has('z'));
check('ฉากปลายทางถูกนับเข้าผังแม้ไม่มีทางเลือกเอง', inv.has('d') && inv.has('c'));
check('ผังมี 4 ฉาก', inv.size === 4, String(inv.size));

// ── layoutGraph: จัดชั้นตามความลึก ──
const L = BG.layoutGraph(g);
check('layout วางเฉพาะฉากในผัง', L.placed.length === 4, String(L.placed.length));
check('จุดเริ่มอยู่คอลัมน์ 0', L.depths.get('a') === 0);
check('ฉากถัดจากจุดเริ่ม อยู่คอลัมน์ 1', L.depths.get('b') === 1 && L.depths.get('c') === 1);
check('ฉากลึกสุดอยู่คอลัมน์ 2', L.depths.get('d') === 2, String(L.depths.get('d')));
check('x เพิ่มตามความลึก', L.byId.get('b').x > L.byId.get('a').x);
check('โหนดคอลัมน์เดียวกันไม่ทับกัน (y ต่างกัน)', L.byId.get('b').y !== L.byId.get('c').y);
check('ขนาดผังครอบทุกโหนด', L.width >= BG.PAD * 2 + BG.NODE_W * 3 && L.height > 0, `${L.width}x${L.height}`);

// ── analyzeGraph ──
const a = BG.analyzeGraph(g);
check('หาจุดเริ่มเจอ', a.roots.join() === 'a', a.roots.join());
check('หาตอนจบเจอ (c และ d ไม่มีทางออก)', a.endings.sort().join() === 'c,d', a.endings.join());
check('ไม่มีฉากเข้าไม่ถึง', a.unreachable.length === 0, a.unreachable.join());
check('ไม่มีวงวนซ้ำ', a.cycles.length === 0);
check('ไม่มีทางเลือกห้อย', a.dangling.length === 0);
check('graphSummary บอกจำนวนถูก', BG.graphSummary(a).includes('4 ฉากในผัง') && BG.graphSummary(a).includes('3 ทางเลือก'), BG.graphSummary(a));

// ── ทางเลือกห้อย: ไม่ระบุปลายทาง + ชี้ไปฉากที่ถูกลบ ──
const g2 = BG.buildGraph([
  { id: 'a', title: 'A', choices: [{ text: 'ยังไม่คิด', nextSceneId: '' }, { text: 'ไปฉากผี', nextSceneId: 'ghost' }] },
]);
const a2 = BG.analyzeGraph(g2);
check('ทางเลือกไม่ระบุปลายทาง = dangling', a2.dangling.length === 2, String(a2.dangling.length));
check('edge ที่ปลายทางหายถูกทำเครื่องหมาย dangling', g2.edges.every((e) => e.dangling));
check('dangling ไม่ทำให้ layout พัง', BG.layoutGraph(g2).placed.length === 1);

// ── วงวนซ้ำ: a→b→c→a ──
const gc = BG.buildGraph([
  { id: 'a', title: 'A', choices: [{ text: 'x', nextSceneId: 'b' }] },
  { id: 'b', title: 'B', choices: [{ text: 'x', nextSceneId: 'c' }] },
  { id: 'c', title: 'C', choices: [{ text: 'ย้อนกลับ', nextSceneId: 'a' }] },
]);
const ac = BG.analyzeGraph(gc);
check('ตรวจเจอวงวนซ้ำครบทุกโหนดในวง', ac.cycles.sort().join() === 'a,b,c', ac.cycles.join());
check('วงล้วน = ไม่มีจุดเริ่ม', ac.roots.length === 0);
check('วงล้วนไม่ถูกรายงานว่าเข้าไม่ถึง (ไม่เตือนซ้ำ)', ac.unreachable.length === 0);
check('วงล้วนยังวางผังได้ (ไม่หายจากจอ)', BG.layoutGraph(gc).placed.length === 3);

// ── ฉากที่เข้าไม่ถึง: มีจุดเริ่ม a แต่ b→c วนกันเองอยู่ต่างหาก ──
const gu = BG.buildGraph([
  { id: 'a', title: 'A', choices: [{ text: 'x', nextSceneId: 'd' }] },
  { id: 'd', title: 'D' },
  { id: 'b', title: 'B', choices: [{ text: 'x', nextSceneId: 'c' }] },
  { id: 'c', title: 'C', choices: [{ text: 'x', nextSceneId: 'b' }] },
]);
const au = BG.analyzeGraph(gu);
check('ตรวจเจอฉากที่เดินจากจุดเริ่มไปไม่ถึง', au.unreachable.sort().join() === 'b,c', au.unreachable.join());
check('โหนดที่เข้าไม่ถึงยังถูกวางบนผัง', BG.layoutGraph(gu).placed.length === 4);

// ── enumeratePaths ──
const paths = BG.enumeratePaths(g, 'a');
check('ไล่เส้นทางจากจุดเริ่มได้ 2 สาย', paths.length === 2, JSON.stringify(paths));
check('เส้นทางยาวสุดคือ a→b→d', paths.some((p) => p.join('>') === 'a>b>d'), JSON.stringify(paths));
check('เส้นทางในวงไม่วนไม่รู้จบ', BG.enumeratePaths(gc, 'a').length >= 1 && BG.enumeratePaths(gc, 'a')[0].length === 3);
check('limit จำกัดจำนวนเส้นทาง', BG.enumeratePaths(g, 'a', 1).length === 1);
check('ฉากนอกผัง → ไม่มีเส้นทาง', BG.enumeratePaths(g, 'z').length === 0);

// ── กรณีว่าง: ต้องไม่ throw ──
const ge = BG.buildGraph([]);
check('โปรเจกต์ว่างไม่พัง', BG.layoutGraph(ge).placed.length === 0 && BG.analyzeGraph(ge).total === 0);
check('ขนาดผังว่าง = 0', BG.layoutGraph(ge).width === 0 && BG.layoutGraph(ge).height === 0);
check('buildGraph รับ undefined ได้', BG.buildGraph(undefined).nodes.length === 0);

// ── ข้อ 15: ทางเลือกที่เขียนไว้ในเนื้อฉากจริง — [ไปตลาด] ──
{
  const body = 'เขายืนอยู่หน้าทางแยก\n\n[ไปตลาด] หรือจะ [กลับบ้าน]\n' +
               '![ภาพประกอบ](../Images/a.png)\n' +
               'อ่านเพิ่มที่ [เว็บนี้](https://x.dev)\n' +
               '- [ ] ยังไม่ทำ\n- [x] ทำแล้ว\n' +
               'ย้ำอีกที [ไปตลาด]\n';
  const mk = BG.scanChoiceMarkers(body);
  const texts = BG.markerTexts(mk);
  check('สแกนเจอ [ข้อความ] ทางเลือกในเนื้อฉาก', texts.join('|') === 'ไปตลาด|กลับบ้าน', texts.join('|'));
  check('ไม่นับ ![alt](รูป) เป็นทางเลือก', !texts.includes('ภาพประกอบ'));
  check('ไม่นับ [ข้อความ](ลิงก์) ของ markdown', !texts.includes('เว็บนี้'));
  check('ไม่นับช่องติ๊ก [ ] และ [x]', !texts.includes('x') && !texts.includes(''));
  check('ข้อความซ้ำถูกยุบเหลือรายการเดียว', texts.length === 2, String(texts.length));
  check('marker เก็บตำแหน่งในไฟล์ (เรียงตามที่พบ)',
        mk.length === 3 && mk[0].index < mk[1].index && mk[1].index < mk[2].index,
        JSON.stringify(mk.map((m) => m.index)));

  const d = BG.diffChoiceMarkers(mk, [{ text: 'ไปตลาด', nextSceneId: 'b' }, { text: 'ปีนกำแพง' }]);
  check('missing = มีในข้อความแต่ยังไม่เป็นทางเลือก', d.missing.join() === 'กลับบ้าน', d.missing.join());
  check('orphan = เป็นทางเลือกแต่ไม่มีข้อความในฉาก', d.orphan.join() === 'ปีนกำแพง', d.orphan.join());
  check('linked = ผูกกันเรียบร้อยแล้ว', d.linked.join() === 'ไปตลาด', d.linked.join());

  check('ฉากว่าง/undefined ไม่พัง',
        BG.scanChoiceMarkers('').length === 0 && BG.scanChoiceMarkers(undefined).length === 0);
  check('diff กับ choices ที่ไม่มี ไม่พัง', BG.diffChoiceMarkers([], undefined).missing.length === 0);
  check('วงเล็บว่าง [] ไม่ถูกนับ', BG.scanChoiceMarkers('ข้อความ [] ต่อ').length === 0);
  check('buildGraph เก็บ body ไว้ให้ UI เทียบได้',
        BG.buildGraph([{ id: 'a', body: 'x [ไปตลาด]' }]).byId.get('a').body === 'x [ไปตลาด]');
}

// ── layout ต้องไม่วางกล่องทับกัน แม้ทุกฉากอยู่ชั้นเดียวกัน ──
{
  const wide = BG.buildGraph([
    { id: 'r', title: 'ราก', choices: ['a', 'b', 'c', 'd'].map((t) => ({ text: t, nextSceneId: t })) },
    ...['a', 'b', 'c', 'd'].map((id) => ({ id, title: id })),
  ]);
  const lay = BG.layoutGraph(wide);
  const seen = new Set(lay.placed.map((p) => p.x + ':' + p.y));
  check('โหนดชั้นเดียวกันไม่ทับกัน (พิกัดไม่ซ้ำ)', seen.size === lay.placed.length,
        `${seen.size}/${lay.placed.length}`);
  check('ความสูงผังครอบคลุมทุกแถว',
        lay.height >= Math.max(...lay.placed.map((p) => p.y)) + BG.NODE_H, String(lay.height));
  check('ความกว้างผังครอบคลุมทุกคอลัมน์',
        lay.width >= Math.max(...lay.placed.map((p) => p.x)) + BG.NODE_W, String(lay.width));
}

console.log(`branch-graph: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
