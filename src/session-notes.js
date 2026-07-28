// session-notes.js — โน้ตระหว่างเขียน เชื่อมกับฉาก (ข้อ 85)
import { state, setStatus, el } from './core.js';

const NOTES_KEY = 'k2-session-notes';

// เก็บที่เดียว: มีโปรเจกต์ → project.khn.json (ติดไปกับงาน แก้นอกโปรแกรมได้)
//               ไม่มีโปรเจกต์ → localStorage (ชั่วคราว)
// เดิมเขียนทั้งสองที่แต่อ่านจาก localStorage อย่างเดียว → โน้ตไม่ติดไปกับโปรเจกต์ และ meta บวมไม่จำกัด
export function getSessionNotes() {
  if (state.meta) return state.meta.sessionNotes || [];
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]'); } catch { return []; }
}

export async function saveSessionNotes(notes) {
  if (state.meta) {
    state.meta.sessionNotes = notes;
    try { const { saveProjectMeta } = await import('./app.js'); await saveProjectMeta(); } catch {}
    return;
  }
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); } catch {}
}

export async function addSessionNote(text, sceneId, sceneTitle) {
  const notes = [...getSessionNotes(), {
    id: Date.now().toString(36), text, sceneId, sceneTitle,
    timestamp: new Date().toISOString(),
  }];
  await saveSessionNotes(notes);
  setStatus('บันทึกโน้ตแล้ว');
  return notes.length;
}

// Quick note dialog
export async function quickNote(sceneId, sceneTitle) {
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog');
  box.append(el('div', 'k-dlg-title', '📝 โน้ตด่วน — ' + (sceneTitle || 'ทั่วไป')));
  const ta = el('textarea', 'k-dlg-input');
  ta.style.cssText = 'width:100%;min-height:100px;resize:vertical;font-family:inherit';
  box.append(ta);

  // Show recent notes
  // copy ก่อน reverse — getSessionNotes คืน reference ของ state.meta.sessionNotes
  const notes = [...getSessionNotes()].reverse().slice(0, 5);
  if (notes.length) {
    const recent = el('div'); recent.style.cssText = 'margin-top:8px;max-height:120px;overflow-y:auto';
    recent.append(el('div', 'dim', 'ล่าสุด:'));
    for (const n of notes) {
      const r = el('div', 'k-menu-item');
      r.style.cssText = 'font-size:11px;cursor:pointer';
      r.textContent = n.text.slice(0, 80) + ' — ' + (n.sceneTitle || '');
      r.onclick = () => { ta.value = n.text; };
      recent.append(r);
    }
    box.append(recent);
  }

  const btns = el('div', 'k-dlg-btns');
  const saveB = el('button', 'k-ok', 'บันทึก');
  saveB.onclick = async () => {
    const text = ta.value.trim();
    if (!text) { ov.remove(); return; }
    await addSessionNote(text, sceneId, sceneTitle);
    ov.remove();
  };
  const closeB = el('button', null, 'ปิด');
  closeB.onclick = () => ov.remove();
  btns.append(saveB, closeB);
  box.append(btns);
  ov.append(box);
  document.body.append(ov);
  ta.focus();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
}

// ดูโน้ตทั้งหมด
export async function showAllNotes() {
  const notes = [...getSessionNotes()].reverse();
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog');
  box.append(el('div', 'k-dlg-title', '📝 โน้ตทั้งหมด (' + notes.length + ')'));
  const list = el('div', 'k-pick-list'); list.style.maxHeight = '50vh';
  if (!notes.length) {
    list.append(el('div', 'dim', 'ยังไม่มีโน้ต — กด 📝 ใน toolbar'));
  } else {
    for (const n of notes) {
      const row = el('div', 'k-menu-item');
      row.style.cssText = 'flex-direction:column;align-items:stretch;gap:2px';
      // ข้อความโน้ตมาจากผู้ใช้ → textContent เท่านั้น
      const body = el('div', null, n.text.slice(0, 120));
      body.style.fontSize = '12px';
      const sub = el('small', null,
        `${n.sceneTitle || ''} · ${new Date(n.timestamp).toLocaleString('th-TH')}`);
      sub.style.color = 'var(--dim)';
      row.append(body, sub);
      list.append(row);
    }
  }
  box.append(list);
  const btns = el('div', 'k-dlg-btns');
  const clearB = el('button', 'k-danger', 'ล้าง');
  clearB.onclick = async () => {
    const { confirmBox } = await import('./ui.js');
    if (!(await confirmBox(`ล้างโน้ตทั้งหมด (${notes.length} รายการ)?`, 'ล้าง'))) return;
    await saveSessionNotes([]); ov.remove(); setStatus('ล้างโน้ตทั้งหมดแล้ว');
  };
  const closeB = el('button', 'k-ok', 'ปิด');
  closeB.onclick = () => ov.remove();
  btns.append(clearB, closeB);
  box.append(btns);
  ov.append(box);
  document.body.append(ov);
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
}
