// test/sp-format.test.cjs — unit test เอนจินรูปแบบบทภาพยนตร์ (ข้อ 81–85, 92, 97)
const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');

const tmp = path.join(os.tmpdir(), 'k2-spformat-test.cjs');
esbuild.buildSync({
  entryPoints: [path.join(__dirname, '..', 'src', 'sp-format.js')],
  outfile: tmp, bundle: true, format: 'cjs', platform: 'node', logLevel: 'silent',
});
const SF = require(tmp);

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' | ' + extra : '')); }
}

// ── 85 ขนาดกระดาษ + ระยะขอบ ──
check('มีขนาดกระดาษ letter/a4/custom', !!(SF.PAPER_SIZES.letter && SF.PAPER_SIZES.a4 && SF.PAPER_SIZES.custom));
check('Letter = 8.5 × 11 นิ้ว', SF.PAPER_SIZES.letter.width === 8.5 && SF.PAPER_SIZES.letter.height === 11);
check('A4 = 8.27 × 11.69 นิ้ว', SF.PAPER_SIZES.a4.width === 8.27 && SF.PAPER_SIZES.a4.height === 11.69);
check('ระยะขอบเริ่มต้น T1 B1 L1.5 R1',
  SF.MARGIN_DEFAULTS.top === 1 && SF.MARGIN_DEFAULTS.bottom === 1 &&
  SF.MARGIN_DEFAULTS.left === 1.5 && SF.MARGIN_DEFAULTS.right === 1);
check('Letter + ขอบเริ่มต้น = 54 บรรทัด/หน้า', SF.linesPerPage(SF.PAPER_SIZES.letter, SF.MARGIN_DEFAULTS) === 54,
  SF.linesPerPage(SF.PAPER_SIZES.letter, SF.MARGIN_DEFAULTS));
check('A4 สูงกว่า → บรรทัดต่อหน้ามากกว่า Letter',
  SF.linesPerPage(SF.PAPER_SIZES.a4, SF.MARGIN_DEFAULTS) > SF.linesPerPage(SF.PAPER_SIZES.letter, SF.MARGIN_DEFAULTS));
check('ความกว้างพื้นที่พิมพ์ Letter = 6 นิ้ว', SF.textWidth(SF.PAPER_SIZES.letter, SF.MARGIN_DEFAULTS) === 6);
check('ขอบมากขึ้น → บรรทัดต่อหน้าน้อยลง',
  SF.linesPerPage(SF.PAPER_SIZES.letter, { top: 2, bottom: 2, left: 1.5, right: 1 }) === 42);

// ── 81 ระยะเยื้อง/ความกว้าง ──
check('ตัวละครเยื้อง 3.7 นิ้ว กว้าง 3.8', SF.SP_ELEMENT_CONFIG.character.indent === 3.7 && SF.SP_ELEMENT_CONFIG.character.width === 3.8);
check('บทพูดเยื้อง 2.5 นิ้ว กว้าง 3.5', SF.SP_ELEMENT_CONFIG.dialogue.indent === 2.5 && SF.SP_ELEMENT_CONFIG.dialogue.width === 3.5);
check('วงเล็บเยื้อง 3.1 นิ้ว กว้าง 2.9', SF.SP_ELEMENT_CONFIG.parenthetical.indent === 3.1 && SF.SP_ELEMENT_CONFIG.parenthetical.width === 2.9);
check('ทรานซิชันเยื้อง 6.0 นิ้ว', SF.SP_ELEMENT_CONFIG.transition.indent === 6.0);
check('มี element ครบทุกตัวใน SP_ELEMENT_KEYS', SF.SP_ELEMENT_KEYS.length >= 15, SF.SP_ELEMENT_KEYS.length);

// ── 82 ระยะเว้นบรรทัด ──
check('หัวฉากเว้น 2 บรรทัดก่อน (linesBefore 20)', SF.SP_ELEMENT_CONFIG.scene.linesBefore === 20);
check('บทพูดไม่เว้นก่อน (linesBefore 0)', SF.SP_ELEMENT_CONFIG.dialogue.linesBefore === 0);

