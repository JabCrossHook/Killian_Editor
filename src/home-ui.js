// home-ui.js — หน้า Home แสดงรายการโปรเจกต์ทั้งหมดแบบ Grid (เหมือน Notion)
import { $, el, state, setStatus, log } from './core.js';
import { activate, closeTab, loadProject, newProject } from './app.js';

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
  
  // ปุ่มสร้างโปรเจกต์ใหม่
  const actions = el('div', 'home-actions');
  const newBtn = el('button', 'k-ok home-new-btn', '+ สร้างโปรเจกต์ใหม่');
  const openBtn = el('button', null, '📂 เปิดโปรเจกต์…');
  actions.append(newBtn, openBtn);
  
  // คอนเทนเนอร์การ์ด (grid)
  const grid = el('div', 'home-grid');
  grid.id = 'home-grid';
  
  wrap.append(head, actions, grid);
  pane.append(wrap);
  
  // --- โหลดรายการโปรเจกต์ ---
  await loadProjects(grid);
  
  // --- ผูกปุ่มสร้าง/เปิดโปรเจกต์ ---
  newBtn.onclick = () => newProject();
  openBtn.onclick = async () => {
    const projectPath = await kapi.openProjectDialog?.();
    if (projectPath) {
      await loadProject(projectPath);
    }
  };
  
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

// สร้างการ์ดโปรเจกต์หนึ่งใบ
export function createProjectCard(project) {
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
    await loadProject(project.root);
  };
  body.append(openBtn);
  
  card.append(cover, body);
  
  // คลิกที่การ์ด = เปิด
  card.addEventListener('click', () => openBtn.click());
  
  return card;
}
