// home-ui.js — หน้า Home แสดงรายการโปรเจกต์ทั้งหมดแบบ Grid (เหมือน Notion)
import { $, el, state, setStatus, log, t as tr } from './core.js';
import { activate, closeTab, loadProject, newProject } from './app.js';
// [alpha.60r3 ข้อ 9] ปุ่มส่งออก/นำเข้าโปรเจกต์บนหน้าแรก
import { exportProjectZip, importProjectZip } from './export-zip.js';

/**
 * [alpha.60r3 ข้อ 9] แถวปุ่มมาตรฐานของหน้าแรก — ใช้ร่วมกันทั้ง 3 โหมดการวาด
 * (กล่อง overlay · แท็บหน้าแรก · แผงหน้าแรก) เพื่อไม่ให้หลุดที่ใดที่หนึ่งเหมือนรอบก่อน ๆ
 *
 * ลำดับตามภาพที่ผู้ใช้ส่งมา (DaVinci Resolve):
 *   [📤 ส่งออก] [📥 นำเข้า] ── ช่องว่างยืดได้ ── [➕ สร้างโปรเจกต์ใหม่] [📂 เปิดโปรเจกต์] [✕ ปิด]
 * @param {{onClose?:Function, afterOpen?:Function}} opts  ไม่มี onClose = ไม่แสดงปุ่มปิด
 */
export function buildHomeActions(opts = {}) {
  const actions = el('div', 'home-actions');
  const mk = (cls, label, title) => {
    const b = el('button', cls, label);
    if (title) b.title = title;
    return b;
  };
  const exportBtn = mk('home-btn-export', tr('home.export', '📤 ส่งออก'), 'ส่งออกโปรเจกต์ที่เปิดอยู่เป็นไฟล์ .zip');
  const importBtn = mk('home-btn-import', tr('home.import', '📥 นำเข้า'), 'นำเข้าโปรเจกต์จากไฟล์ .zip');
  const spacer = el('div', 'home-actions-spacer');
  const newBtn = mk('k-ok home-btn-new', tr('home.newProject', '➕ สร้างโปรเจกต์ใหม่'));
  const openBtn = mk('home-btn-open', tr('home.openProject', '📂 เปิดโปรเจกต์'));
  const closeBtn = mk('home-btn-close', tr('home.close', '✕ ปิด'), 'ปิดหน้าแรก');

  exportBtn.onclick = async () => {
    if (!state.root) { setStatus('เปิดโปรเจกต์ก่อน จึงจะส่งออกเป็น .zip ได้'); return; }
    await exportProjectZip();
  };
  importBtn.onclick = async () => {
    const dest = await importProjectZip();
    if (dest) opts.onClose?.();          // เปิดโปรเจกต์ใหม่แล้ว → ปิดหน้าแรกให้เห็นงาน
  };
  newBtn.onclick = () => { opts.onClose?.(); newProject(); };
  openBtn.onclick = async () => {
    const projectPath = await kapi.openProjectDialog?.();
    if (!projectPath) return;
    opts.onClose?.();
    await loadProject(projectPath);
  };
  closeBtn.onclick = () => opts.onClose?.();

  actions.append(exportBtn, importBtn, spacer, newBtn, openBtn);
  if (opts.onClose) actions.append(closeBtn); else closeBtn.remove();
  return { actions, exportBtn, importBtn, spacer, newBtn, openBtn, closeBtn };
}

// เปิดหน้า Home — สร้างแท็บใหม่ หรือเปิดแท็บที่มีอยู่แล้ว
export async function openHome() {
  const key = '::home::';
  if (state.tabs.has(key)) {
    activate(key);
    return;
  }
  const pane = el('div', 'pane');
  $('#panes').append(pane);
  const tabBtn = el('div', 'tab');
  tabBtn.append(el('span', 'tab-title', '🏠 หน้าแรก'));
  const x = el('span', 'tab-x', '×'); tabBtn.append(x);
  $('#tabs').append(tabBtn);
  const tab = { file: key, title: 'หน้าแรก', pane, tabBtn, dirty: false,
                editor: null, plain: null, wiki: null, gal: null, dash: true };
  tabBtn.onclick = (e) => { if (e.target !== x) activate(key); };
  x.onclick = () => closeTab(key);
  state.tabs.set(key, tab);
  activate(key);
  renderHome(pane);
}

