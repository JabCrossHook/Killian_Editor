// player-choices.js — ประวัติการตัดสินใจ (ข้อ 83)
import { state, setStatus, el, log } from './core.js';

export function getPlayerHistory() {
  if (!state.meta) return [];
  return state.meta.playerHistory || [];
}

export async function recordChoice(sceneId, sceneTitle, choice, player = '') {
  if (!state.meta) return false;
  state.meta.playerHistory = state.meta.playerHistory || [];
  state.meta.playerHistory.push({
    sceneId, sceneTitle, choice,
    timestamp: new Date().toISOString(),
    player: player || 'ผู้เขียน',
  });
  try {
    const { saveProjectMeta } = await import('./app.js');
    await saveProjectMeta();
    setStatus('บันทึกการตัดสินใจ: ' + choice);
    return true;
  } catch (e) { log('error', 'recordChoice failed', e); return false; }
}

export function choicesByScene(sceneId) {
  return getPlayerHistory().filter((c) => c.sceneId === sceneId);
}

// Dialog แสดงประวัติ
export async function showPlayerHistory() {
  const history = getPlayerHistory();
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog');
  box.append(el('div', 'k-dlg-title', '🎮 ประวัติการตัดสินใจ (' + history.length + ' ครั้ง)'));

  const list = el('div', 'k-pick-list');
  list.style.maxHeight = '50vh';
  if (!history.length) {
    list.append(el('div', 'dim', 'ยังไม่มีการตัดสินใจ'));
  } else {
    [...history].reverse().slice(0, 100).forEach((c) => {
      const row = el('div', 'k-menu-item');
      row.style.cssText = 'flex-direction:column;align-items:stretch;gap:2px';
      // ข้อความจากผู้ใช้ → textContent เท่านั้น (innerHTML = ช่องโหว่สคริปต์ฝัง)
      const top = el('div', null, '🎯 ' + (c.choice || ''));
      top.style.cssText = 'font-size:13px;color:var(--bright)';
      const sub = el('div', null,
        `📄 ${c.sceneTitle || '—'} · ${new Date(c.timestamp).toLocaleString('th-TH')}`);
      sub.style.cssText = 'font-size:11px;color:var(--dim)';
      row.append(top, sub);
      list.append(row);
    });
  }
  box.append(list);

  const btns = el('div', 'k-dlg-btns');
  const exportB = el('button', null, '📥 ส่งออก');
  exportB.onclick = async () => {
    const dest = await kapi.saveAsDialog('player-history.json');
    if (!dest) return;
    await kapi.writeFile(dest, JSON.stringify(history, null, 2));
  };
  const clearB = el('button', 'k-danger', 'ล้าง');
  clearB.onclick = async () => {
    if (state.meta) { state.meta.playerHistory = []; const { saveProjectMeta } = await import('./app.js'); await saveProjectMeta(); }
    ov.remove(); setStatus('ล้างประวัติการตัดสินใจแล้ว');
  };
  const closeB = el('button', 'k-ok', 'ปิด');
  closeB.onclick = () => ov.remove();
  btns.append(exportB, clearB, closeB);
  box.append(btns);
  ov.append(box);
  document.body.append(ov);
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
}
