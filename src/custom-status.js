// custom-status.js — ผู้ใช้เพิ่ม/ลบสถานะฉากเองได้ (ต่อท้ายสถานะมาตรฐาน)
import { state, setStatus, el, SCENE_STATUSES } from './core.js';
import { ask, confirmBox } from './ui.js';

export function getCustomStatuses() {
  if (!state.meta) return [];
  return state.meta.customStatuses || [];
}

// สถานะทั้งหมดที่ใช้ได้จริง = มาตรฐาน + ที่ผู้ใช้เพิ่ม (เมนูสถานะฉากเรียกตัวนี้)
export function allStatuses() {
  return [...SCENE_STATUSES, ...getCustomStatuses()];
}

async function persist() {
  const { saveProjectMeta } = await import('./app.js');
  await saveProjectMeta();
}

export async function addCustomStatus(label) {
  if (!state.meta || !label) return false;
  const name = String(label).trim();
  if (!name || allStatuses().includes(name)) return false;
  state.meta.customStatuses = [...getCustomStatuses(), name];
  await persist();
  setStatus('เพิ่มสถานะแล้ว: ' + name);
  return true;
}

export async function removeCustomStatus(label) {
  if (!state.meta) return false;
  state.meta.customStatuses = getCustomStatuses().filter((s) => s !== label);
  await persist();                       // เดิมลืมบันทึก → ลบแล้วกลับมาใหม่ตอนเปิดโปรเจกต์
  setStatus('ลบสถานะแล้ว: ' + label);
  return true;
}

// ---- กล่องจัดการสถานะ ----
export async function manageCustomStatuses() {
  if (!state.meta) { setStatus('ยังไม่ได้เปิดโปรเจกต์'); return; }
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog k-status-mgr');
  box.append(el('div', 'k-dlg-title', '🏷 จัดการสถานะฉาก'));

  const list = el('div', 'k-pick-list');
  const render = () => {
    list.innerHTML = '';
    for (const s of SCENE_STATUSES) {
      const row = el('div', 'k-menu-item dim', '• ' + s + '  (มาตรฐาน — ลบไม่ได้)');
      list.append(row);
    }
    const custom = getCustomStatuses();
    if (!custom.length) list.append(el('div', 'dim', 'ยังไม่มีสถานะที่กำหนดเอง'));
    for (const s of custom) {
      const row = el('div', 'k-menu-item');
      row.append(el('span', null, '🏷 ' + s));
      const del = el('span', 'k-status-del', '✕');
      del.style.cssText = 'float:right;cursor:pointer';
      del.title = 'ลบสถานะนี้';
      del.onclick = async (e) => {
        e.stopPropagation();
        if (await confirmBox(`ลบสถานะ "${s}" ?`, 'ลบ')) { await removeCustomStatus(s); render(); }
      };
      row.append(del);
      list.append(row);
    }
  };
  render();

  const btns = el('div', 'k-dlg-btns');
  const addB = el('button', 'k-ok', '+ เพิ่มสถานะ');
  addB.onclick = async () => {
    const name = await ask('ชื่อสถานะใหม่', { placeholder: 'เช่น รอแก้ไข, ส่งแล้ว' });
    if (!name) return;
    await addCustomStatus(name);
    render();
  };
  const closeB = el('button', null, 'ปิด');
  closeB.onclick = () => ov.remove();
  btns.append(addB, closeB);
  box.append(list, btns);
  ov.append(box);
  document.body.append(ov);
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
}
