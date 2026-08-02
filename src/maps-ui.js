// maps-ui.js — แผนที่ (UI): เปิด/วาดแผนที่ · หมุด · ลำดับชั้นโลก→เมือง→ห้อง
import { addMapFlow, loadMaps, mapImgURL, mapsState_C, pinDialog, saveMaps } from './app.js';
import { $, el, state } from './core.js';
import { pickImage } from './gallery.js';
import { PIN_KIND, breadcrumb, clamp, deleteMap, findMap, newPin, pinStats, sortMaps } from './maps.js';
import { confirmBox } from './ui.js';
import { openEntity } from './wiki-ui.js';
import { showPanel, isPanelOpen } from './panels/panel-ui.js';

// บั๊ก #18: แผนที่เป็นแผง ไม่ใช่แท็บเอกสาร
export async function openMaps() {
  showPanel('maps');                   // hook ใน app.js เริ่มวาดให้ · await ตัวเดียวกันต่อ
  return renderMapsPanel();
}

/** โหลด maps.json + วาดลง #maps-body — ห้ามเรียก showPanel ในนี้ (วนซ้ำกับ hook) */
export async function renderMapsPanel() {
  // โหลดใหม่ทุกครั้ง (ไฟล์แก้นอกโปรแกรมได้) แต่คงแผนที่ที่ดูค้างไว้ถ้ายังมีอยู่
  const keepId = mapsState_C.s?.currentId || null;
  mapsState_C.s = { data: await loadMaps(), currentId: null };
  const all = mapsState_C.s.data.maps;
  mapsState_C.s.currentId = (keepId && all.some((m) => m.id === keepId)) ? keepId
                          : (all.length ? sortMaps(all)[0].id : null);
  return renderMaps($('#maps-body'));
}
export function refreshMapsIfOpen() {
  if (isPanelOpen('maps') && mapsState_C.s && $('#maps-body')) renderMaps($('#maps-body'));
}