// ── ผสานค่าผู้ใช้ ──
const merged = SF.mergeSpFormat({ margins: { left: 2 }, elements: { dialogue: { indent: 3 } } });
check('merge: ขอบซ้ายที่ผู้ใช้ตั้งชนะ', merged.margins.left === 2);
check('merge: ขอบอื่นยังเป็นค่าเริ่มต้น', merged.margins.top === 1 && merged.margins.right === 1);
check('merge: indent ที่ผู้ใช้ตั้งชนะ', merged.elements.dialogue.indent === 3);
check('merge: width ของ element เดิมยังอยู่', merged.elements.dialogue.width === 3.5);
check('merge: ไม่แก้ค่าคงที่ต้นฉบับ', SF.SP_ELEMENT_CONFIG.dialogue.indent === 2.5);
check('merge: paperSize ที่ไม่รู้จัก → letter', SF.mergeSpFormat({ paperSize: 'zzz' }).paperSize === 'letter');
check('merge: custom ใช้ขนาดที่กรอกเอง',
  SF.mergeSpFormat({ paperSize: 'custom', paper: { width: 7, height: 9 } }).paper.width === 7);

// ── CSS ──
const vars = SF.pageCssVars(SF.mergeSpFormat({}));
check('pageCssVars มี --page-w = 8.5in', vars['--page-w'] === '8.5in', vars['--page-w']);
check('pageCssVars มี --mg-left = 1.5in', vars['--mg-left'] === '1.5in');
check('pageCssVars มี --text-w = 6in', vars['--text-w'] === '6in', vars['--text-w']);
const css = SF.spCss(SF.mergeSpFormat({}));
check('spCss มีกฎ .sp.sp-character', css.includes('.sp.sp-character{'));
check('spCss: ตัวละคร margin-left = 3.7-1.5 = 2.2in', css.includes('margin-left:2.2in'), css.slice(css.indexOf('.sp.sp-character'), css.indexOf('.sp.sp-character') + 90));
check('spCss: ตัวละครกว้าง 3.8in', /\.sp\.sp-character\{[^}]*width:3\.8in/.test(css));
check('spCss: ตัวละครเป็นตัวพิมพ์ใหญ่บนจอ', /\.sp\.sp-character\{[^}]*text-transform:uppercase/.test(css));
check('spCss: ทรานซิชันถูกหนีบไม่ให้ล้นขอบขวา (6.0+2.0 > 7.5 → กว้าง 1.5in)',
  /\.sp\.sp-transition\{[^}]*width:1\.5in/.test(css), css.slice(css.indexOf('.sp.sp-transition'), css.indexOf('.sp.sp-transition') + 80));
check('spCss: element ที่ไม่ล้นคงความกว้างเดิม', /\.sp\.sp-dialogue\{[^}]*width:3\.5in/.test(css));
check('spCss: มีบล็อก @media print', css.includes('@media print{'));
check('spCss: มี @page ขนาด 8.5in 11in', css.includes('@page{size:8.5in 11in'), css.slice(css.indexOf('@page'), css.indexOf('@page') + 90));
check('spCss: @page ระยะขอบ 1in 1in 1in 1.5in', css.includes('margin:1in 1in 1in 1.5in'));
check('spCss: เปลี่ยนกระดาษเป็น A4 แล้ว @page ตาม',
  SF.spCss(SF.mergeSpFormat({ paperSize: 'a4' })).includes('@page{size:8.27in 11.69in'));
check('spCss: วงเล็บเอียงบนจอ แต่ไม่เอียงตอนพิมพ์',
  /\.sp\.sp-parenthetical\{[^}]*font-style:italic/.test(css.split('@media print{')[0]) &&
  /\.sp\.sp-parenthetical\{[^}]*font-style:normal/.test(css.split('@media print{')[1]));
check('spCss: ขอบซ้ายเปลี่ยน → margin-left ของ element เลื่อนตาม',
  SF.spCss(SF.mergeSpFormat({ margins: { left: 1 } })).includes('margin-left:2.7in'));

