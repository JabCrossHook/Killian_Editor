// sp-format.js — เอนจินรูปแบบบทภาพยนตร์ "ระดับใช้งานจริง" (ข้อ 81–85, 92)
// บริสุทธิ์ 100% : ไม่แตะ DOM / kapi / state → ทดสอบด้วย node ได้ (test/sp-format.test.cjs)
//
//   81 ระยะเยื้อง/ความกว้างต่อ element   → spCssVars()
//   82 ระยะเว้นบรรทัดต่อ element         → linesBefore/linesBetween (หน่วย 1/10 บรรทัด)
//   83 สไตล์จอ vs สไตล์พิมพ์             → screen/print (caps/bold/italic/underline)
//   84 กฎการตัดหน้า                      → PAGE_BREAK_RULES + paginate()
//   85 ขนาดกระดาษ + ระยะขอบ              → PAPER_SIZES / MARGIN_DEFAULTS / linesPerPage()
//   92 ข้อความมาตรฐานที่แก้ได้            → SP_STRINGS
//
// หน่วยทั้งไฟล์เป็น "นิ้ว" (in) เหมือนอุตสาหกรรมบท — CSS ใช้ `in` ได้ตรง ๆ

// ───────── 85. ขนาดกระดาษ + ระยะขอบ ─────────
export const PAPER_SIZES = {
  letter: { name: 'Letter (8.5 × 11 นิ้ว)', width: 8.5,  height: 11,    unit: 'in' },
  a4:     { name: 'A4 (8.27 × 11.69 นิ้ว)', width: 8.27, height: 11.69, unit: 'in' },
  legal:  { name: 'Legal (8.5 × 14 นิ้ว)',  width: 8.5,  height: 14,    unit: 'in' },
  custom: { name: 'กำหนดเอง',                width: 8.5,  height: 11,    unit: 'in' },
};
export const MARGIN_DEFAULTS = { top: 1, bottom: 1, left: 1.5, right: 1 };

// Courier 12pt = 10 ตัวอักษร/นิ้ว · 6 บรรทัด/นิ้ว (single space) — มาตรฐานบทภาพยนตร์
export const CHARS_PER_INCH = 10;
export const LINES_PER_INCH = 6;
export const LINE_HEIGHT_IN = 1 / LINES_PER_INCH;

/** จำนวนบรรทัดที่พิมพ์ได้ต่อหน้า (หลังหักระยะขอบบน/ล่าง) */
export function linesPerPage(paper, margins, lineHeightIn = LINE_HEIGHT_IN) {
  const p = paper || PAPER_SIZES.letter;
  const m = { ...MARGIN_DEFAULTS, ...(margins || {}) };
  const usable = (num(p.height, 11)) - num(m.top, 1) - num(m.bottom, 1);
  return Math.max(1, Math.floor(usable / (lineHeightIn || LINE_HEIGHT_IN)));
}
/** ความกว้างพื้นที่พิมพ์ (นิ้ว) */
export function textWidth(paper, margins) {
  const p = paper || PAPER_SIZES.letter;
  const m = { ...MARGIN_DEFAULTS, ...(margins || {}) };
  return Math.max(0.5, num(p.width, 8.5) - num(m.left, 1.5) - num(m.right, 1));
}
function num(v, d) { const n = parseFloat(v); return Number.isFinite(n) ? n : d; }

// ───────── 81+82. ระยะเยื้อง / ความกว้าง / ระยะเว้นบรรทัด ต่อ element ─────────
// indent = ระยะจาก "ขอบกระดาษ" (แบบ Final Draft) · width = ความกว้างของบล็อก
// linesBefore/linesBetween = 1/10 บรรทัด (10 = 1 บรรทัด, 20 = 2 บรรทัด)
export const SP_ELEMENT_CONFIG = {
  scene:         { indent: 1.5, width: 6.0, linesBefore: 20, linesBetween: 10 },
  action:        { indent: 1.5, width: 6.0, linesBefore: 10, linesBetween: 10 },
  character:     { indent: 3.7, width: 3.8, linesBefore: 10, linesBetween: 10 },
  parenthetical: { indent: 3.1, width: 2.9, linesBefore: 0,  linesBetween: 10 },
  dialogue:      { indent: 2.5, width: 3.5, linesBefore: 0,  linesBetween: 10 },
  transition:    { indent: 6.0, width: 2.0, linesBefore: 10, linesBetween: 10 },
  shot:          { indent: 1.5, width: 6.0, linesBefore: 10, linesBetween: 10 },
  'act-break':   { indent: 1.5, width: 6.0, linesBefore: 20, linesBetween: 10 },
  note:          { indent: 1.5, width: 6.0, linesBefore: 10, linesBetween: 10 },
  summary:       { indent: 1.5, width: 6.0, linesBefore: 10, linesBetween: 10 },
  outline1:      { indent: 1.5, width: 6.0, linesBefore: 10, linesBetween: 10 },
  outline2:      { indent: 1.7, width: 5.8, linesBefore: 10, linesBetween: 10 },
  outline3:      { indent: 1.9, width: 5.6, linesBefore: 10, linesBetween: 10 },
  image:         { indent: 1.5, width: 6.0, linesBefore: 10, linesBetween: 10 },
  raw:           { indent: 1.5, width: 6.0, linesBefore: 10, linesBetween: 10 },
};

