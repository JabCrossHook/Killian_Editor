// centralize-ui.js — Dashboard แบบ Real-time + Backlinks + รายการต้องอัปเดต (ข้อ 87)
import { $, el, state, setStatus } from './core.js';

export async function openCentralizeUI() {
  if (!state.root) { setStatus('ยังไม่ได้เปิดโปรเจกต์'); return; }
  const key = '::centralize::';
  if (state.tabs.has(key)) {
    const { activate } = await import('./app.js');
    activate(key);
    return;
  }
  const pane = el('div', 'pane');
  $('#panes').append(pane);
  const tabBtn = el('div', 'tab');
  tabBtn.append(el('span', 'tab-title', '📊 Centralize'));
  const x = el('span', 'tab-x', '×'); tabBtn.append(x);
  $('#tabs').append(tabBtn);
  const tab = { file: key, title: 'Centralize', pane, tabBtn, dirty: false, editor: null, plain: null, wiki: null, gal: null, dash: true };
  tabBtn.onclick = (e) => { if (e.target !== x) { import('./app.js').then(m => m.activate(key)); } };
  x.onclick = () => { import('./app.js').then(m => m.closeTab(key)); };
  state.tabs.set(key, tab);
  const { activate } = await import('./app.js');
  activate(key);
  renderCentralize(pane);
}