// ── 83 สไตล์ screen/print ──
check('สไตล์ตอนพิมพ์ของ act-break ขีดเส้นใต้', SF.SP_ELEMENT_STYLES['act-break'].print.underline === true);
check('สไตล์บนจอของ act-break ไม่ขีดเส้นใต้', SF.SP_ELEMENT_STYLES['act-break'].screen.underline === false);
const st = SF.mergeSpFormat({ styles: { dialogue: { print: { bold: true } } } });
check('merge สไตล์: print.bold ที่ตั้งเองชนะ', st.styles.dialogue.print.bold === true);
check('merge สไตล์: screen ของ dialogue ยังเป็นค่าเดิม', st.styles.dialogue.screen.bold === false);

// ── wrapLines ──
check('wrapLines: ข้อความสั้น = 1 บรรทัด', SF.wrapLines('สวัสดี', 6) === 1);
check('wrapLines: ว่าง = 1 บรรทัด', SF.wrapLines('', 6) === 1);
check('wrapLines: 100 ตัวอักษร กว้าง 3.5in (35 คอลัมน์) ≥ 3 บรรทัด',
  SF.wrapLines('a '.repeat(50).trim(), 3.5) >= 3, SF.wrapLines('a '.repeat(50).trim(), 3.5));
check('wrapLines: กว้างขึ้น → บรรทัดน้อยลง',
  SF.wrapLines('word '.repeat(60), 6) < SF.wrapLines('word '.repeat(60), 2));

// ── 84 pagination ──
const many = [];
for (let i = 0; i < 40; i++) many.push({ el: 'action', text: 'บรรยายฉากที่ ' + i });
const pg = SF.paginate(many, { lines: 20 });
check('paginate: บทยาว → หลายหน้า', pg.count > 1, pg.count);
check('paginate: ทุกหน้ามีบล็อก', pg.pages.every((p) => p.blocks.length > 0));
check('paginate: หน้าแรกไม่เกินจำนวนบรรทัดต่อหน้า',
  pg.pages[0].blocks.reduce((a, b) => a + (b.lines || 1) + 1, 0) <= 22);
check('paginate: หน้าที่ไม่ใช่หน้าสุดท้ายมี (CONTINUED)', pg.pages[0].continuedBottom === '(CONTINUED)');
check('paginate: หน้าที่ 2 มี CONTINUED: ด้านบน', pg.pages[1].continuedTop === 'CONTINUED:');
check('paginate: บทว่าง → 1 หน้า', SF.paginate([]).count === 1);
check('pageCount ตรงกับ paginate().count', SF.pageCount(many, { lines: 20 }) === pg.count);

// บทพูดยาวข้ามหน้า → ต้องมี (MORE) + ทวนชื่อ + (cont'd)
const longDlg = [
  { el: 'action', text: 'x '.repeat(30) },
  { el: 'character', text: 'ทอร่า' },
  { el: 'dialogue', text: 'คำพูดยาวมาก '.repeat(40) },
];
const pd = SF.paginate(longDlg, { lines: 14 });
const flat = pd.pages.flatMap((p) => p.blocks);
check('paginate: บทพูดข้ามหน้ามี (MORE)', flat.some((b) => b.el === 'more' && b.text === '(MORE)'),
  JSON.stringify(flat.map((b) => b.el)));
check("paginate: ต้นหน้าใหม่ทวนชื่อ + (cont'd)",
  flat.some((b) => b.el === 'character' && b.contd && b.text.includes("(cont'd)")));
check('paginate: บทพูดถูกแบ่งเป็น head/tail', flat.some((b) => b.split === 'head') && flat.some((b) => b.split === 'tail'));

// ชื่อตัวละครต้องไม่ค้างท้ายหน้าโดยไม่มีบทพูด
const orphan = [];
for (let i = 0; i < 9; i++) orphan.push({ el: 'action', text: 'บรรทัด ' + i });
orphan.push({ el: 'character', text: 'คัสซี่' });
orphan.push({ el: 'dialogue', text: 'ก '.repeat(60) });
const po = SF.paginate(orphan, { lines: 12 });
const lastOfFirst = po.pages[0].blocks[po.pages[0].blocks.length - 1];
check('paginate: ชื่อตัวละครไม่ค้างท้ายหน้าเดี่ยว ๆ',
  !(lastOfFirst && lastOfFirst.el === 'character' && !po.pages[0].blocks.some((b) => b.el === 'dialogue')),
  lastOfFirst && lastOfFirst.el);