// วาดหน้าหลัก
export async function renderHome(pane) {
  pane.innerHTML = '';
  const wrap = el('div', 'home-wrap');
  
  // หัวข้อ
  const head = el('div', 'home-head');
  head.append(el('h1', 'home-title', 'Killian 2'));
  head.append(el('p', 'home-sub', 'โปรแกรมเขียนนิยาย+บทภาพยนตร์ แบบพกพา'));
  
  // [alpha.60r3 ข้อ 9] แถวปุ่มมาตรฐาน — ปิดแท็บหน้าแรกเมื่อกด ✕
  const { actions } = buildHomeActions({ onClose: () => closeTab('::home::') });

  // คอนเทนเนอร์การ์ด (grid)
  const grid = el('div', 'home-grid');
  grid.id = 'home-grid';

  wrap.append(head, actions, grid);
  pane.append(wrap);

  // --- โหลดรายการโปรเจกต์ ---
  await loadProjects(grid);

  return wrap;
}

// โหลดโปรเจกต์ทั้งหมด: จาก recent.json + scan โฟลเดอร์ที่ผู้ใช้เก็บ
async function loadProjects(grid) {
  grid.innerHTML = '';
  
  try {
    const recent = await kapi.listRecent().catch(() => []);
    const tasks = recent.map(async (root) => {
      try {
        const metaFile = await kapi.join(root, 'project.khn.json');
        if (!(await kapi.exists(metaFile))) return null;
        const meta = await kapi.readJson(metaFile);
        
        // นับจำนวนฉาก/บท/คำ
        let totalScenes = 0, totalChapters = 0, totalWords = 0;
        let lastModified = meta.created || '';
        
        // scan ทุกเล่ม
        const entries = await kapi.listDirs(root).catch(() => []);
        for (const secName of entries) {
          const secPath = await kapi.join(root, secName);
          const secJson = await kapi.join(secPath, 'section.json');
          if (!(await kapi.exists(secJson))) continue;
          const draftRoot = await kapi.join(secPath, 'Draft');
          if (!(await kapi.exists(draftRoot))) continue;
          const draftDirs = await kapi.listDirs(draftRoot).catch(() => []);
          for (const dn of draftDirs) {
            const dPath = await kapi.join(draftRoot, dn);
            const draftFile = await kapi.join(dPath, 'draft.json');
            if (!(await kapi.exists(draftFile))) continue;
            const draft = await kapi.readJson(draftFile).catch(() => ({}));
            const chapters = draft.chapters || [];
            totalChapters += chapters.length;
            const scenesFile = await kapi.join(dPath, 'scenes.json');
            if (await kapi.exists(scenesFile)) {
              const scData = await kapi.readJson(scenesFile).catch(() => ({}));
              const scChapters = scData.chapters || {};
              for (const ch of chapters) {
                const scenes = scChapters[ch.guid] || [];
                totalScenes += scenes.filter((s) => s.type !== 'memo').length;
                for (const sc of scenes) {
                  if (sc.type === 'memo') continue;
                  totalWords += sc.wordCount || 0;
                  if (sc.modified && sc.modified > lastModified) lastModified = sc.modified;
                }
              }
            }
          }
        }
        
        // อ่านวันที่แก้ไขล่าสุดจาก meta หรือ mtime
        const modDate = lastModified ? new Date(lastModified) : null;
        const dateStr = modDate ? modDate.toLocaleDateString('th-TH', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }) : '—';
        
        return {
          root,
          title: meta.title || root.replace(/^.*[\\/]/, ''),
          author: meta.author || '',
          cover: meta.cover || '',
          totalScenes,
          totalChapters,
          totalWords,
          dateStr,
          settings: meta.settings || {},
          goals: meta.goals || {},
        };
      } catch (e) {
        log('warn', 'home: อ่านโปรเจกต์ล้มเหลว: ' + root, e);
        return null;
      }
    });
    
    let projects = (await Promise.all(tasks)).filter(Boolean);
    
    if (projects.length === 0) {
      // Empty state
      const empty = el('div', 'home-empty');
      empty.innerHTML = `
        <div class="home-empty-icon">📚</div>
        <h2>ยังไม่มีโปรเจกต์</h2>
        <p>สร้างโปรเจกต์แรกของคุณ แล้วเริ่มเขียนนิยายหรือบทภาพยนตร์ได้เลย</p>
      `;
      grid.append(empty);
      return;
    }
    
    // เรียงตามวันที่แก้ไขล่าสุด (ใหม่สุดก่อน)
    projects.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
    
    for (const p of projects) {
      const card = createProjectCard(p);
      grid.append(card);
    }
  } catch (e) {
    log('error', 'home: โหลดโปรเจกต์ล้มเหลว', e);
    grid.append(el('div', 'home-empty', 'เกิดข้อผิดพลาดในการโหลดโปรเจกต์'));
  }
}