async function renderCentralize(pane) {
  pane.innerHTML = '';
  const wrap = el('div', 'cent-wrap');

  // ---- Panel 1: สถิติสด ----
  const stats = el('div', 'cent-panel');
  stats.append(el('div', 'cent-panel-title', '📊 สถิติ'));
  let totalScenes = 0, totalWords = 0, totalChars = 0;
  try {
    for (const sec of await kapi.listDirs(state.root)) {
      if (['Wiki','Bible','Images','Memos','Recycle','Snapshots','Backups','Plugins','Research'].includes(sec)) continue;
      const sp = await kapi.join(state.root, sec);
      if (!(await kapi.exists(await kapi.join(sp, 'section.json')))) continue;
      const dr = await kapi.join(sp, 'Draft');
      if (!(await kapi.exists(dr))) continue;
      for (const dn of await kapi.listDirs(dr)) {
        const dp = await kapi.join(dr, dn);
        const sf = await kapi.join(dp, 'scenes.json');
        if (!(await kapi.exists(sf))) continue;
        const d = await kapi.readJson(sf);
        for (const cg of Object.keys(d.chapters || {})) {
          for (const sc of (d.chapters[cg] || [])) {
            if (sc.type !== 'memo') { totalScenes++; totalWords += sc.wordCount || 0; }
          }
        }
      }
    }
    // ตัวละคร
    const chDir = await kapi.join(state.root, 'Wiki', 'characters');
    if (await kapi.exists(chDir)) totalChars = (await kapi.listFiles(chDir, '.json')).length;
  } catch {}
  stats.append(el('div', 'cent-stat', `📄 ${totalScenes} ฉาก · 📝 ${totalWords.toLocaleString()} คำ · 👤 ${totalChars} ตัวละคร`));
  wrap.append(stats);

  // ---- Panel 2: Backlinks (ที่มา) ----
  const blinks = el('div', 'cent-panel');
  blinks.append(el('div', 'cent-panel-title', '🔗 Backlinks (ฉากที่อ้างถึง Wiki นี้)'));
  const blList = el('div', 'cent-list');
  try {
    // สแกนทุกฉาก หา mentions ของ entity ใน Wiki
    const entities = [];
    const scanWiki = async (wikiDir) => {
      if (!(await kapi.exists(wikiDir))) return;
      for (const cat of await kapi.listDirs(wikiDir)) {
        for (const f of await kapi.listFiles(await kapi.join(wikiDir, cat), '.json')) {
          try {
            const e = await kapi.readJson(await kapi.join(wikiDir, cat, f));
            if (e.name) entities.push(e.name);
          } catch {}
        }
      }
    };
    await scanWiki(await kapi.join(state.root, 'Wiki'));
    await scanWiki(await kapi.join(state.root, 'Bible'));

    // สแกนฉากทั้งหมดหา mentions
    const mentions = {};
    for (const sec of await kapi.listDirs(state.root)) {
      if (['Wiki','Bible','Images','Memos','Recycle','Snapshots','Backups','Plugins','Research'].includes(sec)) continue;
      const sp = await kapi.join(state.root, sec);
      if (!(await kapi.exists(await kapi.join(sp, 'section.json')))) continue;
      const dr = await kapi.join(sp, 'Draft');
      if (!(await kapi.exists(dr))) continue;
      for (const dn of await kapi.listDirs(dr)) {
        const dp = await kapi.join(dr, dn);
        const draftData = await kapi.readJson(await kapi.join(dp, 'draft.json')).catch(() => ({}));
        const scData = await kapi.readJson(await kapi.join(dp, 'scenes.json')).catch(() => ({}));
        const chMap = scData.chapters || {};        // ร่างที่ไม่มี scenes.json → เดิม throw ทั้งแผง
        for (const ch of (draftData.chapters || [])) {
          for (const sc of (chMap[ch.guid] || [])) {
            if (sc.type === 'memo') continue;
            const fp = await kapi.join(dp, 'Chapters', ch.folderName, sc.fileName);
            try {
              const raw = await kapi.readFile(fp);
              for (const ent of entities) {
                if (raw.includes(ent)) {
                  mentions[ent] = mentions[ent] || [];
                  mentions[ent].push(sc.title);
                }
              }
            } catch {}
          }
        }
      }
    }

    // แสดง backlinks
    const topMentions = Object.entries(mentions).sort((a, b) => b[1].length - a[1].length).slice(0, 15);
    if (!topMentions.length) {
      blList.append(el('div', 'dim', 'ยังไม่มี backlinks — พิมพ์ชื่อตัวละคร/สถานที่ในฉากเพื่อให้ปรากฏที่นี่'));
    } else {
      for (const [ent, scenes] of topMentions) {
        const row = el('div', 'cent-link-row');
        // ชื่อ entity + ชื่อฉากมาจากไฟล์ผู้ใช้ → ห้าม innerHTML
        const name = el('strong', null, ent);
        const rest = el('span', null,
          ` ← ${scenes.length} ฉาก: ${scenes.slice(0, 3).join(', ')}${scenes.length > 3 ? ' …' : ''}`);
        row.append(name, rest);
        blList.append(row);
      }
    }
  } catch {}
  blinks.append(blList);
  wrap.append(blinks);

  // ---- Panel 3: รายการต้องอัปเดต ----
  const todo = el('div', 'cent-panel');
  todo.append(el('div', 'cent-panel-title', '📋 สิ่งที่ต้องอัปเดต'));
  const todoList = el('div', 'cent-list');
  // แสดงฉากที่ไม่มีสถานะ, ตัวละครที่เพิ่งสร้าง
  const pendingItems = [];
  if (totalScenes > 0) {
    pendingItems.push(`📄 ${totalScenes} ฉาก — ตรวจสอบว่าใช้ข้อมูลล่าสุดแล้ว`);
  }
  if (state.meta && state.meta.wordHistory && state.meta.wordHistory.length) {
    const today = new Date().toISOString().slice(0, 10);
    const todayWords = state.meta.wordHistory.find((w) => w.date === today);
    if (!todayWords || todayWords.words === 0) {
      pendingItems.push('🔥 วันนี้ยังไม่ได้เขียน!');
    }
  }
  if (!pendingItems.length) {
    todoList.append(el('div', 'dim', '✅ ทุกอย่างเป็นปัจจุบัน'));
  } else {
    for (const item of pendingItems) {
      todoList.append(el('div', 'cent-todo-item', item));
    }
  }
  todo.append(todoList);
  wrap.append(todo);

  // ปุ่มรีเฟรช
  const refreshB = el('button', 'k-ok'); refreshB.textContent = '🔄 รีเฟรช'; refreshB.style.marginTop = '12px';
  refreshB.onclick = () => renderCentralize(pane);
  wrap.append(refreshB);

  pane.append(wrap);
}
