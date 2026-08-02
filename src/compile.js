// ระบบ "เวิร์กโฟลว์ส่งออก" (compile workflows)
// แนวคิด: ฉบับร่าง 1 ชุด → ส่งออกได้หลายแบบ โดยประกอบจาก "ขั้นตอน" ที่เปิด/ปิด/สลับลำดับได้
//
// ไปป์ไลน์ 3 ช่วง (stage) — ลำดับภายในช่วงเดียวกันมีผลจริง
//   1) model  — คัดกรอง/แปลงตัวเนื้อหา (ตัดโน้ต, เอาเฉพาะเรื่องย่อ, ลอกมาร์กดาวน์ ฯลฯ)
//   2) render — ประกอบเป็นข้อความ (หน้าปก, หัวบท, ชื่อฉาก, ตัวคั่น, ขึ้นหน้าใหม่, สรุปสถิติ)
//   3) text   — แปลงข้อความสุดท้าย (→ HTML, สคริปต์เอง)
//
// model = { title, author, chapters: [ { title, scenes: [ {title, body, synopsis, status, type, words} ] } ] }
// ไฟล์นี้ "บริสุทธิ์" (ไม่แตะ DOM/ไฟล์) เพื่อให้เทสตรงๆ ได้

import { resolveVars } from './template-vars.js';

export const PAGE_BREAK = '<!-- ขึ้นหน้าใหม่ -->';

export const STEP_DEFS = [
  // ---- ช่วงเนื้อหา ----
  { key: 'skip-memo', stage: 'model', label: 'ตัดโน้ต (memo) ออก' },
  { key: 'filter-status', stage: 'model', label: 'เอาเฉพาะฉากที่สถานะ…',
    opts: { status: 'เขียนเสร็จ, ตรวจแล้ว' },
    fields: [{ k: 'status', label: 'สถานะ (คั่นด้วยจุลภาค)', type: 'text' }] },
  { key: 'synopsis-only', stage: 'model', label: 'ใช้เรื่องย่อแทนเนื้อหาฉาก' },
  { key: 'number-scenes', stage: 'model', label: 'ใส่เลขลำดับหน้าชื่อฉาก' },
  { key: 'strip-comments', stage: 'model', label: 'ตัดคอมเมนต์ %%…%% และ <!-- … -->' },
  { key: 'strip-mentions', stage: 'model', label: 'แปลงลิงก์วิกิ [[ชื่อ]] เป็นข้อความธรรมดา' },
  { key: 'strip-markdown', stage: 'model', label: 'ตัดสัญลักษณ์ Markdown (ข้อความล้วน)' },
  { key: 'resolve-vars', stage: 'model', label: 'แก้ไขตัวแปร {{ชื่อ}} จาก Wiki' },
  // ---- ช่วงประกอบ ----
  { key: 'cover', stage: 'render', label: 'หน้าปก (ชื่อเรื่อง / ผู้เขียน / จำนวนคำ)',
    opts: { author: '' }, fields: [{ k: 'author', label: 'ผู้เขียน (ว่าง = ใช้จากโปรเจกต์)', type: 'text' }] },
  // [97] หน้ารายชื่อตัวละคร (Cast of Characters) ประจำเล่ม — ปิดได้ที่นี่ หรือที่สวิตช์ในหน้ารายชื่อเอง
  { key: 'roster', stage: 'render', label: 'หน้ารายชื่อตัวละคร (Cast of Characters)' },
  { key: 'chapter-heading', stage: 'render', label: 'หัวบท',
    opts: { template: '## {title}' },
    fields: [{ k: 'template', label: 'รูปแบบ — ใช้ {n} {title} ได้', type: 'text' }] },
  { key: 'scene-heading', stage: 'render', label: 'ชื่อฉาก',
    opts: { template: '### {title}' },
    fields: [{ k: 'template', label: 'รูปแบบ — ใช้ {n} {title} ได้', type: 'text' }] },
  { key: 'scene-meta', stage: 'render', label: 'แนบสถานะ/จำนวนคำของฉาก (สำหรับ บ.ก.)' },
  { key: 'scene-separator', stage: 'render', label: 'ตัวคั่นระหว่างฉาก',
    opts: { text: '* * *' }, fields: [{ k: 'text', label: 'ข้อความคั่น', type: 'text' }] },
  { key: 'page-break', stage: 'render', label: 'ขึ้นหน้าใหม่ทุกบท' },
  { key: 'stats', stage: 'render', label: 'ต่อท้ายด้วยสรุปสถิติ' },
  // ---- ช่วงข้อความสุดท้าย ----
  { key: 'to-html', stage: 'text', label: 'แปลงเป็น HTML' },
  { key: 'js', stage: 'text', label: 'สคริปต์ JavaScript เอง',
    opts: { code: '// text = ข้อความที่ประกอบเสร็จ · คืนค่าข้อความใหม่\nreturn text;' },
    fields: [{ k: 'code', label: 'โค้ด (มีตัวแปร text, model)', type: 'code' }] },
];