// สร้างการ์ดโปรเจกต์หนึ่งใบ · onOpen = เรียกก่อนโหลด (กล่อง Home ใช้ปิด overlay ตัวเอง)
export function createProjectCard(project, onOpen) {
  const card = el('div', 'home-card');
  
  // ส่วนปก (แสดง cover หรือ placeholder)
  const cover = el('div', 'home-card-cover');
  if (project.cover) {
    const img = el('img', 'home-card-img');
    img.src = 'file://' + project.root.replace(/\\/g, '/') + '/' + project.cover;
    img.onerror = () => { cover.innerHTML = '<div class="home-card-cover-ph">📖</div>'; };
    cover.append(img);
  } else {
    cover.append(el('div', 'home-card-cover-ph', '📖'));
  }
  
  // เนื้อหาการ์ด
  const body = el('div', 'home-card-body');
  
  // ชื่อโปรเจกต์
  const title = el('div', 'home-card-title', project.title);
  if (project.author) {
    title.append(el('span', 'home-card-author', ' โดย ' + project.author));
  }
  body.append(title);
  
  // สถิติ
  const stats = el('div', 'home-card-stats');
  const statItems = [
    { icon: '📄', label: 'ฉาก', val: project.totalScenes },
    { icon: '📁', label: 'บท', val: project.totalChapters },
    { icon: '📝', label: 'คำ', val: project.totalWords.toLocaleString() },
  ];
  for (const s of statItems) {
    const si = el('span', 'home-stat');
    si.textContent = s.icon + ' ' + s.label + ': ' + s.val;
    stats.append(si);
  }
  body.append(stats);
  
  // วันที่แก้ไขล่าสุด
  const date = el('div', 'home-card-date', 'แก้ไขล่าสุด: ' + project.dateStr);
  body.append(date);
  
  // ปุ่มเปิด
  const openBtn = el('button', 'k-ok home-card-open', 'เปิดโปรเจกต์');
  openBtn.onclick = async (e) => {
    e.stopPropagation();
    await kapi.pushRecent(project.root).catch(() => {});
    onOpen?.();
    await loadProject(project.root);
  };
  body.append(openBtn);
  
  card.append(cover, body);
  
  // คลิกที่การ์ด = เปิด
  card.addEventListener('click', () => openBtn.click());

  return card;
}

// เปิด Home เป็น overlay dialog (แทน panel)
export async function showHomeDialog() {
  const ov = el('div', 'k-overlay');
  ov.style.zIndex = '90';
  // 0.56a #1: กล่องหน้าแรกต้อง "ขนาดเท่าเดิมเสมอ" ไม่ว่าจะมุมมองการ์ดหรือรายการ
  // (เดิมกล่องหดตามเนื้อใน → สลับมุมมองทีกล่องกระตุกทั้งใบ · แบบ DaVinci Resolve คือกรอบนิ่ง เนื้อในเลื่อน)
  const box = el('div', 'k-dialog k-home-dlg');
  const head = el('div', 'home-head');
  // [alpha.60r ข้อ 5] ปุ่มปิดกล่องหน้าแรก — overlay dialog
  const closeBtn = el('span', 'home-close-btn', '✕');
  closeBtn.title = 'ปิด';
  closeBtn.onclick = () => ov.remove();
  head.append(closeBtn);
  head.append(el('h2', 'home-title', 'Killian 2'));
  // [alpha.60r3 ข้อ 9] สวิตช์มุมมอง (การ์ด/รายการ) ย้ายขึ้นมาอยู่บนหัวกล่อง ข้างปุ่ม ✕
  // — แถวปุ่มด้านล่างจะได้เหลือเฉพาะคำสั่งที่ทำอะไรกับโปรเจกต์จริง ๆ
  const viewBtn = el('button', 'home-view-btn', '📋');
  viewBtn.title = 'สลับมุมมอง (การ์ด / รายการ)';
  head.append(viewBtn);
  const { actions } = buildHomeActions({ onClose: () => ov.remove() });
  const grid = el('div', 'home-grid');
  const scroll = el('div', 'home-dlg-scroll');   // กรอบคงที่ · เลื่อนเฉพาะรายการข้างใน
  scroll.append(grid);
  box.append(head, actions, scroll);
  ov.append(box);
  document.body.append(ov);
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };

  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { ov.remove(); document.removeEventListener('keydown', esc); } });

  // บั๊ก #12: ขนาดต้อง "นิ่ง" — จำมุมมองที่เลือกไว้ และตั้ง --home-thumb จากตั้งค่าโปรเจกต์
  const thumb = Math.max(120, Math.min(400, parseInt(state.settings?.homeThumb, 10) || 190));
  box.style.setProperty('--home-thumb', thumb + 'px');
  const listOn = localStorage.getItem('k2-home-view') === 'list';
  grid.classList.toggle('list', listOn);
  viewBtn.textContent = listOn ? '📱' : '📋';
  viewBtn.onclick = () => {
    const on = grid.classList.toggle('list');
    localStorage.setItem('k2-home-view', on ? 'list' : 'card');
    viewBtn.textContent = on ? '📱' : '📋';
  };
  await loadPanelProjects(grid, () => ov.remove());   // เปิดโปรเจกต์แล้วต้องปิดกล่อง ไม่งั้นค้างทับหน้าจอ
  return ov;
}

