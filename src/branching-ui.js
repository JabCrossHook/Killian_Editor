// branching-ui.js — เรื่องแบบแตกสาย (Non-linear, ข้อ 81)
// ผัง Branch Tree แบบเห็นภาพจริง: กล่องฉาก + เส้นโค้งเชื่อมทางเลือก + แผง inspector แก้ไขได้ในตัว
// ตรรกะผัง (จัดชั้น/วิเคราะห์วง/ไล่เส้นทาง) อยู่ใน branch-graph.js — ที่นี่ทำหน้าที่วาดอย่างเดียว
//
//   scenes.json → collectScenes() → buildGraph → layoutGraph → วาด SVG (เส้น) + div (กล่อง)
//   คลิกกล่อง = เลือก → แผงขวาแก้ทางเลือกได้ · ดับเบิลคลิก = เปิดฉาก · ⊞ = เปิดคู่กับผัง (Split View)
import { $, el, state, setStatus, log } from './core.js';
import {
  NODE_W, NODE_H, GAP_X, PAD,
  buildGraph, layoutGraph, analyzeGraph, graphSummary, enumeratePaths,
  scanChoiceMarkers, diffChoiceMarkers,
} from './branch-graph.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

const ZOOM_MIN = 0.4, ZOOM_MAX = 1.8;

// สถานะของหน้านี้ (จำระหว่าง re-render — ไม่ต้องเลือกโหนดใหม่ทุกครั้งที่แก้ทางเลือก)
function bstate() {
  if (!state._branch) state._branch = { sel: null, zoom: 1, view: 'tree', sideOpen: true };
  return state._branch;
}

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
  registerBranchPanel();          // ให้แผง inspector เป็นส่วนหนึ่งของ Panel System
}

// ลงทะเบียนแผง inspector กับ PanelManager (ซ่อน/แสดงผ่านปุ่ม 📐 จัดการแผง ได้เหมือนแผงอื่น)
function registerBranchPanel() {
  try {
    import('./panels/panel-ui.js').then(({ getPanelManager }) => {
      const m = getPanelManager();
      if (!m || typeof m.registerPanel !== 'function') return;
      m.registerPanel('branch-inspector', {
        title: 'ทางเลือกของฉาก',
        show: () => { bstate().sideOpen = true; refreshOpenBranchTab(); },
        hide: () => { bstate().sideOpen = false; refreshOpenBranchTab(); },
        isVisible: () => bstate().sideOpen,
        render: () => {},
        destroy: () => {},
      });
    }).catch(() => {});
  } catch (e) { log('warn', 'branching: ลงทะเบียนแผงไม่สำเร็จ', e); }
}

