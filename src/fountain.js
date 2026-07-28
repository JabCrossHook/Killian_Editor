// ระบบ element บทภาพยนตร์ — กติกาไฟล์ชุดเดียวกับ v1 (fountain.py) ทุกประการ
// .หัวฉาก !บรรยาย @ตัวละคร (วงเล็บ) บทพูด >ทรานซิชัน = สรุป #โครง ((โน้ต))

export const SP_ELEMS = {
  scene: { th: 'หัวฉาก', prefix: '.' },
  action: { th: 'บรรยาย', prefix: '!' },        // ใส่ ! เฉพาะตอนจำเป็น
  character: { th: 'ตัวละคร', prefix: '@' },
  parenthetical: { th: 'วงเล็บ', prefix: '(' },
  dialogue: { th: 'บทพูด', prefix: '' },
  transition: { th: 'ทรานซิชัน', prefix: '>' },
  summary: { th: 'สรุป', prefix: '= ' },
  outline1: { th: 'โครง 1', prefix: '# ' },
  outline2: { th: 'โครง 2', prefix: '## ' },
  outline3: { th: 'โครง 3', prefix: '### ' },
  note: { th: 'โน้ต', prefix: '((' },
  image: { th: 'รูปภาพ', prefix: '' },          // ![alt](src) — แสดงเป็นรูปจริงในบทหนัง
  raw: { th: 'อื่น ๆ', prefix: '' },            // element ที่ v2 ยังไม่ทำ UI — คงบรรทัดเดิมเป๊ะ
};
export const TAB_CYCLE = ['action', 'scene', 'character', 'parenthetical', 'dialogue', 'transition'];
export const NEXT_ELEM = { scene: 'action', action: 'action', character: 'dialogue',
  parenthetical: 'dialogue', dialogue: 'action', transition: 'scene',
  summary: 'action', outline1: 'outline2', outline2: 'outline3', outline3: 'action',
  note: 'action', image: 'action', raw: 'action' };

// บรรทัดที่เป็นรูปทั้งบรรทัด ![alt](src) — ใช้ร่วมกับ md.js
export const IMG_RE = /^!\[([^\]\n]*)\]\(([^)\n]+)\)\s*$/;

export const SCENE_RE = /^\s*(int\.?|ext\.?|est\.?|i\/e|int\.?\/ext\.?|ฉาก)[\s.:]/i;
const TRANS_RE = /(cut to:|dissolve to:|smash cut to:|match cut to:|fade out\.?|fade to black\.?|to:)\s*$/i;
const RAW_PREFIX = /^\$(shot|cast|act|seq|endact)\b/i;
export const TIMES = ['DAY', 'NIGHT', 'MORNING', 'EVENING', 'CONTINUOUS', 'LATER',
  'เช้า', 'กลางวัน', 'บ่าย', 'เย็น', 'กลางคืน', 'รุ่งสาง', 'ต่อเนื่อง'];
export const TRANSITIONS = ['CUT TO:', 'DISSOLVE TO:', 'SMASH CUT TO:', 'MATCH CUT TO:',
  'FADE OUT.', 'FADE TO BLACK.', 'FADE IN:', 'INTERCUT WITH:'];
export const SCENE_PREFIX = ['INT. ', 'EXT. ', 'INT./EXT. ', 'I/E. ', 'EST. ', 'ฉาก ', 'ฉากภายใน ', 'ฉากภายนอก '];

// วงเล็บบอกอารมณ์/การพูด (parenthetical) แบบ Final Draft — ไทย + อังกฤษ
export const PARENTHETICALS = [
  '(beat)', "(cont'd)", '(V.O.)', '(O.S.)', '(O.C.)', '(pre-lap)', '(sotto)', '(to himself)',
  '(to herself)', '(whispering)', '(shouting)', '(laughing)', '(crying)', '(sarcastic)',
  '(หยุดคิด)', '(กระซิบ)', '(ตะโกน)', '(พูดกับตัวเอง)', '(เสียงในใจ)', '(นอกจอ)', '(ต่อ)',
  '(หัวเราะ)', '(ร้องไห้)', '(ประชด)', '(จริงจัง)', '(ลังเล)',
];
// ส่วนขยายท้ายชื่อตัวละคร
export const CHAR_EXTENSIONS = ["(V.O.)", "(O.S.)", "(CONT'D)", '(ต่อ)', '(เสียง)', '(นอกจอ)'];

