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
         TRANSITIONS_IN, INTERCUTS, SP_MD_PREFIXES, classify } from '../src/fountain.js';
let n = 0;
const t = (name, cond, extra) => {
  if (!cond) throw new Error('FAIL ' + name + (extra !== undefined ? ' | ' + extra : ''));
  n++;
};

// -- round-trip ของ element ใหม่ (ต้องอ่านกลับได้ชนิดเดิม + ข้อความเดิมเป๊ะ) --
// [alpha.60r3a] รหัส v1 ยัง "อ่าน" ได้ครบ แต่ `lineFor()` เขียนออกเป็นมาตรฐานใหม่เสมอ
// → เลิกเช็ค "ได้ไฟล์เดิมเป๊ะ" เปลี่ยนเป็น "อ่านกลับได้ชนิดเดิม + ข้อความเดิม" (round-trip เชิงความหมาย)
const md2 = ['$in FADE IN:', '$sub ห้องครัว - ต่อเนื่อง', '$intercut INTERCUT WITH:'].join('\n');
const b2 = parseScript(md2);
t('element ใหม่ถูก classify ถูกชนิด',
  JSON.stringify(b2.map((b) => b.el)) === JSON.stringify(['transition-in', 'subheader', 'intercut']),
  JSON.stringify(b2.map((b) => b.el)));
t('ข้อความไม่ติด prefix มาด้วย', b2[0].text === 'FADE IN:' && b2[1].text === 'ห้องครัว - ต่อเนื่อง');
const out2 = b2.map((b, i) => lineFor(b.el, b.text, i === 0, i ? b2[i - 1].el : 'action'));
t('บันทึกแล้วย้ายไปมาตรฐานใหม่เอง (<< / ####)',
  out2[0] === '<< FADE IN:' && out2[1] === '#### ห้องครัว - ต่อเนื่อง', out2.join(' | '));
const re2 = parseScript(out2.join('\n'));
t('อ่านซ้ำได้ชนิดเดิม (round-trip ปิดวง)',
  JSON.stringify(re2.map((b) => b.el)) === JSON.stringify(b2.map((b) => b.el)),
  JSON.stringify(re2.map((b) => b.el)));
t('ข้อความไม่เพี้ยนหลังย้ายมาตรฐาน',
  re2.every((b, i) => b.text === b2[i].text), JSON.stringify(re2.map((b) => b.text)));

