import { parseScript, lineFor } from '../src/fountain.js';
const md = [
  '. ตลาด - เย็น',
  'INT. บ้านโทระ - NIGHT',
  '!ลมพัดผ่านตลาดเก่า',
  'ผู้คนเดินขวักไขว่ยามเย็น.',
  '',
  '@โทระ',
  '(กระซิบ)',
  'สวัสดีครับ ยัยแมว',
  'ผมมีเรื่องจะบอก',
  '',
  '>CUT TO:',
  '# องก์หนึ่ง',
  '= โทระพบความลับ',
  '((โน้ตถึงตัวเอง))',
  '$shot มุมกว้างตลาด',
].join('\n');
const blocks = parseScript(md);
const expect = ['scene','scene','action','action','blank','character','parenthetical',
  // $shot กลายเป็น element 'shot' ตั้งแต่ [50] — เทสเดิมยังคาดหวัง 'raw' อยู่ (ไม่ได้อยู่ใน test:unit จึงไม่มีใครเห็น)
  'dialogue','dialogue','blank','transition','outline1','summary','note','shot'];
const got = blocks.map((b) => b.el);
if (JSON.stringify(got) !== JSON.stringify(expect))
  throw new Error('classify mismatch: ' + JSON.stringify(got));
console.log('classify OK');
// serialize กลับต้อง classify ได้เหมือนเดิม (round-trip เชิงความหมาย)
let prevBlank = true, prevType = 'action';
const out = [];
for (const b of blocks) {
  const line = lineFor(b.el === 'blank' ? 'blank' : b.el, b.text, prevBlank, prevType);
  out.push(line);
  if (line.trim() === '') { prevBlank = true; } else { prevBlank = false; prevType = b.el; }
}
const re = parseScript(out.join('\n'));
const got2 = re.map((b) => b.el);
if (JSON.stringify(got2) !== JSON.stringify(expect))
  throw new Error('re-classify mismatch: ' + JSON.stringify(got2) + '\n' + out.join('\n'));
for (let i = 0; i < blocks.length; i++)
  if (re[i].text !== blocks[i].text)
    throw new Error(`text drift line ${i}: ${JSON.stringify(re[i].text)} vs ${JSON.stringify(blocks[i].text)}`);
console.log('round-trip OK');

// ═══════ alpha.57a ข้อ 2 — element ใหม่ + ส่วนเสริมท้ายชื่อตัวละคร ═══════
import { splitCharacter, withExtension, SP_ELEMS, TAB_CYCLE, NEXT_ELEM,
         TRANSITIONS_IN, INTERCUTS } from '../src/fountain.js';
let n = 0;
const t = (name, cond, extra) => {
  if (!cond) throw new Error('FAIL ' + name + (extra !== undefined ? ' | ' + extra : ''));
  n++;
};

// -- round-trip ของ element ใหม่ (ต้องอ่านกลับได้ชนิดเดิม + ข้อความเดิมเป๊ะ) --
const md2 = ['$in FADE IN:', '$sub ห้องครัว - ต่อเนื่อง', '$intercut INTERCUT WITH:'].join('\n');
const b2 = parseScript(md2);
t('element ใหม่ถูก classify ถูกชนิด',
  JSON.stringify(b2.map((b) => b.el)) === JSON.stringify(['transition-in', 'subheader', 'intercut']),
  JSON.stringify(b2.map((b) => b.el)));
t('ข้อความไม่ติด prefix มาด้วย', b2[0].text === 'FADE IN:' && b2[1].text === 'ห้องครัว - ต่อเนื่อง');
const out2 = b2.map((b, i) => lineFor(b.el, b.text, i === 0, i ? b2[i - 1].el : 'action'));
t('serialize กลับได้ไฟล์เดิมเป๊ะ', out2.join('\n') === md2, out2.join(' | '));
const re2 = parseScript(out2.join('\n'));
t('อ่านซ้ำได้ชนิดเดิม (round-trip ปิดวง)',
  JSON.stringify(re2.map((b) => b.el)) === JSON.stringify(b2.map((b) => b.el)));

// -- ไม่ไปทับ element เดิม --
t('ทรานซิชันออกแบบเดิม (>) ยังทำงาน', parseScript('>CUT TO:')[0].el === 'transition');
t('$shot / $act เดิมไม่โดนแย่ง',
  parseScript('$shot มุมกว้าง')[0].el === 'shot' && parseScript('$act องก์ 2')[0].el === 'act-break');
t('ข้อความธรรมดาที่ขึ้นต้นด้วย $ แต่ไม่ใช่คำสั่ง ไม่กลายเป็น element ใหม่',
  parseScript('$100 ต่อวัน')[0].el !== 'transition-in');

// -- ทะเบียน element ครบทุกที่ --
for (const k of ['transition-in', 'subheader', 'intercut']) {
  t('SP_ELEMS มี ' + k + ' พร้อมชื่อไทย', !!SP_ELEMS[k] && SP_ELEMS[k].th.length > 1);
  t('TAB_CYCLE มี ' + k, TAB_CYCLE.includes(k));
  t('NEXT_ELEM มี ' + k, !!NEXT_ELEM[k]);
}
t('มีรายการทรานซิชันเข้าให้ SmartType เดา', TRANSITIONS_IN.some((x) => /FADE IN/i.test(x)));
t('มีรายการสลับฉากให้ SmartType เดา', INTERCUTS.some((x) => /INTERCUT/i.test(x)));

// -- ส่วนเสริม (Extension): อยู่บรรทัดเดียวกับชื่อ เว้น "1 วรรค" พอดี --
t('แยกชื่อกับส่วนเสริมได้',
  splitCharacter('สมชาย (V.O.)').name === 'สมชาย' && splitCharacter('สมชาย (V.O.)').ext === '(V.O.)');
t('ไม่มีส่วนเสริม → ext ว่าง', splitCharacter('สมชาย').ext === '' && splitCharacter('สมชาย').name === 'สมชาย');
t('เว้นวรรคเกินก็แยกได้', splitCharacter('สมชาย    (O.S.)').name === 'สมชาย');
t('ประกอบกลับเว้น 1 วรรคเสมอ', withExtension('สมชาย    (O.S.)', '(V.O.)') === 'สมชาย (V.O.)',
  JSON.stringify(withExtension('สมชาย    (O.S.)', '(V.O.)')));
t('ใส่ส่วนเสริมทับของเดิม (ไม่ซ้อนกัน)', withExtension('สมชาย (V.O.)', "(CONT'D)") === "สมชาย (CONT'D)");
t('ส่วนเสริมว่าง = ถอดออก', withExtension('สมชาย (V.O.)', '') === 'สมชาย');
t('เติมวงเล็บให้เองถ้าผู้ใช้พิมพ์มาโดด ๆ', withExtension('สมชาย', 'V.O.') === 'สมชาย (V.O.)');
t('ชื่อว่าง + ส่วนเสริม → ไม่มีวรรคนำ', withExtension('', '(V.O.)') === '(V.O.)');

console.log('alpha.57a fountain OK (' + n + ' checks)');