// ───────── 83. สไตล์ จอ (screen) vs พิมพ์ (print) ─────────
const ST = (caps, bold, italic, underline) => ({ caps, bold, italic, underline });
export const SP_ELEMENT_STYLES = {
  scene:         { screen: ST(true,  true,  false, false), print: ST(true,  true,  false, false) },
  action:        { screen: ST(false, false, false, false), print: ST(false, false, false, false) },
  character:     { screen: ST(true,  false, false, false), print: ST(true,  false, false, false) },
  parenthetical: { screen: ST(false, false, true,  false), print: ST(false, false, false, false) },
  dialogue:      { screen: ST(false, false, false, false), print: ST(false, false, false, false) },
  transition:    { screen: ST(true,  false, false, false), print: ST(true,  false, false, false) },
  shot:          { screen: ST(true,  false, false, false), print: ST(true,  false, false, false) },
  'act-break':   { screen: ST(true,  true,  false, false), print: ST(true,  true,  false, true) },
  note:          { screen: ST(false, false, true,  false), print: ST(false, false, true,  false) },
  summary:       { screen: ST(false, false, true,  false), print: ST(false, false, true,  false) },
  outline1:      { screen: ST(false, true,  false, false), print: ST(false, true,  false, false) },
  outline2:      { screen: ST(false, true,  false, false), print: ST(false, true,  false, false) },
  outline3:      { screen: ST(false, true,  false, false), print: ST(false, true,  false, false) },
  image:         { screen: ST(false, false, false, false), print: ST(false, false, false, false) },
  raw:           { screen: ST(false, false, false, false), print: ST(false, false, false, false) },
};

// ───────── 84. กฎการตัดหน้า (widow/orphan control) ─────────
export const PAGE_BREAK_RULES = {
  minActionLinesAtBottom: 2,     // ต้องเหลือ action อย่างน้อยกี่บรรทัดท้ายหน้าจึงยอมตัด
  minDialogueLinesAtBottom: 2,   // ต้องเหลือบทพูดอย่างน้อยกี่บรรทัดท้ายหน้า
  minActionLinesAtTop: 3,        // ส่วนที่ยกไปหน้าใหม่ต้องได้อย่างน้อยกี่บรรทัด
  minDialogueLinesAtTop: 3,
  maxConsecutiveHyphens: 2,      // ห้ามลงท้ายบรรทัดด้วยขีดติดกันเกินกี่บรรทัด
  keepSceneWithNext: 2,          // หัวฉากท้ายหน้าต้องมีเนื้อตามอย่างน้อยกี่บรรทัด ไม่งั้นยกทั้งก้อน
};

// ───────── 92. ข้อความมาตรฐานที่ผู้ใช้แก้ได้ ─────────
export const SP_STRINGS = {
  continuedBottom: '(CONTINUED)',
  continuedTop: 'CONTINUED:',
  dialogueMore: '(MORE)',
  dialogueContd: "(cont'd)",
  sceneContinued: 'ต่อ',
  castTitle: 'Cast of Characters',
  sceneTitle: 'Scene',
  timeTitle: 'Time',
};

// ───────── ค่าตั้งต้นรวม + การผสานกับค่าที่ผู้ใช้ตั้ง ─────────
export const DEFAULT_SP_FORMAT = {
  paperSize: 'letter',
  paper: { width: 8.5, height: 11 },   // ใช้เมื่อ paperSize === 'custom'
  margins: { ...MARGIN_DEFAULTS },
  elements: SP_ELEMENT_CONFIG,
  styles: SP_ELEMENT_STYLES,
  rules: PAGE_BREAK_RULES,
  strings: SP_STRINGS,
};

