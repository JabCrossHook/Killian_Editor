// export-rtf.js — ส่งออกเป็น Rich Text Format (.rtf) ตามข้อ 68
// บริสุทธิ์ 100% : รับ blocks ([{el,text}]) + รูปแบบบท (sp-format) → คืนสตริง RTF
// ทดสอบด้วย node ได้ (test/sp-export.test.cjs)
//
// สำคัญ: RTF เป็นไฟล์ ANSI — ภาษาไทย (และอักขระ >127 ทุกตัว) ต้องเขียนเป็น \uNNNN?
//        ไม่งั้น Word/Pages เปิดแล้วได้ตัวขยะ (บทเรียนเดียวกับข้อ 14d เรื่องไบนารี)

import { mergeSpFormat, textWidth } from './sp-format.js';

export const TWIPS_PER_INCH = 1440;
export const TWIPS_PER_LINE = 240;          // 12pt single space
export const inTw = (v) => Math.round((+v || 0) * TWIPS_PER_INCH);

/** หนีอักขระให้ปลอดภัยใน RTF (รวมภาษาไทยเป็น \uNNNN?) */
export function escapeRtf(s) {
  let out = '';
  for (const ch of String(s ?? '')) {
    const c = ch.codePointAt(0);
    if (ch === '\\') { out += '\\\\'; continue; }
    if (ch === '{') { out += '\\{'; continue; }
    if (ch === '}') { out += '\\}'; continue; }
    if (ch === '\n') { out += '\\line '; continue; }
    if (ch === '\t') { out += '\\tab '; continue; }
    if (c < 32) continue;                                  // อักขระควบคุมอื่น ๆ ทิ้ง
    if (c < 128) { out += ch; continue; }
    if (c <= 0xFFFF) { out += '\\u' + (c > 32767 ? c - 65536 : c) + '?'; continue; }
    // นอก BMP (อีโมจิ) → surrogate pair
    const v = c - 0x10000;
    const hi = 0xD800 + (v >> 10), lo = 0xDC00 + (v & 0x3FF);
    out += '\\u' + (hi > 32767 ? hi - 65536 : hi) + '?';
    out += '\\u' + (lo > 32767 ? lo - 65536 : lo) + '?';
  }
  return out;
}

/** ตัดเครื่องหมายเน้นของ Markdown (RTF ใช้ระบบสไตล์ของตัวเอง) */
export function plainText(s) {
  return String(s ?? '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1');
}

// element ที่ควรอยู่ติดกับบรรทัดถัดไป (ห้ามค้างท้ายหน้าเดี่ยว ๆ)
const KEEP_NEXT = ['scene', 'character', 'parenthetical', 'act-break', 'shot',
                   'subheader', 'intercut', 'transition-in'];   // [alpha.57a]

/** คำสั่งจัดย่อหน้าของ element หนึ่ง (เยื้องซ้าย/ขวา/ระยะก่อนหน้า/สไตล์) */
export function paraCtrl(el, fmt) {
  const f = fmt && fmt.elements ? fmt : mergeSpFormat(fmt);
  const c = f.elements[el] || f.elements.action;
  const st = (f.styles[el] || f.styles.action).print;
  const tw = textWidth(f.paper, f.margins);
  const li = Math.max(0, (+c.indent || 0) - f.margins.left);
  const ri = Math.max(0, tw - li - (+c.width || tw));
  const sb = Math.max(0, ((+c.linesBefore || 0) / 10 - 1) * TWIPS_PER_LINE);
  let s = '\\pard\\plain\\f0\\fs24';
  s += '\\li' + inTw(li) + '\\ri' + inTw(ri);
  if (sb) s += '\\sb' + Math.round(sb);
  if (KEEP_NEXT.includes(el)) s += '\\keepn';
  if (el === 'transition') s += '\\qr';
  if (st.bold) s += '\\b';
  if (st.italic) s += '\\i';
  if (st.underline) s += '\\ul';
  return { ctrl: s, caps: !!st.caps };
}

/**
 * สร้างเอกสาร RTF
 * @param {Array<{el:string,text:string}>} blocks
 * @param {object} meta { title, author, contact, copyright, basedOn }
 * @param {object} fmt  รูปแบบบท (sp-format) — ไม่ใส่ = ค่ามาตรฐาน
 */
export function generateRtf(blocks, meta = {}, fmt = null) {
  const f = fmt && fmt.elements ? fmt : mergeSpFormat(fmt);
  const m = f.margins;
  const head =
    '{\\rtf1\\ansi\\ansicpg1252\\deff0\\uc1\n' +
    '{\\fonttbl{\\f0\\fmodern\\fcharset0 Courier Prime;}{\\f1\\fmodern\\fcharset0 Courier New;}}\n' +
    '\\paperw' + inTw(f.paper.width) + '\\paperh' + inTw(f.paper.height) +
    '\\margl' + inTw(m.left) + '\\margr' + inTw(m.right) +
    '\\margt' + inTw(m.top) + '\\margb' + inTw(m.bottom) + '\n' +
    '\\f0\\fs24\n';

  const out = [];
  // หน้าปก (ใส่เมื่อมีชื่อเรื่อง) — จบด้วย \page เพื่อขึ้นหน้าใหม่
  const title = String(meta.title || '').trim();
  if (title) {
    out.push('\\pard\\plain\\f0\\fs24\\qc\\sb2880\\b ' + escapeRtf(title.toUpperCase()) + '\\b0\\par');
    if (meta.author) {
      out.push('\\pard\\plain\\f0\\fs24\\qc\\sb480 ' + escapeRtf('เขียนโดย') + '\\par');
      out.push('\\pard\\plain\\f0\\fs24\\qc ' + escapeRtf(String(meta.author)) + '\\par');
    }
    if (meta.basedOn) out.push('\\pard\\plain\\f0\\fs24\\qc\\sb480 ' + escapeRtf(String(meta.basedOn)) + '\\par');
    if (meta.contact) out.push('\\pard\\plain\\f0\\fs24\\ql\\sb2880 ' + escapeRtf(String(meta.contact)) + '\\par');
    if (meta.copyright) out.push('\\pard\\plain\\f0\\fs24\\ql ' + escapeRtf(String(meta.copyright)) + '\\par');
    out.push('\\page');
  }

  for (const b of blocks || []) {
    if (!b || b.el === 'blank') continue;
    const text = plainText(b.text);
    if (!text.trim() && b.el === 'action') continue;
    const { ctrl, caps } = paraCtrl(b.el, f);
    out.push(ctrl + ' ' + escapeRtf(caps ? text.toUpperCase() : text) + '\\par');
  }

  return head + out.join('\n') + '\n}\n';
}
