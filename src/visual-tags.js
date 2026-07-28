// visual-tags.js — Visual Tagging System — แท็กมีสี/ไอคอน/รูปทรง (ข้อ 84)
import { state, setStatus, el } from './core.js';

const DEFAULT_VISUAL_TAGS = [
  { name: 'ต่อสู้', color: '#d9575e', icon: '⚔', shape: 'circle' },
  { name: 'พูดคุย', color: '#5f9fd9', icon: '💬', shape: 'tag' },
  { name: 'สำรวจ', color: '#6fae6f', icon: '🔍', shape: 'square' },
  { name: 'ความลับ', color: '#a97fd0', icon: '🔮', shape: 'circle' },
  { name: 'ย้อนอดีต', color: '#d9b757', icon: '⏪', shape: 'tag' },
];

export function getVisualTags() {
  if (!state.meta) return DEFAULT_VISUAL_TAGS;
  return state.meta.visualTags || DEFAULT_VISUAL_TAGS;
}

export async function addVisualTag(tag) {
  if (!state.meta) return false;
  state.meta.visualTags = state.meta.visualTags || [...DEFAULT_VISUAL_TAGS];
  if (state.meta.visualTags.some((t) => t.name === tag.name)) return false;
  state.meta.visualTags.push(tag);
  const { saveProjectMeta } = await import('./app.js');
  await saveProjectMeta();
  return true;
}

export async function removeVisualTag(name) {
  if (!state.meta) return false;
  const cur = state.meta.visualTags || [...DEFAULT_VISUAL_TAGS];
  state.meta.visualTags = cur.filter((t) => t.name !== name);
  const { saveProjectMeta } = await import('./app.js');
  await saveProjectMeta();
  return true;
}

// Render visual tag chips for Explorer / Planner
export function renderVisualTagChips(tags, onClick) {
  const visualTags = getVisualTags();
  const wrap = el('span', 'vt-chips');
  for (const t of (tags || [])) {
    const vt = visualTags.find((v) => v.name === t);
    if (!vt) continue;
    const chip = el('span', 'vt-chip');
    chip.textContent = vt.icon + ' ' + vt.name;
    chip.style.cssText = `background:${vt.color}22;border:1px solid ${vt.color}55;color:${vt.color};border-radius:${vt.shape === 'circle' ? '999px' : vt.shape === 'square' ? '4px' : '999px'};padding:2px 8px;font-size:10.5px;margin:0 2px;cursor:pointer;white-space:nowrap`;
    if (onClick) chip.onclick = () => onClick(t);
    wrap.append(chip);
  }
  return wrap;
}

// Dialog จัดการ visual tags
export async function manageVisualTags() {
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog');
  box.append(el('div', 'k-dlg-title', '🏷 จัดการ Visual Tags'));

  const tags = getVisualTags();
  const grid = el('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill, minmax(150px,1fr));gap:8px;margin:10px 0';
  const renderGrid = () => {
    grid.innerHTML = '';
    for (const t of getVisualTags()) {
      const card = el('div', 'vt-card');
      card.style.cssText = `padding:10px;background:${t.color}18;border:1px solid ${t.color}40;border-radius:8px;font-size:13px;position:relative`;
      // ชื่อแท็กมาจากผู้ใช้ → textContent เท่านั้น
      card.append(el('div', null, (t.icon || '🔖') + ' ' + t.name));
      const sub = el('small', null, t.shape || 'tag');
      sub.style.color = 'var(--dim)';
      card.append(sub);
      const del = el('span', 'vt-del', '✕');
      del.style.cssText = 'position:absolute;top:6px;right:8px;cursor:pointer;opacity:.55';
      del.title = 'ลบแท็กนี้';
      del.onclick = async () => { await removeVisualTag(t.name); renderGrid(); };
      card.append(del);
      grid.append(card);
    }
  };
  renderGrid();
  box.append(grid);

  const addRow = el('div', 'k-row'); addRow.style.cssText = 'gap:6px';
  const nameInp = el('input', 'k-dlg-input'); nameInp.placeholder = 'ชื่อแท็ก'; nameInp.style.flex = '1';
  const iconInp = el('input', 'k-dlg-input'); iconInp.placeholder = '⚔'; iconInp.style.width = '48px';
  const colorInp = el('input', 'k-dlg-input'); colorInp.type = 'color'; colorInp.style.width = '40px';
  const shapeSel = el('select', 'k-dlg-select');
  ['circle', 'square', 'tag'].forEach((s) => { const o = el('option', null, s); o.value = s; shapeSel.append(o); });
  addRow.append(nameInp, iconInp, colorInp, shapeSel);
  box.append(addRow);

  const btns = el('div', 'k-dlg-btns');
  const addB = el('button', 'k-ok', '+ เพิ่ม');
  addB.onclick = async () => {
    const name = nameInp.value.trim();
    if (!name) return;
    await addVisualTag({ name, icon: iconInp.value || '🔖', color: colorInp.value || '#d97757', shape: shapeSel.value || 'tag' });
    nameInp.value = ''; renderGrid();
  };
  const closeB = el('button', null, 'ปิด');
  closeB.onclick = () => ov.remove();
  btns.append(addB, closeB);
  box.append(btns);
  ov.append(box);
  document.body.append(ov);
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
}
