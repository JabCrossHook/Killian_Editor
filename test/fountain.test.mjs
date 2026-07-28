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
  'dialogue','dialogue','blank','transition','outline1','summary','note','raw'];
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
