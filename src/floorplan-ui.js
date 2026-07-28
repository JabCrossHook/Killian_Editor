// floorplan-ui.js — ผังพื้นที่: ดูแผนที่+หมุดจาก maps.json แล้วผูกกับ "สิ่งที่เห็น/ได้ยิน/พบ" ของฉากที่เปิดอยู่
// (เดิมอ่าน state.active.meta.location / state.active._scene ซึ่งไม่มีจริง → แสดง "ไม่ทราบ" ตลอด)
import { $, el, state, setStatus, log } from './core.js';
import { sortMaps, findMap, PIN_KIND } from './maps.js';

const FIELDS = [
  ['clues', '👁 สิ่งที่เห็น'],
  ['sounds', '🔊 สิ่งที่ได้ยิน'],
  ['discoveries', '📦 สิ่งที่พบ'],
];

export async function openFloorPlan() {
  const key = '::floorplan::';
  const { activate, closeTab } = await import('./app.js');
  if (state.tabs.has(key)) { activate(key); return; }
  const pane = el('div', 'pane');
  $('#panes').append(pane);
  const tabBtn = el('div', 'tab');
  tabBtn.append(el('span', 'tab-title', '📍 ผังพื้นที่'));
  const x = el('span', 'tab-x', '×'); tabBtn.append(x);
  $('#tabs').append(tabBtn);
  const tab = { file: key, title: 'ผังพื้นที่', pane, tabBtn, dirty: false,
                editor: null, plain: null, wiki: null, gal: null, dash: true };
  tabBtn.onclick = (e) => { if (e.target !== x) activate(key); };
  x.onclick = () => closeTab(key);
  state.tabs.set(key, tab);
  activate(key);
  await renderFloorPlan(pane);
}

export async function renderFloorPlan(pane, mapId) {
  pane.innerHTML = '';
  const { mapImgURL, loadMaps } = await import('./app.js');
  const wrap = el('div', 'floor-wrap');

  let data = { maps: [] };
  try { data = (await loadMaps()) || { maps: [] }; }
  catch (e) { log('warn', 'floorplan: โหลด maps.json ไม่ได้', e); }
  const maps = sortMaps(data.maps || []);

  // ---- หัว + ตัวเลือกแผนที่ ----
  const head = el('div', 'floor-head');
  head.append(el('div', 'floor-title', '📍 ผังพื้นที่'));
  const sel = el('select', 'k-dlg-select');
  for (const m of maps) { const o = el('option', null, m.name || '(ไม่มีชื่อ)'); o.value = m.id; sel.append(o); }
  const cur = (mapId && findMap(maps, mapId)) || maps[0] || null;
  if (cur) sel.value = cur.id;
  sel.onchange = () => renderFloorPlan(pane, sel.value);
  if (maps.length) head.append(sel);
  wrap.append(head);

  // ---- พื้นแผนที่ ----
  const main = el('div', 'floor-main');
  if (cur && cur.image) {
    const holder = el('div', 'floor-canvas');
    holder.style.cssText = 'position:relative;display:inline-block;max-width:100%';
    const img = el('img', 'floor-img');
    img.src = mapImgURL(cur.image);          // ผ่าน kapi.toFileURL — 'file://'+path พังบน Windows
    img.style.maxWidth = '100%';
    holder.append(img);
    for (const p of (cur.pins || [])) {
      const dot = el('span', 'floor-pin', PIN_KIND[p.kind]?.icon || '📌');
      dot.style.cssText = `position:absolute;left:${p.x}%;top:${p.y}%;transform:translate(-50%,-100%);cursor:pointer`;
      dot.title = p.label || '';
      dot.onclick = () => setStatus('หมุด: ' + (p.label || '—'));
      holder.append(dot);
    }
    main.append(holder);
  } else {
    main.append(el('div', 'floor-ph', '🗺'));
    main.append(el('div', 'dim', maps.length ? 'แผนที่นี้ยังไม่มีรูป — ใส่รูปได้ที่หน้า แผนที่ (Maps)'
                                             : 'ยังไม่มีแผนที่ — สร้างได้ที่ มุมมอง → แผนที่ (Maps)'));
  }

  // ---- แผงข้อมูลของฉากที่เปิดอยู่ ----
  const panel = el('div', 'floor-panel');
  const { sceneCtx } = await import('./app.js');
  const ctx = await sceneCtx();

  panel.append(el('div', 'floor-panel-title', '📄 ฉากที่เปิดอยู่'));
  panel.append(el('div', 'dim', ctx ? (ctx.row.title || '—') : 'ยังไม่ได้เปิดฉาก'));

  if (cur) {
    panel.append(el('div', 'floor-panel-title', '🗺 แผนที่'));
    panel.append(el('div', 'dim', `${cur.name || '—'} · ${(cur.pins || []).length} หมุด`));
  }

  for (const [key2, label] of FIELDS) {
    panel.append(el('div', 'floor-panel-title', label));
    const vals = (ctx && Array.isArray(ctx.row[key2])) ? ctx.row[key2] : [];
    const line = el('div', 'dim', vals.length ? vals.join(' · ') : '—');
    panel.append(line);
    if (ctx) {
      const add = el('button', 'floor-add', '+ เพิ่ม');
      add.style.cssText = 'font-size:11px;padding:2px 8px;margin-top:4px';
      add.onclick = async () => {
        const { ask } = await import('./ui.js');
        const v = await ask(label.replace(/^\S+\s/, '') + ' — เพิ่มรายการ');
        if (!v) return;
        const { updateSceneRow } = await import('./app.js');
        await updateSceneRow(ctx.dPath, ctx.row.id, (r) => { r[key2] = [...(r[key2] || []), v]; });
        await renderFloorPlan(pane, sel.value || (cur && cur.id));
      };
      panel.append(add);
    }
  }

  wrap.append(main, panel);
  pane.append(wrap);
}