// กฎที่ตั้งเองมีผลจริง
const strict = SF.paginate(longDlg, { lines: 14, fmt: SF.mergeSpFormat({ rules: { minDialogueLinesAtBottom: 99 } }) });
check('paginate: ตั้ง minDialogueLinesAtBottom สูง → ไม่แบ่งบทพูด',
  !strict.pages.flatMap((p) => p.blocks).some((b) => b.split === 'head'));

// splitText
const sp = SF.splitText('one two three four five six seven eight nine ten', 1, 2);
check('splitText: คืน head และ rest', !!sp.head && !!sp.rest);
check('splitText: รวมกันแล้วได้คำครบ',
  (sp.head + ' ' + sp.rest).split(/\s+/).length === 10, sp.head + ' || ' + sp.rest);

// ── 92 ข้อความมาตรฐาน ──
check('SP_STRINGS ครบ 4 ตัวหลัก',
  SF.SP_STRINGS.continuedBottom === '(CONTINUED)' && SF.SP_STRINGS.continuedTop === 'CONTINUED:' &&
  SF.SP_STRINGS.dialogueMore === '(MORE)' && SF.SP_STRINGS.dialogueContd === "(cont'd)");
const thStr = SF.mergeSpFormat({ strings: { dialogueMore: '(ต่อ)' } });
check('merge: ข้อความที่ผู้ใช้ตั้งชนะ', thStr.strings.dialogueMore === '(ต่อ)');
check('merge: ข้อความอื่นยังเป็นค่าเริ่มต้น', thStr.strings.continuedTop === 'CONTINUED:');
const pgTh = SF.paginate(longDlg, { lines: 14, fmt: thStr });
check('paginate ใช้ข้อความที่ผู้ใช้ตั้ง',
  pgTh.pages.flatMap((p) => p.blocks).some((b) => b.el === 'more' && b.text === '(ต่อ)'));

// ── 97 หน้ารายชื่อตัวละคร ──
const r0 = SF.newRoster();
check('newRoster: หัวเรื่องเป็น Cast of Characters', r0.title === 'Cast of Characters');
check('newRoster: แสดง Scene/Time เป็นค่าเริ่มต้น', r0.showScene === true && r0.showTime === true);
check('normalizeRoster: ข้อมูลพังกลับเป็นค่าตั้งต้น', SF.normalizeRoster(null).characters.length === 0);
check('normalizeRoster: กรองตัวละครให้เป็น {name,detail} เสมอ',
  SF.normalizeRoster({ characters: [{ name: 'A' }, 'x'] }).characters.length === 2 &&
  SF.normalizeRoster({ characters: [{ name: 'A' }] }).characters[0].detail === '');
const rTxt = SF.rosterToText({
  characters: [{ name: 'Donald Bradleyson', detail: 'นักสืบวัย 40' }, { name: 'Tora', detail: 'เจ้าของร้านเบเกอรี่' }],
  scene: 'กรุงเทพฯ ปี 2025', time: 'ฤดูฝน',
});
check('rosterToText: บรรทัดแรกเป็นหัวเรื่องจัดกลาง',
  rTxt.split('\n')[0].trim() === 'Cast of Characters' && rTxt.split('\n')[0].startsWith(' '));
check('rosterToText: ชื่อตัวละครตามด้วย :', rTxt.includes('Donald Bradleyson:'));
check('rosterToText: รายละเอียดคั่นด้วย tab', rTxt.includes('Donald Bradleyson:\tนักสืบวัย 40'));
check('rosterToText: เว้นบรรทัดระหว่างตัวละคร', /Donald Bradleyson:[^\n]*\n\nTora:/.test(rTxt));
check('rosterToText: มีหัวข้อ Scene และ Time', rTxt.includes('Scene') && rTxt.includes('Time'));
check('rosterToText: ปิด Scene แล้วไม่มีหัวข้อ Scene',
  !SF.rosterToText({ scene: 'x', showScene: false }).includes('Scene'));
check('rosterToText: ไม่มีเลขหน้า', !/^\s*\d+\s*$/m.test(rTxt));

console.log(`\n${pass} passed, ${fail} failed`);
try { fs.unlinkSync(tmp); } catch {}
if (fail) process.exit(1);
