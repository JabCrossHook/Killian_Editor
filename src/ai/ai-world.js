// ai-world.js — สร้างเนื้อหาโลก (worldbuilding) ตามเทมเพลต + schema (ข้อ 76)
// spec: docs/76-ai-world.md · ผลลัพธ์เป็นข้อมูลมีโครงสร้าง → เขียนเข้า Wiki ได้ตรง ๆ
import { extractJson, validate, estimateTokens } from './ai-core.js';

const SYSTEM = 'คุณเป็นนักสร้างโลก (worldbuilder) สำหรับนิยาย/บทภาพยนตร์ภาษาไทย '
  + 'สร้างรายละเอียดที่สอดคล้องกันเอง มีเหตุผลภายในโลก และใช้เขียนเรื่องต่อได้จริง '
  + 'ตอบเป็น JSON ตามโครงที่กำหนดเท่านั้น ห้ามมีข้อความอื่นนอก JSON';

// ───────── เทมเพลตต่อประเภท ─────────
// fields = ค่าเดี่ยว (ลง Wiki เป็นฟิลด์) · sections = เนื้อหายาว (ลง Wiki เป็นหัวข้อ)
export const WORLD_TEMPLATES = {
  magic: {
    label: 'ระบบเวทมนตร์', category: 'lore', icon: '✨',
    fields: [
      { key: 'name', label: 'ชื่อระบบ' },
      { key: 'source', label: 'แหล่งพลัง' },
      { key: 'cost', label: 'ราคาที่ต้องจ่าย' },
      { key: 'limits', label: 'ข้อจำกัด' },
      { key: 'whoCanUse', label: 'ใครใช้ได้' },
      { key: 'rarity', label: 'ความแพร่หลาย' },
    ],
    sections: ['กฎของระบบ', 'วิธีใช้งานจริง', 'ผลข้างเคียงและอันตราย', 'ผลกระทบต่อสังคม', 'ปมที่เอาไปเขียนต่อได้'],
  },
  city: {
    label: 'เมือง', category: 'locations', icon: '🏙',
    fields: [
      { key: 'name', label: 'ชื่อเมือง' },
      { key: 'population', label: 'ประชากร' },
      { key: 'geography', label: 'ภูมิประเทศ' },
      { key: 'government', label: 'การปกครอง' },
      { key: 'economy', label: 'เศรษฐกิจหลัก' },
      { key: 'landmark', label: 'สถานที่สำคัญ' },
    ],
    sections: ['ภาพรวมและบรรยากาศ', 'ย่านสำคัญ', 'ผู้มีอำนาจและกลุ่มอิทธิพล', 'ปัญหาที่เมืองนี้เผชิญ', 'ปมที่เอาไปเขียนต่อได้'],
  },
  culture: {
    label: 'วัฒนธรรม', category: 'lore', icon: '🎎',
    fields: [
      { key: 'name', label: 'ชื่อกลุ่ม/วัฒนธรรม' },
      { key: 'values', label: 'ค่านิยมหลัก' },
      { key: 'language', label: 'ภาษา/สำเนียง' },
      { key: 'taboo', label: 'ข้อห้าม' },
      { key: 'ritual', label: 'พิธีกรรมสำคัญ' },
      { key: 'hierarchy', label: 'ลำดับชั้นทางสังคม' },
    ],
    sections: ['ชีวิตประจำวัน', 'ประเพณีและเทศกาล', 'ความเชื่อ', 'ความสัมพันธ์กับกลุ่มอื่น', 'ปมที่เอาไปเขียนต่อได้'],
  },
  economy: {
    label: 'เศรษฐกิจ', category: 'lore', icon: '💰',
    fields: [
      { key: 'name', label: 'ชื่อระบบเศรษฐกิจ' },
      { key: 'currency', label: 'สกุลเงิน/สื่อกลาง' },
      { key: 'mainTrade', label: 'สินค้าหลัก' },
      { key: 'scarcity', label: 'ของที่ขาดแคลน' },
      { key: 'powerHolders', label: 'ใครคุมความมั่งคั่ง' },
      { key: 'blackMarket', label: 'ตลาดมืด' },
    ],
    sections: ['โครงสร้างการค้า', 'ชนชั้นและรายได้', 'วิกฤตที่กำลังก่อตัว', 'ปมที่เอาไปเขียนต่อได้'],
  },
  religion: {
    label: 'ศาสนา/ความเชื่อ', category: 'lore', icon: '⛩',
    fields: [
      { key: 'name', label: 'ชื่อศาสนา/ลัทธิ' },
      { key: 'deity', label: 'สิ่งที่นับถือ' },
      { key: 'doctrine', label: 'หลักคำสอน' },
      { key: 'clergy', label: 'นักบวช/ผู้นำ' },
      { key: 'symbol', label: 'สัญลักษณ์' },
      { key: 'heresy', label: 'สิ่งที่ถือว่านอกรีต' },
    ],
    sections: ['กำเนิดและตำนาน', 'พิธีกรรม', 'อำนาจทางการเมือง', 'ผู้เห็นต่าง', 'ปมที่เอาไปเขียนต่อได้'],
  },
  faction: {
    label: 'กลุ่ม/องค์กร', category: 'lore', icon: '⚔',
    fields: [
      { key: 'name', label: 'ชื่อกลุ่ม' },
      { key: 'goal', label: 'เป้าหมาย' },
      { key: 'leader', label: 'ผู้นำ' },
      { key: 'members', label: 'สมาชิก/กำลังพล' },
      { key: 'methods', label: 'วิธีการ' },
      { key: 'enemy', label: 'ศัตรู' },
    ],
    sections: ['ความเป็นมา', 'โครงสร้างภายใน', 'ทรัพยากรและจุดอ่อน', 'แผนการปัจจุบัน', 'ปมที่เอาไปเขียนต่อได้'],
  },
};
export const WORLD_TYPES = Object.keys(WORLD_TEMPLATES);
export function getTemplate(type) { return WORLD_TEMPLATES[type] || null; }

