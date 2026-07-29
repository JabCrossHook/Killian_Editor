// panel-drag.js — ลากหัวแผง/แท็บ → snap zone → dock/tab/float (Photoshop-style)
// ไม่ import panel-renderer.js (กัน circular) — renderer เป็นฝ่าย import ไฟล์นี้
// ตรรกะโซนมาจาก panel-layout.snapZone ล้วน · การเปลี่ยนโครงสร้างสั่งผ่าน PanelManager เท่านั้น
import * as PL from './panel-layout.js';

// px ที่ต้องขยับก่อนถือว่า "ลาก" (ไม่งั้นนับเป็นคลิก)
// บั๊ก #19: 4px น้อยเกินไป — คลิกหัวแผงแล้วมือขยับนิดเดียวก็กลายเป็นลาก → แผงเด้งไป dock/ลอยเอง
const DRAG_MIN = 8;

// ───────── overlay บอกโซนที่จะปล่อย ─────────
let _ov = null;
export function createDropOverlay() {
  if (_ov && _ov.el.isConnected) return _ov;
  const box = document.createElement('div');
  box.className = 'k-drop-zone';
  box.style.display = 'none';
  document.body.appendChild(box);
  _ov = {
    el: box,
    show(rect, zone) {
      box.dataset.zone = zone || '';
      box.style.left = Math.round(rect.x) + 'px';
      box.style.top = Math.round(rect.y) + 'px';
      box.style.width = Math.round(rect.w) + 'px';
      box.style.height = Math.round(rect.h) + 'px';
      box.style.display = 'block';
    },
    hide() { box.style.display = 'none'; },
    destroy() { box.remove(); _ov = null; },
  };
  return _ov;
}

// กรอบที่จะไฮไลต์เมื่อปล่อยโซนนี้ (ครึ่ง/สี่ส่วนของ target)
export function zoneRect(rect, zone) {
  const { x, y, w, h } = rect;
  switch (zone) {
    case 'left':   return { x, y, w: w / 2, h };
    case 'right':  return { x: x + w / 2, y, w: w / 2, h };
    case 'top':    return { x, y, w, h: h / 2 };
    case 'bottom': return { x, y: y + h / 2, w, h: h / 2 };
    default:       return { x, y, w, h };            // center = รวมเป็นแท็บ
  }
}

/**
 * หา panel ที่เมาส์อยู่เหนือ + โซนที่จะผนึก
 * เลือก "ใบที่เล็กที่สุด" ที่ครอบจุดนั้น = ใบในสุด (ลึกสุดของต้นไม้)
 * @returns {{targetId, zone, rect}|null}
 */
export function detectSnapTarget(mx, my, host, excludeId) {
  if (!host) return null;
  let best = null;
  for (const e of host.querySelectorAll('.k-panel[data-panel-id]')) {
    if (e.dataset.panelId === excludeId) continue;
    if (e.closest('.k-float-panel')) continue;       // ไม่ผนึกเข้าแผงลอย
    if (e.offsetParent === null) continue;           // ซ่อนอยู่ (แท็บที่ไม่ active)
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const rect = { x: r.left, y: r.top, w: r.width, h: r.height };
    const zone = PL.snapZone(mx, my, rect);
    if (!zone) continue;
    const area = r.width * r.height;
    if (!best || area < best.area) best = { targetId: e.dataset.panelId, zone, rect, area };
  }
  return best;
}

