// centralize-ui.js — ศูนย์รวม (ข้อ 87): แดชบอร์ดสด + Backlinks จาก Auto-link Engine
// เดิมสแกนไฟล์ดิบทุกฉาก × ทุกเอนทิตี้ ด้วย raw.includes(ชื่อ) → ช้าและจับผิด
// (ชื่อ "แดง" ไปโดนคำว่า "แดงกล่ำ" · ไม่รู้จักชื่อรอง/alias)
// ตอนนี้ใช้ดัชนีเดียวกับแท็บ Backlinks ของ Wiki: world-story/auto-link.js
//   → รู้จัก aliases, เช็คขอบคำภาษาอังกฤษ, นับจำนวนครั้ง, และแคชลง project.khn.json
//
// "Real-time": วาดใหม่ทุกครั้งที่กลับมาที่แท็บนี้ + ทุกครั้งที่บันทึกไฟล์ (markCentralizeStale)
import { $, el, state, setStatus, log } from './core.js';
import { ensureAutoLink, resetAutoLink } from './world-story/auto-link-ui.js';
import { listScenes, listEntities, findScenePath } from './project-scan.js';
import { getFutureNotes } from './session-notes.js';
import { choiceStats } from './player-choices.js';

const KEY = '::centralize::';
const REFRESH_DELAY = 1500;   // ms — หน่วงก่อนสร้างดัชนีใหม่ (บันทึกรัว ๆ จะได้ไม่สแกนซ้ำทุกครั้ง)
let stale = true;             // ดัชนีล้าสมัยหรือยัง (ตั้งเมื่อมีการบันทึกไฟล์)
let timer = null;

/**
 * เรียกจาก saveTab: ข้อมูลเปลี่ยนแล้ว → ครั้งถัดไปที่เห็นแท็บนี้ให้สร้างดัชนีใหม่
 * ถ้าแท็บศูนย์รวมแสดงอยู่ตอนนี้ ก็อัปเดตให้เห็นเลย แต่ **หน่วงและรวบการเรียกซ้ำ** —
 * การสร้างดัชนีอ่านไฟล์ฉากทั้งโปรเจกต์ ถ้ายิงทุกครั้งที่ autosave จะหน่วงทั้งแอป
 */
export function markCentralizeStale() {
  stale = true;
  const tab = state.tabs.get(KEY);
  if (!tab || state.active !== tab) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    const t = state.tabs.get(KEY);
    if (t && state.active === t && stale) renderCentralize(t.pane);
  }, REFRESH_DELAY);
}

/** เรียกจาก activate(): กลับมาที่แท็บศูนย์รวม → รีเฟรชถ้าข้อมูลเปลี่ยนไปแล้ว */
export function onCentralizeShown() {
  const tab = state.tabs.get(KEY);
  if (tab && stale) renderCentralize(tab.pane);
}

/** เปลี่ยนโปรเจกต์ → ทิ้งสถานะเก่า */
export function resetCentralize() {
  stale = true;
  if (timer) { clearTimeout(timer); timer = null; }
}

export async function openCentralizeUI() {
  if (!state.root) { setStatus('ยังไม่ได้เปิดโปรเจกต์'); return; }
  const { activate, closeTab } = await import('./app.js');
  if (state.tabs.has(KEY)) { activate(KEY); onCentralizeShown(); return; }
  const pane = el('div', 'pane');
  $('#panes').append(pane);
  const tabBtn = el('div', 'tab');
  tabBtn.append(el('span', 'tab-title', '📊 ศูนย์รวม'));
  const x = el('span', 'tab-x', '×'); tabBtn.append(x);
  $('#tabs').append(tabBtn);
  const tab = { file: KEY, title: 'ศูนย์รวม', pane, tabBtn, dirty: false,
                editor: null, plain: null, wiki: null, gal: null, dash: true };
  tabBtn.onclick = (e) => { if (e.target !== x) activate(KEY); };
  x.onclick = () => closeTab(KEY);
  state.tabs.set(KEY, tab);
  activate(KEY);
  await renderCentralize(pane);
}