/**
 * Build the worldbuilding prompt from a template. Pure.
 * @param {string} type  key of WORLD_TEMPLATES
 * @param {string} prompt  what the author wants ("เมืองท่าเรือที่ปกครองโดยสมาคมพ่อค้า")
 * @param {object} opts  { context, tone, existing, language }
 */
export function buildWorldPrompt(type, prompt, opts = {}) {
  const tpl = getTemplate(type);
  if (!tpl) return null;
  const lines = [];
  lines.push(`สร้าง "${tpl.label}" สำหรับโลกของเรื่องนี้ ตามคำสั่งของผู้เขียน: ${prompt || '(ผู้เขียนไม่ได้ระบุ — คิดให้เหมาะกับบริบท)'}`);
  lines.push('');
  lines.push('ข้อกำหนด:');
  lines.push('1. ทุกอย่างต้องสอดคล้องกันเอง และสอดคล้องกับบริบทของเรื่องที่ให้มา (ถ้ามี)');
  lines.push('2. เขียนเป็นภาษาไทย กระชับ ใช้ได้จริง ไม่ใช่คำสวยลอย ๆ');
  lines.push('3. ทุกหัวข้อต้องมีเนื้อหาอย่างน้อย 2-4 ประโยค');
  lines.push('4. ปิดท้ายด้วยปมที่เอาไปเขียนเป็นฉากต่อได้จริง');
  if (opts.tone) lines.push('5. โทน/แนวของโลก: ' + opts.tone);
  if (opts.existing) {
    lines.push('', '### ของเดิมที่มีอยู่แล้ว (ห้ามขัดกัน)', String(opts.existing).slice(0, 2000));
  }
  if (opts.context) {
    lines.push('', '### บริบทของเรื่อง', typeof opts.context === 'string' ? opts.context : JSON.stringify(opts.context));
  }
  lines.push('', '### รูปแบบคำตอบ (JSON เท่านั้น)');
  lines.push(JSON.stringify({
    name: 'ชื่อ',
    fields: Object.fromEntries(tpl.fields.filter((f) => f.key !== 'name').map((f) => [f.key, f.label])),
    sections: tpl.sections.map((s) => ({ title: s, body: 'เนื้อหา 2-4 ประโยค' })),
    tags: ['คำค้น1', 'คำค้น2'],
  }, null, 2));
  const built = lines.join('\n');
  return { system: SYSTEM, prompt: built, tokens: estimateTokens(built), type, template: tpl };
}

/**
 * Parse + validate a model reply against the template.
 * @returns {{type, name, fields:object, sections:Array<{title,body}>, tags:Array, missing:Array}}
 */
