// export-fdx.js — ส่งออกเป็น Final Draft (.fdx) ตามข้อ 67
// บริสุทธิ์ 100% : รับ blocks ([{el,text}] จาก parseScript) → คืนสตริง XML
// ทดสอบด้วย node ได้ (test/sp-export.test.cjs)

// ชนิดย่อหน้าใน FDX (Final Draft 8+ ใช้ชื่อพวกนี้)
export const FDX_TYPE_MAP = {
  scene: 'Scene Heading',
  action: 'Action',
  character: 'Character',
  dialogue: 'Dialogue',
  parenthetical: 'Parenthetical',
  transition: 'Transition',
  'transition-in': 'Transition',      // [alpha.57a] FD มี Transition ชนิดเดียว — ต่างกันที่ระยะเยื้อง
  subheader: 'Shot',                  // mini-slug ใน FD ลงเป็น Shot
  intercut: 'Scene Heading',          // "INTERCUT WITH:" นับเป็นหัวฉากในสายการผลิต
  shot: 'Shot',
  'act-break': 'Act Break',
  // element ที่ Final Draft ไม่มีตรง ๆ → ลงเป็น Action เพื่อไม่ให้เนื้อหาหาย
  note: 'Action',
  summary: 'Action',
  outline1: 'Action',
  outline2: 'Action',
  outline3: 'Action',
  image: 'Action',
  raw: 'Action',
};
export const fdxType = (el) => FDX_TYPE_MAP[el] || 'Action';

// อักขระควบคุมที่ XML 1.0 ไม่ยอมรับ (เคยหลุดมากับข้อความที่วางจากที่อื่น)
const XML_BAD = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

export function escapeXml(s) {
  return String(s ?? '')
    .replace(XML_BAD, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** ตัดเครื่องหมายเน้นข้อความของ Markdown ออก — FDX เก็บสไตล์คนละแบบ */
export function plainText(s) {
  return String(s ?? '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\u00A0/g, ' ');
}

const para = (type, text, indent = '    ') =>
  `${indent}<Paragraph Type="${escapeXml(type)}">\n` +
  `${indent}  <Text>${escapeXml(plainText(text))}</Text>\n` +
  `${indent}</Paragraph>`;

/**
 * สร้าง XML ของ Final Draft
 * @param {Array<{el:string,text:string}>} blocks
 * @param {{title?:string, author?:string, contact?:string, copyright?:string,
 *          basedOn?:string}} meta
 */
export function generateFdx(blocks, meta = {}) {
  const list = (blocks || []).filter((b) => b && b.el !== 'blank' &&
                                            String(b.text ?? '').trim() !== '');
  const body = list.map((b) => para(fdxType(b.el), b.text)).join('\n');

  const title = [];
  const addTitle = (text, align = 'Center') => {
    if (!String(text ?? '').trim()) return;
    for (const line of String(text).split('\n')) {
      title.push(`      <Paragraph Alignment="${align}" Type="Action">\n` +
                 `        <Text>${escapeXml(plainText(line))}</Text>\n` +
                 `      </Paragraph>`);
    }
  };
  addTitle(meta.title);
  addTitle(meta.author ? 'เขียนโดย\n' + meta.author : '');
  addTitle(meta.basedOn);
  addTitle(meta.contact, 'Left');
  addTitle(meta.copyright, 'Left');

  const titlePage = title.length
    ? `  <TitlePage>\n    <Content>\n${title.join('\n')}\n    </Content>\n  </TitlePage>\n`
    : '';

  return '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
    '<FinalDraft DocumentType="Script" Template="No" Version="1">\n' +
    '  <Content>\n' + (body ? body + '\n' : '') + '  </Content>\n' +
    titlePage +
    '</FinalDraft>\n';
}
