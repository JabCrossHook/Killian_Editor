// ai-dialogue.js — สร้างบทสนทนาจากบุคลิกตัวละครใน Wiki (ข้อ 74)
// spec: docs/74-ai-dialogue.md · รูปแบบผลลัพธ์ตรงกับ fountain ของ K2 (.หัวฉาก @ตัวละคร (วงเล็บ) บทพูด)
import { estimateTokens } from './ai-core.js';

const SYSTEM = 'คุณเป็นนักเขียนบทภาพยนตร์ภาษาไทยมืออาชีพ เขียนบทสนทนาที่ฟังเหมือนคนพูดจริง '
  + 'ตัวละครแต่ละตัวต้องมีน้ำเสียงต่างกันชัดเจนตามบุคลิกที่ให้มา '
  + 'ส่งเฉพาะบทสนทนา ห้ามอธิบาย ห้ามใส่หัวข้อหรือคำนำ';

// ฟิลด์ใน Wiki ที่ใช้เป็นบุคลิก (ยอมรับได้ทั้งคีย์ไทยและอังกฤษ — โปรเจกต์เก่าตั้งชื่อฟิลด์เองได้)
const FIELD_ALIASES = {
  role: ['role', 'บทบาท', 'ตำแหน่ง'],
  age: ['age', 'อายุ'],
  personality: ['personality', 'บุคลิก', 'นิสัย', 'traits'],
  speech: ['speech', 'speechStyle', 'การพูด', 'สำนวน', 'น้ำเสียง'],
  background: ['background', 'ภูมิหลัง', 'ประวัติ', 'bio'],
  goal: ['goal', 'เป้าหมาย', 'motivation', 'แรงจูงใจ'],
  fear: ['fear', 'ความกลัว', 'จุดอ่อน', 'weakness'],
  quirk: ['quirk', 'ลักษณะเฉพาะ', 'ติดปาก'],
};

/**
 * Normalize a Wiki entity into a character profile the prompt can use.
 * @param {object} entity raw Wiki json (any field naming)
 */
export function characterProfile(entity) {
  if (!entity) return null;
  const src = { ...(entity.fields || {}), ...entity };
  const pick = (keys) => {
    for (const k of keys) {
      const v = src[k];
      if (v != null && String(v).trim()) return String(v).trim();
    }
    return '';
  };
  const out = { id: entity.id || '', name: entity.name || entity.title || '(ไม่ทราบชื่อ)', aliases: entity.aliases || [] };
  for (const [key, keys] of Object.entries(FIELD_ALIASES)) out[key] = pick(keys);
  out.relationships = (entity.relationships || []).map((r) => ({
    target: r.targetName || r.target || '', role: r.role || '',
  })).filter((r) => r.target);
  out.notes = entity.notes || entity.summary || '';
  return out;
}
/** Render a profile as prompt text (pure). */
export function profileBlock(p) {
  if (!p) return '';
  const rows = [`ชื่อ: ${p.name}` + (p.aliases && p.aliases.length ? ` (เรียกอีกอย่างว่า ${p.aliases.join(', ')})` : '')];
  const add = (label, v) => { if (v) rows.push(`${label}: ${v}`); };
  add('บทบาท', p.role); add('อายุ', p.age); add('บุคลิก', p.personality);
  add('วิธีพูด/สำนวน', p.speech); add('ภูมิหลัง', p.background);
  add('เป้าหมาย', p.goal); add('ความกลัว/จุดอ่อน', p.fear); add('ติดปาก', p.quirk);
  if (p.relationships && p.relationships.length) {
    rows.push('ความสัมพันธ์: ' + p.relationships.map((r) => `${r.target}${r.role ? ' (' + r.role + ')' : ''}`).join(', '));
  }
  add('อื่น ๆ', p.notes);
  return rows.join('\n');
}

export const DIALOGUE_FORMATS = { screenplay: 'บทภาพยนตร์', prose: 'ร้อยแก้ว (มีบรรยายคั่น)' };

/**
 * Build the dialogue prompt. Pure.
 * @param {object} a,b   profiles (from characterProfile)
 * @param {object|string} context  { situation, place, time, goal, conflict, mood, before }
 * @param {object} opts  { format, lines, language, tone }
 */
export function buildDialoguePrompt(a, b, context = {}, opts = {}) {
  const format = opts.format === 'prose' ? 'prose' : 'screenplay';
  const lines = [];
  const exchanges = opts.lines || 8;
  lines.push(`เขียนบทสนทนาระหว่างตัวละคร 2 ตัวต่อไปนี้ ประมาณ ${exchanges} รอบการโต้ตอบ`);
  lines.push('ให้แต่ละคนพูดตามบุคลิก วิธีพูด และเป้าหมายของตัวเอง — ห้ามให้ทั้งคู่พูดเหมือนกัน');
  if (opts.tone) lines.push('โทนโดยรวม: ' + opts.tone);
  lines.push('');
  lines.push('### ตัวละคร ก');
  lines.push(profileBlock(a));
  lines.push('');
  lines.push('### ตัวละคร ข');
  lines.push(profileBlock(b));

  const ctx = typeof context === 'string' ? { situation: context } : (context || {});
  const cRows = [];
  if (ctx.situation) cRows.push('สถานการณ์: ' + ctx.situation);
  if (ctx.place) cRows.push('สถานที่: ' + ctx.place);
  if (ctx.time) cRows.push('เวลา: ' + ctx.time);
  if (ctx.goal) cRows.push('สิ่งที่แต่ละฝ่ายต้องการจากบทสนทนานี้: ' + ctx.goal);
  if (ctx.conflict) cRows.push('ความขัดแย้ง: ' + ctx.conflict);
  if (ctx.mood) cRows.push('อารมณ์ของฉาก: ' + ctx.mood);
  if (cRows.length) { lines.push('', '### บริบทของฉาก', ...cRows); }
  if (ctx.before) { lines.push('', '### ข้อความก่อนหน้า (เขียนต่อให้กลมกลืน)', String(ctx.before).slice(0, 1500)); }

  lines.push('', '### รูปแบบผลลัพธ์');
  if (format === 'screenplay') {
    lines.push('ใช้รูปแบบบทภาพยนตร์แบบนี้เท่านั้น (ขึ้นบรรทัดใหม่ทุกครั้ง):');
    lines.push('@ชื่อตัวละคร');
    lines.push('(อารมณ์/การกระทำสั้น ๆ ถ้าจำเป็น)');
    lines.push('บทพูด');
    lines.push('ห้ามใส่หัวฉาก ห้ามใส่คำบรรยายยาว ห้ามใส่เลขลำดับ');
  } else {
    lines.push('เขียนเป็นร้อยแก้ว: บทพูดอยู่ในเครื่องหมายคำพูด "…" สลับกับคำบรรยายสั้น ๆ ว่าใครพูดและทำอะไร');
  }
  const prompt = lines.join('\n');
  return { system: SYSTEM, prompt, tokens: estimateTokens(prompt), format };
}

