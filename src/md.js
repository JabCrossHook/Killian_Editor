// Markdown ⇄ ProseMirror doc JSON — เข้ากับไฟล์ Killian v1 ทุกประการ
// กติกา (เหมือน richtext.py ใน v1):
//   **หนา**  *เอียง*  _ขีดเส้นใต้_  ~~ขีดฆ่า~~  # หัวข้อ  > คำพูดยกมา  - รายการ  1. รายการ
//   ![คำบรรยาย](path) ทั้งบรรทัด = รูป · เครื่องหมายจับคู่ไม่ได้ → คงเป็นตัวอักษร (ไม่มีข้อมูลหาย)

const PATS = [
  [/\*\*\*([^*\n]+)\*\*\*/, ['strong', 'em']],
  [/(?<!\*)\*\*([^*\n]+)\*\*(?!\*)/, ['strong']],
  [/(?<![*\w])\*([^*\n]+)\*(?![*\w])/, ['em']],
  [/(?<![\w_])_([^_\n]+)_(?![\w_])/, ['underline']],
  [/~~([^~\n]+)~~/, ['strike']],
];
const RE_H = /^(#{1,6}) /;
const RE_UL = /^[-*] /;
const RE_OL = /^(\d+)\. /;
const RE_IMG = /^!\[([^\]\n]*)\]\(([^)\n]+)\)\s*$/;

// ---------- inline: md → [{text, marks:Set}] ----------
function parseInline(s, base = []) {
  const segs = [];
  while (s) {
    let best = null;
    for (const [rx, marks] of PATS) {
      const m = rx.exec(s);
      if (m && (best === null || m.index < best.m.index)) best = { m, marks };
    }
    if (!best) { segs.push({ text: s, marks: base }); break; }
    const { m, marks } = best;
    if (m.index) segs.push({ text: s.slice(0, m.index), marks: base });
    segs.push(...parseInline(m[1], [...new Set([...base, ...marks])]));
    s = s.slice(m.index + m[0].length);
  }
  return segs;
}

function inlineNodes(text) {
  return parseInline(text)
    .filter((x) => x.text)
    .map((x) => ({
      type: 'text', text: x.text,
      ...(x.marks.length ? { marks: x.marks.map((t) => ({ type: t })) } : {}),
    }));
}

function para(text) {
  const content = inlineNodes(text);
  return { type: 'paragraph', ...(content.length ? { content } : {}) };
}

// ---------- md → doc ----------
// การจัดหน้า (align) เก็บเป็นคอมเมนต์นำหน้าบล็อก <!--align:center--> (คงไฟล์เป็น markdown แท้
// เปิดร่วมกับ v1 ได้ — v1 จะเห็นเป็นข้อความคอมเมนต์เฉย ๆ ไม่พัง)
const RE_ALIGN = /^<!--align:(left|center|right|justify)-->/;
function mdToDoc(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    let align = null;
    const am = RE_ALIGN.exec(line);
    if (am) { align = am[1] === 'left' ? null : am[1]; line = line.slice(am[0].length); }
    let m;
    if ((m = RE_IMG.exec(line))) {
      out.push({ type: 'figure', attrs: { src: m[2], alt: m[1], md: line.trimEnd() } });
      i++;
    } else if ((m = RE_H.exec(line))) {
      const content = inlineNodes(line.slice(m[0].length));
      out.push({ type: 'heading', attrs: { level: m[1].length, align },
                 ...(content.length ? { content } : {}) });
      i++;
    } else if (line.startsWith('> ')) {
      const ps = [];
      while (i < lines.length && lines[i].startsWith('> ')) { ps.push(para(lines[i].slice(2))); i++; }
      out.push({ type: 'blockquote', content: ps });
    } else if (RE_UL.test(line)) {
      const items = [];
      while (i < lines.length && RE_UL.test(lines[i])) {
        items.push({ type: 'list_item', content: [para(lines[i].slice(2))] }); i++;
      }
      out.push({ type: 'bullet_list', content: items });
    } else if ((m = RE_OL.exec(line))) {
      const start = parseInt(m[1], 10);
      const items = [];
      while (i < lines.length && RE_OL.test(lines[i])) {
        items.push({ type: 'list_item', content: [para(lines[i].replace(RE_OL, ''))] }); i++;
      }
      out.push({ type: 'ordered_list', attrs: { order: start }, content: items });
    } else {
      const content = inlineNodes(line);
      out.push({ type: 'paragraph', attrs: { align },
                 ...(content.length ? { content } : {}) });
      i++;
    }
  }
  return { type: 'doc', content: out.length ? out : [{ type: 'paragraph' }] };
}