export const stepDef = (k) => STEP_DEFS.find((s) => s.key === k) || null;

// ขั้นตอนหนึ่งชิ้นพร้อมค่าเริ่มต้น
export function mkStep(key, on = true, opts = null) {
  const d = stepDef(key);
  return { key, on, opts: { ...(d && d.opts ? d.opts : {}), ...(opts || {}) } };
}

const wf = (id, name, ext, keys) => ({
  id, name, ext, builtIn: true,
  steps: keys.map((k) => (Array.isArray(k) ? mkStep(k[0], true, k[1]) : mkStep(k))),
});

// พรีเซ็ตสำเร็จรูป — ก๊อบไปแก้เป็นของตัวเองได้ (ปุ่ม "ทำสำเนา")
export const PRESETS = [
  wf('manuscript', 'ต้นฉบับ (Markdown)', 'md',
     ['skip-memo', 'chapter-heading', 'scene-separator']),
  wf('reader', 'ร่างสำหรับคนอ่าน', 'md',
     ['cover', 'skip-memo', 'strip-comments', 'chapter-heading', 'scene-separator']),
  wf('editor', 'ร่างสำหรับบรรณาธิการ', 'md',
     ['cover', 'skip-memo', 'number-scenes', 'chapter-heading', 'scene-heading',
      'scene-meta', 'stats']),
  wf('synopsis', 'เรื่องย่อ', 'md',
     ['skip-memo', 'synopsis-only', 'chapter-heading', ['scene-heading', { template: '**{title}**' }]]),
  wf('plain', 'ข้อความล้วน (.txt)', 'txt',
     ['skip-memo', 'strip-comments', 'strip-mentions', 'strip-markdown',
      ['chapter-heading', { template: '{title}' }], 'scene-separator']),
  wf('html', 'เว็บ (HTML)', 'html',
     ['cover', 'skip-memo', 'chapter-heading', 'scene-separator', 'to-html']),
  wf('print', 'พร้อมพิมพ์ (HTML ขึ้นหน้าใหม่ทุกบท)', 'html',
     ['cover', 'skip-memo', 'chapter-heading', 'page-break', 'scene-separator', 'to-html']),
];

export function newWorkflow(name) {
  return { id: 'wf-' + Date.now().toString(36), name: name || 'เวิร์กโฟลว์ใหม่', ext: 'md',
           builtIn: false, steps: STEP_DEFS.map((d) => mkStep(d.key, false)) };
}

// ทำสำเนาพรีเซ็ตให้แก้ได้ + เติมขั้นตอนที่ยังไม่มีเป็นแบบ "ปิดไว้"
export function cloneWorkflow(src, name) {
  const have = new Set((src.steps || []).map((s) => s.key));
  return {
    id: 'wf-' + Date.now().toString(36), name: name || (src.name + ' (สำเนา)'),
    ext: src.ext || 'md', builtIn: false,
    steps: [...(src.steps || []).map((s) => ({ key: s.key, on: s.on !== false, opts: { ...s.opts } })),
            ...STEP_DEFS.filter((d) => !have.has(d.key)).map((d) => mkStep(d.key, false))],
  };
}