export function parseWorld(type, text) {
  const tpl = getTemplate(type);
  const data = extractJson(text) || {};
  const obj = Array.isArray(data) ? (data[0] || {}) : data;
  const fields = { ...(obj.fields || {}) };
  for (const [k, v] of Object.entries(obj)) {                 // โมเดลชอบวางฟิลด์ไว้ระดับบนสุด
    if (['fields', 'sections', 'tags', 'name'].includes(k)) continue;
    if (typeof v === 'string' && !(k in fields)) fields[k] = v;
  }
  const keys = tpl ? tpl.fields.map((f) => f.key).filter((k) => k !== 'name') : Object.keys(fields);
  const clean = {};
  for (const k of keys) clean[k] = str(fields[k]);
  const sections = validate(obj.sections, {
    title: { required: true, type: 'string' }, body: { required: true, type: 'string' },
  });
  const missing = [
    ...keys.filter((k) => !clean[k]),
    ...((tpl ? tpl.sections : []).filter((s) => !sections.some((x) => x.title.includes(s) || s.includes(x.title)))),
  ];
  return {
    type, template: tpl ? tpl.label : type,
    name: str(obj.name) || str(fields.name) || '',
    fields: clean,
    sections,
    tags: (Array.isArray(obj.tags) ? obj.tags : []).map(str).filter(Boolean),
    missing,
    ok: !!(str(obj.name) || sections.length),
  };
}
const str = (v) => (v == null ? '' : (typeof v === 'string' ? v.trim() : (typeof v === 'object' ? JSON.stringify(v) : String(v))));

/** Convert generated world data into a Wiki entity ready to be written as JSON. */
export function toWikiEntity(world, opts = {}) {
  const tpl = getTemplate(world.type);
  const cat = opts.category || (tpl && tpl.category) || 'lore';
  const notes = (world.sections || []).map((s) => `## ${s.title}\n${s.body}`).join('\n\n');
  return {
    name: world.name || opts.name || 'ไม่มีชื่อ',
    entityTypeKey: cat,
    aliases: [],
    tags: world.tags || [],
    fields: { ...world.fields, worldType: world.type },
    notes,
    createdBy: 'ai-world',
  };
}
/** Markdown preview (for the dialog / for pasting into a scene). */
export function toMarkdown(world) {
  const tpl = getTemplate(world.type);
  const out = [`# ${world.name || '(ไม่มีชื่อ)'}`, ''];
  const labels = Object.fromEntries(((tpl && tpl.fields) || []).map((f) => [f.key, f.label]));
  for (const [k, v] of Object.entries(world.fields || {})) if (v) out.push(`- **${labels[k] || k}:** ${v}`);
  out.push('');
  for (const s of world.sections || []) out.push(`## ${s.title}`, s.body, '');
  if (world.tags && world.tags.length) out.push('แท็ก: ' + world.tags.map((t) => '#' + t).join(' '));
  return out.join('\n').trim();
}

/**
 * Generate structured world content.
 * @param {string} type    'magic'|'city'|'culture'|'economy'|'religion'|'faction'
 * @param {string} prompt  free-form request from the author
 * @param {object} options { client, context, existing, tone, model, temperature, maxTokens, retryOnMissing }
 * @returns {Promise<{ok, world, prompt, usage, cost, error?}>}
 */
export async function generateWorld(type, prompt, options = {}) {
  const built = buildWorldPrompt(type, prompt, options);
  if (!built) return { ok: false, error: 'ไม่รู้จักประเภท: ' + type, code: 'bad-type', types: WORLD_TYPES };
  const client = options.client;
  if (!client) return { ok: false, prompt: built.prompt, error: 'ไม่ได้ตั้งค่า AI client', code: 'no-client' };

  const call = () => client.complete({
    prompt: built.prompt, system: built.system, feature: 'worldbuilding:' + type,
    model: options.model, temperature: options.temperature ?? 0.9,   // สร้างโลก = ต้องการความหลากหลาย
    maxTokens: options.maxTokens || 1800,
  });
  let res = await call();
  if (!res.ok) return { ...res, prompt: built.prompt };
  let world = parseWorld(type, res.text);
  // ตอบไม่ครบโครง → ลองอีกรอบเดียว (โมเดลเล็กมักตกหัวข้อ)
  if (!world.ok && options.retryOnMissing !== false) {
    res = await call();
    if (res.ok) world = parseWorld(type, res.text);
  }
  if (!world.ok) return { ok: false, world, prompt: built.prompt, error: 'AI ตอบไม่ตรงโครงที่กำหนด', code: 'bad-shape', usage: res.usage };
  return { ok: true, world, prompt: built.prompt, usage: res.usage, cost: res.cost, raw: res.text };
}