// วาดใหม่ถ้าแท็บผังยังเปิดอยู่ (ใช้หลังแก้ scenes.json จากที่อื่น)
export function refreshOpenBranchTab() {
  const t = state.tabs.get('::branching::');
  if (t) renderBranchingTree(t.pane);
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

// เปิดฉาก — โหมด split จะเปิดคู่กับผังแทนที่จะทับผัง
async function openSceneFromGraph(node, split) {
  if (!node.filePath) { setStatus('ฉากนี้ยังไม่มีไฟล์'); return; }
  const { openScene } = await import('./app.js');
  if (split) {
    // ให้ช่องแรกเป็นผัง แล้วเปิดฉากในช่องใหม่ด้านขวา → ได้ผังซ้าย/ฉากขวา
    const { getSplitManager, openInSplit } = await import('./layout/split-ui.js');
    getSplitManager().open('::branching::');
    await openScene(node.filePath, node.title);
    openInSplit(node.filePath, 'right');
  } else {
    await openScene(node.filePath, node.title);
  }
}

export async function renderBranchingTree(pane) {
  const bs = bstate();
  pane.innerHTML = '';

  let scenes = [];
  try { scenes = await collectScenes(); }
  catch (e) { log('error', 'branching: อ่านฉากไม่สำเร็จ', e); }

  const graph = buildGraph(scenes);
  const layout = layoutGraph(graph);
  const analysis = analyzeGraph(graph);
  const redraw = () => renderBranchingTree(pane);

  const shell = el('div', 'branch-shell');
  const main = el('div', 'branch-main');
  const wrap = el('div', 'branch-wrap');

  // ───────── หัวเรื่อง + แถบเครื่องมือ ─────────
  const head = el('div', 'branch-head');
  const titleRow = el('div', 'branch-title-row');
  titleRow.append(el('div', 'branch-title', '🌿 ผังแตกสาย (Non-linear)'));

  const tools = el('div', 'branch-tools');
  const viewTog = el('div', 'branch-viewtog');
  const bTree = el('button', 'branch-viewbtn' + (bs.view === 'tree' ? ' on' : ''), '🌳 ผัง');
  const bList = el('button', 'branch-viewbtn' + (bs.view === 'list' ? ' on' : ''), '☰ รายการ');
  bTree.onclick = () => { bs.view = 'tree'; redraw(); };
  bList.onclick = () => { bs.view = 'list'; redraw(); };
  viewTog.append(bTree, bList);
  tools.append(viewTog);

  if (bs.view === 'tree') {
    const zOut = el('button', 'branch-zbtn', '−'); zOut.title = 'ย่อผัง';
    const zLbl = el('span', 'branch-zlabel', Math.round(bs.zoom * 100) + '%');
    const zIn = el('button', 'branch-zbtn', '+'); zIn.title = 'ขยายผัง';
    const zFit = el('button', 'branch-zbtn', '⤢'); zFit.title = 'พอดีจอ';
    zOut.onclick = () => { bs.zoom = Math.max(ZOOM_MIN, +(bs.zoom - 0.15).toFixed(2)); redraw(); };
    zIn.onclick = () => { bs.zoom = Math.min(ZOOM_MAX, +(bs.zoom + 0.15).toFixed(2)); redraw(); };
    zFit.onclick = () => {
      const avail = (main.clientWidth || pane.clientWidth || 900) - 40;
      const f = layout.width > 0 ? avail / layout.width : 1;
      bs.zoom = Math.max(ZOOM_MIN, Math.min(1, +f.toFixed(2)));
      redraw();
    };
    tools.append(zOut, zLbl, zIn, zFit);
  }

  const sideTog = el('button', 'branch-zbtn', bs.sideOpen ? '▶' : '◀');
  sideTog.title = bs.sideOpen ? 'ซ่อนแผงทางเลือก' : 'แสดงแผงทางเลือก';
  sideTog.onclick = () => { bs.sideOpen = !bs.sideOpen; redraw(); };
  tools.append(sideTog);

  // สแกนทั้งโปรเจกต์: อ่านทุกฉากหา [ข้อความ] ที่ยังไม่ได้ผูกเป็นทางเลือก (ข้อ 15)
  const scanB = el('button', 'branch-zbtn', '🔎');
  scanB.title = 'สแกนทุกฉากหา [ข้อความ] ทางเลือกที่ยังไม่ได้ผูก';
  scanB.onclick = () => scanAllScenes(scenes, redraw);
  tools.append(scanB);

  const refreshB = el('button', 'branch-zbtn', '🔄'); refreshB.title = 'อ่าน scenes.json ใหม่';
  refreshB.onclick = () => redraw();
  tools.append(refreshB);

  titleRow.append(tools);
  head.append(titleRow);
  head.append(el('div', 'branch-stats', graphSummary(analysis)));
  wrap.append(head);

  // ───────── คำเตือนสุขภาพผัง ─────────
  const warn = el('div', 'branch-warn');
  const addWarn = (cls, text) => { const d = el('span', 'branch-badge ' + cls, text); warn.append(d); };
  if (analysis.dangling.length) addWarn('bw-open', `⚠ ${analysis.dangling.length} ทางเลือกยังไม่ระบุปลายทาง`);
  if (analysis.unreachable.length) addWarn('bw-lost', `🚫 ${analysis.unreachable.length} ฉากเดินไปไม่ถึง`);
  if (analysis.cycles.length) addWarn('bw-loop', `🔁 ${analysis.cycles.length} ฉากอยู่ในวงวนซ้ำ`);
  if (analysis.endings.length) addWarn('bw-end', `🏁 ${analysis.endings.length} ตอนจบ`);
  if (warn.childNodes.length) wrap.append(warn);

  if (!analysis.total) {
    wrap.append(el('div', 'branch-empty dim',
      'ยังไม่มีฉากที่มีทางเลือก — เพิ่มได้ที่แผง "เพิ่มทางเลือก" ด้านล่าง แล้วผังจะขึ้นทันที'));
  }

  // ───────── มุมมองผัง (SVG เส้น + กล่อง HTML) ─────────
  const cycleSet = new Set(analysis.cycles);
  const unreachSet = new Set(analysis.unreachable);
  const rootSet = new Set(analysis.roots);
  const endSet = new Set(analysis.endings);

  if (bs.view === 'tree' && analysis.total) {
    const viewport = el('div', 'branch-viewport');
    const canvas = el('div', 'branch-canvas');
    canvas.style.width = layout.width + 'px';
    canvas.style.height = layout.height + 'px';
    canvas.style.transform = `scale(${bs.zoom})`;
    canvas.style.transformOrigin = 'top left';
    // กล่องนอกต้องกินพื้นที่เท่าขนาดหลังย่อ/ขยาย ไม่งั้นเลื่อนไม่ถึงขอบขวา
    viewport.style.setProperty('--bw', Math.round(layout.width * bs.zoom) + 'px');
    viewport.style.setProperty('--bh', Math.round(layout.height * bs.zoom) + 'px');

    // --- เส้นเชื่อม ---
    const svg = svgEl('svg', { class: 'branch-edges', width: layout.width, height: layout.height });
    const defs = svgEl('defs');
    for (const [id, color] of [['bg-arrow', '#98958b'], ['bg-arrow-sel', '#d97757']]) {
      const mk = svgEl('marker', { id, viewBox: '0 0 10 10', refX: '9', refY: '5',
        markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' });
      mk.append(svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: color }));
      defs.append(mk);
    }
    svg.append(defs);

    for (const e of graph.edges) {
      if (e.dangling) continue;
      const a = layout.byId.get(e.from), b = layout.byId.get(e.to);
      if (!a || !b) continue;
      const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2;
      const x2 = b.x, y2 = b.y + NODE_H / 2;
      // เส้นย้อนกลับ (ไปฉากที่อยู่ซ้ายกว่า) = วงวนซ้ำ → อ้อมด้านล่างให้เห็นชัดว่าย้อน
      const back = x2 <= x1;
      const cx = back ? Math.max(40, GAP_X) : (x2 - x1) / 2;
      const d = back
        ? `M ${x1} ${y1} C ${x1 + cx} ${y1 + NODE_H} ${x2 - cx} ${y2 + NODE_H} ${x2} ${y2}`
        : `M ${x1} ${y1} C ${x1 + cx} ${y1} ${x2 - cx} ${y2} ${x2} ${y2}`;
      const hot = bs.sel === e.from || bs.sel === e.to;
      const path = svgEl('path', {
        d, class: 'branch-edge' + (back ? ' branch-edge-back' : '') + (hot ? ' branch-edge-hot' : ''),
        'marker-end': `url(#${hot ? 'bg-arrow-sel' : 'bg-arrow'})`,
      });
      const tt = svgEl('title'); tt.textContent = e.text || 'ทางเลือก';
      path.append(tt);
      svg.append(path);
      // ป้ายข้อความทางเลือกกลางเส้น (ย่อให้พอดี ไม่ให้ผังรก) — คลิกป้าย = เปิดฉากต้นทาง
      if (e.text) {
        const label = svgEl('text', {
          x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 6,
          class: 'branch-edge-label' + (hot ? ' on' : ''), 'text-anchor': 'middle',
        });
        label.textContent = e.text.length > 16 ? e.text.slice(0, 15) + '…' : e.text;
        const lt = svgEl('title'); lt.textContent = `[${e.text}] — คลิกเพื่อเปิดฉากต้นทาง`;
        label.append(lt);
        label.addEventListener('click', () => {
          const src = graph.byId.get(e.from);
          if (src) openSceneFromGraph(src, false);
        });
        svg.append(label);
      }
    }
    canvas.append(svg);

    // --- กล่องฉาก ---
    for (const n of layout.placed) {
      const box = el('div', 'branch-node');
      if (bs.sel === n.id) box.classList.add('on');
      if (rootSet.has(n.id)) box.classList.add('bn-root');
      if (endSet.has(n.id)) box.classList.add('bn-end');
      if (cycleSet.has(n.id)) box.classList.add('bn-loop');
      if (unreachSet.has(n.id)) box.classList.add('bn-lost');
      box.style.cssText = `left:${n.x}px;top:${n.y}px;width:${NODE_W}px;height:${NODE_H}px`;
      if (n.color) box.style.borderLeftColor = n.color;

      const icon = rootSet.has(n.id) ? '▶ ' : endSet.has(n.id) ? '🏁 ' : '📄 ';
      box.append(el('div', 'branch-node-name', icon + n.title));
      const meta = el('div', 'branch-node-meta');
      meta.append(el('span', null, n.chapterName || '—'));
      if (n.choices.length) meta.append(el('span', 'branch-node-count', '⤷ ' + n.choices.length));
      box.append(meta);

      box.title = [
        n.title,
        n.chapterName ? 'บท: ' + n.chapterName : '',
        `ทางเลือก: ${n.choices.length}`,
        rootSet.has(n.id) ? '▶ จุดเริ่ม' : '',
        endSet.has(n.id) ? '🏁 ตอนจบ (ไม่มีทางเลือกออก)' : '',
        cycleSet.has(n.id) ? '🔁 อยู่ในวงวนซ้ำ' : '',
        unreachSet.has(n.id) ? '🚫 เดินจากจุดเริ่มมาไม่ถึง' : '',
        'คลิก = เลือก · ดับเบิลคลิก = เปิดฉาก',
      ].filter(Boolean).join('\n');

      box.onclick = () => { bs.sel = n.id; redraw(); };
      box.ondblclick = () => openSceneFromGraph(n, false);
      canvas.append(box);
    }
    viewport.append(canvas);
    wrap.append(viewport);
  }

  // ───────── มุมมองรายการ (โครงเดิม — อ่านง่ายตอนฉากเยอะ) ─────────
  if (bs.view === 'list' && analysis.total) {
    const tree = el('div', 'branch-tree');
    for (const n of graph.nodes.filter((x) => x.choices.length)) {
      const card = el('div', 'branch-card');
      if (bs.sel === n.id) card.classList.add('on');
      const title = el('div', 'branch-node-title', '📄 ' + n.title);
      title.onclick = () => openSceneFromGraph(n, false);
      card.append(title);
      if (n.chapterName) card.append(el('div', 'branch-ch', n.chapterName));
      const choices = el('div', 'branch-choices');
      n.choices.forEach((c, idx) => {
        const target = c.nextSceneId ? graph.byId.get(c.nextSceneId) : null;
        const row = el('div', 'branch-choice' + (target ? '' : ' branch-choice-open'),
                       '➤ ' + (c.text || 'ทางเลือก'));
        row.title = 'ไปยัง: ' + (target ? target.title : '(ยังไม่ระบุปลายทาง)');
        if (target) row.onclick = async () => {
          const { recordChoice } = await import('./player-choices.js');
          await recordChoice(n.id, n.title, c.text);
          openSceneFromGraph(target, false);
        };
        const del = el('span', 'branch-choice-del', '✕');
        del.title = 'ลบทางเลือกนี้';
        del.onclick = async (e) => { e.stopPropagation(); await removeChoice(n, idx); redraw(); };
        row.append(del);
        choices.append(row);
      });
      card.append(choices);
      card.onclick = (e) => { if (e.target === card) { bs.sel = n.id; redraw(); } };
      tree.append(card);
    }
    wrap.append(tree);
  }

  // ───────── แผงเพิ่มทางเลือกให้ฉากใดก็ได้ (ทางเข้าเมื่อผังยังว่าง) ─────────
  if (scenes.length) wrap.append(buildAdder(graph, bs, redraw));

  main.append(wrap);
  shell.append(main);

  // ───────── แผงขวา: inspector ของฉากที่เลือก (Panel System) ─────────
  if (bs.sideOpen) shell.append(buildInspector(graph, layout, analysis, bs, redraw));

  pane.append(shell);

  // เลื่อนให้เห็นโหนดที่เลือก (หลังต่อเข้า DOM แล้วเท่านั้น ไม่งั้นวัดตำแหน่งไม่ได้)
  if (bs.view === 'tree' && bs.sel) {
    const on = pane.querySelector('.branch-node.on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

// ---- เขียน choices กลับลง scenes.json ----
// ต้องต่อคิว: updateSceneRow เป็น อ่าน→แก้→เขียน ทั้งไฟล์ ถ้ายิงพร้อมกันสองครั้ง
// (เช่นกดลบสองแถวรัว ๆ หรือ blur ช่องข้อความแล้วกดปุ่มทันที) ตัวหลังจะอ่านของเก่า
// แล้วเขียนทับ = การแก้ครั้งแรกหายเงียบ ๆ (บั๊กข้อ 15c)
let _choiceQueue = Promise.resolve();
export function mutateChoices(node, fn) {
  const run = async () => {
    const { updateSceneRow } = await import('./app.js');
    return updateSceneRow(node.dPath, node.id, (r) => {
      r.choices = fn([...(r.choices || [])]);
      if (!r.choices.length) delete r.choices;           // ไม่ทิ้ง [] ว่างไว้ในไฟล์
    });
  };
  _choiceQueue = _choiceQueue.then(run, run);            // ล้มแล้วคิวต้องไปต่อ ไม่ค้าง
  return _choiceQueue;
}
const removeChoice = (node, idx) => mutateChoices(node, (list) => { list.splice(idx, 1); return list; });

// ---- อ่านเนื้อฉากจากดิสก์ (ใช้หา [ข้อความ] ทางเลือก) ----
async function readSceneBody(node) {
  if (!node || !node.filePath) return '';
  try {
    const { parseMdFile } = await import('./md.js');
    return parseMdFile(await kapi.readFile(node.filePath)).body || '';
  } catch (e) { log('warn', 'branching: อ่านเนื้อฉากไม่สำเร็จ', e); return ''; }
}

// ---- แทรก [ข้อความ] ลงท้ายฉาก เพื่อให้ทางเลือกมีที่อยู่จริงในเนื้อเรื่อง ----
async function insertMarkerIntoScene(node, text) {
  if (!node.filePath) { setStatus('ฉากนี้ยังไม่มีไฟล์'); return false; }
  const { parseMdFile, dumpMdFile } = await import('./md.js');
  const { state: st } = await import('./core.js');
  const raw = await kapi.readFile(node.filePath);
  const { meta, body } = parseMdFile(raw);
  const marker = '[' + text + ']';
  if (body.includes(marker)) return true;
  const next = (body.replace(/\s+$/, '') + '\n\n' + marker + '\n');
  await kapi.writeFile(node.filePath, dumpMdFile(meta, next));
  // ฉากเปิดค้างอยู่ → โหลดเนื้อใหม่ให้เห็นทันที (ไม่งั้นพิมพ์ต่อแล้วเขียนทับของที่เพิ่งแทรก)
  const tab = st.tabs.get(node.filePath);
  if (tab && !tab.dirty) {
    if (tab.editor) tab.editor.setMarkdown(next);
    else if (tab.sp) tab.sp.setMarkdown(next);
  } else if (tab && tab.dirty) {
    setStatus('แทรกในไฟล์แล้ว — ฉากที่เปิดอยู่ยังไม่บันทึก กดบันทึกทับได้เลยถ้าไม่ต้องการ');
  }
  return true;
}

/**
 * สแกน [ข้อความ] ในฉากที่เปิดอยู่ แล้วสร้างทางเลือกที่ยังไม่มีให้ครบ (ข้อ 15)
 * เรียกได้จากเมนู/คีย์ลัด ระหว่างเขียนฉากอยู่ ไม่ต้องเปิดหน้าผังก่อน
 */
export async function syncChoicesFromScene() {
  const { sceneCtx, updateSceneRow } = await import('./app.js');
  const ctx = await sceneCtx();
  if (!ctx) { setStatus('เปิดฉากก่อน แล้วพิมพ์ทางเลือกในวงเล็บเหลี่ยม เช่น [ไปตลาด]'); return 0; }
  const tab = state.tabs.get(state.active?.file);
  // ใช้เนื้อในตัวแก้ไขก่อน (ผู้ใช้เพิ่งพิมพ์ อาจยังไม่บันทึก) ไม่งั้นค่อยอ่านจากไฟล์
  let body = '';
  if (tab && (tab.editor || tab.sp)) body = (tab.editor || tab.sp).getMarkdown();
  if (!body) {
    const { parseMdFile } = await import('./md.js');
    try { body = parseMdFile(await kapi.readFile(state.active.file)).body || ''; } catch {}
  }
  const markers = scanChoiceMarkers(body);
  if (!markers.length) {
    setStatus('ไม่พบทางเลือกในฉากนี้ — พิมพ์ [ข้อความ] ตรงจุดที่เรื่องแตกสาย');
    return 0;
  }
  const { missing } = diffChoiceMarkers(markers, ctx.row.choices || []);
  if (!missing.length) { setStatus('ทางเลือกในฉากนี้ผูกครบแล้ว (' + markers.length + ' จุด)'); return 0; }
  await updateSceneRow(ctx.dPath, ctx.row.id, (r) => {
    r.choices = [...(r.choices || []), ...missing.map((t) => ({ text: t, nextSceneId: '' }))];
  });
  setStatus(`เพิ่มทางเลือกจากข้อความ ${missing.length} รายการ — ไปกำหนดปลายทางที่ผังแตกสาย`);
  refreshOpenBranchTab();
  return missing.length;
}

// ───────── สแกนทั้งโปรเจกต์: [ข้อความ] ในฉาก → ทางเลือก ─────────
async function scanAllScenes(scenes, redraw) {
  const { parseMdFile } = await import('./md.js');
  const { confirmBox } = await import('./ui.js');
  const found = [];
  for (const sc of scenes) {
    if (!sc.filePath) continue;
    let body = '';
    try { body = parseMdFile(await kapi.readFile(sc.filePath)).body || ''; } catch { continue; }
    const { missing } = diffChoiceMarkers(scanChoiceMarkers(body), sc.choices || []);
    if (missing.length) found.push({ sc, missing });
  }
  if (!found.length) {
    setStatus('สแกนครบแล้ว — ทุก [ข้อความ] ในฉากถูกผูกเป็นทางเลือกหมดแล้ว');
    return 0;
  }
  const total = found.reduce((n, f) => n + f.missing.length, 0);
  const preview = found.slice(0, 8)
    .map((f) => `• ${f.sc.title}: ${f.missing.map((t) => '[' + t + ']').join(' ')}`).join('\n');
  const ok = await confirmBox(
    `พบทางเลือกในข้อความที่ยังไม่ผูก ${total} จุด จาก ${found.length} ฉาก\n\n${preview}` +
    (found.length > 8 ? `\n… และอีก ${found.length - 8} ฉาก` : '') +
    '\n\nผูกทั้งหมดเป็นทางเลือกเลยไหม (ปลายทางเว้นว่างไว้ก่อน) ?', 'ผูกทั้งหมด');
  if (!ok) return 0;
  for (const f of found) {
    await mutateChoices(f.sc, (list) => [...list, ...f.missing.map((t) => ({ text: t, nextSceneId: '' }))]);
  }
  setStatus(`ผูกทางเลือกจากข้อความ ${total} จุดแล้ว — กำหนดปลายทางต่อได้ที่แผงขวา`);
  redraw();
  return total;
}

// ───────── แผงเพิ่มทางเลือก ─────────
function buildAdder(graph, bs, redraw) {
  const adder = el('div', 'branch-adder');
  adder.append(el('span', 'dim', 'เพิ่มทางเลือก:'));
  const fromSel = el('select', 'k-dlg-select');
  const toSel = el('select', 'k-dlg-select');
  const none = el('option', null, '— ยังไม่ระบุ —'); none.value = ''; toSel.append(none);
  for (const s of graph.nodes) {
    const a = el('option', null, s.title); a.value = s.id; fromSel.append(a);
    const b = el('option', null, s.title); b.value = s.id; toSel.append(b);
  }
  if (bs.sel && graph.byId.has(bs.sel)) fromSel.value = bs.sel;   // เลือกโหนดไว้ = เติมให้เลย
  const textInp = el('input', 'k-dlg-input');
  textInp.placeholder = 'ข้อความทางเลือก เช่น "เปิดประตู"';
  const addB = el('button', 'k-ok', '+ เพิ่มทางเลือก');
  const doAdd = async () => {
    const from = graph.byId.get(fromSel.value);
    const text = textInp.value.trim();
    if (!from || !text) { setStatus('เลือกฉากและใส่ข้อความทางเลือกก่อน'); return; }
    await mutateChoices(from, (list) => [...list, { text, nextSceneId: toSel.value || '' }]);
    textInp.value = '';
    bs.sel = from.id;
    setStatus('เพิ่มทางเลือกแล้ว');
    redraw();
  };
  addB.onclick = doAdd;
  textInp.onkeydown = (e) => { if (e.key === 'Enter') doAdd(); };
  adder.append(fromSel, textInp, el('span', 'dim', '→'), toSel, addB);
  return adder;
}

// ───────── แผง inspector ด้านขวา ─────────
function buildInspector(graph, layout, analysis, bs, redraw) {
  const side = el('div', 'branch-side');
  const shead = el('div', 'branch-side-head');
  shead.append(el('span', null, '🎯 ทางเลือกของฉาก'));
  const closeB = el('span', 'branch-side-x', '✕');
  closeB.title = 'ซ่อนแผงนี้';
  closeB.onclick = () => { bs.sideOpen = false; redraw(); };
  shead.append(closeB);
  side.append(shead);

  const body = el('div', 'branch-side-body');
  side.append(body);

  const node = bs.sel ? graph.byId.get(bs.sel) : null;
  if (!node) {
    body.append(el('div', 'dim', analysis.total
      ? 'คลิกกล่องฉากบนผังเพื่อดู/แก้ทางเลือกของฉากนั้น'
      : 'ยังไม่มีฉากในผัง — เพิ่มทางเลือกให้ฉากสักฉากก่อน'));
    return side;
  }

  body.append(el('div', 'branch-side-title', node.title));
  body.append(el('div', 'dim', node.chapterName || '—'));

  // ปุ่มเปิดฉาก (ปกติ / คู่กับผัง)
  const acts = el('div', 'branch-side-acts');
  const openB = el('button', 'k-ok', '📄 เปิดฉาก');
  openB.onclick = () => openSceneFromGraph(node, false);
  const splitB = el('button', null, '⊞ เปิดคู่กับผัง');
  splitB.title = 'แยกหน้าจอ: ผังซ้าย ฉากขวา';
  splitB.onclick = () => openSceneFromGraph(node, true);
  acts.append(openB, splitB);
  body.append(acts);

  // ป้ายบอกบทบาทของฉากในผัง
  const roleWrap = el('div', 'branch-roles');
  if (analysis.roots.includes(node.id)) roleWrap.append(el('span', 'branch-badge bw-root', '▶ จุดเริ่ม'));
  if (analysis.endings.includes(node.id)) roleWrap.append(el('span', 'branch-badge bw-end', '🏁 ตอนจบ'));
  if (analysis.cycles.includes(node.id)) roleWrap.append(el('span', 'branch-badge bw-loop', '🔁 วนซ้ำ'));
  if (analysis.unreachable.includes(node.id)) roleWrap.append(el('span', 'branch-badge bw-lost', '🚫 เข้าไม่ถึง'));
  if (roleWrap.childNodes.length) body.append(roleWrap);

  // ---- ทางเลือกที่เขียนไว้ในเนื้อฉากจริง (ข้อ 15) ----
  // หัวใจของข้อนี้: ผังต้องผูกกับ "ข้อความในเอกสาร" ไม่ใช่ข้อมูลลอย ๆ ใน scenes.json
  const docSec = el('div', 'branch-doc');
  docSec.append(el('div', 'branch-side-sub', '🔗 ทางเลือกในเนื้อฉาก'));
  const docBody = el('div', 'branch-doc-body');
  docBody.append(el('div', 'dim', 'กำลังอ่านฉาก…'));
  docSec.append(docBody);
  body.append(docSec);
  readSceneBody(node).then((text) => {
    if (!docBody.isConnected) return;
    docBody.replaceChildren();
    const markers = scanChoiceMarkers(text);
    const { missing, orphan, linked } = diffChoiceMarkers(markers, node.choices);

    docBody.append(el('div', 'branch-doc-hint',
      'พิมพ์ [ข้อความ] ในฉากตรงจุดที่เรื่องแตกสาย เช่น [ไปตลาด] แล้วกดผูกที่นี่'));

    if (linked.length) {
      const okLine = el('div', 'branch-doc-ok', `✓ ผูกกับข้อความแล้ว ${linked.length} ทางเลือก`);
      okLine.title = linked.map((x) => '• ' + x).join('\n');
      docBody.append(okLine);
    }

    if (missing.length) {
      docBody.append(el('div', 'branch-doc-lbl', `พบในข้อความแต่ยังไม่เป็นทางเลือก (${missing.length})`));
      for (const txt of missing) {
        const row = el('div', 'branch-doc-row');
        row.append(el('span', 'branch-doc-mark', '[' + txt + ']'));
        const b = el('button', 'branch-doc-add', '＋ ผูกเป็นทางเลือก');
        b.onclick = async () => {
          await mutateChoices(node, (list) => [...list, { text: txt, nextSceneId: '' }]);
          setStatus('ผูก "' + txt + '" เป็นทางเลือกแล้ว');
          redraw();
        };
        row.append(b); docBody.append(row);
      }
      const all = el('button', 'k-tpl-add', `＋ ผูกทั้งหมด (${missing.length})`);
      all.onclick = async () => {
        await mutateChoices(node, (list) => [...list, ...missing.map((t) => ({ text: t, nextSceneId: '' }))]);
        setStatus('ผูกทางเลือกจากข้อความครบแล้ว');
        redraw();
      };
      docBody.append(all);
    }

    if (orphan.length) {
      docBody.append(el('div', 'branch-doc-lbl', `เป็นทางเลือกแต่ไม่มีข้อความในฉาก (${orphan.length})`));
      for (const txt of orphan) {
        const row = el('div', 'branch-doc-row branch-doc-orphan');
        row.append(el('span', 'branch-doc-mark', txt));
        const b = el('button', 'branch-doc-add', '↩ แทรก [' + txt + '] ลงฉาก');
        b.onclick = async () => {
          if (await insertMarkerIntoScene(node, txt)) { setStatus('แทรกลงท้ายฉากแล้ว'); redraw(); }
        };
        row.append(b); docBody.append(row);
      }
    }

    if (!missing.length && !orphan.length && !linked.length)
      docBody.append(el('div', 'dim', 'ฉากนี้ยังไม่มี [ข้อความ] ทางเลือกในเนื้อเรื่อง'));
  });

  // ---- รายการทางเลือก: แก้ข้อความ + เปลี่ยนปลายทาง + ลบ ----
  body.append(el('div', 'branch-side-sub', 'ทางเลือก (' + node.choices.length + ')'));
  if (!node.choices.length) body.append(el('div', 'dim', 'ฉากนี้ยังไม่มีทางเลือก — เป็นตอนจบสายหนึ่ง'));

  node.choices.forEach((c, idx) => {
    const row = el('div', 'branch-edit-row');
    const tIn = el('input', 'k-dlg-input branch-edit-text');
    tIn.value = c.text;
    tIn.placeholder = 'ข้อความทางเลือก';
    const commitText = async () => {
      const v = tIn.value.trim();
      if (v === c.text) return;
      await mutateChoices(node, (list) => {
        if (list[idx]) list[idx] = { ...list[idx], text: v };
        return list;
      });
      setStatus('แก้ข้อความทางเลือกแล้ว');
      redraw();
    };
    tIn.onblur = commitText;
    tIn.onkeydown = (e) => { if (e.key === 'Enter') tIn.blur(); };

    const tSel = el('select', 'k-dlg-select branch-edit-to');
    const none = el('option', null, '— ยังไม่ระบุ —'); none.value = ''; tSel.append(none);
    for (const s of graph.nodes) { const o = el('option', null, s.title); o.value = s.id; tSel.append(o); }
    tSel.value = graph.byId.has(c.nextSceneId) ? c.nextSceneId : '';
    tSel.onchange = async () => {
      await mutateChoices(node, (list) => {
        if (list[idx]) list[idx] = { ...list[idx], nextSceneId: tSel.value };
        return list;
      });
      setStatus('เปลี่ยนปลายทางแล้ว');
      redraw();
    };

    const goB = el('button', 'branch-edit-go', '➜');
    goB.title = 'เดินตามทางเลือกนี้ (บันทึกลงประวัติการตัดสินใจ)';
    goB.onclick = async () => {
      const target = graph.byId.get(c.nextSceneId);
      if (!target) { setStatus('ทางเลือกนี้ยังไม่ระบุปลายทาง'); return; }
      const { recordChoice } = await import('./player-choices.js');
      await recordChoice(node.id, node.title, c.text);
      bs.sel = target.id;
      openSceneFromGraph(target, false);
      redraw();
    };
    const delB = el('button', 'branch-edit-del', '✕');
    delB.title = 'ลบทางเลือกนี้';
    delB.onclick = async () => { await removeChoice(node, idx); redraw(); };

    row.append(tIn, tSel, goB, delB);
    body.append(row);
  });

  const addB = el('button', 'k-tpl-add', '+ เพิ่มทางเลือกให้ฉากนี้');
  addB.title = 'สร้างทางเลือกใหม่ พร้อมแทรก [ข้อความ] ลงท้ายฉากให้ด้วย';
  addB.onclick = async () => {
    const { ask } = await import('./ui.js');
    const txt = (await ask('ข้อความทางเลือก', { placeholder: 'เช่น ไปตลาด', okLabel: 'เพิ่ม' }) || '').trim();
    if (!txt) return;
    await mutateChoices(node, (list) => [...list, { text: txt, nextSceneId: '' }]);
    await insertMarkerIntoScene(node, txt);      // ผูกกับเนื้อเรื่องตั้งแต่แรก ไม่ปล่อยให้ลอย
    redraw();
  };
  body.append(addB);

  // ---- เส้นทางที่เป็นไปได้จากฉากนี้ ----
  const paths = enumeratePaths(graph, node.id, 12);
  if (paths.length) {
    body.append(el('div', 'branch-side-sub', `เส้นทางจากฉากนี้ (${paths.length}${paths.length >= 12 ? '+' : ''})`));
    for (const p of paths.slice(0, 8)) {
      const line = el('div', 'branch-path');
      line.textContent = p.map((id) => (graph.byId.get(id) || {}).title || '?').join(' → ');
      line.title = line.textContent;
      body.append(line);
    }
  }

  // ---- ประวัติการตัดสินใจที่ผ่านฉากนี้ (ข้อ 83) ----
  import('./player-choices.js').then(({ choicesByScene }) => {
    const hist = choicesByScene(node.id);
    if (!hist.length || !body.isConnected) return;
    body.append(el('div', 'branch-side-sub', `เคยเลือกที่ฉากนี้ (${hist.length})`));
    for (const h of hist.slice(-5).reverse()) {
      body.append(el('div', 'branch-path', '🎯 ' + (h.choice || '')));
    }
  }).catch(() => {});

  return side;
}