export const SP_ELEMENT_KEYS = Object.keys(SP_ELEMENT_CONFIG);

/** ผสานค่าที่ผู้ใช้ตั้ง (settings.spFormat) ทับค่าเริ่มต้น — ไม่แก้ของเดิม (คืน object ใหม่เสมอ) */
export function mergeSpFormat(user) {
  const u = user || {};
  const paperSize = PAPER_SIZES[u.paperSize] ? u.paperSize : 'letter';
  const basePaper = PAPER_SIZES[paperSize];
  const paper = paperSize === 'custom'
    ? { width: num(u.paper?.width, basePaper.width), height: num(u.paper?.height, basePaper.height), unit: 'in' }
    : { ...basePaper };
  const elements = {};
  for (const k of SP_ELEMENT_KEYS) elements[k] = { ...SP_ELEMENT_CONFIG[k], ...(u.elements?.[k] || {}) };
  const styles = {};
  for (const k of SP_ELEMENT_KEYS) {
    styles[k] = {
      screen: { ...SP_ELEMENT_STYLES[k].screen, ...(u.styles?.[k]?.screen || {}) },
      print:  { ...SP_ELEMENT_STYLES[k].print,  ...(u.styles?.[k]?.print  || {}) },
    };
  }
  return {
    paperSize, paper,
    margins: { ...MARGIN_DEFAULTS, ...(u.margins || {}) },
    elements, styles,
    rules: { ...PAGE_BREAK_RULES, ...(u.rules || {}) },
    strings: { ...SP_STRINGS, ...(u.strings || {}) },
  };
}

// ───────── ตัวแปร CSS ของหน้ากระดาษ (ใช้ได้ทั้งนิยายและบทหนัง) ─────────
/** คืน { '--page-w': '8.5in', '--mg-top': '1in', ... } */
export function pageCssVars(fmt) {
  const f = fmt && fmt.margins ? fmt : mergeSpFormat(fmt);
  const m = f.margins;
  return {
    '--page-w': f.paper.width + 'in',
    '--page-h': f.paper.height + 'in',
    '--mg-top': m.top + 'in',
    '--mg-bottom': m.bottom + 'in',
    '--mg-left': m.left + 'in',
    '--mg-right': m.right + 'in',
    '--text-w': +textWidth(f.paper, m).toFixed(4) + 'in',
  };
}

/** CSS ต่อ element ของบทหนัง (ข้อ 81–83) — คืนเป็นสตริง เอาไปยัด <style> ได้ทันที */
export function spCss(fmt) {
  const f = fmt && fmt.elements ? fmt : mergeSpFormat(fmt);
  const left = f.margins.left;
  const out = [];
  const decl = (st) => [
    'text-transform:' + (st.caps ? 'uppercase' : 'none'),
    'font-weight:' + (st.bold ? '700' : '400'),
    'font-style:' + (st.italic ? 'italic' : 'normal'),
    'text-decoration:' + (st.underline ? 'underline' : 'none'),
  ].join(';');
  const tw = textWidth(f.paper, f.margins);
  for (const k of SP_ELEMENT_KEYS) {
    const c = f.elements[k];
    const s = f.styles[k];
    const ml = Math.max(0, +(num(c.indent, left) - left).toFixed(4));
    // ความกว้างต้องไม่ล้นพื้นที่พิมพ์ (บาง element เช่นทรานซิชันตั้ง indent+width เกินขอบขวาได้)
    // คำนวณเป็นนิ้วที่นี่ ไม่ใช้ max-width:calc(100% - …) เพราะ 100% รวมเส้นขอบกระดาษด้วย → เพี้ยน 2px
    const w = Math.max(0.3, Math.min(num(c.width, 6), +(tw - ml).toFixed(4)));
    const mt = num(c.linesBefore, 10) / 10;
    const mb = num(c.linesBetween, 10) / 10 - 1;      // 1 บรรทัดคือระยะของตัวมันเอง
    out.push(`.sp.sp-${k}{margin-left:${ml}in;width:${w}in;max-width:none;` +
             `margin-top:${mt}em;margin-bottom:${Math.max(0, mb)}em;${decl(s.screen)}}`);
  }
  // ขนาดกระดาษ + ระยะขอบตอนพิมพ์ (@page ใช้ CSS variable ไม่ได้ จึงต้องสร้างเป็นข้อความ)
  // orphans/widows = กฎ widow/orphan ระดับบรรทัดของเบราว์เซอร์ (ข้อ 84)
  const m = f.margins;
  out.push(`@page{size:${f.paper.width}in ${f.paper.height}in;` +
           `margin:${m.top}in ${m.right}in ${m.bottom}in ${m.left}in;` +
           `orphans:${Math.max(1, f.rules.minActionLinesAtBottom)};` +
           `widows:${Math.max(1, f.rules.minActionLinesAtTop)};}`);
  // สไตล์ตอนพิมพ์/ส่งออก PDF — แยกชุดจากที่เห็นบนจอ (ข้อ 83)
  const printRules = SP_ELEMENT_KEYS
    .map((k) => `.sp.sp-${k}{${decl(f.styles[k].print)}}`)
    .join('');
  out.push('@media print{' + printRules + '}');
  return out.join('\n');
}

