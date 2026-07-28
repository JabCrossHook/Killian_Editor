// branching-ui.js — เรื่องแบบแตกสาย: ฉากไหนมี choices[] บ้าง + แก้ไขได้ในตัว
// (เดิมอ่านอย่างเดียว แต่ไม่มีที่ไหนในโปรแกรมเขียน choices ได้เลย → หน้าว่างตลอด)
import { $, el, state, setStatus, log } from './core.js';

export async function openBranchingTree() {
  const key = '::branching::';
  const { activate, closeTab } = await import('./app.js');
  if (state.tabs.has(key)) { activate(key); return; }
  const pane = el('div', 'pane');
  $('#panes').append(pane);
  const tabBtn = el('div', 'tab');
  tabBtn.append(el('span', 'tab-title', '🌿 ผังแตกสาย'));
  const x = el('span', 'tab-x', '×'); tabBtn.append(x);
  $('#tabs').append(tabBtn);
  const tab = { file: key, title: 'ผังแตกสาย', pane, tabBtn, dirty: false,
                editor: null, plain: null, wiki: null, gal: null, dash: true };
  tabBtn.onclick = (e) => { if (e.target !== x) activate(key); };
  x.onclick = () => closeTab(key);
  state.tabs.set(key, tab);
  activate(key);
  await renderBranchingTree(pane);
}

// รวบรวมฉากทั้งโปรเจกต์ (ใช้ทั้งแสดงผลและเป็นตัวเลือก "ไปฉากไหนต่อ")
async function collectScenes() {
  const out = [];
  if (!state.root) return out;
  for (const sec of await kapi.listDirs(state.root).catch(() => [])) {
    if (['Wiki','Bible','Images','Memos','Recycle','Snapshots','Backups','Plugins','Research'].includes(sec)) continue;
    const sp = await kapi.join(state.root, sec);
    if (!(await kapi.exists(await kapi.join(sp, 'section.json')))) continue;
    const dr = await kapi.join(sp, 'Draft');
    if (!(await kapi.exists(dr))) continue;
    for (const dn of await kapi.listDirs(dr).catch(() => [])) {
      const dp = await kapi.join(dr, dn);
      const dj = await kapi.join(dp, 'draft.json');
      if (!(await kapi.exists(dj))) continue;
      const draft = await kapi.readJson(dj);
      const scData = await kapi.readJson(await kapi.join(dp, 'scenes.json')).catch(() => ({}));
      const chMap = scData.chapters || {};                    // ร่างที่ยังไม่มี scenes.json
      for (const ch of (draft.chapters || [])) {
        for (const sc of (chMap[ch.guid] || [])) {
          if (sc.type === 'memo') continue;
          out.push({ ...sc, dPath: dp, chapterName: ch.title,
                     filePath: await kapi.join(dp, 'Chapters', ch.folderName, sc.fileName) });
        }
      }
    }
  }
  return out;
}

export async function renderBranchingTree(pane) {
  pane.innerHTML = '';
  const wrap = el('div', 'branch-wrap');
  const head = el('div', 'branch-head');
  head.append(el('div', 'branch-title', '🌿 ผังแตกสาย (Non-linear)'));
  wrap.append(head);

  let scenes = [];
  try { scenes = await collectScenes(); }
  catch (e) { log('error', 'branching: อ่านฉากไม่สำเร็จ', e); }

  const withChoices = scenes.filter((s) => (s.choices || []).length);
  if (!withChoices.length) {
    wrap.append(el('div', 'branch-empty dim',
      'ยังไม่มีฉากที่มีทางเลือก — กด "+ เพิ่มทางเลือก" ที่ฉากใดก็ได้ด้านล่าง'));
  }

  const byId = new Map(scenes.map((s) => [s.id, s]));
  const tree = el('div', 'branch-tree');
  for (const n of withChoices) {
    const card = el('div', 'branch-card');
    const title = el('div', 'branch-node-title', '📄 ' + (n.title || 'ฉาก'));
    title.onclick = async () => { const { openScene } = await import('./app.js'); openScene(n.filePath, n.title); };
    card.append(title);
    if (n.chapterName) card.append(el('div', 'branch-ch', n.chapterName));
    const choices = el('div', 'branch-choices');
    for (const c of (n.choices || [])) {
      const target = c.nextSceneId ? byId.get(c.nextSceneId) : null;
      const row = el('div', 'branch-choice', '➤ ' + (c.text || 'ทางเลือก'));
      row.title = 'ไปยัง: ' + (target ? target.title : (c.nextSceneId || '—'));
      if (target) row.onclick = async () => {
        // เดินตามทางเลือก = บันทึกลงประวัติการตัดสินใจด้วย
        const { recordChoice } = await import('./player-choices.js');
        await recordChoice(n.id, n.title, c.text);
        const { openScene } = await import('./app.js'); openScene(target.filePath, target.title);
      };
      const del = el('span', null, ' ✕');
      del.style.cssText = 'cursor:pointer;opacity:.5';
      del.onclick = async (e) => {
        e.stopPropagation();
        const { updateSceneRow } = await import('./app.js');
        await updateSceneRow(n.dPath, n.id, (r) => {
          r.choices = (r.choices || []).filter((y) => y.text !== c.text || y.nextSceneId !== c.nextSceneId);
        });
        await renderBranchingTree(pane);
      };
      row.append(del);
      choices.append(row);
    }
    card.append(choices);
    tree.append(card);
  }
  wrap.append(tree);

  // ---- เพิ่มทางเลือกให้ฉากใดก็ได้ ----
  const adder = el('div', 'branch-adder');
  adder.style.cssText = 'margin-top:16px;display:flex;gap:6px;flex-wrap:wrap;align-items:center';
  adder.append(el('span', 'dim', 'เพิ่มทางเลือก:'));
  const fromSel = el('select', 'k-dlg-select');
  const toSel = el('select', 'k-dlg-select');
  const none = el('option', null, '— ยังไม่ระบุ —'); none.value = ''; toSel.append(none);
  for (const s of scenes) {
    const a = el('option', null, s.title || '(ไม่มีชื่อ)'); a.value = s.id; fromSel.append(a);
    const b = el('option', null, s.title || '(ไม่มีชื่อ)'); b.value = s.id; toSel.append(b);
  }
  const textInp = el('input', 'k-dlg-input');
  textInp.placeholder = 'ข้อความทางเลือก เช่น "เปิดประตู"';
  const addB = el('button', 'k-ok', '+ เพิ่มทางเลือก');
  addB.onclick = async () => {
    const from = byId.get(fromSel.value);
    const text = textInp.value.trim();
    if (!from || !text) { setStatus('เลือกฉากและใส่ข้อความทางเลือกก่อน'); return; }
    const { updateSceneRow } = await import('./app.js');
    await updateSceneRow(from.dPath, from.id, (r) => {
      r.choices = [...(r.choices || []), { text, nextSceneId: toSel.value || '' }];
    });
    textInp.value = '';
    setStatus('เพิ่มทางเลือกแล้ว');
    await renderBranchingTree(pane);
  };
  adder.append(fromSel, textInp, el('span', 'dim', '→'), toSel, addB);
  if (scenes.length) wrap.append(adder);

  pane.append(wrap);
}