// ---------------- ตัวช่วยแปลงข้อความ ----------------
export function stripComments(s) {
  return s.replace(/%%[\s\S]*?%%/g, '').replace(/<!--[\s\S]*?-->/g, '');
}
export function stripMentions(s) {
  return s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1');
}
export function stripMarkdown(s) {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')      // รูป → ข้อความแทน
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')       // ลิงก์ → ข้อความ
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')            // หัวข้อ
    .replace(/^\s{0,3}>\s?/gm, '')                 // ยกคำพูด
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, '')     // รายการ
    .replace(/^\s{0,3}(-{3,}|\*{3,})\s*$/gm, '')   // เส้นคั่น
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`([^`]*)`/g, '$1');
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s)
  .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, (m, a, u) => `<img alt="${a}" src="${u}">`)
  .replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>')
  .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>')
  .replace(/(?<!_)_(?!_)([^_]+)_(?!_)/g, '<em>$1</em>')
  .replace(/~~(.*?)~~/g, '<del>$1</del>');

// แปลง Markdown → ชิ้นส่วน HTML (ไม่มี <html>/<head>) — ใช้ซ้ำได้ทั้ง compile และ export-blog
export function mdToHtmlBody(md) {
  const out = []; let list = null;
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of md.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (line.trim() === PAGE_BREAK) { closeList(); out.push('<div class="pb"></div>'); continue; }
    if (!line.trim()) { closeList(); continue; }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { closeList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { closeList(); out.push('<hr>'); continue; }
    const ul = /^\s*[-*+]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ul || ol) {
      const want = ul ? 'ul' : 'ol';
      if (list !== want) { closeList(); out.push(`<${want}>`); list = want; }
      out.push(`<li>${inline((ul || ol)[1])}</li>`); continue;
    }
    const bq = /^\s*>\s?(.*)$/.exec(line);
    if (bq) { closeList(); out.push(`<blockquote>${inline(bq[1])}</blockquote>`); continue; }
    closeList(); out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

// แปลง Markdown → หน้า HTML เต็ม (หัวข้อ/ย่อหน้า/ยกคำพูด/รายการ/เส้นคั่น/รูป)
export function mdToHtml(md, title) {
  return `<!DOCTYPE html>