// ───────── แกนกลาง: ลากอะไรก็ได้ที่แทน panel หนึ่งใบ ─────────
// ctx = { host, onReorder?(clientX, clientY) → true ถ้าจัดการเองแล้ว, ghostLabel }
function startPanelDrag(e, panelId, pm, ctx = {}) {
  if (e.button !== 0) return;
  const host = ctx.host || document.getElementById('app-root') || document.body;
  const sx = e.clientX, sy = e.clientY;
  let moved = false, ghost = null;
  const ov = createDropOverlay();
  let hit = null;

  const move = (ev) => {
    if (!moved) {
      if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < DRAG_MIN) return;
      moved = true;
      document.body.classList.add('k-panel-dragging');
      ghost = document.createElement('div');
      ghost.className = 'k-drag-ghost';
      ghost.textContent = ctx.ghostLabel || panelId;
      document.body.appendChild(ghost);
    }
    if (ghost) { ghost.style.left = (ev.clientX + 12) + 'px'; ghost.style.top = (ev.clientY + 14) + 'px'; }
    hit = detectSnapTarget(ev.clientX, ev.clientY, host, panelId);
    if (hit) ov.show(zoneRect(hit.rect, hit.zone), hit.zone);
    else ov.hide();
  };

  const up = (ev) => {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    ov.hide();
    if (ghost) ghost.remove();
    document.body.classList.remove('k-panel-dragging');
    if (!moved) return;                              // คลิกเฉย ๆ → ปล่อยให้ onclick ทำงาน
    // จัดลำดับแท็บภายในกลุ่มเดิม (ถ้า caller รองรับ) มาก่อน
    if (ctx.onReorder && ctx.onReorder(ev.clientX, ev.clientY)) return;
    if (hit) {
      if (hit.targetId === panelId) return;
      pm.dockPanel(panelId, hit.zone, hit.targetId);
      return;
    }
    // ปล่อยนอกทุกแผง → ลอยอิสระตรงตำแหน่งเมาส์
    pm.floatPanel(panelId, { x: Math.max(0, ev.clientX - 60), y: Math.max(0, ev.clientY - 12),
                             w: ctx.floatW || 320, h: ctx.floatH || 300 });
  };

  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
  e.preventDefault();
}

/** ลากด้วยหัวแผงที่ผนึกอยู่ → ผนึกที่อื่น / รวมเป็นแท็บ / ลอยออกมา */
export function makePanelDraggable(header, panelId, pm, ctx = {}) {
  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.k-panel-btn') || e.target.closest('.k-panel-ctrls')) return;
    startPanelDrag(e, panelId, pm, ctx);
  });
}

/** ลากแท็บ → จัดลำดับในกลุ่มเดิม · ลากออก = แยก/ผนึกที่อื่น/ลอย */
export function makeTabDraggable(tab, panelId, tabsId, index, pm, ctx = {}) {
  tab.addEventListener('mousedown', (e) => {
    if (e.target.closest('.k-panel-btn')) return;
    const bar = tab.parentNode;
    startPanelDrag(e, panelId, pm, {
      ...ctx,
      ghostLabel: ctx.ghostLabel || tab.textContent.trim(),
      onReorder: (mx, my) => {
        if (!bar) return false;
        const r = bar.getBoundingClientRect();
        if (mx < r.left || mx > r.right || my < r.top || my > r.bottom) return false;
        const sibs = [...bar.querySelectorAll('.k-tab')];
        let to = sibs.length - 1;
        for (let i = 0; i < sibs.length; i++) {
          const sr = sibs[i].getBoundingClientRect();
          const mid = bar.classList.contains('k-vertical') ? sr.top + sr.height / 2 : sr.left + sr.width / 2;
          const p = bar.classList.contains('k-vertical') ? my : mx;
          if (p < mid) { to = i; break; }
        }
        if (to !== index) pm.moveTab(tabsId, index, to);
        return true;
      },
    });
  });
}

/** ลากหัวแผงลอย = ย้ายตำแหน่ง · ลากเข้าแผงที่ผนึกอยู่ = ผนึกกลับ */
export function makeFloatDraggable(header, popup, panelId, pm, ctx = {}) {
  header.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.k-panel-btn')) return;
    const host = ctx.host || document.getElementById('app-root') || document.body;
    const sx = e.clientX, sy = e.clientY;
    const x0 = popup.offsetLeft, y0 = popup.offsetTop;
    const ov = createDropOverlay();
    let hit = null, moved = false;
    const move = (ev) => {
      if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < DRAG_MIN) return;
      moved = true;
      popup.style.left = (x0 + ev.clientX - sx) + 'px';
      popup.style.top = (y0 + ev.clientY - sy) + 'px';
      hit = detectSnapTarget(ev.clientX, ev.clientY, host, panelId);
      if (hit) ov.show(zoneRect(hit.rect, hit.zone), hit.zone); else ov.hide();
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      ov.hide();
      if (!moved) return;
      if (hit) { pm.dockPanel(panelId, hit.zone, hit.targetId); return; }
      pm.moveFloat(panelId, { x: popup.offsetLeft, y: popup.offsetTop });
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    e.preventDefault();
  });
}
