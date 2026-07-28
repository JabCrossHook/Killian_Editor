// panel-ui.js — UI wrapper สำหรับ Panel System (ข้อ 8)
// ต่อ PanelManager เข้ากับ DOM + localStorage · auto-save เมื่อ layout เปลี่ยน
// ทำงานร่วมกับ app.js PANELS (ผ่าน registerPanel export) และ PanelStore (docking layout)
import { $, el, setStatus } from '../core.js';
import * as PL from '../panels/panel-layout.js';
import { PanelManager, PanelStore } from '../panels/panel-store.js';

let pm = null;

// ───────── PanelManager singleton ─────────
export function getPanelManager() {
  if (!pm) pm = new PanelManager();
  return pm;
}

// ───────── loadLayout: กู้เลย์เอาต์จาก localStorage ─────────
export function loadPanelLayout() {
  return getPanelManager().store.load();
}

// ───────── saveLayout: บันทึกเลย์เอาต์ลง localStorage ─────────
export function savePanelLayout() {
  if (pm) pm.store.save();
}

// ───────── ลงทะเบียนแผงกับ PanelManager ─────────
export function registerPanels() {
  const m = getPanelManager();
  const panelDefs = [
    { id: 'explorer', title: 'โปรเจกต์', sel: '#tree-panel' },
    { id: 'props', title: 'คุณสมบัติ', sel: '#props-panel' },
    { id: 'outline', title: 'Navigation', sel: '#outline-panel' },
  ];
  for (const def of panelDefs) {
    const domEl = $(def.sel);
    if (!domEl) continue;
    m.registerPanel(def.id, {
      title: def.title,
      show: () => domEl.classList.remove('k-panel-off'),
      hide: () => domEl.classList.add('k-panel-off'),
      isVisible: () => !domEl.classList.contains('k-panel-off'),
      render: (host) => { host.appendChild(domEl); },
      destroy: () => { if (domEl.parentNode) domEl.parentNode.removeChild(domEl); },
    });
  }
  return m;
}

// ───────── เริ่มระบบตอนเปิดโปรเจกต์: load → register → auto-save ─────────
export function initPanelSystem() {
  loadPanelLayout();                     // กู้เลย์เอาต์ครั้งก่อนจาก localStorage
  registerPanels();                      // ลงทะเบียนแผงกับ PanelManager
  if (pm) {
    pm.store.onChange(() => savePanelLayout());
  }
  return pm;
}

// ───────── เปิด popup จัดการแผง (ปุ่ม 📐 แผง บน toolbar) ─────────
export async function togglePanelDialog() {
  const panels = [
    { id: 'tree-panel', title: 'โปรเจกต์' },
    { id: 'props-panel', title: 'คุณสมบัติ' },
    { id: 'outline-panel', title: 'Navigation' },
  ];
  const items = [];
  for (const p of panels) {
    const el = $('#' + p.id);
    const visible = el && !el.classList.contains('k-panel-off');
    items.push({
      label: (visible ? '☑ ' : '☐ ') + p.title,
      click: () => {
        if (!el) return;
        if (visible) el.classList.add('k-panel-off');
        else el.classList.remove('k-panel-off');
        savePanelLayout();
        setStatus((visible ? 'ซ่อน' : 'แสดง') + 'แผง: ' + p.title);
      },
    });
  }
  items.push('-');
  items.push({
    label: '⟲ รีเซ็ตการจัดวางแผงทั้งหมด',
    click: () => {
      for (const p of panels) {
        const el = $('#' + p.id);
        if (el) { el.classList.remove('k-panel-off'); el.classList.remove('k-panel-floating'); }
      }
      if (pm) pm.store.reset();
      savePanelLayout();
      setStatus('รีเซ็ตแผงทั้งหมดแล้ว');
    },
  });

  // ใช้ popupMenu จาก app.js (import แบบ dynamic)
  try {
    const { popupMenu } = await import('../app.js');
    const btn = $('#tb-panels');
    if (btn) {
      const r = btn.getBoundingClientRect();
      popupMenu(r.left, r.bottom + 4, items);
    }
  } catch {
    // fallback: dialog พื้นฐาน
    const ov = el('div', 'k-overlay');
    const box = el('div', 'k-dialog');
    box.append(el('div', 'k-dlg-title', '📐 จัดการแผง'));
    for (const it of items) {
      if (it === '-') { box.append(el('hr')); continue; }
      const row = el('div', 'k-menu-item', it.label);
      row.onclick = () => { it.click(); ov.remove(); };
      box.append(row);
    }
    const closeBtn = el('button', 'k-cancel', 'ปิด');
    closeBtn.onclick = () => ov.remove();
    const btns = el('div', 'k-dlg-btns');
    btns.append(closeBtn);
    box.append(btns);
    ov.append(box);
    document.body.append(ov);
    ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  }
}

// ───────── cleanup ─────────
export function resetPanelSystem() { pm = null; }