// ---------- inline: nodes → md (ซ้อนเครื่องหมายตามความยาวช่วงจริง เหมือน v1) ----------
const MARKSET = ['strong', 'em', 'underline', 'strike'];
function starKind(sig) {
  if (sig.has('strong') && sig.has('em')) return '***';
  if (sig.has('strong')) return '**';
  if (sig.has('em')) return '*';
  return '';
}

function emitRuns(runs) {
  const extent = (kind, idx) => {
    let n = 0;
    for (let j = idx; j < runs.length; j++) {
      const sig = runs[j].sig;
      if (kind === '~~' && !sig.has('strike')) break;
      if (kind === '_' && !sig.has('underline')) break;
      if (kind !== '~~' && kind !== '_' && starKind(sig) !== kind) break;
      n += runs[j].text.length;
    }
    return n;
  };
  let out = '';
  let stack = [];
  runs.forEach((run, idx) => {
    const ks = starKind(run.sig);
    const need = new Set();
    if (run.sig.has('strike')) need.add('~~');
    if (run.sig.has('underline')) need.add('_');
    if (ks) need.add(ks);
    const bad = stack.findIndex((mk) => !need.has(mk));
    const pool = new Set();
    if (bad !== -1) {
      for (let j = stack.length - 1; j >= bad; j--) {
        out += stack[j];
        if (need.has(stack[j])) pool.add(stack[j]);
      }
      stack = stack.slice(0, bad);
    }
    for (const mk of need) if (!stack.includes(mk)) pool.add(mk);
    for (const mk of [...pool].sort((a, b) => extent(b, idx) - extent(a, idx))) {
      out += mk; stack.push(mk);
    }
    out += run.text;
  });
  for (let j = stack.length - 1; j >= 0; j--) out += stack[j];
  return out;
}

function inlineToMd(content) {
  const runs = (content || []).filter((n) => n.type === 'text').map((n) => ({
    text: n.text,
    sig: new Set((n.marks || []).map((m) => m.type).filter((t) => MARKSET.includes(t))),
  }));
  return emitRuns(runs);
}

// ---------- doc → md ----------
function docToMd(doc) {
  const lines = [];
  const alignPfx = (n) => { const a = (n.attrs || {}).align;
                            return a && a !== 'left' ? `<!--align:${a}-->` : ''; };
  for (const node of doc.content || []) {
    switch (node.type) {
      case 'figure': {
        const a = node.attrs || {};
        lines.push(a.md || `![${a.alt || ''}](${a.src || ''})`);
        break;
      }
      case 'heading':
        lines.push(alignPfx(node) + '#'.repeat((node.attrs || {}).level || 1) + ' ' + inlineToMd(node.content));
        break;
      case 'blockquote':
        for (const p of node.content || []) lines.push('> ' + inlineToMd(p.content));
        break;
      case 'bullet_list':
        for (const it of node.content || [])
          lines.push('- ' + inlineToMd(((it.content || [])[0] || {}).content));
        break;
      case 'ordered_list': {
        let n = (node.attrs || {}).order || 1;
        for (const it of node.content || [])
          lines.push(`${n++}. ` + inlineToMd(((it.content || [])[0] || {}).content));
        break;
      }
      default:
        lines.push(alignPfx(node) + inlineToMd(node.content));
    }
  }
  return lines.join('\n');
}

// ---------- frontmatter (โครงเดียวกับ v1: --- k: v --- ) ----------
function parseMdFile(text) {
  let meta = {}, body = text;
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3);
    if (end !== -1) {
      for (const line of text.slice(3, end).split('\n')) {
        const m = /^(\w[\w-]*):\s*(.*)$/.exec(line);
        if (!m) continue;
        const v = m[2].trim();
        meta[m[1]] = v.startsWith('[') && v.endsWith(']')
          ? v.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean) : v;
      }
      body = text.slice(end + 4).replace(/^\n+/, '');
    }
  }
  return { meta, body };
}

function dumpMdFile(meta, body) {
  const out = ['---'];
  for (const [k, v] of Object.entries(meta))
    out.push(Array.isArray(v) ? `${k}: [${v.join(', ')}]` : `${k}: ${v}`);
  out.push('---\n');
  return out.join('\n') + body;
}

function countWords(body) {
  const t = body.replace(/[#>*_~\-!\[\]()]/g, ' ');
  let n = 0;
  for (const chunk of t.split(/\s+/)) {
    if (!chunk) continue;
    n += /[\u0E00-\u0E7F]/.test(chunk) ? Math.max(1, Math.round(chunk.length / 5)) : 1;
  }
  return n;
}

module.exports = { mdToDoc, docToMd, parseMdFile, dumpMdFile, countWords };