// ───────── 84. การจัดหน้า (pagination) ─────────
/** จำนวนบรรทัดที่ข้อความหนึ่งบล็อกกินจริง เมื่อกว้าง width นิ้ว */
export function wrapLines(text, widthIn, cpi = CHARS_PER_INCH) {
  const cols = Math.max(1, Math.floor(num(widthIn, 6) * cpi));
  const s = String(text ?? '');
  if (!s.trim()) return 1;
  let total = 0;
  for (const para of s.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { total += 1; continue; }
    let line = 0, used = 0;
    for (const w of words) {
      const need = used ? used + 1 + w.length : w.length;
      if (need <= cols) { used = need; }
      else { line++; used = w.length; while (used > cols) { line++; used -= cols; } }
    }
    total += line + 1;
  }
  return Math.max(1, total);
}

/**
 * จัดหน้าบทภาพยนตร์ตามกฎ widow/orphan
 * @param {Array<{el:string,text:string}>} blocks
 * @param {object} opts { fmt, lines }  (lines = บรรทัดต่อหน้า · ไม่ใส่ = คำนวณจาก fmt)
 * @returns {{pages:Array<{index:number,blocks:Array}>,count:number}}
 */
export function paginate(blocks, opts = {}) {
  const fmt = opts.fmt && opts.fmt.elements ? opts.fmt : mergeSpFormat(opts.fmt);
  const perPage = Math.max(4, opts.lines || linesPerPage(fmt.paper, fmt.margins));
  const R = fmt.rules, S = fmt.strings;
  const cfg = (el) => fmt.elements[el] || fmt.elements.action;

  const pages = [];
  let cur = [], used = 0, lastChar = '';
  const pushPage = () => { pages.push({ index: pages.length + 1, blocks: cur }); cur = []; used = 0; };

  const list = (blocks || []).filter((b) => b && b.el !== 'blank');
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const c = cfg(b.el);
    if (b.el === 'character') lastChar = String(b.text || '');
    const before = cur.length ? Math.round(num(c.linesBefore, 10) / 10) : 0;
    const body = wrapLines(b.text, c.width);
    const need = before + body;
    const free = perPage - used;

    if (need <= free) { cur.push({ ...b, lines: body }); used += need; continue; }

    // ── ไม่พอ: ตัดสินใจตามชนิด ──
    const isDlg = b.el === 'dialogue';
    const isAct = b.el === 'action' || b.el === 'note' || b.el === 'summary';
    const minBot = isDlg ? R.minDialogueLinesAtBottom : R.minActionLinesAtBottom;
    const minTop = isDlg ? R.minDialogueLinesAtTop : R.minActionLinesAtTop;
    const canBottom = free - before;

    if ((isDlg || isAct) && canBottom >= minBot && body - canBottom >= minTop) {
      // แบ่งครึ่ง: ท้ายหน้าใส่ (MORE) · ต้นหน้าใหม่ทวนชื่อ + (cont'd)
      const head = splitText(b.text, c.width, canBottom);
      cur.push({ ...b, text: head.head, lines: canBottom, split: 'head' });
      if (isDlg) cur.push({ el: 'more', text: S.dialogueMore, lines: 1 });
      pushPage();
      if (isDlg && lastChar) {
        cur.push({ el: 'character', text: lastChar + ' ' + S.dialogueContd, lines: 1, contd: true });
        used += 1;
      }
      cur.push({ ...b, text: head.rest, lines: body - canBottom, split: 'tail' });
      used += body - canBottom;
      continue;
    }
    // ยกทั้งบล็อกไปหน้าใหม่ — หัวฉาก/ชื่อตัวละครต้องพาบล็อกก่อนหน้าที่ผูกกันไปด้วย
    const carry = [];
    if (b.el === 'dialogue' || b.el === 'parenthetical') {
      while (cur.length && ['character', 'parenthetical'].includes(cur[cur.length - 1].el)) {
        carry.unshift(cur.pop());
      }
    }
    for (const x of carry) used -= x.lines || 1;
    pushPage();
    for (const x of carry) { cur.push(x); used += x.lines || 1; }
    cur.push({ ...b, lines: body });
    used += body;
  }
  if (cur.length) pushPage();
  if (!pages.length) pages.push({ index: 1, blocks: [] });

  // หัว/ท้ายหน้าที่ฉากต่อเนื่อง (ข้อ 92)
  for (let i = 0; i < pages.length - 1; i++) {
    pages[i].continuedBottom = S.continuedBottom;
    pages[i + 1].continuedTop = S.continuedTop;
  }
  return { pages, count: pages.length };
}