export async function renderMaps(pane) {
  pane.innerHTML = '';
  const S = mapsState_C.s;
  const maps = S.data.maps;
  const wrap = el('div', 'map-wrap'); pane.append(wrap);

  // แถบหัว: ชื่อ + ปุ่มเพิ่มแผนที่ + breadcrumb
  const head = el('div', 'map-head');
  head.append(el('div', 'map-title', '🗺 แผนที่'));
  const addBtn = el('button', 'k-ok', '＋ เพิ่มแผนที่');
  addBtn.onclick = () => addMapFlow();
  head.append(addBtn);
  wrap.append(head);

  if (!maps.length) {
    wrap.append(el('div', 'map-empty',
      'ยังไม่มีแผนที่ — กด "＋ เพิ่มแผนที่" แล้วเลือกรูปจากคลังรูปเป็นแผนที่ (เช่น แผนที่โลก/เมือง/ผังห้อง)'));
    return;
  }

  // แถบเลือกแผนที่ (chips) + breadcrumb ลำดับชั้น
  const bar = el('div', 'map-bar');
  for (const m of sortMaps(maps)) {
    const chip = el('div', 'map-chip' + (m.id === S.currentId ? ' on' : ''), m.name);
    const st = pinStats(m);
    if (st.portal) chip.append(el('span', 'map-chip-badge', '🚪' + st.portal));
    chip.onclick = () => { S.currentId = m.id; renderMaps(pane); };
    bar.append(chip);
  }
  wrap.append(bar);

  const cur = findMap(maps, S.currentId) || sortMaps(maps)[0];
  S.currentId = cur.id;

  // breadcrumb โลก→เมือง→ห้อง
  const crumb = breadcrumb(maps, cur.id);
  if (crumb.length > 1) {
    const bc = el('div', 'map-crumb');
    crumb.forEach((c, i) => {
      if (i) bc.append(el('span', 'map-crumb-sep', '›'));
      const a = el('span', 'map-crumb-item' + (c.id === cur.id ? ' on' : ''), c.name);
      a.onclick = () => { S.currentId = c.id; renderMaps(pane); };
      bc.append(a);
    });
    wrap.append(bc);
  }

  // แถบเครื่องมือแผนที่ปัจจุบัน
  const tools = el('div', 'map-tools');
  const nameInp = el('input', 'map-name-inp'); nameInp.value = cur.name;
  nameInp.onchange = async () => { cur.name = nameInp.value.trim() || cur.name; await saveMaps(S.data); renderMaps(pane); };
  tools.append(nameInp);
  const hint = el('span', 'map-hint', 'คลิกบนแผนที่เพื่อปักหมุด · คลิกหมุดเพื่อแก้/ลิงก์');
  tools.append(hint);
  const chgImg = el('button', 'cmp-mini', '🖼 เปลี่ยนรูป');
  chgImg.onclick = async () => { const it = await pickImage(state.root); if (!it) return;
    cur.image = 'Images/' + it.file; await saveMaps(S.data); renderMaps(pane); };
  tools.append(chgImg);
  const delMap = el('button', 'cmp-mini k-danger', '🗑 ลบแผนที่');
  delMap.onclick = async () => {
    if (!(await confirmBox(`ลบแผนที่ “${cur.name}” ?`, 'ลบ'))) return;
    S.data.maps = deleteMap(maps, cur.id); S.currentId = S.data.maps[0]?.id || null;
    await saveMaps(S.data); renderMaps(pane);
  };
  tools.append(delMap);
  wrap.append(tools);

  // พื้นที่แผนที่ (รูป + หมุด)
  const stage = el('div', 'map-stage');
  const canvas = el('div', 'map-canvas');
  const img = el('img', 'map-img');
  if (cur.image) img.src = mapImgURL(cur.image);
  else canvas.append(el('div', 'map-noimg', '📷 ยังไม่มีรูป — กด "🖼 เปลี่ยนรูป"'));
  if (cur.image) canvas.append(img);

  // ปักหมุดเมื่อคลิกพื้นที่ว่าง
  canvas.onclick = async (e) => {
    if (e.target !== canvas && e.target !== img) return;
    const r = canvas.getBoundingClientRect();
    const x = clamp(((e.clientX - r.left) / r.width) * 100);
    const y = clamp(((e.clientY - r.top) / r.height) * 100);
    const pin = newPin(x, y);
    const res = await pinDialog(pin, maps, cur.id);
    if (!res) return;
    cur.pins.push(res); await saveMaps(S.data); renderMaps(pane);
  };

  // วาดหมุด
  for (const pin of cur.pins || []) {
    const el2 = el('div', 'map-pin map-pin-' + pin.kind);
    el2.style.left = pin.x + '%'; el2.style.top = pin.y + '%';
    if (pin.color) el2.style.setProperty('--pin-color', pin.color);
    el2.append(el('span', 'map-pin-icon', (PIN_KIND[pin.kind] || PIN_KIND.note).icon));
    if (pin.label) el2.append(el('span', 'map-pin-label', pin.label));
    el2.title = pin.note || pin.label || (PIN_KIND[pin.kind] || {}).label || '';
    el2.onclick = async (e) => {
      e.stopPropagation();
      // คลิกซ้ายเปิดลิงก์ทันทีถ้ามี · Alt/คลิกขวา = แก้
      if (e.altKey) return editPin();
      if (pin.kind === 'portal' && pin.toMap) { S.currentId = pin.toMap; renderMaps(pane); return; }
      if (pin.kind === 'entity' && pin.entityFile) { openEntity(pin.entityFile); return; }
      editPin();
    };
    el2.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); editPin(); };
    async function editPin() {
      const res = await pinDialog({ ...pin }, maps, cur.id, true);
      if (res === 'DELETE') { cur.pins = cur.pins.filter((p) => p.id !== pin.id); await saveMaps(S.data); renderMaps(pane); return; }
      if (res) { Object.assign(pin, res); await saveMaps(S.data); renderMaps(pane); }
    }
    // ลากย้ายหมุด
    el2.onpointerdown = (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const r = canvas.getBoundingClientRect();
      let moved = false;
      const mv = (ev) => {
        moved = true; el2.classList.add('dragging');
        pin.x = clamp(((ev.clientX - r.left) / r.width) * 100);
        pin.y = clamp(((ev.clientY - r.top) / r.height) * 100);
        el2.style.left = pin.x + '%'; el2.style.top = pin.y + '%';
      };
      const up = async () => {
        window.removeEventListener('pointermove', mv);
        window.removeEventListener('pointerup', up);
        el2.classList.remove('dragging');
        if (moved) { await saveMaps(S.data); }   // คลิกเฉย ๆ ให้ onclick ทำงาน
      };
      window.addEventListener('pointermove', mv);
      window.addEventListener('pointerup', up);
    };
    canvas.append(el2);
  }

  stage.append(canvas);
  wrap.append(stage);

  // สรุปหมุด
  const st = pinStats(cur);
  wrap.append(el('div', 'map-foot',
    `📍 ${st.entity} เอนทิตี้ · 🚪 ${st.portal} ประตู · 📌 ${st.note} หมายเหตุ`));
}
