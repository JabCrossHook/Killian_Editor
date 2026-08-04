// markdown-code-toggle.js — ซ่อน "รหัสนำหน้าบรรทัด" ในตัวแก้ไขนิยาย (alpha.60r3 ข้อ 6)
//
// ปัญหา: ไฟล์เดียวกันเปิดได้ทั้งโหมดนิยายและโหมดบทหนัง (`switchFormat()`)
// พอเปิดบทภาพยนตร์ด้วยตัวแก้ไข **นิยาย** รหัส fountain ที่ปกติถูกพาร์สเป็น element
// (`.หัวฉาก` `@ชื่อ` `>CUT TO:` `$shot …`) จะโผล่มาเป็นข้อความดิบเต็มหน้า อ่านยากมาก
// รหัสมาร์กดาวน์ (`#` `##` `###` `=` `!`) ก็เช่นกันเมื่อไฟล์ถูกแก้จากภายนอก
//
// วิธีแก้: **ซ่อนเฉพาะตัวนำหน้า ไม่แตะเนื้อหา** ด้วย inline decoration `display:none`
//   → ไฟล์ .md ไม่เปลี่ยนแม้แต่ตัวอักษรเดียว · ปิดสวิตช์แล้วรหัสกลับมาครบ · undo/redo ไม่รู้เรื่องด้วยซ้ำ
//
// โมดูลนี้เก็บ "ตัวจับ prefix" เป็น pure function (`prefixLen`) จึงเทสได้โดยไม่ต้องมี ProseMirror
import { Plugin as PMPlugin, PluginKey as PMKey } from 'prosemirror-state';
import { Decoration as Deco, DecorationSet as DecoSet } from 'prosemirror-view';

export const MD_CODE_KEY = new PMKey('kmdcodes');
export const MD_HIDE_CLASS = 'k-md-hide-prefix';

/**
 * รหัสที่ซ่อน — เรียง **ยาวก่อนสั้น** เสมอ
 * ไม่งั้น `#` จะกิน `###` และ `$in ` จะไม่มีวันถูกจับเพราะ `$intercut ` ยาวกว่า
 * (ตรงกับตาราง `SP_ELEMS` ใน fountain.js + หัวข้อ/เส้นคั่นของมาร์กดาวน์)
 */
export const MD_PREFIXES = [
  '$intercut ', '$shot ', '$sub ', '$act ', '$in ',
  '### ', '## ', '# ', '= ', '((',
  '.', '@', '>', '!',
];

/**
 * ความยาวของรหัสนำหน้าในข้อความหนึ่งบรรทัด (pure)
 *
 * กติกาที่ต้องระวัง — ไม่งั้นซ่อนผิดจนอ่านไม่รู้เรื่อง:
 *   · ต้องมี "เนื้อหา" ตามหลังเสมอ — บรรทัดที่มีแต่ `.` หรือ `#` คือข้อความจริงของผู้ใช้
 *   · `.` ห้ามซ่อนถ้าตามด้วยตัวเลข/จุด (`...` `1.5`) หรือช่องว่าง — นั่นคือประโยคปกติ
 *   · `!` ซ่อนเฉพาะกรณีไม่ใช่รูป `![alt](src)` (รูปต้องคงไว้ให้ md.js แสดงเป็นรูปจริง)
 *   · `((` ซ่อนหัวอย่างเดียว วงเล็บปิดท้ายบรรทัดจัดการแยกด้วย `suffixLen`
 * @param {string} text
 * @returns {number} 0 = ไม่มีรหัสให้ซ่อน
 */
export function prefixLen(text) {
  const s = String(text || '');
  if (!s) return 0;
  for (const p of MD_PREFIXES) {
    if (!s.startsWith(p)) continue;
    const rest = s.slice(p.length);
    if (!rest.trim()) return 0;                       // มีแต่รหัส ไม่มีเนื้อ → เป็นข้อความจริง
    if (p === '.') {
      // `.` ของ fountain ติดกับชื่อฉากเสมอ (`.INT. บ้าน`) — จุดของประโยคไม่เป็นแบบนี้
      if (/^[\s.\d]/.test(rest)) return 0;
      return 1;
    }
    if (p === '!' && /^\[[^\]\n]*\]\(/.test(rest)) return 0;   // ![alt](src) = รูปจริง
    if ((p === '@' || p === '>' || p === '!') && /^\s/.test(rest)) return 0;
    return p.length;
  }
  return 0;
}

