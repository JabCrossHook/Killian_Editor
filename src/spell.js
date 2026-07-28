// ตรวจคำผิดแบบออฟไลน์ — ไทย (maximal matching) + อังกฤษ (wordlist + สัณฐานวิทยา)
// พอร์ตจาก Killian v1 (spell.py) — ไม่ใช้ไลบรารีภายนอก
// คลังคำโหลดจากไฟล์ภายนอก (renderer/assets/*.txt + Plugins/dictionaries/*.txt) ไม่ฝังใน bundle

const THAI_RE = /[\u0E00-\u0E7F]+/g;
const LATIN_RE = /[A-Za-z][A-Za-z'\u2019]*/g;
const THAI_FULL = /^[\u0E00-\u0E7F]+$/;
const MAX_TH_LEN = 24;   // ความยาวคำไทยยาวสุดที่ลองจับ (กันช้า)

// คลังคำหลัก (โหลดครั้งเดียว) + คำเสริม (personal/plugin — เปลี่ยนได้ระหว่างใช้งาน)
const base = { th: new Set(), en: new Set(), loaded: false };
let extraTh = new Set();
let extraEn = new Set();

// ป้อนคลังคำหลักจากข้อความไฟล์ dict (เรียกครั้งเดียวตอนเริ่ม)
export function loadBase(thText, enText) {
  base.th = new Set(); base.en = new Set();
  for (const w of (thText || '').split('\n')) {
    const s = w.trim();
    if (s && !s.startsWith('#')) base.th.add(s);
  }
  for (const w of (enText || '').split('\n')) {
    const s = w.trim().toLowerCase();
    if (s) base.en.add(s);
  }
  base.loaded = true;
}

export function ready() { return base.loaded && (base.th.size > 0 || base.en.size > 0); }

// ป้อนคำเสริม (จาก personal dictionary.json + Plugins/dictionaries/*.txt)
export function setExtra(words) {
  extraTh = new Set(); extraEn = new Set();
  for (const w of words || []) {
    const s = String(w).trim();
    if (!s) continue;
    if (THAI_FULL.test(s)) extraTh.add(s);
    extraEn.add(s.toLowerCase());
  }
}

// ---- ตัดคำไทยแบบ DP (maximal matching) หา 'ช่วงที่ตัดไม่ลงเลย' ----
function reachForward(run, known) {
  const n = run.length;
  const ok = new Array(n + 1).fill(false); ok[0] = true;
  let far = 0;
  for (let i = 1; i <= n; i++) {
    for (let L = 1; L <= Math.min(MAX_TH_LEN, i); L++) {
      if (ok[i - L] && known.has(run.slice(i - L, i))) { ok[i] = true; break; }
    }
    if (ok[i]) far = i;
  }
  return { full: ok[n], far };
}
function reachBackward(run, known) {
  const n = run.length;
  const ok = new Array(n + 1).fill(false); ok[n] = true;
  let near = n;
  for (let i = n - 1; i >= 0; i--) {
    for (let L = 1; L <= Math.min(MAX_TH_LEN, n - i); L++) {
      if (ok[i + L] && known.has(run.slice(i, i + L))) { ok[i] = true; break; }
    }
    if (ok[i]) near = i;
  }
  return near;
}
function badThaiSpans(run, known) {
  const { full, far } = reachForward(run, known);
  if (full) return [];
  const near = reachBackward(run, known);
  let a = Math.min(far, near), b = Math.max(far, near);
  if (b <= a) { a = 0; b = run.length; }
  return [[a, b]];
}

// ---- ตรวจข้อความ → [{start, end, word}] (offset ในสตริง) ----
export function check(text) {
  if (!text || !base.loaded) return [];
  const thKnown = extraTh.size ? new Set([...base.th, ...extraTh]) : base.th;
  const enKnown = extraEn.size ? new Set([...base.en, ...extraEn]) : base.en;
  const out = [];
  let m;
  THAI_RE.lastIndex = 0;
  while ((m = THAI_RE.exec(text))) {
    const run = m[0];
    if (run.length < 2 || thKnown.has(run)) continue;
    for (const [a, b] of badThaiSpans(run, thKnown)) {
      if (b - a >= 2) out.push({ start: m.index + a, end: m.index + b, word: run.slice(a, b) });
    }
  }
  LATIN_RE.lastIndex = 0;
  while ((m = LATIN_RE.exec(text))) {
    const w = m[0];
    if (w.length < 3) continue;
    const lw = w.toLowerCase().replace(/^['\u2019]+|['\u2019]+$/g, '');
    if (enKnown.has(lw)) continue;
    // สัณฐานวิทยาแบบเบา ๆ: พหูพจน์/กริยา
    if (lw.endsWith('s') && enKnown.has(lw.slice(0, -1))) continue;
    if (lw.endsWith('es') && enKnown.has(lw.slice(0, -2))) continue;
    if (lw.endsWith('ed') && (enKnown.has(lw.slice(0, -2)) || enKnown.has(lw.slice(0, -1)))) continue;
    if (lw.endsWith('ing') && (enKnown.has(lw.slice(0, -3)) || enKnown.has(lw.slice(0, -3) + 'e'))) continue;
    out.push({ start: m.index, end: m.index + w.length, word: w });
  }
  return out;
}
