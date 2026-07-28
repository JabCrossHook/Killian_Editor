// comments.js — คอมเมนต์ต่อฉาก (เก็บใน scenes.json → row.comments[] ที่เดียว)
// บทเรียน: d.chapters[guid] คือ "อาร์เรย์ของฉาก" ไม่ใช่แถวฉาก — push ใส่อาร์เรย์ = ข้อมูลหายตอน stringify
import { el, setStatus, log } from './core.js';

// หาแถวฉากจริงใน scenes.json (คืน row + chapterGuid)
function findRow(d, sceneId) {
  for (const cg of Object.keys(d.chapters || {})) {
    const row = (d.chapters[cg] || []).find((x) => x.id === sceneId);
    if (row) return { row, chapterGuid: cg };
  }
  return { row: null, chapterGuid: null };
}

export async function loadComments(dPath, sceneId) {
  try {
    const sf = await kapi.join(dPath, 'scenes.json');
    if (!(await kapi.exists(sf))) return [];
    const d = await kapi.readJson(sf);
    const { row } = findRow(d, sceneId);
    return (row && row.comments) || [];
  } catch (e) { log('warn', 'loadComments failed', e); return []; }
}

// คอมเมนต์ทั้งร่าง (ใช้ในหน้ารวม/แดชบอร์ด)
export async function loadAllComments(dPath) {
  const out = [];
  try {
    const sf = await kapi.join(dPath, 'scenes.json');
    if (!(await kapi.exists(sf))) return out;
    const d = await kapi.readJson(sf);
    for (const cg of Object.keys(d.chapters || {})) {
      for (const sc of (d.chapters[cg] || [])) {
        for (const c of (sc.comments || [])) {
          out.push({ ...c, sceneId: sc.id, sceneTitle: sc.title, chapterGuid: cg });
        }
      }
    }
  } catch (e) { log('warn', 'loadAllComments failed', e); }
  return out;
}

export async function addComment(dPath, sceneId, text) {
  try {
    const sf = await kapi.join(dPath, 'scenes.json');
    const d = await kapi.readJson(sf);
    const { row } = findRow(d, sceneId);
    if (!row) return false;
    row.comments = row.comments || [];
    row.comments.push({ id: Date.now().toString(36), text, date: new Date().toISOString() });
    await kapi.writeFile(sf, JSON.stringify(d, null, 2));
    return true;
  } catch (e) { log('error', 'addComment failed', e); return false; }
}

export async function deleteComment(dPath, sceneId, commentId) {
  try {
    const sf = await kapi.join(dPath, 'scenes.json');
    const d = await kapi.readJson(sf);
    const { row } = findRow(d, sceneId);
    if (!row || !row.comments) return false;
    row.comments = row.comments.filter((c) => c.id !== commentId);
    await kapi.writeFile(sf, JSON.stringify(d, null, 2));
    return true;
  } catch (e) { log('error', 'deleteComment failed', e); return false; }
}

// ---- กล่องคอมเมนต์ ----
export async function showCommentsDialog(sc, dPath) {
  if (!sc || !dPath) { setStatus('เลือกฉากก่อนจึงจะคอมเมนต์ได้'); return; }
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog k-comments');
  box.append(el('div', 'k-dlg-title', '💬 คอมเมนต์ — ' + (sc.title || '')));

  const list = el('div', 'k-pick-list');
  list.style.maxHeight = '46vh';
  const render = async () => {
    list.innerHTML = '';
    const comments = await loadComments(dPath, sc.id);
    if (!comments.length) { list.append(el('div', 'dim', 'ยังไม่มีคอมเมนต์')); return; }
    for (const c of comments) {
      const ci = el('div', 'k-menu-item');
      ci.style.cssText = 'flex-direction:column;align-items:stretch;gap:2px';
      // textContent เท่านั้น — ข้อความผู้ใช้ห้ามลง innerHTML
      const when = el('small', 'dim', new Date(c.date).toLocaleString('th-TH'));
      const body = el('div', null, c.text);
      const del = el('span', null, '✕');
      del.style.cssText = 'float:right;cursor:pointer;opacity:.6';
      del.title = 'ลบคอมเมนต์นี้';
      del.onclick = async (e) => {
        e.stopPropagation();
        await deleteComment(dPath, sc.id, c.id);
        await render();
      };
      when.append(del);
      ci.append(when, body);
      list.append(ci);
    }
  };
  await render();
  box.append(list);

  const addRow = el('div', 'k-row');
  addRow.style.cssText = 'gap:8px;margin:8px 0';
  const inp = el('input', 'k-dlg-input'); inp.placeholder = 'พิมพ์คอมเมนต์…'; inp.style.flex = '1';
  const addB = el('button', 'k-ok', 'เพิ่ม');
  const doAdd = async () => {
    const text = inp.value.trim();
    if (!text) return;
    if (await addComment(dPath, sc.id, text)) { inp.value = ''; await render(); setStatus('เพิ่มคอมเมนต์แล้ว'); }
  };
  addB.onclick = doAdd;
  inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } };
  addRow.append(inp, addB);
  box.append(addRow);

  const btns = el('div', 'k-dlg-btns');
  const closeB = el('button', null, 'ปิด');
  closeB.onclick = () => ov.remove();
  btns.append(closeB);
  box.append(btns);
  ov.append(box);
  document.body.append(ov);
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  inp.focus();
}