export async function renderHomePanel(host) {
  if (!host || host.dataset.ready === '1') return;
  host.dataset.ready = '1';
  const wrap = el('div', 'home-wrap');
  const head = el('div', 'home-head');
  head.append(el('h2', 'home-title', 'Killian 2'));
  // แผงหน้าแรกปิดด้วยปุ่ม ✕ บนหัวแผงอยู่แล้ว → ไม่ต้องมีปุ่มปิดซ้ำในแถวคำสั่ง
  const { actions } = buildHomeActions();
  const list = el('div', 'home-grid');
  wrap.append(head, actions, list);
  host.append(wrap);

  await loadPanelProjects(list);
  return wrap;
}

async function loadPanelProjects(grid, onOpen) {
  grid.innerHTML = '';
  try {
    const recent = await kapi.listRecent().catch(() => []);
    const tasks = recent.map(async (root) => {
      try {
        const metaFile = await kapi.join(root, 'project.khn.json');
        if (!(await kapi.exists(metaFile))) return null;
        const meta = await kapi.readJson(metaFile);
        let totalScenes = 0, totalChapters = 0, totalWords = 0;
        let lastModified = meta.created || '';
        const entries = await kapi.listDirs(root).catch(() => []);
        for (const secName of entries) {
          const secPath = await kapi.join(root, secName);
          const secJson = await kapi.join(secPath, 'section.json');
          if (!(await kapi.exists(secJson))) continue;
          const draftRoot = await kapi.join(secPath, 'Draft');
          if (!(await kapi.exists(draftRoot))) continue;
          const draftDirs = await kapi.listDirs(draftRoot).catch(() => []);
          for (const dn of draftDirs) {
            const dPath = await kapi.join(draftRoot, dn);
            const draftFile = await kapi.join(dPath, 'draft.json');
            if (!(await kapi.exists(draftFile))) continue;
            const draft = await kapi.readJson(draftFile).catch(() => ({}));
            const chapters = draft.chapters || [];
            totalChapters += chapters.length;
            const scenesFile = await kapi.join(dPath, 'scenes.json');
            if (await kapi.exists(scenesFile)) {
              const scData = await kapi.readJson(scenesFile).catch(() => ({}));
              const scChapters = scData.chapters || {};
              for (const ch of chapters) {
                const scenes = scChapters[ch.guid] || [];
                totalScenes += scenes.filter((s) => s.type !== 'memo').length;
                for (const sc of scenes) {
                  if (sc.type === 'memo') continue;
                  totalWords += sc.wordCount || 0;
                  if (sc.modified && sc.modified > lastModified) lastModified = sc.modified;
                }
              }
            }
          }
        }
        const modDate = lastModified ? new Date(lastModified) : null;
        const dateStr = modDate ? modDate.toLocaleDateString('th-TH', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }) : '—';
        return { root, title: meta.title || root.replace(/^.*[\\/]/, ''),
                 author: meta.author || '', cover: meta.cover || '',
                 totalScenes, totalChapters, totalWords, dateStr,
                 settings: meta.settings || {}, goals: meta.goals || {} };
      } catch (e) { return null; }
    });
    let projects = (await Promise.all(tasks)).filter(Boolean);
    if (projects.length === 0) {
      grid.append(el('div', 'home-empty', el('p', null, 'ยังไม่มีโปรเจกต์')));
      return;
    }
    projects.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
    // ใช้การ์ดชุดเดียวกับหน้า Home (.home-card) — มีสไตล์จริงและสลับมุมมองการ์ด/รายการได้
    for (const p of projects) grid.append(createProjectCard(p, onOpen));
  } catch (e) {
    log('error', 'home-panel: โหลดล้มเหลว', e);
    grid.append(el('div', 'home-empty', 'เกิดข้อผิดพลาดในการโหลดโปรเจกต์'));
  }
}