<html lang="th"><head><meta charset="utf-8">
<title>${esc(title || '')}</title>
<style>
 body{max-width:42em;margin:3em auto;padding:0 1.2em;line-height:1.85;
      font-family:"Sarabun","Noto Sans Thai",system-ui,sans-serif;font-size:18px}
 h1,h2,h3{line-height:1.4} hr{border:0;border-top:1px solid #ccc;margin:2em 0}
 blockquote{border-left:3px solid #ccc;margin:1em 0;padding-left:1em;color:#555}
 img{max-width:100%} .pb{page-break-before:always;break-before:page;height:0}
 @media print{body{margin:0;max-width:none;font-size:12pt}}
</style></head><body>
${mdToHtmlBody(md)}
</body></html>`;
}

// escape สำหรับผู้เรียกภายนอก (ชื่อเรื่อง/ชื่อบทที่มาจากผู้ใช้)
export const escapeHtml = esc;

// ---------------- ไปป์ไลน์ ----------------
const fill = (tpl, n, title, ctx = {}) => {
  let s = String(tpl == null ? '' : tpl)
    .replace(/\{n\}/g, n).replace(/\{title\}/g, title);
  return resolveVars(s, ctx);
};

function modelStats(model) {
  let sc = 0, w = 0;
  for (const ch of model.chapters) for (const s of ch.scenes) { sc++; w += s.words || 0; }
  return { chapters: model.chapters.length, scenes: sc, words: w };
}

export function runWorkflow(model0, workflow, { allowJs = true, varCtx = {} } = {}) {
  const warn = [];
  // สำเนาลึกแบบพอเพียง — ไม่แก้ของเดิม
  const model = { title: model0.title, author: model0.author || '', roster: model0.roster || '',
    chapters: (model0.chapters || []).map((c) => ({ ...c, scenes: (c.scenes || []).map((s) => ({ ...s })) })) };
  const steps = (workflow.steps || []).filter((s) => s.on !== false);
  const at = (stage) => steps.filter((s) => (stepDef(s.key) || {}).stage === stage);
  const opt = (key, k, dflt) => {
    const s = steps.find((x) => x.key === key);
    const v = s && s.opts ? s.opts[k] : undefined;
    return v === undefined || v === null ? dflt : v;
  };
  const has = (key) => steps.some((s) => s.key === key);

  // ---- 1) ช่วงเนื้อหา ----
  for (const st of at('model')) {
    const o = st.opts || {};
    switch (st.key) {
      case 'skip-memo':
        for (const c of model.chapters) c.scenes = c.scenes.filter((s) => s.type !== 'memo');
        break;
      case 'filter-status': {
        const want = String(o.status || '').split(',').map((x) => x.trim()).filter(Boolean);
        if (want.length) for (const c of model.chapters)
          c.scenes = c.scenes.filter((s) => want.includes(String(s.status || '').trim()));
        break;
      }
      case 'synopsis-only':
        for (const c of model.chapters) for (const s of c.scenes) s.body = (s.synopsis || '').trim();
        break;
      case 'number-scenes': {
        let i = 0;
        for (const c of model.chapters) for (const s of c.scenes) s.title = `${++i}. ${s.title || ''}`;
        break;
      }
      case 'strip-comments':
        for (const c of model.chapters) for (const s of c.scenes) s.body = stripComments(s.body || '');
        break;
      case 'strip-mentions':
        for (const c of model.chapters) for (const s of c.scenes) s.body = stripMentions(s.body || '');
        break;
      case 'strip-markdown':
        for (const c of model.chapters) for (const s of c.scenes) s.body = stripMarkdown(s.body || '');
        break;
      case 'resolve-vars':
        for (const c of model.chapters) for (const s of c.scenes) {
          s.body = resolveVars(s.body || '', varCtx);
          s.title = resolveVars(s.title || '', varCtx);
        }
        break;
      default: break;
    }
  }

  // ---- 2) ช่วงประกอบข้อความ ----
  const out = [];
  const st0 = modelStats(model);
  if (has('cover')) {
    out.push('# ' + model.title, '');
    const au = String(opt('cover', 'author', '') || model.author || '').trim();
    if (au) out.push(au, '');
    out.push(`${st0.words.toLocaleString()} คำ · ${st0.chapters} บท · ${st0.scenes} ฉาก`, '');
    if (has('page-break')) out.push(PAGE_BREAK, '');
  } else {
    out.push('# ' + model.title, '');
  }
  // [97] หน้ารายชื่อตัวละคร — วางก่อนเนื้อเรื่อง แล้วขึ้นหน้าใหม่
  if (has('roster') && String(model.roster || '').trim()) {
    out.push(String(model.roster).trim(), '');
    if (has('page-break')) out.push(PAGE_BREAK, '');
  }
  const sep = String(opt('scene-separator', 'text', '* * *'));
  let cn = 0;
  for (const ch of model.chapters) {
    cn++;
    if (has('page-break') && cn > 1) out.push(PAGE_BREAK, '');
    if (has('chapter-heading'))
      out.push(fill(opt('chapter-heading', 'template', '## {title}'), cn, ch.title || '', varCtx), '');
    let sn = 0;
    for (const s of ch.scenes) {
      sn++;
      if (has('scene-separator') && sn > 1 && sep.trim()) out.push(sep, '');
      if (has('scene-heading'))
        out.push(fill(opt('scene-heading', 'template', '### {title}'), sn, s.title || '', varCtx), '');
      if (has('scene-meta'))
        out.push(`_[${s.status || 'ไม่ระบุสถานะ'} · ${(s.words || 0).toLocaleString()} คำ]_`, '');
      const b = String(s.body || '').trim();
      if (b) out.push(b, '');
    }
  }
  if (has('stats')) {
    out.push('---', '', '## สรุปสถิติ', '',
             `- บท: ${st0.chapters}`, `- ฉาก: ${st0.scenes}`,
             `- คำทั้งหมด: ${st0.words.toLocaleString()}`,
             `- เวลาอ่านโดยประมาณ: ${Math.max(1, Math.round(st0.words / 250))} นาที`, '');
  }
  let text = out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';

  // ---- 3) ช่วงข้อความสุดท้าย ----
  let ext = workflow.ext || 'md';
  for (const st of at('text')) {
    if (st.key === 'to-html') { text = mdToHtml(text, model.title); ext = 'html'; continue; }
    if (st.key === 'js') {
      if (!allowJs) { warn.push('ข้ามขั้นตอน JavaScript (ปิดไว้)'); continue; }
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('text', 'model', String((st.opts || {}).code || 'return text;'));
        const r = fn(text, model);
        if (typeof r === 'string') text = r;
        else warn.push('ขั้นตอน JavaScript ไม่ได้คืนค่าข้อความ — ข้ามไป');
      } catch (e) { warn.push('ขั้นตอน JavaScript ผิดพลาด: ' + e.message); }
    }
  }
  if (ext !== 'html') text = text.split(PAGE_BREAK).join('\f');
  return { text, ext, stats: st0, warnings: warn };
}
