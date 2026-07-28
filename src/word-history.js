// word-history.js + streak.js — สถิติคำรายวัน + การนับวันเขียนติดต่อ
import { state, log } from './core.js';

// ---- Word History (ข้อ 58) ----
export function getWordHistory() {
  if (!state.meta) return [];
  return state.meta.wordHistory || [];
}

// บันทึกจำนวนคำวันนี้ (เรียกตอน autosave หรือก่อนปิดโปรแกรม)
export async function recordDailyWords(totalWords) {
  if (!state.meta || !state.root) return;
  const today = new Date().toISOString().slice(0, 10);
  const hist = getWordHistory();
  // อัปเดตวันนี้ หรือเพิ่มใหม่
  const idx = hist.findIndex((h) => h.date === today);
  if (idx >= 0) {
    hist[idx].words = totalWords;
  } else {
    hist.push({ date: today, words: totalWords });
    // เก็บแค่ 180 วัน
    if (hist.length > 180) hist.shift();
  }
  state.meta.wordHistory = hist;
  try {
    const { saveProjectMeta } = await import('./app.js');
    await saveProjectMeta();
  } catch {}
}

// คำนวณจำนวนคำรวมจากทุกฉากในโปรเจกต์
export async function countProjectWords() {
  if (!state.root) return 0;
  let total = 0;
  try {
    for (const sec of await kapi.listDirs(state.root)) {
      const secP = await kapi.join(state.root, sec);
      if (!(await kapi.exists(await kapi.join(secP, 'section.json')))) continue;
      const dr = await kapi.join(secP, 'Draft');
      if (!(await kapi.exists(dr))) continue;
      for (const dn of await kapi.listDirs(dr)) {
        const dp = await kapi.join(dr, dn);
        const sf = await kapi.join(dp, 'scenes.json');
        if (!(await kapi.exists(sf))) continue;
        const d = await kapi.readJson(sf);
        for (const cg of Object.keys(d.chapters || {})) {
          for (const sc of (d.chapters[cg] || [])) {
            if (sc.type !== 'memo') total += sc.wordCount || 0;
          }
        }
      }
    }
  } catch (e) { log('warn', 'countProjectWords failed', e); }
  return total;
}

// ---- Writing Streak (ข้อ 59) ----
export function calcStreak(wordHistory) {
  const hist = wordHistory || getWordHistory();
  if (!hist.length) return 0;
  // เรียงวันที่ใหม่สุดก่อน
  const sorted = [...hist].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  // เช็ค: วันนี้เขียนหรือยัง (มีคำ > 0)
  const todayEntry = sorted.find((h) => h.date === today);
  if (!todayEntry || todayEntry.words <= 0) {
    // วันนี้ยังไม่ได้เขียน → เช็คเมื่อวาน
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const yesterdayEntry = sorted.find((h) => h.date === yesterday);
    if (!yesterdayEntry || yesterdayEntry.words <= 0) return 0;
    // เริ่มนับจากเมื่อวาน
    streak = 1;
    for (let i = sorted.indexOf(yesterdayEntry) + 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].date);
      const cur = new Date(sorted[i].date);
      const diff = Math.abs(prev - cur) / 86400000;
      if (diff <= 1.5 && sorted[i].words > 0) streak++;
      else break;
    }
    return streak;
  }
  // วันนี้เขียนแล้ว
  streak = 1;
  for (let i = sorted.indexOf(todayEntry) + 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date);
    const cur = new Date(sorted[i].date);
    const diff = Math.abs(prev - cur) / 86400000;
    if (diff <= 1.5 && sorted[i].words > 0) streak++;
    else break;
  }
  return streak;
}