export function classify(line, prevBlank = true, prevType = 'action') {
  const s = line.trim();
  if (s === '') return ['blank', ''];
  if (IMG_RE.test(s)) return ['image', s];           // ![alt](src) ทั้งบรรทัด = รูป
  if (RAW_PREFIX.test(s)) return ['raw', line];
  if (s.startsWith('((') && s.endsWith('))')) return ['note', s.slice(2, -2).trim()];
  if (s.startsWith('### ')) return ['outline3', s.slice(4).trim()];
  if (s.startsWith('## ')) return ['outline2', s.slice(3).trim()];
  if (s.startsWith('# ')) return ['outline1', s.slice(2).trim()];
  if (s.startsWith('= ')) return ['summary', s.slice(2).trim()];
  if (s.startsWith('.') && !s.startsWith('..')) return ['scene', s.slice(1).trim()];
  if (s.startsWith('!')) return ['action', s.slice(1).trim()];
  if (s.startsWith('@')) return ['character', s.slice(1).trim()];
  if (s.startsWith('>')) return ['transition', s.slice(1).trim()];
  if (SCENE_RE.test(s)) return ['scene', s];
  if (TRANS_RE.test(s) && s.length <= 30) return ['transition', s];
  if (s.startsWith('(') && s.endsWith(')')) return ['parenthetical', s];
  // ตรวจจับ "ชื่อตัวละคร" อัตโนมัติ (บรรทัดไม่มี prefix @) — ใช้เป็น fallback เวลานำเข้า/วางข้อความดิบ
  // (ปกติผู้ใช้สร้างบล็อกตัวละครผ่านตัวเลือก element ซึ่งเติม @ ให้อยู่แล้ว)
  // เดิมบังคับ "พิมพ์ใหญ่ล้วน" ทำให้ชื่อผสมพิมพ์เล็ก (Nazarena, Frinton-Smith) และชื่อไทยไม่ถูกจับ
  // เกณฑ์ใหม่: อยู่หลังบรรทัดว่าง + ไม่จบด้วยเครื่องหมายวรรค + ไม่ขึ้นด้วยอัญประกาศ +
  //   (เป็นตัวพิมพ์ใหญ่ล้วนแบบอังกฤษ)  หรือ  (สั้นมาก ≤ 25 ตัว และไม่เกิน 3 คำ)
  {
    const looksLikeName = !/[.!?…,;:"]$/.test(s) && !/^["'“]/.test(s) &&
      ((/[A-Za-z]/.test(s) && s === s.toUpperCase() && s.length <= 40) ||
       (s.length <= 25 && s.split(/\s+/).length <= 3));
    if (prevBlank && looksLikeName) return ['character', s];
  }
  if (['character', 'parenthetical', 'dialogue'].includes(prevType)) return ['dialogue', s];
  return ['action', s];
}

export function parseScript(md) {
  const out = [];
  let prevBlank = true, prevType = 'action';
  for (const line of md.split('\n')) {
    const [el, text] = classify(line, prevBlank, prevType);
    if (el === 'blank') { out.push({ el: 'blank', text: '' }); prevBlank = true; continue; }
    out.push({ el, text });
    prevBlank = false; prevType = el;
  }
  return out;
}

// serialize บรรทัดเดียว: ใส่ prefix เท่าที่จำเป็นให้ classify อ่านกลับได้ element เดิม
export function lineFor(el, text, prevBlank, prevType) {
  if (el === 'blank' || (el === 'action' && text.trim() === '')) return '';
  if (el === 'raw' || el === 'image') return text;   // รูปเก็บ md เดิมทั้งบรรทัด
  let s;
  switch (el) {
    case 'note': s = '((' + text + '))'; break;
    case 'parenthetical':
      s = text.startsWith('(') && text.endsWith(')') ? text : '(' + text + ')'; break;
    case 'summary': s = '= ' + text; break;
    case 'outline1': s = '# ' + text; break;
    case 'outline2': s = '## ' + text; break;
    case 'outline3': s = '### ' + text; break;
    case 'scene': s = SCENE_RE.test(text) ? text : '.' + text; break;
    case 'transition': s = TRANS_RE.test(text) ? text : '>' + text; break;
    case 'character': s = '@' + text; break;
    default: s = text;                              // action / dialogue
  }
  const [got] = classify(s, prevBlank, prevType);
  if (got !== el) {
    if (el === 'action') s = '!' + text;            // กันโดนตีเป็นอย่างอื่น
    else if (el === 'character') s = '@' + text;
    else if (el === 'scene') s = '.' + text;
  }
  return s;
}