/** ตัดข้อความให้ส่วนแรกยาว n บรรทัด (กว้าง widthIn นิ้ว) — คืน {head, rest} */
export function splitText(text, widthIn, n) {
  const cols = Math.max(1, Math.floor(num(widthIn, 6) * CHARS_PER_INCH));
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (next.length <= cols) cur = next;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  const k = Math.max(1, Math.min(n, lines.length - 1 >= 1 ? lines.length - 1 : 1));
  return { head: lines.slice(0, k).join(' '), rest: lines.slice(k).join(' ') };
}

/** นับหน้าอย่างเดียว (ใช้กับแถบสถานะ — เร็วกว่า paginate เต็มรูปแบบเล็กน้อย) */
export function pageCount(blocks, opts) { return paginate(blocks, opts).count; }

// ───────── 97. หน้ารายชื่อตัวละคร (Cast of Characters / dramatis personae) ─────────
export const ROSTER_VERSION = 1;
export function newRoster() {
  return {
    version: ROSTER_VERSION,
    title: SP_STRINGS.castTitle,
    characters: [],
    scene: '', time: '',
    showScene: true, showTime: true,
    includeInExport: true,
  };
}
/** ทำให้ roster ที่อ่านจากไฟล์อยู่ในรูปที่ UI ใช้ได้เสมอ */
export function normalizeRoster(r) {
  const base = newRoster();
  if (!r || typeof r !== 'object') return base;
  return {
    ...base, ...r,
    version: ROSTER_VERSION,
    title: typeof r.title === 'string' && r.title.trim() ? r.title : base.title,
    characters: (Array.isArray(r.characters) ? r.characters : [])
      .map((c) => ({ name: String(c?.name ?? ''), detail: String(c?.detail ?? '') })),
    scene: String(r.scene ?? ''), time: String(r.time ?? ''),
    showScene: r.showScene !== false, showTime: r.showTime !== false,
    includeInExport: r.includeInExport !== false,
  };
}
/**
 * แปลง roster เป็นข้อความบรรทัดต่อบรรทัด (ใช้ตอนส่งออก/พิมพ์)
 * รูปแบบ: หัวเรื่องกลางหน้า → เว้น 1 บรรทัด → รายชื่อ (ชื่อ: <tab> รายละเอียด, เว้นบรรทัดระหว่างคน)
 *         → Scene (กลางหน้า, เว้น 1 บรรทัด, คำอธิบายชิดซ้าย) → เว้น 2 บรรทัด → Time
 */
export function rosterToText(roster, fmt) {
  const r = normalizeRoster(roster);
  const f = fmt && fmt.margins ? fmt : mergeSpFormat(fmt);
  const cols = Math.max(20, Math.floor(textWidth(f.paper, f.margins) * CHARS_PER_INCH));
  const mid = (s) => ' '.repeat(Math.max(0, Math.floor((cols - s.length) / 2))) + s;
  const out = [mid(r.title)];
  out.push('');
  for (const c of r.characters) {
    if (!c.name && !c.detail) continue;
    out.push(c.name + ':' + (c.detail ? '\t' + c.detail : ''));
    out.push('');
  }
  if (r.showScene && (r.scene || '').trim()) {
    out.push(mid(f.strings.sceneTitle), '', r.scene.trim(), '', '');
  }
  if (r.showTime && (r.time || '').trim()) {
    out.push(mid(f.strings.timeTitle), '', r.time.trim());
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  return out.join('\n');
}