/** ความยาวของวงเล็บปิดท้ายโน้ต `((…))` (pure) — 0 = ไม่มี */
export function suffixLen(text) {
  const s = String(text || '');
  return (s.startsWith('((') && s.endsWith('))') && s.length > 4) ? 2 : 0;
}

// ───────── ปลั๊กอิน ─────────
let _on = true;             // ค่าเริ่มต้น = เปิด (ซ่อนรหัส) ตามสเปก

/** เปิด/ปิดการซ่อน — คืน true เมื่อค่าเปลี่ยนจริง (ผู้เรียกจึง dispatch เฉพาะตอนนั้น · บทเรียน 44) */
export function setMarkdownCodes(on) {
  const v = on !== false;
  if (v === _on) return false;
  _on = v;
  return true;
}
export function markdownCodesOn() { return _on; }

/** สแกนช่วง [from,to] คืน decoration ที่ซ่อนรหัส (ใช้กับ incrementalDecoState ของ editor.js ได้) */
export function scanMdCodes(doc, from, to) {
  if (!_on || !doc) return [];
  const out = [];
  doc.nodesBetween(from, to, (node, pos) => {
    // สนใจเฉพาะบล็อกข้อความระดับบน — ตัวแรกในบล็อกเท่านั้นที่เป็น "ต้นบรรทัด"
    if (!node.isTextblock) return;
    const first = node.firstChild;
    if (!first || !first.isText || !first.text) return;
    const n = prefixLen(first.text);
    if (n > 0) {
      // pos = ตำแหน่งของบล็อก · +1 = เข้าไปข้างใน
      out.push(Deco.inline(pos + 1, pos + 1 + n, { class: MD_HIDE_CLASS }));
    }
    const last = node.lastChild;
    if (last && last.isText && last.text) {
      const m = suffixLen(node.textContent);
      if (m > 0) {
        const end = pos + 1 + node.content.size;
        out.push(Deco.inline(end - m, end, { class: MD_HIDE_CLASS }));
      }
    }
    return false;                      // ไม่ต้องลงลึกกว่าบล็อก
  });
  return out;
}

/**
 * ปลั๊กอินสำหรับใส่ใน `_mkState()` ของ KEditor
 * @param {(key, scan) => object} decoState  ตัวสร้าง state แบบสแกนเฉพาะบล็อกที่เปลี่ยน
 *   (editor.js ส่ง `incrementalDecoState` เข้ามา — decoration ตัวนี้คิดจาก "ข้อความในบล็อกเดียว"
 *    จึงใช้ทางลัดนั้นได้ตามเงื่อนไขของบทเรียน 52 · ไม่ส่งมา = สแกนทั้งเอกสารทุกครั้ง)
 */
export function markdownCodePlugin(decoState) {
  const full = (doc) => DecoSet.create(doc, scanMdCodes(doc, 0, doc.content.size));
  const state = decoState
    ? decoState(MD_CODE_KEY, scanMdCodes)
    : {
        init: (_c, st) => full(st.doc),
        apply(tr, prev, _o, st) {
          if (tr.getMeta(MD_CODE_KEY)) return full(st.doc);
          if (!tr.docChanged) return prev.map(tr.mapping, tr.doc);
          return full(st.doc);
        },
      };
  return new PMPlugin({
    key: MD_CODE_KEY, state,
    props: { decorations(s) { return MD_CODE_KEY.getState(s); } },
  });
}

/** สั่งวาดใหม่หลังสลับสวิตช์ */
export function refreshMarkdownCodes(view) {
  if (view) view.dispatch(view.state.tr.setMeta(MD_CODE_KEY, true));
}