// ═══════ [alpha.60r3a] มาตรฐานรหัสใหม่ ═══════
{
  const S = (md, prevType) => parseScript(md)[0];
  // --- อ่านรหัสใหม่ได้ครบ ---
  t('### = หัวฉาก (H3 ในนิยาย)', S('### INT. ห้องครัว - กลางวัน').el === 'scene');
  t('หัวฉากไม่ติด ### มาด้วย', S('### INT. ห้องครัว - กลางวัน').text === 'INT. ห้องครัว - กลางวัน');
  t('#### = ฉากย่อย (H4 ในนิยาย)', S('#### มุมห้อง').el === 'subheader');
  t('>> = ทรานซิชันออก', S('>> CUT TO:').el === 'transition' && S('>> CUT TO:').text === 'CUT TO:');
  t('<< = ทรานซิชันเข้า', S('<< FADE IN:').el === 'transition-in' && S('<< FADE IN:').text === 'FADE IN:');
  t('! + วรรค = ช็อต', S('! CLOSE ON').el === 'shot' && S('! CLOSE ON').text === 'CLOSE ON');
  t('!ไม่มีวรรค = บรรยายบังคับแบบ v1 (ไฟล์เก่าไม่พัง)', S('!ลมพัดผ่าน').el === 'action');
  t('--- = ขึ้นหน้าใหม่', S('---').el === 'page-break');
  t('/// = โน้ต', S('/// เขียนต่อพรุ่งนี้').el === 'note' && S('/// เขียนต่อพรุ่งนี้').text === 'เขียนต่อพรุ่งนี้');
  t('##### = โครง 3 (ย้ายมาจาก ###)', S('##### โครงย่อย').el === 'outline3');
  t('# / ## ยังเป็นโครง 1 / 2', S('# องก์').el === 'outline1' && S('## ฉาก').el === 'outline2');

  // --- วงเล็บต้องอยู่ใต้บรรทัดตัวละครเท่านั้น (บั๊กที่ผู้ใช้รายงาน) ---
  const dave = parseScript(['@dave (V.O.)', '((กระซิบ))', 'สวัสดีครับ'].join('\n'));
  t('ชื่อตัวละครที่มีส่วนเสริม (V.O.) ยังเป็น character ไม่ใช่ parenthetical',
    dave[0].el === 'character', dave[0].el + ' :: ' + dave[0].text);
  t('ส่วนเสริมติดอยู่กับชื่อครบ', dave[0].text === 'dave (V.O.)', dave[0].text);
  t('((…)) ใต้ตัวละคร = วงเล็บ', dave[1].el === 'parenthetical', dave[1].el);
  t('บรรทัดถัดจากวงเล็บ = บทพูด', dave[2].el === 'dialogue');
  // ที่อื่นต้องไม่กลายเป็นวงเล็บ
  const note = parseScript(['ลมพัดผ่าน', '((โน้ตถึงตัวเอง))'].join('\n'));
  t('((…)) ที่ไม่ได้อยู่ใต้ตัวละคร = โน้ต (ไฟล์ v1 ไม่พัง)', note[1].el === 'note', note[1].el);
  // วงเล็บชั้นเดียวหลัง "บรรยาย" (บรรทัดยาวจบด้วยจุด → ไม่เข้าเกณฑ์ชื่อตัวละคร) ต้องไม่เป็นวงเล็บ
  const dlgParen = parseScript(['ลมพัดผ่านตลาดเก่ายามเย็น ผู้คนเดินขวักไขว่กันไปมา.',
                                '(เสียงจากที่ไกล)'].join('\n'));
  t('วงเล็บชั้นเดียวหลังบรรยาย ไม่กลายเป็น parenthetical', dlgParen[1].el !== 'parenthetical',
    dlgParen[0].el + ' → ' + dlgParen[1].el);

  // --- round-trip ปิดวงทุก element ---
  const every = ['scene', 'action', 'character', 'parenthetical', 'dialogue', 'transition-in',
                 'transition', 'subheader', 'intercut', 'shot', 'act-break', 'note',
                 'summary', 'outline1', 'outline2', 'outline3'];
  for (const el of every) {
    // วงเล็บ/บทพูดอยู่ "ต่อจากตัวละครโดยไม่มีบรรทัดว่างคั่น" — prevBlank ต้องเป็น false
    const underChar = el === 'parenthetical' || el === 'dialogue';
    const prev = underChar ? 'character' : 'action';
    const line = lineFor(el, el === 'parenthetical' ? '(กระซิบ)' : 'ทดสอบ ' + el, !underChar, prev);
    const [got, txt] = classify(line, !underChar, prev);
    t('round-trip ปิดวง: ' + el, got === el, el + ' → "' + line + '" → ' + got);
    if (el !== 'parenthetical') t('ข้อความคงเดิม: ' + el, txt === 'ทดสอบ ' + el, txt);
  }
  // page-break แยกเช็ค (ไม่มีข้อความ)
  t('round-trip ปิดวง: page-break', parseScript(lineFor('page-break', '', true, 'action'))[0].el === 'page-break');

  // --- รายการรหัสที่โหมดนิยายต้องซ่อน ---
  t('SP_MD_PREFIXES เรียงยาวก่อนสั้น (ไม่งั้น > กิน >> )',
    SP_MD_PREFIXES.indexOf('>> ') < SP_MD_PREFIXES.indexOf('>'));
  t('SP_MD_PREFIXES ไม่มี #/##/### (เป็นหัวข้อจริงในนิยาย ไม่ต้องซ่อน)',
    !SP_MD_PREFIXES.some((p) => /^#/.test(p)), SP_MD_PREFIXES.join(','));
  for (const p of ['>> ', '<< ', '/// ', '((', '@', '$shot ']) {
    t('SP_MD_PREFIXES มี "' + p + '"', SP_MD_PREFIXES.includes(p));
  }
}

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