// เปิดฉากจาก sceneId (ผลลัพธ์ของ auto-link เก็บเป็น id ไม่ใช่ path)
async function openSceneById(sceneId, fallbackTitle) {
  const hit = await findScenePath(state.root, sceneId);
  if (hit && (await kapi.exists(hit.path))) {
    const { openScene } = await import('./app.js');
    openScene(hit.path, hit.title || fallbackTitle);
  } else setStatus('ไม่พบไฟล์ฉาก');
}

export async function renderCentralize(pane) {
  pane.innerHTML = '';
  const wrap = el('div', 'cent-wrap');
  pane.append(wrap);

  const headRow = el('div', 'cent-head');
  headRow.append(el('div', 'cent-title', '📊 ศูนย์รวม'));
  const liveDot = el('span', 'cent-live', '● สด');
  liveDot.title = 'อัปเดตอัตโนมัติทุกครั้งที่บันทึกไฟล์';
  headRow.append(liveDot);
  const refreshB = el('button', 'cent-refresh', '🔄 สร้างดัชนีใหม่');
  refreshB.onclick = () => { resetAutoLink(); stale = true; renderCentralize(pane); };
  headRow.append(refreshB);
  wrap.append(headRow);

  // ---- โหลดข้อมูลผ่านชั้นสแกนกลาง (project-scan) + Auto-link Engine ----
  const loading = el('div', 'dim', 'กำลังสร้างดัชนีเชื่อมโยง…');
  wrap.append(loading);

  let scenes = [], entities = [], autoLink = null;
  try {
    [scenes, entities] = await Promise.all([
      listScenes(state.root, { withText: false }),
      listEntities(state.root),
    ]);
    if (stale) resetAutoLink();               // บังคับสร้างดัชนีใหม่เมื่อไฟล์เปลี่ยน
    autoLink = await ensureAutoLink();
    stale = false;
  } catch (e) {
    log('error', 'centralize: สร้างดัชนีไม่สำเร็จ', e);
  }
  loading.remove();

  // ───────── แผง 1: สถิติสด ─────────
  const stats = el('div', 'cent-panel');
  stats.append(el('div', 'cent-panel-title', '📊 สถิติ'));
  // listScenes คืนแถวดิบไว้ใน .row (ไม่ใช่ระดับบนสุด) — wordCount/status อยู่ในนั้น
  const words = scenes.reduce((n, s) => n + ((s.row && s.row.wordCount) || 0), 0);
  const byCat = {};
  for (const e of entities) byCat[e.cat || e.entityTypeKey || 'อื่น ๆ'] = (byCat[e.cat || e.entityTypeKey || 'อื่น ๆ'] || 0) + 1;
  const grid = el('div', 'cent-stats-grid');
  const statCard = (num, label) => {
    const c = el('div', 'cent-stat-card');
    c.append(el('div', 'cent-stat-num', String(num)), el('div', 'cent-stat-lbl', label));
    grid.append(c);
  };
  statCard(scenes.length.toLocaleString(), 'ฉาก');
  statCard(words.toLocaleString(), 'คำ');
  statCard(entities.length.toLocaleString(), 'Wiki');
  if (autoLink) {
    const s = autoLink.stats();
    statCard(s.links.toLocaleString(), 'จุดเชื่อมโยง');
  }
  stats.append(grid);
  // แถวสรุปแบบบรรทัดเดียว — e2e เดิมอ้าง .cent-stat จึงคงชื่อคลาสไว้
  stats.append(el('div', 'cent-stat',
    `📄 ${scenes.length} ฉาก · 📝 ${words.toLocaleString()} คำ · 👤 ${byCat.characters || 0} ตัวละคร`));
  if (Object.keys(byCat).length) {
    stats.append(el('div', 'cent-stat',
      '🗂 ' + Object.entries(byCat).sort((a, b) => b[1] - a[1])
        .map(([c, n]) => `${c} ${n}`).join(' · ')));
  }
  wrap.append(stats);

  // ───────── แผง 2: Backlinks จาก Auto-link Engine ─────────
  const blinks = el('div', 'cent-panel');
  blinks.append(el('div', 'cent-panel-title', '🔗 Backlinks (ฉากที่อ้างถึง Wiki นี้)'));
  const blList = el('div', 'cent-list');
  blinks.append(blList);

  if (!autoLink) {
    blList.append(el('div', 'dim', 'สร้างดัชนีไม่สำเร็จ — กด "🔄 สร้างดัชนีใหม่"'));
  } else {
    // จัดอันดับเอนทิตี้ตามจำนวนฉากที่กล่าวถึง
    const ranked = entities
      .map((e) => ({ ent: e, links: autoLink.getRelatedScenes(e.path || e.id) }))
      .filter((r) => r.links.length)
      .sort((a, b) => b.links.length - a.links.length);

    if (!ranked.length) {
      blList.append(el('div', 'dim',
        'ยังไม่มี backlinks — พิมพ์ชื่อตัวละคร/สถานที่ในฉากเพื่อให้ปรากฏที่นี่'));
    } else {
      for (const { ent, links } of ranked.slice(0, 15)) {
        const row = el('div', 'cent-link-row');
        // ชื่อ entity + ชื่อฉากมาจากไฟล์ผู้ใช้ → ห้าม innerHTML
        const name = el('strong', null, ent.name);
        row.append(name, el('span', null, ` ← ${links.length} ฉาก: `));
        links.slice(0, 3).forEach((l, i) => {
          if (i) row.append(el('span', null, ', '));
          const a = el('span', 'cent-scene-link', l.title || l.sceneId);
          a.title = `กล่าวถึง ${l.count || 1} ครั้ง — คลิกเปิดฉาก`;
          a.onclick = () => openSceneById(l.sceneId, l.title);
          row.append(a);
        });
        if (links.length > 3) row.append(el('span', 'dim', ` … +${links.length - 3}`));
        blList.append(row);
      }

      // เอนทิตี้ที่ไม่มีใครพูดถึงเลย — ช่องโหว่ของเรื่องที่มองไม่เห็นถ้าไม่มีดัชนี
      const orphans = entities.filter((e) => !autoLink.getRelatedScenes(e.path || e.id).length);
      if (orphans.length) {
        const row = el('div', 'cent-link-row cent-orphan');
        row.append(el('strong', null, '🕳 ยังไม่ถูกกล่าวถึงเลย'));
        row.append(el('span', null, ` (${orphans.length}): `
          + orphans.slice(0, 6).map((e) => e.name).join(', ')
          + (orphans.length > 6 ? ' …' : '')));
        blList.append(row);
      }
    }
  }
  wrap.append(blinks);

  // ───────── แผง 3: สิ่งที่ต้องอัปเดต ─────────
  const todo = el('div', 'cent-panel');
  todo.append(el('div', 'cent-panel-title', '📋 สิ่งที่ต้องอัปเดต'));
  const todoList = el('div', 'cent-list');
  const pending = [];

  // โน้ต "ไว้ทำภายหลัง" ที่ยังค้าง (ข้อ 85)
  for (const n of getFutureNotes().slice(-5).reverse()) {
    pending.push({ text: '📝 ' + n.text.slice(0, 70), sceneId: n.sceneId, title: n.sceneTitle });
  }
  // ฉากที่ยังไม่ได้ตั้งสถานะ
  const noStatus = scenes.filter((s) => !(s.row && s.row.status));
  if (noStatus.length) pending.push({ text: `📄 ${noStatus.length} ฉากยังไม่ได้ตั้งสถานะ` });
  // ยังไม่ได้เขียนวันนี้
  if (state.meta && Array.isArray(state.meta.wordHistory) && state.meta.wordHistory.length) {
    const today = new Date().toISOString().slice(0, 10);
    const t2 = state.meta.wordHistory.find((w) => w.date === today);
    if (!t2 || !t2.words) pending.push({ text: '🔥 วันนี้ยังไม่ได้เขียน!' });
  }
  // การตัดสินใจล่าสุด (ข้อ 83)
  const cs = choiceStats();
  if (cs.total) pending.push({ text: `🎮 บันทึกการตัดสินใจไว้ ${cs.total} ครั้ง` });

  if (!pending.length) {
    todoList.append(el('div', 'dim', '✅ ทุกอย่างเป็นปัจจุบัน'));
  } else {
    for (const item of pending) {
      const d = el('div', 'cent-todo-item', item.text);
      if (item.sceneId) {
        d.classList.add('cent-clickable');
        d.onclick = () => openSceneById(item.sceneId, item.title);
      }
      todoList.append(d);
    }
  }
  todo.append(todoList);
  wrap.append(todo);
}