/**
 * Parse generated dialogue into structured lines.
 * @returns {{format, lines:Array<{speaker,paren,text}>, text:string}}
 */
export function parseDialogue(raw, opts = {}) {
  const format = opts.format === 'prose' ? 'prose' : 'screenplay';
  const text = String(raw || '').replace(/```[a-z]*\n?/gi, '').trim();
  const out = [];
  if (format === 'screenplay') {
    let cur = null;
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith('@')) {                                  // รูปแบบที่สั่งไป
        cur = { speaker: line.slice(1).trim(), paren: '', text: '' };
        out.push(cur);
        continue;
      }
      const colon = line.match(/^([^:：]{1,30})[:：]\s*(.+)$/);   // โมเดลชอบตอบ "ชื่อ: บทพูด"
      if (colon && !line.startsWith('(')) {
        cur = { speaker: colon[1].replace(/^@/, '').trim(), paren: '', text: colon[2].trim() };
        out.push(cur);
        continue;
      }
      if (/^\(.*\)$/.test(line)) { if (cur) cur.paren = line.slice(1, -1).trim(); continue; }
      if (cur) cur.text = cur.text ? cur.text + ' ' + line : line;
    }
  } else {
    for (const para of text.split(/\n{2,}/)) {
      const t = para.trim();
      if (!t) continue;
      const m = t.match(/^([^"“”]{0,40}?)\s*[""“](.+)[""”]/);
      out.push({ speaker: (m && m[1].trim()) || '', paren: '', text: t });
    }
  }
  return { format, lines: out.filter((l) => l.text || l.speaker), text: format === 'screenplay' ? toScreenplay(out) : text };
}

/** Render structured lines as K2 fountain (@character / (paren) / dialogue). */
export function toScreenplay(lines) {
  const out = [];
  for (const l of lines || []) {
    if (!l || (!l.speaker && !l.text)) continue;
    if (l.speaker) out.push('@' + l.speaker);
    if (l.paren) out.push('(' + l.paren + ')');
    if (l.text) out.push(l.text);
    out.push('');
  }
  return out.join('\n').trim();
}
/** Render structured lines as prose paragraphs. */
export function toProse(lines) {
  return (lines || []).filter((l) => l && l.text).map((l) => {
    if (!l.speaker) return l.text;
    const paren = l.paren ? `${l.paren} ` : '';
    return `${l.speaker}${paren ? ' ' + paren : ''} พูดว่า "${l.text}"`.replace(/\s+/g, ' ');
  }).join('\n\n');
}

/**
 * Generate dialogue between two characters.
 * @param {object} characterA raw Wiki entity or profile
 * @param {object} characterB raw Wiki entity or profile
 * @param {object} context    { situation, place, time, goal, conflict, mood, before }
 * @param {object} options    { client, format, lines, tone, model, temperature, maxTokens, stream, onChunk }
 * @returns {Promise<{ok, text, lines, format, prompt, usage, cost, error?}>}
 */
export async function generateDialogue(characterA, characterB, context = {}, options = {}) {
  const client = options.client;
  const a = characterA && characterA.personality !== undefined ? characterA : characterProfile(characterA);
  const b = characterB && characterB.personality !== undefined ? characterB : characterProfile(characterB);
  if (!a || !b) return { ok: false, text: '', lines: [], error: 'ต้องมีตัวละคร 2 ตัว', code: 'no-characters' };
  const built = buildDialoguePrompt(a, b, context, options);
  if (!client) return { ok: false, text: '', lines: [], prompt: built.prompt, error: 'ไม่ได้ตั้งค่า AI client', code: 'no-client' };

  const req = {
    prompt: built.prompt, system: built.system, feature: 'dialogue',
    model: options.model, temperature: options.temperature ?? 0.85,   // งานสร้างสรรค์ → สูงหน่อย
    maxTokens: options.maxTokens || 1200,
  };
  const res = options.stream && typeof options.onChunk === 'function'
    ? await client.stream(req, options.onChunk) : await client.complete(req);
  if (!res.ok) return { ...res, lines: [], prompt: built.prompt };
  const parsed = parseDialogue(res.text, { format: built.format });
  return { ...res, text: parsed.text, lines: parsed.lines, format: parsed.format, prompt: built.prompt,
           speakers: [...new Set(parsed.lines.map((l) => l.speaker).filter(Boolean))] };
}
