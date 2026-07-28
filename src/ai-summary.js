// ai-summary.js — สรุปเนื้อหาด้วย AI (ข้อ 77)
import { $, el, state, setStatus, log } from './core.js';
import { callAI, getAISettings, loadApiKey } from './ai-settings.js';

// มีคีย์แล้วหรือยัง (ollama ไม่ต้องใช้คีย์)
async function aiReady() {
  const ai = getAISettings();
  if ((ai.provider || 'openai') === 'ollama') return true;
  if (await loadApiKey()) return true;
  setStatus('❌ ตั้งค่า AI ที่ ไฟล์ → ตั้งค่า AI ก่อน');
  return false;
}

export async function showAISummary() {
  if (!state.root) { setStatus('ยังไม่ได้เปิดโปรเจกต์'); return; }
  if (!(await aiReady())) return;

  setStatus('AI กำลังสรุปเนื้อหา…');

  // รวบรวมเนื้อหาทั้งโปรเจกต์
  let fullText = '# ' + (state.title || 'โปรเจกต์') + '\n\n';
  try {
    for (const sec of await kapi.listDirs(state.root)) {
      if (['Wiki','Bible','Images','Memos','Recycle','Snapshots','Backups','Plugins','Research'].includes(sec)) continue;
      const sp = await kapi.join(state.root, sec);
      if (!(await kapi.exists(await kapi.join(sp, 'section.json')))) continue;
      const secData = await kapi.readJson(await kapi.join(sp, 'section.json'));
      fullText += '## ' + (secData.title || sec) + '\n';
      const dr = await kapi.join(sp, 'Draft');
      if (!(await kapi.exists(dr))) continue;
      for (const dn of await kapi.listDirs(dr)) {
        const dp = await kapi.join(dr, dn);
        const dj = await kapi.join(dp, 'draft.json');
        if (!(await kapi.exists(dj))) continue;
        const draft = await kapi.readJson(dj);
        const scData = await kapi.readJson(await kapi.join(dp, 'scenes.json')).catch(() => ({}));
        const chMap = scData.chapters || {};
        for (const ch of (draft.chapters || [])) {
          for (const sc of (chMap[ch.guid] || [])) {
            if (sc.type === 'memo') continue;
            const fp = await kapi.join(dp, 'Chapters', ch.folderName, sc.fileName);
            try {
              const raw = await kapi.readFile(fp);
              fullText += raw.slice(0, 2000) + '\n\n'; // ตัดไม่ให้เกิน
            } catch {}
          }
        }
      }
    }
  } catch (e) { log('error', 'ai-summary: read failed', e); }

  // ตัดให้ไม่เกิน context
  const prompt = `กรุณาสรุปเนื้อหานิยาย/บทภาพยนตร์ต่อไปนี้เป็นภาษาไทย สั้นๆ 3-5 ย่อหน้า:\n\n${fullText.slice(0, 8000)}`;

  const result = await callAI(prompt, 'คุณเป็นนักเขียนมืออาชีพ ช่วยสรุปเนื้อหานิยาย');
  if (!result) return;

  // แสดงใน dialog
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog k-wide');
  box.append(el('div', 'k-dlg-title', '🤖 AI สรุปเนื้อหา — ' + state.title));

  const content = el('div');
  content.style.cssText = 'max-height:55vh;overflow-y:auto;white-space:pre-wrap;font-size:14px;line-height:1.8;padding:8px 0';
  content.textContent = result;
  box.append(content);

  const btns = el('div', 'k-dlg-btns');
  const exportB = el('button', null, '📥 ส่งออก .md');
  exportB.onclick = async () => {
    const dest = await kapi.saveAsDialog(state.title + '-summary.md');
    if (!dest) return;
    await kapi.writeFile(dest, '# ' + state.title + ' — สรุป\n\n' + result);
    setStatus('ส่งออกสรุปแล้ว');
  };
  const closeB = el('button', 'k-ok', 'ปิด');
  closeB.onclick = () => ov.remove();
  btns.append(exportB, closeB);
  box.append(btns);
  ov.append(box);
  document.body.append(ov);
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
}

// ai-title.js — แนะนำชื่อด้วย AI (ข้อ 78)
export async function showAITitleSuggestions(currentTitle, callback) {
  if (!(await aiReady())) return;
  setStatus('AI กำลังคิดชื่อ…');

  const prompt = `แนะนำชื่อเรื่อง (ภาษาไทย) สำหรับนิยาย/บทภาพยนตร์ 5-10 ชื่อ โดยอิงจากชื่อปัจจุบัน: "${currentTitle}"\n\nส่งเป็นรายการบรรทัดละชื่อ ไม่ต้องมีเลขนำหน้า`;
  const result = await callAI(prompt, 'คุณเป็นนักเขียนบทมืออาชีพ ช่วยคิดชื่อเรื่องภาษาไทย');

  if (!result) return;

  const titles = result.split('\n').filter((l) => l.trim()).slice(0, 10);

  // แสดง popup
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog');
  box.append(el('div', 'k-dlg-title', '✨ แนะนำชื่อ — "' + currentTitle + '"'));

  const list = el('div', 'k-pick-list');
  for (const t of titles) {
    const row = el('div', 'k-menu-item', '📖 ' + t.trim());
    row.onclick = () => { ov.remove(); callback(t.trim()); };
    list.append(row);
  }
  box.append(list);

  const btns = el('div', 'k-dlg-btns');
  const retryB = el('button', null, '🔄 ลองใหม่');
  retryB.onclick = () => { ov.remove(); showAITitleSuggestions(currentTitle, callback); };
  const closeB = el('button', null, 'ยกเลิก');
  closeB.onclick = () => ov.remove();
  btns.append(retryB, closeB);
  box.append(btns);
  ov.append(box);
  document.body.append(ov);
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
}
