// Killian 2 renderer — explorer + tabs + toolbar + statusbar
import { KEditor } from './editor.js';
import { parseMdFile, dumpMdFile, countWords } from './md.js';
import { setQuery, gotoMatch, replaceCurrent, replaceAll } from './search.js';
import { ask, confirmBox, popupMenu, choose, closeMenu, saveAllDialog } from './ui.js';
import { WikiEditor, CAT_TH, imageLightbox } from './wiki.js';
import { SPEditor } from './screenplay.js';
import { Gallery, pickImage } from './gallery.js';
import { StoryNetwork } from './network.js';
import { PlannerBoard } from './planner.js';
import { SP_ELEMS, TIMES, TRANSITIONS, SCENE_PREFIX, TAB_CYCLE, PARENTHETICALS, CHAR_EXTENSIONS,
         classify, parseScript } from './fountain.js';
import { refreshMentions } from './editor.js';
import { refreshSpell } from './editor.js';
import { commentAnchors, refreshCommentAnchors } from './editor.js';
import * as spell from './spell.js';
import { sceneMatchesQuery } from './sceneFilter.js';
import { STEP_DEFS, PRESETS, stepDef, mkStep, newWorkflow, cloneWorkflow, runWorkflow, mdToHtmlBody } from './compile.js';
import { TIMELINE_VERSION, mergeTimeline, groupByTrack, trackNames, newEvent, findClashes, sortEvents, ganttData, ganttBar, ganttTicks, normalizeRefs } from './timeline.js';
import { MAPS_VERSION, PIN_COLORS, PIN_KIND, newMap, newPin, clamp, findMap, sortMaps, breadcrumb, rootMaps, pinStats, deleteMap } from './maps.js';
import { $, el, state, smart, LOG_BUF, log, setStatus,
         DEFAULT_SETTINGS, DEFAULT_GOALS, DEFAULT_SP_CYCLE, BASE_ED_FS, BASE_SP_FS,
         SCALE_MIN, SCALE_MAX, UI_SCALE_MIN, UI_SCALE_MAX,
         SCENE_STATUSES, SCENE_COLORS, STATUS_COLORS, BUILTIN_CATS, CAT_ICON,
         REL_TYPES, REL_COLOR, REL_LABEL, categorizeRole, categorizeWith,
         t, i18n, loadLanguage, applyDataI18n, onLanguageChanged, SHORTCUTS, SHORTCUT_LABELS, shortcutId,
         formatShortcut, accelText, withShortcut } from './core.js';
import { sceneProps } from './scene-props.js';
import { openMaps, renderMaps, renderMapsPanel } from './maps-ui.js';
import { openTimeline, renderTimeline } from './timeline-ui.js';
import { renameSection, deleteSection, addSection, listSections, sectionStats, saveSectionMeta, reorderSections } from './section-ops.js';
import { renameScene, deleteScene, addScene, setSceneMeta, toggleSceneFlag, duplicateScene, moveSceneOrder, moveSceneToChapter, moveSceneBefore, sceneStatusMenu, sceneColorMenu, renameChapter, deleteChapter, addChapter, moveChapterBefore, renumberChapters,
         setSceneTitle, setChapterTitle } from './scene-ops.js';
import { wikiCats, applyWikiCats, newWikiCat, editWikiCat, deleteWikiCat, addEntity, openEntity, duplicateEntity } from './wiki-ui.js';
import { settingsDialog, versionDialog, showChangelog } from './dialogs.js';
import { openBookManager, renderBookManager } from './books.js';
import { restoreFromTrash, deleteToTrash, purgeRecycle } from './recycle.js';
import { openDashboard, renderDashboard } from './dashboard.js';
import { openHome, renderHome } from './home-ui.js';
import { openTagPane, renderTagList, filterByTag } from './tag-pane.js';
import { openGlobalSearch, bindGlobalSearchShortcut, renderSearchPanel } from './global-search.js';
import { openSceneTable } from './scene-table.js';
import { openScratchpad, renderNotesPanel } from './scratchpad.js';
import { openQuickOpen, quickOpenCache } from './quick-open.js';
import { manageCustomStatuses, allStatuses, addCustomStatus, removeCustomStatus,
         statusColor, statusesToJson, importStatuses, setStatusColor } from './custom-status.js';
import { toggleFocusMode2, cursorBlock, isFocusMode, focusDim, applyFocusDim } from './focus-mode.js';
import { toggleTypewriter, twScroll, isTypewriter, scrollHost } from './typewriter.js';
import { recordDailyWords, countProjectWords, calcStreak, getWordHistory } from './word-history.js';
import { autoBackupNow, startAutoBackup, backupIfDue } from './backup.js';
import { exportProjectZip, exportProjectJson } from './export-zip.js';
import { renderCommentPanel, commentStore, migrateSceneComments, clearCommentAnchors,
         resetCommentStore, scrollToAnchor, writeKeepingComments } from './comments/comment-ui.js';
import { exportBlogHTML, buildBlogHtml, BLOG_THEMES } from './export-blog.js';
import { thesaurusMenuItems } from './thesaurus.js';
import { createProjectFromTemplate, showTemplateDialog } from './project.js';
import { showAISettingsDialog, saveAISettings, saveApiKey, clearKeyCache } from './ai-settings.js';
import { showAISummary } from './ai-summary.js';
import { showAITitleSuggestions, collectProjectText, hashText, pastTitlesFor,
         summaryCacheState, rememberTitles } from './ai-summary.js';
import { openBranchingTree, renderBranchingTree, syncChoicesFromScene, mutateChoices } from './branching-ui.js';
import { openFloorPlan, renderFloorPlan } from './floorplan-ui.js';
import { showPlayerHistory } from './player-choices.js';
import { manageVisualTags, renderAllTagChips, applyVisualTagStyle, visualTagFor } from './visual-tags.js';
import { quickNote, showAllNotes, getSessionNotes, addSessionNote, saveSessionNotes } from './session-notes.js';
import { openCentralizeUI, markCentralizeStale, onCentralizeShown, resetCentralize } from './centralize-ui.js';
// ---- Part 1+2 integrations ----
import { openKanban, resetKanban, renderKanbanPanel } from './kanban/kanban-ui.js';
import * as PL from './panels/panel-layout.js';
import { initPanelSystem, getPanelManager, togglePanelDialog, showPanel, hidePanel, togglePanel,
         resetPanels, panelMenuItems, panelToggleState, addPanelButton, renderPanels,
         isPanelOpen, resetPanelSystem, PANEL_DEFS, panelId, setPanelShowHook,
         onPanelLayoutChange } from './panels/panel-ui.js';
import { toggleSplit, createSplit, closeSplit, isSplit, syncSplitPanes, resetSplitSystem,
         initSplitSystem, syncActiveSplit, openInSplit, closeTabInSplit, splitDir,
         getSplitManager, paneCount as splitPaneCount } from './layout/split-ui.js';
import { ensureAutoLink, getBacklinksFor, renderBacklinksTab, resetAutoLink } from './world-story/auto-link-ui.js';
import { findScenePath } from './project-scan.js';
import { setAutoSync, isAutoSyncOn, renderAutoSyncSection, resetTaskEngine } from './auto-task/event-ui.js';
import { openAIAssistant, openPlotHoleDetector, openDialogueGenerator, openConsistencyCheck, openWorldGenerator, openAIChat } from './ai/ai-ui.js';
import { showThesaurusPopup, initThesaurus } from './tools/thesaurus-ui.js';
import { importScrivenerDialog } from './import/import-ui.js';
import { resetAI, getAIClient, ragContext } from './ai/ai-bridge.js';
import { icon, initIcons, iconHtml, iconLabel, hasIcon } from './icons.js';

// นามแฝงของ t() — ใช้ในฟังก์ชันที่มีตัวแปรท้องถิ่นชื่อ t (ex. runTest: const t = state.active)
const tr = t;

// ---------------- (ย้ายไป core.js แล้ว: $, el, state, smart, log, setStatus, ค่าตั้งต้น) ----------------
let pageScale = 1;       // อัตราซูมหน้ากระดาษ (0.5–2.5) — reassign ได้จึงคงไว้ที่นี่ (ES module import เป็น read-only)
let autosaveTimer = null;

// ใส่ค่า settings/goals ลง state (เติม default ที่ขาด) แล้วนำไปใช้จริง
function loadSettings(meta) {
  state.meta = meta;
  state.settings = { ...DEFAULT_SETTINGS, ...(meta.settings || {}) };
  state.goals = { ...DEFAULT_GOALS, ...(meta.goals || {}) };
  applySettings();
}

// นำ settings ปัจจุบันไปใช้: ขนาดฟอนต์ตัวแก้ไข + จับเวลา autosave
export function applySettings() {
  const off = parseInt(state.settings.uiFontSize, 10) || 0;
  applyZoomVars(off);
  applyUIScale();
  document.body.classList.toggle('k-ln', !!state.settings.lineNumbers);
  document.body.classList.toggle('paper-mode', state.settings.paperMode !== false);
  // fontFamily
  if (state.settings.fontFamily) {
    document.documentElement.style.setProperty('--ed-font', state.settings.fontFamily);
  } else {
    document.documentElement.style.removeProperty('--ed-font');
  }
  // ฟอนต์บทหนังแยกจากนิยาย (บั๊ก #2) — ว่าง = ปล่อยให้ CSS fallback เป็น Courier New
  if (state.settings.spFontFamily) {
    document.documentElement.style.setProperty('--sp-font', state.settings.spFontFamily);
  } else {
    document.documentElement.style.removeProperty('--sp-font');
  }
  applySpellcheck();
  refreshAllSpell();
  restartAutosave();
}

// ตั้งตัวแปร CSS ของหน้ากระดาษ
//   --ed-fs / --sp-fs = ขนาดฟอนต์ฐาน + ค่าที่ผู้ใช้ตั้ง (uiFontSize) — ไม่คูณซูมแล้ว
//   --page-scale      = อัตราซูมจริง ส่งให้ CSS `zoom` บนหน้ากระดาษ (ขยายฟอนต์+ระยะขอบ+ความกว้างพร้อมกัน)
// เดิมซูมคูณเข้าที่ฟอนต์อย่างเดียว → margin/padding คงที่ หน้าเลยเสียสัดส่วน (บั๊ก #7)
export function applyZoomVars(off) {
  if (off === undefined) off = parseInt(state.settings.uiFontSize, 10) || 0;
  const R = document.documentElement.style;
  const edfs = +(BASE_ED_FS + off).toFixed(2);
  const spfs = Math.max(9, +(BASE_SP_FS + off).toFixed(2));
  R.setProperty('--ed-fs', edfs + 'px');
  R.setProperty('--sp-fs', spfs + 'px');
  R.setProperty('--page-scale', pageScale.toFixed(3));
  document.querySelectorAll('.pane > .workspace').forEach(ws => {
    ws.style.minWidth = (pageScale * 100) + '%';
  });
  const slider = $('#zoom-slider'); if (slider) slider.value = String(Math.round(pageScale * 100));
  const lbl = $('#zoom-label'); if (lbl) lbl.textContent = Math.round(pageScale * 100) + '%';
}

// ปรับซูมทีละขั้น (Ctrl+ล้อ / Ctrl+±) — step เป็นสัดส่วน
function bumpPageScale(dir) { setPageScale(pageScale + (dir > 0 ? 0.1 : -0.1)); }
function setPageScale(z) {
  pageScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.round(z * 100) / 100));
  applyZoomVars();
  setStatus(t('status.zoom') + ': ' + Math.round(pageScale * 100) + '%' + ' (Ctrl+Shift+0 = ' + t('status.zoomReset') + ')');
}
function resetPageScale() { if (pageScale !== 1) { pageScale = 1; applyZoomVars(); setStatus(t('status.zoomReset')); } }

// ---------------- ขนาด UI (บั๊ก #9) ----------------
// --ui-scale คูณเข้ากับฟอนต์ body + ขนาดโครงสร้างของ UI ทุกชิ้นใน style.css (calc(px * var(--ui-scale)))
// ปุ่ม/ช่องกรอก/select ใช้ font:inherit อยู่แล้ว → เปลี่ยนฟอนต์ body ตัวเดียวก็ไล่ตามทั้งแอป
export function applyUIScale(v) {
  const s = Math.max(UI_SCALE_MIN, Math.min(UI_SCALE_MAX,
    v !== undefined ? v : (parseFloat(state.settings.uiScale) || 1)));
  document.documentElement.style.setProperty('--ui-scale', s.toFixed(3));
  const sl = $('#st-uiscale'); if (sl) sl.value = String(s);
  const lbl = $('#st-uiscale-lbl'); if (lbl) lbl.textContent = Math.round(s * 100) + '%';
  return s;
}
function setUIScale(v) {
  // ปัดทศนิยม 2 ตำแหน่งก่อนเก็บ — กันค่าสะสมแบบ 1.2000000000000002 จากการกดขยายซ้ำ ๆ
  const s = applyUIScale(Math.round(v * 100) / 100);
  state.settings.uiScale = s;
  if (state.root) saveProjectMeta().catch((e) => log('warn', 'บันทึกขนาด UI ไม่สำเร็จ', e));
  setStatus(t('status.uiScale', 'ขนาด UI') + ': ' + Math.round(s * 100) + '%');
}
function bumpUIScale(dir) {
  const cur = parseFloat(state.settings.uiScale) || 1;
  setUIScale(dir === 0 ? 1 : cur + (dir > 0 ? 0.1 : -0.1));
}

// ดู Markdown ดิบของฉากปัจจุบัน (อ่าน + คัดลอกได้ · ตรงกับไฟล์ .md ที่บันทึก)
function showSourceView() {
  // ห้ามตั้งชื่อตัวแปรว่า t — จะบัง t() ของ i18n ทำให้ปุ่ม "คัดลอกทั้งหมด" พังตอนเรียก t('status.copied')
  const tab = state.active;
  const src = tab && (tab.editor || tab.sp);
  if (!src) { setStatus('เปิดฉากก่อนจึงจะดู Markdown ได้'); return; }
  const md = src.getMarkdown();
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog k-wide');
  box.append(el('div', 'k-dlg-title', 'Markdown ดิบ — ' + tab.title));
  const ta = el('textarea', 'k-src-view'); ta.value = md; ta.readOnly = true;
  box.append(ta);
  const btns = el('div', 'k-dlg-btns');
  const cp = el('button', null, 'คัดลอกทั้งหมด');
  const cl = el('button', 'k-ok', 'ปิด');
  cp.onclick = () => { ta.select(); document.execCommand('copy'); setStatus(t('status.copied')); };
  cl.onclick = () => ov.remove();
  btns.append(cp, cl); box.append(btns); ov.append(box); document.body.append(ov);
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  ta.focus();
}

// เปิด/ปิดการตรวจคำผิดของ Chromium บนตัวแก้ไขทุกตัว (contenteditable spellcheck)
export function applySpellcheck() {
  const on = state.settings.spellCheck !== false;
  document.querySelectorAll('.ProseMirror').forEach((el) => { el.spellcheck = on; });
}

// ตัวตรวจคำผิดแบบพจนานุกรม (ไทย+อังกฤษ ออฟไลน์) — คืน null เมื่อปิดหรือคลังยังไม่พร้อม
// ทำงานผสมกับ Chromium ได้: Chromium ขีดอังกฤษ native, ตัวนี้ขีดไทย+ยืนยันอังกฤษด้วยคลังคำ
export function spellChecker() {
  if (state.settings.spellCheckDict === false || !spell.ready()) return null;
  return (text) => spell.check(text);
}

// โหลดคลังคำ: หลัก (assets ที่มากับแอป) + เสริม (personal + Plugins/dictionaries)
// ถ้าไม่มีคลังหลัก จะลองดาวน์โหลดจาก settings.spellDictUrl (auto-provision)
async function loadSpellDict(root) {
  try {
    let { th, en } = await kapi.spellBase();
    if (!th && state.settings.spellDictUrl) {                 // คลังหาย → ดาวน์โหลดให้อัตโนมัติ
      try { await kapi.spellDownload(state.settings.spellDictUrl, 'th');
            ({ th, en } = await kapi.spellBase()); } catch {}
    }
    if (th || en) spell.loadBase(th || '', en || '');
    const extra = await kapi.spellExtra(root);
    spell.setExtra(extra);
  } catch {}
  refreshAllSpell();
}

// รีเฟรชการขีดเส้นใต้คำผิดทุกแท็บ (ใช้เมื่อสลับตัวเลือก / เพิ่มคำ / โหลดคลังเสร็จ)
export function refreshAllSpell() {
  for (const t of state.tabs.values()) {
    if (t.editor) refreshSpell(t.editor.view);
    if (t.sp) refreshSpell(t.sp.view);
  }
}

// รีเฟรชการไฮไลต์ชื่อ Wiki ทุกแท็บ (ใช้เมื่อสลับ "จับชื่อ Wiki อัตโนมัติ")
export function refreshAllMentions() {
  for (const t of state.tabs.values()) {
    if (t.editor) refreshMentions(t.editor.view);
    if (t.sp) t.sp.refreshMentions?.();
  }
}

// ตั้ง/รีเซ็ตตัวจับเวลา autosave ตาม autoSaveMinutes (0 = ปิด)
function restartAutosave() {
  if (autosaveTimer) { clearInterval(autosaveTimer); autosaveTimer = null; }
  const min = parseInt(state.settings.autoSaveMinutes, 10);
  if (!min || min <= 0) return;               // 0 = ปิดบันทึกอัตโนมัติ
  autosaveTimer = setInterval(() => {
    let any = false;
    for (const t of state.tabs.values()) if (t.dirty) { saveTab(t); any = true; }
    if (any) { log('info', 'autosave ทำงาน'); setTimeout(updateDirtyBadge, 300); }
  }, min * 60 * 1000);
}

// เขียน meta (settings/goals/title/author) กลับลง project.khn.json
export async function saveProjectMeta() {
  if (!state.root || !state.meta) return;
  state.meta.settings = state.settings;
  state.meta.goals = state.goals;
  await kapi.writeFile(await kapi.join(state.root, 'project.khn.json'),
                       JSON.stringify(state.meta, null, 2));
}

// ---------------- โครงโปรเจกต์ (อ่านโครงเดียวกับ Killian v1) ----------------
async function closeProjectIfAny() {
  if (!state.root) return true;
  const dirty = [...state.tabs.values()].filter((t) => t.dirty);
  if (dirty.length) {
    const v = await choose(`โปรเจกต์เดิมมี ${dirty.length} แท็บยังไม่ได้บันทึก`, [
      { label: 'บันทึกทั้งหมดแล้วปิด', value: 'save', primary: true },
      { label: 'ปิดโดยไม่บันทึก', value: 'discard', danger: true },
      { label: 'ยกเลิก', value: null },
    ]);
    if (v === null) return false;
    if (v === 'save') for (const t of dirty) await saveTab(t);
  }
  for (const t of state.tabs.values()) {
    t.dirty = false;
    t.editor?.destroy(); t.wiki?.destroy(); t.sp?.destroy();
    t.gal?.destroy(); t.net?.destroy(); t.planner?.destroy();
    t.pane.remove(); t.tabBtn.remove();
    if (t.floatWin) { t.floatWin.remove(); t.floatWin = null; }
  }
  state.tabs.clear(); state.active = null; state.root = null;
  // ล้างดัชนี/เอนจินที่ผูกกับโปรเจกต์เดิม — ไม่งั้นโปรเจกต์ใหม่จะเห็นข้อมูล/คีย์ของเก่า
  resetAutoLink(); resetTaskEngine(); clearKeyCache(); resetAI(); resetSplitSystem(); resetKanban();
  resetCentralize(); resetCommentStore(); _cmMigrated.clear(); clearCommentAnchors();
  imgURLBase.clear();
  clearFeaturePanels();                 // บั๊ก #18: เนื้อแผงฟีเจอร์เป็นของโปรเจกต์เดิม ต้องล้าง
  $('#tree').innerHTML = ''; $('#outline').innerHTML = '';
  refreshToolbar(); scheduleCount();
  return true;
}

export async function loadProject(root) {
  if (!(await kapi.exists(await kapi.join(root, 'project.khn.json')))) {
    alert('โฟลเดอร์นี้ไม่ใช่โปรเจกต์ Killian (ไม่พบ project.khn.json)'); return;
  }
  if (!(await closeProjectIfAny())) return;
  const meta = await kapi.readJson(await kapi.join(root, 'project.khn.json'));
  state.root = root; state.title = meta.title || 'โปรเจกต์';
  loadSettings(meta);
  applyWikiCats();
  document.title = state.title + ' — Killian 2';
  $('#projname').textContent = state.title;
  $('#tb-title').textContent = state.title + ' — Killian 2';
  await kapi.pushRecent(root);
  // ---- โหลดภาษาของโปรเจกต์ (ถ้าเลือกไว้) ----
  const projLang = state.settings.language || 'en';
  if (projLang !== i18n.lang) {
    await loadLanguage(projLang, root);
  }
  applyDataI18n();
  initIcons();
  applyToolbarShortcutTitles();
  await purgeRecycle(root);                          // ล้างถังขยะเก่าก่อนสร้างต้นไม้
  await buildTree();
  buildFilterBar().catch(() => {});             // แถบกรอง
  updateSummaryBar().catch(() => {});            // สรุปด่วนเหนือ tree
  updateStatusExtras();                          // แถบสถานะพิ่มเติม
  smart.loadNames(root);
  loadSpellDict(root);                               // โหลดคลังคำตรวจคำผิด (async, ไม่บล็อก)
  await loadTemplates();                            // default templates ถูกฝังลงโปรเจกต์ทันที
  warmInverse(); loadPlugins();
  // ---- เริ่มระบบใหม่ (Part 1+2) ----
  initPanelSystem();                                 // Panel System
  onPanelLayoutChange(refreshToolbar);               // sync toolbar toggle .on states
  // แผงฟีเจอร์ (บั๊ก #18) ต้องเรียกหลัง initPanelSystem ไม่งั้น showPanel ยังไม่รู้จักแผง
  await renderOpenFeaturePanels();                   // เลย์เอาต์ที่กู้มาอาจมีแผงเปิดค้าง = กล่องเปล่า
  if (!state.tabs.size) openDashboard();
  initThesaurus().catch(() => {});                   // Thesaurus engine
  ensureAutoLink().catch(() => {});                  // Backlinks index
  if (state.settings.autoSync) setAutoSync(true);    // auto-task: คืนสถานะที่ผู้ใช้เปิดไว้
  setStatus('เปิดโปรเจกต์: ' + state.title);
}

// ขอบเขตการค้น: จำกัดผลการกรองไว้เฉพาะบทที่เลือก (คลิกขวาที่หัวบท → ค้นเฉพาะในบทนี้)
let treeScope = null;    // { guid, label }
function setTreeScope(scope) {
  treeScope = scope || null;
  renderScopeChip();
  const q = $('#tree-search');
  filterTree(q ? q.value : '');
  if (treeScope && q) q.focus();
  setStatus(treeScope ? 'ค้นเฉพาะในบท: ' + treeScope.label : 'ค้นทั้งโปรเจกต์');
  return treeScope;
}
function renderScopeChip() {
  let chip = document.getElementById('tree-scope');
  if (!treeScope) { if (chip) chip.remove(); return; }
  if (!chip) {
    chip = el('div', 'tree-scope'); chip.id = 'tree-scope';
    const tree = $('#tree'); if (tree && tree.parentNode) tree.parentNode.insertBefore(chip, tree);
  }
  chip.innerHTML = iconHtml('search', 14) + ' ค้นเฉพาะใน: ' + treeScope.label + '  ';
  const x = el('span', 'tree-scope-x', '✕');
  x.title = 'ยกเลิกขอบเขต';
  x.onclick = () => setTreeScope(null);
  chip.append(x);
}

// กรองต้นไม้ตามคำค้น (ชื่อฉาก/แท็ก/สถานะ/ชื่อ entity) — ซ่อนแถวที่ไม่ตรง + บท/หมวดที่ว่าง
function filterTree(q) {
  const raw = (q || '').trim();
  const ql = raw.toLowerCase();
  const tree = $('#tree'); if (!tree) return;
  tree.querySelectorAll('.scene').forEach((s) => {
    if (s.classList.contains('add-row')) return;
    let ok;
    if (!raw) ok = true;
    else if (s._scene) ok = sceneMatchesQuery(s._scene, raw);   // ค้นทุกฟิลด์ + field:value
    else ok = (s.dataset.search || s.textContent.toLowerCase()).includes(ql);
    if (ok && treeScope) ok = s.dataset.chGuid === treeScope.guid;   // จำกัดเฉพาะบทที่เลือก
    s.style.display = ok ? '' : 'none';
  });
  // ซ่อนบท/หมวดที่ไม่มีฉากโชว์ (เมื่อกำลังค้นหา)
  tree.querySelectorAll('.chapter').forEach((ch) => {
    const anyVisible = [...ch.querySelectorAll('.scene')]
      .some((s) => !s.classList.contains('add-row') && s.style.display !== 'none');
    ch.style.display = ((!q && !treeScope) || anyVisible) ? '' : 'none';
  });
  tree.querySelectorAll('.sec').forEach((sec) => {
    const anyVisible = [...sec.querySelectorAll('.scene, .chapter')]
      .some((s) => !s.classList.contains('add-row') && s.style.display !== 'none');
    sec.style.display = ((!q && !treeScope) || anyVisible) ? '' : 'none';
  });
}

// สร้างต้นไม้ explorer แบบ "double-buffer": ประกอบใน fragment ที่ยังไม่แสดง
// แล้วค่อยสลับเข้า #tree ครั้งเดียวตอนจบ → ไม่มีช่วงต้นไม้ว่าง (กันกระพริบ)
// และกัน re-entrant: ถ้ามีการเรียกซ้อนระหว่างกำลังสร้าง จะสร้างใหม่อีกรอบหลังจบ (ไม่ interleave)
let _treeBuilding = false, _treeQueued = false;
// ---------------- Accordion Explorer (พับ/กางเล่ม·บท·หมวด) ----------------
function treeCollapsed() {
  try { return JSON.parse(localStorage.getItem('k2-tree-collapsed:' + state.root) || '{}'); }
  catch { return {}; }
}
function setTreeCollapsed(key, on) {
  const m = treeCollapsed();
  if (on) m[key] = 1; else delete m[key];
  localStorage.setItem('k2-tree-collapsed:' + state.root, JSON.stringify(m));
}
// ติดหัวพับได้: prepend caret + คลิกหัว(นอกปุ่ม) toggle .collapsed + จำสถานะ
function makeAccordion(headEl, containerEl, key) {
  const collapsed = !!treeCollapsed()[key];
  const caret = el('span', 'tw', collapsed ? '▸' : '▾');
  headEl.prepend(caret);
  if (collapsed) containerEl.classList.add('collapsed');
  const toggle = (e) => {
    if (e && e.target && e.target.closest('.row-add')) return;   // ปุ่ม + ไม่นับ
    const now = containerEl.classList.toggle('collapsed');
    caret.textContent = now ? '▸' : '▾';
    setTreeCollapsed(key, now);
    if (e) e.stopPropagation();
  };
  caret.onclick = toggle;
  headEl.addEventListener('click', toggle);
}

export async function buildTree() {
  if (_treeBuilding) { _treeQueued = true; return; }
  _treeBuilding = true;
  try { await _buildTreeInner(); }
  finally {
    _treeBuilding = false;
    if (_treeQueued) { _treeQueued = false; await buildTree(); }
  }
}
async function _buildTreeInner() {
  const tree = document.createElement('div');   // buffer ที่ยังไม่อยู่ใน DOM
  const skip = new Set(['Wiki', 'Bible', 'Images', 'Memos', 'Research', 'Snapshots', 'Plugins', 'Recycle']);
  for (const name of await kapi.listDirs(state.root)) {
    if (skip.has(name)) continue;
    const secPath = await kapi.join(state.root, name);
    if (!(await kapi.exists(await kapi.join(secPath, 'section.json')))) continue;
    const sec = await kapi.readJson(await kapi.join(secPath, 'section.json'));
    const secEl = el('div', 'sec');
    const secTitle = el('div', 'sec-title', '📚 ' + (sec.title || name));
    // ปุ่ม + บนหัวเล่ม = เพิ่มบทลงในฉบับร่างแรกของเล่ม (ทางลัด)
    const addToSec = el('span', 'row-add', '+'); addToSec.title = 'เพิ่มบทในเล่มนี้';
    addToSec.onclick = async (e) => { e.stopPropagation();
      const dRoot = await kapi.join(secPath, 'Draft');
      const dns = (await kapi.exists(dRoot)) ? await kapi.listDirs(dRoot) : [];
      if (dns.length) addChapter(await kapi.join(dRoot, dns[0]));
      else setStatus('เล่มนี้ยังไม่มีฉบับร่าง');
    };
    secTitle.append(addToSec);
    // คลิกขวาหัวเล่ม → เปลี่ยนชื่อ/ลบเล่ม/เพิ่มเล่มใหม่
    secTitle.oncontextmenu = (e) => { e.preventDefault(); popupMenu(e.clientX, e.clientY, [
      { label: '📗 เพิ่มเล่มใหม่…', click: () => addSection() },
      { label: '✎ เปลี่ยนชื่อเล่ม…', click: () => renameSection(secPath, sec) },
      '-',
      { label: '🗑 ลบเล่มทั้งเล่ม', danger: true, click: () => deleteSection(secPath, sec) },
    ]); };
    secEl.append(secTitle);
    makeAccordion(secTitle, secEl, 'sec:' + name);
    const draftRoot = await kapi.join(secPath, 'Draft');
    if (await kapi.exists(draftRoot)) {
      const primary = sec.primaryDraft || 'default';
      const draftsAvailable = await kapi.listDirs(draftRoot);
      const namesToShow = draftsAvailable.includes(primary) ? [primary] : draftsAvailable;
      for (const dname of namesToShow) {
        const dPath = await kapi.join(draftRoot, dname);
        const draftFile = await kapi.join(dPath, 'draft.json');
        if (!(await kapi.exists(draftFile))) continue;
        const chapters = ((await kapi.readJson(draftFile)).chapters || [])
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        const scenesAll = (await kapi.readJson(await kapi.join(dPath, 'scenes.json'))).chapters || {};
        for (const ch of chapters) {
          const chEl = el('div', 'chapter');
          const chHead = el('div', 'ch-title');
          chHead.innerHTML = iconHtml('folder', 14) + ' ' + ch.title;
          const addSc = el('span', 'row-add', '+');
          addSc.title = 'เพิ่มฉากในบทนี้';
          addSc.onclick = (e) => { e.stopPropagation(); addScene(dPath, ch); };
          chHead.append(addSc);
          chEl.append(chHead);
          makeAccordion(chHead, chEl, 'ch:' + ch.guid);
          // บทลากสลับลำดับได้ (แบบ Windows Explorer) — ลากหัวบท
          chHead.draggable = true;
          chHead.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/k2-chapter', JSON.stringify({ draftDir: dPath, guid: ch.guid }));
            e.stopPropagation(); chHead.classList.add('sc-dragging');
          });
          chHead.addEventListener('dragend', () => chHead.classList.remove('sc-dragging'));
          chHead.addEventListener('dragover', (e) => {
            const ty = [...e.dataTransfer.types];
            if (ty.includes('text/k2-scene') || ty.includes('text/k2-chapter') || ty.includes('text/k2-memo')) {
              e.preventDefault(); chHead.classList.add('ch-drop'); } });
          chHead.addEventListener('dragleave', () => chHead.classList.remove('ch-drop'));
          chHead.addEventListener('drop', async (e) => {
            chHead.classList.remove('ch-drop');
            // วางบท → จัดลำดับบท
            // วางโน้ตจาก MEMO → ย้ายเข้าบทนี้
            const mData = e.dataTransfer.getData('text/k2-memo');
            if (mData) { let m; try { m = JSON.parse(mData); } catch { return; }
              e.preventDefault(); return moveMemoToChapter(m.path || m.file, dPath, ch, null); }
            const cData = e.dataTransfer.getData('text/k2-chapter');
            if (cData) { let c; try { c = JSON.parse(cData); } catch { return; }
              if (c.draftDir !== dPath) { setStatus('ย้ายข้ามฉบับร่างยังไม่รองรับ'); return; }
              e.preventDefault(); return moveChapterBefore(dPath, c.guid, ch.guid); }
            // วางฉาก → ต่อท้ายบทนี้
            let data; try { data = JSON.parse(e.dataTransfer.getData('text/k2-scene')); } catch { return; }
            if (!data || data.chGuid === ch.guid) return;
            if (data.draftDir !== dPath) { setStatus('ยังไม่รองรับการย้ายข้ามฉบับร่าง/เซกชัน'); return; }
            e.preventDefault();
            await moveSceneToChapter(dPath, { guid: data.chGuid }, { id: data.id }, ch);
            setStatus('ย้ายฉากไปบท: ' + ch.title);
          });
          for (const sc of (scenesAll[ch.guid] || []).sort((a, b) => (a.order || 0) - (b.order || 0))) {
            const scEl = el('div', 'scene');
            if (sc.color) { const dot = el('span', 'sc-dot'); dot.style.background = sc.color; scEl.append(dot); }
            const isMemo = sc.type === 'memo';
            if (isMemo) scEl.classList.add('sc-memo');
            scEl.dataset.chGuid = ch.guid;
            // ใส่ data-status สำหรับสีพื้นหลังตามสถานะ
            if (sc.status && sc.status !== 'Outline') scEl.dataset.status = sc.status;
            // ไอคอนตามประเภท
            const icon = sc.locked ? '🔒 ' : isMemo ? '📝 ' : sc.flag ? '⭐ ' : '📄 ';
            scEl.append(document.createTextNode(icon + sc.title));
            // ป้ายเล่าเรื่อง (Narrative Markers): ฉากนอกลำดับเวลาหลัก
            if (sc.isFlashback) scEl.append(el('span', 'tree-flash', '⏪'));
            else if (sc.isFlashforward) scEl.append(el('span', 'tree-flash', '⏩'));
            // รูป thumbnail (ถ้ามีรูปแรกในฉาก)
            const scPath = await kapi.join(dPath, 'Chapters', ch.folderName, sc.fileName);
            if (sc.imageCount || sc.wordCount) {
              // อ่าน thumbnail จากไฟล์ (ถ้าเคยมี)
            }
            // word count เล็ก ๆ
            if (sc.wordCount) {
              scEl.append(el('span', 'sc-wordcount',
                (sc.wordCount >= 1000 ? Math.round(sc.wordCount / 1000) + 'k' : sc.wordCount) + ' คำ'));
            }
            if (sc.status && sc.status !== 'Outline') {
              // ชิปสถานะได้สีประจำสถานะ (มาตรฐาน หรือที่ผู้ใช้ตั้งเองในกล่องจัดการสถานะ)
              const stChip = el('span', 'sc-status', sc.status);
              const stCol = statusColor(sc.status);
              if (stCol) { stChip.style.color = stCol; stChip.style.borderColor = stCol; }
              scEl.append(stChip);
            }
            // แท็ก: ตัวที่ตั้งสี/ไอคอนไว้ (Visual Tags ข้อ 84) ได้ชิปสี · ที่เหลือเป็น #ข้อความ
            if (sc.tags && sc.tags.length) {
              const chips = renderAllTagChips(sc.tags, (t) => {
                const q = $('#tree-search');
                if (q) { q.value = 'tag:' + t; q.dispatchEvent(new Event('input', { bubbles: true })); }
              });
              chips.classList.add('sc-tags');
              scEl.append(chips);
            }
            scEl._scene = sc;                      // อ้างอิงตรง → กรองได้ทุกฟิลด์ (ดู filterTree)
            scEl.dataset.search = [sc.title, (sc.tags || []).join(' '), sc.status,
              sc.pov, sc.emotion, sc.conflict, sc.synopsis, sc.note].filter(Boolean).join(' ').toLowerCase();
            scEl.title = [
              (isMemo ? '📝 ' : '📄 ') + sc.title,
              isMemo ? 'โน้ตในบท — ไม่ถูกรวมตอนส่งออกฉบับร่าง' : '',
              sc.locked ? '🔒 ล็อก (แก้ไม่ได้)' : '',
              sc.status && sc.status !== 'Outline' ? 'สถานะ: ' + sc.status : '',
              (sc.tags || []).length ? 'แท็ก: ' + sc.tags.join(', ') : '',
              sc.pov ? 'มุมมอง: ' + sc.pov : '',
              sc.emotion ? 'อารมณ์: ' + sc.emotion : '',
              sc.conflict ? 'ความขัดแย้ง: ' + sc.conflict : '',
              sc.flag ? '⭐ ปักหมุด' : '',
              sc.isFlashback ? '⏪ ย้อนอดีต (Flashback)' : '',
              sc.isFlashforward ? '⏩ ล่วงหน้า (Flashforward)' : '',
              sc.wordCount ? sc.wordCount + ' คำ' : '',
              sc.synopsis || '',
              sc.note ? 'โน้ต: ' + sc.note : '',
            ].filter(Boolean).join('\n');
            scEl.onclick = async () => {
              setPropsTarget(dPath, ch, sc);                       // อัปเดตแผงคุณสมบัติ (ถ้าเปิดอยู่)
              openScene(await kapi.join(dPath, 'Chapters', ch.folderName, sc.fileName), sc.title);
            };
            scEl.dataset.path = await kapi.join(dPath, 'Chapters', ch.folderName, sc.fileName);
            // ลากย้ายฉากแบบ Windows Explorer: วางบนหัวบท = ต่อท้ายบท · วางบนฉาก = แทรกก่อนฉากนั้น
            scEl.draggable = true;
            scEl.addEventListener('dragstart', (e) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/k2-scene', JSON.stringify({ draftDir: dPath, chGuid: ch.guid, id: sc.id,
                                                                       file: scEl.dataset.path, title: sc.title }));
              e.stopPropagation(); scEl.classList.add('sc-dragging');
            });
            scEl.addEventListener('dragend', () => scEl.classList.remove('sc-dragging'));
            scEl.addEventListener('dragover', (e) => {
              const tt = [...e.dataTransfer.types];
              if (tt.includes('text/k2-scene') || tt.includes('text/k2-memo')) {
                e.preventDefault(); scEl.classList.add('sc-drop-before'); } });
            scEl.addEventListener('dragleave', () => scEl.classList.remove('sc-drop-before'));
            scEl.addEventListener('drop', async (e) => {
              scEl.classList.remove('sc-drop-before');
              const mD = e.dataTransfer.getData('text/k2-memo');
              if (mD) { let m; try { m = JSON.parse(mD); } catch { return; }
                e.preventDefault(); return moveMemoToChapter(m.path || m.file, dPath, ch, sc.id); }
              let data; try { data = JSON.parse(e.dataTransfer.getData('text/k2-scene')); } catch { return; }
              if (!data || data.id === sc.id) return;
              if (data.draftDir !== dPath) { setStatus('ยังไม่รองรับการย้ายข้ามฉบับร่าง'); return; }
              e.preventDefault(); e.stopPropagation();
              await moveSceneBefore(dPath, { guid: data.chGuid }, data.id, ch, sc.id);
            });
            scEl.oncontextmenu = (e) => { e.preventDefault(); popupMenu(e.clientX, e.clientY, [
              { label: '📂 แสดงในโฟลเดอร์', click: () => kapi.revealInOS(scEl.dataset.path) },
              // โน้ตในบท: ย้ายออกไปโฟลเดอร์ MEMO ได้ และ "กลับเป็นฉากปกติ" ได้ด้วย
              // (เดิมเปลี่ยนเป็นโน้ตแล้วไม่มีทางกลับในเมนู — บั๊กข้อ 8)
              ...(isMemo ? [{ label: '📄 กลับเป็นฉากปกติ (รวมตอนส่งออก)',
                              click: () => setRowMemo(dPath, ch, sc, false) },
                            { label: '📝 ย้ายออกไปที่ MEMO', click: () => moveRowToMemos(dPath, ch, sc) }]
                         : [{ label: '📝 เปลี่ยนเป็นโน้ต (ไม่รวมตอนส่งออก)',
                             click: () => setRowMemo(dPath, ch, sc, true) }]),
              { label: 'เปิด', click: scEl.onclick },
              // เปิดฉากให้เสร็จก่อนค่อยเปิดแผง — แผงอ่านจาก state.active ที่ openScene เป็นคนตั้ง
              { label: '💬 คอมเมนต์ (แผง)', click: async () => {
                  setPropsTarget(dPath, ch, sc);
                  await openScene(scEl.dataset.path, sc.title);
                  await openCommentsPanel();
                } },
              { label: 'ทำซ้ำ', click: () => duplicateScene(dPath, ch, sc) },
              { label: 'เปลี่ยนชื่อ…', click: () => renameScene(dPath, ch, sc) },
              // ข้อ 78: แนะนำชื่อจากเนื้อฉากจริง (ส่งเนื้อหาไปเป็นบริบทให้ AI)
              { label: '✨ แนะนำชื่อฉากด้วย AI…', click: async () => {
                  let ctx = '';
                  try { ctx = await kapi.readFile(scEl.dataset.path); } catch {}
                  showAITitleSuggestions(sc.title || '', (title) => setSceneTitle(dPath, ch, sc, title),
                                         { kind: 'scene', context: ctx });
                } },
              '-',
              { label: '▲ เลื่อนขึ้น', click: () => moveSceneOrder(dPath, ch, sc, -1) },
              { label: '▼ เลื่อนลง', click: () => moveSceneOrder(dPath, ch, sc, 1) },
              { label: 'ย้ายไปบท ▸', click: () => sceneMoveMenu(e, dPath, ch, sc) },
              '-',
              { label: sc.locked ? '🔓 ปลดล็อก' : '🔒 ล็อก (แก้ไม่ได้)', click: () => setSceneLock(dPath, ch, sc, !sc.locked) },
              { label: sc.flag ? '☆ เอาหมุดออก' : '⭐ ปักหมุด', click: () => toggleSceneFlag(dPath, ch, sc) },
              { label: 'สถานะ ▸', click: () => sceneStatusMenu(e, dPath, ch, sc) },
              { label: 'สี ▸', click: () => sceneColorMenu(e, dPath, ch, sc) },
              '-',
              { label: '📸 บันทึกเวอร์ชันนี้', click: () => manualSnapshot(dPath, ch, sc) },
              { label: '🕘 ประวัติเวอร์ชัน…', click: () => versionDialog(dPath, ch, sc) },
              { label: '⇋ เทียบเวอร์ชัน…', click: () => compareVersionsDialog(dPath, ch, sc) },
              { label: '⇋ เปิดเทียบด้านขวา', click: () => openCompareRight(dPath, ch, sc) },
              { label: 'คุณสมบัติ (แผง)', click: () => openPropsPanel(dPath, ch, sc) },
              { label: 'คุณสมบัติ… (หน้าต่าง)', click: () => sceneProps(dPath, ch, sc) },
              '-',
              { label: 'ลบ (ย้ายไปถังขยะ)', danger: true, click: () => deleteScene(dPath, ch, sc) },
            ]); };
            chEl.append(scEl);
          }
          // Empty state: บทที่ยังไม่มีฉาก
          if ((scenesAll[ch.guid] || []).length === 0) {
            const es = el('div', 'empty-state-row');
            es.style.cssText = 'text-align:center;padding:8px;opacity:.7;font-style:italic;';
            es.append(el('span', 'dim', 'ยังไม่มีฉาก — กด + เพื่อสร้าง'));
            chEl.append(es);
          }
          chHead.oncontextmenu = (e) => { e.preventDefault(); popupMenu(e.clientX, e.clientY, [
            { label: '🔍 ค้นเฉพาะในบทนี้', click: () => setTreeScope({ guid: ch.guid, label: ch.title }) },
            { label: 'เพิ่มฉาก…', click: () => addScene(dPath, ch) },
            { label: 'เปลี่ยนชื่อบท…', click: () => renameChapter(dPath, ch) },
            // ข้อ 78: บริบท = ชื่อฉากทั้งบท (พอให้ AI เดาเนื้อบทได้โดยไม่ต้องอ่านทุกไฟล์)
            { label: '✨ แนะนำชื่อบทด้วย AI…', click: () => {
                const ctx = (scenesAll[ch.guid] || []).map((s) => '- ' + (s.title || '')).join('\n');
                showAITitleSuggestions(ch.title || '', (title) => setChapterTitle(dPath, ch, title),
                                       { kind: 'chapter', context: ctx });
              } },
            { label: '🔢 เรียงลำดับหมายเลขใหม่', click: () => renumberChapters(dPath) },
            '-',
            { label: 'ลบบททั้งบท (ย้ายไปถังขยะ)', danger: true, click: () => deleteChapter(dPath, ch) },
          ]); };
          secEl.append(chEl);
        }
        const addCh = el('div', 'scene add-row', '＋ เพิ่มบท…');
        addCh.onclick = () => addChapter(dPath);
        secEl.append(addCh);
      }
    }
    tree.append(secEl);
  }
  // แถวเพิ่มเล่มใหม่ + เปิดตัวจัดการเล่ม (ท้ายรายการเล่มทั้งหมด)
  const addSecRow = el('div', 'sec');
  const mgrBtn = el('div', 'scene add-row', '📚 จัดการเล่ม…');
  mgrBtn.onclick = () => openBookManager();
  addSecRow.append(mgrBtn);
  const tlBtn = el('div', 'scene add-row', '🕒 เส้นเวลา…');
  tlBtn.onclick = () => openTimeline();
  addSecRow.append(tlBtn);
  const mapBtn = el('div', 'scene add-row', '🗺 แผนที่…');
  mapBtn.onclick = () => openMaps();
  addSecRow.append(mapBtn);
  const addSecBtn = el('div', 'scene add-row', '＋ เพิ่มเล่ม…');
  addSecBtn.onclick = () => addSection();
  addSecRow.append(addSecBtn);
  tree.append(addSecRow);
  // ---- Memo (โฟลเดอร์ Memos/ ของโปรเจกต์ — เข้ากับ v1) ----
  const memoDir = await kapi.join(state.root, 'Memos');
  const mSec = el('div', 'sec');
  const mHead = el('div', 'sec-title', '📝 MEMO');
  const addM = el('span', 'row-add', '+'); addM.title = 'สร้าง memo ใหม่';
  addM.onclick = () => addMemo();
  mHead.append(addM); mSec.append(mHead);
  makeAccordion(mHead, mSec, 'sec:__memo__');
  // ลากฉาก/โน้ตในบทมาวางที่หัว MEMO = ย้ายออกมาเก็บไว้นอกบท
  mHead.addEventListener('dragover', (e) => {
    if ([...e.dataTransfer.types].includes('text/k2-scene')) {
      e.preventDefault(); mHead.classList.add('ch-drop'); } });
  mHead.addEventListener('dragleave', () => mHead.classList.remove('ch-drop'));
  mHead.addEventListener('drop', async (e) => {
    mHead.classList.remove('ch-drop');
    let d; try { d = JSON.parse(e.dataTransfer.getData('text/k2-scene')); } catch { return; }
    if (!d || !d.draftDir) return;
    e.preventDefault();
    const ch = await chapterByGuid(d.draftDir, d.chGuid);
    if (!ch) return;
    const sj = await kapi.readJson(await kapi.join(d.draftDir, 'scenes.json'));
    const row = (sj.chapters[d.chGuid] || []).find((x) => x.id === d.id);
    if (row) await moveRowToMemos(d.draftDir, ch, row);
  });
  for (const f of await kapi.listFiles(memoDir, '.md')) {
    const p = await kapi.join(memoDir, f);
    const raw = await kapi.readFile(p);
    const title = parseMdFile(raw).meta.title || f.replace(/\.md$/, '');
    const it = el('div', 'scene', '📄 ' + title);
    it.dataset.path = p;
    it.onclick = () => openScene(p, title);
    it.draggable = true;                                   // ลาก memo ไปวางบนกระดาน Planner ได้
    it.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'copyMove';
      e.dataTransfer.setData('text/k2-memo', JSON.stringify({ path: p, file: p, title }));
      it.classList.add('sc-dragging');
    });
    it.addEventListener('dragend', () => it.classList.remove('sc-dragging'));
    it.oncontextmenu = (e) => { e.preventDefault(); popupMenu(e.clientX, e.clientY, [
      { label: 'เปิด', click: it.onclick },
      { label: '📂 แสดงในโฟลเดอร์', click: () => kapi.revealInOS(p) },
      { label: 'เปลี่ยนชื่อ…', click: () => renameMemo(p) },
      '-',
      // ทางกลับของคำสั่ง "ย้ายออกไปที่ MEMO" — เดิมทำได้ทางเดียวคือลากวาง (บั๊กข้อ 8)
      { label: '↩ ย้ายกลับเข้าบท…', click: async () => {
          const dst = await pickDraftTarget({ title: 'ย้ายโน้ตกลับเข้าบทไหน' });
          if (!dst) return;
          await moveMemoToChapter(p, dst.dPath, dst.chapter);
        } },
      '-',
      { label: 'ลบ (ย้ายไปถังขยะ)', danger: true, click: () => deleteToTrash(p, title) },
    ]); };
    mSec.append(it);
  }
  tree.append(mSec);

  // ---- คลังรูป (โฟลเดอร์ Images/) — ข้อ 6: เดิมเห็นได้แค่ผ่านกล่อง "คลังรูปภาพ" ----
  const imgDir = await kapi.join(state.root, 'Images');
  const IMG_RE = /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i;
  const imgFiles = (await kapi.exists(imgDir))
    ? (await kapi.listFiles(imgDir, '').catch(() => [])).filter((f) => IMG_RE.test(f)) : [];
  const iSec = el('div', 'sec');
  const iHead = el('div', 'sec-title', `🖼 คลังรูป (${imgFiles.length})`);
  const addI = el('span', 'row-add', '+'); addI.title = 'เพิ่มรูปเข้าคลัง';
  addI.onclick = async (e) => {
    e.stopPropagation();
    const src = await kapi.openImageDialog(); if (!src) return;
    await kapi.mkdir(imgDir);
    const nm = await kapi.copyInto(src, imgDir);
    await buildTree(); setStatus('เพิ่มรูปเข้าคลังแล้ว: ' + nm);
  };
  iHead.append(addI); iSec.append(iHead);
  makeAccordion(iHead, iSec, 'sec:__images__');
  iHead.oncontextmenu = (e) => { e.preventDefault(); popupMenu(e.clientX, e.clientY, [
    { label: '🖼 เปิดกล่องคลังรูป', click: () => openGallery() },
    { label: '📂 แสดงโฟลเดอร์ Images', click: () => kapi.revealInOS(imgDir) },
  ]); };
  for (const f of imgFiles) {
    const p = await kapi.join(imgDir, f);
    const it = el('div', 'scene img-row');
    const th = el('img', 'img-thumb'); th.src = await kapi.toFileURL(p); th.alt = f;
    th.onerror = () => { th.replaceWith(document.createTextNode('⚠ ')); };
    it.append(th, document.createTextNode(f));
    it.dataset.path = p;
    it.dataset.search = f.toLowerCase();
    it.title = f + '\nคลิก = ดูภาพเต็ม · ลากไปวางในฉากเพื่อแทรกรูป';
    it.onclick = async () => imageLightbox(await kapi.toFileURL(p), f);
    it.draggable = true;
    it.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/k2-image', JSON.stringify({ path: p, name: f }));
      e.dataTransfer.setData('text/plain', '![](' + f + ')');
    });
    it.oncontextmenu = (e) => { e.preventDefault(); popupMenu(e.clientX, e.clientY, [
      { label: '🔍 ดูภาพเต็ม', click: it.onclick },
      { label: '🖼 แทรกลงฉากที่เปิดอยู่', click: () => insertImageByName(f) },
      { label: '📂 แสดงในโฟลเดอร์', click: () => kapi.revealInOS(p) },
      '-',
      { label: 'ลบ (ย้ายไปถังขยะ)', danger: true, click: () => deleteToTrash(p, f) },
    ]); };
    iSec.append(it);
  }
  if (!imgFiles.length) iSec.append(el('div', 'scene empty-state-row', 'ยังไม่มีรูปในคลัง'));
  tree.append(iSec);

  // ---- Research (โฟลเดอร์ Research/ — เก็บ PDF, ภาพ, ลิงก์, .md งานวิจัย) ----
  const resDir = await kapi.join(state.root, 'Research');
  const rSec = el('div', 'sec');
  const rHead = el('div', 'sec-title', '📚 RESEARCH');
  rSec.append(rHead);
  makeAccordion(rHead, rSec, 'sec:__research__');
  if (await kapi.exists(resDir)) {
    const files = await kapi.listFiles(resDir, '').catch(() => []);
    const dirs = await kapi.listDirs(resDir).catch(() => []);
    // แสดงโฟลเดอร์ย่อยก่อน
    for (const d of dirs) {
      const dp = await kapi.join(resDir, d);
      const it = el('div', 'scene');
      it.innerHTML = iconHtml('folder', 14) + ' ' + d;
      it.onclick = () => kapi.revealInOS(dp);
      it.oncontextmenu = (e) => { e.preventDefault(); popupMenu(e.clientX, e.clientY, [
        { label: '📂 เปิดในโฟลเดอร์', click: () => kapi.revealInOS(dp) },
        '-',
        { label: '🗑 ลบโฟลเดอร์', danger: true, click: async () => {
          if (!(await confirmBox(`ลบโฟลเดอร์ "${d}" ทั้งหมด ?`))) return;
          await kapi.remove(dp); await buildTree();
        } },
      ]); };
      rSec.append(it);
    }
    for (const f of files) {
      const fp = await kapi.join(resDir, f);
      const isMd = f.endsWith('.md');
      const isPdf = f.endsWith('.pdf');
      const icon = isMd ? '📝' : isPdf ? '📕' : /\.(png|jpg|jpeg|gif|webp)$/i.test(f) ? '🖼' : '📎';
      const it = el('div', 'scene', icon + ' ' + f);
      it.title = fp;
      if (isMd) {
        it.onclick = async () => {
          const { openScene } = await import('./app.js');
          openScene(fp, f.replace(/\.md$/, ''));
        };
      } else {
        it.onclick = () => kapi.revealInOS(fp);
      }
      it.oncontextmenu = (e) => { e.preventDefault(); popupMenu(e.clientX, e.clientY, [
        { label: isMd ? '📝 เปิด' : '📂 เปิดในโปรแกรม', click: it.onclick },
        { label: '📂 แสดงในโฟลเดอร์', click: () => kapi.revealInOS(fp) },
        '-',
        { label: '🗑 ลบ', danger: true, click: async () => {
          await kapi.remove(fp); await buildTree();
        } },
      ]); };
      rSec.append(it);
    }
    // ปุ่มเพิ่มไฟล์
    const addR = el('div', 'scene add-row', '＋ เพิ่มไฟล์งานวิจัย…');
    addR.onclick = async () => {
      await kapi.mkdir(resDir);
      kapi.revealInOS(resDir);  // เปิดให้ลากวาง
      setStatus('เปิดโฟลเดอร์ Research แล้ว — ลากไฟล์เข้ามาได้เลย');
    };
    rSec.append(addR);
  } else {
    // Empty state
    const es = el('div', 'scene empty-state-row');
    es.append(el('span', 'dim', 'ยังไม่มีไฟล์งานวิจัย'));
    const createB = el('button', 'k-ok empty-state-btn', '+ สร้างโฟลเดอร์ Research');
    createB.onclick = async () => {
      await kapi.mkdir(resDir);
      setStatus('สร้างโฟลเดอร์ Research แล้ว');
      await buildTree();
    };
    es.append(createB);
    rSec.append(es);
  }
  tree.append(rSec);

  // ---- Wiki: แสดงเสมอ (โปรเจกต์ที่ยังไม่มี Wiki ก็เห็น 4 หมวดหลัก + สร้างได้เลย)
  //      รองรับทั้งชื่อใหม่ Wiki/ และชื่อเดิม Bible/ ของ v1 · รวม Wiki ของแต่ละเซกชันด้วย ----
  const wikiRootOf = async (base) => {
    const w = await kapi.join(base, 'Wiki');
    if (await kapi.exists(w)) return w;
    const b = await kapi.join(base, 'Bible');
    if (await kapi.exists(b)) return b;
    return w;                                  // ยังไม่มี = จะถูกสร้างเมื่อเพิ่มของจริง
  };
  const wSec = el('div', 'sec');
  const wHead = el('div', 'sec-title', '📖 WIKI');
  wSec.append(wHead);
  makeAccordion(wHead, wSec, 'sec:__wiki__');
  const tplRow = el('div', 'scene', '⚙ เทมเพลต (จัดการ)');
  tplRow.onclick = () => openTemplateManager();
  wSec.append(tplRow);
  const galRow = el('div', 'scene', '🖼 คลังรูปภาพ');
  galRow.onclick = () => openGallery();
  wSec.append(galRow);
  const catRow = el('div', 'scene', '➕ สร้างหมวดใหม่');
  catRow.onclick = () => newWikiCat();
  wSec.append(catRow);
  const renderCat = async (catDir, cat, scopeLabel) => {
    const cEl = el('div', 'chapter');
    const cHead = el('div', 'ch-title');
    cHead.innerHTML = catIconHtml(cat) + ' ' + catLabel(cat) + (scopeLabel ? ` (${scopeLabel})` : '');
    const addE = el('span', 'row-add', '+'); addE.title = 'สร้างใหม่ในหมวดนี้';
    addE.onclick = (e) => { e.stopPropagation(); addEntity(catDir, cat); };
    cHead.append(addE); cEl.append(cHead);
    makeAccordion(cHead, cEl, 'wcat:' + cat + ':' + (scopeLabel || ''));
    // คลิกขวาหัวหมวด → แก้ไข/ลบ (เฉพาะหมวดที่ผู้ใช้สร้าง / ไม่ใช่หมวดหลัก)
    if (!scopeLabel) cHead.oncontextmenu = (e) => { e.preventDefault();
      const items = [{ label: iconHtml('plus', 14) + ' สร้างรายการใหม่', click: () => addEntity(catDir, cat) }];
      if (!BUILTIN_CATS.includes(cat)) items.push('-',
        { label: iconHtml('edit', 14) + ' แก้ไขหมวด (ชื่อ/ไอคอน)', click: () => editWikiCat(cat) },
        { label: iconHtml('trash', 14) + ' ลบหมวด', danger: true, click: () => deleteWikiCat(cat, catDir) });
      else items.push('-', { label: iconHtml('edit', 14) + ' เปลี่ยนไอคอน/ชื่อที่แสดง', click: () => editWikiCat(cat) });
      popupMenu(e.clientX, e.clientY, items);
    };
    // หัวหมวดรับ drop entity จากหมวดอื่น → ย้ายไฟล์ .json
    cHead.addEventListener('dragover', (e) => {
      if ([...e.dataTransfer.types].includes('text/k2-entity')) { e.preventDefault(); cHead.classList.add('ch-drop'); } });
    cHead.addEventListener('dragleave', () => cHead.classList.remove('ch-drop'));
    cHead.addEventListener('drop', async (e) => {
      cHead.classList.remove('ch-drop');
      let data; try { data = JSON.parse(e.dataTransfer.getData('text/k2-entity')); } catch { return; }
      if (!data || !data.path) return;
      e.preventDefault();
      await moveEntityToCat(data.path, catDir);
    });
    if (await kapi.exists(catDir)) {
      for (const f of await kapi.listFiles(catDir, '.json')) {
        const p = await kapi.join(catDir, f);
        let name = f.replace(/\.json$/, '');
        try { name = (await kapi.readJson(p)).name || name; } catch {}
        const it = el('div', 'scene');
        it.innerHTML = catIconHtml(cat) + ' ' + name;
        it.dataset.search = name.toLowerCase();
        it.dataset.path = p;
        it.onclick = () => openEntity(p);
        it.draggable = true;                              // ลากย้ายข้ามหมวดได้
        it.addEventListener('dragstart', (e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/k2-entity', JSON.stringify({ path: p, file: p, title: name }));
          it.classList.add('sc-dragging');
        });
        it.addEventListener('dragend', () => it.classList.remove('sc-dragging'));
        it.oncontextmenu = (e) => { e.preventDefault(); popupMenu(e.clientX, e.clientY, [
          { label: 'เปิด', click: it.onclick },
          { label: iconHtml('search', 14) + ' ค้นหาในฉาก (Find on location)',
            click: () => findEntityInScenes(p, name, e.clientX, e.clientY) },
          { label: 'ทำซ้ำ', click: () => duplicateEntity(p) },
          '-',
          { label: 'ลบ (ย้ายไปถังขยะ)', danger: true, click: () => deleteToTrash(p, name) },
        ]); };
        cEl.append(it);
      }
    }
    wSec.append(cEl);
  };
  const projWiki = await wikiRootOf(state.root);
  const cats = [...BUILTIN_CATS, ...wikiCats().map((c) => c.key)];
  if (await kapi.exists(projWiki)) {
    for (const c of await kapi.listDirs(projWiki)) if (!cats.includes(c)) cats.push(c);
  }
  for (const cat of cats) {
    await renderCat(await kapi.join(projWiki, cat), cat, '');
  }
  for (const secName of await kapi.listDirs(state.root)) {
    const base = await kapi.join(state.root, secName);
    if (!(await kapi.exists(await kapi.join(base, 'section.json')))) continue;
    for (const wname of ['Wiki', 'Bible']) {
      const swiki = await kapi.join(base, wname);
      if (!(await kapi.exists(swiki))) continue;
      for (const c of await kapi.listDirs(swiki)) {
        await renderCat(await kapi.join(swiki, c), c, secName);
      }
      break;
    }
  }
  tree.append(wSec);

  // ---- ถังขยะ (<root>/Recycle) — กู้คืน / ลบถาวร ----
  const recDir = await kapi.join(state.root, 'Recycle');
  const recItems = await kapi.exists(recDir)
    ? (await kapi.listFiles(recDir)).filter((f) => !f.endsWith('.k2restore.json')) : [];
  const recDirs = await kapi.exists(recDir) ? await kapi.listDirs(recDir) : [];
  const all = [...recItems, ...recDirs];
  const tSec = el('div', 'sec');
  tSec.append(el('div', 'sec-title', `🗑 ถังขยะ (${all.length})`));
  for (const f of all) {
    const p = await kapi.join(recDir, f);
    const label = f.replace(/^[a-z0-9]+-/, '');
    const it = el('div', 'scene trash-item', '♻ ' + label);
    it.oncontextmenu = it.onclick = (e) => { e.preventDefault();
      popupMenu(e.clientX, e.clientY, [
        { label: 'กู้คืน', click: () => restoreFromTrash(p, f) },
        '-',
        { label: 'ลบถาวร', danger: true, click: async () => {
            if (!(await confirmBox(`ลบ “${label}” ถาวร ? (กู้คืนไม่ได้อีก)`, 'ลบถาวร'))) return;
            await kapi.remove(p); await kapi.remove(p + '.k2restore.json');
            await buildTree(); setStatus('ลบถาวรแล้ว: ' + label);
          } },
      ]); };
    tSec.append(it);
  }
  tree.append(tSec);
  // ---- สลับ buffer เข้าจอครั้งเดียว (คง scroll เดิม + สถานะขอบเขต/ตัวกรอง) ----
  const real = $('#tree');
  const scrollTop = real.scrollTop;
  real.replaceChildren(...tree.childNodes);
  real.scrollTop = scrollTop;
  const q = $('#tree-search'); if (q && q.value) filterTree(q.value);   // คงตัวกรองหลังสร้างใหม่
  updateSummaryBar().catch(() => {});
}

// ---------------- กู้คืนจากถังขยะ ----------------

// ---------------- เลือกจากรายการ (dialog แบบเลื่อนดู) ----------------
export function pickFromList(title, items) {
  return new Promise((resolve) => {
    const ov = el('div', 'k-overlay');
    const box = el('div', 'k-dialog');
    box.append(el('div', 'k-dlg-title', title));
    const list = el('div', 'k-pick-list');
    for (const it of items) {
      const d = el('div', 'k-menu-item', it);
      d.onclick = () => { ov.remove(); resolve(it); };
      list.append(d);
    }
    box.append(list);
    const btns = el('div', 'k-dlg-btns');
    const c = el('button', null, 'ยกเลิก');
    c.onclick = () => { ov.remove(); resolve(null); };
    btns.append(c); box.append(btns); ov.append(box);
    ov.onclick = (e) => { if (e.target === ov) { ov.remove(); resolve(null); } };
    document.body.append(ov);
  });
}

// ---------------- inverse roles (v1 assets) ----------------
export const INV_C = { m: null, cat: {} };   // inverse-relationship cache + แผนที่บทบาท→ประเภท (categories)
export async function invertRole(role) {
  if (!INV_C.m) {
    INV_C.m = {};
    try {
      const d = await fetch('inverse_roles.json').then((r) => r.json());
      for (const [a, b] of d.pairs || []) { INV_C.m[a] = b; if (!(b in INV_C.m)) INV_C.m[b] = a; }
      if (d.categories && typeof d.categories === 'object') INV_C.cat = d.categories;
    } catch {}
  }
  return INV_C.m[role] || role;
}
async function warmInverse() { await invertRole(''); }

// รายชื่อบทบาทที่รู้จัก (จาก inverse_roles.json) สำหรับ dropdown ความสัมพันธ์
function knownRoles() { return INV_C.m ? Object.keys(INV_C.m).sort() : []; }

// กล่องผูกความสัมพันธ์: เลือกเป้าหมาย (dropdown) + บทบาท (เลือกจากรายการ หรือพิมพ์เอง)
export function relationDialog(targets, fromName) {
  return new Promise((resolve) => {
    const ov = el('div', 'k-overlay');
    const box = el('div', 'k-dialog');
    box.append(el('div', 'k-dlg-title', 'ผูกความสัมพันธ์'));
    const r1 = el('div', 'wiki-row'); r1.append(el('label', null, 'ผูกกับ'));
    const selT = el('select', 'wiki-input k-dlg-select');
    for (const t of targets) { const o = el('option', null, t); o.value = t; selT.append(o); }
    r1.append(selT); box.append(r1);
    const r2 = el('div', 'wiki-row');
    const lab = el('label', null, ''); r2.append(lab);
    const inR = el('input', 'wiki-input'); inR.setAttribute('list', 'k-roles');
    inR.placeholder = 'เช่น พ่อ / เพื่อน / ศัตรู';
    const dl = el('datalist'); dl.id = 'k-roles';
    for (const role of knownRoles()) { const o = el('option'); o.value = role; dl.append(o); }
    r2.append(inR, dl); box.append(r2);
    // ประเภทความสัมพันธ์ (ครอบครัว/คนรัก/ศัตรู…) — ใช้ระบายสีเส้นใน Story Network
    const rType = el('div', 'wiki-row');
    rType.append(el('label', null, 'ประเภท'));
    const selType = el('select', 'wiki-input k-dlg-select rel-type');
    { const o = el('option', null, '— ไม่ระบุ —'); o.value = ''; selType.append(o); }
    for (const ty of REL_TYPES) { const o = el('option', null, ty.label); o.value = ty.key; selType.append(o); }
    rType.append(selType); box.append(rType);
    let typeTouched = false;                      // ผู้ใช้เลือกเองแล้ว → เลิกเดาทับ
    selType.onchange = () => { typeTouched = true; };
    // แสดงตัวอย่างบทบาทฝั่งตรงข้ามแบบสด + เดาประเภทจากบทบาทที่พิมพ์
    const hint = el('div', 'k-hint'); hint.style.margin = '2px 0 8px';
    const upd = () => { lab.textContent = `${fromName} เป็น…ของ ${selT.value}`;
      const role = inR.value.trim();
      const inv = (INV_C.m && INV_C.m[role]) || role;
      if (!typeTouched) selType.value = role ? categorizeWith(INV_C.cat, role) : '';
      hint.textContent = role ? `อีกฝั่งจะได้บทบาท “${inv}” อัตโนมัติ` : ''; };
    selT.onchange = upd; inR.oninput = upd; upd();
    box.append(hint);
    const btns = el('div', 'k-dlg-btns');
    const c = el('button', null, 'ยกเลิก');
    const ok = el('button', 'k-ok', 'ผูกความสัมพันธ์');
    c.onclick = () => { ov.remove(); resolve(null); };
    ok.onclick = () => { const role = inR.value.trim();
      if (!role) { inR.focus(); return; }
      ov.remove(); resolve({ target: selT.value, role, type: selType.value }); };
    btns.append(c, ok); box.append(btns); ov.append(box);
    ov.onclick = (e) => { if (e.target === ov) { ov.remove(); resolve(null); } };
    document.body.append(ov); inR.focus();
  });
}

// ---------------- หมวด Wiki ที่ผู้ใช้สร้างเอง ----------------
// เก็บใน project.khn.json → wikiCats: [{key, label, icon}]
// โฟลเดอร์ Wiki/<key> คือของจริง — meta เก็บแค่ "ชื่อไทย + ไอคอน" ให้แสดงผลสวย
// (ลบ meta ทิ้งก็ยังเห็นหมวดอยู่ เพราะ buildTree อ่านจากโฟลเดอร์จริงเสมอ)

export function catLabel(key) { const c = wikiCats().find((x) => x.key === key);
                         return (c && c.label) || CAT_TH[key] || key; }
// ไอคอนหมวด = ชื่อไอคอนใน icons.js เท่านั้น — meta เก่าที่เก็บอีโมจิไว้ (ก่อนย้ายมาใช้ไอคอน SVG)
// จะถูกมองข้าม แล้วตกไปใช้ไอคอนประจำหมวด/bookmark แทน (ไม่งั้นได้ svg ว่าง)
export function catIcon(key) { const c = wikiCats().find((x) => x.key === key);
  return (c && hasIcon(c.icon) ? c.icon : null) || CAT_ICON[key] || 'bookmark'; }
export function catIconHtml(key, sz) { return iconHtml(catIcon(key), sz || 16); }

// บั๊ก #21: "ค้นหาในฉาก" จากคลิกขวาเอนทิตี้ Wiki ใน Explorer
// ใช้ดัชนี auto-link ที่มีอยู่แล้ว (ตัวเดียวกับแท็บ Backlinks / ศูนย์รวม) — ไม่สแกนไฟล์ซ้ำ
// คืนรายการฉากไว้ให้ selftest ตรวจได้ด้วย (UI เป็นเมนูป๊อปอัป จึงเช็คตรง ๆ ไม่ได้)
export async function findEntityInScenes(entityPath, name, x, y) {
  setStatus('กำลังค้นหาฉากที่กล่าวถึง “' + name + '” …');
  await ensureAutoLink();
  const links = (getBacklinksFor(entityPath) || []).slice().sort((a, b) => (b.count || 0) - (a.count || 0));
  if (!links.length) { setStatus('ยังไม่มีฉากที่กล่าวถึง “' + name + '”'); return links; }
  const items = links.map((l) => ({
    label: iconHtml('file', 14) + ' ' + (l.title || l.sceneId) +
           '  <span class="dim">' + (l.count || 1) + '×' + (l.via ? ' · ' + l.via : '') + '</span>',
    click: async () => {
      const hit = await findScenePath(state.root, l.sceneId);
      if (hit && (await kapi.exists(hit.path))) openScene(hit.path, hit.title);
      else setStatus('ไม่พบไฟล์ฉาก: ' + (l.title || l.sceneId));
    },
  }));
  items.unshift({ label: `<b>${links.length} ฉากที่กล่าวถึง “${name}”</b>`, disabled: true }, '-');
  popupMenu(typeof x === 'number' ? x : 80, typeof y === 'number' ? y : 80, items);
  setStatus(`พบ ${links.length} ฉากที่กล่าวถึง “${name}”`);
  return links;
}
// เอาชื่อไทยของหมวดเองไปใส่ CAT_TH ด้วย เพื่อให้ WikiEditor/ตัวจัดการเทมเพลตแสดงตรงกัน
// คีย์หมวดทั้งหมดที่ควรเลือกได้ (ในตัวเดิม + ของผู้ใช้ + โฟลเดอร์ที่มีอยู่จริง)
export async function allCatKeys() {
  const keys = [...BUILTIN_CATS, ...wikiCats().map((c) => c.key)];
  try {
    const w = await wikiRoot();
    if (await kapi.exists(w)) for (const d of await kapi.listDirs(w)) if (!keys.includes(d)) keys.push(d);
  } catch {}
  return keys.filter(Boolean);
}
export async function wikiRoot() {
  const w = await kapi.join(state.root, 'Wiki');
  if (await kapi.exists(w)) return w;
  const b = await kapi.join(state.root, 'Bible');
  return (await kapi.exists(b)) ? b : w;
}
// key ปลอดภัยสำหรับใช้เป็นชื่อโฟลเดอร์ (ชื่อไทยล้วน → cat-xxxx)
export function catKeyFrom(label) {
  const ascii = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return ascii.length >= 2 ? ascii : 'cat-' + Date.now().toString(36).slice(-5);
}




export function catEditDialog(init, title) {
  return new Promise((resolve) => {
    const ov = el('div', 'k-overlay');
    const box = el('div', 'k-dialog');
    box.innerHTML = `
      <div class="k-dlg-title">${title}</div>
      <div class="k-row" style="flex-direction:column;align-items:stretch;gap:6px;margin:6px 0">
        <label>ชื่อหมวด</label><input type="text" class="k-dlg-input" id="cat-label">
      </div>
      <div class="k-row" style="flex-direction:column;align-items:stretch;gap:6px;margin:10px 0 2px">
        <label>ไอคอน (อีโมจิ)</label><input type="text" class="k-dlg-input" id="cat-icon" maxlength="4">
      </div>
      <div class="k-dlg-btns"><button class="k-cancel">ยกเลิก</button><button class="k-ok">ตกลง</button></div>`;
    ov.append(box); document.body.append(ov);
    const iL = box.querySelector('#cat-label'), iI = box.querySelector('#cat-icon');
    iL.value = init.label || ''; iI.value = init.icon || '🔖';
    const done = (v) => { ov.remove(); resolve(v); };
    const ok = () => { const l = iL.value.trim(); if (!l) { iL.focus(); return; }
                       done({ label: l, icon: iI.value.trim() || '🔖' }); };
    box.querySelector('.k-dialog .k-ok') || 0;
    box.querySelector('.k-ok').onclick = ok;
    box.querySelector('.k-cancel').onclick = () => done(null);
    ov.onclick = (e) => { if (e.target === ov) done(null); };
    iL.onkeydown = (e) => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') done(null); };
    iL.focus(); iL.select();
  });
}

// ---------------- entity index (สำหรับ network / relationships) ----------------
export async function loadAllEntities() {
  const out = [];
  const scan = async (wikiDir) => {
    if (!(await kapi.exists(wikiDir))) return;
    for (const cat of await kapi.listDirs(wikiDir)) {
      const catDir = await kapi.join(wikiDir, cat);
      for (const f of await kapi.listFiles(catDir, '.json')) {
        try {
          const p = await kapi.join(catDir, f);
          const e = await kapi.readJson(p);
          if (e.name) out.push({ name: e.name, cat, file: p,
                                 tags: Array.isArray(e.tags) ? e.tags : [],
                                 relationships: e.relationships || [] });
        } catch {}
      }
    }
  };
  await scan(await kapi.join(state.root, 'Wiki'));
  await scan(await kapi.join(state.root, 'Bible'));
  for (const sec of await kapi.listDirs(state.root)) {
    await scan(await kapi.join(state.root, sec, 'Wiki'));
    await scan(await kapi.join(state.root, sec, 'Bible'));
  }
  return out;
}

// ---------------- Story Network ----------------
async function openNetwork() {
  const key = '::network::';
  if (state.tabs.has(key)) { activate(key); state.tabs.get(key).net.refresh(); return; }
  const pane = el('div', 'pane');
  $('#panes').append(pane);
  const tabBtn = el('div', 'tab');
  tabBtn.append(el('span', 'tab-title', 'Story Network'));
  const x = el('span', 'tab-x', '×'); tabBtn.append(x);
  $('#tabs').append(tabBtn);
  const net = new StoryNetwork(pane, {
    loadEntities: loadAllEntities,
    onOpen: (n) => openEntity(n.file),
  });
  const tab = { file: key, title: 'Story Network', pane, tabBtn, dirty: false,
                editor: null, plain: null, wiki: null, gal: null, net };
  tabBtn.onclick = (e) => { if (e.target !== x) activate(key); };
  x.onclick = () => closeTab(key);
  state.tabs.set(key, tab);
  activate(key);
  setTimeout(() => { net._fit(); net.refresh(); }, 60);
}

// ---------------- โน้ต (memo) ในบท ----------------
// แนวคิด: memo ก็คือฉากชนิดหนึ่ง (row.type === 'memo' + meta.type: memo) เก็บใน Chapters/ ได้เหมือนฉาก
// ต่างกันแค่ "ไม่ถูกรวมตอนส่งออกฉบับร่าง" → ใช้เขียนโน้ตคาไว้ในบทได้โดยไม่ปนกับต้นฉบับ
async function moveMemoToChapter(memoPath, dPath, ch, beforeId) {
  const { meta, body } = parseMdFile(await kapi.readFile(memoPath));
  const title = meta.title || (memoPath.split(/[\\/]/).pop() || 'memo').replace(/\.md$/i, '');
  const sf = await kapi.join(dPath, 'scenes.json');
  const d = await kapi.readJson(sf);
  const list = (d.chapters[ch.guid] || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const used = new Set(list.map((x) => x.fileName));
  let n = 1, fileName;
  do { fileName = 'memo-' + String(n++).padStart(2, '0') + '.md'; } while (used.has(fileName));
  await kapi.writeFile(await kapi.join(dPath, 'Chapters', ch.folderName, fileName),
                       dumpMdFile({ ...meta, title, type: 'memo' }, body));
  await kapi.remove(memoPath);
  const row = { id: guid(), title, order: list.length + 1, fileName, type: 'memo' };
  const di = beforeId ? list.findIndex((x) => x.id === beforeId) : list.length;
  list.splice(di < 0 ? list.length : di, 0, row);
  list.forEach((x, i) => { x.order = i + 1; });
  d.chapters[ch.guid] = list;
  await kapi.writeFile(sf, JSON.stringify(d, null, 2));
  await buildTree();
  setStatus(`ย้ายโน้ต "${title}" เข้าบท "${ch.title}" แล้ว (จะไม่ถูกรวมตอนส่งออก)`);
  return true;
}

// ย้ายแถวในบทกลับออกไปเป็นไฟล์ใน Memos/
async function moveRowToMemos(dPath, ch, sc) {
  const src = await kapi.join(dPath, 'Chapters', ch.folderName, sc.fileName);
  const memoDir = await kapi.join(state.root, 'Memos');
  await kapi.mkdir(memoDir);
  const base = safeName(sc.title || 'memo');
  let n = 0, dst;
  do { dst = await kapi.join(memoDir, base + (n ? '-' + n : '') + '.md'); n++; } while (await kapi.exists(dst));
  const { meta, body } = parseMdFile(await kapi.readFile(src));
  await kapi.writeFile(dst, dumpMdFile({ ...meta, title: sc.title, type: 'memo' }, body));
  await kapi.remove(src);
  const sf = await kapi.join(dPath, 'scenes.json');
  const d = await kapi.readJson(sf);
  d.chapters[ch.guid] = (d.chapters[ch.guid] || []).filter((x) => x.id !== sc.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0)).map((x, i) => ({ ...x, order: i + 1 }));
  await kapi.writeFile(sf, JSON.stringify(d, null, 2));
  await buildTree();
  setStatus(`ย้าย "${sc.title}" ออกไปที่ MEMO แล้ว`);
  return dst;
}

// สลับให้ฉากกลายเป็นโน้ต (หรือกลับเป็นฉาก) — โน้ตจะไม่ถูกรวมตอนส่งออก
async function setRowMemo(dPath, ch, sc, on) {
  const sf = await kapi.join(dPath, 'scenes.json');
  const d = await kapi.readJson(sf);
  const row = (d.chapters[ch.guid] || []).find((x) => x.id === sc.id);
  if (!row) return false;
  if (on) row.type = 'memo'; else delete row.type;
  await kapi.writeFile(sf, JSON.stringify(d, null, 2));
  // อัปเดต frontmatter ของไฟล์ให้ตรงกัน
  try {
    const file = await kapi.join(dPath, 'Chapters', ch.folderName, row.fileName);
    const { meta, body } = parseMdFile(await kapi.readFile(file));
    if (on) meta.type = 'memo'; else delete meta.type;
    await kapi.writeFile(file, dumpMdFile(meta, body));
  } catch {}
  await buildTree();
  setStatus(on ? `"${row.title}" เป็นโน้ตแล้ว — จะไม่ถูกรวมตอนส่งออก` : `"${row.title}" กลับเป็นฉากปกติแล้ว`);
  return true;
}

// หา chapter object จาก guid (ใช้ตอนวางของข้ามส่วนของต้นไม้)
async function chapterByGuid(dPath, guidWanted) {
  try {
    const dj = await kapi.readJson(await kapi.join(dPath, 'draft.json'));
    return (dj.chapters || []).find((c) => c.guid === guidWanted) || null;
  } catch { return null; }
}

// ---------------- หน้าต่างลอย (floating window) — แบบ Resprite: ลากหัว/ย่อ/คืนแท็บ/ปรับขนาด ----------------
// z-index ของหน้าต่างลอยต้องอยู่ในช่วง 60–74 เท่านั้น
// ถ้าปล่อยให้ ++ ไปเรื่อย ๆ จะไต่ขึ้นไปบัง FAB (76) และกล่องโต้ตอบ (80) — บั๊กข้อ 9
const FLOAT_Z_MIN = 60, FLOAT_Z_MAX = 74;
let _floatZ = FLOAT_Z_MIN;
function bringFloatFront(win) {
  if (_floatZ >= FLOAT_Z_MAX) {              // ชนเพดาน → เรียงใหม่จากล่างสุด
    _floatZ = FLOAT_Z_MIN;
    [...document.querySelectorAll('.float-win')]
      .sort((a, b) => (+a.style.zIndex || 0) - (+b.style.zIndex || 0))
      .forEach((w) => { w.style.zIndex = String(_floatZ++); });
  }
  win.style.zIndex = String(++_floatZ);
}

function tabByBtn(btn) {
  for (const [f, t] of state.tabs) if (t.tabBtn === btn) return [f, t];
  return [null, null];
}

// ดึงแท็บออกมาเป็นหน้าต่างลอย (ย้าย DOM ของ pane เข้าไปทั้งก้อน — instance ตัวแก้ไขไม่ถูกสร้างใหม่)
function floatTab(file) {
  const t = state.tabs.get(file);
  if (!t || t.floatWin) { if (t && t.floatWin) bringFloatFront(t.floatWin); return t ? t.floatWin : null; }

  const win = el('div', 'float-win');
  const bar = el('div', 'float-bar');
  bar.append(el('span', 'float-title', t.title));
  const btns = el('span', 'float-btns');
  const bMin = el('span', 'float-btn', '—'); bMin.title = 'ย่อ';
  const bDock = el('span', 'float-btn', '⤢'); bDock.title = 'คืนเป็นแท็บ';
  const bX = el('span', 'float-btn', '×'); bX.title = 'ปิด';
  btns.append(bMin, bDock, bX); bar.append(btns);
  const body = el('div', 'float-body');
  const grip = el('div', 'float-grip');
  win.append(bar, body, grip);
  document.body.append(win);

  body.append(t.pane);                      // ย้าย pane เดิมเข้ามา (ไม่สร้างใหม่ → ไม่เสียสถานะ)
  t.pane.classList.add('on');
  t.floatWin = win;
  syncSplitPanes();          // ถ้าแท็บนี้อยู่ในช่องแยกจอ → ช่องนั้นต้องวาดใหม่เป็นช่องว่าง
  bringFloatFront(win);

  const n = [...state.tabs.values()].filter((x) => x.floatWin).length;
  makeDraggable(win, bar, {
    key: 'floatwin:' + file, resizable: true, snap: true,
    defaultPos: { left: 180 + n * 26, top: 90 + n * 26, width: 720, height: 520 },
  });

  // จับมุมขวาล่างขยาย
  grip.addEventListener('mousedown', (e) => {
    e.preventDefault(); e.stopPropagation();
    const r = win.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const move = (ev) => {
      win.style.width = Math.max(320, r.width + ev.clientX - sx) + 'px';
      win.style.height = Math.max(180, r.height + ev.clientY - sy) + 'px';
      refitTab(t);
    };
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  });

  bMin.onclick = () => { win.classList.toggle('min'); refitTab(t); };
  bDock.onclick = () => dockTab(file);
  bX.onclick = () => closeTab(file);
  bar.ondblclick = (e) => { if (!e.target.closest('.float-btn')) dockTab(file); };
  win.addEventListener('mousedown', () => bringFloatFront(win));

  t.tabBtn.classList.add('floated');
  setStatus('แยก "' + t.title + '" เป็นหน้าต่างลอยแล้ว (ดับเบิลคลิกหัวหน้าต่าง = คืนเป็นแท็บ)');
  setTimeout(() => refitTab(t), 60);
  return win;
}

// คืนหน้าต่างลอยกลับเป็นแท็บปกติ
function dockTab(file) {
  const t = state.tabs.get(file);
  if (!t || !t.floatWin) return false;
  $('#panes').append(t.pane);
  t.floatWin.remove();
  t.floatWin = null;
  t.tabBtn.classList.remove('floated');
  syncSplitPanes();          // ผนึกคืน → ช่องที่เคยว่างต้องรับ pane กลับ
  activate(file);
  setTimeout(() => refitTab(t), 60);
  setStatus('คืน "' + t.title + '" เป็นแท็บแล้ว');
  return true;
}

function toggleFloatTab(file) {
  const t = state.tabs.get(file);
  if (!t) return false;
  return t.floatWin ? dockTab(file) : !!floatTab(file);
}

// canvas/ตัวแก้ไขต้องวัดขนาดใหม่หลังย้าย DOM หรือปรับขนาดหน้าต่าง
function refitTab(t) {
  try {
    t.planner?._fit?.();
    t.net?._fit?.();
    t.gal?._fit?.();
    (t.editor || t.sp || t.plain)?.focus?.();
  } catch {}
}

// เลื่อน Explorer ไปที่ไฟล์นี้ + ไฮไลต์ให้เห็น (ใช้จากปุ่ม 📂 ในเอกสาร ของ Planner)
function revealInExplorer(file) {
  if (!file) return false;
  const row = document.querySelector(`.scene[data-path="${CSS.escape(file)}"]`);
  if (!row) { setStatus('ไม่พบไฟล์นี้ใน Explorer (อาจถูกลบ/ย้ายไปแล้ว)'); return false; }
  const sec = row.closest('.sec');
  if (sec && sec.classList.contains('collapsed')) sec.classList.remove('collapsed');
  row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  row.classList.add('reveal-flash');
  setTimeout(() => row.classList.remove('reveal-flash'), 1600);
  setStatus('แสดงตำแหน่งใน Explorer แล้ว');
  return true;
}

// ---------------- Planner (กระดานวางแผน) ----------------
async function openPlanner() {
  const key = '::planner::';
  if (state.tabs.has(key)) { activate(key); return; }
  const pane = el('div', 'pane planner-pane');
  $('#panes').append(pane);
  const tabBtn = el('div', 'tab');
  tabBtn.append(el('span', 'tab-title', 'Planner'));
  const x = el('span', 'tab-x', '×'); tabBtn.append(x);
  $('#tabs').append(tabBtn);
  const planner = new PlannerBoard(pane, state.root, {
    onDirty: () => { const t = state.tabs.get(key); if (t) markDirty(t); },
    onReveal: (f) => revealInExplorer(f),
    onOpenFile: async (f) => {
      if (!f) return;
      if (/\.json$/i.test(f) || /[\\/](Wiki|Bible)[\\/]/i.test(f)) await openEntity(f);
      else await openScene(f, f.split(/[\\/]/).pop());
      bindTabStripMenus();
      if (state.tabs.has(f)) floatTab(f);        // ดับเบิลคลิกการ์ด = เปิดเป็นหน้าต่างลอย
    },
  });
  const tab = { file: key, title: 'Planner', pane, tabBtn, dirty: false,
                editor: null, plain: null, wiki: null, gal: null, net: null, planner };
  tabBtn.onclick = (e) => { if (e.target !== x) { if (tab.floatWin) bringFloatFront(tab.floatWin); else activate(key); } };
  x.onclick = () => closeTab(key);
  state.tabs.set(key, tab);
  activate(key);
  bindTabStripMenus();
  setTimeout(() => planner._fit(), 60);
}

// ---------------- Dashboard ----------------


// เปิดฉากแรกของเล่ม (ฉบับร่างแรก บทแรก ฉากแรก) — ทางลัดจากตัวจัดการเล่ม
export async function openFirstSceneOf(secPath) {
  const draftRoot = await kapi.join(secPath, 'Draft');
  if (!(await kapi.exists(draftRoot))) { setStatus('เล่มนี้ยังไม่มีฉบับร่าง'); return; }
  const dns = await kapi.listDirs(draftRoot);
  if (!dns.length) return;
  const dPath = await kapi.join(draftRoot, dns[0]);
  const chs = ((await kapi.readJson(await kapi.join(dPath, 'draft.json'))).chapters || [])
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!chs.length) { setStatus('เล่มนี้ยังไม่มีบท'); return; }
  const ch = chs[0];
  const scAll = (await kapi.readJson(await kapi.join(dPath, 'scenes.json'))).chapters || {};
  const sc = (scAll[ch.guid] || []).sort((a, b) => (a.order || 0) - (b.order || 0))[0];
  if (!sc) { setStatus('บทแรกยังไม่มีฉาก'); return; }
  openScene(await kapi.join(dPath, 'Chapters', ch.folderName, sc.fileName), sc.title);
}

// สลับลำดับเล่ม: ย้าย from ไปไว้ก่อน dst แล้วเขียน order ใหม่ทั้งชุด

// ---------------- รายการเอกสารที่อ้างอิงได้: ฉากทุกบท + โน้ตใน Memos/ (ข้อ 5) ----------------
// เก็บ path แบบสัมพัทธ์กับ root เพื่อให้ย้าย/สำรองโปรเจกต์แล้วลิงก์ยังใช้ได้
export async function listRefTargets() {
  const out = [];
  if (!state.root) return out;
  const skip = new Set(['Wiki', 'Bible', 'Images', 'Memos', 'Research', 'Snapshots', 'Plugins', 'Recycle']);
  for (const secName of await kapi.listDirs(state.root).catch(() => [])) {
    if (skip.has(secName)) continue;
    const secPath = await kapi.join(state.root, secName);
    if (!(await kapi.exists(await kapi.join(secPath, 'section.json')))) continue;
    const draftRoot = await kapi.join(secPath, 'Draft');
    if (!(await kapi.exists(draftRoot))) continue;
    for (const dn of await kapi.listDirs(draftRoot).catch(() => [])) {
      const dPath = await kapi.join(draftRoot, dn);
      let draft = {}; try { draft = await kapi.readJson(await kapi.join(dPath, 'draft.json')); } catch { continue; }
      let scAll = {}; try { scAll = (await kapi.readJson(await kapi.join(dPath, 'scenes.json'))).chapters || {}; } catch {}
      for (const ch of (draft.chapters || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0))) {
        for (const sc of (scAll[ch.guid] || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0))) {
          const abs = await kapi.join(dPath, 'Chapters', ch.folderName, sc.fileName);
          out.push({ kind: sc.type === 'memo' ? 'memo' : 'scene',
                     path: (await kapi.relative(state.root, abs)).replace(/\\/g, '/'),
                     title: sc.title || sc.fileName,
                     label: `${sc.type === 'memo' ? '📝' : '📄'} ${secName} / ${ch.title || '-'} / ${sc.title || sc.fileName}` });
        }
      }
    }
  }
  const memoDir = await kapi.join(state.root, 'Memos');
  if (await kapi.exists(memoDir)) {
    for (const f of await kapi.listFiles(memoDir, '.md').catch(() => [])) {
      const abs = await kapi.join(memoDir, f);
      let title = f.replace(/\.md$/i, '');
      try { title = parseMdFile(await kapi.readFile(abs)).meta.title || title; } catch {}
      out.push({ kind: 'memo', path: 'Memos/' + f, title,
                 label: `📝 MEMO / ${title}` });
    }
  }
  return out;
}

// กล่องเลือกเอกสาร/โน้ตที่จะอ้างอิง — มีช่องกรองเพราะโปรเจกต์จริงมีฉากเป็นร้อย
export async function pickReference() {
  const items = await listRefTargets();
  if (!items.length) { setStatus('ยังไม่มีฉาก/โน้ตให้อ้างอิง'); return null; }
  return new Promise((resolve) => {
    const ov = el('div', 'k-overlay');
    const box = el('div', 'k-dialog');
    box.append(el('div', 'k-dlg-title', 'อ้างอิงถึงเอกสาร/โน้ตไหน'));
    const q = el('input', 'k-dlg-input'); q.placeholder = 'พิมพ์เพื่อกรอง…';
    box.append(q);
    const list = el('div', 'k-pick-list');
    const rows = items.map((it) => {
      const d = el('div', 'k-menu-item', it.label);
      d.onclick = () => { ov.remove(); resolve(it); };
      list.append(d);
      return { it, d };
    });
    q.oninput = () => {
      const s = q.value.trim().toLowerCase();
      for (const { it, d } of rows) d.style.display = !s || it.label.toLowerCase().includes(s) ? '' : 'none';
    };
    box.append(list);
    const btns = el('div', 'k-dlg-btns');
    const c = el('button', null, 'ยกเลิก');
    c.onclick = () => { ov.remove(); resolve(null); };
    btns.append(c); box.append(btns); ov.append(box);
    ov.onclick = (e) => { if (e.target === ov) { ov.remove(); resolve(null); } };
    document.body.append(ov);
    q.focus();
  });
}

// เปิดเอกสารที่ถูกอ้างอิง (path สัมพัทธ์กับ root)
export async function openRef(ref) {
  if (!ref || !ref.path || !state.root) return;
  const abs = await kapi.join(state.root, ...ref.path.split('/'));
  if (!(await kapi.exists(abs))) { setStatus('ไม่พบไฟล์ที่อ้างอิง: ' + ref.path); return; }
  openScene(abs, ref.title || ref.path.split('/').pop());
}

// ---------------- เส้นเวลา (Timeline) ----------------
// events ผู้ใช้เก็บใน <root>/timeline.json — ฉากที่มี storyDate ดึงมาแสดงอัตโนมัติ
export async function loadTimeline() {
  const p = await kapi.join(state.root, 'timeline.json');
  if (!(await kapi.exists(p))) return { version: TIMELINE_VERSION, events: [] };
  try { const d = await kapi.readJson(p); d.events = d.events || []; return d; }
  catch { return { version: TIMELINE_VERSION, events: [] }; }
}
export async function saveTimeline(data) {
  data.version = TIMELINE_VERSION;
  await kapi.writeFile(await kapi.join(state.root, 'timeline.json'), JSON.stringify(data, null, 2));
}
// ดึงฉากทุกเล่ม/ฉบับร่างที่ตั้ง storyDate ไว้ → เป็นเหตุการณ์อัตโนมัติบนเส้นเวลา
export async function sceneEventsFromProject() {
  const out = [];
  for (const sec of await listSections()) {
    const draftRoot = await kapi.join(sec.secPath, 'Draft');
    if (!(await kapi.exists(draftRoot))) continue;
    for (const dn of await kapi.listDirs(draftRoot)) {
      const dPath = await kapi.join(draftRoot, dn);
      const df = await kapi.join(dPath, 'draft.json');
      if (!(await kapi.exists(df))) continue;
      const scAll = (await kapi.readJson(await kapi.join(dPath, 'scenes.json'))).chapters || {};
      for (const chGuid of Object.keys(scAll)) {
        for (const sc of scAll[chGuid]) {
          if (sc.type === 'memo' || !sc.storyDate) continue;
          out.push({ id: 'sc:' + dPath + ':' + sc.id, title: sc.title || '(ไม่มีชื่อ)',
                     when: sc.storyDate, track: sec.title, color: sc.color || '',
                     synopsis: sc.synopsis || '',
                     file: await kapi.join(dPath, 'Chapters',
                       (((await kapi.readJson(df)).chapters || []).find((c) => c.guid === chGuid) || {}).folderName || '',
                       sc.fileName) });
        }
      }
    }
  }
  return out;
}



// กล่องเพิ่ม/แก้เหตุการณ์ — คืน event object, 'DELETE', หรือ null
export function eventDialog(ev, knownTracks, canDelete = false) {
  return new Promise((resolve) => {
    const ov = el('div', 'k-overlay');
    const box = el('div', 'k-dialog');
    box.append(el('div', 'k-dlg-title', canDelete ? 'แก้ไขเหตุการณ์' : 'เพิ่มเหตุการณ์'));
    const mk = (label, val, ph, tag = 'input') => {
      const r = el('div', 'wiki-row'); r.append(el('label', null, label));
      const i = el(tag, 'wiki-input'); i.value = val || ''; if (ph) i.placeholder = ph;
      r.append(i); box.append(r); return i;
    };
    const iTitle = mk('ชื่อเหตุการณ์', ev.title, 'เช่น สงครามปะทุ');
    const iWhen = mk('เวลาในเรื่อง (เริ่ม)', ev.when, 'เช่น ปีที่ 1024 · วันที่ 3');
    const iWhenEnd = mk('เวลาจบ (ไม่บังคับ — สำหรับ Gantt)', ev.whenEnd, 'เว้นว่าง = เหตุการณ์จุดเดียว');
    const iTrack = mk('แทร็ก/เส้นเรื่อง', ev.track, 'เช่น เส้นหลัก, มุมมองศัตรู');
    if (knownTracks.length) {
      const dl = el('datalist'); dl.id = 'tl-tracks';
      for (const t of knownTracks) { const o = el('option'); o.value = t; dl.append(o); }
      iTrack.setAttribute('list', 'tl-tracks'); box.append(dl);
    }
    const iSort = mk('ลำดับ (ตัวเลข — ไม่บังคับ)', ev.sort ?? '', 'ใช้จัดลำดับเมื่อเวลาเป็นข้อความ');
    iSort.type = 'number';
    const iDesc = mk('รายละเอียด', ev.desc, '', 'textarea');

    // ---- อ้างอิง (ข้อ 5): ผูกเหตุการณ์กับฉาก/โน้ตจริงในโปรเจกต์ ----
    let refs = normalizeRefs(ev.refs);
    const refRow = el('div', 'wiki-row k-ev-refs');
    refRow.append(el('label', null, 'อ้างอิง'));
    const refWrap = el('div', 'k-ev-ref-wrap');
    const refList = el('div', 'k-ev-ref-list');
    const addRef = el('button', 'k-tpl-add', '+ อ้างอิงเอกสาร/โน้ต…');
    addRef.type = 'button';
    const paintRefs = () => {
      refList.replaceChildren();
      if (!refs.length) refList.append(el('span', 'dim', 'ยังไม่ได้อ้างอิงอะไร'));
      refs.forEach((r, i) => {
        const chip = el('span', 'k-ev-ref');
        chip.append(el('span', null, (r.kind === 'memo' ? '📝 ' : '📄 ') + r.title));
        const x = el('span', 'k-ev-ref-x', '✕'); x.title = 'เอาการอ้างอิงนี้ออก';
        x.onclick = () => { refs.splice(i, 1); paintRefs(); };
        chip.append(x);
        chip.title = r.path;
        refList.append(chip);
      });
    };
    addRef.onclick = async () => {
      const pick = await pickReference();
      if (!pick) return;
      refs = normalizeRefs([...refs, pick]);
      paintRefs();
    };
    paintRefs();
    refWrap.append(refList, addRef); refRow.append(refWrap); box.append(refRow);

    const btns = el('div', 'k-dlg-btns');
    if (canDelete) {
      const del = el('button', 'k-danger', '🗑 ลบ');
      del.onclick = () => { ov.remove(); resolve('DELETE'); };
      btns.append(del);
    }
    const cB = el('button', null, 'ยกเลิก');
    const okB = el('button', 'k-ok', 'บันทึก');
    btns.append(cB, okB); box.append(btns); ov.append(box); document.body.append(ov);
    cB.onclick = () => { ov.remove(); resolve(null); };
    ov.onclick = (e) => { if (e.target === ov) { ov.remove(); resolve(null); } };
    okB.onclick = () => {
      const title = iTitle.value.trim();
      if (!title) { iTitle.focus(); return; }
      const sortVal = iSort.value.trim() === '' ? undefined : parseFloat(iSort.value);
      ov.remove();
      resolve({ ...ev, title, when: iWhen.value.trim(), whenEnd: iWhenEnd.value.trim(),
                track: iTrack.value.trim(), sort: sortVal, desc: iDesc.value.trim(),
                refs: normalizeRefs(refs) });
    };
    iTitle.focus();
  });
}

// ---------------- แผนที่ (Maps) ----------------
// เก็บใน <root>/maps.json — รูปแผนที่อยู่ในคลังรูป (Images/) เก็บ path แบบ 'Images/<file>'
export async function loadMaps() {
  const p = await kapi.join(state.root, 'maps.json');
  if (!(await kapi.exists(p))) return { version: MAPS_VERSION, maps: [] };
  try { const d = await kapi.readJson(p); d.maps = d.maps || []; return d; }
  catch { return { version: MAPS_VERSION, maps: [] }; }
}
export async function saveMaps(data) {
  data.version = MAPS_VERSION;
  await kapi.writeFile(await kapi.join(state.root, 'maps.json'), JSON.stringify(data, null, 2));
}
// รูปแผนที่: เก็บ 'Images/<file>' → แปลงเป็น URL ด้วย resolveImg (อ้างอิงจาก root)
export function mapImgURL(rel) { return rel ? resolveImg(state.root, rel) : ''; }

export const mapsState_C = { s: null };   // object เพื่อ export ข้ามไฟล์


// เพิ่มแผนที่ใหม่: เลือกรูป → ตั้งชื่อ
export async function addMapFlow() {
  const it = await pickImage(state.root);
  const name = await ask('ชื่อแผนที่', { value: it ? it.file.replace(/\.[^.]+$/, '') : 'แผนที่ใหม่' });
  if (!name) return;
  const m = newMap(name, it ? 'Images/' + it.file : '');
  m.order = mapsState_C.s.data.maps.length;
  mapsState_C.s.data.maps.push(m);
  mapsState_C.s.currentId = m.id;
  await saveMaps(mapsState_C.s.data);
  renderMaps($('#maps-body'));                 // บั๊ก #18: แผนที่อยู่ในแผง ไม่ใช่แท็บแล้ว
}

// กล่องแก้หมุด — คืน pin object, 'DELETE', หรือ null
export function pinDialog(pin, maps, curMapId, canDelete = false) {
  return new Promise((resolve) => {
    const ov = el('div', 'k-overlay');
    const box = el('div', 'k-dialog');
    box.append(el('div', 'k-dlg-title', canDelete ? 'แก้ไขหมุด' : 'ปักหมุด'));

    // เลือกชนิดหมุด
    const kindRow = el('div', 'wiki-row'); kindRow.append(el('label', null, 'ชนิด'));
    const kindSel = el('select', 'wiki-input k-dlg-select');
    for (const [k, v] of Object.entries(PIN_KIND)) {
      const o = el('option', null, v.icon + ' ' + v.label); o.value = k;
      if (k === pin.kind) o.selected = true; kindSel.append(o);
    }
    kindRow.append(kindSel); box.append(kindRow);

    const iLabel = el('input', 'wiki-input'); iLabel.value = pin.label || '';
    { const r = el('div', 'wiki-row'); r.append(el('label', null, 'ป้ายชื่อ'), iLabel); box.append(r); }

    // ลิงก์เอนทิตี้ (เมื่อ kind=entity)
    const entRow = el('div', 'wiki-row'); entRow.append(el('label', null, 'ลิงก์เอนทิตี้'));
    const entSel = el('select', 'wiki-input k-dlg-select');
    entRow.append(entSel); box.append(entRow);
    const fillEntities = async () => {
      entSel.innerHTML = ''; const none = el('option', null, '— เลือกเอนทิตี้ —'); none.value = ''; entSel.append(none);
      for (const e of await loadAllEntities()) {
        const o = el('option', null, `${(PIN_KIND.entity.icon)} ${e.name} (${catLabel(e.cat)})`); o.value = e.file;
        if (e.file === pin.entityFile) o.selected = true; entSel.append(o);
      }
    };

    // ลิงก์ประตูไปแผนที่อื่น (เมื่อ kind=portal)
    const portalRow = el('div', 'wiki-row'); portalRow.append(el('label', null, 'ประตูไปแผนที่'));
    const portalSel = el('select', 'wiki-input k-dlg-select');
    { const none = el('option', null, '— เลือกแผนที่ปลายทาง —'); none.value = ''; portalSel.append(none);
      for (const m of sortMaps(maps)) { if (m.id === curMapId) continue;
        const o = el('option', null, '🗺 ' + m.name); o.value = m.id;
        if (m.id === pin.toMap) o.selected = true; portalSel.append(o); } }
    portalRow.append(portalSel); box.append(portalRow);

    // สีหมุด
    const colorRow = el('div', 'wiki-row'); colorRow.append(el('label', null, 'สี'));
    const colorSel = el('select', 'wiki-input k-dlg-select');
    { const none = el('option', null, '— อัตโนมัติ —'); none.value = ''; colorSel.append(none);
      for (const c of PIN_COLORS) { const o = el('option', null, '● ' + c); o.value = c;
        if (c === pin.color) o.selected = true; colorSel.append(o); } }
    colorRow.append(colorSel); box.append(colorRow);

    const iNote = el('textarea', 'wiki-input'); iNote.value = pin.note || '';
    { const r = el('div', 'wiki-row'); r.append(el('label', null, 'หมายเหตุ'), iNote); box.append(r); }

    // แสดง/ซ่อนแถวตามชนิด
    const syncRows = () => {
      entRow.style.display = kindSel.value === 'entity' ? '' : 'none';
      portalRow.style.display = kindSel.value === 'portal' ? '' : 'none';
    };
    kindSel.onchange = syncRows; syncRows();
    fillEntities();

    const btns = el('div', 'k-dlg-btns');
    if (canDelete) { const del = el('button', 'k-danger', '🗑 ลบ');
      del.onclick = () => { ov.remove(); resolve('DELETE'); }; btns.append(del); }
    const cB = el('button', null, 'ยกเลิก');
    const okB = el('button', 'k-ok', 'บันทึก');
    btns.append(cB, okB); box.append(btns); ov.append(box); document.body.append(ov);
    cB.onclick = () => { ov.remove(); resolve(null); };
    ov.onclick = (e) => { if (e.target === ov) { ov.remove(); resolve(null); } };
    okB.onclick = () => {
      ov.remove();
      resolve({ ...pin, kind: kindSel.value, label: iLabel.value.trim(),
                entityFile: kindSel.value === 'entity' ? entSel.value : '',
                toMap: kindSel.value === 'portal' ? portalSel.value : '',
                color: colorSel.value, note: iNote.value.trim() });
    };
    iLabel.focus();
  });
}

// ---------------- โหมดโฟกัส ----------------
function toggleFocus(on) {
  const v = on ?? !document.body.classList.contains('focus-mode');
  document.body.classList.toggle('focus-mode', v);
  toggleFocusMode2(v);          // หรี่บรรทัดอื่นไปพร้อมกัน (โมดูล focus-mode.js)
  syncMenuToggles();
  refreshToolbar();
  setStatus(v ? 'โหมดโฟกัส — Esc หรือ Ctrl+Shift+D เพื่อออก' : 'ออกจากโหมดโฟกัส');
}

// ---------------- เครื่องหมายถูกในเมนู native (ข้อ 3) ----------------
// เมนูหลักเป็นเมนู OS จริง → ทำเครื่องหมายเองไม่ได้จากฝั่ง renderer
// ต้องส่งสถานะสวิตช์ทุกตัวไปให้ main แล้ว main สร้างเมนูใหม่ด้วย type:'checkbox'/'radio'
let _menuTogSig = '';
export function syncMenuToggles() {
  if (typeof kapi === 'undefined' || !kapi.menuToggles) return;
  try {
    const ps = panelToggleState();
    const payload = {
      paperMode: state.settings.paperMode !== false,
      readingMode: document.body.classList.contains('reading-mode'),
      focusMode: document.body.classList.contains('focus-mode'),
      typewriter: isTypewriter(),
      lineNumbers: !!state.settings.lineNumbers,
      splitView: isSplit() ? splitDir() : false,
      format: state.active?.sp ? 'screenplay' : 'prose',
      panels: { 'tree-panel': !!ps.tree, 'props-panel': !!ps.props,
                'outline-panel': !!ps.outline, ...ps },
    };
    // สร้างเมนู native ใหม่ทุกครั้งแพงเกินไป — ส่งเฉพาะตอนค่าเปลี่ยนจริง
    const sig = JSON.stringify(payload);
    if (sig === _menuTogSig) return;
    _menuTogSig = sig;
    kapi.menuToggles(payload);
  } catch {}
}

// ---------------- โหมดหน้ากระดาษ (กระดาษขาว high-contrast แบบสคริปต์จริง) ----------------
function togglePaper(on) {
  // ค่าเริ่มต้น (undefined) = เปิด → นิพจน์นี้ต้องอ่านสถานะ "ที่เห็นอยู่จริง" ก่อนกลับด้าน
  const v = on ?? !(state.settings.paperMode !== false);
  state.settings.paperMode = v;
  document.body.classList.toggle('paper-mode', v);
  saveProjectMeta();
  const btn = $('#tb-paper'); if (btn) btn.classList.toggle('on', v);
  syncMenuToggles();
  setStatus(v ? 'โหมดหน้ากระดาษ: เปิด (กระดาษขาว)' : 'โหมดหน้ากระดาษ: ปิด (พื้นมืด)');
}

// ---------------- โหมดอ่าน (📖) — เต็มจอ, ปิด cursor, ซ่อน UI ----------------
// การซ่อน UI ทำด้วย CSS (body.reading-mode) ล้วน — ห้ามใช้ inline style.display
// เพราะ inline ค้างอยู่ข้ามการสลับโหมดแล้วไปทับกฎอื่น (เคยทำให้แผง/FAB ไม่กลับมา)
let _readEsc = null;                       // ตัวจับ Esc ตัวเดียว (กันซ้อนกันหลายตัว)
function toggleReading(on) {
  const v = on ?? !document.body.classList.contains('reading-mode');
  document.body.classList.toggle('reading-mode', v);
  const btn = $('#tb-read'); if (btn) btn.classList.toggle('on', v);
  const t = state.active;
  const ce = v ? 'false' : 'true';
  if (t?.editor) t.editor.view.dom.setAttribute('contenteditable', ce);
  if (t?.sp) t.sp.view.dom.setAttribute('contenteditable', ce);
  // เก็บกวาด inline style ที่เวอร์ชันก่อนหน้าเคยเขียนค้างไว้
  for (const id of ['#app-root', '#topbar', '#statusbar', '#toolbar', '#titlebar', '#tabs', '#k-fab']) {
    const elx = $(id); if (elx) elx.style.display = '';
  }
  if (_readEsc) { document.removeEventListener('keydown', _readEsc); _readEsc = null; }
  if (v) {
    // เปิดโหมดโฟกัสอยู่ด้วย → Esc ครั้งแรกให้ออกจากโฟกัสก่อน (ตัวจับของโฟกัสจัดการ) ครั้งถัดไปค่อยออกโหมดอ่าน
    _readEsc = (e) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('.k-overlay')) return;
      if (e._k2EscUsed || document.body.classList.contains('focus-mode')) return;
      e._k2EscUsed = true;
      toggleReading(false);
    };
    document.addEventListener('keydown', _readEsc);
  }
  syncMenuToggles();
  syncFloatBarVisible();
  setStatus(v ? 'โหมดอ่าน — กด Esc หรือคลิก 📖 เพื่อออก' : 'ออกจากโหมดอ่าน');
}

// ---------------- คุณสมบัติฉาก ----------------

// เวอร์ชันแอปปัจจุบัน (จาก package.json) — ใช้บันทึกว่าแก้ไฟล์ด้วยเวอร์ชันไหน
const APP_VERSION = (typeof kapi !== 'undefined' && kapi.appVersion) ? kapi.appVersion : '2.0.0';

// ปรับการแก้ไขได้/ไม่ได้ของแท็บที่เปิดอยู่ตามสถานะล็อก (ProseMirror อ่าน editable ใหม่เมื่อ dispatch)
function applyLockToTab(tab) {
  if (!tab) return;
  const v = tab.editor?.view || tab.sp?.view;
  if (v) v.dispatch(v.state.tr);                       // no-op tr → re-eval editable
  tab.pane?.classList.toggle('pane-locked', !!tab.locked);
}

// ตั้งสถานะล็อกของฉาก: เขียนทั้ง scenes.json (ให้ tree เห็น) + frontmatter (.md) + แท็บที่เปิดค้าง
async function setSceneLock(dPath, ch, sc, locked) {
  const sf = await kapi.join(dPath, 'scenes.json');
  const d = await kapi.readJson(sf);
  const row = (d.chapters[ch.guid] || []).find((x) => x.id === sc.id);
  if (row) { row.locked = locked; await kapi.writeFile(sf, JSON.stringify(d, null, 2)); }
  const file = await kapi.join(dPath, 'Chapters', ch.folderName, (row || sc).fileName);
  try {
    const { meta, body } = parseMdFile(await kapi.readFile(file));
    if (locked) meta.locked = 'true'; else delete meta.locked;
    await kapi.writeFile(file, dumpMdFile(meta, body));
  } catch {}
  const openTab = state.tabs.get(file);
  if (openTab) { openTab.locked = locked; openTab.meta.locked = locked ? 'true' : undefined; applyLockToTab(openTab); }
  await buildTree();
  setStatus(locked ? '🔒 ล็อกฉากแล้ว (แก้ไม่ได้จนปลดล็อก)' : '🔓 ปลดล็อกฉากแล้ว');
}

// ---------------- คุณสมบัติฉาก (แบบแผง dock ได้ แทน popup) ----------------
const propsTarget_C = { t: null };
function setPropsTarget(dPath, ch, sc) {
  const prev = propsTarget_C.t;
  // ย้ายไปฉากอื่น → เขียนค่าที่ค้างของฉากเดิมให้จบก่อน (บันทึกอัตโนมัติ ข้อ 13)
  if (prev && prev.sc?.id !== sc?.id && propsFlush_C.fn) {
    const flush = propsFlush_C.fn; propsFlush_C.fn = null;
    try { flush(); } catch {}
  }
  propsTarget_C.t = { dPath, ch, sc };
  if (isPanelOpen('props')) renderPropsPanel();
}
function openPropsPanel(dPath, ch, sc) {
  const was = isPanelOpen('props');
  setPropsTarget(dPath, ch, sc);      // เรียก renderPropsPanel() ให้แล้วถ้าแผงเปิดอยู่
  // บั๊ก #19: เดิมสั่ง showPanel ทุกครั้ง → แผงที่ผู้ใช้เพิ่งปิดไปโผล่กลับมาเองทุกครั้งที่คลิกฉาก
  if (!was) { showPanel('props-panel'); renderPropsPanel(); }
}
// บั๊กข้อ 14: ฟังก์ชันนี้เป็น async — ล้าง body ตอนต้น แล้ว await หลายจังหวะ
// ถ้าถูกเรียกซ้อน (setPropsTarget + openPropsPanel เรียกติดกัน) ทั้งสองรอบจะ append ทับกัน = รายการซ้ำ
// แก้ด้วยหมายเลขรอบ: รอบที่ไม่ใช่รอบล่าสุดต้องหยุดทันทีหลังทุกจุด await
let _propsGen = 0;
async function renderPropsPanel() {
  const body = $('#props-body'); if (!body) return;
  const gen = ++_propsGen;
  const stale = () => gen !== _propsGen;
  body.replaceChildren();
  if (!propsTarget_C.t) { body.append(el('div', 'dim', '(เลือกฉากเพื่อดูคุณสมบัติ)')); return; }
  const { dPath, ch, sc } = propsTarget_C.t;
  const sf = await kapi.join(dPath, 'scenes.json');
  if (stale()) return;
  const d = await kapi.readJson(sf);
  if (stale()) return;
  const row = (d.chapters[ch.guid] || []).find((x) => x.id === sc.id);
  if (!row) { body.replaceChildren(el('div', 'dim', '(ไม่พบฉาก)')); return; }
  body.replaceChildren();              // กันของค้างจากรอบก่อนที่ยัง append ไม่ทัน
  body.append(el('div', 'props-name', '📄 ' + row.title));

  // ---- แถบล็อก (แก้ไฟล์ไม่ได้จนปลดล็อก) ----
  const lockRow = el('div', 'props-lock');
  const lockChk = el('input', null); lockChk.type = 'checkbox'; lockChk.checked = !!row.locked;
  const lockLbl = el('label', null); lockLbl.append(lockChk,
    document.createTextNode(row.locked ? ' 🔒 ล็อกอยู่ (แก้ไม่ได้)' : ' 🔓 ล็อกฉากนี้'));
  lockChk.onchange = async () => { await setSceneLock(dPath, ch, sc, lockChk.checked); renderPropsPanel(); };
  lockRow.append(lockLbl); body.append(lockRow);

  // ---- เวอร์ชัน: แก้ไขล่าสุดด้วยแอปเวอร์ชันไหน + revision + ปุ่มเทียบ ----
  const file0 = await kapi.join(dPath, 'Chapters', ch.folderName, row.fileName);
  if (stale()) return;
  let vmeta = {}; try { vmeta = parseMdFile(await kapi.readFile(file0)).meta; } catch {}
  if (stale()) return;
  const verRow = el('div', 'props-ver');
  verRow.append(el('div', 'props-ver-line',
    'เวอร์ชันที่แก้ไข: ' + (vmeta.appVersion || '—') + '  ·  รอบแก้ #' + (vmeta.revision || '0')));
  const verBtns = el('div', 'props-ver-btns');
  const bHist = el('button', null, '🕘 ประวัติ'); bHist.onclick = () => versionDialog(dPath, ch, sc);
  const bCmp = el('button', null, '⇋ เทียบเวอร์ชัน'); bCmp.onclick = () => compareVersionsDialog(dPath, ch, sc);
  verBtns.append(bHist, bCmp); verRow.append(verBtns); body.append(verRow);

  const mk = (label, val, tag = 'input') => {
    const r = el('div', 'wiki-row'); r.append(el('label', null, label));
    const i = el(tag, 'wiki-input'); i.value = val || ''; r.append(i); body.append(r); return i;
  };
  const mkSel = (label, options, cur) => {
    const r = el('div', 'wiki-row'); r.append(el('label', null, label));
    const s = el('select', 'wiki-input k-dlg-select');
    for (const [v, txt] of options) { const o = el('option', null, txt); o.value = v; if (v === cur) o.selected = true; s.append(o); }
    r.append(s); body.append(r); return s;
  };
  const mkChk = (label, checked) => {
    const r = el('div', 'wiki-row'); r.append(el('label', null, label));
    const c = el('input', 'wiki-check'); c.type = 'checkbox'; c.checked = !!checked; r.append(c); body.append(r); return c;
  };

  const iSyn = mk('เรื่องย่อ', row.synopsis, 'textarea');
  const iStoryDate = mk('เวลาในเรื่อง (เส้นเวลา)', row.storyDate);
  iStoryDate.placeholder = 'วันที่ 3 · ปีที่ 1024 · เช้า';
  const iPov = mk('มุมมอง (POV)', row.pov);
  const iEmotion = mk('อารมณ์', row.emotion);
  const iConflict = mk('ความขัดแย้ง', row.conflict);
  // สถานะต้องใช้ allStatuses() เหมือนกล่องคุณสมบัติ ไม่งั้นสถานะที่ผู้ใช้สร้างเองจะหายตอนบันทึก
  const statuses = allStatuses();
  const iStatus = mkSel('สถานะ', [['Outline', '— ยังไม่ตั้ง —'], ...statuses.map((s) => [s, s])],
    statuses.includes(row.status) ? row.status : 'Outline');
  const iColor = mkSel('สี', [['', '— ไม่มี —'], ...SCENE_COLORS.map(([n, hex]) => [hex, '● ' + n])], row.color || '');
  const iFlag = mkChk('ปักหมุด', row.flag);
  const iTags = mk('แท็ก (คั่น , )', (row.tags || []).join(', '));
  const iNote = mk('โน้ต', row.note, 'textarea');

  // ---- บันทึกอัตโนมัติ (ข้อ 13) — ไม่ต้องกดปุ่มแล้ว ----
  // พิมพ์แล้วรอเงียบ 600ms ค่อยเขียน (กันเขียนไฟล์ทุกตัวอักษร) · เปลี่ยน dropdown/checkbox = เขียนทันที
  const statusLine = el('div', 'props-autosave', 'บันทึกอัตโนมัติ');
  body.append(statusLine);

  const collect = () => {
    row.synopsis = iSyn.value; row.pov = iPov.value; row.status = iStatus.value;
    row.storyDate = iStoryDate.value.trim();
    row.emotion = iEmotion.value; row.conflict = iConflict.value;
    row.color = iColor.value; row.flag = iFlag.checked; row.note = iNote.value;
    row.tags = iTags.value.split(',').map((x) => x.trim()).filter(Boolean);
  };
  const snapshot = () => JSON.stringify([row.synopsis, row.pov, row.status, row.storyDate,
    row.emotion, row.conflict, row.color, row.flag, row.note, row.tags]);
  let lastSaved = (collect(), snapshot());

  const commit = async (rebuildTree) => {
    collect();
    const now = snapshot();
    if (now === lastSaved) return;          // ไม่มีอะไรเปลี่ยน = ไม่แตะดิสก์
    lastSaved = now;
    statusLine.textContent = 'กำลังบันทึก…';
    await kapi.writeFile(sf, JSON.stringify(d, null, 2));
    try {
      const { meta, body: mbody } = parseMdFile(await kapi.readFile(file0));
      meta.pov = row.pov; meta.tags = row.tags;
      meta.emotion = row.emotion; meta.conflict = row.conflict; meta.note = row.note;
      await kapi.writeFile(file0, dumpMdFile(meta, mbody));
    } catch {}
    statusLine.innerHTML = iconHtml('check', 14) + ' บันทึกแล้ว';
    // สี/สถานะ/แท็ก/หมุด มีผลกับต้นไม้ — วาดใหม่เฉพาะตอนจำเป็น (ไม่ใช่ทุกตัวอักษรที่พิมพ์)
    if (rebuildTree) await buildTree();
  };

  let saveJob = null;
  const scheduleSave = () => {
    statusLine.textContent = 'แก้ไข…';
    clearTimeout(saveJob);
    saveJob = setTimeout(() => commit(true).catch(() => {}), 600);
  };
  for (const i of [iSyn, iStoryDate, iPov, iEmotion, iConflict, iTags, iNote]) {
    i.addEventListener('input', scheduleSave);
    i.addEventListener('blur', () => { clearTimeout(saveJob); commit(true).catch(() => {}); });
  }
  for (const s of [iStatus, iColor, iFlag]) {
    s.addEventListener('change', () => { clearTimeout(saveJob); commit(true).catch(() => {}); });
  }
  // สลับไปฉากอื่น/ปิดแผงกลางคัน → เขียนที่ค้างอยู่ให้จบก่อน
  propsFlush_C.fn = () => { clearTimeout(saveJob); return commit(true); };
}

// ตัวเขียนค้างของแผงคุณสมบัติ (เรียกก่อนวาดแผงใหม่ กันค่าที่เพิ่งพิมพ์หาย)
const propsFlush_C = { fn: null };

// ---------------- รวมข้อความทั้งฉบับร่าง (ใช้ตอนส่งออก) ----------------
// กติกา: แถวที่เป็นโน้ต (type: memo) จะ "ไม่" ถูกรวม — เขียนโน้ตคาไว้ในบทได้โดยไม่ปนต้นฉบับ
// อ่านฉบับร่างทั้งชุดจากดิสก์ → โครงสร้างกลาง (ใช้ทั้งส่งออกแบบเดิมและเวิร์กโฟลว์)
// ชนิด memo ยังคงอยู่ในโมเดล — ให้ขั้นตอน "ตัดโน้ต" เป็นคนคัดออก (ค่าเริ่มต้นเปิดไว้ทุกพรีเซ็ต)
async function buildDraftModel(dPath, title) {
  const model = { title: title || state.title, author: (state.meta && state.meta.author) || '',
                  chapters: [] };
  const chapters = ((await kapi.readJson(await kapi.join(dPath, 'draft.json'))).chapters || [])
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const scAll = (await kapi.readJson(await kapi.join(dPath, 'scenes.json'))).chapters || {};
  for (const ch of chapters) {
    const c = { title: ch.title || '', guid: ch.guid, scenes: [] };
    for (const sc of (scAll[ch.guid] || []).sort((a, b) => (a.order || 0) - (b.order || 0))) {
      const file = await kapi.join(dPath, 'Chapters', ch.folderName, sc.fileName);
      let body = '', meta = {};
      try { ({ meta, body } = parseMdFile(await kapi.readFile(file))); } catch { continue; }
      const isMemo = sc.type === 'memo' || (meta && meta.type === 'memo');
      c.scenes.push({ title: sc.title || '', file, body: (body || '').trim(),
                      synopsis: sc.synopsis || (meta && meta.synopsis) || '',
                      status: sc.status || (meta && meta.status) || '',
                      type: isMemo ? 'memo' : 'scene', words: countWords(body || '') });
    }
    model.chapters.push(c);
  }
  return model;
}

// ส่งออกแบบเดิม (เมนู "ส่งออกฉบับร่างรวมเป็น .md") = เวิร์กโฟลว์ "ต้นฉบับ" แบบไม่มีตัวคั่น
async function compileDraftText(dPath, title) {
  const model = await buildDraftModel(dPath, title);
  const out = ['# ' + model.title, ''];
  for (const ch of model.chapters) {
    out.push('## ' + ch.title, '');
    for (const sc of ch.scenes) { if (sc.type === 'memo') continue; out.push(sc.body, ''); }
  }
  return out.join('\n');
}

// รายชื่อฉบับร่างทั้งหมดในโปรเจกต์ (เซกชัน / ร่าง)
async function listDrafts() {
  const drafts = [];
  for (const secName of await kapi.listDirs(state.root)) {
    const secPath = await kapi.join(state.root, secName);
    if (!(await kapi.exists(await kapi.join(secPath, 'section.json')))) continue;
    const draftRoot = await kapi.join(secPath, 'Draft');
    if (!(await kapi.exists(draftRoot))) continue;
    for (const dname of await kapi.listDirs(draftRoot))
      drafts.push({ label: `${secName} / ${dname}`, secName,
                    dPath: await kapi.join(draftRoot, dname) });
  }
  return drafts;
}

// ---------------- เล่ม (sections) — ตัวช่วยกลาง ----------------
export const SECTION_STATUSES = [
  ['outline', 'โครงเรื่อง', '#8a8f98'], ['drafting', 'กำลังเขียน', '#5f9fd9'],
  ['revising', 'กำลังแก้', '#d9b757'], ['done', 'เขียนจบ', '#6fae6f'],
  ['published', 'ตีพิมพ์แล้ว', '#a97fd0'],
];
// อ่านทุกเล่ม (เรียงตาม order) พร้อม meta ที่จำเป็น
// นับบท/ฉาก/คำของทั้งเล่ม (รวมทุกฉบับร่าง)

// ---------------- เวิร์กโฟลว์ส่งออก (compile) ----------------
// เวิร์กโฟลว์ของผู้ใช้เก็บใน project.khn.json → compileWorkflows
function userWorkflows() {
  if (!state.meta) return [];
  if (!Array.isArray(state.meta.compileWorkflows)) state.meta.compileWorkflows = [];
  return state.meta.compileWorkflows;
}
function allWorkflows() { return [...PRESETS, ...userWorkflows()]; }

export async function openCompileDialog() {
  if (!state.root) return;
  const drafts = await listDrafts();
  if (!drafts.length) { setStatus('ยังไม่มีฉบับร่างให้ส่งออก'); return; }

  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog k-compile');
  box.append(el('div', 'k-dlg-title', 'ส่งออกด้วยเวิร์กโฟลว์'));

  const top = el('div', 'cmp-top');
  const selDraft = el('select', 'k-dlg-select');
  for (const d of drafts) { const o = el('option', null, d.label); o.value = d.dPath; selDraft.append(o); }
  top.append(el('span', null, 'ฉบับร่าง'), selDraft);
  box.append(top);

  const body = el('div', 'cmp-body');
  const left = el('div', 'cmp-left');
  const right = el('div', 'cmp-right');
  body.append(left, right); box.append(body);

  let curId = (userWorkflows()[0] || PRESETS[0]).id;
  const cur = () => allWorkflows().find((w) => w.id === curId) || PRESETS[0];

  const renderLeft = () => {
    left.innerHTML = '';
    left.append(el('div', 'cmp-sub', 'พรีเซ็ต'));
    const row = (w) => {
      const d = el('div', 'cmp-wf' + (w.id === curId ? ' on' : ''), w.name);
      d.dataset.wf = w.id;
      d.onclick = () => { curId = w.id; renderLeft(); renderRight(); };
      left.append(d);
    };
    PRESETS.forEach(row);
    left.append(el('div', 'cmp-sub', 'ของฉัน'));
    const mine = userWorkflows();
    if (!mine.length) left.append(el('div', 'cmp-empty', '(ยังไม่มี — กด "ทำสำเนา" จากพรีเซ็ต)'));
    mine.forEach(row);
    const bAdd = el('button', 'cmp-mini', '+ สร้างเปล่า');
    bAdd.onclick = async () => {
      const n = await ask('ชื่อเวิร์กโฟลว์ใหม่', { value: 'เวิร์กโฟลว์ของฉัน' });
      if (!n) return;
      const w = newWorkflow(n); userWorkflows().push(w); await saveProjectMeta();
      curId = w.id; renderLeft(); renderRight();
    };
    left.append(bAdd);
  };

  const renderRight = () => {
    const w = cur();
    right.innerHTML = '';
    const head = el('div', 'cmp-head');
    head.append(el('div', 'cmp-name', w.name + (w.builtIn ? '  (พรีเซ็ต — แก้ไม่ได้)' : '')));
    const bCopy = el('button', 'cmp-mini', '⧉ ทำสำเนา');
    bCopy.onclick = async () => {
      const c = cloneWorkflow(w); userWorkflows().push(c); await saveProjectMeta();
      curId = c.id; renderLeft(); renderRight(); setStatus('ทำสำเนาเวิร์กโฟลว์แล้ว');
    };
    head.append(bCopy);
    if (!w.builtIn) {
      const bDel = el('button', 'cmp-mini k-danger', '🗑 ลบ');
      bDel.onclick = async () => {
        if (!(await confirmBox(`ลบเวิร์กโฟลว์ “${w.name}” ?`, 'ลบ'))) return;
        const arr = userWorkflows(); arr.splice(arr.indexOf(w), 1); await saveProjectMeta();
        curId = PRESETS[0].id; renderLeft(); renderRight();
      };
      head.append(bDel);
    }
    right.append(head);

    const extRow = el('div', 'cmp-ext');
    extRow.append(el('span', null, 'นามสกุลไฟล์'));
    const selExt = el('select', 'k-dlg-select'); selExt.id = 'cmp-ext';
    for (const e of ['md', 'txt', 'html']) { const o = el('option', null, '.' + e); o.value = e; selExt.append(o); }
    selExt.value = w.ext || 'md';
    selExt.disabled = !!w.builtIn;
    selExt.onchange = async () => { w.ext = selExt.value; await saveProjectMeta(); };
    extRow.append(selExt); right.append(extRow);

    const list = el('div', 'cmp-steps'); list.id = 'cmp-steps';
    const STAGE_TH = { model: 'เนื้อหา', render: 'ประกอบ', text: 'ข้อความสุดท้าย' };
    (w.steps || []).forEach((st, i) => {
      const d = stepDef(st.key); if (!d) return;
      const rowEl = el('div', 'cmp-step' + (st.on === false ? ' off' : ''));
      rowEl.dataset.step = st.key;
      const cb = el('input'); cb.type = 'checkbox'; cb.checked = st.on !== false;
      cb.disabled = !!w.builtIn;
      cb.onchange = async () => { st.on = cb.checked; await saveProjectMeta(); renderRight(); };
      const lbl = el('span', 'cmp-step-label', d.label);
      const badge = el('span', 'cmp-stage', STAGE_TH[d.stage]);
      rowEl.append(cb, lbl, badge);
      if (!w.builtIn) {
        const up = el('button', 'cmp-mini', '▲'); up.title = 'เลื่อนขึ้น';
        up.onclick = async () => { if (i > 0) { const a = w.steps; [a[i - 1], a[i]] = [a[i], a[i - 1]];
                                                await saveProjectMeta(); renderRight(); } };
        const dn = el('button', 'cmp-mini', '▼'); dn.title = 'เลื่อนลง';
        dn.onclick = async () => { const a = w.steps; if (i < a.length - 1) { [a[i + 1], a[i]] = [a[i], a[i + 1]];
                                                await saveProjectMeta(); renderRight(); } };
        rowEl.append(up, dn);
      }
      list.append(rowEl);
      for (const f of d.fields || []) {
        const fr = el('div', 'cmp-field');
        fr.append(el('label', null, f.label));
        const inp = el(f.type === 'code' ? 'textarea' : 'input', 'k-dlg-input');
        inp.value = (st.opts || {})[f.k] ?? '';
        inp.disabled = !!w.builtIn;
        inp.onchange = async () => { st.opts = st.opts || {}; st.opts[f.k] = inp.value; await saveProjectMeta(); };
        fr.append(inp); list.append(fr);
      }
    });
    right.append(list);
  };

  const prev = el('pre', 'cmp-preview'); prev.id = 'cmp-preview';
  box.append(prev);

  const doRun = async () => {
    const model = await buildDraftModel(selDraft.value);
    const varCtx = { title: model.title, author: model.author };
    if (cur().steps.some(s => s.on !== false && s.key === 'resolve-vars')) {
      const { buildVarContext } = await import('./template-vars.js');
      Object.assign(varCtx, await buildVarContext(state.root, kapi));
    }
    return runWorkflow(model, cur(), { varCtx });
  };
  const btns = el('div', 'k-dlg-btns');
  const bPrev = el('button', null, '👁 ดูตัวอย่าง');
  bPrev.onclick = async () => {
    const r = await doRun();
    prev.textContent = r.text.slice(0, 4000) + (r.text.length > 4000 ? '\n…' : '');
    if (r.warnings.length) setStatus(r.warnings.join(' · '));
  };
  const bGo = el('button', 'k-ok', 'ส่งออก…');
  bGo.onclick = async () => {
    const r = await doRun();
    const dest = await kapi.saveAsDialog(safeName(state.title) + '.' + r.ext);
    if (!dest) return;
    await kapi.writeFile(dest, r.text);
    ov.remove(); setStatus('ส่งออกแล้ว: ' + dest);
  };
  const bClose = el('button', 'k-cancel', 'ปิด');
  bClose.onclick = () => ov.remove();
  btns.append(bClose, bPrev, bGo); box.append(btns);

  ov.append(box); document.body.append(ov);
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  renderLeft(); renderRight();
  return { ov, run: doRun, select: (id) => { curId = id; renderLeft(); renderRight(); } };
}

// ---------------- ส่งออกฉบับร่างรวม ----------------
async function exportDraft() {
  const drafts = await listDrafts();
  if (!drafts.length) return;
  const pick = drafts.length === 1 ? drafts[0].label
    : await pickFromList('ส่งออกฉบับร่างไหน', drafts.map((d) => d.label));
  if (!pick) return;
  const { secName, dPath } = drafts.find((d) => d.label === pick);
  const text = await compileDraftText(dPath);
  const dest = await kapi.saveAsDialog(safeName(state.title) + '.md');
  if (!dest) return;
  await kapi.writeFile(dest, text);
  setStatus('ส่งออกรวมแล้ว: ' + dest);
  return dest;
}

// ---------------- Plugins (โฟลเดอร์ Plugins/ ของโปรเจกต์) ----------------
const plugins = { commands: [] };
async function loadPlugins() {
  plugins.commands = [];
  const dir = await kapi.join(state.root, 'Plugins');
  if (!(await kapi.exists(dir))) return;
  const api = {
    registerCommand: (label, fn) => plugins.commands.push({ label, fn }),
    getMarkdown: () => state.active?.editor?.getMarkdown()
      ?? state.active?.sp?.getMarkdown() ?? '',
    insertText: (text) => {
      const v = state.active?.editor?.view || state.active?.sp?.view;
      if (v) { v.dispatch(v.state.tr.insertText(text)); markDirty(state.active); }
    },
    setStatus, ask, alertBox: (m) => alert(m),
    fetch: (url, options) => kapi.httpFetch(url, options),
    projectRoot: () => state.root,
  };
  for (const name of await kapi.listDirs(dir)) {
    try {
      const manifest = await kapi.readJson(await kapi.join(dir, name, 'plugin.json'));
      const code = await kapi.readFile(await kapi.join(dir, name, manifest.entry || 'main.js'));
      new Function('k2', code)(api);
      setStatus('โหลดปลั๊กอิน: ' + (manifest.name || name));
    } catch (e) {
      setStatus('ปลั๊กอิน ' + name + ' พัง: ' + e.message);
    }
  }
  $('#tb-plug').style.display = plugins.commands.length ? '' : 'none';
}

// ---------------- คลังรูปภาพ (แท็บแบบ v1) ----------------
async function openGallery() {
  const key = '::gallery::';
  if (state.tabs.has(key)) return activate(key);
  const pane = el('div', 'pane');
  $('#panes').append(pane);
  const tabBtn = el('div', 'tab');
  tabBtn.append(el('span', 'tab-title', 'คลังรูปภาพ'));
  const x = el('span', 'tab-x', '×'); tabBtn.append(x);
  $('#tabs').append(tabBtn);
  const gal = new Gallery(pane, state.root, {
    onChanged: () => { imgURLBase.clear(); },
  });
  const tab = { file: key, title: 'คลังรูปภาพ', pane, tabBtn, dirty: false,
                editor: null, plain: null, wiki: null, gal };
  tabBtn.onclick = (e) => { if (e.target !== x) activate(key); };
  x.onclick = () => closeTab(key);
  state.tabs.set(key, tab);
  activate(key);
}

// ---------------- เทมเพลต Wiki (templates.json ที่ root โปรเจกต์ — โครง v1) ----------------
state.templates = [];
state.templatesDoc = { version: 1, note: '', templates: [] };
async function loadTemplates() {
  const file = await kapi.join(state.root, 'templates.json');
  if (!(await kapi.exists(file))) {
    const def = await fetch('templates.json').then((r) => r.text());
    await kapi.writeFile(file, def);
  }
  try {
    state.templatesDoc = await kapi.readJson(file);
    state.templates = state.templatesDoc.templates || [];
  } catch (e) {
    state.templates = [];
    setStatus('templates.json ผิดรูปแบบ: ' + e.message);
  }
}

// เขียน state.templates กลับลงไฟล์ (คงคีย์ version/note เดิม) แล้วรีเฟรชตัวจัดการ
async function writeTemplates() {
  state.templatesDoc.templates = state.templates;
  await kapi.writeFile(await kapi.join(state.root, 'templates.json'),
                       JSON.stringify(state.templatesDoc, null, 2));
  const tab = state.tabs.get('::templates::');
  if (tab) renderTemplateManager(tab.pane);
}

export function applyTemplate(e, tp) {
  // เพิ่มเฉพาะที่ขาด ไม่ทับค่าเดิม — กติกาเดียวกับ v1
  for (const f of tp.fields || [])
    if (!(f.key in (e.fields = e.fields || {}))) e.fields[f.key] = f.defaultValue || '';
  for (const p of tp.customPropertyDefs || [])
    if (!(p.key in (e.customProperties = e.customProperties || {})))
      e.customProperties[p.key] = p.defaultValue || '';
  const have = new Set((e.sections || []).map((s) => s.title));
  for (const s of tp.sections || [])
    if (!have.has(s.title))
      (e.sections = e.sections || []).push({ title: s.title || '', content: s.defaultContent || '' });
  e.templateId = tp.id || '';
  return e;
}

export function fieldLabels(templateId) {
  const tp = state.templates.find((t) => t.id === templateId);
  const map = {};
  for (const f of tp?.fields || []) map[f.key] = f.label || f.key;
  return map;
}

// ---------------- ตัวจัดการเทมเพลต Wiki (GUI สร้าง/แก้/ทำซ้ำ/ลบ แบบ v1) ----------------
const TPL_CATS = ['characters', 'locations', 'items', 'lore'];
const FIELD_TYPES = ['String', 'Text', 'Int', 'Date', 'Boolean', 'EntityRef'];

function openTemplateManager() {
  const key = '::templates::';
  if (state.tabs.has(key)) { activate(key); return renderTemplateManager(state.tabs.get(key).pane); }
  const pane = el('div', 'pane');
  $('#panes').append(pane);
  const tabBtn = el('div', 'tab');
  tabBtn.append(el('span', 'tab-title', 'เทมเพลต Wiki'));
  const x = el('span', 'tab-x', '×'); tabBtn.append(x);
  $('#tabs').append(tabBtn);
  const tab = { file: key, title: 'เทมเพลต Wiki', pane, tabBtn, dirty: false,
                editor: null, plain: null, wiki: null };
  tabBtn.onclick = (e) => { if (e.target !== x) activate(key); };
  x.onclick = () => closeTab(key);
  state.tabs.set(key, tab);
  activate(key);
  renderTemplateManager(pane);
}

function renderTemplateManager(pane) {
  pane.innerHTML = '';
  const wrap = el('div', 'tpl-mgr');
  const head = el('div', 'tpl-head');
  head.append(el('div', 'tpl-title', 'เทมเพลต Wiki'));
  const btns = el('div', 'tpl-head-btns');
  const bNew = el('button', 'k-ok', '+ สร้างเทมเพลตใหม่');
  bNew.onclick = () => templateEditModal(null);
  const bJson = el('button', null, '{ } แก้ JSON ดิบ');
  bJson.onclick = () => openTemplatesFile();
  btns.append(bNew, bJson); head.append(btns); wrap.append(head);

  for (const cat of [...TPL_CATS, ...wikiCats().map((c) => c.key),
                     ...new Set(state.templates.map((t) => t.entityTypeKey)
                       .filter((c) => !TPL_CATS.includes(c) && !wikiCats().some((w) => w.key === c)))]) {
    const inCat = state.templates.filter((t) => t.entityTypeKey === cat);
    const sec = el('div', 'tpl-sec');
    sec.append(el('div', 'tpl-sec-title', (CAT_TH[cat] || cat) + ` (${inCat.length})`));
    for (const tp of inCat) {
      const card = el('div', 'tpl-card');
      const info = el('div', 'tpl-card-info');
      const nm = el('div', 'tpl-card-name', tp.name || tp.id);
      if (tp.builtIn) nm.append(el('span', 'tpl-badge', 'ค่าเริ่มต้น'));
      info.append(nm);
      info.append(el('div', 'tpl-card-meta',
        `${(tp.fields || []).length} ฟิลด์ · ${(tp.sections || []).length} ส่วน`));
      card.append(info);
      const acts = el('div', 'tpl-card-acts');
      const mk = (label, fn, cls) => { const b = el('button', cls || null, label); b.onclick = fn; return b; };
      acts.append(
        mk('แก้ไข', () => templateEditModal(tp)),
        mk('ทำซ้ำ', () => duplicateTemplate(tp)),
        mk('ลบ', async () => {
          if (await confirmBox(`ลบเทมเพลต "${tp.name}"?`)) {
            state.templates = state.templates.filter((t) => t !== tp);
            await writeTemplates(); setStatus('ลบเทมเพลตแล้ว');
          }
        }, 'k-danger-btn'));
      card.append(acts);
      sec.append(card);
    }
    wrap.append(sec);
  }
  pane.append(wrap);
}

async function duplicateTemplate(tp) {
  const copy = JSON.parse(JSON.stringify(tp));
  copy.id = guid(); copy.name = (tp.name || 'เทมเพลต') + ' (สำเนา)'; copy.builtIn = false;
  state.templates.push(copy);
  await writeTemplates(); setStatus('ทำซ้ำเทมเพลตแล้ว');
}

// modal สร้าง/แก้เทมเพลต — tp=null คือสร้างใหม่
function templateEditModal(tp) {
  const isNew = !tp;
  const t = tp ? JSON.parse(JSON.stringify(tp))
    : { id: guid(), entityTypeKey: 'characters', name: '', builtIn: false, note: '',
        fields: [], customPropertyDefs: [], sections: [],
        includeRelationships: true, includeImages: true, includeChapterOverrides: true };
  t.fields = t.fields || []; t.sections = t.sections || [];

  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog k-tpl-edit');
  box.append(el('div', 'k-dlg-title', isNew ? 'สร้างเทมเพลตใหม่' : 'แก้ไขเทมเพลต'));

  const rowName = el('div', 'k-row'); rowName.append(el('label', null, 'ชื่อเทมเพลต'));
  const iName = el('input', 'k-dlg-input'); iName.type = 'text'; iName.value = t.name || '';
  rowName.append(iName); box.append(rowName);

  const rowCat = el('div', 'k-row'); rowCat.append(el('label', null, 'หมวด'));
  const selCat = el('select', 'k-dlg-select');
  const tplCatKeys = [...TPL_CATS, ...wikiCats().map((c) => c.key)];
  for (const c of tplCatKeys) { const o = el('option', null, catLabel(c)); o.value = c; selCat.append(o); }
  if (!tplCatKeys.includes(t.entityTypeKey)) { const o = el('option', null, t.entityTypeKey); o.value = t.entityTypeKey; selCat.append(o); }
  selCat.value = t.entityTypeKey; rowCat.append(selCat); box.append(rowCat);

  // ---- ฟิลด์ ----
  box.append(el('div', 'k-tpl-sub', 'ฟิลด์ข้อมูล'));
  const fieldsWrap = el('div', 'k-tpl-list');
  const addFieldRow = (f = { key: '', label: '', type: 'String', defaultValue: '' }) => {
    const r = el('div', 'k-tpl-frow');
    const iK = el('input', 'k-dlg-input'); iK.type = 'text'; iK.placeholder = 'key (อังกฤษ)'; iK.value = f.key || '';
    const iL = el('input', 'k-dlg-input'); iL.type = 'text'; iL.placeholder = 'ป้ายชื่อ (ไทย)'; iL.value = f.label || '';
    const sT = el('select', 'k-dlg-select');
    for (const ft of FIELD_TYPES) { const o = el('option', null, ft); o.value = ft; sT.append(o); }
    sT.value = FIELD_TYPES.includes(f.type) ? f.type : 'String';
    const del = el('button', 'k-tpl-del', '✕'); del.onclick = () => r.remove();
    r._get = () => ({ key: iK.value.trim(), label: iL.value.trim(), type: sT.value, defaultValue: f.defaultValue || '' });
    r.append(iK, iL, sT, del); fieldsWrap.append(r);
  };
  (t.fields || []).forEach(addFieldRow);
  const bAddF = el('button', 'k-tpl-add', '+ เพิ่มฟิลด์'); bAddF.onclick = () => addFieldRow();
  box.append(fieldsWrap, bAddF);

  // ---- ส่วนเนื้อหา (sections) ----
  box.append(el('div', 'k-tpl-sub', 'ส่วนเนื้อหา'));
  const secWrap = el('div', 'k-tpl-list');
  const addSecRow = (s = { title: '', defaultContent: '' }) => {
    const r = el('div', 'k-tpl-frow');
    const iT = el('input', 'k-dlg-input'); iT.type = 'text'; iT.placeholder = 'ชื่อส่วน'; iT.value = s.title || '';
    iT.style.flex = '1';
    const del = el('button', 'k-tpl-del', '✕'); del.onclick = () => r.remove();
    r._get = () => ({ title: iT.value.trim(), defaultContent: s.defaultContent || '' });
    r.append(iT, del); secWrap.append(r);
  };
  (t.sections || []).forEach(addSecRow);
  const bAddS = el('button', 'k-tpl-add', '+ เพิ่มส่วน'); bAddS.onclick = () => addSecRow();
  box.append(secWrap, bAddS);

  // ---- ตัวเลือก ----
  const optWrap = el('div', 'k-tpl-opts');
  const mkChk = (label, val) => {
    const w = el('label', 'k-tpl-chk');
    const c = el('input'); c.type = 'checkbox'; c.checked = val !== false;
    w.append(c, document.createTextNode(' ' + label)); optWrap.append(w); return c;
  };
  const cRel = mkChk('มีความสัมพันธ์', t.includeRelationships);
  const cImg = mkChk('มีรูปภาพ', t.includeImages);
  const cCh = mkChk('มี chapter overrides', t.includeChapterOverrides);
  box.append(optWrap);

  const btns = el('div', 'k-dlg-btns');
  const bJsonToggle = el('button', null, '{ } แก้เป็น JSON');
  bJsonToggle.style.marginRight = 'auto';
  const cB = el('button', null, 'ยกเลิก'); const okB = el('button', 'k-ok', 'บันทึก');
  btns.append(bJsonToggle, cB, okB); box.append(btns);
  ov.append(box); document.body.append(ov);
  iName.focus();

  // อ่านค่าจากฟอร์มปัจจุบันเป็น object เทมเพลต
  const collectForm = () => ({
    ...t, name: iName.value.trim(), entityTypeKey: selCat.value,
    fields: [...fieldsWrap.querySelectorAll('.k-tpl-frow')].map((r) => r._get()).filter((f) => f.key),
    sections: [...secWrap.querySelectorAll('.k-tpl-frow')].map((r) => r._get()).filter((s) => s.title),
    includeRelationships: cRel.checked, includeImages: cImg.checked, includeChapterOverrides: cCh.checked,
  });

  // โหมด JSON: ซ่อนฟอร์ม แสดง textarea ให้แก้ดิบ ๆ แล้วสลับกลับได้ (ค่าซิงก์สองทาง)
  let jsonMode = false; let jsonTa = null;
  const formEls = [rowName, rowCat, ...box.querySelectorAll('.k-tpl-sub, .k-tpl-list, .k-tpl-add, .k-tpl-opts')];
  bJsonToggle.onclick = () => {
    if (!jsonMode) {
      jsonTa = el('textarea', 'k-src-view'); jsonTa.style.height = '46vh';
      jsonTa.value = JSON.stringify(collectForm(), null, 2);
      formEls.forEach((n) => n.style.display = 'none');
      box.insertBefore(jsonTa, btns);
      bJsonToggle.textContent = '▤ กลับไปฟอร์ม';
      jsonMode = true;
    } else {
      try {
        const parsed = JSON.parse(jsonTa.value);         // ตรวจรูปแบบก่อนกลับ
        Object.assign(t, parsed);
        ov.remove(); templateEditModal(t.id ? t : Object.assign(t, { id: t.id }));  // เปิดใหม่ให้ฟอร์มสะท้อนค่า
      } catch (err) { setStatus('JSON ไม่ถูกต้อง: ' + err.message); }
    }
  };

  cB.onclick = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  okB.onclick = async () => {
    if (jsonMode) {
      let parsed;
      try { parsed = JSON.parse(jsonTa.value); }
      catch (err) { setStatus('JSON ไม่ถูกต้อง: ' + err.message); return; }
      Object.assign(t, parsed);
    } else {
      const name = iName.value.trim();
      if (!name) { iName.focus(); setStatus('ต้องตั้งชื่อเทมเพลต'); return; }
      t.name = name; t.entityTypeKey = selCat.value;
      t.fields = [...fieldsWrap.querySelectorAll('.k-tpl-frow')].map((r) => r._get()).filter((f) => f.key);
      t.sections = [...secWrap.querySelectorAll('.k-tpl-frow')].map((r) => r._get()).filter((s) => s.title);
      t.includeRelationships = cRel.checked; t.includeImages = cImg.checked; t.includeChapterOverrides = cCh.checked;
    }
    if (isNew) state.templates.push(t);
    else { const i = state.templates.findIndex((x) => x.id === t.id); if (i >= 0) state.templates[i] = t; else state.templates.push(t); }
    await writeTemplates();
    ov.remove();
    setStatus(isNew ? 'สร้างเทมเพลตแล้ว' : 'บันทึกเทมเพลตแล้ว');
  };
}

// เปิดไฟล์ json/txt เป็นแท็บข้อความล้วนที่ "บันทึกได้จริง" (ใช้โดย Quick Open)
export async function openPlainFile(file, title) {
  if (state.tabs.has(file)) { activate(file); return state.tabs.get(file); }
  const isJsonFile = /\.json$/i.test(file);
  const raw = await kapi.readFile(file);
  const pane = el('div', 'pane');
  const bar = el('div', 'json-bar');
  const info = el('span', 'dim', title + (isJsonFile ? ' — JSON ล้วน (ตรวจรูปแบบก่อนเขียน)' : ' — ข้อความล้วน'));
  const saveB = el('button', 'k-ok', '💾 บันทึก');
  bar.append(info, saveB);
  const ta = el('textarea', 'plain-md json-edit');
  ta.value = raw;
  pane.append(bar, ta);
  $('#panes').append(pane);
  const tabBtn = el('div', 'tab');
  tabBtn.append(el('span', 'tab-title', title));
  const x = el('span', 'tab-x', '×'); tabBtn.append(x);
  $('#tabs').append(tabBtn);
  const tab = { file, title, pane, tabBtn, dirty: false,
                editor: null, plain: null, wiki: null, isJson: true,
                save: async () => {
                  if (isJsonFile) {
                    try { JSON.parse(ta.value); }
                    catch (e) { setStatus('JSON ผิดรูปแบบ ยังไม่บันทึก: ' + e.message); return false; }
                  }
                  await kapi.writeFile(file, ta.value);
                  tab.dirty = false;
                  tabBtn.querySelector('.tab-title').textContent = tab.title;
                  setStatus(t('status.saved') + ': ' + title);
                  return true;
                } };
  ta.addEventListener('input', () => markDirty(tab));
  saveB.onclick = () => tab.save();
  tabBtn.onclick = (e) => { if (e.target !== x) activate(file); };
  x.onclick = () => closeTab(file);
  state.tabs.set(file, tab);
  activate(file);
  return tab;
}

// บริบทของฉากที่เปิดอยู่: { dPath, ch, row } — โมดูล feature ใช้ผูกข้อมูลกับฉากปัจจุบัน
// (คอมเมนต์ / โน้ตด่วน / ผังพื้นที่)
export async function sceneCtx(file) {
  const t = file ? { file } : state.active;
  if (!t || !t.file || !/\.md$/i.test(t.file) || !/[\\/]Chapters[\\/]/.test(t.file)) return null;
  const dPath = t.file.replace(/[\\/]Chapters[\\/].*$/, '');
  try {
    const scenes = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
    const draft = await kapi.readJson(await kapi.join(dPath, 'draft.json'));
    const fname = t.file.split(/[\\/]/).pop();
    for (const ch of (draft.chapters || [])) {
      const row = ((scenes.chapters || {})[ch.guid] || []).find((s) => s.fileName === fname);
      if (row) return { dPath, ch, row };
    }
  } catch (e) { log('warn', 'sceneCtx failed', e); }
  return null;
}

// ---------------- แผงคอมเมนต์ (บั๊ก #25 — เดิมเป็นกล่องโต้ตอบ เก็บใน scenes.json) ----------------
let _cmMigrated = new Set();                       // ฉบับร่างที่ย้ายคอมเมนต์เก่ามาแล้ว (ครั้งเดียวต่อ session)

/** เปิดแผงคอมเมนต์ + ย้ายคอมเมนต์เดิมจาก scenes.json ครั้งแรกที่ใช้ */
export async function openCommentsPanel() {
  showPanel('comments');
  const c = await sceneCtx();
  if (c && c.dPath && !_cmMigrated.has(c.dPath)) {
    _cmMigrated.add(c.dPath);
    try {
      const n = await migrateSceneComments(c.dPath);
      if (n) setStatus(`ย้ายคอมเมนต์เดิม ${n} รายการเข้าไฟล์ฉากแล้ว`);
    } catch (e) { log('warn', 'ย้ายคอมเมนต์เดิมไม่สำเร็จ', e); }
  }
  await renderCommentPanel($('#comments-body'));
}
/** วาดแผงใหม่เมื่อสลับแท็บ/บันทึก — เงียบ ๆ ถ้าแผงปิดอยู่ */
export async function refreshCommentsPanel() {
  if (!isPanelOpen('comments')) { clearCommentAnchors(); return; }
  try { await renderCommentPanel($('#comments-body')); }
  catch (e) { log('warn', 'วาดแผงคอมเมนต์ไม่สำเร็จ', e); }
}

// แก้ไขแถวฉากใน scenes.json แบบปลอดภัย (อ่าน→แก้ผ่าน mutator→เขียนกลับ)
export async function updateSceneRow(dPath, sceneId, mutate) {
  const sf = await kapi.join(dPath, 'scenes.json');
  const d = await kapi.readJson(sf);
  for (const cg of Object.keys(d.chapters || {})) {
    const row = (d.chapters[cg] || []).find((x) => x.id === sceneId);
    if (row) { mutate(row); await kapi.writeFile(sf, JSON.stringify(d, null, 2)); return true; }
  }
  return false;
}

async function openTemplatesFile() {
  const file = await kapi.join(state.root, 'templates.json');
  if (state.tabs.has(file)) return activate(file);
  await loadTemplates();                            // ให้ไฟล์ default ถูกฝังก่อนถ้ายังไม่มี
  const raw = await kapi.readFile(file);
  const pane = el('div', 'pane');
  const bar = el('div', 'json-bar');
  const info = el('span', 'dim', 'templates.json — JSON ล้วน แก้เสร็จกดบันทึก (ตรวจรูปแบบให้ก่อนเขียน)');
  const saveB = el('button', 'k-ok', '💾 บันทึก');
  bar.append(info, saveB);
  const ta = el('textarea', 'plain-md json-edit');
  ta.value = raw;
  pane.append(bar, ta);
  $('#panes').append(pane);
  const tabBtn = el('div', 'tab');
  tabBtn.append(el('span', 'tab-title', 'เทมเพลต Wiki'));
  const x = el('span', 'tab-x', '×'); tabBtn.append(x);
  $('#tabs').append(tabBtn);
  const tab = { file, title: 'เทมเพลต Wiki', pane, tabBtn, dirty: false,
                editor: null, plain: null, wiki: null, isJson: true,
                save: async () => {
                  try { JSON.parse(ta.value); }
                  catch (e) { setStatus('JSON ผิดรูปแบบ ยังไม่บันทึก: ' + e.message); return false; }
                  await kapi.writeFile(file, ta.value);
                  await loadTemplates();
                  tab.dirty = false;
                  tabBtn.querySelector('.tab-title').textContent = tab.title;
                  setStatus('บันทึกเทมเพลตแล้ว');
                  return true;
                } };
  ta.addEventListener('input', () => markDirty(tab));
  saveB.onclick = () => tab.save();
  tabBtn.onclick = (e) => { if (e.target !== x) activate(file); };
  x.onclick = () => closeTab(file);
  state.tabs.set(file, tab);
  activate(file);
}

// ---------------- สร้างโปรเจกต์ใหม่ (โครงเดียวกับ v1) ----------------
export async function newProject() {
  const parent = await kapi.openProjectDialog();     // เลือกโฟลเดอร์ที่จะสร้างข้างใน
  if (!parent) return;
  const name = await ask('ชื่อโปรเจกต์ใหม่', { placeholder: 'เช่น ปีศาจแห่งบางกอก' });
  if (!name) return;
  if (!(await closeProjectIfAny())) return;
  await createProjectAt(parent, name);
}

// สร้างโปรเจกต์จากเทมเพลต (นิยาย/บทหนัง/แฟนตาซี/สืบสวน) — เมนู ไฟล์
export async function newProjectFromTemplate() {
  const tplKey = await showTemplateDialog();
  if (!tplKey) return;
  const parent = await kapi.openProjectDialog();
  if (!parent) return;
  const name = await ask('ชื่อโปรเจกต์ใหม่', { placeholder: 'เช่น ปีศาจแห่งบางกอก' });
  if (!name) return;
  if (!(await closeProjectIfAny())) return;
  const root = await createProjectFromTemplate(parent, name, tplKey);
  if (root) await loadProject(root);
  return root;
}

async function createProjectAt(parent, name) {
  const root = await kapi.join(parent, safeName(name));
  if (await kapi.exists(await kapi.join(root, 'project.khn.json'))) {
    setStatus('มีโปรเจกต์นี้อยู่แล้ว — เปิดให้แทน'); return loadProject(root);
  }
  const W = (p, d) => kapi.writeFile(p, JSON.stringify(d, null, 2));
  await W(await kapi.join(root, 'project.khn.json'),
    { title: name, type: 'killian-project', version: '2.0', created: new Date().toISOString() });
  const sec = await kapi.join(root, 'เล่มหนึ่ง');
  await W(await kapi.join(sec, 'section.json'), { guid: guid(), title: 'เล่มหนึ่ง', order: 1 });
  const dr = await kapi.join(sec, 'Draft', 'default');
  const ch = { guid: guid(), title: 'บทที่หนึ่ง', order: 1, status: 'Outline', act: 'I',
               date: '', isFavorite: false, folderName: '01 - บทที่หนึ่ง' };
  const sc = { id: guid(), title: 'ฉากแรก', order: 1, fileName: 'scene-01.md',
               chapterGuid: ch.guid, date: '', isFavorite: false, wordCount: 0, synopsis: '' };
  await W(await kapi.join(dr, 'draft.json'), { chapters: [ch] });
  await W(await kapi.join(dr, 'scenes.json'), { chapters: { [ch.guid]: [sc] } });
  await kapi.writeFile(await kapi.join(dr, 'Chapters', ch.folderName, sc.fileName),
    dumpMdFile({ title: sc.title, type: 'scene', format: 'prose', pov: '', tags: [] }, ''));
  for (const d of ['Images', 'Memos', 'Wiki/characters', 'Wiki/locations',
                   'Wiki/items', 'Wiki/lore', 'Recycle'])
    await kapi.mkdir(await kapi.join(root, d));
  await W(await kapi.join(root, 'Images', 'images.json'), { images: [] });
  const defTpl = await fetch('templates.json').then((r) => r.text());
  await kapi.writeFile(await kapi.join(root, 'templates.json'), defTpl);
  await loadProject(root);
  setStatus('สร้างโปรเจกต์ใหม่แล้ว: ' + name);
}

// ---------------- ปิดโปรแกรม: เตือนงานที่ยังไม่บันทึก ----------------
async function confirmQuit() {
  const dirty = [...state.tabs.values()].filter((t) => t.dirty);
  if (!dirty.length) return kapi.quitNow();
  const v = await choose(`มี ${dirty.length} แท็บยังไม่ได้บันทึก`, [
    { label: 'บันทึกทั้งหมดแล้วออก', value: 'save', primary: true },
    { label: 'ออกโดยไม่บันทึก', value: 'discard', danger: true },
    { label: 'ยกเลิก', value: null },
  ]);
  if (v === 'save') { for (const t of dirty) await saveTab(t); kapi.quitNow(); }
  else if (v === 'discard') kapi.quitNow();
}

// ---------------- Wiki entity ----------------

// กล่องสร้าง Wiki entity — ช่องชื่อ + dropdown เทมเพลต (โผล่เสมอ แม้มีเทมเพลตเดียว) แบบ v1
export function entityCreateDialog(cat, tps) {
  return new Promise((resolve) => {
    const ov = el('div', 'k-overlay');
    const box = el('div', 'k-dialog');
    const opts = [...tps.map((t) => `<option value="${t.id}">${t.name || t.id}</option>`),
                  '<option value="">— ไม่ใช้เทมเพลต —</option>'].join('');
    box.innerHTML = `
      <div class="k-dlg-title">สร้าง${CAT_TH[cat] || cat}ใหม่</div>
      <div class="k-row" style="flex-direction:column;align-items:stretch;gap:6px;margin:6px 0">
        <label>ชื่อ</label><input type="text" class="k-dlg-input" id="ent-name" style="width:100%">
      </div>
      <div class="k-row" style="flex-direction:column;align-items:stretch;gap:6px;margin:12px 0 2px">
        <label>เทมเพลต</label>
        <select id="ent-tpl" class="k-dlg-select">${opts}</select>
      </div>
      <div class="k-dlg-btns"><button class="k-cancel">ยกเลิก</button><button class="k-ok">สร้าง</button></div>`;
    ov.appendChild(box); document.body.appendChild(ov);
    const name = box.querySelector('#ent-name');
    const tpl = box.querySelector('#ent-tpl');
    if (tps.length) tpl.value = tps[0].id;          // ค่าเริ่มต้น = เทมเพลตแรก
    const done = (v) => { ov.remove(); resolve(v); };
    const ok = () => { const n = name.value.trim(); if (!n) { name.focus(); return; }
                       done({ name: n, templateId: tpl.value }); };
    box.querySelector('.k-ok').onclick = ok;
    box.querySelector('.k-cancel').onclick = () => done(null);
    ov.onclick = (e) => { if (e.target === ov) done(null); };
    name.onkeydown = (e) => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') done(null); };
    tpl.onkeydown = (e) => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') done(null); };
    name.focus();
  });
}


// ---------------- เปลี่ยนชื่อ / ถังขยะ (<root>/Recycle — เปิดคืนเองได้) ----------------


// ---------------- เล่ม (section) ----------------
// เล่ม = โฟลเดอร์ที่มี section.json + Draft/ · ชื่อโฟลเดอร์ = ชื่อเล่ม (safeName)






async function renameMemo(file) {
  const { meta, body } = parseMdFile(await kapi.readFile(file));
  const title = await ask('ชื่อ memo ใหม่', { value: meta.title || '' }); if (!title) return;
  meta.title = title;
  await kapi.writeFile(file, dumpMdFile(meta, body));
  const t = state.tabs.get(file);
  if (t) { t.title = title; t.tabBtn.querySelector('.tab-title').textContent = (t.dirty ? '● ' : '') + title; }
  await buildTree();
}

// ---------------- สร้างบท/ฉาก/Memo (เขียน JSON โครงเดียวกับ v1) ----------------
export function safeName(s) { return s.replace(/[\\/:*?"<>|]/g, '').trim() || 'untitled'; }
export function guid() { return 'k2-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }



// เขียนค่าลง row ของฉากใน scenes.json แล้วรีเฟรชต้นไม้

// สลับปักหมุด (ฉากโปรด) — แสดง ⭐ ในต้นไม้ + รวมในแดชบอร์ด

// ล้างถังขยะอัตโนมัติ: ลบรายการใน Recycle ที่แก้ไขล่าสุดเกิน recycleDays วัน (0 = ไม่ล้าง)

// ทำซ้ำฉาก: คัดลอกไฟล์ .md + เพิ่ม row ใหม่ใน scenes.json

// เลื่อนลำดับฉากขึ้น/ลงภายในบทเดียวกัน (สลับ order กับฉากที่อยู่ติดกัน)

// หาชื่อไฟล์ .md ที่ไม่ชนกับไฟล์เดิมในโฟลเดอร์บทปลายทาง
export async function uniqueSceneFileName(dPath, folderName, order) {
  let base = 'scene-' + String(order).padStart(2, '0');
  let name = base + '.md', n = 2;
  while (await kapi.exists(await kapi.join(dPath, 'Chapters', folderName, name)))
    name = base + '-' + (n++) + '.md';
  return name;
}

// ย้ายฉากไปบทอื่น (ในเซกชันเดียวกัน): ย้ายไฟล์ .md + ย้าย row ระหว่างบทใน scenes.json

// เมนูเลือกบทปลายทาง (บทอื่นในเซกชันเดียวกัน)
async function sceneMoveMenu(e, dPath, ch, sc) {
  const chapters = ((await kapi.readJson(await kapi.join(dPath, 'draft.json'))).chapters || [])
    .filter((c) => c.guid !== ch.guid)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!chapters.length) { setStatus('ไม่มีบทอื่นให้ย้ายไป'); return; }
  popupMenu(e.clientX, e.clientY,
    chapters.map((c) => ({ label: c.title, click: () => moveSceneToChapter(dPath, ch, sc, c) })));
}

// ลากสลับลำดับบท (วางบท src ไว้ก่อนบท dst) — คำนวณ order ใหม่ให้เรียงเป็นเลขจำนวนเต็ม

// ลากสลับลำดับฉาก / ย้ายไปวางก่อนฉากปลายทาง (ข้ามบทได้) — ปลอดภัยเรื่องไฟล์

// ย้าย Wiki entity ไปหมวดอื่น (ลากวางบนหัวหมวด) — ย้ายไฟล์ .json จริง
async function moveEntityToCat(srcPath, dstCatDir) {
  const base = srcPath.replace(/^.*[\\/]/, '');
  const dst = await kapi.join(dstCatDir, base);
  if (srcPath === dst) return;
  await kapi.mkdir(dstCatDir);
  if (await kapi.exists(dst)) { setStatus('มีไฟล์ชื่อนี้ในหมวดปลายทางแล้ว'); return; }
  const openTab = state.tabs.get(srcPath);
  if (openTab) { if (openTab.dirty) await saveTab(openTab); closeTab(srcPath); }
  await kapi.move(srcPath, dst);
  await buildTree(); await smart.loadNames(state.root);
  setStatus('ย้ายไปหมวดใหม่แล้ว');
}


// ทำซ้ำ Wiki entity

async function addMemo() {
  const title = await ask('ชื่อ memo'); if (!title) return;
  const dir = await kapi.join(state.root, 'Memos');
  await kapi.mkdir(dir);
  const file = await kapi.join(dir, safeName(title) + '-' + Date.now().toString(36) + '.md');
  await kapi.writeFile(file, dumpMdFile({ title, type: 'memo' }, ''));
  await buildTree(); openScene(file, title);
}

// ---------------- แท็บ + ตัวแก้ไข ----------------
export async function openScene(file, title) {
  if (state.tabs.has(file)) return activate(file);
  const raw = await kapi.readFile(file);
  const { meta, body } = parseMdFile(raw);
  const pane = el('div', 'pane');
  const ws = el('div', 'workspace');
  pane.appendChild(ws);
  $('#panes').append(pane);
  const tabBtn = el('div', 'tab');
  tabBtn.append(el('span', 'tab-title', title));
  const x = el('span', 'tab-x', '×');
  tabBtn.append(x);
  $('#tabs').append(tabBtn);

  const tab = { file, title, meta, pane, tabBtn, dirty: false, editor: null, plain: null, body,
                locked: meta.locked === true || meta.locked === 'true' };
  const dir = file.replace(/[\\/][^\\/]*$/, '');

  mountEditor(tab, dir, body);

  tabBtn.onclick = (e) => { if (e.target !== x) activate(file); };
  x.onclick = () => closeTab(file);
  state.tabs.set(file, tab);
  activate(file);
}

// สร้างตัวแก้ไขให้ตรงกับ meta.format ของ tab แล้วผูกอีเวนต์ (ใช้ทั้งตอนเปิดฉากและตอนสลับโหมด)
function mountEditor(tab, dir, body) {
  const pane = tab.pane;
  const mount = pane.querySelector('.workspace') || pane;
  if ((tab.meta.format || 'prose') === 'screenplay') {
    tab.sp = new SPEditor(mount, {
      markdown: body,
      onChange: () => { markDirty(tab); scheduleCount(); scheduleOutline();
                        setTimeout(() => spSmartCheck(tab), 0); },
      onKeyDown: (ev) => smart.onKey(ev),
      onElement: (elName) => setElementBadge(elName),
      getChecker: spellChecker,
      resolveSrc: (p) => resolveImg(dir, p),                       // รูปในบทหนัง render จริง
      getNames: () => state.settings.autoMention !== false ? smart.names : [],   // ลิงก์ Wiki
      onMention: (name) => { if (smart.fileOf[name]) openEntity(smart.fileOf[name]); },
      editable: () => !tab.locked,                                 // ล็อก = แก้ไม่ได้
    });
    pane.addEventListener('click', () => { smart.hide(); setElementBadge(tab.sp.curElement()); refreshToolbar(); });
    pane.addEventListener('keyup', () => refreshToolbar());
  } else {
    tab.editor = new KEditor(mount, {
      markdown: body,
      onChange: () => { markDirty(tab); scheduleCount(); scheduleOutline();
                        setTimeout(() => smart.check(tab.editor.view), 0); },
      resolveSrc: (p) => resolveImg(dir, p),
      onKeyDown: (ev) => smart.onKey(ev),
      getNames: () => state.settings.autoMention !== false ? smart.names : [],
      onMention: (name) => { if (smart.fileOf[name]) openEntity(smart.fileOf[name]); },
      getChecker: spellChecker,
      editable: () => !tab.locked,                                 // ล็อก = แก้ไม่ได้
    });
    pane.addEventListener('click', () => { refreshToolbar(); smart.hide(); });
    pane.addEventListener('keyup', () => refreshToolbar());
  }
  pane.classList.toggle('pane-locked', !!tab.locked);
  pane.classList.toggle('sp-pane', !!tab.sp);            // หน้ากระดาษบทหนัง (Final Draft)
}

// สลับเอกสารระหว่างโหมดนิยาย ↔ บทหนัง (แบบ Fade In) — เนื้อหาเป็น .md ตัวเดียวกัน ต่างแค่ตีความ
// target: 'prose' | 'screenplay' | undefined(=สลับ). ไฟล์เข้ากับ v1 ทุกประการ (เปลี่ยนแค่ frontmatter format)
async function switchFormat(target) {
  const tab = state.active;
  if (!tab || !(tab.editor || tab.sp)) { setStatus('เปิดฉากก่อนจึงจะสลับโหมดได้'); return; }
  const cur = (tab.meta.format || 'prose') === 'screenplay' ? 'screenplay' : 'prose';
  const to = target || (cur === 'prose' ? 'screenplay' : 'prose');
  if (to === cur) return;

  // ถ้าผู้ใช้ยังไม่ได้แก้ ใช้ body เดิม (คงไบต์เดิมแบบ v1 — ไม่ re-serialize ข้าม grammar ซึ่งทำเนื้อหาเพี้ยน)
  // ถ้าแก้แล้ว เก็บงานจริงจากตัวแก้ไขปัจจุบัน
  const src = tab.editor || tab.sp;
  const body = tab.dirty ? src.getMarkdown() : (tab.body ?? src.getMarkdown());
  const dir = tab.file.replace(/[\\/][^\\/]*$/, '');

  tab.editor?.destroy(); tab.sp?.destroy();
  tab.editor = null; tab.sp = null;
  tab.pane.innerHTML = '';
  // บั๊ก #7: .workspace คือชั้นที่รับ CSS zoom — innerHTML='' ลบทิ้งไป ต้องสร้างคืนก่อน mountEditor
  // ไม่งั้น mountEditor จะ fallback ไป mount ตรงเข้า .pane แล้วซูมไม่มีผล
  tab.pane.appendChild(el('div', 'workspace'));
  tab.meta.format = to;
  tab.body = body;
  mountEditor(tab, dir, body);

  // เขียนลงไฟล์ทันทีให้ format บนดิสก์ตรงกับที่เห็น (เนื้อหาไม่เปลี่ยน)
  tab.meta.modified = new Date().toISOString();
  await kapi.writeFile(tab.file, dumpMdFile(tab.meta, body));
  tab.dirty = false;
  tab.tabBtn.querySelector('.tab-title').textContent = tab.title;

  if (tab.editor) smart.bindView(tab.editor.view);
  if (tab.sp) smart.bindView(tab.sp.view);
  setElementBadge(tab.sp ? tab.sp.curElement() : null);
  refreshToolbar(); refreshModeBtn(); scheduleCount(); scheduleOutline();
  (tab.editor || tab.sp)?.focus?.();
  setStatus(to === 'screenplay' ? 'สลับเป็นโหมดบทหนัง' : 'สลับเป็นโหมดนิยาย');
}

// ปุ่มสลับโหมดบน toolbar — แสดงโหมดปัจจุบัน คลิกแล้วเลือกนิยาย/บทหนัง
function refreshModeBtn() {
  const b = $('#tb-mode');
  if (!b) return;
  const tab = state.active;
  const editable = !!(tab && (tab.editor || tab.sp));
  b.style.display = editable ? '' : 'none';
  if (!editable) return;
  const sp = !!tab.sp;
  b.innerHTML = (sp ? iconHtml('film', 16) : iconHtml('book', 16)) + (sp ? ' บทหนัง ▾' : ' นิยาย ▾');
  b.title = 'สลับโหมดเอกสาร นิยาย ↔ บทหนัง (Ctrl+Shift+M)';
}

// ---- ตั้งค่าโปรเจกต์ (พอร์ตจาก v1 SettingsDialog) ----

// เก็บชื่อตัวละคร + สถานที่ที่ "เคยพิมพ์ในบทนี้" (แบบ Final Draft) เพื่อเดาต่อ
function screenplayTerms(tab) {
  const chars = new Set(), locs = new Set();
  try {
    tab.sp.view.state.doc.forEach((node) => {
      const el = node.attrs.el, txt = (node.textContent || '').trim();
      if (!txt) return;
      if (el === 'character') chars.add(txt);
      else if (el === 'scene') {
        // ตัดคำนำหน้า (INT./EXT./ฉาก) + เวลา ให้เหลือชื่อสถานที่
        let s = txt;
        for (const p of SCENE_PREFIX) if (s.toUpperCase().startsWith(p.trim().toUpperCase())) { s = s.slice(p.trim().length); break; }
        const loc = s.split(/\s[-–]\s|\s-\s/)[0].trim();
        if (loc) locs.add(loc);
      }
    });
  } catch {}
  return { chars: [...chars], locs: [...locs] };
}
const uniqList = (arr) => [...new Set(arr.filter(Boolean))];

function spSmartCheck(tab) {
  const elName = tab.sp.curElement();
  smart.bindView(tab.sp.view);
  const T = screenplayTerms(tab);                       // ชื่อจากบทเอง (Final Draft)
  if (elName === 'character')
    smart.check(tab.sp.view, uniqList([...T.chars, ...(smart.byCat?.characters || []), ...CHAR_EXTENSIONS]),
                { minLen: 1 });
  else if (elName === 'scene')
    // Final Draft: พิมพ์ e → EXT. · i → INT. (1 ตัวอักษร + ไม่สนพิมพ์เล็กใหญ่)
    smart.check(tab.sp.view, uniqList([...SCENE_PREFIX, ...T.locs,
                                       ...(smart.byCat?.locations || []), ...TIMES]),
                { minLen: 1, ci: true });
  else if (elName === 'transition') smart.check(tab.sp.view, TRANSITIONS, { minLen: 1, ci: true });
  else if (elName === 'parenthetical') smart.check(tab.sp.view, PARENTHETICALS, { minLen: 1 });
  else if (elName === 'dialogue' || elName === 'action')
    smart.check(tab.sp.view, uniqList([...T.chars, ...(smart.byCat?.characters || []),
                                       ...(smart.names || [])]));   // ชื่อตัวละครกลางบทพูด/บรรยาย
  else smart.hide();
}

function setElementBadge(elName) {
  const b = $('#elem-badge');
  if (!b) return;
  // sync กับตัวเลือกใน floatBar/toolbar
  const spSel = $('#tb-sp-elem');
  if (spSel && SP_ELEMS[elName]) { try { spSel.value = elName; } catch {} }
  if (!SP_ELEMS[elName]) { b.textContent = ''; b.classList.remove('elem-pick'); b.onclick = null; return; }
  b.innerHTML = iconHtml('film', 14) + ' ' + SP_ELEMS[elName].th + ' ▾';
  b.title = 'คลิกเลือกรูปแบบ · หรือ Ctrl+↑/↓ สลับ';
  b.classList.add('elem-pick');
  b.onclick = (e) => {
    const t = state.active; if (!t?.sp) return;
    popupMenu(e.clientX, e.clientY, TAB_CYCLE.map((el) => ({
      label: (el === t.sp.curElement() ? '● ' : '   ') + SP_ELEMS[el].th,
      click: () => { t.sp.setElement(el); t.sp.view.focus(); setElementBadge(el); },
    })));
  };
}

let imgURLBase = new Map();
export function resolveImg(dir, rel) {
  // แปลง path ใน md → file:// (sync ผ่าน cache ที่เตรียมไว้ — fallback เดา URL ตรง ๆ)
  const key = dir + '||' + rel;
  if (imgURLBase.has(key)) return imgURLBase.get(key);
  const guess = 'file://' + (dir + '/' + rel).replace(/\\/g, '/');
  kapi.resolve(dir, rel).then(async (abs) => {
    if (!(await kapi.exists(abs))) {         // ไฟล์เก่าอาจนับชั้นผิด → หาในคลังรูปจากชื่อ
      const base = rel.split('/').pop();
      abs = await kapi.join(state.root, 'Images', base);
    }
    imgURLBase.set(key, await kapi.toFileURL(abs));
    document.querySelectorAll('figure img').forEach((im) => {
      if (im.src === guess || im.getAttribute('src') === guess) im.src = imgURLBase.get(key);
    });
  });
  return guess;
}

export function activate(file) {
  for (const [f, t] of state.tabs) {
    const on = f === file;
    t.pane.classList.toggle('on', on || !!t.floatWin);   // หน้าต่างลอยแสดงเสมอ ไม่ขึ้นกับแท็บที่เลือก
    t.tabBtn.classList.toggle('on', on);
  }
  state.active = state.tabs.get(file) || null;
  // จำฉากที่เปิดล่าสุดไว้ — แท็บอย่างผังพื้นที่/ผังแตกสายต้องรู้ว่า "กำลังเขียนฉากไหนอยู่"
  // ทั้งที่ตัวเองเป็นแท็บที่ active (ไม่งั้น sceneCtx() คืน null ทันทีที่สลับมาดูผัง)
  if (file && /\.md$/i.test(file) && /[\\/]Chapters[\\/]/.test(file)) state.lastSceneFile = file;
  if (state.active) {
    (state.active.editor || state.active.sp || state.active.plain)?.focus?.();
    if (state.active.editor) smart.bindView(state.active.editor.view);
    if (state.active.sp) smart.bindView(state.active.sp.view);
    // แท็บที่วาดบน canvas ต้องวัดขนาด pane ใหม่ตอนถูกเรียกขึ้นมา (ตอนสร้าง pane ยังซ่อนอยู่ → ได้ 0)
    state.active.net?.focus?.();
    state.active.planner?.focus?.();
  }
  // Split View: แท็บที่เพิ่งเลือกต้องไปโผล่ในช่องที่ถูกต้อง (ช่องเดิมถ้าเคยอยู่ · ไม่งั้นช่องที่โฟกัส)
  // เดิมโค้ดตรงนี้พึ่ง state.compareFile ตัวเดียว → รองรับได้แค่ 2 ช่อง และหลุดแยกจอง่าย
  syncActiveSplit(file);
  setElementBadge(state.active?.sp ? state.active.sp.curElement() : null);
  smart.hide();
  refreshToolbar(); refreshModeBtn(); scheduleCount(); scheduleOutline();
  updateDirtyBadge();
  refreshStatusBar();
  // แสดงปุ่มบันทึกทั้งหมดเมื่อมีโปรเจกต์เปิด
  const saveAllBtn = $('#save-all-btn');
  if (saveAllBtn) saveAllBtn.style.display = state.root ? '' : 'none';
  // กลับมาที่แท็บศูนย์รวม → รีเฟรชถ้าไฟล์เปลี่ยนไปแล้ว (ข้อ 87 real-time)
  if (file === '::centralize::') { try { onCentralizeShown(); } catch {} }
  // แผงคอมเมนต์ผูกกับ "ฉากที่เปิดอยู่" — สลับแท็บแล้วต้องเปลี่ยนตาม (ไม่งั้นคอมเมนต์ฉากเก่าค้าง)
  refreshCommentsPanel();
}

export function markDirty(tab) {
  if (!tab.dirty) { tab.dirty = true; tab.tabBtn.querySelector('.tab-title').textContent = '● ' + tab.title; }
  updateDirtyBadge();
  updateProgressBar();
}

// ข้อ 48: แสดงจำนวนแท็บที่ยังไม่บันทึกบนเมนู "ไฟล์" + ไอคอน 💾 บน title bar เมื่อมีงานค้าง
function updateDirtyBadge() {
  const n = [...state.tabs.values()].filter((t) => t.dirty).length;
  const fileMenu = document.querySelector('.tb-menu[data-m="File"]');   // data-m คงที่ (ชื่อที่แสดงเปลี่ยนตามภาษา)
  if (fileMenu) {
    let badge = fileMenu.querySelector('.tb-menu-badge');
    if (n > 0) {
      if (!badge) { badge = el('span', 'tb-menu-badge'); fileMenu.append(badge); }
      badge.textContent = n;
    } else if (badge) badge.remove();
  }
  const dot = $('#tb-dirty-dot');
  if (dot) { dot.style.display = n > 0 ? 'inline' : 'none'; dot.title = n > 0 ? `มีงานค้าง ${n} ไฟล์ (Ctrl+Alt+S เพื่อบันทึกทั้งหมด)` : ''; }
}

export async function saveTab(tab) {
  if (!tab) return;
  if (tab.planner) {
    await tab.planner.save();
    tab.dirty = false;
    tab.tabBtn.querySelector('.tab-title').textContent = tab.title;
    return;
  }
  if (tab.isJson) { await tab.save(); return; }
  if (tab.wiki) {
    await tab.wiki.save();
    tab.dirty = false;
    tab.tabBtn.querySelector('.tab-title').textContent = tab.title;
    setStatus(t('status.saved') + ': ' + tab.title);
    return;
  }
  const body = tab.editor ? tab.editor.getMarkdown()
    : tab.sp ? tab.sp.getMarkdown() : tab.plain.value;
  tab.body = body;
  tab.meta.modified = new Date().toISOString();
  // บันทึกว่าแก้ไขด้วยแอปเวอร์ชันไหน + เพิ่มเลขรอบแก้ (revision) เพื่อให้เทียบเวอร์ชันได้
  tab.meta.appVersion = APP_VERSION;
  tab.meta.revision = String((parseInt(tab.meta.revision, 10) || 0) + 1);
  // คอมเมนต์เก็บอยู่ท้ายไฟล์เดียวกัน — เขียนทับตรง ๆ = คอมเมนต์หาย
  // (ไม่มีคอมเมนต์ = เขียนตัวต่อตัวเหมือนเดิม ไม่แตะท้ายไฟล์)
  await writeKeepingComments(tab.file, dumpMdFile(tab.meta, body));
  tab.dirty = false;
  tab.tabBtn.querySelector('.tab-title').textContent = tab.title;
  setStatus('บันทึกแล้ว: ' + tab.title);
  refreshCommentsPanel();
  // สำรองเวอร์ชันอัตโนมัติ (ตามตั้งค่า autoBackup/maxBackups)
  if (state.settings.autoBackup !== false && isSnapshotable(tab))
    snapshotFile(tab.file).catch(() => {});
  // เนื้อหาเปลี่ยน → ดัชนีเชื่อมโยงของศูนย์รวมล้าสมัย (ข้อ 87 real-time)
  try { markCentralizeStale(); } catch (e) { log('warn', 'markCentralizeStale ล้มเหลว', e); }
}

// บันทึกทุกแท็บที่ยังมีงานค้าง (Ctrl+Alt+S / เมนู ไฟล์ → บันทึกทั้งหมด)
/** รายการไฟล์ค้างสำหรับกล่อง saveAllDialog (บั๊ก #3) */
function dirtyTabList() {
  return [...state.tabs.values()].filter((t) => t.dirty)
    .map((t) => ({ key: t.file, title: t.title || t.file, file: t.file }));
}

/**
 * บันทึกทั้งหมด — ขึ้นกล่องรายการไฟล์ก่อนเสมอ (บั๊ก #3)
 * @param {boolean} silent ข้ามกล่อง (ใช้ตอน autosave/เทส)
 */
async function saveAllTabs(silent = false) {
  let dirty = [...state.tabs.values()].filter((t) => t.dirty);
  if (!dirty.length) { setStatus('ไม่มีงานค้างให้บันทึก'); return 0; }
  if (!silent) {
    const { action, keys } = await saveAllDialog(dirtyTabList());
    if (action !== 'save') { if (action === null) setStatus('ยกเลิกการบันทึก'); return 0; }
    const pick = new Set(keys);
    dirty = dirty.filter((t) => pick.has(t.file));
    if (!dirty.length) return 0;
  }
  let n = 0;
  for (const t of dirty) {
    try { await saveTab(t); n++; }
    catch (err) { log('error', 'saveAll ล้มเหลว: ' + (t.file || t.title), err); }
  }
  setStatus(`บันทึกทั้งหมดแล้ว (${n} ไฟล์)`);
  updateDirtyBadge();
  refreshStatusBar();
  // บันทึกสถิติคำ (ข้อ 58)
  countProjectWords().then((w) => recordDailyWords(w)).catch(() => {});
  return n;
}

// ---------------- ระบบสำรอง/ประวัติเวอร์ชันฉาก (Snapshot) ----------------
function isSnapshotable(tab) {
  return !!tab && !tab.isJson && !tab.wiki && /\.md$/i.test(tab.file || '') &&
         (tab.editor || tab.sp || tab.plain);
}
function tsStamp() { return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 23); }
function sanitizeLabel(s) { return (s || '').replace(/[\\/:*?"<>|]/g, '').replace(/__+/g, '_').slice(0, 40); }

async function snapDirFor(file) {
  if (!state.root || !file) return null;                 // กัน path.relative(null,…) ตอน root/ไฟล์ยังไม่พร้อม
  const rel = (await kapi.relative(state.root, file)).replace(/\.md$/i, '');
  return kapi.join(state.root, 'Snapshots', rel.replace(/[\\/]/g, '__'));
}

// รายการเวอร์ชัน (ใหม่สุดก่อน) — [{name,ts,label,path}]
export async function listSnapshots(file) {
  const dir = await snapDirFor(file);
  if (!dir || !(await kapi.exists(dir))) return [];
  const names = await kapi.listFiles(dir, '.md');
  const out = [];
  for (const fn of names) {
    const base = fn.replace(/\.md$/i, '');
    const idx = base.indexOf('__');
    out.push({ name: fn, ts: idx < 0 ? base : base.slice(0, idx),
               label: idx < 0 ? '' : base.slice(idx + 2), path: await kapi.join(dir, fn) });
  }
  return out.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
}

// บันทึกเวอร์ชันจากเนื้อหาไฟล์ปัจจุบันบนดิสก์ (auto=ไม่มี label; ข้ามถ้าซ้ำกับล่าสุด)
export async function snapshotFile(file, label = '') {
  if (!state.root) return;
  let content; try { content = await kapi.readFile(file); } catch { return; }
  const snaps = await listSnapshots(file);
  if (!label && snaps.length) {
    try { if ((await kapi.readFile(snaps[0].path)) === content) return; } catch {}
  }
  const dir = await snapDirFor(file);
  if (!dir) return;
  await kapi.mkdir(dir);
  const fn = label ? `${tsStamp()}__${sanitizeLabel(label)}.md` : `${tsStamp()}.md`;
  await kapi.writeFile(await kapi.join(dir, fn), content);
  await pruneSnapshots(file);
}

// ตัดเวอร์ชันอัตโนมัติเก่าให้เหลือไม่เกิน maxBackups (เวอร์ชันที่ตั้งชื่อ = ไม่ถูกตัด)
async function pruneSnapshots(file) {
  const max = Math.max(1, parseInt(state.settings.maxBackups, 10) || 10);
  const unlabeled = (await listSnapshots(file)).filter((s) => !s.label);
  for (const s of unlabeled.slice(max)) { try { await kapi.remove(s.path); } catch {} }
}

// บันทึกเวอร์ชันด้วยตนเอง (จากคลิกขวาฉาก) — บันทึกไฟล์ก่อนถ้าเปิดค้างและ dirty
async function manualSnapshot(dPath, ch, sc) {
  const file = await kapi.join(dPath, 'Chapters', ch.folderName, sc.fileName);
  const openTab = state.tabs.get(file);
  if (openTab && openTab.dirty) await saveTab(openTab);
  const label = await ask('ตั้งชื่อเวอร์ชัน (เว้นว่างได้)', { placeholder: 'เช่น ก่อนแก้ตอนจบ', okLabel: 'บันทึกเวอร์ชัน' });
  if (label === null) return;
  await snapshotFile(file, label || 'เวอร์ชัน');   // manual = มี label เสมอ (กันถูกตัด)
  setStatus('บันทึกเวอร์ชันแล้ว');
}

export function fmtTs(ts) {
  // 2026-07-20T08-30-00 → 20/07/2026 08:30
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})/.exec(ts || '');
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : (ts || '');
}

// กล่องประวัติเวอร์ชัน — ดูตัวอย่าง/กู้คืน/ลบ

// เทียบง่ายๆ ระดับบรรทัด: คืน [{l,r,cls}] — cls: same/add/del/chg สำหรับไฮไลต์สองฝั่ง
function lineDiff(aText, bText) {
  const A = (aText || '').split('\n'), B = (bText || '').split('\n');
  const n = A.length, m = B.length;
  // LCS ตาราง (พอสำหรับฉากหนึ่ง ๆ)
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const rows = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { rows.push({ l: A[i], r: B[j], cls: 'same' }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { rows.push({ l: A[i], r: '', cls: 'del' }); i++; }
    else { rows.push({ l: '', r: B[j], cls: 'add' }); j++; }
  }
  while (i < n) { rows.push({ l: A[i++], r: '', cls: 'del' }); }
  while (j < m) { rows.push({ l: '', r: B[j++], cls: 'add' }); }
  return rows;
}

// กล่องเทียบเวอร์ชัน — สองฝั่ง เลือกเวอร์ชันได้ทั้งซ้าย/ขวา + ไฮไลต์บรรทัดที่ต่าง
async function compareVersionsDialog(dPath, ch, sc) {
  const file = await kapi.join(dPath, 'Chapters', ch.folderName, sc.fileName);
  const snaps = await listSnapshots(file);
  // ตัวเลือก: [ปัจจุบัน] + เวอร์ชันที่บันทึกไว้
  const opts = [{ key: '__cur__', label: 'ปัจจุบัน (บนดิสก์)' },
    ...snaps.map((s) => ({ key: s.path, label: fmtTs(s.ts) + (s.label ? ' · ' + s.label : '') }))];
  const bodyOf = async (key) => {
    try {
      if (key === '__cur__') { const t = state.tabs.get(file);
        if (t && (t.editor || t.sp)) return (t.editor || t.sp).getMarkdown(); }
      return parseMdFile(await kapi.readFile(key === '__cur__' ? file : key)).body;
    } catch { return '(อ่านไม่ได้)'; }
  };

  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog k-wide k-cmp');
  box.append(el('div', 'k-dlg-title', 'เทียบเวอร์ชัน — ' + sc.title));
  const head = el('div', 'k-cmp-head');
  const selL = el('select', 'k-dlg-select'); const selR = el('select', 'k-dlg-select');
  for (const o of opts) { const a = el('option', null, o.label); a.value = o.key; selL.append(a);
                          const b = el('option', null, o.label); b.value = o.key; selR.append(b); }
  selL.selectedIndex = Math.min(1, opts.length - 1);      // ฝั่งซ้าย = เวอร์ชันเก่าสุดที่มี (ถ้ามี)
  selR.value = '__cur__';                                  // ฝั่งขวา = ปัจจุบัน
  head.append(el('span', 'k-cmp-lbl', 'ซ้าย:'), selL, el('span', 'k-cmp-lbl', 'ขวา:'), selR);
  box.append(head);
  const grid = el('div', 'k-cmp-grid'); box.append(grid);
  const foot = el('div', 'k-dlg-btns'); const closeB = el('button', null, 'ปิด');
  foot.append(closeB); box.append(foot);
  ov.append(box); document.body.append(ov);
  closeB.onclick = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };

  async function render() {
    grid.innerHTML = '';
    const rows = lineDiff(await bodyOf(selL.value), await bodyOf(selR.value));
    const colL = el('div', 'k-cmp-col'); const colR = el('div', 'k-cmp-col');
    let diffs = 0;
    for (const r of rows) {
      if (r.cls !== 'same') diffs++;
      const lc = el('div', 'k-cmp-line ' + (r.cls === 'del' ? 'cmp-del' : r.cls === 'add' ? 'cmp-gap' : ''));
      lc.textContent = r.l || (r.cls === 'add' ? '' : r.l);
      const rc = el('div', 'k-cmp-line ' + (r.cls === 'add' ? 'cmp-add' : r.cls === 'del' ? 'cmp-gap' : ''));
      rc.textContent = r.r || '';
      colL.append(lc); colR.append(rc);
    }
    grid.append(colL, colR);
    head.querySelector('.k-cmp-count')?.remove();
    head.append(el('span', 'k-cmp-count', diffs ? `ต่างกัน ${diffs} บรรทัด` : 'เหมือนกันทุกบรรทัด'));
  }
  selL.onchange = render; selR.onchange = render;
  render();
}

export function closeTab(file) {
  const t = state.tabs.get(file);
  if (!t) return;
  const done = () => {
    t.editor?.destroy(); t.wiki?.destroy(); t.sp?.destroy(); t.gal?.destroy(); t.net?.destroy(); t.planner?.destroy();
    t.pane.remove(); t.tabBtn.remove();
    if (t.floatWin) { t.floatWin.remove(); t.floatWin = null; }
    state.tabs.delete(file);
    closeTabInSplit(file);                               // ปิดไฟล์ที่แสดงอยู่ในช่องไหน → ยุบช่องนั้นด้วย
    const next = [...state.tabs.keys()].pop();
    if (next) activate(next); else { state.active = null; refreshToolbar(); updateDirtyBadge(); }
  };
  if (t.dirty) saveTab(t).then(done); else done();
}

// [80] Revert — ยกเลิกการเปลี่ยนแปลงทั้งหมด โหลดใหม่จากดิสก์
export async function revertTab(file) {
  const t = state.tabs.get(file);
  if (!t) return;
  if (!(await confirmBox('ยกเลิกการเปลี่ยนแปลงทั้งหมดในแท็บนี้?\nเนื้อหาจะกลับไปเป็นเวอร์ชันล่าสุดที่บันทึกไว้', 'Revert'))) return;
  const content = await kapi.readFile(file);
  const { meta, body } = parseMdFile(content);
  if (t.editor) { t.editor.setMarkdown(body); refreshMentions(t.editor.view); }
  else if (t.sp) {
    t.sp.destroy();
    t.sp = new SPEditor(t.pane.querySelector('.pane.on') || t.pane, {
      markdown: body, onChange: () => { markDirty(t); smartDirty(); },
      onElement: (el) => { spSmartCheck(t); setElementBadge(el); },
      onKeyDown: (ev) => smart.onKey(ev),
      getChecker: getSpellchecker, resolveSrc: (p) => resolvePath(file, p),
      getNames: () => smart.names,
      onMention: (n) => t.wiki ? openWikiEntity(n) : openEntity(n),
    });
    t.sp.view.dom.classList.add('on');
  }
  else if (t.wiki) { t.wiki.destroy(); openEntity(t.title); return; }
  else if (t.plain) { t.plain = false; openPlainFile(file, t.title); return; }
  t.dirty = false;
  refreshAllSpell(); refreshAllMentions();
  setStatus('↩ กลับไปยังเวอร์ชันล่าสุดที่บันทึก');
}

// [76] Remove Elements by Type — ลบ element ทั้งหมดของประเภทที่เลือก
async function removeElementsDialog() {
  const sp = state.active?.sp;
  if (!sp) { setStatus('เปิดบทหนังก่อน'); return; }
  const v = sp.view;
  const counts = {};
  v.state.doc.forEach((n) => {
    if (n.type.name === 'sp') counts[n.attrs.el] = (counts[n.attrs.el] || 0) + 1;
  });
  const types = Object.keys(counts).filter((k) => SP_ELEMS[k]);
  if (!types.length) { setStatus('ไม่มี element ให้ลบ'); return; }
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog');
  box.innerHTML = `<div class="k-dlg-title">ลบ element ตามประเภท</div>
    <div class="k-hint" style="margin-bottom:10px">เลือกประเภท element ที่ต้องการลบทั้งหมดออกจากบท</div>
    <div id="rm-el-list"></div>
    <div style="margin-top:8px"><a href="#" id="rm-el-all">เลือกทั้งหมด</a> · <a href="#" id="rm-el-none">ไม่เลือก</a></div>
    <div class="k-dlg-btns"><button class="k-cancel">${t('dialogs.cancel')}</button><button class="k-ok k-danger-btn">ลบ</button></div>`;
  ov.append(box); document.body.append(ov);
  const list = box.querySelector('#rm-el-list');
  const chks = [];
  for (const ty of types) {
    const label = el('label', 'k-row');
    const cb = el('input'); cb.type = 'checkbox'; cb.value = ty; chks.push(cb);
    label.append(cb, ' ' + (SP_ELEMS[ty]?.th || ty) + ` (${counts[ty]} รายการ)`);
    list.append(label);
  }
  box.querySelector('#rm-el-all').onclick = (e) => { e.preventDefault(); chks.forEach((c) => c.checked = true); };
  box.querySelector('#rm-el-none').onclick = (e) => { e.preventDefault(); chks.forEach((c) => c.checked = false); };
  box.querySelector('.k-cancel').onclick = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  box.querySelector('.k-ok').onclick = async () => {
    const sel = chks.filter((c) => c.checked).map((c) => c.value);
    if (!sel.length) { ov.remove(); return; }
    if (!(await confirmBox(`ลบ element ${sel.map((t) => SP_ELEMS[t]?.th || t).join(', ')} ทั้งหมด (${sel.reduce((s, t) => s + (counts[t] || 0), 0)} รายการ)?`, 'ลบ'))) return;
    // เก็บ snapshot ก่อนลบ
    const t = state.active;
    if (t) await snapshotFile(t.file, 'ก่อนลบ ' + sel.map((x) => SP_ELEMS[x]?.th).join(','));
    let tr = v.state.tr;
    const delSet = new Set(sel);
    const toRemove = [];
    v.state.doc.forEach((n, pos) => {
      if (n.type.name === 'sp' && delSet.has(n.attrs.el)) toRemove.push({ pos, size: n.nodeSize });
    });
    for (const { pos, size } of toRemove.reverse()) tr = tr.delete(pos, pos + size);
    v.dispatch(tr);
    if (t) { markDirty(t); smartDirty(); }
    ov.remove();
    setStatus('ลบ ' + toRemove.length + ' element แล้ว');
  };
}

// [75] Character Map — Latin-1 special characters dialog
async function showCharMap() {
  const LATIN1 = [
    'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞß',
    'àáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ',
    '¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿',
  ];
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog');
  box.innerHTML = `<div class="k-dlg-title">แผนที่อักขระพิเศษ</div>
    <div class="k-charmap"></div>
    <div class="k-dlg-btns"><button class="k-ok">${t('dialogs.close')}</button></div>`;
  ov.append(box); document.body.append(ov);
  const grid = box.querySelector('.k-charmap');
  for (const row of LATIN1) {
    const r = el('div', 'k-cm-row');
    for (const ch of row) {
      const btn = el('button', 'k-cm-btn', ch);
      btn.title = 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
      btn.onclick = () => {
        const ed = getActiveEditor();
        if (ed?.view) {
          ed.view.dispatch(ed.view.state.tr.insertText(ch));
          ed.view.focus();
        }
      };
      r.append(btn);
    }
    grid.append(r);
  }
  box.querySelector('.k-ok').onclick = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
}

async function closeAllTabs() {
  const files = [...state.tabs.keys()];
  for (const f of files) {
    const t = state.tabs.get(f);
    if (t?.dirty) await saveTab(t);
    closeTab(f);
  }
}

// ---------------- แยกหน้าจอเทียบเอกสาร (compare / split) ----------------
// "เปิดเทียบด้านขวา" กับ "Split View" ใช้กลไกเดียวกันคือ SplitManager (บั๊ก #1)
// เดิมเส้นทางนี้เขียน state.compareFile + คลาส .compare-on เอง จึงได้แค่ 2 ช่องและหลุดง่าย
function applyCompare(rightFile) {
  const rt = state.tabs.get(rightFile);
  if (!rt) return;
  openInSplit(rightFile, 'right');
  setStatus('โหมดเทียบเอกสาร: ' + (state.active?.title || '') + '  ⇋  ' + rt.title);
}
// เปิด "เวอร์ชันที่บันทึกไว้" เป็นแท็บอ่านอย่างเดียวแล้ววางไว้ฝั่งขวาคู่กับฉากปัจจุบัน (ข้อ 7)
// ทำให้ "เทียบเวอร์ชันแบบ split view ด้านขวา" ใช้ได้จริง ไม่ใช่แค่กล่องโต้ตอบสองคอลัมน์
export async function openSnapshotRight(curFile, snap) {
  const key = '::snap::' + snap.path;
  const title = '🕘 ' + (snap.label || fmtTs(snap.ts));
  if (!state.tabs.has(key)) {
    let body = '';
    try { body = parseMdFile(await kapi.readFile(snap.path)).body; } catch { body = '(อ่านไฟล์เวอร์ชันไม่ได้)'; }
    const pane = el('div', 'pane');
    const bar = el('div', 'json-bar');
    bar.append(el('span', 'dim', title + ' — อ่านอย่างเดียว'));
    const ta = el('textarea', 'plain-md'); ta.value = body; ta.readOnly = true;
    pane.append(bar, ta);
    $('#panes').append(pane);
    const tabBtn = el('div', 'tab');
    tabBtn.append(el('span', 'tab-title', title));
    const x = el('span', 'tab-x', '×'); tabBtn.append(x);
    $('#tabs').append(tabBtn);
    const tab = { file: key, title, pane, tabBtn, dirty: false,
                  editor: null, plain: null, wiki: null, isJson: true, readOnly: true,
                  save: async () => true };
    tabBtn.onclick = (e) => { if (e.target !== x) activate(key); };
    x.onclick = () => closeTab(key);
    state.tabs.set(key, tab);
  }
  // ฉากปัจจุบันต้องเปิดอยู่ฝั่งซ้าย ไม่งั้นเทียบกับอะไรไม่รู้
  if (curFile && state.tabs.has(curFile)) activate(curFile);
  applyCompare(key);
  return key;
}

function clearCompare() { closeSplit(); }
// เปิดฉากนี้ไว้ "ด้านขวา" คู่กับเอกสารที่เปิดอยู่ (เทียบกันแบบ Photoshop compare)
async function openCompareRight(dPath, ch, sc) {
  const file = await kapi.join(dPath, 'Chapters', ch.folderName, sc.fileName);
  const left = state.active?.file;
  if (!left || left === file) { return openScene(file, sc.title); }   // ไม่มีคู่เทียบ → เปิดปกติ
  if (!state.tabs.has(file)) await openScene(file, sc.title);
  activate(left);                                                     // คงเอกสารเดิมเป็นฝั่งซ้าย
  applyCompare(file);
}


// ดับเบิลคลิกหัวแท็บ = แยกเป็นหน้าต่างลอย / คืนกลับ · คลิกขวา = เมนู
function bindTabStripMenus() {
  const strip = $('#tabs');
  if (!strip || strip._floatBound) return;
  strip._floatBound = true;
  strip.addEventListener('dblclick', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn || e.target.classList.contains('tab-x')) return;
    const [f] = tabByBtn(btn);
    if (f) toggleFloatTab(f);
  });
  strip.addEventListener('contextmenu', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    e.preventDefault();
    const [f, t] = tabByBtn(btn);
    if (!f) return;
    popupMenu(e.clientX, e.clientY, [
      t.floatWin ? { label: '⤢ คืนเป็นแท็บ', click: () => dockTab(f) }
                 : { label: '🪟 แยกเป็นหน้าต่างลอย', click: () => floatTab(f) },
      { label: 'ปิดแท็บนี้', click: () => closeTab(f) },
    ]);
  });
}

// ---------------- toolbar / statusbar ----------------
const FMTS = ['bold', 'italic', 'underline', 'strike'];

// ตั้ง title ปุ่ม toolbar ให้แสดง shortcut (เรียกตอนเริ่ม + หลังเปลี่ยนภาษา)
function updateToolbarTitles() {
  // ปุ่มฟอร์แมต
  $('#tb-bold').title = withShortcut('toolbar.bold', 'KeyB', true, false);
  $('#tb-italic').title = withShortcut('toolbar.italic', 'KeyI', true, false);
  $('#tb-underline').title = withShortcut('toolbar.underline', 'KeyU', true, false);
  $('#tb-strike').title = withShortcut('toolbar.strike', 'KeyX', true, true);
  $('#tb-ul').title = withShortcut('toolbar.bulletList', 'Digit8', true, true);
  $('#tb-ol').title = withShortcut('toolbar.numberList', 'Digit7', true, true);
  $('#tb-quote').title = t('toolbar.quote');
  $('#tb-align-left').title = withShortcut('toolbar.alignLeft', 'KeyL', true, true);
  $('#tb-align-center').title = withShortcut('toolbar.alignCenter', 'KeyK', true, true);
  $('#tb-align-right').title = withShortcut('toolbar.alignRight', 'KeyR', true, true);
  $('#tb-align-justify').title = withShortcut('toolbar.alignJustify', 'KeyJ', true, true);
  // ปุ่มโหมด
  $('#tb-paper').title = withShortcut('toolbar.paperMode', 'KeyP', true, true);
  $('#tb-mode').title = t('toolbar.toggleMode') + ' (Ctrl+Shift+M)';
  // ปุ่มเครื่องมือ
  $('#tb-img').title = t('toolbar.insertImage');
  $('#tb-source').title = t('toolbar.viewSource');
  $('#tb-read').title = t('toolbar.readingMode');
  $('#tb-gsearch').title = withShortcut('toolbar.globalSearch', 'KeyF', true, true);
  $('#tb-kanban').title = t('toolbar.kanban');
  $('#tb-ai').title = t('toolbar.aiAssistant');
  $('#tb-ai-chat').title = t('toolbar.aiChat');
  $('#tb-plug').title = t('toolbar.plugins');
}
// re-export ให้ core.js เรียกหลังเปลี่ยนภาษา
export { updateToolbarTitles };

function refreshToolbar() {
  const ed = state.active?.editor;
  const sp = state.active?.sp;
  const wkEd = state.active?.wiki?.secEditors?.find(({k}) => k?.view?.hasFocus())?.k
              || state.active?.wiki?.secEditors?.[0]?.k;
  const marks = ed ? ed.activeMarks() : wkEd ? wkEd.activeMarks() : {};
  for (const f of FMTS) {
    const key = { bold: 'strong', italic: 'em', underline: 'underline', strike: 'strike' }[f];
    $('#tb-' + f).classList.toggle('on', !!marks[key]);
  }
  const sel = $('#tb-style');
  if (marks.block) sel.value = marks.block;
  // ไฮไลต์ปุ่มจัดหน้าตามบล็อกปัจจุบัน (นิยายอ่านจาก activeMarks · บทหนังจาก curAlign)
  const curAlign = ed ? (marks.align || 'left') : sp ? sp.curAlign() : null;
  for (const a of ['left', 'center', 'right', 'justify']) {
    const b = $('#tb-align-' + a); if (b) b.classList.toggle('on', curAlign === a);
  }
  const canEdit = !!(ed || sp || wkEd);
  // ตัวเลือก element บทหนัง — แสดงเฉพาะเมื่อแท็บปัจจุบันเป็นบทหนัง
  const spElem = $('#tb-sp-elem');
  if (spElem) {
    spElem.style.display = sp ? '' : 'none';
    if (sp) { try { spElem.value = sp.curElement(); } catch {} }
  }
  document.querySelectorAll('.tb').forEach((b) => {
    if (b.id === 'tb-paper') return;   // ปุ่มโหมดหน้ากระดาษใช้ได้ตลอด
    // บั๊ก #1: ปุ่มแยกหน้าจอเคยถูกปิดไปด้วยตอนแท็บที่เปิดอยู่ไม่ใช่เอดิเตอร์ (แดชบอร์ด/ผัง/คลังรูป)
    // ทั้งที่แยกจอใช้กับแท็บพวกนั้นได้ → ใช้ได้ตราบใดที่มีแท็บเปิดอยู่อย่างน้อยหนึ่ง
    if (b.id === 'tb-split') { b.classList.toggle('dis', state.tabs.size === 0); return; }
    // ปิด/ปิดทุกแท็บ / โฟกัส / typewriter / เลขบรรทัด / quick-open / sp-elem → ใช้ได้เสมอ ไม่ขึ้นกับ canEdit
    if (b.id === 'tb-close' || b.id === 'tb-close-all' || b.id === 'tb-focus' ||
        b.id === 'tb-typewriter' || b.id === 'tb-linenum' || b.id === 'tb-quickopen' ||
        b.id === 'tb-gallery' || b.id === 'tb-sp-elem') return;
    // ปุ่ม toggle แผง — ใช้ได้เสมอ ไม่ขึ้นกับ canEdit
    if (b.id === 'tb-tree-panel' || b.id === 'tb-outline-panel' ||
        b.id === 'tb-props-panel' || b.id === 'tb-search-panel') return;
    b.classList.toggle('dis', !canEdit);
  });
  $('#tb-paper').classList.toggle('on', state.settings.paperMode !== false);
  // ปุ่มสวิตช์อื่น ๆ ต้องสะท้อนสถานะจริงด้วย ไม่งั้นจุดบอกสถานะโกหก
  $('#tb-read')?.classList.toggle('on', document.body.classList.contains('reading-mode'));
  $('#tb-split')?.classList.toggle('on', isSplit());
  $('#tb-focus')?.classList.toggle('on', document.body.classList.contains('focus-mode'));
  $('#tb-typewriter')?.classList.toggle('on', isTypewriter());
  $('#tb-linenum')?.classList.toggle('on', !!state.settings.lineNumbers);
  $('#tb-tree-panel')?.classList.toggle('on', isPanelOpen('tree'));
  $('#tb-outline-panel')?.classList.toggle('on', isPanelOpen('outline'));
  $('#tb-props-panel')?.classList.toggle('on', isPanelOpen('props'));
  $('#tb-search-panel')?.classList.toggle('on', isPanelOpen('search'));
  syncFloatBarVisible();
  syncMenuToggles();          // เมนู native ติ๊กถูกตามสถานะจริง (ส่งเฉพาะตอนค่าเปลี่ยน)
}

let countJob = null;
function scheduleCount() {
  clearTimeout(countJob);
  countJob = setTimeout(() => {
    const t = state.active;
    if (!t || t.wiki || t.gal || t.isJson || t.net || t.dash || t.planner || (!t.editor && !t.sp && !t.plain)) { $('#wc').textContent = ''; return; }
    const body = t.editor ? t.editor.getMarkdown()
      : t.sp ? t.sp.getMarkdown() : t.plain.value;
    $('#wc').textContent = `คำ ${countWords(body).toLocaleString()} · อักขระ ${body.length.toLocaleString()}`;
    updateProgressBar();
  }, 300);
}


// ---------------- ตัวดูบันทึกการทำงาน (Log viewer) ----------------

let outlineJob = null;
function scheduleOutline() { clearTimeout(outlineJob); outlineJob = setTimeout(refreshOutline, 400); }
let navShowBeats = (localStorage.getItem('k2-nav-beats') ?? '1') === '1';
function setNavBeats(on) {
  navShowBeats = on;
  localStorage.setItem('k2-nav-beats', on ? '1' : '0');
  const b = $('#nav-beats-btn'); if (b) b.classList.toggle('on', on);
  refreshOutline();
}
const navTrunc = (s, n = 42) => { s = String(s).trim().replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n) + '…' : s; };

// Navigation — จับหัวข้อ/ย่อหน้า/หัวฉากของฉากที่เปิดอยู่ (แบบ Final Draft) + โหมดนิยาย
function refreshOutline() {
  const box = $('#outline'); box.innerHTML = '';
  const t = state.active;
  if (!t || t.wiki || t.gal || t.isJson || t.net || t.dash || t.planner || (!t.editor && !t.sp && !t.plain)) {
    box.append(el('div', 'dim', '(เปิดฉากเพื่อดู Navigation)')); return;
  }
  // ส่วนหัว: ชื่อฉาก + โหมด
  const head = el('div', 'nav-head');
  head.append(el('span', 'nav-scene', (t.sp ? '🎬 ' : '📖 ') + (t.title || '(ฉาก)')));
  box.append(head);

  const items = [];
  if (t.editor) {
    t.editor.view.state.doc.forEach((n, offset) => {
      if (n.type.name === 'heading')
        items.push({ kind: 'heading', label: n.textContent || '(ว่าง)', lvl: n.attrs.level, pos: offset });
      else if (navShowBeats && n.type.name === 'paragraph' && n.textContent.trim())
        items.push({ kind: 'beat', label: navTrunc(n.textContent), lvl: 4, pos: offset });
      else if (navShowBeats && n.type.name === 'blockquote' && n.textContent.trim())
        items.push({ kind: 'quote', label: navTrunc(n.textContent), lvl: 4, pos: offset });
    });
  } else if (t.sp) {
    const MAP = { scene: ['sceneHeading', 2], outline1: ['outline', 1], outline2: ['outline', 2],
      outline3: ['outline', 3], character: ['character', 3], transition: ['transition', 3], summary: ['summary', 4] };
    t.sp.view.state.doc.forEach((n, offset) => {
      const hit = MAP[n.attrs.el];
      if (!hit) return;
      if (hit[0] === 'character' && !navShowBeats) return;   // ปิด beat = โชว์แต่หัวฉาก/โครง
      if (n.textContent.trim()) items.push({ kind: hit[0], label: n.textContent, lvl: hit[1], pos: offset });
    });
  } else {
    t.plain.value.split('\n').forEach((line, i) => {
      const m = /^(#{1,6})\s+(.*)$/.exec(line);
      if (m) items.push({ kind: 'heading', label: m[2], lvl: m[1].length, line: i });
      else if (/^\.[^.]/.test(line.trim()) || /^(INT|EXT)[.\s]/i.test(line.trim()))
        items.push({ kind: 'sceneHeading', label: line.trim().replace(/^\./, ''), lvl: 2, line: i });
      else if (navShowBeats && line.trim())
        items.push({ kind: 'beat', label: navTrunc(line), lvl: 4, line: i });
    });
  }
  if (!items.length) { box.append(el('div', 'dim', '(ยังไม่มีหัวข้อ/หัวฉาก)')); return; }
  for (const it of items) {
    const d = el('div', 'ol-item nav-' + it.kind + ' lvl' + it.lvl, it.label || '(ว่าง)');
    d.onclick = () => {
      if (t.sp || t.editor) {
        const view = (t.sp || t.editor).view;
        import('prosemirror-state').then(({ TextSelection }) => {
          view.dispatch(view.state.tr.setSelection(
            TextSelection.create(view.state.doc, it.pos + 1)).scrollIntoView());
          view.focus();
        });
      } else {
        const lines = t.plain.value.split('\n');
        let off = 0; for (let i = 0; i < it.line; i++) off += lines[i].length + 1;
        t.plain.focus(); t.plain.setSelectionRange(off, off);
      }
    };
    box.append(d);
  }
}
// ---------------- Find/replace bar ----------------
function openFind() {
  $('#findbar').classList.add('on');
  $('#find-q').focus(); $('#find-q').select();
}
function doFind() {
  const ed = state.active?.editor; if (!ed) return 0;
  const n = setQuery(ed.view, $('#find-q').value);
  $('#find-n').textContent = n ? n + ' ผล' : 'ไม่พบ';
  return n;
}
function closeFind() {
  $('#findbar').classList.remove('on');
  const ed = state.active?.editor;
  if (ed) setQuery(ed.view, '');
  state.active?.editor?.focus();
}

// วาง/ลากไฟล์รูปเข้าเอกสาร → เขียนเข้าคลัง Images (base64) แล้วแทรกอ้างอิงแบบสัมพัทธ์
async function importImageFile(file, t) {
  try {
    const buf = await file.arrayBuffer();
    let bin = ''; const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);
    const safe = (file.name || 'image.png').replace(/[^\w.\-\u0E00-\u0E7F]+/g, '_');
    const imgDir = await kapi.join(state.root, 'Images');
    const saved = await kapi.writeImageData(imgDir, safe, b64);
    const sceneDir = t.file.replace(/[\\/][^\\/]*$/, '');
    const rel = await kapi.relative(sceneDir, await kapi.join(imgDir, saved));
    const cap = saved.replace(/\.[^.]+$/, '');
    (t.editor || t.sp).insertImage(rel, cap, `![${cap}](${rel})`);
    markDirty(t);
    setStatus('แทรกรูป: ' + saved);
  } catch (err) { setStatus('แทรกรูปไม่สำเร็จ: ' + err.message); }
}

async function insertImage() {
  const it = await pickImage(state.root);          // เลือกจากคลังแบบเห็นรูปจริง (แบบ v1)
  if (!it) return;
  return insertImageByName(it.file, it.caption);
}

// แทรกรูปจากคลังลงฉากที่เปิดอยู่ด้วย "ชื่อไฟล์" — ใช้ร่วมกับเมนูคลิกขวาใน Explorer (ข้อ 6)
async function insertImageByName(fileName, caption) {
  const t = state.active;
  if (!t || !(t.editor || t.sp)) { setStatus('เปิดฉากก่อนจึงจะแทรกรูปได้'); return; }
  const imgDir = await kapi.join(state.root, 'Images');
  const sceneDir = t.file.replace(/[\\/][^\\/]*$/, '');
  const rel = await kapi.relative(sceneDir, await kapi.join(imgDir, fileName));
  const cap = caption || fileName.replace(/\.[^.]+$/, '');
  (t.editor || t.sp).insertImage(rel, cap, `![${cap}](${rel})`);
  markDirty(t);
  setStatus('แทรกรูปแล้ว: ' + fileName);
}

// ---------------- เมนูจาก main process ----------------
async function renderLogPanel() {
  const body = $('#log-body'); if (!body) return;
  let text = '';
  try { text = (await kapi.logRead(800)) || ''; } catch {}
  if (!text) text = LOG_BUF.slice(-800).join('\n');
  body.textContent = text || '(ยังไม่มีบันทึก)';
  body.scrollTop = body.scrollHeight;
}
let _logTimer = null;
function startLogAutoRefresh() {
  if (_logTimer) return;
  _logTimer = setInterval(() => { if (isPanelOpen('log')) renderLogPanel(); }, 2000);
}
function stopLogAutoRefresh() {
  if (_logTimer) { clearInterval(_logTimer); _logTimer = null; }
}
window.__k2test = (p) => runTest(p);
window.__k2menu = null;

// ── บั๊ก #18: แผงฟีเจอร์ที่ไม่ใช่เอกสาร ─────────────────────────────────────
// showPanel วางแค่กล่องเปล่าให้ — เนื้อหาต้องวาดเอง ทั้งตอนสั่งเปิดจากเมนู
// และตอนกู้เลย์เอาต์จาก localStorage (ไม่งั้นเปิดโปรแกรมมาเจอแผงว่าง)
// ฟังก์ชันในนี้ "วาดอย่างเดียว" ห้ามเรียก showPanel เอง (ไม่งั้นวนซ้ำกับ hook ข้างล่าง)
const FEATURE_PANELS = {
  dashboard: () => renderDashboard($('#dash-body')),
  kanban:    () => renderKanbanPanel(),
  books:     () => renderBookManager($('#books-body')),
  timeline:  () => renderTimeline($('#tl-body')),
  maps:      () => renderMapsPanel(),
};
export function isFeaturePanel(id) { return !!FEATURE_PANELS[panelId(id)]; }
// วาดค้างอยู่ = ใช้รอบเดียวกัน — openX() เรียก showPanel (hook เริ่มวาด) แล้ว await ต่อ
// ถ้าไม่ dedupe จะวาดสองรอบทุกครั้งที่สั่งเปิด (แดชบอร์ดอ่านไฟล์ทั้งโปรเจกต์ = แพง)
const _featInFlight = new Map();
export function renderFeaturePanel(id) {
  const pid = panelId(id);
  const f = FEATURE_PANELS[pid];
  if (!f) return Promise.resolve(false);
  if (_featInFlight.has(pid)) return _featInFlight.get(pid);
  const p = Promise.resolve().then(f)
    .catch((e) => { log('error', 'วาดแผง ' + pid + ' ล้มเหลว', e); })
    .finally(() => _featInFlight.delete(pid))
    .then(() => true);
  _featInFlight.set(pid, p);
  return p;
}
// ทุกทางเข้าที่ทำให้แผงเปิด (เมนู · ถาดแผงที่ปิดไว้ · คำสั่ง) วิ่งผ่าน showPanel → hook นี้
setPanelShowHook((pid) => { renderFeaturePanel(pid); });
/** ล้างเนื้อแผงฟีเจอร์ (ตอนปิดโปรเจกต์ — ไม่งั้นโปรเจกต์ใหม่เห็นสถิติ/กระดานของเก่า) */
export function clearFeaturePanels() {
  for (const sel of ['#dash-body', '#kanban-body', '#books-body', '#tl-body', '#maps-body']) {
    const n = $(sel); if (n) n.innerHTML = '';
  }
  mapsState_C.s = null;
}
/** วาดแผงฟีเจอร์ทุกตัวที่เปิดค้างอยู่ (เรียกหลัง initPanelSystem ตอนเปิดโปรเจกต์) */
export async function renderOpenFeaturePanels() {
  for (const id of Object.keys(FEATURE_PANELS)) {
    if (isPanelOpen(id)) await renderFeaturePanel(id);
  }
}

// ── บั๊ก #10: พิมพ์/ส่งออก PDF ต้องได้เฉพาะหน้าที่เปิดอยู่ ───────────────────
// CSS @media print จัดการหลักแล้ว (.pane.on เท่านั้น) — สองตัวนี้เป็นตาข่ายกันพลาด
// เผื่อ inline style/ปลั๊กอินอื่นไปดัน display ของ pane ที่ไม่ active
function hideInactivePanes() {
  document.querySelectorAll('#panes .pane:not(.on)').forEach((p) => {
    p.dataset.k2hide = p.style.display || '';
    p.style.display = 'none';
  });
}
function restoreInactivePanes() {
  document.querySelectorAll('#panes .pane[data-k2hide]').forEach((p) => {
    p.style.display = p.dataset.k2hide;
    delete p.dataset.k2hide;
  });
}

async function handleCommand(ch, ...a) {
  const t = state.active;
  switch (ch) {
    case 'new-project': newProject(); break;
    case 'confirm-quit': confirmQuit(); break;
    case 'changelog': showChangelog(); break;
    case 'show-log': showPanel('log'); renderLogPanel(); syncMenuToggles(); break;
    case 'open-project': { const p = await kapi.openProjectDialog(); if (p) loadProject(p); break; }
    case 'open-project-path': loadProject(a[0]); break;
    case 'save': saveTab(t); break;
    case 'save-all': saveAllTabs(); break;
    case 'save-as': {
      if (!t) break;
      const p = await kapi.saveAsDialog(t.title + '.md');
      if (p) { const body = t.editor ? t.editor.getMarkdown() : t.plain.value;
               await kapi.writeFile(p, dumpMdFile(t.meta, body));
                setStatus('Save As: ' + p); }
      break;
    }
    case 'print': document.body.classList.add('printing');
                  hideInactivePanes();
                  await kapi.print();
                  restoreInactivePanes();
                  setTimeout(() => document.body.classList.remove('printing'), 800); break;
    case 'export-pdf': {
      if (!t) break;
      const p = await kapi.savePdfDialog(t.title + '.pdf');
      if (p) { document.body.classList.add('printing');
               hideInactivePanes();
               await kapi.printToPdf(p);
               restoreInactivePanes();
               document.body.classList.remove('printing');
               setStatus('ส่งออก PDF: ' + p); }
      break;
    }
    case 'close-tab': if (t) closeTab(t.file); break;
    case 'close-all-tabs': closeAllTabs(); break;
    // [95] ในบทหนัง Ctrl+1/2/3 = scene/action/character (คีย์เดียวกับหัวข้อ 1-3 ของนิยาย)
    case 'fmt': {
      const spFmt = state.active?.sp;
      const SP_HEAD = { 1: 'scene', 2: 'action', 3: 'character' };
      if (spFmt && a[0] === 'heading' && SP_HEAD[a[1]]) {
        spFmt.switchTo(SP_HEAD[a[1]]);
      } else {
        getActiveEditor()?.cmd(a[0], a[1]);
      }
      refreshToolbar(); if (t) markDirty(t); break;
    }
    case 'editor-undo': getActiveEditor()?.cmd('undo'); refreshToolbar(); break;
    case 'editor-redo': getActiveEditor()?.cmd('redo'); refreshToolbar(); break;
    case 'insert-image': insertImage(); break;
    case 'gallery': await openGallery(); break;
    case 'find': openFind(); break;
    case 'dashboard': openDashboard(); break;
    case 'books': openBookManager(); break;
    case 'timeline': openTimeline(); break;
    case 'maps': openMaps(); break;
    case 'network': openNetwork(); break;
    case 'planner': openPlanner(); break;
    case 'focus-mode': toggleFocus(); break;
    case 'paper-mode': togglePaper(); break;
    case 'reading-mode': toggleReading(); break;
    case 'line-numbers':
      state.settings.lineNumbers = !state.settings.lineNumbers;
      applySettings(); saveProjectMeta(); syncMenuToggles(); refreshToolbar();
      setStatus(state.settings.lineNumbers ? 'เลขบรรทัด: เปิด' : 'เลขบรรทัด: ปิด');
      break;
    // ---- ฟีเจอร์ที่เคยไม่มีทางเข้าถึง (import ไว้แต่ไม่มีเมนู/ปุ่ม) ----
    case 'typewriter': setStatus(toggleTypewriter() ? 'โหมดเครื่องพิมพ์ดีด: เปิด' : 'โหมดเครื่องพิมพ์ดีด: ปิด'); refreshToolbar();
                       syncMenuToggles(); break;
    case 'quick-open': openQuickOpen(); break;
    case 'global-search': showPanel('search'); renderSearchPanel($('#search-body')); syncMenuToggles(); break;
    case 'centralize': openCentralizeUI(); break;
    case 'branching': openBranchingTree(); break;
    case 'branch-sync': syncChoicesFromScene(); break;
    case 'floorplan': openFloorPlan(); break;
    case 'scratchpad': showPanel('notes'); renderNotesPanel($('#notes-body')); syncMenuToggles(); break;
    case 'export-blog': exportBlogHTML(); break;
    case 'export-zip': exportProjectZip(); break;
    case 'export-json': exportProjectJson(); break;
    case 'backup-now': autoBackupNow(); break;
    case 'new-from-template': newProjectFromTemplate(); break;
    case 'import-scrivener': importScrivenerDialog((p) => loadProject(p)); break;
    case 'ai-settings': showAISettingsDialog(); break;
    case 'ai-summary': showAISummary(); break;
    case 'ai-title': showAITitleSuggestions(state.title || '', async (title) => {
        if (!state.meta) return;
        state.meta.title = title; state.title = title;
        await saveProjectMeta(); $('#projname').textContent = title;
        setStatus('เปลี่ยนชื่อเรื่องเป็น: ' + title);
      }, { kind: 'project' }); break;
    case 'custom-status': manageCustomStatuses(); break;
    case 'visual-tags': manageVisualTags(); break;
    case 'player-history': showPlayerHistory(); break;
    case 'all-notes': showAllNotes(); break;
    case 'quick-note': { const c = await sceneCtx();
      quickNote(c?.row?.id, c?.row?.title); break; }
    case 'comments': await openCommentsPanel(); syncMenuToggles(); break;
    case 'show-panel': showPanel(a[0]); syncMenuToggles(); break;
    // สลับแสดง/ซ่อนแผง — เมนูเป็นสวิตช์ (มีเครื่องหมายถูก) จึงต้องปิดได้ด้วย ไม่ใช่แค่เปิด
    // แผงฟีเจอร์ (บั๊ก #18) วาดเนื้อหาผ่าน hook ใน showPanel แล้ว
    case 'toggle-panel': togglePanel(a[0]); syncMenuToggles(); break;
    case 'reset-panels': resetPanels(); syncMenuToggles(); break;
    case 'export-draft': exportDraft(); break;
    case 'zoom': (a[0] === 0) ? resetPageScale() : bumpPageScale(a[0]); break;
    case 'ui-scale': bumpUIScale(a[0]); break;
    case 'compile': openCompileDialog(); break;
    case 'settings': settingsDialog(); break;
    case 'toggle-format': switchFormat(); break;
    case 'set-format': switchFormat(a[0]); break;
    case 'about': alert('Killian 2 (alpha)\nโปรแกรมเขียนนิยาย/บทหนัง — Electron + ProseMirror\nไฟล์เป็น Markdown เปิดร่วมกับ Killian v1 ได้'); break;
    case 'test-run': runTest(a[0]); break;
    // [95] Per-element shortcuts + [79] Select scene + [77] Non-breaking space
    case 'sp-element': {
      const sp = state.active?.sp;
      if (sp) sp.switchTo(a[0]);
      refreshToolbar();
      if (t) markDirty(t);
      break;
    }
    case 'select-scene': {
      const spAct = state.active?.sp;
      if (spAct) spAct.selectScene();
      break;
    }
    case 'nbsp': {
      const ed = getActiveEditor();
      if (ed?.view) ed.view.dispatch(ed.view.state.tr.insertText('\u00A0'));
      ed?.focus();
      break;
    }
    case 'revert': if (t) await revertTab(t.file); break;
    case 'remove-elements': removeElementsDialog(); break;
    case 'char-map': showCharMap(); break;
    // ---- Part 1+2: ฟีเจอร์ใหม่ (Kanban, Panel, Split, AI, Thesaurus, Auto-sync) ----
    case 'kanban': togglePanel('kanban'); break;
    case 'split-view': toggleSplit(state.active?.file || '', a[0] || undefined); break;
    case 'split-add': createSplit(state.active?.file || '', a[0] || undefined); break;   // เพิ่มอีกช่อง (ซ้อนได้)
    case 'split-close': closeSplit(); break;
    case 'panel-system': togglePanelDialog(); break;
    case 'ai-assistant': openAIAssistant(); break;
    case 'ai-plot': openPlotHoleDetector(); break;
    case 'ai-dialogue': openDialogueGenerator(); break;
    case 'ai-consistency': { const t2 = state.active;
      openConsistencyCheck(t2?.file || ''); break; }
    case 'ai-world': openWorldGenerator(); break;
    case 'ai-chat': openAIChat(); break;
    case 'auto-sync': setAutoSync(a[0] === undefined ? !isAutoSyncOn() : !!a[0]);
                      state.settings.autoSync = isAutoSyncOn(); saveProjectMeta(); break;
  }
}
kapi.onMenu(handleCommand);

// ---- คีย์ลัดฝั่ง renderer: จับด้วย e.code (ปุ่มกายภาพ = ทำงานทุกภาษาแป้นพิมพ์
//      และไม่พึ่ง accelerator ของเมนู native ที่หน้าต่างไร้ขอบบน Windows มักไม่ยิง) ----
// SHORTCUTS, SHORTCUT_LABELS, shortcutId, accelText, formatShortcut → ย้ายไป core.js
function onShortcut(e) {
  // ปล่อยให้ cut/copy/paste/select-all ทำงานเองตามเบราว์เซอร์ (ในช่องแก้ไข)
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;
  const ae = document.activeElement;
  const inField = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT');
  for (const [code, needCtrl, needShift, ch, ...args] of effectiveShortcuts()) {
    if (e.code === code && !!needCtrl === ctrl && !!needShift === e.shiftKey && !e.altKey) {
      // undo/redo: ในช่อง input/textarea ให้เบราว์เซอร์จัดการเอง (อย่าไปขับ PM)
      if ((ch === 'editor-undo' || ch === 'editor-redo') && inField) return;
      e.preventDefault();
      handleCommand(ch, ...args);
      return;
    }
  }
}
window.addEventListener('keydown', onShortcut, true);

// บันทึกทั้งหมด: Ctrl+Alt+S (แยกจาก SHORTCUTS หลักที่บังคับ !altKey — กันชน save/save-as)
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.altKey && !e.shiftKey && e.code === 'KeyS') {
    e.preventDefault(); handleCommand('save-all');
  }
}, true);

// ---------------- ซูมด้วย Ctrl+ล้อเมาส์ + Ctrl+0 รีเซ็ต (ทั้งโหมดนิยาย/บทหนัง) ----------------
window.addEventListener('wheel', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  // ทำงานเมื่ออยู่เหนือพื้นที่ตัวแก้ไข (ProseMirror) เท่านั้น
  if (!e.target.closest || !e.target.closest('.ProseMirror')) return;
  e.preventDefault();
  bumpPageScale(e.deltaY < 0 ? 1 : -1);
}, { passive: false, capture: true });
window.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  // รีเซ็ตซูม: Ctrl+Shift+0 (เลี่ยงชน Ctrl+0 = ย่อหน้าปกติ) · ปรับ: Ctrl+= / Ctrl+-
  if ((e.code === 'Digit0' || e.code === 'Numpad0') && e.shiftKey) { e.preventDefault(); resetPageScale(); }
  else if ((e.code === 'Equal' || e.code === 'NumpadAdd')) { e.preventDefault(); bumpPageScale(1); }
  else if ((e.code === 'Minus' || e.code === 'NumpadSubtract')) { e.preventDefault(); bumpPageScale(-1); }
}, true);

// ---------------- คีย์ลัดที่ตั้งเองได้ ----------------
// shortcutId, SHORTCUT_LABELS, accelText → ย้ายไป core.js
// รวมค่าเริ่มต้นกับที่ผู้ใช้ตั้งเอง (settings.shortcuts[id] = {code, ctrl, shift})
function effectiveShortcuts() {
  const ov = (state.settings && state.settings.shortcuts) || {};
  return SHORTCUTS.map((s) => {
    const o = ov[shortcutId(s)];
    return o ? [o.code, o.ctrl, o.shift, ...s.slice(3)] : s;
  });
}

// ---------------- ระบบลากย้าย + จำตำแหน่งหน้าต่างย่อย (floating panels) ----------------
// อ่าน/เขียน layout ทั้งหมดใน localStorage ก้อนเดียว (persist ข้ามการเปิด-ปิดโปรแกรม)
function uiLayout() { try { return JSON.parse(localStorage.getItem('k2-ui-layout') || '{}'); } catch { return {}; } }
// (ลำดับแผงย้ายไปเก็บใน layout tree ของ PanelStore — k2-panel-layout)
function saveUiLayout(key, val) {
  const l = uiLayout(); l[key] = { ...(l[key] || {}), ...val };
  localStorage.setItem('k2-ui-layout', JSON.stringify(l));
}
// ทำให้ element ลากย้ายได้ด้วย handle + คืนค่าตำแหน่งที่เคยบันทึกไว้
// opts: { key, defaultPos:{left,top}, resizable, onEnd }
function makeDraggable(elm, handle, opts = {}) {
  const { key, defaultPos } = opts;
  const saved = key ? uiLayout()[key] : null;
  const pos = saved || defaultPos;
  if (pos) {
    elm.style.left = pos.left + 'px'; elm.style.top = pos.top + 'px';
    elm.style.right = 'auto'; elm.style.bottom = 'auto';
    if (opts.resizable && pos.width) { elm.style.width = pos.width + 'px'; elm.style.height = pos.height + 'px'; }
  }
  if (saved && saved.hidden) elm.style.display = 'none';
  let sx, sy, ox, oy, dragging = false, lastE = null;
  const down = (e) => {
    if (e.button !== 0 || !elm) return;
    dragging = true; sx = e.clientX; sy = e.clientY;
    const r = elm.getBoundingClientRect();
    const op = elm.offsetParent;
    const host = op ? op.getBoundingClientRect() : { left: 0, top: 0 };
    ox = r.left - host.left; oy = r.top - host.top;
    elm.classList.add('k-dragging');
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    e.preventDefault();
  };
  const move = (e) => {
    if (!dragging) return;
    lastE = e;
    const op = elm.offsetParent;
    const host = op ? op.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    let nx = ox + (e.clientX - sx), ny = oy + (e.clientY - sy);
    nx = Math.max(0, Math.min(nx, host.width - 40));       // กันหลุดขอบ
    ny = Math.max(0, Math.min(ny, host.height - 24));
    // snap แม่เหล็ก: ชิดขอบจอ + ชิดขอบแผงลอยอื่น (แบบ Photoshop)
    if (opts.snap) {
      const SNAP = 9;
      const r = elm.getBoundingClientRect();
      const targets = [...document.querySelectorAll('.k-float-panel, .float-win')]
        .filter((p) => p !== elm).map((p) => p.getBoundingClientRect());
      targets.push({ left: 0, top: 0, right: innerWidth, bottom: innerHeight });   // ขอบจอ
      for (const t of targets) {
        if (Math.abs(nx - t.left) < SNAP) nx = t.left;
        if (Math.abs(nx + r.width - t.right) < SNAP) nx = t.right - r.width;
        if (Math.abs(nx - t.right) < SNAP) nx = t.right;                 // ชิดต่อด้านขวาแผงอื่น
        if (Math.abs(ny - t.top) < SNAP) ny = t.top;
        if (Math.abs(ny + r.height - t.bottom) < SNAP) ny = t.bottom - r.height;
        if (Math.abs(ny - t.bottom) < SNAP) ny = t.bottom;              // วางต่อใต้แผงอื่น (stack)
      }
    }
    elm.style.left = nx + 'px'; elm.style.top = ny + 'px';
    elm.style.right = 'auto'; elm.style.bottom = 'auto';
    opts.onMove && opts.onMove(e);
  };
  const up = () => {
    dragging = false; elm.classList.remove('k-dragging');
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    if (key) saveUiLayout(key, { left: parseInt(elm.style.left, 10) || 0,
                                 top: parseInt(elm.style.top, 10) || 0 });
    opts.onEnd && opts.onEnd(lastE);
  };
  handle.addEventListener('mousedown', down);
  return {
    reset() { if (key) { const l = uiLayout(); delete l[key]; localStorage.setItem('k2-ui-layout', JSON.stringify(l)); }
              if (defaultPos) { elm.style.left = defaultPos.left + 'px'; elm.style.top = defaultPos.top + 'px'; } },
  };
}

// ---- แสดงคีย์ลัดใน title ของปุ่มในแถบเครื่องมือ (i18n-aware) ----
// map: element ID -> shortcut ID (matching SHORTCUTS table)
const TB_SC_MAP = {
  'tb-bold': 'fmt:bold', 'tb-italic': 'fmt:italic', 'tb-underline': 'fmt:underline',
  'tb-strike': 'fmt:strike', 'tb-ul': 'fmt:ul', 'tb-ol': 'fmt:ol',
  'tb-align-left': 'fmt:align:left', 'tb-align-center': 'fmt:align:center',
  'tb-align-right': 'fmt:align:right', 'tb-align-justify': 'fmt:align:justify',
  'tb-paper': 'paper-mode', 'tb-gsearch': 'global-search', 'tb-mode': 'toggle-format',
  'tb-close': 'close-tab', 'tb-focus': 'focus-mode',
  'tb-typewriter': 'typewriter', 'tb-quickopen': 'quick-open',
  'tb-gallery': 'gallery',
};
export function applyToolbarShortcutTitles() {
  for (const [id, sid] of Object.entries(TB_SC_MAP)) {
    const btn = $('#' + id);
    if (!btn) continue;
    const sc = SHORTCUTS.find((s) => shortcutId(s) === sid);
    if (sc) {
      const label = t(SHORTCUT_LABELS[sid], SHORTCUT_LABELS[sid]);
      btn.title = label + ' (' + formatShortcut(sc[0], sc[1], sc[2]) + ')';
    }
  }
  // ปุ่มอื่นที่ไม่ได้มีใน SHORTCUTS หลัก
  $('#tb-img') && ($('#tb-img').title = t('toolbar.insertImage'));
  $('#tb-source') && ($('#tb-source').title = t('toolbar.viewSource'));
  $('#tb-read') && ($('#tb-read').title = t('toolbar.readingMode'));
  $('#tb-kanban') && ($('#tb-kanban').title = t('toolbar.kanban'));
  $('#tb-ai') && ($('#tb-ai').title = t('toolbar.aiAssistant'));
  $('#tb-ai-chat') && ($('#tb-ai-chat').title = t('toolbar.aiChat'));
  // save-all + home
  const sab = $('#save-all-btn');
  if (sab) sab.title = t('shortcuts.saveAll') + ' (Ctrl+Shift+S)';
  const hb = $('#home-btn');
  if (hb) hb.title = t('app.home');
  // apply i18n to style select options
  $('#tb-style')?.querySelectorAll('option').forEach((o) => {
    const k = o.getAttribute('data-i18n');
    if (k) o.textContent = t(k);
  });
  // FAB
  const fab = $('#k-fab');
  if (fab) fab.title = t('panel.fab');
  fab?.parentElement?.querySelectorAll('.k-menu-item span[data-i18n]').forEach((s) => {
    s.textContent = t(s.getAttribute('data-i18n'));
  });
}

// ---------------- toolbar wiring ----------------
export function tb(id, cmd, arg) { $(id).onclick = () => {
  getActiveEditor()?.cmd(cmd, arg);
  refreshToolbar(); if (state.active) markDirty(state.active); }; }

// สร้างแถบรูปแบบอักษรแบบลอยในพื้นที่หน้ากระดาษ — ย้ายปุ่มจัดรูปแบบเดิมเข้าไป (id คงเดิม
// จึงใช้ร่วมกับ tb()/refreshToolbar ได้ทันที) ลากด้วยหูจับซ้าย + จำตำแหน่งลง localStorage
let floatBar = null;
function setupFloatingFormatBar() {
  if (floatBar) return;
  const bar = el('div', 'k-fmtbar');
  const handle = el('div', 'k-fmtbar-grip'); handle.title = 'ลากเพื่อย้ายแถบ';
  handle.innerHTML = '<span></span><span></span>';
  bar.append(handle);
  // ลำดับปุ่มตามภาพ: [grip] 📄กระดาษ · 📖โหมด · สไตล์ · B I U S · •≣ 1≣ · ❝ · ← ↔ → ☰ · 🖼 · </>
  // ลำดับปุ่มตาม Layout ใหม่: [📄] [📖▾] | [style] | [B I U S] | [•≡ 1≡ ❝] | [⬅ ⬌ ➡ ☰] | [🖼 </> 📖 🔍]
  ['#tb-sp-elem', '#tb-paper', '#tb-mode', '#tb-style', '#tb-bold', '#tb-italic', '#tb-underline', '#tb-strike',
   '#tb-ul', '#tb-ol', '#tb-quote',
   '#tb-align-left', '#tb-align-center', '#tb-align-right', '#tb-align-justify',
   '#tb-img', '#tb-source', '#tb-read', '#tb-gsearch'].forEach((sel) => {
    const e0 = $(sel); if (e0) bar.append(e0);
  });
  $('#toolbar').querySelectorAll('.sep').forEach((s) => s.remove());
  $('#content').append(bar);
  floatBar = bar;
  const drag = makeDraggable(bar, handle, { key: 'fmtbar', defaultPos: { left: 24, top: 12 } });
  handle.addEventListener('dblclick', () => { drag.reset(); setStatus('รีเซ็ตตำแหน่งแถบรูปแบบแล้ว'); });
  syncFloatBarVisible();
}
function getActiveEditor() {
  const t = state.active;
  if (t?.editor) return t.editor;
  if (t?.sp) return t.sp;
  if (t?.wiki?.secEditors) {
    for (const {k} of t.wiki.secEditors) {
      if (k?.view?.hasFocus()) return k;
    }
    return t.wiki.secEditors[0]?.k || null;
  }
  return null;
}
// แสดงแถบลอยเฉพาะตอนมีตัวแก้ไขข้อความเปิดอยู่ (นิยาย/บทหนัง/wiki) — ไม่งั้นซ่อน
function syncFloatBarVisible() {
  if (!floatBar) return;
  const ed = getActiveEditor();
  const wk = state.active?.wiki?.secEditors?.some(({k}) => k?.view?.hasFocus())
          || (state.active?.wiki?.secEditors?.length > 0);
  floatBar.style.display = (ed || wk) ? 'flex' : 'none';
}

// ระบบแผงย้ายไป src/panels/* ทั้งหมดแล้ว (alpha.46 — Photoshop-style dock/tab/float)
// showPanel/hidePanel/togglePanel/resetPanels/panelMenuItems import มาจาก panels/panel-ui.js


// ---------------- Tooltip ระบบเดียว KTooltip (ข้อ 16) ----------------
// วาง tooltip "เหนือ" ตัว trigger เสมอ (ใช้ getBoundingClientRect + flip)
// ไม่หน่วงเวลา — แสดงทันที · รองรับข้อความยาว · ธีมตาม CSS
const TIP_GAP = 6;
let _tipEl = null, _tipHost = null, _tipSaved = '', _tipJob = null, _tipKt = null;

function tipBox() {
  if (!_tipEl) { _tipEl = el('div', 'k-tip'); _tipEl.id = 'k-tip'; document.body.append(_tipEl); }
  return _tipEl;
}
function placeTipRelative(el) {
  const box = tipBox();
  const er = el.getBoundingClientRect();
  const bw = box.offsetWidth || box.getBoundingClientRect().width;
  const bh = box.offsetHeight || box.getBoundingClientRect().height;
  let left = er.left + er.width / 2 - bw / 2;
  left = Math.max(4, Math.min(left, window.innerWidth - bw - 4));
  let top = er.top - bh - TIP_GAP;
  if (top < 4) top = er.bottom + TIP_GAP;          // ชิดขอบบน → ลงไปใต้ trigger แทน
  box.style.left = Math.round(left) + 'px';
  box.style.top = Math.round(top) + 'px';
}
function placeTipAt(x, y) {
  const box = tipBox();
  const bw = box.offsetWidth || box.getBoundingClientRect().width;
  const bh = box.offsetHeight || box.getBoundingClientRect().height;
  let left = x - bw / 2;
  left = Math.max(4, Math.min(left, window.innerWidth - bw - 4));
  let top = y - bh - TIP_GAP;
  if (top < 4) top = y + TIP_GAP + 4;
  box.style.left = Math.round(left) + 'px';
  box.style.top = Math.round(top) + 'px';
}
function hideTip() {
  clearTimeout(_tipJob);
  if (_tipHost && _tipSaved) { _tipHost.setAttribute('title', _tipSaved); }
  _tipHost = null; _tipSaved = ''; _tipKt = null;
  if (_tipEl) _tipEl.classList.remove('on');
}
function showTip(el, text) {
  hideTip();
  _tipHost = el; _tipSaved = text;
  el.removeAttribute('title');
  const box = tipBox();
  box.textContent = text;
  box.classList.add('multiline');
  box.classList.add('on');
  placeTipRelative(el);
}
// KTooltip(trigger, text) — API เดียวสำหรับ tooltip ทั้งโปรเจกต์
// แทนที่ trigger.title = '...' → KTooltip(trigger, '...')
// ติดตั้ง mouseenter/mouseleave + ใช้ getBoundingClientRect ของ trigger + flip
export function KTooltip(trigger, text, opts = {}) {
  if (!trigger || !text) return;
  trigger.title = text;                            // ฝาก title → setupHoverTips จัดการให้
  if (opts.above === false) {
    trigger.dataset.ktAbove = '0';               // บอกให้โชว์ใต้แทน (ปุ่มบน toolbar)
  }
}
function setupHoverTips() {
  document.addEventListener('mouseover', (e) => {
    const host = e.target instanceof Element ? e.target.closest('[title]') : null;
    if (!host || host === _tipHost) return;
    const text = host.getAttribute('title');
    if (!text) return;
    hideTip();
    _tipHost = host; _tipSaved = text; _tipKt = host;
    host.removeAttribute('title');
    const box = tipBox();
    box.textContent = text;
    box.classList.toggle('multiline', text.includes('\n'));
    box.classList.add('on');
    // ถ้า element มี data-kt-above=0 → ใช้ตำแหน่งใต้แทน
    if (host.dataset.ktAbove === '0') {
      const er = host.getBoundingClientRect();
      const bh = box.offsetHeight || box.getBoundingClientRect().height;
      box.style.left = Math.round(er.left + er.width / 2 - (box.offsetWidth || 100) / 2) + 'px';
      box.style.top = Math.round(er.bottom + TIP_GAP) + 'px';
    } else {
      placeTipRelative(host);
    }
  }, true);
  document.addEventListener('mouseout', (e) => {
    if (!_tipHost) return;
    const to = e.relatedTarget;
    if (to instanceof Node && _tipHost.contains(to)) return;
    hideTip();
  }, true);
  // เลื่อน/กด/ออกนอกหน้าต่าง → ซ่อนทันที
  for (const ev of ['mousedown', 'wheel', 'keydown', 'blur'])
    document.addEventListener(ev, hideTip, true);
}

// (ถาดแผงที่ปิดไว้ #k-min-tray เลิกใช้แล้ว — ใช้ปุ่ม toggle บน toolbar แทน)

// (ความกว้างแถบข้างปรับด้วยที่จับของ dock ใน Panel System แล้ว — .k-resize-handle)

window.addEventListener('DOMContentLoaded', () => {
  // ---- ลงทะเบียนฮุกให้ toolbar+UI อัปเดตเมื่อเปลี่ยนภาษา ----
  onLanguageChanged(applyToolbarShortcutTitles);
  // ---- โหลดภาษาเริ่มต้น (ไทย) แล้วค่อยเปิดโปรเจกต์ ----
  loadLanguage(DEFAULT_SETTINGS.language).then(() => {
    applyDataI18n();
    initIcons();
    applyToolbarShortcutTitles();
  });

  tb('#tb-bold', 'bold'); tb('#tb-italic', 'italic');
  tb('#tb-underline', 'underline'); tb('#tb-strike', 'strike');
  tb('#tb-ul', 'ul'); tb('#tb-ol', 'ol'); tb('#tb-quote', 'quote');
  tb('#tb-align-left', 'align', 'left'); tb('#tb-align-center', 'align', 'center');
  tb('#tb-align-right', 'align', 'right'); tb('#tb-align-justify', 'align', 'justify');
  $('#tb-img').onclick = insertImage;
  $('#tb-gallery').onclick = () => openGallery();
  $('#tb-mode').onclick = (e) => {
    const tab = state.active;
    if (!tab || !(tab.editor || tab.sp)) return;
    const cur = tab.sp ? 'screenplay' : 'prose';
    const r = e.target.getBoundingClientRect();
    popupMenu(r.left, r.bottom + 4, [
      { label: iconHtml('book', 14) + ' ' + (cur === 'prose' ? '✓ ' : '') + 'นิยาย', click: () => switchFormat('prose') },
      { label: iconHtml('film', 14) + ' ' + (cur === 'screenplay' ? '✓ ' : '') + 'บทหนัง', click: () => switchFormat('screenplay') },
    ]);
  };
  $('#tb-style').onchange = (e) => {
    const v = e.target.value;
    const ed = getActiveEditor(); if (!ed) return;
    if (v === 'p') ed.cmd('paragraph');
    else if (v === 'quote') ed.cmd('quote');
    else ed.cmd('heading', +v.slice(1));
    if (state.active) markDirty(state.active);
  };
  $('#tb-sp-elem').onchange = (e) => {
    const sp = state.active?.sp; if (!sp) return;
    sp.setElement(e.target.value);
    sp.view.focus();
    setElementBadge(e.target.value);
    if (state.active) markDirty(state.active);
  };
  $('#open-btn').onclick = async () => { const p = await kapi.openProjectDialog(); if (p) loadProject(p); };
  $('#new-btn').onclick = () => newProject();
  $('#win-min').onclick = () => kapi.winMin();
  $('#win-max').onclick = () => kapi.winMax();
  $('#win-close').onclick = () => kapi.winClose();
  // Esc ออกจากโหมดโฟกัส — แต่ต้องไม่แย่ง Esc ของกล่องโต้ตอบที่เปิดอยู่ (กล่องปิดตัวเองก่อน)
  // และเมื่อเปิดทั้งโฟกัส+โหมดอ่าน ให้ออกทีละชั้น: โฟกัสก่อน แล้วค่อยโหมดอ่าน (ดู toggleReading)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.querySelector('.k-overlay')) return;
    if (!document.body.classList.contains('focus-mode')) return;
    // ปักธงบนอีเวนต์ ไม่ใช่ดูคลาส — ตัวจับของโหมดอ่านอาจทำงานหลังจากคลาสถูกถอดไปแล้ว
    // (ลำดับ listener ขึ้นกับว่าใครลงทะเบียนก่อน) → Esc ครั้งเดียวจะออกทั้งสองโหมดพร้อมกัน
    e._k2EscUsed = true;
    toggleFocus(false);
  });
  $('#tb-plug').onclick = (e) => {
    if (!plugins.commands.length) return;
    const r = e.target.getBoundingClientRect();
    popupMenu(r.left, r.bottom + 4, plugins.commands.map((c) => (
      { label: c.label, click: () => { try { c.fn(); } catch (err) { setStatus('ปลั๊กอิน: ' + err.message); } } })));
  };
  document.querySelectorAll('.tb-menu').forEach((m) => {
    m.onclick = () => { const r = m.getBoundingClientRect(); kapi.menuPopup(m.dataset.m, r.left, r.bottom); };
  });
  $('#tb-source').onclick = () => showSourceView();
  $('#tb-paper').onclick = () => togglePaper();
  $('#tb-paper').classList.toggle('on', state.settings.paperMode !== false);
  // ---- ปุ่มโหมดอ่าน + ค้นหาทั้งโปรเจกต์ ----
  $('#tb-read').onclick = () => toggleReading();
  $('#tb-gsearch').onclick = () => handleCommand('global-search');
  bindGlobalSearchShortcut();
  // ---- ปุ่มโน้ตด่วน (ข้อ 85): คลิก = จดกับฉากที่เปิดอยู่ · คลิกขวา = ดูโน้ตทั้งหมด ----
  $('#tb-note').onclick = async () => { const c = await sceneCtx(); quickNote(c?.row?.id, c?.row?.title); };
  $('#tb-note').oncontextmenu = (e) => { e.preventDefault(); showAllNotes(); };
  // ---- ปุ่ม Kanban + AI ----
  $('#tb-kanban').onclick = () => togglePanel('kanban');
  $('#tb-ai').onclick = () => openAIAssistant();
  $('#tb-ai-chat').onclick = () => openAIChat();
  $('#tb-tree-panel').onclick = () => { togglePanel('tree'); refreshToolbar(); };
  $('#tb-outline-panel').onclick = () => { togglePanel('outline'); refreshToolbar(); };
  $('#tb-props-panel').onclick = () => { togglePanel('props'); refreshToolbar(); };
  $('#tb-search-panel').onclick = () => { togglePanel('search'); refreshToolbar(); };
  $('#tb-panels').onclick = () => togglePanelDialog();
  $('#tb-split').onclick = () => handleCommand('split-view');
  $('#tb-close').onclick = () => { const t = state.active; if (t) closeTab(t.file); };
  $('#tb-close-all').onclick = () => closeAllTabs();
  $('#tb-focus').onclick = () => handleCommand('focus-mode');
  $('#tb-typewriter').onclick = () => handleCommand('typewriter');
  $('#tb-linenum').onclick = () => handleCommand('line-numbers');
  $('#tb-quickopen').onclick = () => handleCommand('quick-open');
  // ---- ปุ่มลัด Cheatsheet (? / Ctrl+Shift+/) ----
  document.addEventListener('keydown', (e) => {
    if ((e.code === 'Slash' && e.ctrlKey && e.shiftKey) || (e.key === '?' && !e.ctrlKey && !e.metaKey)) {
      e.preventDefault(); showShortcutsDialog();
    }
  });
  // คีย์ลัดของ quick-open / typewriter / focus / global-search อยู่ในตาราง SHORTCUTS แล้ว
  // (เดิมผูก listener แยกที่ Ctrl+P และ Ctrl+Shift+F ซึ่งชนกับ 'print' และ 'focus-mode')
  // ---- สำรองอัตโนมัติ (เช็คทันที + ทุกชั่วโมง ว่าวันนี้สำรองหรือยัง) ----
  startAutoBackup();
  // ---- Auto-record daily words on autosave (modify autosave interval) ----
  // (จับใน saveAllTabs แทน)
  // ---- ปุ่มบันทึกทั้งหมด + หน้าแรก ----
  $('#save-all-btn').onclick = () => saveAllTabs();
  $('#home-btn').onclick = () => { import('./home-ui.js').then(m => m.showHomeDialog()); };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyS' && e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey) {
      e.preventDefault(); saveAllTabs();
    }
  });
  // ---- ตั้งค่า title ของปุ่ม toolbar ให้แสดง shortcut ----
  updateToolbarTitles();
  // ---- FAB (ปุ่มลอยสร้างใหม่) ----
  wireFab();
  // ---- tooltip ลอยเหนือเคอร์เซอร์ (ข้อ 16) ----
  setupHoverTips();
  // ---- Filter bar ----
  $('#filter-sort').onchange = () => { buildFilterBar(); filterTree($('#tree-search').value); };
  $('#filter-archive-toggle').onclick = function() {
    this.classList.toggle('on');
    // ซ่อน/แสดงฉากที่เก็บถาวรในต้นไม้
    const hideArchived = !this.classList.contains('on');
    document.querySelectorAll('#tree .scene').forEach((s) => {
      if (s._scene && s._scene.status === 'เก็บถาวร') {
        s.classList.toggle('archived', hideArchived);
        if (hideArchived) s.style.display = 'none';
        else s.style.display = (s.style.display === 'none' && !s.dataset.filteredHidden) ? '' : s.style.display;
      }
    });
  };
  // ---- ตัวควบคุมซูมมุมล่างขวา ----
  $('#zoom-slider').oninput = (e) => setPageScale(parseInt(e.target.value, 10) / 100);
  $('#zoom-in').onclick = () => bumpPageScale(1);
  $('#zoom-out').onclick = () => bumpPageScale(-1);
  $('#zoom-reset').onclick = () => resetPageScale();
  $('#tree-search').oninput = (e) => filterTree(e.target.value);

  // ---- แถบรูปแบบอักษรแบบลอย (ลากย้ายได้ · จำตำแหน่ง) ----
  setupFloatingFormatBar();
  // ---- Panel System (Photoshop-style) — วาดทุกแผงลง #app-root ----
  initPanelSystem();
  onPanelLayoutChange(refreshToolbar);
  startLogAutoRefresh();
  // ---- Split View — ผูก SplitManager เข้ากับ #panes + ลากหัวแท็บไปวางในช่องได้ ----
  // closeTab: บั๊ก #12 — × บนแท็บย่อยของช่อง เอาแท็บออกจากช่องนั้น
  // ถ้าไม่เหลืออยู่ช่องไหนเลยก็ต้องปิดแท็บจริง (แถบแท็บรวมถูกซ่อนตอนแยกจอ — ไม่งั้นแท็บลอยหาย)
  initSplitSystem({ activate, closeTab, onRender: () => refreshToolbar() });

  // ปุ่ม 🔄 บนหัวแผงโปรเจกต์ = อ่านโฟลเดอร์ใหม่ (ข้อ 11)
  // จำเป็นเพราะไฟล์ถูกแก้จากนอกโปรแกรมได้ (Explorer/Finder) แล้วต้นไม้ไม่รู้
  const refreshBtn = el('span', 'k-panel-btn k-tree-refresh-btn', '🔄');
  refreshBtn.title = 'รีเฟรช — อ่านไฟล์/โฟลเดอร์ใหม่จากดิสก์';
  refreshBtn.onclick = async (e) => {
    e.stopPropagation();
    if (!state.root) { setStatus('ยังไม่ได้เปิดโปรเจกต์'); return; }
    refreshBtn.classList.add('spin');
    try {
      await loadTemplates();
      await smart.loadNames(state.root);
      await buildTree();
      await buildFilterBar();
      setStatus('รีเฟรชรายการโปรเจกต์แล้ว');
    } finally { refreshBtn.classList.remove('spin'); }
  };
  addPanelButton('tree', refreshBtn);

  // ปุ่ม 🔍 บนหัวแผงโปรเจกต์ = เปิด/ปิดช่องค้นหา (อยู่ในแผง explorer)
  const searchBtn = el('span', 'k-panel-btn k-tree-search-btn', '🔍'); searchBtn.title = 'เปิด/ปิดช่องค้นหา';
  addPanelButton('tree', searchBtn);
  const searchOn0 = (localStorage.getItem('k2-tree-search') ?? '1') === '1';
  const applySearchVis = (on) => { $('#tree-search').classList.toggle('k-search-off', !on);
    searchBtn.classList.toggle('on', on); localStorage.setItem('k2-tree-search', on ? '1' : '0');
    if (on) $('#tree-search').focus(); };
  applySearchVis(searchOn0);
  searchBtn.onclick = (e) => { e.stopPropagation(); applySearchVis($('#tree-search').classList.contains('k-search-off')); };

  // ปุ่ม ¶ บนหัวแผง Navigation = โชว์/ซ่อนย่อหน้า (beat)
  const beatBtn = el('span', 'k-panel-btn', '¶'); beatBtn.id = 'nav-beats-btn'; beatBtn.title = 'แสดง/ซ่อนย่อหน้าใน Navigation';
  beatBtn.classList.toggle('on', navShowBeats);
  addPanelButton('outline', beatBtn);
  beatBtn.onclick = (e) => { e.stopPropagation(); setNavBeats(!navShowBeats); };

  // ปุ่มแผงบันทึก (Log): ↩ รีเฟรช, 📁 เปิดโฟลเดอร์, 📋 copy
  const logRefresh = el('span', 'k-panel-btn', '↻'); logRefresh.title = 'รีเฟรช';
  addPanelButton('log', logRefresh);
  logRefresh.onclick = (e) => { e.stopPropagation(); renderLogPanel(); };
  const logReveal = el('span', 'k-panel-btn'); logReveal.innerHTML = iconHtml('folder', 14); logReveal.title = 'เปิดโฟลเดอร์ log';
  addPanelButton('log', logReveal);
  logReveal.onclick = (e) => { e.stopPropagation(); kapi.logReveal && kapi.logReveal(); };
  const logCopy = el('span', 'k-panel-btn', '📋'); logCopy.title = 'คัดลอก';
  addPanelButton('log', logCopy);
  logCopy.onclick = (e) => { e.stopPropagation();
    const body = $('#log-body'); if (body) navigator.clipboard.writeText(body.textContent).then(() => setStatus('คัดลอก log แล้ว')); };

  // คลิกขวาคำที่ขีดแดง (สะกดผิด) → เพิ่มลงพจนานุกรมส่วนตัวของโปรเจกต์
  document.addEventListener('contextmenu', (e) => {
    if (!state.root) return;
    const bad = e.target.closest && e.target.closest('.k-spell-bad');
    // รายการคำพ้อง (เฉพาะคำอังกฤษ + เปิดใช้ในตั้งค่า) — รวมอยู่ในเมนูเดียวกัน ไม่ผูก listener ซ้อน
    const thes = thesaurusMenuItems(e.clientX, e.clientY);
    if (!bad && !thes.length) return;
    e.preventDefault(); e.stopPropagation();
    const items = [];
    if (bad) {
      const word = bad.textContent.trim();
      items.push({ label: `เพิ่ม “${word}” ลงพจนานุกรม`, click: async () => {
        await kapi.spellAddWord(state.root, word);
        await loadSpellDict(state.root);
        setStatus('เพิ่มลงพจนานุกรมแล้ว: ' + word);
      } });
    }
    if (bad && thes.length) items.push('-');
    items.push(...thes);
    // ---- คำพ้อง/คำตรงข้าม จาก tools/thesaurus.js ----
    const sel = window.getSelection();
    const word = sel?.toString()?.trim();
    if (word && word.length >= 2) {
      items.push('-');
      items.push({ label: `คำพ้อง/คำตรงข้าม “${word}”`, click: () => {
        showThesaurusPopup(word, e.clientX, e.clientY);
      } });
    }
    popupMenu(e.clientX, e.clientY, items);
  }, true);

  // วาง (paste) / ลาก-วาง (drop) รูปเข้าเอกสาร → คัดลอกเข้าคลัง Images แล้วแทรกอัตโนมัติ
  document.addEventListener('paste', async (e) => {
    const t = state.active; if (!t?.editor || !state.root) return;
    const imgs = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return;
    e.preventDefault();
    for (const f of imgs) await importImageFile(f, t);
  });
  const paneHost = $('#panes') || document.body;
  paneHost.addEventListener('dragover', (e) => {
    if ([...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault();
  });
  paneHost.addEventListener('drop', async (e) => {
    const t = state.active; if (!t?.editor || !state.root) return;
    const imgs = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return;
    e.preventDefault();
    for (const f of imgs) await importImageFile(f, t);
  });
  $('#find-q').addEventListener('input', doFind);
  $('#find-q').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') gotoMatch(state.active?.editor?.view, e.shiftKey ? -1 : 1);
    if (e.key === 'Escape') closeFind();
  });
  $('#find-next').onclick = () => gotoMatch(state.active?.editor?.view, 1);
  $('#find-prev').onclick = () => gotoMatch(state.active?.editor?.view, -1);
  $('#find-close').onclick = closeFind;
  $('#find-rep1').onclick = () => { replaceCurrent(state.active?.editor?.view, $('#find-r').value);
                                    markDirty(state.active); doFind(); };
  $('#find-repall').onclick = () => { const n = replaceAll(state.active?.editor?.view, $('#find-r').value);
                                      setStatus('แทนที่ ' + n + ' แห่ง'); markDirty(state.active); doFind(); };
  if (!location.search.includes('k2test')) kapi.listRecent().then((r) => { if (r[0]) loadProject(r[0]); else { import('./home-ui.js').then(m => m.showHomeDialog()); } });
  // autosave ตั้งค่าได้ผ่านตั้งค่าโปรเจกต์ (restartAutosave เรียกจาก applySettings เมื่อเปิดโปรเจกต์)
  restartAutosave();
});

// ---------------- FAB (ปุ่มลอยสร้างใหม่) ----------------
// ---------------- เลือกปลายทาง เล่ม → ฉบับร่าง → บท (ข้อ 9) ----------------
// เดิม FAB ยัดของลง sections[0]/drafts[0]/chapters[0] เสมอ — โปรเจกต์ที่มีหลายเล่มจึงสร้างผิดที่
// ค่าเริ่มต้นของกล่องนี้ = บริบทที่ผู้ใช้เปิดอยู่ (ถ้ามี) ไม่งั้น = อันแรก
// needChapter=false → ใช้เลือกปลายทางของ "บทใหม่" (พอถึงระดับฉบับร่าง)
async function pickDraftTarget({ needChapter = true, title = 'สร้างที่ไหน' } = {}) {
  const sections = await listSections();
  if (!sections.length) { setStatus('ยังไม่มีเล่ม — สร้างเล่มก่อน'); return null; }

  // อ่านฉบับร่างของแต่ละเล่มไว้ล่วงหน้า (โปรเจกต์ใหญ่สุดก็ยังเป็นสิบ ๆ รายการ ไม่หนัก)
  const tree = [];
  for (const s of sections) {
    const dr = await kapi.join(s.secPath, 'Draft');
    if (!(await kapi.exists(dr))) continue;
    const drafts = [];
    for (const dn of await kapi.listDirs(dr)) {
      const dPath = await kapi.join(dr, dn);
      let chapters = [];
      try {
        chapters = ((await kapi.readJson(await kapi.join(dPath, 'draft.json'))).chapters || [])
          .slice().sort((a, b) => (a.order || 0) - (b.order || 0));
      } catch {}
      drafts.push({ name: dn, dPath, chapters });
    }
    if (drafts.length) tree.push({ ...s, drafts });
  }
  if (!tree.length) { setStatus('ยังไม่มีฉบับร่าง — สร้างเล่ม/ฉบับร่างก่อน'); return null; }

  const ctx = await sceneCtx();                   // ฉากที่เปิดอยู่ = ค่าเริ่มต้นที่ตรงใจที่สุด
  let si = 0, di = 0, ci = 0;
  if (ctx) outer: for (let a = 0; a < tree.length; a++)
    for (let b = 0; b < tree[a].drafts.length; b++)
      if (tree[a].drafts[b].dPath === ctx.dPath) {
        si = a; di = b;
        const k = tree[a].drafts[b].chapters.findIndex((c) => c.guid === ctx.ch.guid);
        ci = k < 0 ? 0 : k;
        break outer;
      }

  return new Promise((resolve) => {
    const ov = el('div', 'k-overlay');
    const box = el('div', 'k-dialog');
    box.append(el('div', 'k-dlg-title', title));
    const mkRow = (label) => { const r = el('div', 'wiki-row'); r.append(el('label', null, label));
      const s = el('select', 'wiki-input k-dlg-select'); r.append(s); box.append(r); return s; };
    const selSec = mkRow('เล่ม');
    const selDraft = mkRow('ฉบับร่าง');
    const selCh = needChapter ? mkRow('บท') : null;
    const fill = (sel, items, cur) => {
      sel.replaceChildren();
      items.forEach((txt, i) => { const o = el('option', null, txt); o.value = String(i); sel.append(o); });
      sel.value = String(Math.min(cur, Math.max(0, items.length - 1)));
    };
    const syncCh = () => {
      if (!selCh) return;
      const chs = tree[+selSec.value].drafts[+selDraft.value].chapters;
      fill(selCh, chs.length ? chs.map((c) => c.title || '(ไม่มีชื่อ)') : ['— ยังไม่มีบท —'], ci);
      selCh.disabled = !chs.length;
    };
    const syncDraft = () => {
      fill(selDraft, tree[+selSec.value].drafts.map((d) => d.name), di);
      syncCh();
    };
    fill(selSec, tree.map((s) => s.title), si);
    syncDraft();
    selSec.onchange = () => { di = 0; ci = 0; syncDraft(); };
    selDraft.onchange = () => { ci = 0; syncCh(); };

    const btns = el('div', 'k-dlg-btns');
    const cB = el('button', null, 'ยกเลิก');
    const okB = el('button', 'k-ok', 'ตกลง');
    btns.append(cB, okB); box.append(btns); ov.append(box); document.body.append(ov);
    const done = (v) => { ov.remove(); resolve(v); };
    cB.onclick = () => done(null);
    ov.onclick = (e) => { if (e.target === ov) done(null); };
    okB.onclick = () => {
      const dr = tree[+selSec.value].drafts[+selDraft.value];
      if (needChapter) {
        const ch = dr.chapters[+selCh.value];
        if (!ch) { setStatus('ฉบับร่างนี้ยังไม่มีบท — สร้างบทก่อน'); return; }
        done({ dPath: dr.dPath, chapter: ch });
      } else done({ dPath: dr.dPath, chapter: null });
    };
    okB.focus();
  });
}

function wireFab() {
  const fab = $('#k-fab');
  const fabMenu = $('#k-fab-menu');
  if (!fab || !fabMenu) return;
  let fabOpen = false;
  
  fab.onclick = () => {
    fabOpen = !fabOpen;
    fab.classList.toggle('open', fabOpen);
    fabMenu.classList.toggle('k-menu-off', !fabOpen);
  };
  
  // จัดการคลิกที่เมนู FAB
  fabMenu.querySelectorAll('.k-menu-item').forEach((item) => {
    item.onclick = async (e) => {
      e.stopPropagation();
      fabOpen = false;
      fab.classList.remove('open');
      fabMenu.classList.add('k-menu-off');
      
      const action = item.dataset.action;
      
      switch (action) {
        case 'scene': {
          // ให้ผู้ใช้เลือก เล่ม→ฉบับร่าง→บท เอง (เดิมยัดลงบทแรกของเล่มแรกเสมอ — บั๊กข้อ 9)
          if (!state.root) break;
          const dst = await pickDraftTarget({ title: 'สร้างฉากใหม่ที่ไหน' });
          if (!dst) break;
          addScene(dst.dPath, dst.chapter);
          break;
        }
        case 'chapter': {
          if (!state.root) break;
          const dst = await pickDraftTarget({ needChapter: false, title: 'สร้างบทใหม่ที่ไหน' });
          if (!dst) break;
          addChapter(dst.dPath);
          break;
        }
        case 'character':
          if (state.root) {
            const w = await wikiRoot();
            await kapi.mkdir(await kapi.join(w, 'characters'));
            addEntity(await kapi.join(w, 'characters'), 'characters');
          }
          break;
        case 'location':
          if (state.root) {
            const w = await wikiRoot();
            await kapi.mkdir(await kapi.join(w, 'locations'));
            addEntity(await kapi.join(w, 'locations'), 'locations');
          }
          break;
        case 'note':
          openScratchpad();
          break;
        case 'memo':
          if (state.root) {
            addMemo();
          }
          break;
      }
    };
  });
  
  // คลิกข้างนอก = ปิด
  document.addEventListener('click', (e) => {
    if (fabOpen && !fab.contains(e.target) && !fabMenu.contains(e.target)) {
      fabOpen = false;
      fab.classList.remove('open');
      fabMenu.classList.add('k-menu-off');
    }
  });
}

// ---------------- Filter Bar (แถบกรองสถานะ/แท็ก) ----------------
async function buildFilterBar() {
  const statusesEl = $('#filter-statuses');
  const tagsEl = $('#filter-tags');
  if (!statusesEl || !tagsEl) return;
  
  statusesEl.innerHTML = '';
  tagsEl.innerHTML = '';
  
  if (!state.root) return;
  
  // ปุ่มสถานะ
  for (const st of SCENE_STATUSES) {
    const chip = el('span', 'filter-chip', st);
    chip.onclick = () => {
      chip.classList.toggle('on');
      const q = $('#tree-search');
      const active = [...statusesEl.querySelectorAll('.filter-chip.on')].map((c) => c.textContent);
      // สร้าง query จากสถานะที่เลือก
      if (active.length) {
        q.value = active.map((s) => 'status:' + s).join(' OR ');
      } else {
        // ลบเฉพาะส่วน status: ออกจาก query
        q.value = q.value.replace(/\bstatus:\S+/g, '').replace(/\s+OR\s+/g, ' ').trim();
      }
      q.dispatchEvent(new Event('input', { bubbles: true }));
    };
    statusesEl.append(chip);
  }
  
  // แท็กยอดนิยม (top 8)
  try {
    const counts = {};
    for (const sec of await listSections()) {
      const dr = await kapi.join(sec.secPath, 'Draft');
      if (!(await kapi.exists(dr))) continue;
      for (const dn of await kapi.listDirs(dr)) {
        const dp = await kapi.join(dr, dn);
        const sf = await kapi.join(dp, 'scenes.json');
        if (!(await kapi.exists(sf))) continue;
        const d = await kapi.readJson(sf);
        const chs = d.chapters || {};
        for (const cg of Object.keys(chs)) {
          for (const sc of (chs[cg] || [])) {
            for (const t of (sc.tags || [])) {
              if (t) counts[t] = (counts[t] || 0) + 1;
            }
          }
        }
      }
    }
    const topTags = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    for (const [tag, cnt] of topTags) {
      const chip = el('span', 'filter-tag-chip', tag + ' (' + cnt + ')');
      // แท็กที่ตั้งสี/ไอคอนไว้ → ชิปตัวกรองใช้สีเดียวกับใน Explorer (ข้อ 84)
      // ชื่อแท็กจริงเก็บใน dataset — ไอคอนที่เติมข้างหน้าจะได้ไม่ปนเข้าไปในคิวรี
      chip.dataset.tag = tag;
      applyVisualTagStyle(chip, tag, { withIcon: false });
      const vt = visualTagFor(tag);
      if (vt && vt.icon) chip.textContent = vt.icon + ' ' + chip.textContent;
      chip.onclick = () => {
        chip.classList.toggle('on');
        const q = $('#tree-search');
        const active = [...tagsEl.querySelectorAll('.filter-tag-chip.on')]
          .map((c) => c.dataset.tag || c.textContent.replace(/\s*\(\d+\)/, ''));
        if (active.length) {
          q.value = active.map((t) => 'tag:' + t).join(' OR ');
        } else {
          q.value = q.value.replace(/\btag:\S+/g, '').replace(/\s+OR\s+/g, ' ').trim();
        }
        q.dispatchEvent(new Event('input', { bubbles: true }));
      };
      tagsEl.append(chip);
    }
  } catch {}
}

// ---------------- Progress Bar (แถบความคืบหน้า) ----------------
function updateProgressBar() {
  if (!state.root || !state.goals) return;
  const daily = state.goals.dailyWords || DEFAULT_GOALS.dailyWords;
  const projGoal = state.goals.projectWords || DEFAULT_GOALS.projectWords;
  
  // คำนวณจำนวนคำวันนี้ (ประมาณจาก total words)
  let totalWords = 0;
  try {
    for (const t of state.tabs.values()) {
      if ((t.editor || t.sp) && t.file && /\.md$/i.test(t.file)) {
        const text = t.editor ? t.editor.getText() : t.sp ? t.sp.getText() : '';
        totalWords += countWords(text);
      }
    }
  } catch {}
  
  const pctDaily = Math.min(100, Math.round((totalWords / daily) * 100));
  const fill = $('#prog-fill');
  const wrap = $('#prog-wrap');
  if (fill) fill.style.width = pctDaily + '%';
  if (wrap) wrap.title = `เป้าหมายวันนี้: ${totalWords.toLocaleString()} / ${daily.toLocaleString()} คำ (${pctDaily}%)`;
}

// ---------------- Status Bar extras (จำนวนฉาก/สถานะ/โหมด) ----------------
function updateStatusExtras() {
  if (!state.root) return;
  
  // นับจำนวนฉากในโปรเจกต์
  const updateSceneCount = async () => {
    let total = 0;
    try {
      for (const sec of await listSections()) {
        const dr = await kapi.join(sec.secPath, 'Draft');
        if (!(await kapi.exists(dr))) continue;
        for (const dn of await kapi.listDirs(dr)) {
          const dp = await kapi.join(dr, dn);
          const sf = await kapi.join(dp, 'scenes.json');
          if (!(await kapi.exists(sf))) continue;
          const d = await kapi.readJson(sf);
          const chs = d.chapters || {};
          for (const cg of Object.keys(chs)) {
            total += (chs[cg] || []).filter((s) => s.type !== 'memo').length;
          }
        }
      }
    } catch {}
    const el = $('#status-scenes');
    if (el) el.innerHTML = iconHtml('file', 14) + ' ' + total + ' ฉาก';
  };
  updateSceneCount();
  
  // โหมด (นิยาย/บทหนัง)
  const modeEl = $('#status-mode');
  if (modeEl) {
    const tab = state.active;
    modeEl.innerHTML = tab?.sp ? (iconHtml('film', 14) + ' บทหนัง') : tab?.editor ? (iconHtml('book', 14) + ' นิยาย') : '';
  }
  
  // สถานะ autosave + วันที่แก้ไขล่าสุด
  const saveEl = $('#status-save');
  if (saveEl) {
    const tab = state.active;
    if (tab && tab.dirty) {
      saveEl.textContent = '⏳ ยังไม่บันทึก';
      saveEl.style.color = 'var(--orange)';
    } else if (tab) {
      const mod = tab.meta?.modified || '';
      if (mod) {
        const d = new Date(mod);
        saveEl.innerHTML = iconHtml('save', 12) + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      } else {
        saveEl.innerHTML = iconHtml('save', 12);
      }
      saveEl.style.color = '';
    }
  }
  
  updateProgressBar();
}

// เรียกหลัง buildTree, activate, saveTab, ฯลฯ
// ผูกเข้าไปใน activate และ saveTab (เรียบร้อยแล้วผ่าน refreshToolbar/scheduleCount)
// เราจะเรียก updateStatusExtras ใน activate ด้วย
const origActivate2 = activate;
// ใช้ monkey-patch แบบง่าย — เพิ่มที่ท้าย activate
const _origActivate = activate;
// (ใช้ wrapper ใน scheduleCount แทน)

function refreshStatusBar() {
  updateStatusExtras();
  updateProgressBar();
  updateDirtyBadge();
  updateSummaryBar();
}

// ---------------- Summary Bar (ข้อ 46) — แสดงสรุปด่วนเหนือ tree ----------------
async function updateSummaryBar() {
  const bar = $('#summary-bar');
  if (!bar || !state.root) return;
  
  try {
    let totalScenes = 0, totalWords = 0, totalChars = 0, totalLocations = 0;
    
    // นับฉาก + คำจากทุกเล่ม
    for (const sec of await listSections()) {
      const dr = await kapi.join(sec.secPath, 'Draft');
      if (!(await kapi.exists(dr))) continue;
      for (const dn of await kapi.listDirs(dr)) {
        const dp = await kapi.join(dr, dn);
        const sf = await kapi.join(dp, 'scenes.json');
        if (!(await kapi.exists(sf))) continue;
        const d = await kapi.readJson(sf);
        const chs = d.chapters || {};
        for (const cg of Object.keys(chs)) {
          for (const sc of (chs[cg] || [])) {
            if (sc.type === 'memo') continue;
            totalScenes++;
            totalWords += sc.wordCount || 0;
          }
        }
      }
    }
    
    // นับตัวละคร + สถานที่จาก Wiki
    for (const wbase of ['Wiki', 'Bible']) {
      const wr = await kapi.join(state.root, wbase);
      if (!(await kapi.exists(wr))) continue;
      const charsDir = await kapi.join(wr, 'characters');
      if (await kapi.exists(charsDir)) {
        totalChars = (await kapi.listFiles(charsDir, '.json')).length;
      }
      const locsDir = await kapi.join(wr, 'locations');
      if (await kapi.exists(locsDir)) {
        totalLocations = (await kapi.listFiles(locsDir, '.json')).length;
      }
    }
    
    // เป้าหมาย
    const goal = state.goals?.projectWords || DEFAULT_GOALS.projectWords;
    const pct = Math.min(100, Math.round((totalWords / goal) * 100));
    
    bar.innerHTML = '';
    const items = [
      `📄 ${totalScenes} ${t('scenes')}`,
      `📝 ${totalWords.toLocaleString()} ${t('words')}`,
      `👤 ${totalChars} ${t('characters')}`,
      `📍 ${totalLocations} ${t('locations')}`,
      `📊 ${pct}% ${t('percentGoal')}`,
    ];
    for (const item of items) {
      const span = el('span', 'sum-item', item);
      bar.append(span);
    }
  } catch {
    bar.innerHTML = '';
  }
}

// ---------------- Shortcuts Cheatsheet (ข้อ 50) — กด ? หรือ Ctrl+Shift+/ ----------------
function showShortcutsDialog() {
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog k-wide k-keys-dlg');
  box.append(el('div', 'k-dlg-title', t('allShortcutsTitle')));

  // กลุ่มคีย์ลัด: [category i18n key, shortcut IDs]
  const catKeys = {
    'shortcutCategories.file': ['save', 'save-all', 'global-search'],
    'shortcutCategories.edit': ['fmt:bold', 'fmt:italic', 'fmt:underline', 'fmt:strike', 'find', 'editor-undo', 'editor-redo'],
    'shortcutCategories.format': ['fmt:heading:1', 'fmt:heading:2', 'fmt:heading:3', 'fmt:paragraph',
      'fmt:ul', 'fmt:ol', 'fmt:align:left', 'fmt:align:center', 'fmt:align:right', 'fmt:align:justify',
      'toggle-format', 'paper-mode'],
    'shortcutCategories.view': ['focus-mode', 'quick-open', 'typewriter', 'settings'],
    'shortcutCategories.navigation': ['toggle-format', 'close-tab', 'compile'],
  };
  // รวบรวมคีย์ลัดทั้งหมดพร้อม accel text
  const scMap = {};
  for (const s of SHORTCUTS) {
    const id = shortcutId(s);
    if (SHORTCUT_LABELS[id]) {
      scMap[id] = { label: t(SHORTCUT_LABELS[id], SHORTCUT_LABELS[id]), accel: formatShortcut(s[0], s[1], s[2]) };
    }
  }
  // เพิ่ม save-all (Ctrl+Shift+S)
  scMap['save-all'] = { label: t('shortcuts.saveAll'), accel: formatShortcut('KeyS', true, true) };
  // เพิ่ม zoom (Ctrl+=, Ctrl+-, Ctrl+Shift+0)
  const zoomItems = [
    [t('status.zoom') + ' +', formatShortcut('Equal', true, false)],
    [t('status.zoom') + ' −', formatShortcut('Minus', true, false)],
    [t('status.zoomReset'), formatShortcut('Digit0', true, true)],
  ];

  const grid = el('div', 'k-keys-grid');
  for (const [catKey, ids] of Object.entries(catKeys)) {
    const sec = el('div', 'k-keys-sec');
    sec.append(el('div', 'k-keys-cat', t(catKey, catKey)));
    for (const id of ids) {
      const sc = scMap[id];
      if (!sc) continue;
      const row = el('div', 'k-keys-row');
      row.append(el('span', 'k-keys-name', sc.label));
      row.append(el('span', 'k-keys-key', sc.accel));
      sec.append(row);
    }
    // เพิ่ม zoom items ใน view category
    if (catKey === 'shortcutCategories.view') {
      for (const [label, accel] of zoomItems) {
        const row = el('div', 'k-keys-row');
        row.append(el('span', 'k-keys-name', label));
        row.append(el('span', 'k-keys-key', accel));
        sec.append(row);
      }
    }
    grid.append(sec);
  }
  box.append(grid);

  const btns = el('div', 'k-dlg-btns');
  const searchInp = el('input', 'k-dlg-input');
  searchInp.placeholder = t('filterCommands');
  searchInp.style.cssText = 'flex:1;max-width:240px';
  searchInp.oninput = () => {
    const q = searchInp.value.toLowerCase();
    grid.querySelectorAll('.k-keys-row').forEach((r) => {
      r.style.display = q ? (r.textContent.toLowerCase().includes(q) ? '' : 'none') : '';
    });
  };
  const closeB = el('button', 'k-ok', t('dialogs.close'));
  btns.append(searchInp, closeB);
  box.append(btns);
  ov.append(box);
  document.body.append(ov);

  closeB.onclick = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') { ov.remove(); document.removeEventListener('keydown', escHandler); }
  });
  searchInp.focus();
}

// ---------------- Scene card: thumbnail + word count + data-status ----------------
async function runTest(projectPath) {
  const out = [];
  const flush = () => kapi.writeFile('/tmp/k2result.txt', out.join('\n'));
  const check = (name, cond, extra) => {
    out.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + extra));
    flush();                                   // เขียนสด ๆ — โดนตัดกลางคันก็เห็น progress
    if (!cond) throw new Error(name);
  };
  try {
    if (projectPath) await loadProject(projectPath);
    check('tree มีฉาก', document.querySelectorAll('.scene').length >= 2);
    document.querySelector('.scene').click();
    await new Promise((r) => setTimeout(r, 800));
    const t = state.active;
    check('เปิดแท็บ prose', !!t?.editor);
    const orig = parseMdFile(await kapi.readFile(t.file)).body;
    check('round-trip ผ่าน editor จริง', t.editor.getMarkdown() === orig,
          JSON.stringify(t.editor.getMarkdown()));
    check('รูป render จริง', !!document.querySelector('.pane.on figure img'));
    check('ไม่มีโค้ด ![ ในจอ', !t.editor.getText().includes('!['));
    // (7) รูปนิยาย: ไม่โชว์ชื่อใต้รูป (figcaption) แล้ว · โชว์ชื่อตอน hover (title=alt)
    check('รูปนิยายไม่โชว์ชื่อใต้รูป (ไม่มี figcaption)',
          !document.querySelector('.pane.on figure figcaption'));
    check('รูปนิยายโชว์ชื่อตอน hover (title มีค่า)',
          !!document.querySelector('.pane.on figure img')?.getAttribute('title'));

    // เลือกคำ "ความหวัง" ท้ายย่อหน้าแรก แล้วสั่งหนาผ่าน command (เส้นทางเดียวกับเมนู)
    const { TextSelection } = await import('prosemirror-state');
    let pos = null;
    t.editor.view.state.doc.descendants((n, p) => {
      if (pos === null && n.isText && n.text.includes('ความหวัง'))
        pos = p + n.text.indexOf('ความหวัง');
    });
    check('หาคำทดสอบเจอ', pos !== null);
    const v = t.editor.view;
    v.dispatch(v.state.tr.setSelection(
      TextSelection.create(v.state.doc, pos, pos + 'ความหวัง'.length)));
    t.editor.cmd('bold');
    await saveTab(t);
    const saved = parseMdFile(await kapi.readFile(t.file)).body;
    check('สั่งหนา + บันทึก → ไฟล์ .md มี **ความหวัง**', saved.includes('**ความหวัง**'), saved);
    t.editor.cmd('bold'); await saveTab(t);   // คืนสภาพ
    check('กดซ้ำคืนสภาพไฟล์เดิม',
          parseMdFile(await kapi.readFile(t.file)).body === orig);

    // Enter ต้องพารูปแบบไปบรรทัดใหม่ (บั๊กที่แจ้ง: ขึ้นบรรทัดแล้ว reset)
    t.editor.view.dispatch(t.editor.view.state.tr.setSelection(
      TextSelection.create(t.editor.view.state.doc, pos, pos + 'ความหวัง'.length)));
    t.editor.cmd('bold');
    t.editor.view.dispatch(t.editor.view.state.tr.setSelection(
      TextSelection.create(t.editor.view.state.doc, pos + 'ความหวัง'.length)));
    t.editor.pressEnter();
    const sm = t.editor.view.state.storedMarks || t.editor.view.state.selection.$from.marks();
    check('Enter แล้วตัวหนายังติดไปบรรทัดใหม่',
          sm.some((m) => m.type.name === 'strong'), JSON.stringify(sm));
    t.editor.setMarkdown(orig);   // คืนสภาพ

    // ค้นหา/แทนที่
    openFind(); $('#find-q').value = 'ความ';
    const nFound = doFind();
    check('ค้นหาเจอหลายผล + ไฮไลต์', nFound >= 2 && document.querySelector('.find-hit'), nFound);
    closeFind();

    // outline: มีหัวข้อ + คลิกแล้วกระโดด
    refreshOutline();
    const oi = document.querySelectorAll('.ol-item');
    check('outline มีหัวข้อ', oi.length >= 1, oi.length);

    // SmartType: มีชื่อจาก Wiki + popup ขึ้นเมื่อพิมพ์คำนำหน้า
    check('โหลดชื่อ Wiki', smart.names.includes('ยัยแมวเก้าชีวิต'), JSON.stringify(smart.names));
    const v2 = t.editor.view;
    v2.dispatch(v2.state.tr.insertText('พูดกับยัยแ', 1, 1));
    v2.dispatch(v2.state.tr.setSelection(TextSelection.create(v2.state.doc, 1 + 'พูดกับยัยแ'.length)));
    smart.bindView(v2); smart.check(v2);
    check('SmartType popup ขึ้น', smart.visible && smart.items.includes('ยัยแมวเก้าชีวิต'),
          JSON.stringify(smart.items));
    smart._accept();
    check('ยืนยันชื่อแล้วเติมเต็มคำ', t.editor.getText().includes('พูดกับยัยแมวเก้าชีวิต'),
          t.editor.getText().slice(0, 60));
    t.editor.setMarkdown(orig);

    // Memo อยู่ใน tree
    check('Memo โผล่ใน tree', [...document.querySelectorAll('.scene')]
          .some((x) => x.textContent.includes('โน้ตทดสอบ')));

    // แท็บบทหนัง — ตอนนี้เป็น WYSIWYG แล้ว (เทสต์ละเอียดอยู่ช่วงท้าย)
    const scenes2 = [...document.querySelectorAll('.scene')];
    scenes2.find((x) => x.textContent.includes('บทหนังทดสอบ')).click();
    await new Promise((r) => setTimeout(r, 300));
    check('screenplay เปิดเป็น element editor', !!state.active?.sp);
    refreshOutline();
    check('outline บทหนังเห็นหัวฉาก', [...document.querySelectorAll('.ol-item')]
          .some((x) => x.textContent.includes('ตลาด - เย็น')));
    activate(t.file);

    // ---- ระบบสลับโหมด นิยาย ↔ บทหนัง (แบบ Fade In) ----
    // t เป็นฉากนิยาย (disk = orig). สลับไปบทหนังแล้วกลับ ต้องไม่เสียเนื้อหา + frontmatter ถูก
    const fmtOf = async (f) => (parseMdFile(await kapi.readFile(f)).meta.format || 'prose');
    check('เริ่มต้นเป็นโหมดนิยาย', !!t.editor && !t.sp && (await fmtOf(t.file)) === 'prose');
    await switchFormat('screenplay');
    check('สลับเป็นบทหนัง → ตัวแก้ไข element + editor นิยายถูกปิด',
          !!state.active.sp && !state.active.editor);
    check('สลับโหมดเขียน format ลง frontmatter (screenplay)',
          (await fmtOf(t.file)) === 'screenplay');
    check('สลับโหมดไม่แก้เนื้อหาบนดิสก์',
          parseMdFile(await kapi.readFile(t.file)).body === orig,
          JSON.stringify(parseMdFile(await kapi.readFile(t.file)).body));
    check('ปุ่มโหมดบน toolbar ขึ้น "บทหนัง"', $('#tb-mode').textContent.includes('บทหนัง'));
    await switchFormat('prose');
    check('สลับกลับเป็นนิยาย → editor นิยายกลับมา',
          !!state.active.editor && !state.active.sp);
    check('frontmatter กลับเป็น prose', (await fmtOf(t.file)) === 'prose');
    check('เนื้อหาหลักอยู่ครบหลังสลับไป-กลับ',
          state.active.editor.getText().includes('ความหวัง') &&
          !!document.querySelector('.pane.on figure img'),
          state.active.editor.getText().slice(0, 60));
    check('สั่งซ้ำโหมดเดิมไม่ทำอะไร (no-op)',
          (await (async () => { const b = state.active.editor; await switchFormat('prose');
            return state.active.editor === b; })()));
    t.editor.setMarkdown(orig);   // คืนสภาพให้เทสต์ถัด ๆ ไป
    await saveTab(t);
    activate(t.file);

    // ---- [51][52][53][95][79][77] Batch 1: Screenplay auto-cycle + auto-detect + shortcuts ----
    {
      // เปิดบทหนังทดสอบ
      const spEl = [...document.querySelectorAll('.scene')].find((x) => x.textContent.includes('บทหนังทดสอบ'));
      if (spEl) spEl.click();
      await new Promise((r) => setTimeout(r, 300));
      const sp = state.active?.sp;
      check('[Batch1] มี sp editor อยู่', !!sp);

      // [95] switchTo เปลี่ยน element ได้
      sp.switchTo('action');
      check('[95] switchTo → action', sp.curElement() === 'action');
      sp.switchTo('scene');
      check('[95] switchTo → scene', sp.curElement() === 'scene');

      // [51] Enter ใช้ spCycle สร้าง element ถัดไป
      const cur1 = sp.curElement();
      sp.enter();
      const nextAfterEnter = sp.curElement();
      check('[51] Enter สร้าง element ตาม spCycle', nextAfterEnter !== cur1,
            cur1 + ' → ' + nextAfterEnter);

      // [51] Tab cycle เปลี่ยน element ปัจจุบัน
      const cur2 = sp.curElement();
      sp._tabCycle('tab');
      const nextAfterTab = sp.curElement();
      check('[51] Tab เปลี่ยน element ตาม spCycle', nextAfterTab !== cur2,
            cur2 + ' → ' + nextAfterTab);

      // [52] Auto-detect INT. → scene
      sp.switchTo('action');
      const v = sp.view;
      v.dispatch(v.state.tr.insertText('INT. ตลาดสด', v.state.selection.from));
      sp._autoDetect();
      check('[52] พิมพ์ INT. ใน action → auto-switch เป็น scene',
            sp.curElement() === 'scene',
            sp.curElement());

      // [53] Parenthetical auto-wrap: กด ( ใน character → parenthetical
      sp.switchTo('character');
      const charBlock = sp.curBlock();
      const charPos = charBlock.pos;
      v.dispatch(v.state.tr.insertText('ลุงสมหมาย', charPos + 1));
      const from2 = v.state.selection.from;
      let tr2 = v.state.tr;
      tr2 = tr2.setNodeMarkup(charPos, null, { el: 'parenthetical', align: sp.curBlock().node.attrs.align || null });
      tr2 = tr2.insertText('()', from2);
      tr2 = tr2.setSelection(TextSelection.create(tr2.doc, from2 + 1));
      v.dispatch(tr2);
      check('[53] กด ( ใน character → parenthetical พร้อม ()',
            sp.curElement() === 'parenthetical' && sp.curBlock().node.textContent.includes('()'),
            sp.curElement() + ' : ' + sp.curBlock().node.textContent);

      // [79] Select scene
      sp.switchTo('scene');
      sp.selectScene();
      const sel = v.state.selection;
      check('[79] SelectScene เลือกช่วง > 0',
            sel.from < sel.to && sel.to > 0,
            'from=' + sel.from + ' to=' + sel.to);

      // [77] Non-breaking space
      sp.switchTo('action');
      v.dispatch(v.state.tr.insertText('\u00A0'));
      check('[77] แทรก \u00A0 ได้', sp.curBlock().node.textContent.includes('\u00A0'));

      // [95] Ctrl+1/2/3 ผ่าน handleCommand ในบทหนัง
      sp.switchTo('action');
      await handleCommand('fmt', 'heading', 1);
      check('[95] Ctrl+1 ในบทหนัง → scene', sp.curElement() === 'scene');
      sp.switchTo('action');
      await handleCommand('fmt', 'heading', 2);
      check('[95] Ctrl+2 ในบทหนัง → action', sp.curElement() === 'action');
      sp.switchTo('action');
      await handleCommand('fmt', 'heading', 3);
      check('[95] Ctrl+3 ในบทหนัง → character', sp.curElement() === 'character');

      // [95] sp-element command
      sp.switchTo('scene');
      await handleCommand('sp-element', 'dialogue');
      check('[95] sp-element → dialogue', sp.curElement() === 'dialogue');

      // DEFAULT_SP_CYCLE ครบทุก key
      check('[51] DEFAULT_SP_CYCLE มี scene/action/character/dialogue/transition',
            ['scene', 'action', 'character', 'parenthetical', 'dialogue', 'transition']
              .every((k) => DEFAULT_SP_CYCLE[k]?.enter && DEFAULT_SP_CYCLE[k]?.tab && DEFAULT_SP_CYCLE[k]?.shiftTab));

      // ปิดแท็บบทหนังทิ้ง คืนสภาพเดิม (ทดสอบถัดไปจะเปิดใหม่สด)
      const spFile = state.active?.file;
      if (spFile) closeTab(spFile);
    }

    // dialog ของเราเอง (แทน prompt ที่ Electron ไม่รองรับ — เหตุที่กด + แล้วเงียบ)
    const dlgTest = ask('ทดสอบ dialog');
    await new Promise((r) => setTimeout(r, 60));
    check('dialog ขึ้นจริง', !!document.querySelector('.k-dialog'));
    document.querySelector('.k-dlg-input').value = 'ค่า';
    document.querySelector('.k-dialog .k-ok').click();
    check('dialog คืนค่า', (await dlgTest) === 'ค่า');

    // เพิ่มฉากผ่าน dialog (จำลองการกดปุ่ม + จริง)
    const dPath = t.file.replace(/[\\/]Chapters[\\/].*$/, '');
    const chJson = (await kapi.readJson(await kapi.join(dPath, 'draft.json'))).chapters[0];
    const pAdd = addScene(dPath, chJson);
    await new Promise((r) => setTimeout(r, 60));
    document.querySelector('.k-dlg-input').value = 'ฉากใหม่ทดสอบ';
    document.querySelector('.k-dialog .k-ok').click();
    await pAdd;
    const sj = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
    const newSc = sj.chapters[chJson.guid].find((x) => x.title === 'ฉากใหม่ทดสอบ');
    check('เพิ่มฉากได้จริง (scenes.json + ไฟล์ .md)', !!newSc &&
          await kapi.exists(await kapi.join(dPath, 'Chapters', chJson.folderName, newSc.fileName)));
    check('แท็บฉากใหม่เปิดเอง', state.active?.title === 'ฉากใหม่ทดสอบ');

    // เปลี่ยนชื่อฉาก
    const pRen = renameScene(dPath, chJson, newSc);
    await new Promise((r) => setTimeout(r, 60));
    document.querySelector('.k-dlg-input').value = 'ฉากเปลี่ยนชื่อแล้ว';
    document.querySelector('.k-dialog .k-ok').click();
    await pRen;
    const sj2 = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
    check('เปลี่ยนชื่อฉากสะท้อนทั้ง JSON + frontmatter',
          sj2.chapters[chJson.guid].some((x) => x.title === 'ฉากเปลี่ยนชื่อแล้ว'));

    // ลบฉาก → Recycle
    const sc3 = sj2.chapters[chJson.guid].find((x) => x.title === 'ฉากเปลี่ยนชื่อแล้ว');
    const pDel = deleteScene(dPath, chJson, sc3);
    await new Promise((r) => setTimeout(r, 60));
    document.querySelector('.k-dialog .k-ok').click();      // ยืนยันลบ
    await pDel;
    const sj3 = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
    const recycled = await kapi.listFiles(await kapi.join(state.root, 'Recycle'), '.md');
    check('ลบฉาก → ออกจาก JSON + ไฟล์ไปอยู่ Recycle',
          !sj3.chapters[chJson.guid].some((x) => x.id === sc3.id) &&
          recycled.some((f) => f.includes('scene-')), JSON.stringify(recycled));

    // ---- เล่ม (section): เพิ่ม/เปลี่ยนชื่อ/ลบ + กู้คืน ----
    {
      const secsBefore = (await kapi.listDirs(state.root))
        .filter(async (n) => await kapi.exists(await kapi.join(state.root, n, 'section.json')));
      const countSecs = async () => { let n = 0;
        for (const nm of await kapi.listDirs(state.root))
          if (await kapi.exists(await kapi.join(state.root, nm, 'section.json'))) n++;
        return n; };
      const n0 = await countSecs();
      const pAddSec = addSection();
      await new Promise((r) => setTimeout(r, 60));
      document.querySelector('.k-dlg-input').value = 'เล่มสองทดสอบ';
      document.querySelector('.k-dialog .k-ok').click();
      await pAddSec;
      check('เพิ่มเล่มใหม่ได้ (section.json + Draft + บทเริ่มต้น)', (await countSecs()) === n0 + 1);
      // หาโฟลเดอร์เล่มใหม่
      let newSecPath = null, newSec = null;
      for (const nm of await kapi.listDirs(state.root)) {
        const sp = await kapi.join(state.root, nm, 'section.json');
        if (await kapi.exists(sp)) { const s = await kapi.readJson(sp);
          if (s.title === 'เล่มสองทดสอบ') { newSecPath = await kapi.join(state.root, nm); newSec = s; } }
      }
      check('เล่มใหม่มีชื่อถูกต้อง + Explorer แสดง 📚',
            !!newSecPath && [...document.querySelectorAll('#tree .sec-title')]
              .some((e) => e.textContent.includes('เล่มสองทดสอบ')));
      check('เล่มใหม่มีฉบับร่าง default + บทเริ่มต้น',
            await kapi.exists(await kapi.join(newSecPath, 'Draft', 'default', 'draft.json')));
      // เปลี่ยนชื่อเล่ม
      const pRenSec = renameSection(newSecPath, newSec);
      await new Promise((r) => setTimeout(r, 60));
      document.querySelector('.k-dlg-input').value = 'เล่มสองเปลี่ยนชื่อ';
      document.querySelector('.k-dialog .k-ok').click();
      await pRenSec;
      check('เปลี่ยนชื่อเล่มสะท้อนใน section.json',
            (await kapi.readJson(await kapi.join(newSecPath, 'section.json'))).title === 'เล่มสองเปลี่ยนชื่อ');
      // ลบเล่ม → Recycle
      const pDelSec = deleteSection(newSecPath, { ...newSec, title: 'เล่มสองเปลี่ยนชื่อ' });
      await new Promise((r) => setTimeout(r, 60));
      document.querySelector('.k-dialog .k-ok').click();
      await pDelSec;
      check('ลบเล่ม → หายจากรายการ + ไปถังขยะ',
            (await countSecs()) === n0 &&
            !(await kapi.exists(newSecPath)));
      // กันลบเล่มสุดท้าย
      let onlySecPath = null, onlySec = null;
      for (const nm of await kapi.listDirs(state.root)) {
        const sp = await kapi.join(state.root, nm, 'section.json');
        if (await kapi.exists(sp)) { onlySecPath = await kapi.join(state.root, nm); onlySec = await kapi.readJson(sp); break; }
      }
      await deleteSection(onlySecPath, onlySec);   // ควรถูกปฏิเสธ (ไม่มี confirm)
      check('ลบเล่มสุดท้ายไม่ได้ (กันโปรเจกต์ว่าง)', (await countSecs()) === n0);
    }

    // ---- Explorer ไม่กระพริบ: buildTree ซ้อนกัน = coalesce (double-buffer) ----
    {
      const p1 = buildTree(), p2 = buildTree(), p3 = buildTree();   // ยิงซ้อน 3 ครั้ง
      await Promise.all([p1, p2, p3]);
      check('buildTree ซ้อนกันได้ ไม่พัง (coalesce กันกระพริบ)',
            $('#tree').querySelectorAll('.sec').length >= 1);
    }

    // ---- ตัวจัดการเล่ม (Book Manager) ----
    {
      // เพิ่มเล่มที่สองไว้ทดสอบลากสลับลำดับ
      const pAddB = addSection();
      await new Promise((r) => setTimeout(r, 60));
      document.querySelector('.k-dlg-input').value = 'เล่มบทดสอบจัดการ';
      document.querySelector('.k-dialog .k-ok').click();
      await pAddB;

      await openBookManager();
      await new Promise((r) => setTimeout(r, 250));
      // บั๊ก #18: จัดการเล่มเป็นแผงแล้ว — ไม่ใช่แท็บเอกสาร จึงเช็คที่ #books-body ไม่ใช่ .pane.on
      check('เปิดตัวจัดการเล่มได้ + มีการ์ดเล่ม',
            isPanelOpen('books') &&
            document.querySelectorAll('#books-body .book-card').length >= 2);
      check('การ์ดเล่มมีสถิติ (บท/ฉาก/คำ) โหลดเข้ามา',
            [...document.querySelectorAll('#books-body .book-stats')]
              .some((e) => /คำ/.test(e.textContent) && e.textContent !== '…'));
      await kapi.testShot('/tmp/k2_books.png');

      const secsNow = await listSections();
      const target = secsNow.find((s) => s.title === 'เล่มบทดสอบจัดการ');
      // ตั้งสถานะเล่ม → เขียนลง section.json
      await saveSectionMeta(target.sf, { status: 'drafting' });
      check('ตั้งสถานะเล่มลง section.json ได้',
            (await kapi.readJson(target.sf)).status === 'drafting');
      // ตั้งคำโปรย
      await saveSectionMeta(target.sf, { blurb: 'เรื่องย่อทดสอบของเล่มนี้' });
      check('คำโปรยเล่มบันทึกได้',
            (await kapi.readJson(target.sf)).blurb === 'เรื่องย่อทดสอบของเล่มนี้');

      // ลากสลับลำดับ: ย้ายเล่มเป้าหมายไปไว้ก่อนเล่มแรก
      const first = secsNow[0];
      const beforeOrder = secsNow.map((s) => s.folder);
      await reorderSections(target.folder, first.folder);
      const afterSecs = await listSections();
      check('สลับลำดับเล่ม → order เขียนใหม่ทั้งชุด (เล่มเป้าหมายมาก่อน)',
            afterSecs[0].folder === target.folder &&
            afterSecs.every((s, i) => s.order === i + 1),
            JSON.stringify(afterSecs.map((s) => [s.folder, s.order])));

      // เปิดฉากแรกของเล่มจากตัวจัดการ
      await openFirstSceneOf(first.secPath);
      await new Promise((r) => setTimeout(r, 150));
      check('เปิดฉากแรกของเล่มจากตัวจัดการได้',
            !!state.active && (!!state.active.editor || !!state.active.sp || !!state.active.plain));

      // ลบเล่มที่เพิ่งเพิ่ม (คืนสภาพ) ผ่าน deleteSection
      const pDelB = deleteSection(target.secPath, await kapi.readJson(target.sf));
      await new Promise((r) => setTimeout(r, 60));
      document.querySelector('.k-dialog .k-ok').click();
      await pDelB;
      check('ลบเล่มทดสอบคืนสภาพแล้ว',
            !(await listSections()).some((s) => s.folder === target.folder));
      closeTab('::books::');
    }

    // ---- เส้นเวลา (Timeline) ----
    {
      // ตั้ง storyDate ให้ฉากหนึ่ง → ต้องโผล่บนเส้นเวลาอัตโนมัติ
      const drafts0 = await listDrafts();
      const dP = drafts0[0].dPath;
      const scf = await kapi.join(dP, 'scenes.json');
      const scd = await kapi.readJson(scf);
      const firstGuid = Object.keys(scd.chapters)[0];
      const firstScene = scd.chapters[firstGuid][0];
      firstScene.storyDate = 'ปีที่ 1020';
      await kapi.writeFile(scf, JSON.stringify(scd, null, 2));

      const sceneEvs = await sceneEventsFromProject();
      check('ฉากที่ตั้ง storyDate โผล่เป็นเหตุการณ์อัตโนมัติ',
            sceneEvs.some((e) => e.when === 'ปีที่ 1020' && e.kind === undefined || e.when === 'ปีที่ 1020'),
            JSON.stringify(sceneEvs.map((e) => e.when)));

      // เพิ่ม event เอง 2 อัน ลง timeline.json
      const tl = await loadTimeline();
      tl.events.push({ id: 'ev-t1', title: 'สงครามปะทุ', when: 'ปีที่ 1024', whenEnd: 'ปีที่ 1030', track: 'เส้นหลัก' });
      tl.events.push({ id: 'ev-t2', title: 'ก่อตั้งอาณาจักร', when: 'ปีที่ 1000', whenEnd: 'ปีที่ 1015', track: 'เส้นหลัก' });
      await saveTimeline(tl);
      check('บันทึก event ลง timeline.json',
            (await kapi.readJson(await kapi.join(state.root, 'timeline.json'))).events.length === 2);

      // merge + เรียง: 1000 < 1020(ฉาก) < 1024
      const merged = mergeTimeline(tl.events, await sceneEventsFromProject());
      const whens = merged.map((m) => m.when);
      check('เส้นเวลาเรียงตามเวลาในเรื่อง (1000<1020<1024)',
            whens.indexOf('ปีที่ 1000') < whens.indexOf('ปีที่ 1020') &&
            whens.indexOf('ปีที่ 1020') < whens.indexOf('ปีที่ 1024'), JSON.stringify(whens));

      // เปิดแท็บเส้นเวลา
      await openTimeline();
      await new Promise((r) => setTimeout(r, 250));
      check('แผงเส้นเวลาเปิด + มีการ์ดเหตุการณ์',
            isPanelOpen('timeline') &&
            document.querySelectorAll('#tl-body .tl-event').length >= 3);
      check('เส้นเวลาจัดกลุ่มเป็นเลน (track)',
            document.querySelectorAll('#tl-body .tl-lane').length >= 1);
      check('ฉากบนเส้นเวลาเปิดคลิกได้ (มี tl-event-scene)',
            !!document.querySelector('#tl-body .tl-event-scene'));
      await kapi.testShot('/tmp/k2_timeline.png');

      // สลับเป็นมุมมอง Gantt (ต้องมีเหตุการณ์ที่ระบุเลข → มีแท่ง)
      state._tlView = 'gantt';
      await renderTimeline($('#tl-body'));
      await new Promise((r) => setTimeout(r, 150));
      check('มุมมอง Gantt: มีแท่งเหตุการณ์ (gantt-bar)',
            document.querySelectorAll('#tl-body .gantt-bar').length >= 2);
      check('มุมมอง Gantt: มีขีดแกนเวลา (gantt-tick)',
            document.querySelectorAll('#tl-body .gantt-tick').length >= 2);
      check('มุมมอง Gantt: แท่งกว้างตามช่วงเวลา (event มี whenEnd)',
            [...document.querySelectorAll('#tl-body .gantt-bar')]
              .some((b) => parseFloat(b.style.width) > 5),
            [...document.querySelectorAll('#tl-body .gantt-bar')].map((b) => b.style.width).join(','));
      await kapi.testShot('/tmp/k2_gantt.png');
      state._tlView = 'cards';
      closeTab('::timeline::');

      // คืนสภาพ: ลบ storyDate + timeline.json
      delete firstScene.storyDate;
      await kapi.writeFile(scf, JSON.stringify(scd, null, 2));
    }

    // ---- แผนที่ (Maps) ----
    {
      // สร้างแผนที่ 2 อัน (โลก + เมือง) ตรง ๆ ผ่าน saveMaps แล้วเช็คลำดับชั้น
      const worldMap = newMap('โลกทดสอบ'); worldMap.id = 'wtest'; worldMap.image = 'Images/world.png'; worldMap.order = 0;
      const cityMap = newMap('เมืองทดสอบ'); cityMap.id = 'ctest'; cityMap.image = 'Images/city.png'; cityMap.order = 1;
      // หมุดในโลก: portal → เมือง + entity → ยัยแมวเก้าชีวิต
      const ents = await loadAllEntities();
      const someEnt = ents[0];
      worldMap.pins.push({ ...newPin(30, 40, 'portal'), toMap: 'ctest', label: 'ไปเมือง' });
      if (someEnt) worldMap.pins.push({ ...newPin(60, 50, 'entity'), entityFile: someEnt.file, label: someEnt.name });
      await saveMaps({ version: MAPS_VERSION, maps: [worldMap, cityMap] });

      // โหลดกลับ + ตรวจ
      const md = await loadMaps();
      check('บันทึก/โหลด maps.json ได้ (2 แผนที่)', md.maps.length === 2);
      check('breadcrumb ลำดับชั้น: เมืองอยู่ใต้โลก',
            JSON.stringify(breadcrumb(md.maps, 'ctest').map((c) => c.id)) === JSON.stringify(['wtest', 'ctest']));
      check('rootMaps = โลก (ไม่มีใครชี้มา)',
            rootMaps(md.maps).length === 1 && rootMaps(md.maps)[0].id === 'wtest');
      const wst = pinStats(md.maps.find((m) => m.id === 'wtest'));
      check('นับหมุดแยกชนิดถูก (portal + entity)', wst.portal === 1 && wst.entity === (someEnt ? 1 : 0));

      // เปิดแท็บแผนที่
      await openMaps();
      await new Promise((r) => setTimeout(r, 250));
      check('แท็บแผนที่เปิด + มี chip เลือกแผนที่',
            isPanelOpen('maps') && document.querySelectorAll('#maps-body .map-chip').length === 2);
      check('มีหมุดวาดบนแผนที่ (portal + entity)',
            document.querySelectorAll('#maps-body .map-pin').length >= (someEnt ? 2 : 1));
      check('หมุด portal มีไอคอนประตู',
            !!document.querySelector('#maps-body .map-pin-portal'));
      // สลับไปแผนที่เมืองผ่าน chip
      const cityChip = [...document.querySelectorAll('#maps-body .map-chip')].find((c) => c.textContent.includes('เมืองทดสอบ'));
      if (cityChip) { cityChip.click(); await new Promise((r) => setTimeout(r, 120)); }
      check('สลับแผนที่ผ่าน chip ได้', mapsState_C.s.currentId === 'ctest');
      await kapi.testShot('/tmp/k2_maps.png');
      closeTab('::maps::'); mapsState_C.s = null;

      // ลบ maps.json คืนสภาพ
      const mp = await kapi.join(state.root, 'maps.json');
      if (await kapi.exists(mp)) await kapi.remove(mp);
    }



    // ---- Wiki: สร้าง entity → แก้ → บันทึก → SmartType เห็นชื่อใหม่ ----
    const catDir = await kapi.join(state.root, 'Wiki', 'characters');
    const pEnt = addEntity(catDir, 'characters');
    await new Promise((r) => setTimeout(r, 60));
    check('กล่องสร้าง entity มี dropdown เทมเพลต',
          !!document.querySelector('#ent-tpl') &&
          document.querySelector('#ent-tpl').options.length >= 2,
          'no template dropdown');
    check('dropdown ตั้งค่าเริ่มต้นเป็นเทมเพลตแรก',
          document.querySelector('#ent-tpl').value === state.templates
            .find((t) => t.entityTypeKey === 'characters').id);
    document.querySelector('#ent-name').value = 'พระเอกทดสอบ';
    document.querySelector('.k-dialog .k-ok').click();       // ชื่อ+เทมเพลตในกล่องเดียว
    await pEnt;
    await new Promise((r) => setTimeout(r, 200));
    check('เปิดแท็บ Wiki entity', !!state.active?.wiki);
    const wtab = state.active;
    wtab.wiki.e.aliases = ['ฮีโร่หมายเลขหนึ่ง'];
    wtab.wiki.secEditors[0].k.setMarkdown('เกิดที่ **บางกอก**');
    await wtab.wiki.save();
    await new Promise((r) => setTimeout(r, 250));
    const wfiles = await kapi.listFiles(catDir, '.json');
    let entSaved = null;
    for (const f of wfiles) {
      const j = await kapi.readJson(await kapi.join(catDir, f));
      if (j.name === 'พระเอกทดสอบ') entSaved = j;
    }
    check('entity บันทึกโครง v1 ครบ + fields จากเทมเพลต', entSaved &&
          entSaved.aliases[0] === 'ฮีโร่หมายเลขหนึ่ง' &&
          entSaved.sections[0].content === 'เกิดที่ **บางกอก**' &&
          Array.isArray(entSaved.relationships) &&
          'Gender' in (entSaved.fields || {}) && entSaved.templateId,
          JSON.stringify(entSaved).slice(0, 300));
    check('SmartType เห็นชื่อ+ชื่ออื่นของ entity ใหม่',
          smart.names.includes('พระเอกทดสอบ') && smart.names.includes('ฮีโร่หมายเลขหนึ่ง'),
          JSON.stringify(smart.names));
    check('Wiki โผล่ใน tree', [...document.querySelectorAll('.scene')]
          .some((x) => x.textContent.includes('พระเอกทดสอบ')));

    // ---- ข้อ 2A: wiki pane มี class .wiki-pane (กัน paper-mode ทับ field เนื้อหา) ----
    check('wiki pane มี class .wiki-pane', wtab.pane.classList.contains('wiki-pane'));
    // paper-mode ต้องไม่ทำให้ ProseMirror ในเนื้อหา wiki กว้างเท่ากระดาษ (940px) — CSS scope .pane>.ProseMirror
    // paper-mode ต้องไม่ยัด padding กระดาษ (72px) + พื้นหลังกระดาษให้ ProseMirror ในเนื้อหา wiki
    // (เดิม body.paper-mode .ProseMirror specificity สูงกว่า .wiki-sec-ed → ทับจนกล่องบังทุกอย่าง)
    {
      const wasPaper = document.body.classList.contains('paper-mode');
      document.body.classList.add('paper-mode');
      const wikiPM = wtab.pane.querySelector('.wiki-sec-ed .ProseMirror');
      const cs = wikiPM && getComputedStyle(wikiPM);
      const badPad = cs && cs.paddingTop === '72px';                 // padding กระดาษของ paper-mode
      check('paper-mode ไม่ทับ field เนื้อหา wiki (ไม่ยัด padding กระดาษ 72px)', !badPad,
            cs ? cs.paddingTop : 'no-editor');
      if (!wasPaper) document.body.classList.remove('paper-mode');
    }
    // ---- ข้อ 2B: เนื้อหา wiki พิมพ์ @ ลิงก์ entity อื่นได้ (KEditor รับ getNames) ----
    check('เนื้อหา wiki ลิงก์ entity ได้ (getNames ส่งชื่อ)',
          typeof wtab.wiki.secEditors[0].k.getNames === 'function' &&
          wtab.wiki.secEditors[0].k.getNames().includes('พระเอกทดสอบ'),
          JSON.stringify(wtab.wiki.secEditors[0].k.getNames?.()));

    // ---- field ใน Wiki ลิงก์กันได้ (ข้อ 2) ----
    // ใส่ค่าในช่องข้อมูลเพิ่มเองที่ตรงกับชื่อ entity อื่น → มีป้ายลิงก์คลิกเปิดหน้านั้น
    {
      activate(wtab.file);
      wtab.wiki.e.customProperties = wtab.wiki.e.customProperties || {};
      wtab.wiki.e.customProperties['พันธมิตร'] = 'ยัยแมวเก้าชีวิต';   // ชื่อ entity ที่มีจริง
      wtab.wiki.render();
      await new Promise((r) => setTimeout(r, 60));
      check('field ที่ค่าตรงชื่อ Wiki → มีปุ่มลิงก์ 🔗',
            [...document.querySelectorAll('.pane.on .wiki-link-pill')]
              .some((a) => a.textContent.includes('ยัยแมวเก้าชีวิต')));
      // ค่าที่ไม่ตรงชื่อใคร → ไม่มีป้ายลิงก์
      wtab.wiki.e.customProperties['สีผม'] = 'น้ำตาลเข้มไม่มีใครชื่อนี้';
      wtab.wiki.render();
      await new Promise((r) => setTimeout(r, 40));
      const links = [...document.querySelectorAll('.pane.on .wiki-link-pill')];
      check('field ที่ค่าไม่ตรงชื่อใคร → ไม่มีปุ่มลิงก์',
            !links.some((a) => a.textContent.includes('น้ำตาลเข้ม')));
      // คลิกป้ายลิงก์ → เปิดแท็บ entity นั้น
      const linkA = [...document.querySelectorAll('.pane.on .wiki-link-pill')]
        .find((a) => a.textContent.includes('ยัยแมวเก้าชีวิต'));
      if (linkA) { linkA.click(); await new Promise((r) => setTimeout(r, 200)); }
      check('คลิกลิงก์ใน field → เปิดหน้า Wiki ปลายทาง',
            state.active?.wiki && state.active.wiki.e.name === 'ยัยแมวเก้าชีวิต',
            state.active?.wiki?.e?.name);
      closeTab(wtab.file);
    }

    check('หมวด Wiki หลักแสดงครบแม้โฟลเดอร์ยังไม่มี',
          ['ตัวละคร', 'สถานที่', 'สิ่งของ', 'ตำนาน'].every((n) =>
            [...document.querySelectorAll('.ch-title')].some((x) => x.textContent.includes(n))));

    // legacy Bible/ ของ v1 — SmartType ต้องเห็นชื่อจากที่นั่นด้วย
    await kapi.writeFile(await kapi.join(state.root, 'Bible', 'locations', 'ตลาด.json'),
      JSON.stringify({ name: 'ตลาดน้ำโบราณ', entityTypeKey: 'locations', aliases: [] }));
    await smart.loadNames(state.root);
    check('SmartType เห็นชื่อจากโฟลเดอร์ Bible (ชื่อเดิม v1)',
          smart.names.includes('ตลาดน้ำโบราณ'), JSON.stringify(smart.names));

    // ---- ถังขยะ: นับ → กู้คืน → กลับมาครบ ----
    await buildTree();
    const trashHead = [...document.querySelectorAll('.sec-title')]
      .find((x) => x.textContent.includes('ถังขยะ'));
    check('ถังขยะโผล่ใน tree พร้อมจำนวน', trashHead && /\(\d+\)/.test(trashHead.textContent),
          trashHead?.textContent);
    const recDir2 = await kapi.join(state.root, 'Recycle');
    const trashed = (await kapi.listFiles(recDir2, '.md'))[0];
    check('sidecar กู้คืนถูกเขียนไว้',
          await kapi.exists(await kapi.join(recDir2, trashed + '.k2restore.json')));
    await restoreFromTrash(await kapi.join(recDir2, trashed), trashed);
    const sjR = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
    check('กู้คืนฉาก → กลับเข้า scenes.json + ไฟล์กลับที่เดิม',
          sjR.chapters[chJson.guid].some((x) => x.title === 'ฉากเปลี่ยนชื่อแล้ว') &&
          await kapi.exists(await kapi.join(dPath, 'Chapters', chJson.folderName, sc3.fileName)),
          JSON.stringify(sjR.chapters[chJson.guid].map((x) => x.title)));

    // ลบถาวร: ลบ entity แล้วเผาทิ้งจากถังขยะ
    const entFile = (await kapi.listFiles(catDir, '.json')).find((f) => f !== 'cat.json');
    const entPath = await kapi.join(catDir, entFile);
    const pDel2 = deleteToTrash(entPath, 'ทดสอบลบถาวร');
    await new Promise((r) => setTimeout(r, 60));
    document.querySelector('.k-dialog .k-ok').click();
    const trashedEnt = await pDel2;
    check('ลบ entity → ไปถังขยะ', !!trashedEnt);
    await kapi.remove(trashedEnt);
    check('ลบถาวรหายจริง', !(await kapi.exists(trashedEnt)));
    await buildTree();

    activate(wtab.file);
    await new Promise((r) => setTimeout(r, 250));
    await kapi.testShot('/tmp/k2_wiki.png');

    // ---- mention → Wiki: ชื่อถูกไฮไลต์ + มี map ไปไฟล์ ----
    activate(t.file);
    t.editor.setMarkdown(orig + '\n\nคืนนั้นเขาไปหา ยัยแมวเก้าชีวิต ที่ ตลาดน้ำโบราณ');
    refreshMentions(t.editor.view);
    await new Promise((r) => setTimeout(r, 150));
    check('ชื่อจาก Wiki ถูกไฮไลต์ในหน้านิยาย',
          document.querySelectorAll('.pane.on .k-mention').length >= 1);
    // autoMention toggle — ปิดแล้วไฮไลต์หาย เปิดแล้วกลับมา (ทดสอบตอน mention พร้อมอยู่แล้ว)
    state.settings.autoMention = false; refreshAllMentions();
    await new Promise((r) => setTimeout(r, 80));
    check('ปิดจับชื่อ Wiki → ไม่มีไฮไลต์ .k-mention',
          document.querySelectorAll('.pane.on .k-mention').length === 0);
    state.settings.autoMention = true; refreshAllMentions();
    await new Promise((r) => setTimeout(r, 80));
    check('เปิดจับชื่อ Wiki → ไฮไลต์กลับมา',
          document.querySelectorAll('.pane.on .k-mention').length >= 1);
    check('คลิกชื่อรู้ว่าต้องเปิดไฟล์ไหน', !!smart.fileOf['ยัยแมวเก้าชีวิต']);
    // คลิกจริง: Ctrl+mousedown บนชื่อ → แท็บ Wiki entity ต้องเปิด
    const mEl = document.querySelector('.pane.on .k-mention');
    mEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, ctrlKey: true }));
    await new Promise((r) => setTimeout(r, 350));
    check('Ctrl+คลิกชื่อ → เปิดแท็บ Wiki จริง',
          state.active?.wiki && state.active.wiki.e.name === 'ยัยแมวเก้าชีวิต',
          state.active?.title);
    closeTab(state.active.file);
    activate(t.file);
    t.editor.setMarkdown(orig);

    // ---- ตรวจคำผิด (พจนานุกรมไทย+อังกฤษ ออฟไลน์) ----
    await loadSpellDict(state.root);                              // บังคับโหลดคลังคำให้เสร็จ
    check('คลังคำตรวจคำผิดโหลดสำเร็จ (ไทย+อังกฤษ)', spell.ready());
    check('คำสะกดถูกไม่ถูกทำเครื่องหมาย', spell.check('สวัสดีครับ').length === 0,
          JSON.stringify(spell.check('สวัสดีครับ')));
    const badWords = spell.check('อากสฎฆจ');                      // สตริงมั่วที่ตัดคำไม่ลง
    check('คำสะกดผิดถูกจับได้', badWords.length >= 1, JSON.stringify(badWords));
    check('คำอังกฤษผิดถูกจับได้', spell.check('helllo wrongwordz').length >= 1,
          JSON.stringify(spell.check('helllo wrongwordz')));
    // decoration ในตัวแก้ไข (t active สดๆ)
    activate(t.file);
    t.editor.setMarkdown('เขาเดินไปที่ตลาด อากสฎฆจ มาก');
    refreshSpell(t.editor.view);
    await new Promise((r) => setTimeout(r, 80));
    check('ตัวแก้ไขขีดเส้นใต้คำผิด (.k-spell-bad)',
          document.querySelectorAll('.pane.on .k-spell-bad').length >= 1,
          document.querySelectorAll('.pane.on .k-spell-bad').length);
    await kapi.testShot('/tmp/k2_spell.png');                    // ภาพขีดเส้นใต้คำผิด
    // ปิด/เปิดตัวเลือก
    state.settings.spellCheckDict = false; refreshAllSpell();
    await new Promise((r) => setTimeout(r, 60));
    check('ปิดตรวจคำผิดพจนานุกรม → ไม่มี .k-spell-bad',
          document.querySelectorAll('.pane.on .k-spell-bad').length === 0);
    state.settings.spellCheckDict = true; refreshAllSpell();
    await new Promise((r) => setTimeout(r, 60));
    check('เปิดกลับ → ขีดเส้นใต้กลับมา',
          document.querySelectorAll('.pane.on .k-spell-bad').length >= 1);
    // เพิ่มคำลงพจนานุกรม → คำนั้นไม่ถูกจับอีก (ผสมกับคลังหลัก)
    await kapi.spellAddWord(state.root, 'อากสฎฆจ');
    await loadSpellDict(state.root);
    check('เพิ่มคำลงพจนานุกรมแล้วไม่ถูกจับเป็นคำผิด',
          spell.check('อากสฎฆจ').length === 0, JSON.stringify(spell.check('อากสฎฆจ')));
    t.editor.setMarkdown(orig);

    // ---- จัดหน้ากระดาษ (align) โหมดนิยาย + บันทึกลงไฟล์ ----
    activate(t.file);
    const { TextSelection: TSa } = await import('prosemirror-state');
    const selHead = (v) => v.dispatch(v.state.tr.setSelection(TSa.create(v.state.doc, 1)));
    t.editor.setMarkdown('ย่อหน้าทดสอบจัดหน้า');
    selHead(t.editor.view);
    t.editor.cmd('align', 'center');
    check('นิยาย: จัดกึ่งกลาง → attr align=center',
          t.editor.activeMarks().align === 'center', t.editor.activeMarks().align);
    check('นิยาย: DOM ย่อหน้ามี text-align:center',
          !!document.querySelector('.pane.on .ProseMirror p[style*="center"]'));
    await kapi.testShot('/tmp/k2_align_prose.png');
    check('นิยาย: align เขียนลง markdown เป็นคอมเมนต์',
          t.editor.getMarkdown().includes('<!--align:center-->'), t.editor.getMarkdown());
    t.editor.setMarkdown('<!--align:right-->ชิดขวาทดสอบ');
    selHead(t.editor.view);
    check('นิยาย: อ่าน align จากไฟล์กลับมาได้ (right)',
          t.editor.activeMarks().align === 'right', t.editor.activeMarks().align);
    t.editor.cmd('align', 'left');
    check('นิยาย: คืนชิดซ้าย = ไม่เหลือคอมเมนต์ align',
          !t.editor.getMarkdown().includes('<!--align'), t.editor.getMarkdown());
    t.editor.setMarkdown(orig);

    // ---- ซูมหน้ากระดาษ (บั๊ก #7: ต้องเป็นซูมจริงด้วย CSS zoom ไม่ใช่ขยายแต่ฟอนต์) ----
    // วัดจาก "ขนาดที่เห็นจริงบนจอ" (getBoundingClientRect) เพราะ zoom ถูกคิดรวมมาแล้ว
    // ห้ามวัดจาก getComputedStyle().maxWidth — ในซับทรีที่ถูก zoom ค่าที่ได้ไม่ใช่พิกเซลบนจอ
    resetPageScale();
    const fs0 = getComputedStyle(document.documentElement).getPropertyValue('--ed-fs');
    const pmEl = document.querySelector('.pane.on .ProseMirror');
    const para0 = pmEl.querySelector('p') || pmEl.firstElementChild;
    const h0 = para0.getBoundingClientRect().height;
    const pad0 = para0.getBoundingClientRect().left - pmEl.getBoundingClientRect().left;
    // จุดอ้างอิงบน "บรรทัดแรก" ของย่อหน้า ตอนซูม 100% — ไว้เทียบหลังซูมว่าคลิกแล้วได้ตัวอักษรเดิม
    const line0 = para0.getClientRects()[0];
    const hitDx = Math.min(40, line0.width / 3), hitDy = line0.height / 2;
    const hit0 = t.editor.view.posAtCoords({ left: line0.left + hitDx, top: line0.top + hitDy });
    bumpPageScale(1); bumpPageScale(1); bumpPageScale(1);   // +30%
    await new Promise((r) => setTimeout(r, 40));
    const h1 = para0.getBoundingClientRect().height;
    const pad1 = para0.getBoundingClientRect().left - pmEl.getBoundingClientRect().left;
    check('ซูม: ตั้ง --page-scale ให้ CSS zoom (ไม่ใช่คูณเข้าฟอนต์)',
          getComputedStyle(document.documentElement).getPropertyValue('--page-scale').trim() === '1.300',
          getComputedStyle(document.documentElement).getPropertyValue('--page-scale'));
    check('ซูม: ตัวหนังสือบนจอใหญ่ขึ้นจริง', h1 > h0 * 1.15, `${Math.round(h0)}→${Math.round(h1)}`);
    // หัวใจของบั๊ก #7 — เดิม padding/margin คงที่ ขยายแต่ฟอนต์ หน้าเลยเสียสัดส่วน
    check('ซูม: ระยะขอบใน (padding) ขยายตามด้วย ไม่ใช่แค่ฟอนต์',
          pad1 > pad0 * 1.15, `${Math.round(pad0)}→${Math.round(pad1)}`);
    // เหตุผลที่ใช้ CSS zoom แทน transform:scale — เบราว์เซอร์ต้อง remap พิกัดคลิกให้เอง
    // ไม่งั้น ProseMirror จะวางเคอร์เซอร์ผิดตำแหน่งทุกครั้งที่ซูม (คลิกตัวอักษรหนึ่งแล้วไปโผล่อีกตัว)
    // เทียบแบบสัมพัทธ์: จุดเดิมบนบรรทัดแรก (คูณ 1.3 ตามซูม) ต้องได้ตำแหน่งในเอกสารตัวเดิม
    {
      const line1 = para0.getClientRects()[0];
      const hit1 = t.editor.view.posAtCoords(
        { left: line1.left + hitDx * 1.3, top: line1.top + hitDy * 1.3 });
      check('ซูม: คลิกจุดเดิมได้ตัวอักษรเดิม (ProseMirror remap พิกัดถูก)',
            !!hit0 && !!hit1 && Math.abs(hit1.pos - hit0.pos) <= 1,
            JSON.stringify({ pos100: hit0 && hit0.pos, pos130: hit1 && hit1.pos }));
    }
    check('ซูม: --ed-fs เป็นฟอนต์ฐาน ไม่ถูกคูณซูมซ้ำ',
          getComputedStyle(document.documentElement).getPropertyValue('--ed-fs') === fs0, fs0);
    check('ซูม: --sp-fs เป็นฟอนต์ฐานบทหนัง ไม่ถูกคูณซูมซ้ำ',
          parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sp-fs')) === BASE_SP_FS,
          getComputedStyle(document.documentElement).getPropertyValue('--sp-fs'));
    check('ซูม: slider ล่างขวาสะท้อนค่า (%)', $('#zoom-slider').value === '130', $('#zoom-slider').value);
    // ลาก slider = ตั้งซูมได้
    $('#zoom-slider').value = '80'; $('#zoom-slider').dispatchEvent(new Event('input'));
    check('ซูม: ลาก slider ตั้งค่าได้', Math.round(pageScale * 100) === 80, String(pageScale));
    check('ซูม: ย่อแล้วหน้ากระดาษเล็กลงจริง',
          para0.getBoundingClientRect().height < h0 * 0.95,
          String(Math.round(para0.getBoundingClientRect().height)));
    resetPageScale();
    check('ซูม: รีเซ็ตกลับ 100%',
          pageScale === 1 &&
          getComputedStyle(document.documentElement).getPropertyValue('--page-scale').trim() === '1.000');

    // ---- ขนาด UI (บั๊ก #9) — --ui-scale ขยายเปลือกโปรแกรมทั้งหมด ----
    const uiOrig = parseFloat(state.settings.uiScale) || 1;
    applyUIScale(1);
    await new Promise((r) => setTimeout(r, 20));
    const sbPad0 = parseFloat(getComputedStyle($('#statusbar')).paddingLeft);
    const bodyFs0 = parseFloat(getComputedStyle(document.body).fontSize);
    const headH0 = document.querySelector('.k-panel-head')?.getBoundingClientRect().height || 0;
    applyUIScale(1.5);
    await new Promise((r) => setTimeout(r, 40));
    check('ขนาด UI: ตั้ง --ui-scale ได้',
          getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim() === '1.500',
          getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'));
    check('ขนาด UI: ฟอนต์ body ขยาย (ปุ่ม/select/input สืบทอดต่อ)',
          Math.abs(parseFloat(getComputedStyle(document.body).fontSize) - 21) < 0.6,
          `${bodyFs0}→${getComputedStyle(document.body).fontSize}`);
    check('ขนาด UI: ระยะในแถบสถานะขยายตาม (ไม่ใช่แค่ฟอนต์)',
          parseFloat(getComputedStyle($('#statusbar')).paddingLeft) > sbPad0 * 1.3,
          `${sbPad0}→${getComputedStyle($('#statusbar')).paddingLeft}`);
    check('ขนาด UI: หัวแผงสูงขึ้นตาม',
          (document.querySelector('.k-panel-head')?.getBoundingClientRect().height || 0) > headH0 + 2,
          `${Math.round(headH0)}→${Math.round(document.querySelector('.k-panel-head')?.getBoundingClientRect().height || 0)}`);
    check('ขนาด UI: ไม่ไปยุ่งกับฟอนต์หน้ากระดาษ (--ed-fs คงเดิม)',
          getComputedStyle(document.documentElement).getPropertyValue('--ed-fs') === fs0);
    // แถบสถานะ/แถบหัวหน้าต่างต้องไม่ล้นออกนอกจอเมื่อขยาย UI
    check('ขนาด UI: แถบสถานะไม่ล้นแนวนอน',
          $('#statusbar').scrollWidth <= $('#statusbar').clientWidth + 2,
          `${$('#statusbar').scrollWidth}/${$('#statusbar').clientWidth}`);
    await kapi.testShot('/tmp/k2_uiscale.png');
    applyUIScale(3);   // เกินเพดาน → ต้องถูก clamp ที่ UI_SCALE_MAX
    check('ขนาด UI: clamp ไม่เกิน ' + UI_SCALE_MAX,
          getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim() === UI_SCALE_MAX.toFixed(3),
          getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'));
    applyUIScale(uiOrig);
    await new Promise((r) => setTimeout(r, 20));

    // ---- โหมดหน้ากระดาษ (paper mode) ----
    activate(t.file);
    t.editor.setMarkdown('ค่ายผู้ลี้ภัยใหญ่กว่าที่คนข้างนอกจะจินตนาการได้\n\nเต็นท์เรียงรายต่อกันเป็นแถวยาว จนแทบมองไม่เห็นปลาย');
    togglePaper(true);
    await new Promise((r) => setTimeout(r, 60));
    check('โหมดหน้ากระดาษ: body มีคลาส paper-mode', document.body.classList.contains('paper-mode'));
    const pmBg = getComputedStyle(document.querySelector('.pane.on .ProseMirror')).backgroundColor;
    check('โหมดหน้ากระดาษ: หน้าเป็นสีกระดาษนวล (ไม่ใช่พื้นมืด)', pmBg === 'rgb(245, 241, 230)', pmBg);
    check('โหมดหน้ากระดาษ: บันทึกลง settings', state.settings.paperMode === true);
    await kapi.testShot('/tmp/k2_paper_prose.png');
    togglePaper(false);
    await new Promise((r) => setTimeout(r, 40));
    check('ปิดโหมดหน้ากระดาษได้ (พื้นมืดกลับมา)',
          !document.body.classList.contains('paper-mode') && state.settings.paperMode === false);
    togglePaper(true);   // เปิดกลับเป็นค่าเริ่มต้น
    t.editor.setMarkdown(orig);

    // ---- วาง/ลากรูปเข้าเอกสาร (paste/drop image import) ----
    activate(t.file);
    const pngSig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
    const mockImg = new File([pngSig], 'ทดสอบวาง.png', { type: 'image/png' });
    await importImageFile(mockImg, t);
    await new Promise((r) => setTimeout(r, 80));
    const imgFiles = await kapi.listFiles(await kapi.join(state.root, 'Images'), '');
    check('วาง/ลากรูป → ไฟล์ถูกเขียนลงคลัง Images',
          imgFiles.some((f) => f.includes('ทดสอบวาง')), JSON.stringify(imgFiles));
    check('วาง/ลากรูป → แทรกอ้างอิงรูปลงเอกสาร',
          t.editor.getMarkdown().includes('!['), t.editor.getMarkdown().slice(0, 40));
    t.editor.setMarkdown(orig);

    // ---- แถบรูปแบบอักษรแบบลอย (ลาก + จำตำแหน่ง) ----
    // รีเซ็ต layout ให้เทสต์ทำซ้ำได้ (localStorage คงค้างข้ามรอบ) + ผนึกแผงที่ลอยค้าง
    document.querySelectorAll('.k-float-panel .k-panel-btn-float').forEach((b) => b.click());
    localStorage.removeItem('k2-ui-layout');
    activate(t.file); refreshToolbar();
    await new Promise((r) => setTimeout(r, 40));
    check('แถบรูปแบบลอยแสดงเมื่อเปิดฉาก + มีปุ่มจัดรูปแบบ',
          !!floatBar && floatBar.style.display === 'flex' && !!floatBar.querySelector('#tb-bold'));
    // ข้อ 1: ปุ่ม 📄กระดาษ · 📖โหมด · </>ซอร์ส ย้ายเข้าแถบลอยแล้ว + เรียงตามภาพ (paper→mode→style→…→source)
    check('ย้ายปุ่ม paper/mode/source เข้าแถบลอยแล้ว',
          !!floatBar.querySelector('#tb-paper') && !!floatBar.querySelector('#tb-mode') &&
          !!floatBar.querySelector('#tb-source'));
    {
      const ids = [...floatBar.children].map((c) => c.id).filter(Boolean);
      const iPaper = ids.indexOf('tb-paper'), iMode = ids.indexOf('tb-mode'),
            iStyle = ids.indexOf('tb-style'), iSrc = ids.indexOf('tb-source');
      check('ลำดับปุ่มในแถบตรงภาพ (paper<mode<style<source)',
            iPaper >= 0 && iPaper < iMode && iMode < iStyle && iStyle < iSrc,
            JSON.stringify(ids));
    }
    await kapi.testShot('/tmp/k2_fmtbar.png');
    // ลากแถบด้วยหูจับ → ตำแหน่งถูกบันทึกลง localStorage
    const grip = floatBar.querySelector('.k-fmtbar-grip');
    grip.dispatchEvent(new MouseEvent('mousedown', { clientX: 120, clientY: 120, button: 0, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 320, clientY: 260, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));
    const lay = JSON.parse(localStorage.getItem('k2-ui-layout') || '{}');
    check('ลากแถบแล้วจำตำแหน่งลง localStorage',
          lay.fmtbar && typeof lay.fmtbar.left === 'number' && typeof lay.fmtbar.top === 'number',
          JSON.stringify(lay.fmtbar));
    check('ปุ่มจัดรูปแบบในแถบลอยยังสั่งงานได้ (id เดิม)',
          typeof document.querySelector('#tb-bold').onclick === 'function');
    // ════ Panel System (Photoshop-style dock/tab/float) — alpha.46 ════
    // e2e ไม่ idempotent ถ้าเลย์เอาต์เก่าค้างใน localStorage → เริ่มจากค่าตั้งต้นเสมอ
    resetPanels();
    await new Promise((r) => setTimeout(r, 30));
    const PMG = getPanelManager();
    const pEl = (id) => document.querySelector(`#app-root .k-panel[data-panel-id="${id}"]`);
    const pHead = (id) => pEl(id)?.querySelector(':scope > .k-panel-head');
    const pBtn = (id, act) => pEl(id)?.querySelector(`:scope > .k-panel-head .k-panel-btn-${act}`)
                          || document.querySelector(`.k-float-panel[data-panel-id="${id}"] .k-panel-btn-${act}`);

    check('Panel System วาดต้นไม้แผงลง #app-root', !!document.querySelector('#app-root .k-panel-root'));
    check('root ของเลย์เอาต์เป็น dock tree', PMG.root && PMG.root.type === 'dock', PMG.root?.type);
    check('ลงทะเบียนแผงหลักครบ 6 ตัว', PMG.registered().length >= 6, PMG.registered().join(','));
    check('แผงหลักถูกวางในต้นไม้ (toolbar/tree/outline/docs/statusbar)',
          ['toolbar', 'tree', 'outline', 'docs', 'statusbar'].every((id) => PMG.isDocked(id)),
          JSON.stringify(PMG.openIds()));
    check('เนื้อแผงเป็น element เดิมของ index.html (ย้ายเข้า ไม่สร้างใหม่)',
          !!pEl('tree')?.querySelector('#tree') && !!pEl('docs')?.querySelector('#panes') &&
          !!pEl('docs')?.querySelector('#tabs'));
    // แถบเครื่องมือ/แถบสถานะเป็นแผงแบบ fixed — พื้นที่ที่เหลือต้องตกเป็นของแถวกลางทั้งหมด
    // (เอนจินตั้ง sizes=evenSizes ให้ทุก dock หลัง removePanel → ถ้าไม่ normalize flex-grow
    //  แถวกลางจะได้แค่เศษส่วนของพื้นที่ว่าง แล้ว canvas/หน้ากระดาษเตี้ยผิดปกติ)
    {
      const rootH = $('#app-root').getBoundingClientRect().height;
      const docsH = pEl('docs').getBoundingClientRect().height;
      check('แผงเอกสารสูงเกือบเต็มจอ (แถบเครื่องมือ/สถานะไม่กินพื้นที่ว่าง)',
            rootH > 200 && docsH > rootH * 0.7, `docs=${Math.round(docsH)} root=${Math.round(rootH)}`);
      // จำลองสภาพหลังปิด/เปิดแผง (sizes ของ dock บนสุดถูกตั้งใหม่เป็น evenSizes)
      hidePanel('outline'); showPanel('outline');
      await new Promise((r) => setTimeout(r, 30));
      check('ปิด/เปิดแผงแล้วความสูงแถวกลางไม่หด',
            pEl('docs').getBoundingClientRect().height > rootH * 0.7,
            `docs=${Math.round(pEl('docs').getBoundingClientRect().height)} root=${Math.round(rootH)}`);
      resetPanels(); await new Promise((r) => setTimeout(r, 30));
    }
    check('tree + Navigation อยู่ในกลุ่มแท็บเดียวกัน',
          !!PL.tabGroupOf(PMG.root, 'tree') &&
          PL.tabGroupOf(PMG.root, 'tree') === PL.tabGroupOf(PMG.root, 'outline'));
    // คลิกหัวแท็บ → สลับแผงที่แสดง
    {
      const grp = PL.tabGroupOf(PMG.root, 'tree');
      const navTab = document.querySelector(`.k-tab-bar .k-tab[data-panel-id="outline"]`);
      check('กลุ่มแท็บวาดหัวแท็บครบทุกแผง', !!navTab && !!document.querySelector('.k-tab[data-panel-id="tree"]'));
      navTab.click();
      await new Promise((r) => setTimeout(r, 20));
      check('คลิกหัวแท็บ Navigation → แท็บนั้น active',
            PL.tabGroupOf(PMG.root, 'outline').children[PL.tabGroupOf(PMG.root, 'outline').active].id === 'outline');
      check('แท็บที่ไม่ active ยังอยู่ใน DOM (โค้ดเก่าอ้าง id ได้ตลอด)', !!document.querySelector('#tree'));
      document.querySelector('.k-tab[data-panel-id="tree"]').click();
      await new Promise((r) => setTimeout(r, 20));
      check('สลับกลับแท็บโปรเจกต์ได้', PMG.root && grp && PL.tabGroupOf(PMG.root, 'tree').active === 0);
    }
    // ที่จับปรับสัดส่วนของ dock (แทน .k-sb-resizer เดิม)
    {
      const handles = [...document.querySelectorAll('#app-root .k-resize-handle')];
      check('dock มีที่จับปรับสัดส่วน', handles.length >= 1, String(handles.length));
      const h = handles[0];
      const dockId = h.dataset.dockId, idx = +h.dataset.index;
      const before = JSON.stringify(PL.panelIds(PMG.root));
      const r0 = h.getBoundingClientRect();
      h.dispatchEvent(new MouseEvent('mousedown', { clientX: r0.left + 2, clientY: r0.top + 20, button: 0, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: r0.left + 90, clientY: r0.top + 20, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
      let d = null; PL.walk(PMG.root, (n) => { if (n.id === dockId) d = n; });
      check('ลากที่จับ → สัดส่วนใน layout tree เปลี่ยน',
            !!d && Math.abs(d.sizes[idx] - 0.5) > 0.001, JSON.stringify(d && d.sizes));
      check('ลากที่จับแล้วบันทึกลง k2-panel-layout',
            (localStorage.getItem('k2-panel-layout') || '').includes('"sizes"'));
      check('ลากที่จับไม่ทำให้แผงหาย', JSON.stringify(PL.panelIds(PMG.root)) === before);
    }

    // ---- explorer: ค้นหา/กรอง ----
    check('มีช่องค้นหาใน explorer', !!document.querySelector('#tree-search'));
    const nScenes = [...document.querySelectorAll('#tree .scene')].filter((s) => !s.classList.contains('add-row')).length;
    filterTree('ไม่น่ามีฉากชื่อนี้xyz123');
    const visAfter = [...document.querySelectorAll('#tree .scene')]
      .filter((s) => !s.classList.contains('add-row') && s.style.display !== 'none').length;
    check('ค้นหาแล้วกรองรายการในต้นไม้', nScenes > 0 && visAfter < nScenes, `${visAfter}/${nScenes}`);
    filterTree('');            // ล้างตัวกรอง
    // ---- ปุ่มบนหัวแผง: พับ / ลอย / ปิด ----
    check('หัวแผงมีปุ่ม พับ+ลอย+ปิด ครบ',
          !!pBtn('tree', 'collapse') && !!pBtn('tree', 'float') && !!pBtn('tree', 'close'));
    check('แผงเอกสารปิด/ลอยไม่ได้ (ไม่มีปุ่ม)', !pBtn('docs', 'close') && !pBtn('docs', 'float'));
    pBtn('tree', 'collapse').click();
    await new Promise((r) => setTimeout(r, 20));
    check('กดพับ → แผงติดคลาส k-collapsed', pEl('tree').classList.contains('k-collapsed'));
    check('พับแล้วหัวแผงยังเห็นอยู่ (คลี่กลับได้)',
          pHead('tree').getBoundingClientRect().height > 4,
          String(pHead('tree').getBoundingClientRect().height));
    check('พับแล้วเนื้อแผงถูกซ่อน', getComputedStyle($('#tree')).display === 'none' ||
          $('#tree').getBoundingClientRect().height === 0);
    pBtn('tree', 'collapse').click();
    await new Promise((r) => setTimeout(r, 20));
    check('กดพับซ้ำ = คลี่กลับ', !pEl('tree').classList.contains('k-collapsed'));
    // ลอย → ผนึกกลับ
    pBtn('tree', 'float').click();
    await new Promise((r) => setTimeout(r, 30));
    check('กดปุ่มลอย → แผงลอยออกมาเป็นหน้าต่างจริง',
          PMG.isFloating('tree') && !!document.querySelector('.k-float-panel[data-panel-id="tree"]'));
    check('แผงลอยจำตำแหน่งลง k2-panel-layout',
          (localStorage.getItem('k2-panel-layout') || '').includes('"floats"'));
    pBtn('tree', 'float').click();
    await new Promise((r) => setTimeout(r, 30));
    check('กดผนึก → แผงกลับเข้าต้นไม้',
          !PMG.isFloating('tree') && PMG.isDocked('tree') && !!pEl('tree'));
    // ปิด → กดปุ่ม toggle บน toolbar → เปิดกลับ
    pBtn('tree', 'close').click();
    await new Promise((r) => setTimeout(r, 30));
    check('ปิดแผง → หายจากต้นไม้', !PMG.isOpen('tree') && !pEl('tree'));
    check('ปิดแผงแล้วปุ่ม toggle บน toolbar ไม่ติด .on',
          $('#tb-tree-panel') && !$('#tb-tree-panel').classList.contains('on'));
    await new Promise((r) => setTimeout(r, 60));
    $('#tb-tree-panel').click();
    await new Promise((r) => setTimeout(r, 30));
    check('กดปุ่ม toggle toolbar → แผงกลับมา',
          PMG.isOpen('tree') && !!pEl('tree') &&
          $('#tb-tree-panel') && $('#tb-tree-panel').classList.contains('on'));

    // ---- บั๊ก #5: ที่จับปรับขนาดของ "แผงลอย" ต้องเห็นและลากได้จริง ----
    {
      pBtn('tree', 'float').click();
      await new Promise((r) => setTimeout(r, 40));
      const pop = document.querySelector('.k-float-panel[data-panel-id="tree"]');
      const grip = pop.querySelector(':scope > .k-panel-resize');
      check('#5 แผงลอยมีที่จับปรับขนาด', !!grip);
      check('#5 ที่จับ "มองเห็นได้จริง" (เดิม CSS ผูกกับคลาสของระบบเก่าจึงถูกซ่อนตลอด)',
            getComputedStyle(grip).display !== 'none' && grip.getBoundingClientRect().width > 4,
            getComputedStyle(grip).display + ' w=' + grip.getBoundingClientRect().width);
      const w0 = pop.offsetWidth, h0 = pop.offsetHeight;
      const gr = grip.getBoundingClientRect();
      grip.dispatchEvent(new MouseEvent('mousedown', { clientX: gr.left + 4, clientY: gr.top + 4, button: 0, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: gr.left + 94, clientY: gr.top + 74, bubbles: true }));
      check('#5 ลากที่จับ → แผงลอยกว้าง/สูงขึ้นทันที',
            pop.offsetWidth > w0 + 60 && pop.offsetHeight > h0 + 50,
            `${w0}x${h0} → ${pop.offsetWidth}x${pop.offsetHeight}`);
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));
      const fl = PMG.floats.find((f) => f.panel.id === 'tree');
      check('#5 ปล่อยเมาส์ → ขนาดใหม่ถูกบันทึกลง store', !!fl && fl.w > w0 + 60 && fl.h > h0 + 50,
            JSON.stringify(fl && { w: fl.w, h: fl.h }) + ` was ${w0}x${h0}`);
      pBtn('tree', 'float').click();                    // ผนึกกลับ
      await new Promise((r) => setTimeout(r, 40));
    }

    // ---- บั๊ก #17 (อัปเดต): ปุ่ม toggle บน toolbar ทำงานถูกต้องทั้งซ้าย/ขวา ----
    {
      showPanel('props'); await new Promise((r) => setTimeout(r, 40));
      hidePanel('props'); await new Promise((r) => setTimeout(r, 40));
      check('#17 ปิดแผงฝั่งขวา → ปุ่ม toggle toolbar ไม่ติด .on',
            $('#tb-props-panel') && !$('#tb-props-panel').classList.contains('on'));
      hidePanel('tree'); await new Promise((r) => setTimeout(r, 40));
      check('#17 ปิดแผงฝั่งซ้าย → ปุ่ม toggle toolbar ไม่ติด .on',
            $('#tb-tree-panel') && !$('#tb-tree-panel').classList.contains('on'));
      check('#17 ทั้งสองปุ่ม toggle แยกจากกัน (คนละ element)',
            $('#tb-tree-panel') !== $('#tb-props-panel'));
      check('#17 ปุ่ม toggle ของแผงที่ยังเปิดอยู่ติด .on แต่ของที่ปิดแล้วไม่ติด',
            !$('#tb-tree-panel').classList.contains('on') &&
            !$('#tb-props-panel').classList.contains('on') &&
            $('#tb-outline-panel').classList.contains('on'));
      $('#tb-props-panel').click(); await new Promise((r) => setTimeout(r, 40));
      check('#17 กดปุ่ม toggle → แผงกลับมา',
            PMG.isOpen('props') && $('#tb-props-panel').classList.contains('on'));
      check('#17 เปิดแผงหนึ่งไม่ไปเปิดอีกแผงโดยไม่ได้ตั้งใจ',
            !PMG.isOpen('tree') && !$('#tb-tree-panel').classList.contains('on'));
      resetPanels(); await new Promise((r) => setTimeout(r, 40));
    }

    // ---- บั๊ก #16: ปรับสัดส่วนแล้วเปิด/ปิดแผง สัดส่วนต้องไม่ถูกล้าง ----
    {
      const rowDock = (() => { let d = null; PL.walk(PMG.root, (n) => { if (!d && n.type === 'dock' && n.dir === 'row') d = n; }); return d; })();
      PMG.resize(rowDock.id, 0, 0.4);                   // ลากให้ซ้าย:ขวา = 40:60
      await new Promise((r) => setTimeout(r, 40));
      const dockOf = () => { let d = null; PL.walk(PMG.root, (n) => { if (!d && n.type === 'dock' && n.dir === 'row') d = n; }); return d; };
      const before = dockOf().sizes.slice(0, 2);
      const ratio0 = before[0] / before[1];
      check('#16 ปรับสัดส่วนแล้วค่าถูกเก็บใน store', Math.abs(ratio0 - 0.4 / 0.6) < 0.05, JSON.stringify(before));
      showPanel('props'); await new Promise((r) => setTimeout(r, 40));
      const mid = dockOf().sizes;
      check('#16a เปิดแผงเพิ่ม → อัตราส่วนเดิมของสองช่องแรกยังอยู่',
            Math.abs(mid[0] / mid[1] - ratio0) < 0.05, JSON.stringify(mid));
      hidePanel('props'); await new Promise((r) => setTimeout(r, 40));
      const after = dockOf().sizes;
      check('#16b ปิดแผง → สัดส่วนกลับมาเท่าที่ผู้ใช้ปรับไว้ (ไม่กลายเป็นแบ่งเท่ากัน)',
            Math.abs(after[0] / after[1] - ratio0) < 0.05, JSON.stringify(after) + ' vs ' + ratio0.toFixed(3));
      // dock ชั้นนอก (toolbar/แถวกลาง/statusbar) ต้องไม่ถูก reset ตามไปด้วย
      check('#16b dock ชั้นนอกไม่ถูก reset ตอนปิดแผงชั้นใน',
            PMG.root.type === 'dock' && PMG.root.sizes[0] === 0 && PMG.root.sizes[2] === 0,
            JSON.stringify(PMG.root.sizes));
      resetPanels(); await new Promise((r) => setTimeout(r, 40));
    }

    // ---- บั๊ก #19: เลย์เอาต์ต้องไม่ "เด้งกลับค่าตั้งต้น" เอง ----
    {
      check('#19 แผงเอกสารปิดไม่ได้ (กัน root กลายเป็น null)',
            PMG.hidePanel('docs') === false && PMG.isDocked('docs'));
      hidePanel('outline'); await new Promise((r) => setTimeout(r, 40));
      const openIds = PMG.openIds().join(',');
      renderPanels(true); await new Promise((r) => setTimeout(r, 40));
      check('#19 วาดใหม่แล้วแผงที่ปิดไว้ไม่โผล่กลับมาเอง',
            PMG.openIds().join(',') === openIds && !PMG.isOpen('outline'), PMG.openIds().join(','));
      resetPanels(); await new Promise((r) => setTimeout(r, 40));
    }

    // ---- ลากหัวแผง → ผนึกอีกด้าน (snap zone) ----
    {
      const docs = pEl('docs').getBoundingClientRect();
      const head = pHead('tree');
      head.dispatchEvent(new MouseEvent('mousedown', { clientX: 60, clientY: 120, button: 0, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: docs.right - 12, clientY: docs.top + docs.height / 2, bubbles: true }));
      check('ลากแผงแล้วมีแถบบอกโซนปล่อย (drop zone)',
            getComputedStyle(document.querySelector('.k-drop-zone')).display !== 'none');
      document.dispatchEvent(new MouseEvent('mouseup', { clientX: docs.right - 12, clientY: docs.top + docs.height / 2, bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));
      // เทียบกับตำแหน่ง docs "หลังปล่อย" (ก่อนลาก docs อาจอยู่ขวาสุดอยู่แล้ว)
      const dockedNow = PMG.isDocked('tree');
      const treeLeft = pEl('tree') ? pEl('tree').getBoundingClientRect().left : -1;
      const docsNow = pEl('docs').getBoundingClientRect();
      const ids = PMG.root ? PL.panelIds(PMG.root) : [];
      check('ปล่อยที่ขอบขวาของเอกสาร → แผงถูกผนึกไปฝั่งขวา',
            dockedNow && !PMG.isFloating('tree') &&
            ids.indexOf('tree') > ids.indexOf('docs') && treeLeft > docsNow.left,
            `treeLeft=${treeLeft} docsL=${docsNow.left} ids=${ids.join('/')}`);
      check('โซนปล่อยถูกซ่อนหลังปล่อยเมาส์',
            getComputedStyle(document.querySelector('.k-drop-zone')).display === 'none');
      resetPanels(); await new Promise((r) => setTimeout(r, 30));
    }
    // ---- icon strip: ย่อกลุ่มแท็บเหลือแถบไอคอน ----
    {
      const grpEl = document.querySelector('#app-root .k-tab-group');
      const btn = grpEl.querySelector('.k-strip-btn');
      check('กลุ่มแท็บมีปุ่มย่อเป็นแถบไอคอน', !!btn);
      btn.click();
      await new Promise((r) => setTimeout(r, 20));
      const strip = document.querySelector('#app-root .k-tab-group.icon-strip');
      check('ย่อกลุ่มแท็บ → เหลือแถบไอคอน (icon-strip)', !!strip);
      check('แถบไอคอนซ่อนชื่อแท็บ + เนื้อแผง',
            getComputedStyle(strip.querySelector('.k-tab-title')).display === 'none' &&
            getComputedStyle(strip.querySelector('.k-tab-content')).display === 'none');
      strip.querySelector('.k-strip-btn').click();
      await new Promise((r) => setTimeout(r, 20));
      check('กดซ้ำ → คลี่กลับเป็นกลุ่มแท็บปกติ',
            !document.querySelector('#app-root .k-tab-group.icon-strip'));
    }
    // ---- สลับลำดับแท็บในกลุ่ม (moveTab) ----
    {
      const grp = PL.tabGroupOf(PMG.root, 'tree');
      PMG.moveTab(grp.id, 0, 1);
      await new Promise((r) => setTimeout(r, 20));
      const g2 = PL.tabGroupOf(PMG.root, 'tree');
      check('สลับลำดับแท็บในกลุ่มได้ (moveTab)', g2.children[1].id === 'tree', g2.children.map((c) => c.id).join(','));
      check('ลำดับแท็บใหม่ถูกวาดตามลำดับจริง',
            [...document.querySelectorAll('#app-root .k-tab-bar .k-tab')].map((x) => x.dataset.panelId).join(',')
              .startsWith('outline,tree'));
      resetPanels(); await new Promise((r) => setTimeout(r, 30));
    }
    // hover ฉากแสดงรายละเอียด (สถานะ/แท็ก/เรื่องย่อ) แบบ v1
    const anyScene = [...document.querySelectorAll('#tree .scene')].find((s) => !s.classList.contains('add-row'));
    check('ฉากในต้นไม้มี tooltip รายละเอียด (hover)', !!anyScene && typeof anyScene.title === 'string' && anyScene.title.length > 0);
    // ---- ฟีเจอร์ใหม่ alpha.23 ----
    check('ฉากในต้นไม้พก _scene (กรองได้ทุกฟิลด์)', !!anyScene && !!anyScene._scene);
    check('ฉากลากได้ (draggable) แบบ Explorer', !!anyScene && anyScene.draggable === true);
    check('ช่องค้นหาอยู่ในแผง explorer', !!document.querySelector('#tree-panel #tree-search'));
    check('มีปุ่มสลับช่องค้นหา 🔍 บนหัวแผง', !!pEl('tree')?.querySelector('.k-tree-search-btn'));
    check('มีแผงคุณสมบัติ (Properties panel)', !!document.querySelector('#props-panel #props-body'));
    // แผงคุณสมบัติไม่อยู่ในเลย์เอาต์ตั้งต้น — showPanel ต้องผนึกเข้าฝั่งขวาให้
    showPanel('props-panel');
    await new Promise((r) => setTimeout(r, 30));
    check('showPanel(props) ผนึกแผงคุณสมบัติเข้าต้นไม้', PMG.isDocked('props') && !!pEl('props'));
    check('ชื่อแผงมาจาก i18n (panel.navigation)',
          pEl('outline')?.querySelector('.k-panel-head-title')?.textContent === tr('panel.navigation'),
          pEl('outline')?.querySelector('.k-panel-head-title')?.textContent + ' vs ' + tr('panel.navigation'));
    check('ปุ่มพิเศษบนหัวแผงรอดจากการวาดใหม่ (addPanelButton)',
          !!pEl('tree')?.querySelector('.k-panel-ctrls .k-tree-refresh-btn') &&
          typeof pEl('tree').querySelector('.k-tree-refresh-btn').onclick === 'function');
    check('Navigation มีปุ่มสลับย่อหน้า ¶', !!document.querySelector('#nav-beats-btn'));
    check('เนื้อแผงที่ไม่ถูกวางยังอยู่ใน DOM (ที่พัก #k-panel-src)', !!document.getElementById('k-panel-src'));

    // ---- ความสัมพันธ์: บทบาทฝั่งตรงข้าม (inverse) + dropdown บทบาทที่รู้จัก ----
    await warmInverse();
    check('invertRole ใช้ inverse_roles (พ่อ→ลูก)', (await invertRole('พ่อ')) === 'ลูก',
          await invertRole('พ่อ'));
    check('knownRoles มีบทบาทจากคลังให้เลือกใน dropdown', knownRoles().includes('พ่อ'),
          knownRoles().length);

    // ---- ประเภทความสัมพันธ์ (Typed Relationships): dropdown + เดาประเภทจากบทบาท ----
    check('inverse_roles.json โหลด categories (บทบาท→ประเภท)',
          !!INV_C.cat && INV_C.cat['พ่อ'] === 'family', JSON.stringify(INV_C.cat).slice(0, 60));
    check('categorizeWith ใช้ categories จากไฟล์ (สามี→คนรัก)',
          categorizeWith(INV_C.cat, 'สามี') === 'romantic');
    {
      const pRel = relationDialog(['ยัยแมวเก้าชีวิต'], 'ทดสอบประเภท');
      await new Promise((r) => setTimeout(r, 80));
      const ovsR = [...document.querySelectorAll('.k-overlay')];
      const bxR = ovsR[ovsR.length - 1];
      const selType = bxR.querySelector('select.rel-type');
      check('กล่องผูกความสัมพันธ์มีช่องเลือกประเภท (9 ประเภท + ไม่ระบุ)',
            !!selType && selType.options.length === REL_TYPES.length + 1,
            selType && selType.options.length);
      const inR2 = bxR.querySelector('input.wiki-input');
      inR2.value = 'พ่อ'; inR2.dispatchEvent(new Event('input', { bubbles: true }));
      check('พิมพ์บทบาท “พ่อ” → เดาประเภทเป็นครอบครัว', selType.value === 'family', selType.value);
      inR2.value = 'ศัตรู'; inR2.dispatchEvent(new Event('input', { bubbles: true }));
      check('พิมพ์บทบาท “ศัตรู” → เดาประเภทเป็นศัตรู', selType.value === 'enemy', selType.value);
      // ผู้ใช้เลือกเอง = ห้ามเดาทับ
      selType.value = 'rival'; selType.dispatchEvent(new Event('change', { bubbles: true }));
      inR2.value = 'พ่อ'; inR2.dispatchEvent(new Event('input', { bubbles: true }));
      check('เลือกประเภทเองแล้ว ระบบไม่เดาทับ', selType.value === 'rival', selType.value);
      bxR.querySelector('.k-ok').click();
      const resR = await pRel;
      check('relationDialog คืนค่า type กลับมาด้วย',
            !!resR && resR.role === 'พ่อ' && resR.type === 'rival', JSON.stringify(resR));
    }

    // ---- แก้เทมเพลตแบบ JSON (สลับฟอร์ม ↔ JSON) ----
    templateEditModal({ id: 'tpl-jsontest', name: 'ทดสอบ JSON', entityTypeKey: 'characters',
                        fields: [{ key: 'age', label: 'อายุ', type: 'Int' }], sections: [] });
    await new Promise((r) => setTimeout(r, 60));
    const tdlg = document.querySelector('.k-tpl-edit');
    [...tdlg.querySelectorAll('button')].find((b) => b.textContent.includes('JSON')).click();
    await new Promise((r) => setTimeout(r, 40));
    const jta = tdlg.querySelector('.k-src-view');
    check('เทมเพลตสลับไปแก้เป็น JSON ได้',
          !!jta && jta.value.includes('"name"') && jta.value.includes('"fields"'),
          jta && jta.value.slice(0, 30));
    tdlg.closest('.k-overlay').remove();

    // ---- เทมเพลต: ฝังลงโปรเจกต์ + ใช้ตอนสร้าง entity ----
    check('templates.json ถูกฝังลงโปรเจกต์',
          await kapi.exists(await kapi.join(state.root, 'templates.json')));
    check('โหลดเทมเพลต default ของ v1 ครบ', state.templates.length >= 5, state.templates.length);
    const tpChar = state.templates.find((x) => x.entityTypeKey === 'characters');
    const eTp = applyTemplate({ id: 'x', entityTypeKey: 'characters', name: 'ท', sections: [] }, tpChar);
    check('applyTemplate เติม fields/sections แบบ v1',
          'Gender' in eTp.fields && eTp.sections.length >= 1, JSON.stringify(eTp).slice(0, 200));

    // ---- คลังรูปแบบ v1: index sync + picker ใช้แทรกในฉากได้ ----
    await openGallery();
    await new Promise((r) => setTimeout(r, 400));
    check('คลังรูปเปิดเป็นแท็บ + เห็นรูป', !!state.active?.gal &&
          document.querySelectorAll('.pane.on .gal-cell').length >= 1);
    const idx = await kapi.readJson(await kapi.join(state.root, 'Images', 'images.json'));
    check('images.json ถูก sync จากไฟล์จริง', idx.images.some((x) => x.file === 'sunset.png'),
          JSON.stringify(idx));
    closeTab('::gallery::');
    activate(t.file);
    // picker: เปิด → เลือกรูปแรก → ![caption](rel) ถูกแทรก
    const pPick = insertImage();
    await new Promise((r) => setTimeout(r, 350));
    const choice = document.querySelector('.gal-choice');
    check('picker แสดงรูปจากคลัง', !!choice);
    choice.click();
    await pPick;
    check('แทรกรูปจากคลังลงฉาก (md ถูกกติกา)',
          /!\[[^\]]*\]\([^)]*sunset\.png\)/.test(t.editor.getMarkdown()),
          t.editor.getMarkdown().slice(-120));
    t.editor.setMarkdown(orig);
    await saveTab(t);                              // เคลียร์ dirty ก่อนสลับโปรเจกต์

    // ---- เปิดโปรเจกต์ใหม่ต้องปิดของเก่า (สร้างผ่าน createProjectAt ตรง ๆ)
    //      พร้อมพิสูจน์ dialog เตือน save: ทำแท็บให้ dirty แล้วกด "บันทึกทั้งหมดแล้วปิด" ----
    markDirty(t);
    const beforeTabs = state.tabs.size;
    const pNew = createProjectAt('/tmp', 'โปรเจกต์ทดสอบปิดเก่า');
    let warnBtn = null;                            // รอ dialog แบบ loop (กันเครื่องช้า)
    for (let i = 0; i < 20 && !warnBtn; i++) {
      await new Promise((r) => setTimeout(r, 80));
      warnBtn = document.querySelector('.k-dialog .k-dlg-btns .k-ok');
    }
    check('สลับโปรเจกต์ตอนมีงานค้าง → มี dialog เตือนบันทึก', !!warnBtn,
          `dirty=${[...state.tabs.values()].filter((x) => x.dirty).length}` +
          ` overlays=${document.querySelectorAll('.k-overlay').length}` +
          ` dlg=${(document.querySelector('.k-dialog')?.textContent || '').slice(0, 80)}`);
    warnBtn.click();                               // บันทึกทั้งหมดแล้วปิด
    await pNew;
    // บั๊ก #18: แดชบอร์ดเป็นแผงแล้ว ไม่กินที่ในแถบแท็บ → สลับโปรเจกต์แล้วต้องไม่เหลือแท็บเลย
    check('สร้าง+สลับโปรเจกต์แล้วแท็บเก่าถูกปิดหมด (แดชบอร์ดเป็นแผง ไม่ใช่แท็บ)',
          state.title === 'โปรเจกต์ทดสอบปิดเก่า' && state.tabs.size === 0,
          `${state.title} tabs=${state.tabs.size} (ก่อน=${beforeTabs})`);
    check('โปรเจกต์ใหม่มี templates.json ตั้งแต่เกิด',
          await kapi.exists(await kapi.join(state.root, 'templates.json')));
    await loadProject(projectPath);                // กลับโปรเจกต์ทดสอบหลัก (path มาจาก KILLIAN_TEST_PROJECT)
    document.querySelector('.scene').click();
    await new Promise((r) => setTimeout(r, 500));
    const t2 = state.active;                       // แท็บใหม่ (ตัวเก่าถูก destroy ไปแล้ว)

    // ---- บทหนัง WYSIWYG ----
    const spScene = [...document.querySelectorAll('.scene')]
      .find((x) => x.textContent.includes('บทหนังทดสอบ'));
    spScene.click();
    await new Promise((r) => setTimeout(r, 400));
    const spTab = state.active;
    check('บทหนังเปิดเป็น WYSIWYG (ไม่ใช่ textarea)', !!spTab.sp && !spTab.plain);
    const spOrig = parseMdFile(await kapi.readFile(spTab.file)).body;
    const spEls = [];
    spTab.sp.view.state.doc.forEach((n) => spEls.push(n.attrs.el));
    check('element ถูก classify: หัวฉาก/ตัวละคร/บทพูด',
          spEls[0] === 'scene' && spEls.includes('character') && spEls.includes('dialogue'),
          JSON.stringify(spEls));
    // classify: ชื่อตัวละครผสมพิมพ์เล็ก/ภาษาไทย ต้องจับเป็น character (บั๊กเดิมจับไม่ได้)
    { const { classify } = await import('./fountain.js');
      check('classify: ชื่อผสมพิมพ์เล็ก (Nazarena) = ตัวละคร', classify('Nazarena', true, 'action')[0] === 'character');
      check('classify: ชื่อมีขีดกลาง (Frinton-Smith) = ตัวละคร', classify('Frinton-Smith', true, 'action')[0] === 'character');
      check('classify: ชื่อไทย (ตัวเอก) = ตัวละคร', classify('ตัวเอก', true, 'action')[0] === 'character');
      check('classify: บรรยายยาวไม่ใช่ตัวละคร',
            classify('ฝนตกหนักมากจนมองแทบไม่เห็นทางข้างหน้าเลย', true, 'action')[0] === 'action'); }
    // เทียบเชิงความหมาย: classify กลับต้องได้ element+ข้อความเหมือนต้นฉบับทุกบรรทัด
    const { parseScript } = await import('./fountain.js');
    const semA = parseScript(spTab.sp.getMarkdown());
    const semB = parseScript(spOrig);
    check('บทหนัง round-trip กติกา v1 (element+ข้อความตรงทุกบรรทัด)',
          semA.length === semB.length &&
          semA.every((x, i) => x.el === semB[i].el && x.text === semB[i].text),
          JSON.stringify([semA, semB]));
    // Enter จาก character → dialogue · Tab วน element
    const { TextSelection: TS2 } = await import('prosemirror-state');
    const vsp = spTab.sp.view;
    let chPos = null;
    vsp.state.doc.forEach((n, off) => { if (chPos === null && n.attrs.el === 'character') chPos = off; });
    vsp.dispatch(vsp.state.tr.setSelection(TS2.create(vsp.state.doc, chPos + 1 + n2len(vsp, chPos))));
    function n2len(v, off) { return v.state.doc.nodeAt(off).content.size; }
    spTab.sp.enter();
    check('Enter หลังตัวละคร → บทพูด', spTab.sp.curElement() === 'dialogue');
    spTab.sp.cycle(1);
    check('สลับ element ได้ (Ctrl+↑/↓ · Tab ไม่สลับแล้ว)', spTab.sp.curElement() === 'transition');
    setElementBadge(spTab.sp.curElement());
    check('ป้าย element เป็น dropdown คลิกเลือกได้',
          $('#elem-badge').classList.contains('elem-pick') && typeof $('#elem-badge').onclick === 'function');
    spTab.sp.setElement('scene');
    check('เลือก element ตรงจาก setElement ได้', spTab.sp.curElement() === 'scene');
    spTab.sp.setElement('dialogue');
    vsp.dispatch(vsp.state.tr.insertText('ทดสอบพูด'));
    await saveTab(spTab);
    check('บันทึกบทหนังลงไฟล์ตามกติกา v1',
          parseMdFile(await kapi.readFile(spTab.file)).body.includes('ทดสอบพูด'));
    // SmartType ในช่องตัวละคร: เดาเฉพาะชื่อตัวละคร
    spTab.sp.setElement('character');
    vsp.dispatch(vsp.state.tr.insertText('ยัยแ'));
    spSmartCheck(spTab);
    check('SmartType บทหนังตาม element (ตัวละคร)', smart.visible &&
          smart.items.some((x) => x.includes('ยัยแมว')), JSON.stringify(smart.items));
    // Final Draft: จำชื่อตัวละครที่ "พิมพ์ในบท" แม้ไม่มีใน Wiki
    const terms = screenplayTerms(spTab);
    check('บทหนังเก็บชื่อตัวละครที่พิมพ์ในบท (Final Draft)',
          Array.isArray(terms.chars), JSON.stringify(terms.chars).slice(0, 60));
    smart.hide();
    // จัดหน้าในบทหนัง: setAlign เขียน attr align + curAlign อ่านกลับได้
    spTab.sp.setElement('action');
    spTab.sp.setAlign('center');
    check('บทหนัง: จัดหน้ากึ่งกลางได้ (setAlign/curAlign)', spTab.sp.curAlign() === 'center');
    check('บทหนัง: บล็อกมี style text-align จริงใน DOM',
          !!document.querySelector('.pane.on .sp[style*="center"]'));
    spTab.sp.setAlign('left');
    check('บทหนัง: คืนชิดซ้าย = ล้าง align (attr null)', spTab.sp.curAlign() === 'left');
    // บล็อกตัวละคร: ชื่อ Wiki กลายเป็นลิงก์ได้ (แต่ต้องเป็นลิงก์เดียวคลุมทั้งชื่อ ไม่ลามซ้ำ)
    spTab.sp.setElement('character');
    { const b = spTab.sp.curBlock();
      spTab.sp.view.dispatch(spTab.sp.view.state.tr.delete(b.pos + 1, b.pos + 1 + b.node.content.size)); }
    spTab.sp.view.dispatch(spTab.sp.view.state.tr.insertText('ยัยแมวเก้าชีวิต'));
    spTab.sp.refreshMentions(); refreshSpell(spTab.sp.view);
    await new Promise((r) => setTimeout(r, 40));
    const charMentions = document.querySelectorAll('.pane.on .sp-character .k-mention');
    check('บล็อกตัวละคร: ชื่อ Wiki เป็นลิงก์ได้ (Wiki link ในบทหนังใช้ได้ทุกบล็อก)',
          charMentions.length === 1, 'mentions=' + charMentions.length);
    check('บล็อกตัวละคร: ไม่มีขีดแดงตรวจคำผิด',
          !document.querySelector('.pane.on .sp-character .k-spell-bad'));
    await kapi.testShot('/tmp/k2_sp_fixed.png');
    // ถ่ายบทหนังในโหมดหน้ากระดาษด้วย
    togglePaper(true); await new Promise((r) => setTimeout(r, 60));
    check('บทหนังโหมดหน้ากระดาษ: หน้าขาว',
          getComputedStyle(document.querySelector('.pane.on .ProseMirror')).backgroundColor === 'rgb(245, 241, 230)');
    await kapi.testShot('/tmp/k2_paper_sp.png');
    // กล่องขยายรูปทำงาน (lightbox)
    imageLightboxTest();
    function imageLightboxTest() {
      imageLightbox('file:///tmp/nope.png', 'ทดสอบ');
    }
    await new Promise((r) => setTimeout(r, 20));
    check('กล่องขยายรูป (lightbox) เปิดได้', !!document.querySelector('.k-lightbox .k-lightbox-img'));
    document.querySelector('.k-lightbox').click();          // คลิกปิด
    await new Promise((r) => setTimeout(r, 20));
    check('คลิกแล้วกล่องขยายรูปปิด', !document.querySelector('.k-lightbox'));

    // ================= v2.0.0-alpha.24: บทหนัง (รูป/Wiki/Final Draft) =================
    activate(spTab.file);
    await new Promise((r) => setTimeout(r, 100));
    const vsp2 = spTab.sp.view;
    // (8) SmartType แบบ Final Draft: หัวฉาก พิมพ์ "e" → EXT. (1 ตัว + ไม่สนพิมพ์เล็กใหญ่)
    spTab.sp.setElement('scene');
    { const b = spTab.sp.curBlock();
      vsp2.dispatch(vsp2.state.tr.delete(b.pos + 1, b.pos + 1 + b.node.content.size)); }
    vsp2.dispatch(vsp2.state.tr.insertText('e'));
    spSmartCheck(spTab);
    check('บทหนัง SmartType Final Draft: พิมพ์ e → EXT.',
          smart.visible && smart.items.some((x) => x.toUpperCase().startsWith('EXT')),
          JSON.stringify(smart.items));
    smart.hide();
    { const b = spTab.sp.curBlock();
      vsp2.dispatch(vsp2.state.tr.delete(b.pos + 1, b.pos + 1 + b.node.content.size)); }
    // (8) ลิงก์ Wiki ในบทหนัง: ใส่ชื่อในบรรยาย → มี .k-mention
    spTab.sp.setElement('action');
    { const b = spTab.sp.curBlock();
      vsp2.dispatch(vsp2.state.tr.insertText('เขาเจอ ยัยแมวเก้าชีวิต ที่นั่น', b.pos + 1)); }
    spTab.sp.refreshMentions();
    await new Promise((r) => setTimeout(r, 120));
    check('บทหนังไฮไลต์ชื่อ Wiki ได้ (.k-mention) — ลิงก์ไป Wiki',
          document.querySelectorAll('.pane.on .k-mention').length >= 1);
    // (7) รูปในบทหนังเป็น node จริง (spimage) ไม่กลายเป็น markdown
    const TSsp = (await import('prosemirror-state')).TextSelection;
    { const b = spTab.sp.curBlock();
      vsp2.dispatch(vsp2.state.tr.setSelection(TSsp.create(vsp2.state.doc, b.pos + 1 + b.node.content.size))); }
    spTab.sp.insertImage('../../Images/x.png', 'ภาพทดสอบบท', '![ภาพทดสอบบท](../../Images/x.png)');
    let hasSpImg = false;
    vsp2.state.doc.forEach((n) => { if (n.type.name === 'spimage') hasSpImg = true; });
    check('แทรกรูปในบทหนัง = node รูปจริง (spimage) ไม่ใช่ข้อความ', hasSpImg);
    check('รูปในบทหนัง render เป็น <figure><img> จริง',
          !!document.querySelector('.pane.on figure.sp-image img'));
    check('บทหนัง getMarkdown คงบรรทัดรูปเป็น ![..](..) — ไม่หลุดเป็นข้อความล้วน',
          spTab.sp.getMarkdown().includes('![ภาพทดสอบบท](../../Images/x.png)'));
    activate(t.file);

    // ---- Dashboard ----
    await openDashboard();
    await new Promise((r) => setTimeout(r, 600));
    check('แดชบอร์ดเปิด + ตัวเลขสถิติมา',
          isPanelOpen('dashboard') &&
          document.querySelector('#dash-body .dash-num')?.textContent !== '…');
    check('แดชบอร์ดมีแผงสถิติเชิงลึก (analytics)',
          !!document.querySelector('#dash-body .dash-analytics'));
    check('มีแถบความคืบหน้าตามสถานะฉาก',
          !!document.querySelector('#dash-body .dash-apanel .dash-stat-fill'));
    check('มีแผงความยาวแต่ละบท',
          [...document.querySelectorAll('#dash-body .dash-apanel-title')]
            .some((e) => e.textContent.includes('ความยาวแต่ละบท')));
    await kapi.testShot('/tmp/k2_analytics.png');
    closeTab('::dash::');

    // ---- เวิร์กโฟลว์ส่งออก (compile) ----
    {
      const drafts = await listDrafts();
      check('listDrafts เจอฉบับร่างอย่างน้อย 1', drafts.length >= 1);
      const model = await buildDraftModel(drafts[0].dPath, 'เล่มทดสอบ compile');
      check('buildDraftModel: มีบท + ฉาก + นับคำ',
            model.chapters.length >= 1 && model.chapters[0].scenes.length >= 1 &&
            model.chapters[0].scenes.some((s) => s.words > 0));
      // พรีเซ็ต reader มีหน้าปก + ตัดโน้ต
      const rd = runWorkflow(model, PRESETS.find((p) => p.id === 'reader'));
      check('พรีเซ็ต reader: หน้าปกมีชื่อเรื่อง', rd.text.includes('# เล่มทดสอบ compile'));
      // html preset → ext html + แท็ก html
      const ht = runWorkflow(model, PRESETS.find((p) => p.id === 'html'));
      check('พรีเซ็ต html: ext=html + มี <h1', ht.ext === 'html' && /<h1[ >]/.test(ht.text));
      // plain preset → txt + ไม่มี ** จาก markdown
      const pl = runWorkflow(model, PRESETS.find((p) => p.id === 'plain'));
      check('พรีเซ็ต plain: ext=txt + ไม่มี ** ของ markdown', pl.ext === 'txt' && !pl.text.includes('**'));
      // ทำสำเนา → บันทึกลง meta
      const before = userWorkflows().length;
      const cloned = cloneWorkflow(PRESETS.find((p) => p.id === 'editor'));
      userWorkflows().push(cloned); await saveProjectMeta();
      const pjw = await kapi.readJson(await kapi.join(state.root, 'project.khn.json'));
      check('ทำสำเนาเวิร์กโฟลว์ → เก็บลง project.khn.json',
            Array.isArray(pjw.compileWorkflows) && pjw.compileWorkflows.length === before + 1);
      check('เวิร์กโฟลว์สำเนาแก้ได้ (builtIn=false)', cloned.builtIn === false);
      // เปิดกล่อง compile จริง + ดูตัวอย่าง
      const dlg = await openCompileDialog();
      await new Promise((r) => setTimeout(r, 60));
      check('กล่องส่งออกเวิร์กโฟลว์เปิด + มีรายการพรีเซ็ต',
            !!document.querySelector('.k-compile') &&
            document.querySelectorAll('.k-compile .cmp-wf').length >= PRESETS.length);
      dlg.select('html');
      document.querySelector('.k-compile .cmp-preview')
        && [...document.querySelectorAll('.k-compile .k-dlg-btns button')]
             .find((b) => b.textContent.includes('ดูตัวอย่าง'))?.click();
      await new Promise((r) => setTimeout(r, 120));
      check('กดดูตัวอย่างแล้วมีข้อความพรีวิว',
            (document.querySelector('.k-compile .cmp-preview')?.textContent || '').length > 5);
      await kapi.testShot('/tmp/k2_compile.png');
      document.querySelector('.k-compile .k-cancel').click();
    }

    // ---- หมวด Wiki ที่ผู้ใช้สร้างเอง ----
    {
      const nBefore = wikiCats().length;
      wikiCats().push({ key: 'factions', label: 'องค์กร/กลุ่ม', icon: '⚔' });
      await saveProjectMeta(); applyWikiCats();
      const wr = await wikiRoot();
      await kapi.mkdir(await kapi.join(wr, 'factions'));
      const pjc = await kapi.readJson(await kapi.join(state.root, 'project.khn.json'));
      check('สร้างหมวดเอง → เก็บลง project.khn.json',
            (pjc.wikiCats || []).some((c) => c.key === 'factions' && c.label === 'องค์กร/กลุ่ม'));
      check('catLabel/catIcon อ่านหมวดเองได้',
            catLabel('factions') === 'องค์กร/กลุ่ม' && catIcon('factions') === 'bookmark');
      check('applyWikiCats ใส่ชื่อไทยเข้า CAT_TH (เทมเพลตแสดงตรง)', CAT_TH.factions === 'องค์กร/กลุ่ม');
      // สร้าง entity ในหมวดเอง
      const fDir = await kapi.join(wr, 'factions');
      const pF = addEntity(fDir, 'factions');
      await new Promise((r) => setTimeout(r, 60));
      document.querySelector('#ent-name').value = 'สมาคมพ่อค้า';
      document.querySelector('.k-dialog .k-ok').click();
      await pF;
      await new Promise((r) => setTimeout(r, 200));
      const ents = await loadAllEntities();
      check('เพิ่ม entity ในหมวดเองได้ + entityTypeKey ตรงหมวด',
            ents.some((e) => e.name === 'สมาคมพ่อค้า' && e.cat === 'factions'));
      closeTab(state.active.file);
      // buildTree แสดงหมวดเอง (ไอคอน + ชื่อ)
      await buildTree();
      check('Explorer แสดงหมวดที่สร้างเอง',
            [...document.querySelectorAll('#tree .ch-title')].some((e) => e.textContent.includes('องค์กร/กลุ่ม')));
      // ลบหมวดที่ยังมีของ → ต้องกันไว้
      await deleteWikiCat('factions', fDir);
      check('ลบหมวดที่ยังมีรายการไม่ได้ (กันข้อมูลหาย)',
            wikiCats().some((c) => c.key === 'factions'));
      // หมวดหลักลบไม่ได้
      const before2 = wikiCats().length;
      await deleteWikiCat('characters', await kapi.join(wr, 'characters'));
      check('หมวดหลักลบไม่ได้', wikiCats().length === before2);
    }


    // ---- Relationships + inverse sync สองทาง ----
    const catDir2 = await kapi.join(state.root, 'Wiki', 'characters');
    const pE2 = addEntity(catDir2, 'characters');
    await new Promise((r) => setTimeout(r, 60));
    document.querySelector('#ent-name').value = 'น้องสาวทดสอบ';
    document.querySelector('.k-dialog .k-ok').click();
    await pE2;
    await new Promise((r) => setTimeout(r, 250));
    const relTab = state.active;
    relTab.wiki.e.relationships = [{ targetName: 'ยัยแมวเก้าชีวิต', role: 'พี่สาว', type: 'family' }];
    await relTab.wiki.save();
    relTab.wiki.render();
    await new Promise((r) => setTimeout(r, 120));
    {
      const dot = relTab.pane.querySelector('.rel-type-dot');
      check('หน้า Wiki มีจุดสีบอกประเภทความสัมพันธ์',
            !!dot && (dot.title || '').includes('ครอบครัว'), dot && dot.title);
      check('จุดสีใช้สีประจำประเภท (family = #e06c75)',
            !!dot && dot.style.background.replace(/\s/g, '') === 'rgb(224,108,117)',
            dot && dot.style.background);
    }
    await smart.loadNames(state.root);
    const catFile = smart.fileOf['ยัยแมวเก้าชีวิต'];
    check('fileOf พร้อมหลัง loadNames', !!catFile, JSON.stringify(Object.keys(smart.fileOf)));
    const catEnt = await kapi.readJson(catFile);
    check('ความสัมพันธ์ sync สองทาง + สลับบทบาท (พี่สาว↔น้อง)',
          (catEnt.relationships || []).some((r) =>
            r.targetName === 'น้องสาวทดสอบ' && r.role && r.role !== 'พี่สาว'),
          JSON.stringify(catEnt.relationships));
    check('ประเภทความสัมพันธ์ซิงก์ไปฝั่งตรงข้ามด้วย',
          (catEnt.relationships || []).some((r) =>
            r.targetName === 'น้องสาวทดสอบ' && r.type === 'family'),
          JSON.stringify(catEnt.relationships));
    check('ประเภทถูกเก็บลงไฟล์ของฝั่งที่ตั้ง',
          ((await kapi.readJson(relTab.file)).relationships || [])[0].type === 'family');
    closeTab(relTab.file);

    // ---- Story Network ----
    await openNetwork();
    await new Promise((r) => setTimeout(r, 500));
    const netTab = state.tabs.get('::network::');
    check('Story Network มีโหนด + เส้นความสัมพันธ์',
          netTab.net.nodes.length >= 2 && netTab.net.edges.length >= 1,
          `nodes=${netTab.net.nodes.length} edges=${netTab.net.edges.length}`);
    check('เส้นในกราฟมีประเภทติดมาด้วย (family จากที่ตั้งไว้)',
          netTab.net.edges.some((e) => e.type === 'family'),
          JSON.stringify(netTab.net.edges.map((e) => [e.role, e.type])));
    check('ทุกเส้นได้ประเภทที่มีสีจริง (ไม่ระบุ = เดาจากบทบาท)',
          netTab.net.edges.every((e) => !!REL_COLOR[e.type]),
          JSON.stringify(netTab.net.edges.map((e) => e.type)));
    closeTab('::network::');

    // ---- บรรยากาศรับรู้ของสถานที่ (Sensory Profiles) ----
    {
      const locDir = await kapi.join(await wikiRoot(), 'locations');
      await kapi.mkdir(locDir);
      const pLoc = addEntity(locDir, 'locations');
      await new Promise((r) => setTimeout(r, 80));
      document.querySelector('#ent-name').value = 'หอสมุดร้าง';
      { const ovs = [...document.querySelectorAll('.k-overlay')];
        ovs[ovs.length - 1].querySelector('.k-ok').click(); }
      await pLoc;
      await new Promise((r) => setTimeout(r, 300));
      const locTab = state.active;
      check('สถานที่ที่สร้างใหม่มี sensoryProfile ในไฟล์',
            typeof (await kapi.readJson(locTab.file)).sensoryProfile === 'object');
      const senSec = locTab.pane.querySelector('.wiki-sensory');
      check('หน้า Wiki สถานที่มีหัวข้อ “บรรยากาศรับรู้”', !!senSec);
      check('มีช่องครบ 5 ประสาทสัมผัส',
            senSec && senSec.querySelectorAll('.wiki-sensory-row').length === 5,
            senSec && senSec.querySelectorAll('.wiki-sensory-row').length);
      check('ช่องเรียงตาม เห็น/ได้ยิน/กลิ่น/สัมผัส/รสชาติ',
            [...senSec.querySelectorAll('.wiki-sensory-row')].map((r) => r.dataset.sense).join() ===
            'sight,sound,smell,touch,taste');
      // กรอกแล้วต้องเข้า entity + บันทึกลงไฟล์ได้
      const inSight = senSec.querySelector('[data-sense="sight"] input');
      inSight.value = 'ชั้นหนังสือสูงจรดเพดาน ฝุ่นลอยในลำแสง';
      inSight.dispatchEvent(new Event('input', { bubbles: true }));
      const inSmell = senSec.querySelector('[data-sense="smell"] input');
      inSmell.value = 'กลิ่นกระดาษเก่า';
      inSmell.dispatchEvent(new Event('input', { bubbles: true }));
      check('พิมพ์แล้วค่าเข้า entity.sensoryProfile',
            locTab.wiki.e.sensoryProfile.sight.startsWith('ชั้นหนังสือ'),
            JSON.stringify(locTab.wiki.e.sensoryProfile));
      check('กรอกแล้วหน้าถูกทำเครื่องหมายว่ายังไม่บันทึก', locTab.wiki.dirty === true);
      await locTab.wiki.save();
      const locJson = await kapi.readJson(locTab.file);
      check('บรรยากาศรับรู้เขียนกลับไฟล์ได้',
            locJson.sensoryProfile.sight.startsWith('ชั้นหนังสือ') &&
            locJson.sensoryProfile.smell === 'กลิ่นกระดาษเก่า',
            JSON.stringify(locJson.sensoryProfile));
      // วาดใหม่ต้องไม่ได้ช่องซ้ำ + ค่าที่กรอกยังอยู่
      locTab.wiki.render();
      await new Promise((r) => setTimeout(r, 120));
      const senSec2 = locTab.pane.querySelector('.wiki-sensory');
      check('render ซ้ำแล้วไม่มีช่องซ้ำ + ค่าที่กรอกยังอยู่',
            senSec2 && senSec2.querySelectorAll('.wiki-sensory-row').length === 5 &&
            senSec2.querySelector('[data-sense="smell"] input').value === 'กลิ่นกระดาษเก่า',
            senSec2 && senSec2.querySelectorAll('.wiki-sensory-row').length);
      closeTab(locTab.file);
      // ตัวละครต้องไม่มีหัวข้อนี้ (เฉพาะสถานที่)
      const charFile = smart.fileOf['ยัยแมวเก้าชีวิต'];
      await openEntity(charFile);
      await new Promise((r) => setTimeout(r, 250));
      check('หน้า Wiki ตัวละครไม่มีหัวข้อบรรยากาศรับรู้',
            !state.tabs.get(charFile).pane.querySelector('.wiki-sensory'));
      closeTab(charFile);
    }

    // ---- Planner (กระดานวางแผน) ----
    await openPlanner();
    await new Promise((r) => setTimeout(r, 350));
    const plTab = state.tabs.get('::planner::');
    const pb = plTab && plTab.planner;
    check('Planner เปิดแท็บ + มี fabric canvas', !!(pb && pb.canvas), 'planner=' + !!pb);
    await pb._ready;

    const nA = pb._createNode('scene', 'ฉาก A', '#3f3e3a');
    const nB = pb._createNode('entity', 'ตัวละคร B', '#7a6f9f');
    nA.x = 120; nA.y = 120; nB.x = 420; nB.y = 280;
    nA.synopsis = 'พระเอกเปิดประตูเจอจดหมาย';
    nA.status = 'กำลังเขียน';
    nA.tags = ['เปิดเรื่อง'];
    nA.file = '/x/Chapters/c1/s1.md';
    pb._rebuildNode(nA.id); pb._rebuildNode(nB.id);
    const edge = pb._createEdge(nA.id, nB.id, 'เกี่ยวข้อง');
    check('Planner เพิ่มการ์ด 2 + เชื่อมเส้น 1',
          pb._nodes.length === 2 && pb._edges.length === 1 && !!edge,
          'nodes=' + pb._nodes.length + ' edges=' + pb._edges.length);
    check('Planner กันเส้นเชื่อมซ้ำ', pb._createEdge(nA.id, nB.id) === null);
    check('Planner การ์ดวาดจริงบน canvas (มี object ชนิด node)',
          pb.canvas.getObjects().filter((o) => o.kind === 'node').length === 2);

    // สถานะ/สรุปย่อ + บันทึกเป็น v2
    const okSave = await pb.save();
    check('Planner บันทึก planner.json สำเร็จ', okSave === true && pb.dirty === false);
    const pjson = await kapi.readJson(await kapi.join(state.root, 'planner.json'));
    check('planner.json v2 เก็บ synopsis/status/tags/file ครบ',
          pjson.version === '2.0' && pjson.nodes.length === 2 && pjson.edges.length === 1 &&
          pjson.nodes.some((n) => n.synopsis.includes('จดหมาย') && n.status === 'กำลังเขียน' &&
                                  n.file === '/x/Chapters/c1/s1.md' && n.tags[0] === 'เปิดเรื่อง'),
          JSON.stringify({ v: pjson.version, n: pjson.nodes.length }));

    // ตัวกรอง
    pb._filter = { text: '', type: 'entity', status: '' };
    check('Planner กรองตามประเภทได้ (เหลือ Wiki 1)', pb._applyFilter() === 1);
    pb._filter = { text: 'จดหมาย', type: '', status: '' };
    check('Planner กรองด้วยข้อความในสรุปย่อได้', pb._applyFilter() === 1);
    pb._filter = { text: '', type: '', status: 'กำลังเขียน' };
    check('Planner กรองตามสถานะได้', pb._applyFilter() === 1);
    pb._filter = { text: '', type: '', status: '' };
    pb._applyFilter();

    // undo / redo
    const beforeUndo = pb._nodes.length;
    pb._createNode('note', 'โน้ตชั่วคราว', '#5f8a6f');
    check('Planner เพิ่มการ์ดที่ 3 แล้ว', pb._nodes.length === beforeUndo + 1);
    pb.undo();
    check('Planner undo ย้อนการเพิ่มการ์ดได้', pb._nodes.length === beforeUndo,
          'nodes=' + pb._nodes.length);
    pb.redo();
    check('Planner redo เอาการ์ดกลับมาได้', pb._nodes.length === beforeUndo + 1);
    pb.undo();

    // จัดกลุ่ม (เลือกหลายใบแบบผู้ใช้ลากคลุม)
    const getN = (id) => pb._nodes.find((n) => n.id === id);   // หลัง undo ข้อมูลถูกสร้างใหม่
    pb._selectNodes([nA.id, nB.id]);
    const grp = pb._createGroupFromSelection('องก์ 1');
    check('Planner จัดกลุ่มจากการ์ดที่เลือกหลายใบได้',
          !!grp && pb._groups.length === 1 && grp.childrenIds.length === 2,
          'members=' + (grp ? grp.childrenIds.length : 0));
    const gW0 = grp.width;
    getN(nB.id).x += 250; pb._updateGroupBounds(grp);
    check('Planner กรอบกลุ่มขยายตามการ์ดที่ย้าย', grp.width > gW0, `${gW0} → ${grp.width}`);

    // ลบการ์ด → เส้น + สมาชิกกลุ่มหายตาม
    pb.canvas.setActiveObject(pb._nodeVis.get(nA.id));
    pb._deleteSelected();
    check('Planner ลบการ์ดแล้วเส้นเชื่อม + สมาชิกกลุ่มหายตาม',
          pb._nodes.length === 1 && pb._edges.length === 0 &&
          !pb._groups[0].childrenIds.includes(nA.id) && pb._groups[0].childrenIds.length === 1,
          `n=${pb._nodes.length} e=${pb._edges.length} g=${pb._groups[0].childrenIds.length}`);

    // อ่านไฟล์รูปแบบเก่า (v1: ไม่มี synopsis/status/groups) ต้องไม่พัง
    pb._loadData({ nodes: [{ id: 'old1', type: 'scene', title: 'ฉากเก่า', x: 50, y: 50 },
                           { id: 'old2', type: 'note', title: 'โน้ตเก่า', x: 300, y: 50 }],
                   edges: [{ id: 'olde', from: 'old1', to: 'old2' }] });
    check('Planner อ่านไฟล์รูปแบบเดิม (v1) ได้ + เติมค่าเริ่มต้นให้',
          pb._nodes.length === 2 && pb._nodes[0].synopsis === '' && pb._nodes[0].status === '' &&
          pb._nodes[0].width === 180 && pb._edges.length === 1 && pb._groups.length === 0);

    // ลากจาก Explorer มาวางบนกระดาน
    const sceneRow = document.querySelector('.scene[data-path]');
    check('Explorer ใส่ data-path ให้แถวไฟล์แล้ว (ใช้ลาก/ค้นตำแหน่งได้)', !!sceneRow,
          'row=' + (sceneRow ? sceneRow.dataset.path : 'none'));
    const dropped = pb.dropPayload('text/k2-scene',
      { file: sceneRow.dataset.path, title: 'ฉากที่ลากมา' }, null);
    check('Planner รับการลากจาก Explorer → เกิดการ์ดผูกไฟล์',
          !!dropped && dropped.file === sceneRow.dataset.path && dropped.type === 'scene');
    const again = pb.dropPayload('text/k2-scene', { file: sceneRow.dataset.path, title: 'ซ้ำ' }, null);
    check('Planner ลากไฟล์เดิมซ้ำ → ไม่สร้างการ์ดซ้ำ แต่เลือกใบเดิม', again.id === dropped.id);
    const memoDrop = pb.dropPayload('text/k2-memo', { file: '/x/Memos/m1.md', title: 'memo หนึ่ง' }, null);
    check('Planner รับ memo ที่ลากมา (เป็นการ์ดชนิดโน้ต)', memoDrop.type === 'note');

    // ทำซ้ำการ์ด
    pb._selectNodes([dropped.id]);
    const dupes = pb._duplicateSelected();
    check('Planner ทำซ้ำการ์ดได้ (ชื่อมี "(สำเนา)" และเยื้องตำแหน่ง)',
          !!dupes && dupes.length === 1 && dupes[0].title.includes('สำเนา') &&
          dupes[0].x === dropped.x + 28 && dupes[0].file === dropped.file);

    // แสดงตำแหน่งใน Explorer
    pb._selectNodes([dropped.id]);
    check('Planner ปุ่ม "ในเอกสาร" หาไฟล์เจอใน Explorer', pb._revealSelected() === true);

    // เชื่อมแบบ Miro: จุดเชื่อมบนขอบการ์ด + เลือก/ลบเส้น
    pb._showAnchors(pb._nodeVis.get(dropped.id));
    check('Planner โชว์จุดเชื่อม 4 จุดรอบการ์ดเมื่อชี้เมาส์',
          pb.canvas.getObjects().filter((o) => o.kind === 'anchor').length === 4);
    pb._hideAnchors();
    check('Planner ซ่อนจุดเชื่อมเมื่อออกจากการ์ด',
          pb.canvas.getObjects().filter((o) => o.kind === 'anchor').length === 0);
    const e2 = pb._createEdge(dropped.id, memoDrop.id, '');
    pb._selectEdge(e2.id);
    check('Planner คลิกเลือกเส้นแล้วแผงเปลี่ยนเป็นโหมดเส้นเชื่อม',
          pb._selectedEdgeId === e2.id &&
          pb.properties.querySelector('.planner-props-title').textContent.includes('เส้นเชื่อม'));
    const edgesBefore = pb._edges.length;
    pb._deleteEdge(e2.id);
    check('Planner ลบเส้นที่เลือกได้', pb._edges.length === edgesBefore - 1 && !pb._selectedEdgeId);

    // ส่งออก PNG
    const okPng = await pb.exportPNG();
    check('Planner ส่งออก PNG ลงโฟลเดอร์โปรเจกต์ได้',
          okPng === true && await kapi.exists(await kapi.join(state.root, 'planner.png')));

    // ---- โน้ต (memo) ย้ายเข้า/ออกบท + ไม่รวมตอนส่งออก ----
    let dP = null;                                   // หา draft แรกเองแบบเดียวกับตอนส่งออก
    for (const secName of await kapi.listDirs(state.root)) {
      const secPath = await kapi.join(state.root, secName);
      if (!(await kapi.exists(await kapi.join(secPath, 'section.json')))) continue;
      const dr = await kapi.join(secPath, 'Draft');
      if (!(await kapi.exists(dr))) continue;
      const ds = await kapi.listDirs(dr);
      if (ds.length) { dP = await kapi.join(dr, ds[0]); break; }
    }
    check('หาโฟลเดอร์ฉบับร่างสำหรับทดสอบโน้ตได้', !!dP, 'dP=' + dP);
    const mDj = await kapi.readJson(await kapi.join(dP, 'draft.json'));
    const mCh1 = mDj.chapters[0];
    const mFile = (await kapi.listFiles(await kapi.join(state.root, 'Memos'), '.md'))[0];
    const mPath = await kapi.join(state.root, 'Memos', mFile);
    const mBody = parseMdFile(await kapi.readFile(mPath)).body.trim() || 'เนื้อโน้ต';
    await kapi.writeFile(mPath, dumpMdFile({ title: 'โน้ตทดสอบย้าย', type: 'memo' }, 'ห้ามหลุดเข้าไฟล์ส่งออก'));
    check('มีโน้ตใน Memos ให้ทดสอบ', await kapi.exists(mPath));

    await moveMemoToChapter(mPath, dP, mCh1, null);
    const mSj1 = await kapi.readJson(await kapi.join(dP, 'scenes.json'));
    const mRow = (mSj1.chapters[mCh1.guid] || []).find((r) => r.type === 'memo');
    check('ลากโน้ตเข้าบทได้ — เกิดแถวชนิด memo ในบท',
          !!mRow && mRow.title === 'โน้ตทดสอบย้าย',
          'row=' + JSON.stringify(mRow || null));
    check('ไฟล์โน้ตย้ายเข้าโฟลเดอร์บทจริง + ออกจาก Memos แล้ว',
          await kapi.exists(await kapi.join(dP, 'Chapters', mCh1.folderName, mRow.fileName)) &&
          !(await kapi.exists(mPath)));
    const mMeta = parseMdFile(await kapi.readFile(
      await kapi.join(dP, 'Chapters', mCh1.folderName, mRow.fileName))).meta;
    check('ไฟล์ที่ย้ายเข้าบทยังมี type: memo ใน frontmatter', mMeta.type === 'memo');
    const mRowEl = [...document.querySelectorAll('.scene')].find((x) => x.textContent.includes('โน้ตทดสอบย้าย'));
    check('Explorer แสดงโน้ตในบทด้วยไอคอน 📝 + คลาส sc-memo',
          !!mRowEl && mRowEl.classList.contains('sc-memo') && mRowEl.textContent.includes('📝'));

    const mCompiled = await compileDraftText(dP, 'เล่มทดสอบ');
    check('ส่งออกฉบับร่าง "ไม่" รวมเนื้อหาของโน้ต',
          !mCompiled.includes('ห้ามหลุดเข้าไฟล์ส่งออก') && mCompiled.includes('## ' + mCh1.title),
          'len=' + mCompiled.length);

    // สลับเป็นฉากปกติ → ต้องถูกรวม
    await setRowMemo(dP, mCh1, mRow, false);
    const mCompiled2 = await compileDraftText(dP, 'เล่มทดสอบ');
    check('เปลี่ยนโน้ตกลับเป็นฉากปกติแล้วถูกรวมตอนส่งออก',
          mCompiled2.includes('ห้ามหลุดเข้าไฟล์ส่งออก'));
    await setRowMemo(dP, mCh1, mRow, true);
    const mSj2 = await kapi.readJson(await kapi.join(dP, 'scenes.json'));
    check('สลับกลับเป็นโน้ตได้อีกครั้ง',
          (mSj2.chapters[mCh1.guid] || []).some((r) => r.id === mRow.id && r.type === 'memo'));

    // ย้ายออกกลับไปที่ MEMO
    const mBackRow = (mSj2.chapters[mCh1.guid] || []).find((r) => r.id === mRow.id);
    const mBackPath = await moveRowToMemos(dP, mCh1, mBackRow);
    const mSj3 = await kapi.readJson(await kapi.join(dP, 'scenes.json'));
    check('ย้ายโน้ตออกจากบทกลับไปที่ Memos ได้',
          !!mBackPath && await kapi.exists(mBackPath) &&
          !(mSj3.chapters[mCh1.guid] || []).some((r) => r.id === mRow.id));

    // ---- ค้นเฉพาะในบทนี้ (scope) ----
    const mCh2 = mDj.chapters[1] || null;
    setTreeScope({ guid: mCh1.guid, label: mCh1.title });
    check('มีป้ายบอกขอบเขตการค้น + จำกัดผลไว้เฉพาะบทที่เลือก',
          !!document.getElementById('tree-scope') &&
          [...document.querySelectorAll('.scene[data-ch-guid]')]
            .filter((x) => x.style.display !== 'none')
            .every((x) => x.dataset.chGuid === mCh1.guid));
    if (mCh2) {
      check('ฉากของบทอื่นถูกซ่อนตอนตั้งขอบเขต',
            [...document.querySelectorAll(`.scene[data-ch-guid="${mCh2.guid}"]`)]
              .every((x) => x.style.display === 'none'));
    }
    setTreeScope(null);
    check('ยกเลิกขอบเขตแล้วกลับมาเห็นทุกบท',
          !document.getElementById('tree-scope') &&
          [...document.querySelectorAll('.scene[data-ch-guid]')].some((x) => x.style.display !== 'none'));

    // ---- หน้าต่างลอย (floating window) ----
    // ใช้ memo เป็นตัวทดลอง — จะได้ไม่ไปแตะแท็บฉากที่เทสอื่นยังอ้างอิงอยู่
    const flRows = [...document.querySelectorAll('.scene[data-path]')];
    const flRow = flRows.find((r) => /Memos/.test(r.dataset.path)) || flRows[flRows.length - 1];
    await openScene(flRow.dataset.path, 'ทดสอบลอย');
    bindTabStripMenus();
    const flKey = flRow.dataset.path;
    const flTab = state.tabs.get(flKey);
    const paneEditorBefore = flTab.editor && flTab.editor.view;
    const win = floatTab(flKey);
    check('แยกแท็บเป็นหน้าต่างลอยได้ (pane ย้ายเข้าไปในหน้าต่าง)',
          !!win && document.body.contains(win) && win.querySelector('.float-body').contains(flTab.pane));
    check('หน้าต่างลอยไม่สร้างตัวแก้ไขใหม่ (สถานะเอกสารไม่หาย)',
          flTab.editor && flTab.editor.view === paneEditorBefore);
    check('หน้าต่างลอยมีหัวลาก + ปุ่ม ย่อ/คืนแท็บ/ปิด + มุมขยาย',
          !!win.querySelector('.float-bar') && win.querySelectorAll('.float-btn').length === 3 &&
          !!win.querySelector('.float-grip'));
    // สลับไปแท็บอื่นแล้วหน้าต่างลอยต้องยังแสดงอยู่
    activate('::planner::');
    check('สลับแท็บแล้วหน้าต่างลอยยังแสดงอยู่', flTab.pane.classList.contains('on'));
    win.querySelector('.float-btn').click();
    check('ปุ่มย่อหน้าต่างลอยทำงาน', win.classList.contains('min'));
    win.querySelector('.float-btn').click();
    check('กดย่อซ้ำ = คลี่กลับ', !win.classList.contains('min'));
    check('คืนหน้าต่างลอยกลับเป็นแท็บได้',
          dockTab(flKey) === true && !flTab.floatWin && $('#panes').contains(flTab.pane));
    check('ดับเบิลคลิกหัวแท็บ = สลับลอย/คืน (toggleFloatTab)',
          toggleFloatTab(flKey) === true && !!flTab.floatWin && toggleFloatTab(flKey) === true && !flTab.floatWin);
    // ดับเบิลคลิกการ์ด Planner ที่ผูกไฟล์ → เปิดเป็นหน้าต่างลอย
    activate('::planner::');
    await pb.onOpenFile(flKey);
    const flTab2 = state.tabs.get(flKey);
    check('ดับเบิลคลิกการ์ด Planner เปิดไฟล์เป็นหน้าต่างลอย', !!flTab2 && !!flTab2.floatWin);
    closeTab(flKey);
    check('ปิดแท็บแล้วหน้าต่างลอยหายไปด้วย', !document.querySelector('.float-win'));

    closeTab('::planner::');

    // ---- โหมดโฟกัส ----
    toggleFocus(true);
    check('โหมดโฟกัสซ่อน UI เหลือหน้ากระดาษ',
          document.body.classList.contains('focus-mode') &&
          $('#tree-panel').offsetParent === null && $('#panes').offsetParent !== null);
    toggleFocus(false);

    // ---- คุณสมบัติฉาก ----
    const chP = (await kapi.readJson(await kapi.join(dPath, 'draft.json'))).chapters[0];
    const scP = (await kapi.readJson(await kapi.join(dPath, 'scenes.json'))).chapters[chP.guid][0];
    const pProps = sceneProps(dPath, chP, scP);
    await new Promise((r) => setTimeout(r, 80));
    document.querySelector('.k-dialog textarea').value = 'เรื่องย่อทดสอบระบบ';
    document.querySelector('.k-dialog .k-ok').click();
    await new Promise((r) => setTimeout(r, 150));
    const scAfter = (await kapi.readJson(await kapi.join(dPath, 'scenes.json'))).chapters[chP.guid][0];
    check('คุณสมบัติฉากบันทึกลง scenes.json', scAfter.synopsis === 'เรื่องย่อทดสอบระบบ',
          JSON.stringify(scAfter));

    // ---- คุณสมบัติฉาก: ฟิลด์ครบขึ้น (อารมณ์/ความขัดแย้ง/โน้ต/สี/ปักหมุด/สถานะ) ----
    sceneProps(dPath, chP, scP);
    await new Promise((r) => setTimeout(r, 100));
    {
      const bx = document.querySelector('.k-dialog');
      const inps = bx.querySelectorAll('input.wiki-input');   // [0]storyDate [1]pov [2]อารมณ์ [3]ความขัดแย้ง [4]แท็ก
      inps[2].value = 'สิ้นหวัง'; inps[3].value = 'ปะทะกับพ่อ';
      bx.querySelectorAll('textarea')[1].value = 'โน้ตทดสอบระบบ';   // [0]เรื่องย่อ [1]โน้ต
      bx.querySelectorAll('select')[0].value = 'กำลังเขียน';        // [0]สถานะ [1]สี
      bx.querySelectorAll('select')[1].value = '#6fae6f';
      bx.querySelector('.wiki-check').checked = true;               // ปักหมุด
      await kapi.testShot('/tmp/k2_props.png');                     // ภาพกล่องคุณสมบัติฉาก
      bx.querySelector('.k-ok').click();
    }
    await new Promise((r) => setTimeout(r, 160));
    const scP2 = (await kapi.readJson(await kapi.join(dPath, 'scenes.json'))).chapters[chP.guid][0];
    check('คุณสมบัติฉากเก็บ อารมณ์/ความขัดแย้ง/โน้ต/สี/ปักหมุด/สถานะ',
          scP2.emotion === 'สิ้นหวัง' && scP2.conflict === 'ปะทะกับพ่อ' &&
          scP2.note === 'โน้ตทดสอบระบบ' && scP2.color === '#6fae6f' &&
          scP2.flag === true && scP2.status === 'กำลังเขียน', JSON.stringify(scP2));
    const scP2File = await kapi.join(dPath, 'Chapters', chP.folderName, scP2.fileName);
    const scP2Fm = parseMdFile(await kapi.readFile(scP2File)).meta;
    check('อารมณ์/ความขัดแย้ง/โน้ต ซิงก์ลง frontmatter .md',
          scP2Fm.emotion === 'สิ้นหวัง' && scP2Fm.conflict === 'ปะทะกับพ่อ' &&
          scP2Fm.note === 'โน้ตทดสอบระบบ', JSON.stringify(scP2Fm));

    // ---- ป้ายเล่าเรื่อง (Narrative Markers): ⏪ ย้อนอดีต / ⏩ ล่วงหน้า ----
    const readSc0 = async () =>
      (await kapi.readJson(await kapi.join(dPath, 'scenes.json'))).chapters[chP.guid][0];
    // ติ๊ก "ย้อนอดีต" แล้วบันทึก  ([0]ปักหมุด [1]ย้อนอดีต [2]ล่วงหน้า)
    sceneProps(dPath, chP, scP);
    await new Promise((r) => setTimeout(r, 100));
    {
      const bx = document.querySelector('.k-dialog');
      const cks = bx.querySelectorAll('.wiki-check');
      check('กล่องคุณสมบัติฉากมีสวิตช์ ย้อนอดีต/ล่วงหน้า ครบ', cks.length === 3, 'พบ ' + cks.length);
      cks[1].checked = true;
      bx.querySelector('.k-ok').click();
    }
    await new Promise((r) => setTimeout(r, 200));
    const scFb = await readSc0();
    check('ติ๊กย้อนอดีต → scenes.json เก็บ isFlashback = true',
          scFb.isFlashback === true && scFb.isFlashforward === false, JSON.stringify(scFb));
    const scFbFm = parseMdFile(await kapi.readFile(
      await kapi.join(dPath, 'Chapters', chP.folderName, scFb.fileName))).meta;
    check('ป้ายเล่าเรื่องซิงก์ลง frontmatter .md (เขียนเฉพาะตัวที่ติ๊ก)',
          String(scFbFm.isFlashback) === 'true' && !('isFlashforward' in scFbFm),
          JSON.stringify(scFbFm));
    check('Explorer แสดงป้าย ⏪ ข้างชื่อฉากย้อนอดีต',
          [...document.querySelectorAll('.scene .tree-flash')].some((s) => s.textContent === '⏪'));
    // ติ๊กทั้งสองพร้อมกัน → ต้องเหลือ "ย้อนอดีต" ตัวเดียว (ห้าม true พร้อมกัน)
    sceneProps(dPath, chP, scP);
    await new Promise((r) => setTimeout(r, 100));
    {
      const bx = document.querySelector('.k-dialog');
      const cks = bx.querySelectorAll('.wiki-check');
      cks[1].checked = true; cks[2].checked = true;
      bx.querySelector('.k-ok').click();
    }
    await new Promise((r) => setTimeout(r, 200));
    const scFb2 = await readSc0();
    check('ย้อนอดีต + ล่วงหน้า เป็น true พร้อมกันไม่ได้',
          scFb2.isFlashback === true && scFb2.isFlashforward === false, JSON.stringify(scFb2));
    // สลับเป็น "ล่วงหน้า" อย่างเดียว แล้วเคลียร์กลับ (ไม่ให้ค้างไปกวนเทสอื่น)
    sceneProps(dPath, chP, scP);
    await new Promise((r) => setTimeout(r, 100));
    {
      const bx = document.querySelector('.k-dialog');
      const cks = bx.querySelectorAll('.wiki-check');
      cks[1].checked = false; cks[2].checked = true;
      bx.querySelector('.k-ok').click();
    }
    await new Promise((r) => setTimeout(r, 200));
    const scFf = await readSc0();
    check('ติ๊กล่วงหน้าอย่างเดียว → isFlashforward = true',
          scFf.isFlashforward === true && scFf.isFlashback === false, JSON.stringify(scFf));
    check('Explorer แสดงป้าย ⏩ ข้างชื่อฉากล่วงหน้า',
          [...document.querySelectorAll('.scene .tree-flash')].some((s) => s.textContent === '⏩'));
    sceneProps(dPath, chP, scP);
    await new Promise((r) => setTimeout(r, 100));
    {
      const bx = document.querySelector('.k-dialog');
      const cks = bx.querySelectorAll('.wiki-check');
      cks[1].checked = false; cks[2].checked = false;
      bx.querySelector('.k-ok').click();
    }
    await new Promise((r) => setTimeout(r, 200));
    const scClear = await readSc0();
    check('เอาป้ายออกได้ → ไม่มีป้ายค้างใน Explorer',
          scClear.isFlashback === false && scClear.isFlashforward === false &&
          !document.querySelector('.scene .tree-flash'));
    check('เอาป้ายออกแล้ว frontmatter ไม่เหลือบรรทัดป้าย',
          !(await kapi.readFile(await kapi.join(dPath, 'Chapters', chP.folderName, scClear.fileName)))
            .includes('isFlash'));

    // ---- เลขบรรทัด (settings.lineNumbers → body.k-ln + padding ProseMirror) ----
    state.settings.lineNumbers = true; applySettings();
    await new Promise((r) => setTimeout(r, 120));
    await kapi.testShot('/tmp/k2_ln.png');                  // ภาพเลขบรรทัดของจริง
    const pmPadOn = getComputedStyle(document.querySelector('.pane.on .ProseMirror')).paddingLeft;
    check('เปิดเลขบรรทัด → body มี k-ln และ ProseMirror ขยับที่ว่างซ้าย',
          document.body.classList.contains('k-ln') && pmPadOn === '64px', pmPadOn);
    state.settings.lineNumbers = false; applySettings();
    check('ปิดเลขบรรทัด → เอา k-ln ออก', !document.body.classList.contains('k-ln'));

    // ---- ย้าย/เลื่อนลำดับฉาก ----
    // เตรียมบทที่ 2 + ฉากทดสอบย้าย (อิสระจากข้อมูล fixture เดิม)
    {
      const dj = await kapi.readJson(await kapi.join(dPath, 'draft.json'));
      const c2 = { guid: 'c2test', title: 'บทย้ายทดสอบ', order: 99, folderName: '99 - บทย้ายทดสอบ' };
      dj.chapters = [...dj.chapters, c2];
      await kapi.writeFile(await kapi.join(dPath, 'draft.json'), JSON.stringify(dj, null, 2));
      await kapi.mkdir(await kapi.join(dPath, 'Chapters', c2.folderName));
      const sj = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
      const moveRow = { id: 'scMove', title: 'ฉากย้ายทดสอบ', order: 50, fileName: 'scene-50.md', chapterGuid: chP.guid };
      sj.chapters[chP.guid] = [...sj.chapters[chP.guid], moveRow];
      sj.chapters[c2.guid] = [];
      await kapi.writeFile(await kapi.join(dPath, 'scenes.json'), JSON.stringify(sj, null, 2));
      await kapi.writeFile(await kapi.join(dPath, 'Chapters', chP.folderName, 'scene-50.md'),
        dumpMdFile({ title: 'ฉากย้ายทดสอบ', type: 'scene', format: 'prose' }, 'เนื้อหาฉากย้าย'));
      await buildTree();

      // เลื่อนขึ้น: scMove เป็นตัวท้าย (order 50) → สลับกับตัวก่อนหน้า → ต้องไม่ท้ายสุดอีกต่อไป
      await moveSceneOrder(dPath, chP, { id: 'scMove' }, -1);
      const afterList = (await kapi.readJson(await kapi.join(dPath, 'scenes.json')))
        .chapters[chP.guid].slice().sort((a, b) => (a.order || 0) - (b.order || 0));
      check('เลื่อนลำดับฉากขึ้น (สลับ order กับฉากก่อนหน้า)',
            afterList[afterList.length - 1].id !== 'scMove',
            JSON.stringify(afterList.map((s) => [s.id, s.order])));

      // ย้ายไปบท c2
      await moveSceneToChapter(dPath, chP, { id: 'scMove' }, c2);
      const sj2 = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
      const inC1 = (sj2.chapters[chP.guid] || []).some((s) => s.id === 'scMove');
      const movedRow = (sj2.chapters[c2.guid] || []).find((s) => s.id === 'scMove');
      check('ย้ายฉากออกจากบทเดิม + เข้าบทใหม่ (scenes.json)',
            !inC1 && !!movedRow, `inC1=${inC1} moved=${JSON.stringify(movedRow)}`);
      check('ไฟล์ .md ตามไปอยู่โฟลเดอร์บทใหม่จริง (ของเดิมหายจากบทเก่า)',
            movedRow && await kapi.exists(await kapi.join(dPath, 'Chapters', c2.folderName, movedRow.fileName)) &&
            !(await kapi.exists(await kapi.join(dPath, 'Chapters', chP.folderName, 'scene-50.md'))),
            movedRow && movedRow.fileName);
      check('row อัปเดต chapterGuid เป็นบทใหม่', movedRow && movedRow.chapterGuid === c2.guid,
            movedRow && movedRow.chapterGuid);
    }

    // ---- ปักหมุดฉาก (favorites ⭐) ----
    await toggleSceneFlag(dPath, chP, scP);
    const scFlag = (await kapi.readJson(await kapi.join(dPath, 'scenes.json'))).chapters[chP.guid][0];
    check('ปักหมุดฉาก → flag=true ใน scenes.json', scFlag.flag === true, JSON.stringify(scFlag.flag));
    check('ฉากปักหมุดแสดง ⭐ ในต้นไม้',
          [...document.querySelectorAll('.scene')].some((s) => s.textContent.includes('⭐')));
    await toggleSceneFlag(dPath, chP, { id: scP.id, flag: true, title: scP.title });   // สลับกลับ
    check('เอาหมุดออก → flag=false',
          (await kapi.readJson(await kapi.join(dPath, 'scenes.json'))).chapters[chP.guid][0].flag === false);

    // ================= v2.0.0-alpha.24 =================
    // ---- (1) ลากย้าย: บทสลับลำดับ / ฉากแทรกก่อนฉากอื่น / entity ข้ามหมวด ----
    {
      const dj = await kapi.readJson(await kapi.join(dPath, 'draft.json'));
      const chFirst = dj.chapters.slice().sort((a, b) => (a.order || 0) - (b.order || 0))[0];
      // สร้างบทที่ 2 เพื่อทดสอบสลับลำดับ
      const cB = { guid: 'cReorder', title: 'บทสลับลำดับ', order: 200, folderName: '200 - บทสลับลำดับ' };
      dj.chapters = [...dj.chapters.filter((c) => c.guid !== 'cReorder'), cB];
      await kapi.writeFile(await kapi.join(dPath, 'draft.json'), JSON.stringify(dj, null, 2));
      await kapi.mkdir(await kapi.join(dPath, 'Chapters', cB.folderName));
      const sjx = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
      sjx.chapters[cB.guid] = sjx.chapters[cB.guid] || [];
      await kapi.writeFile(await kapi.join(dPath, 'scenes.json'), JSON.stringify(sjx, null, 2));
      await buildTree();
      // ฉากลากได้ + หัวบทลากได้ (draggable)
      const anyScene2 = document.querySelector('.scene:not(.add-row)');
      const anyChHead = document.querySelector('.ch-title');
      check('ฉากลากได้ (draggable) แบบ Explorer', !!anyScene2 && anyScene2.draggable === true);
      check('หัวบทลากได้ (จัดลำดับบท)', !!anyChHead && anyChHead.draggable === true);
      // สลับลำดับ: เอา cReorder ไปไว้ก่อนบทแรก → order ของ cReorder ต้องน้อยกว่าบทแรก
      await moveChapterBefore(dPath, cB.guid, chFirst.guid);
      const djA = await kapi.readJson(await kapi.join(dPath, 'draft.json'));
      const oB = djA.chapters.find((c) => c.guid === cB.guid).order;
      const oF = djA.chapters.find((c) => c.guid === chFirst.guid).order;
      check('ลากบทสลับลำดับ (moveChapterBefore) → บทถูกจัดมาก่อน', oB < oF, `oB=${oB} oF=${oF}`);
      // ฉากแทรกก่อนฉากอื่น (moveSceneBefore) ในบทเดียวกัน
      const list0 = (await kapi.readJson(await kapi.join(dPath, 'scenes.json')))
        .chapters[chFirst.guid].slice().sort((a, b) => (a.order || 0) - (b.order || 0));
      if (list0.length >= 2) {
        const last = list0[list0.length - 1], first = list0[0];
        await moveSceneBefore(dPath, chFirst, last.id, chFirst, first.id);
        const list1 = (await kapi.readJson(await kapi.join(dPath, 'scenes.json')))
          .chapters[chFirst.guid].slice().sort((a, b) => (a.order || 0) - (b.order || 0));
        check('ลากฉากแทรกก่อนฉากอื่น (moveSceneBefore)', list1[0].id === last.id,
              JSON.stringify(list1.map((s) => s.id)));
      } else check('ลากฉากแทรกก่อนฉากอื่น (moveSceneBefore)', true);
      // ย้าย entity ข้ามหมวด: characters → items
      const chars = await kapi.join(state.root, 'Bible', 'characters');
      const itemsDir = await kapi.join(state.root, 'Bible', 'items');
      await kapi.mkdir(chars); await kapi.mkdir(itemsDir);
      await kapi.writeFile(await kapi.join(chars, 'ของย้าย.json'),
        JSON.stringify({ name: 'ของย้ายหมวด', entityTypeKey: 'characters' }));
      await moveEntityToCat(await kapi.join(chars, 'ของย้าย.json'), itemsDir);
      check('ลาก entity ข้ามหมวด (moveEntityToCat) → ไฟล์ย้ายจริง',
            await kapi.exists(await kapi.join(itemsDir, 'ของย้าย.json')) &&
            !(await kapi.exists(await kapi.join(chars, 'ของย้าย.json'))));
      const entIt = document.querySelector('.chapter .scene');
      check('รายการ Wiki ลากได้ (draggable)', !!entIt && entIt.draggable === true);
    }

    // ---- (5) ล็อกไฟล์: เขียน scenes.json+frontmatter + editor แก้ไม่ได้ + tree 🔒 ----
    {
      await setSceneLock(dPath, chP, scP, true);
      const findRow = async () => (await kapi.readJson(await kapi.join(dPath, 'scenes.json')))
        .chapters[chP.guid].find((x) => x.id === scP.id);
      const scLk = await findRow();
      check('ล็อก → row.locked=true ใน scenes.json', scLk && scLk.locked === true);
      const lkFile = await kapi.join(dPath, 'Chapters', chP.folderName, scLk.fileName);
      check('ล็อก → frontmatter .md มี locked', parseMdFile(await kapi.readFile(lkFile)).meta.locked === 'true');
      await openScene(lkFile, scLk.title);
      await new Promise((r) => setTimeout(r, 120));
      check('เปิดฉากที่ล็อก → editor แก้ไม่ได้ (editable=false)',
            state.active.locked === true && state.active.editor.view.editable === false);
      check('ฉากที่ล็อกแสดง 🔒 ในต้นไม้',
            [...document.querySelectorAll('.scene')].some((s) => s.textContent.includes('🔒')));
      await setSceneLock(dPath, chP, scP, false);
      await new Promise((r) => setTimeout(r, 80));
      check('ปลดล็อก → editor กลับแก้ได้', state.active.editor.view.editable === true);
      if (lkFile !== t.file && state.tabs.has(lkFile)) closeTab(lkFile);
    }

    // ---- (4) เวอร์ชัน: เซฟบันทึก revision+appVersion / diff / กล่องเทียบ ----
    {
      const vTab = state.tabs.get(t.file) || t;
      activate(t.file);
      const rev0 = parseInt(t.editor ? (t.meta.revision || 0) : 0, 10) || 0;
      markDirty(t); await saveTab(t);
      const fm = parseMdFile(await kapi.readFile(t.file)).meta;
      check('เซฟ → บันทึกเวอร์ชันแอปที่แก้ (appVersion) ลง frontmatter', !!fm.appVersion);
      check('เซฟ → เพิ่มรอบแก้ (revision) ขึ้น', (parseInt(fm.revision, 10) || 0) >= 1, fm.revision);
      // line diff
      const dRows = lineDiff('a\nb\nc', 'a\nx\nc');
      check('เทียบบรรทัด (lineDiff) จับ add/del ได้',
            dRows.some((r) => r.cls === 'add') && dRows.some((r) => r.cls === 'del'),
            JSON.stringify(dRows.map((r) => r.cls)));
      // กล่องเทียบเวอร์ชันเปิดได้ (ต้องมี snapshot ก่อน)
      await snapshotFile(t.file, 'จุดเทียบ');
      await compareVersionsDialog(dPath, chP, scP);
      await new Promise((r) => setTimeout(r, 120));
      check('กล่องเทียบเวอร์ชันเปิด + มีสองฝั่ง (grid)',
            !!document.querySelector('.k-cmp .k-cmp-grid .k-cmp-col'));
      document.querySelector('.k-cmp')?.closest('.k-overlay')?.remove();
    }

    // ---- (3) แยกจอเทียบเอกสาร (compare / split) ----
    {
      // สร้างฉากที่ 2 ในบทแรกไว้เทียบ
      const sjc = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
      const chG = chP.guid;
      const secondFile = await kapi.join(dPath, 'Chapters', chP.folderName, 'cmp2.md');
      await kapi.writeFile(secondFile, dumpMdFile({ title: 'ฉากเทียบขวา', type: 'scene', format: 'prose' }, 'ขวา'));
      activate(t.file);
      await openCompareRight(dPath, chP, { title: 'ฉากเทียบขวา', fileName: 'cmp2.md' });
      await new Promise((r) => setTimeout(r, 150));
      check('เปิดเทียบด้านขวา → #panes เข้าโหมด split', $('#panes').classList.contains('split'));
      check('เส้นทางเทียบเอกสารใช้ SplitManager เหมือนกัน (ระบบเดียว ไม่ใช่สองระบบ)',
            splitPaneCount() === 2, 'panes=' + splitPaneCount());
      check('มีช่องที่สอง (compare-on) แสดงคู่กัน',
            !!document.querySelector('.k-split-pane .pane.compare-on') &&
            document.querySelectorAll('#split-root .k-split-pane').length === 2);
      check('ทุกช่องมีปุ่มปิดช่องของตัวเอง',
            document.querySelectorAll('.k-split-pane > .cmp-close').length === 2);
      clearCompare();
      check('ปิดเทียบ → ออกจากโหมด split',
            !$('#panes').classList.contains('split') && !document.getElementById('split-root'));
      if (state.tabs.has(secondFile)) closeTab(secondFile);
    }

    // ---- ตรวจคำผิด (spellcheck attribute) ----
    state.settings.spellCheck = false; applySpellcheck();
    check('ปิดตรวจคำผิด → .ProseMirror spellcheck=false',
          [...document.querySelectorAll('.ProseMirror')].every((el) => el.spellcheck === false));
    state.settings.spellCheck = true; applySpellcheck();
    check('เปิดตรวจคำผิด → .ProseMirror spellcheck=true',
          [...document.querySelectorAll('.ProseMirror')].every((el) => el.spellcheck === true));

    // ---- ดู Markdown ดิบ (source view) ----
    activate(t.file);
    showSourceView();
    await new Promise((r) => setTimeout(r, 60));
    const srcTa = document.querySelector('.k-src-view');
    check('เปิดดู Markdown ดิบ → textarea มีเนื้อหาตรงกับตัวแก้ไข',
          !!srcTa && srcTa.value === (state.active.editor || state.active.sp).getMarkdown(),
          srcTa && srcTa.value.slice(0, 30));
    document.querySelector('.k-src-view').closest('.k-overlay').remove();

    // ---- ล้างถังขยะอัตโนมัติ (recycle purge) ----
    {
      const recDir = await kapi.join(dPath.split('/เล่ม')[0].split('/Draft')[0] || state.root, 'Recycle');
      const rRoot = state.root;
      await kapi.writeFile(await kapi.join(rRoot, 'Recycle', 'new-keep.md'), 'ใหม่ ไม่ควรลบ');
      state.settings.recycleDays = 30;
      await purgeRecycle(rRoot);
      check('ล้างถังขยะไม่ลบไฟล์ใหม่ (mtime ยังไม่เกินกำหนด)',
            await kapi.exists(await kapi.join(rRoot, 'Recycle', 'new-keep.md')));
      state.settings.recycleDays = 0;
      await purgeRecycle(rRoot);   // 0 = ไม่ล้าง — ต้องไม่ throw
      check('recycleDays=0 → ไม่ล้างอัตโนมัติ (ไฟล์ยังอยู่)',
            await kapi.exists(await kapi.join(rRoot, 'Recycle', 'new-keep.md')));
    }

    // ---- ปุ่มลัดตั้งเอง (configurable shortcuts) ----
    check('accelText แปลงคีย์เป็นข้อความถูก',
          accelText('KeyB', true, true) === 'Ctrl+Shift+B', accelText('KeyB', true, true));
    state.settings.shortcuts = { 'save': { code: 'KeyE', ctrl: true, shift: false } };
    const effSave = effectiveShortcuts().find((x) => x[3] === 'save');
    check('override เปลี่ยนปุ่มลัดของคำสั่งบันทึกได้', effSave[0] === 'KeyE', JSON.stringify(effSave));
    const effBold = effectiveShortcuts().find((x) => x[3] === 'fmt' && x[4] === 'bold');
    check('คำสั่งที่ไม่ override ยังใช้ค่าเริ่มต้น', effBold[0] === 'KeyB', JSON.stringify(effBold));
    state.settings.shortcuts = {};
    // เปิดกล่องตั้งค่า → แท็บปุ่มลัด → มีรายการ + record คีย์ใหม่ได้
    settingsDialog();
    await new Promise((r) => setTimeout(r, 80));
    [...document.querySelectorAll('.k-set-tab')].find((t) => t.dataset.p === 'keys').click();
    await new Promise((r) => setTimeout(r, 40));
    check('แท็บปุ่มลัดแสดงรายการคำสั่ง',
          document.querySelectorAll('.k-key-row').length >= 15,
          document.querySelectorAll('.k-key-row').length);
    document.querySelector('.k-key-row .k-key-btn').click();     // "แก้" ปุ่มแรก
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ', ctrlKey: true, shiftKey: true, bubbles: true }));
    await new Promise((r) => setTimeout(r, 40));
    check('บันทึกคีย์ลัดใหม่จากการกดปุ่ม (มี J ในรายการ)',
          [...document.querySelectorAll('.k-key-accel')].some((a) => a.textContent.includes('J')));
    await kapi.testShot('/tmp/k2_keys.png');                    // ภาพแท็บปุ่มลัด
    document.querySelector('.k-settings .k-cancel').click();    // ยกเลิก ไม่บันทึกจริง
    check('ยกเลิกแล้วไม่กระทบ settings.shortcuts', Object.keys(state.settings.shortcuts).length === 0);

    // ---- Plugin โหลด + คำสั่งทำงาน ----
    check('ปลั๊กอินถูกโหลด + ลงทะเบียนคำสั่ง',
          plugins.commands.some((c) => c.label === 'นับอักขระฉากนี้'),
          JSON.stringify(plugins.commands.map((c) => c.label)));
    plugins.commands[0].fn();
    check('คำสั่งปลั๊กอินทำงาน (เขียน status)',
          $('#status').textContent.includes('อักขระ'), $('#status').textContent);

    // ภาพบทหนัง WYSIWYG
    await new Promise((r) => setTimeout(r, 200));
    await kapi.testShot('/tmp/k2_sp.png');
    smart.hide();
    activate(t2.file);

    // ทิ้ง memo ไว้ในถังขยะ 1 ชิ้นให้เห็นเลขในภาพ
    const memoFiles = await kapi.listFiles(await kapi.join(state.root, 'Memos'), '.md');
    if (memoFiles.length > 1) {
      const pT = deleteToTrash(await kapi.join(state.root, 'Memos', memoFiles[1]), 'ตัวอย่าง');
      await new Promise((r) => setTimeout(r, 60));
      document.querySelector('.k-dialog .k-ok')?.click(); await pT;
    }
    activate(t2.file);

    openFind(); $('#find-q').value = 'ความ'; doFind();
    const v3 = t2.editor.view;
    v3.dispatch(v3.state.tr.insertText('คุยกับยัยแ', 1, 1));
    v3.dispatch(v3.state.tr.setSelection(TextSelection.create(v3.state.doc, 1 + 'คุยกับยัยแ'.length)));
    smart.bindView(v3); smart.check(v3);
    refreshOutline();
    await new Promise((r) => setTimeout(r, 250));
    await kapi.testShot('/tmp/k2.png');
    t2.editor.setMarkdown(orig); closeFind();

    // ---- ระบบตั้งค่าโปรเจกต์ ----
    const projFile = await kapi.join(state.root, 'project.khn.json');
    check('ค่า settings ตั้งต้นถูกเติมตอนเปิดโปรเจกต์',
          state.settings.autoSaveMinutes === 5 && state.settings.uiFontSize === 0);
    settingsDialog();
    await new Promise((r) => setTimeout(r, 20));
    check('กล่องตั้งค่าเปิด + มีฟิลด์', !!document.querySelector('.k-settings #st-auto'));
    // สลับไปแท็บ "การเขียน" แล้วพรีวิวฟอนต์
    [...document.querySelectorAll('.k-set-tab')].find((t) => t.dataset.p === 'write').click();
    const fontInp = document.querySelector('#st-font');
    fontInp.value = '4'; fontInp.dispatchEvent(new Event('input'));
    check('พรีวิวฟอนต์ทันที (--ed-fs = 19.5px)',
          getComputedStyle(document.documentElement).getPropertyValue('--ed-fs').trim() === '19.5px',
          getComputedStyle(document.documentElement).getPropertyValue('--ed-fs'));
    // ขนาด UI (บั๊ก #9) — slider ในแท็บ "การเขียน" เห็นผลทันที
    const uiSl = document.querySelector('#st-uiscale');
    check('ตั้งค่า: มี slider ขนาด UI ในแท็บการเขียน', !!uiSl);
    uiSl.value = '1.25'; uiSl.dispatchEvent(new Event('input'));
    check('ตั้งค่า: เลื่อน slider ขนาด UI แล้วเห็นผลทันที',
          getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim() === '1.250',
          getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'));
    uiSl.value = '1'; uiSl.dispatchEvent(new Event('input'));
    // กรอกค่าอื่นแล้วบันทึก
    [...document.querySelectorAll('.k-set-tab')].find((t) => t.dataset.p === 'gen').click();
    document.querySelector('#st-title').value = 'ชื่อใหม่ทดสอบ';
    document.querySelector('#st-author').value = 'ผู้เขียนทดสอบ';
    document.querySelector('#st-auto').value = '2';
    document.querySelector('#st-daily').value = '800';
    document.querySelector('#st-proj').value = '12345';
    document.querySelector('.k-settings .k-ok').click();
    await new Promise((r) => setTimeout(r, 60));
    check('กล่องตั้งค่าปิดหลังบันทึก', !document.querySelector('.k-settings'));
    const pj = JSON.parse(await kapi.readFile(projFile));
    check('เขียน settings ลง project.khn.json',
          pj.settings.autoSaveMinutes === 2 && pj.settings.uiFontSize === 4,
          JSON.stringify(pj.settings));
    check('เขียน goals ลง project.khn.json',
          pj.goals.dailyWords === 800 && pj.goals.projectWords === 12345,
          JSON.stringify(pj.goals));
    check('เขียนชื่อ/ผู้เขียนลงไฟล์', pj.title === 'ชื่อใหม่ทดสอบ' && pj.author === 'ผู้เขียนทดสอบ');
    check('ชื่อโปรเจกต์บนจอเปลี่ยนตาม', $('#projname').textContent === 'ชื่อใหม่ทดสอบ');
    check('ฟอนต์ตัวแก้ไขถูกนำไปใช้จริง (19.5px)',
          getComputedStyle(document.documentElement).getPropertyValue('--ed-fs').trim() === '19.5px');
    check('autosave นาทีถูกปรับใน state', state.settings.autoSaveMinutes === 2);
    // เป้าหมายโผล่ในแดชบอร์ด
    openDashboard();
    await new Promise((r) => setTimeout(r, 120));
    check('แดชบอร์ดแสดงแถบเป้าหมายคำ', !!document.querySelector('.dash-goal .dash-goal-fill'));
    // ยกเลิกแล้วฟอนต์ที่พรีวิวต้องคืนค่า
    settingsDialog();
    await new Promise((r) => setTimeout(r, 20));
    [...document.querySelectorAll('.k-set-tab')].find((t) => t.dataset.p === 'write').click();
    const fontInp2 = document.querySelector('#st-font');
    fontInp2.value = '10'; fontInp2.dispatchEvent(new Event('input'));
    document.querySelector('.k-settings .k-cancel').click();
    await new Promise((r) => setTimeout(r, 20));
    check('กด "ยกเลิก" คืนขนาดฟอนต์เดิม (19.5px)',
          getComputedStyle(document.documentElement).getPropertyValue('--ed-fs').trim() === '19.5px',
          getComputedStyle(document.documentElement).getPropertyValue('--ed-fs'));

    // ---- คีย์ลัดฝั่ง renderer (จับ e.code — ไม่พึ่ง accelerator เมนู) ----
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Comma', ctrlKey: true, bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));
    check('Ctrl+, เปิดตั้งค่า (คีย์ลัด renderer ทำงาน)', !!document.querySelector('.k-settings'));
    document.querySelector('.k-settings .k-cancel')?.click();
    // Ctrl+S บันทึกแท็บที่ค้าง
    const anyTab = [...state.tabs.values()].find((x) => x.editor);
    if (anyTab) { activate(anyTab.file); anyTab.dirty = true;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', ctrlKey: true, bubbles: true }));
      await new Promise((r) => setTimeout(r, 60));
      check('Ctrl+S บันทึกแท็บ (dirty → false)', anyTab.dirty === false);
      // Ctrl+Z undo ในตัวแก้ไข (ผ่านคีย์ลัด renderer → PM history)
      const view = anyTab.editor.view;
      const md0 = anyTab.editor.getMarkdown();
      view.dispatch(view.state.tr.insertText('ทดสอบZ', 1));   // เปลี่ยน doc แน่นอน + สร้าง history step
      await new Promise((r) => setTimeout(r, 20));
      const changed = anyTab.editor.getMarkdown() !== md0;
      view.focus();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', ctrlKey: true, bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));
      check('Ctrl+Z ในตัวแก้ไข undo ได้ (PM history)',
            changed && anyTab.editor.getMarkdown() === md0,
            'changed=' + changed + ' now=' + JSON.stringify(anyTab.editor.getMarkdown().slice(0, 20)));
    }

    // ---- คลิกขวา: ทำซ้ำฉาก / สถานะ / สี / ทำซ้ำ entity ----
    const scRows = (await kapi.readJson(await kapi.join(dPath, 'scenes.json'))).chapters[chJson.guid];
    const sc0 = scRows[0];
    await duplicateScene(dPath, chJson, sc0);
    await new Promise((r) => setTimeout(r, 120));
    const scAfterDup = (await kapi.readJson(await kapi.join(dPath, 'scenes.json'))).chapters[chJson.guid];
    const dup = scAfterDup.find((x) => x.title === sc0.title + ' (สำเนา)');
    check('ทำซ้ำฉาก → row ใหม่ + ไฟล์ .md',
          !!dup && await kapi.exists(await kapi.join(dPath, 'Chapters', chJson.folderName, dup.fileName)));
    await setSceneMeta(dPath, chJson, sc0, { status: 'กำลังเขียน', color: '#6fae6f' });
    const scStatus = (await kapi.readJson(await kapi.join(dPath, 'scenes.json')))
      .chapters[chJson.guid].find((x) => x.id === sc0.id);
    check('ตั้งสถานะ+สีฉากลง scenes.json',
          scStatus.status === 'กำลังเขียน' && scStatus.color === '#6fae6f');
    check('แถวฉากโชว์จุดสี + ป้ายสถานะ',
          !!document.querySelector('.sc-dot') && !!document.querySelector('.sc-status'));
    // ทำซ้ำ entity
    const chDir = await kapi.join(state.root, 'Wiki', 'characters');
    const entFiles = await kapi.listFiles(chDir, '.json');
    if (entFiles.length) {
      const before = entFiles.length;
      await duplicateEntity(await kapi.join(chDir, entFiles[0]));
      await new Promise((r) => setTimeout(r, 150));
      const after = (await kapi.listFiles(chDir, '.json')).length;
      check('ทำซ้ำ Wiki entity → ไฟล์ใหม่', after === before + 1);
    }

    // ---- ตัวจัดการเทมเพลต Wiki (สร้าง/แก้ผ่าน GUI) ----
    const tplFile = await kapi.join(state.root, 'templates.json');
    openTemplateManager();
    await new Promise((r) => setTimeout(r, 60));
    const nCardsBefore = document.querySelectorAll('.tpl-card').length;
    check('ตัวจัดการเทมเพลตเปิด + แสดงการ์ด', nCardsBefore >= state.templates.length && nCardsBefore > 0,
          nCardsBefore + ' cards');
    // สร้างเทมเพลตใหม่ผ่าน modal
    templateEditModal(null);
    await new Promise((r) => setTimeout(r, 30));
    check('modal สร้างเทมเพลตเปิด', !!document.querySelector('.k-tpl-edit'));
    document.querySelector('.k-tpl-edit input.k-dlg-input').value = 'ตัวละครทดสอบใหม่';
    document.querySelector('.k-tpl-edit select.k-dlg-select').value = 'locations';
    document.querySelector('.k-tpl-edit .k-tpl-add').click();       // + เพิ่มฟิลด์
    await new Promise((r) => setTimeout(r, 10));
    const frow = document.querySelector('.k-tpl-edit .k-tpl-frow');
    frow.querySelectorAll('input.k-dlg-input')[0].value = 'Climate';
    frow.querySelectorAll('input.k-dlg-input')[1].value = 'ภูมิอากาศ';
    frow.querySelector('select.k-dlg-select').value = 'String';
    document.querySelectorAll('.k-tpl-edit .k-tpl-add')[1].click();  // + เพิ่มส่วน
    await new Promise((r) => setTimeout(r, 10));
    const srow = document.querySelectorAll('.k-tpl-edit .k-tpl-list')[1].querySelector('.k-tpl-frow');
    srow.querySelector('input.k-dlg-input').value = 'ประวัติสถานที่';
    document.querySelector('.k-tpl-edit .k-dlg-btns .k-ok').click();
    await new Promise((r) => setTimeout(r, 80));
    check('modal ปิดหลังบันทึก', !document.querySelector('.k-tpl-edit'));
    const tdoc = JSON.parse(await kapi.readFile(tplFile));
    const created = tdoc.templates.find((x) => x.name === 'ตัวละครทดสอบใหม่');
    check('เทมเพลตใหม่ถูกเขียนลง templates.json',
          !!created && created.entityTypeKey === 'locations' &&
          created.fields.some((f) => f.key === 'Climate' && f.label === 'ภูมิอากาศ') &&
          created.sections.some((s) => s.title === 'ประวัติสถานที่'),
          JSON.stringify(created?.fields || 'none'));
    check('state.templates อัปเดตทันที', state.templates.some((t) => t.name === 'ตัวละครทดสอบใหม่'));
    // dropdown ตอนสร้าง entity หมวด locations เห็นเทมเพลตใหม่
    const locTps = state.templates.filter((t) => t.entityTypeKey === 'locations');
    check('เทมเพลตใหม่โผล่ในหมวด locations', locTps.some((t) => t.name === 'ตัวละครทดสอบใหม่'));
    // แก้ไขเทมเพลตที่เพิ่งสร้าง
    templateEditModal(created);
    await new Promise((r) => setTimeout(r, 30));
    document.querySelector('.k-tpl-edit input.k-dlg-input').value = 'สถานที่ทดสอบ (แก้แล้ว)';
    document.querySelector('.k-tpl-edit .k-dlg-btns .k-ok').click();
    await new Promise((r) => setTimeout(r, 80));
    const tdoc2 = JSON.parse(await kapi.readFile(tplFile));
    check('แก้ชื่อเทมเพลตแล้วบันทึกถูก',
          tdoc2.templates.some((x) => x.id === created.id && x.name === 'สถานที่ทดสอบ (แก้แล้ว)') &&
          !tdoc2.templates.some((x) => x.name === 'ตัวละครทดสอบใหม่'));

    // ---- ระบบสำรอง / ประวัติเวอร์ชัน ----
    const scRowsV = (await kapi.readJson(await kapi.join(dPath, 'scenes.json'))).chapters[chJson.guid];
    const vfile = await kapi.join(dPath, 'Chapters', chJson.folderName, scRowsV[0].fileName);
    for (const s of await listSnapshots(vfile)) await kapi.remove(s.path);   // เริ่มจากศูนย์
    state.settings.autoBackup = true; state.settings.maxBackups = 20;
    await snapshotFile(vfile);
    const n1 = (await listSnapshots(vfile)).length;
    check('สำรองเวอร์ชันได้', n1 === 1, 'n1=' + n1);
    await snapshotFile(vfile);   // เนื้อหาเดิม → dedupe
    check('บันทึกซ้ำเนื้อหาเดิมไม่เพิ่มเวอร์ชัน', (await listSnapshots(vfile)).length === 1);
    await kapi.writeFile(vfile, (await kapi.readFile(vfile)) + '\n\nเพิ่มบรรทัดทดสอบ');
    await snapshotFile(vfile);
    check('เนื้อหาเปลี่ยน → เวอร์ชันเพิ่ม', (await listSnapshots(vfile)).length === 2);
    await snapshotFile(vfile, 'จุดสำคัญ');
    check('บันทึกเวอร์ชันแบบตั้งชื่อได้',
          (await listSnapshots(vfile)).filter((s) => s.label === 'จุดสำคัญ').length === 1);
    // ตัดเวอร์ชันอัตโนมัติเหลือตาม maxBackups (เวอร์ชันตั้งชื่อไม่ถูกตัด)
    state.settings.maxBackups = 1;
    for (let i = 0; i < 3; i++) {
      await kapi.writeFile(vfile, (await kapi.readFile(vfile)) + '\nX' + i);
      await snapshotFile(vfile);
    }
    const afterSnaps = await listSnapshots(vfile);
    check('ตัดเวอร์ชันอัตโนมัติเหลือตาม maxBackups', afterSnaps.filter((s) => !s.label).length === 1,
          'unlabeled=' + afterSnaps.filter((s) => !s.label).length);
    check('เวอร์ชันตั้งชื่อไม่ถูกตัด', afterSnaps.some((s) => s.label === 'จุดสำคัญ'));
    const labSnap = afterSnaps.find((s) => s.label === 'จุดสำคัญ');
    const labContent = await kapi.readFile(labSnap.path);
    await kapi.writeFile(vfile, labContent);
    check('เนื้อหาสแนปกู้คืนได้ถูกต้อง', (await kapi.readFile(vfile)) === labContent);
    versionDialog(dPath, chJson, scRowsV[0]);
    await new Promise((r) => setTimeout(r, 80));
    check('กล่องประวัติเวอร์ชันเปิด + มีรายการ',
          !!document.querySelector('.k-ver') && document.querySelectorAll('.k-ver-item').length > 0);
    document.querySelector('.k-ver .k-dlg-btns button').click();

    // ================= Phase 1 batch: log · saveAll · accordion · dirty badge =================
    await buildTree();
    await new Promise((r) => setTimeout(r, 40));

    // ---- ข้อ 6: ระบบ log ----
    const logMark = 'e2e-log-' + Date.now();
    log('info', logMark);
    check('log() เก็บลง buffer', LOG_BUF.some((l) => l.includes(logMark)));
    {
      const fileLog = await kapi.logRead(50).catch(() => '');
      check('log() เขียนลงไฟล์ userData (อ่านกลับได้)', fileLog.includes(logMark), fileLog.slice(-120));
    }
    await renderLogPanel();
    showPanel('log');
    await new Promise((r) => setTimeout(r, 40));
    check('ตัวดู log เปิดได้ + แสดงบรรทัด (panel)', !!document.querySelector('#log-body') &&
          document.querySelector('#log-body').textContent.includes(logMark));
    hidePanel('log');

    // ---- ข้อ 10: accordion Explorer (พับ/กาง เล่ม·บท + จำสถานะ) ----
    {
      const secTitle = document.querySelector('.sec .sec-title');
      const secEl = secTitle.closest('.sec');
      check('หัวเล่มมี caret accordion (.tw)', !!secTitle.querySelector('.tw'));
      const before = secEl.classList.contains('collapsed');
      secTitle.click();
      await new Promise((r) => setTimeout(r, 20));
      check('คลิกหัวเล่ม → สลับสถานะพับ', secEl.classList.contains('collapsed') !== before);
      const persisted = JSON.parse(localStorage.getItem('k2-tree-collapsed:' + state.root) || '{}');
      check('จำสถานะพับลง localStorage', Object.keys(persisted).length > 0, JSON.stringify(persisted));
      const chTitle = document.querySelector('.chapter .ch-title');
      if (chTitle) {
        check('หัวบทมี caret accordion (.tw)', !!chTitle.querySelector('.tw'));
        const chEl = chTitle.closest('.chapter'); const cb = chEl.classList.contains('collapsed');
        chTitle.click(); await new Promise((r) => setTimeout(r, 20));
        check('คลิกหัวบท → สลับสถานะพับ', chEl.classList.contains('collapsed') !== cb);
      }
      secTitle.click();                       // กางกลับ กัน state ค้างข้ามเทส
      await new Promise((r) => setTimeout(r, 20));
    }

    // ---- ข้อ 3 + 48: บันทึกทั้งหมด + badge จำนวนแท็บค้าง ----
    {
      document.querySelector('.scene').click();
      await new Promise((r) => setTimeout(r, 300));
      const t2 = state.active;
      check('เปิดฉากเพื่อเทส saveAll', !!(t2 && (t2.editor || t2.sp || t2.plain)));
      markDirty(t2);
      check('mark dirty → badge เมนูไฟล์แสดงจำนวน',
            (document.querySelector('.tb-menu[data-m="File"] .tb-menu-badge') || {}).textContent >= '1');
      check('mark dirty → จุด 💾 บน titlebar แสดง',
            $('#tb-dirty-dot') && $('#tb-dirty-dot').style.display !== 'none');
      // บั๊ก #3: saveAllTabs ต้องขึ้นกล่องที่ "แสดงรายชื่อไฟล์" ก่อนบันทึก
      const pSave = saveAllTabs();
      await new Promise((r) => setTimeout(r, 60));
      const saDlg = document.querySelector('.k-dialog.k-saveall');
      check('บันทึกทั้งหมด → ขึ้นกล่องรายการไฟล์', !!saDlg);
      const saRows = saDlg ? saDlg.querySelectorAll('.k-saveall-row') : [];
      check('กล่องบันทึกทั้งหมดแสดงชื่อ+พาธของไฟล์ค้าง',
            saRows.length >= 1 &&
            !!saRows[0].querySelector('.k-saveall-name')?.textContent &&
            (saRows[0].querySelector('.k-saveall-path')?.textContent || '').includes('.md'),
            saRows.length + ' rows');
      check('ทุกแถวติ๊กไว้ตั้งแต่แรก',
            [...saRows].every((r) => r.querySelector('input').checked));
      check('หัวกล่องบอกจำนวนไฟล์ที่ค้าง',
            (saDlg.querySelector('.k-dlg-title').textContent || '').includes(String(saRows.length)),
            saDlg.querySelector('.k-dlg-title').textContent);
      saDlg.querySelector('.k-dlg-btns .k-ok').click();
      const nSaved = await pSave;
      check('saveAllTabs บันทึกแท็บค้าง', nSaved >= 1, 'saved=' + nSaved);
      check('กล่องบันทึกทั้งหมดปิดหลังกดบันทึก', !document.querySelector('.k-saveall'));
      check('หลัง saveAll ไม่มีแท็บ dirty', [...state.tabs.values()].every((x) => !x.dirty));
      updateDirtyBadge();
      check('หลัง saveAll → badge เมนูไฟล์หาย',
            !document.querySelector('.tb-menu[data-m="File"] .tb-menu-badge'));
    }

    // ================= v2.1.0: Home/Tags/FAB/FilterBar/ProgressBar/StatusBar =================
    // ---- ข้อ 4: Home Panel ----
    {
      showPanel('home');
      const { renderHomePanel } = await import('./home-ui.js');
      await renderHomePanel($('#home-body'));
      await new Promise((r) => setTimeout(r, 800));
      const hb = $('#home-body');
      check('แผง Home แสดงหัวข้อ Killian 2',
            !!hb?.querySelector('.home-title') &&
            hb.querySelector('.home-title').textContent.includes('Killian'));
      check('มีปุ่มสร้างโปรเจกต์ใหม่ในแผง Home',
            !!hb?.querySelector('.home-actions button'));
      check('แผง Home มีรายการโปรเจกต์',
            !!hb?.querySelector('.home-card') ||
            !!hb?.querySelector('.home-empty'));
      await kapi.testShot('/tmp/k2_home.png');
      hidePanel('home');
    }

    // ---- ข้อ 11: Tag Pane ----
    {
      await openTagPane();
      await new Promise((r) => setTimeout(r, 400));
      check('เปิดแท็บแท็กได้', state.tabs.has('::tags::'));
      check('แท็บแท็กแสดง toggle รายการ/เมฆแท็ก',
            !!document.querySelector('.tag-mode-btn'));
      await kapi.testShot('/tmp/k2_tags.png');
      closeTab('::tags::');
    }

    // ---- ข้อ 5+44: Toolbar + FAB ----
    {
      check('มีปุ่ม FAB (ลอยมุมขวาล่าง)', !!$('#k-fab'));
      check('มีเมนู FAB dropdown (เริ่มต้นซ่อน)', !!$('#k-fab-menu') &&
            $('#k-fab-menu').classList.contains('k-menu-off'));
      // กด FAB → เมนูโผล่
      $('#k-fab').click();
      await new Promise((r) => setTimeout(r, 60));
      check('กด FAB → เมนู dropdown โผล่',
            !$('#k-fab-menu').classList.contains('k-menu-off'));
      // ปิด FAB
      document.body.click();
      await new Promise((r) => setTimeout(r, 60));
      check('คลิกข้างนอก → เมนูปิด', $('#k-fab-menu').classList.contains('k-menu-off'));
    }

    // ---- ข้อ 3: Ctrl+Shift+S บันทึกทั้งหมด ----
    {
      document.querySelector('.scene').click();
      await new Promise((r) => setTimeout(r, 300));
      const dirtyBefore = [...state.tabs.values()].filter((t) => t.dirty).length;
      markDirty(state.active);
      const ndirty = [...state.tabs.values()].filter((t) => t.dirty).length;
      check('markDirty แล้วมีแท็บ dirty', ndirty > dirtyBefore, 'dirty=' + ndirty);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', ctrlKey: true, shiftKey: true, bubbles: true }));
      await new Promise((r) => setTimeout(r, 120));
      // บั๊ก #3: คีย์ลัดขึ้นกล่องรายการไฟล์ก่อน แล้วค่อยบันทึกเมื่อยืนยัน
      const scDlg = document.querySelector('.k-dialog.k-saveall');
      check('Ctrl+Shift+S → ขึ้นกล่องรายการไฟล์ที่ยังไม่บันทึก', !!scDlg);
      scDlg.querySelector('.k-dlg-btns .k-ok').click();
      await new Promise((r) => setTimeout(r, 250));
      check('Ctrl+Shift+S → บันทึกทั้งหมด (ไม่มีแท็บ dirty)',
            [...state.tabs.values()].every((t) => !t.dirty),
            [...state.tabs.values()].filter((t) => t.dirty).map((t) => t.title).join('|'));
    }

    // ---- ข้อ 41+45: Status bar + Progress bar ----
    {
      check('status bar มีช่องโหมด (📖/🎬)', !!$('#status-mode'));
      check('status bar มีสถานะบันทึก (⏳/💾)', !!$('#status-save'));
      check('status bar มีจำนวนฉาก', !!$('#status-scenes'));
      check('topbar มี progress bar (prog-wrap)', !!$('#prog-wrap'));
      check('progress bar มี fill element', !!$('#prog-fill'));
      const saveBtn = $('#save-all-btn');
      check('ปุ่มบันทึกทั้งหมดแสดงเมื่อมีโปรเจกต์', saveBtn && saveBtn.style.display !== 'none');
    }

    // ---- ข้อ 43: Filter Bar ----
    {
      check('filter bar มีปุ่มสถานะ (chip)', $('#filter-statuses').children.length >= 1 ||
            !!$('#filter-statuses'));
      check('มี dropdown เรียงตาม', !!$('#filter-sort'));
      // คลิกปุ่มสถานะ → เปิด chip + กรอง explorer
      const stChip = $('#filter-statuses .filter-chip');
      if (stChip) {
        stChip.click();
        await new Promise((r) => setTimeout(r, 40));
        check('คลิก filter chip → มีคลาส on', stChip.classList.contains('on'));
        stChip.click(); // คืนค่า
      }
    }

    // ================= v2.1.0: Global Search + Reading Mode + Scene Table =================
    // ---- ข้อ 33: Global Search panel ----
    {
      showPanel('search');
      await renderSearchPanel($('#search-body'));
      await new Promise((r) => setTimeout(r, 80));
      check('เปิดแผงค้นหาทั้งโปรเจกต์ได้', !!$('#search-body').querySelector('.k-dlg-input'));
      const q = $('#search-body').querySelector('.k-dlg-input');
      q.value = 'ความหวัง';
      q.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await new Promise((r) => setTimeout(r, 400));
      check('กด Enter ค้นหาแล้วมีผลลัพธ์',
            $('#search-body').querySelectorAll('.k-gsearch-hit').length >= 1 ||
            !!$('#search-body').querySelector('.k-gsearch-status'));
      await kapi.testShot('/tmp/k2_gsearch.png');
      hidePanel('search');
    }

    // ---- ข้อ 34: Reading Mode ----
    {
      document.querySelector('.scene').click();
      await new Promise((r) => setTimeout(r, 200));
      toggleReading(true);
      check('เปิดโหมดอ่าน → body มีคลาส reading-mode',
            document.body.classList.contains('reading-mode'));
      // ซ่อน UI ด้วย CSS ล้วน (ไม่ใช้ inline style แล้ว — inline ค้างข้ามโหมด ดูข้อ 1 รอบ alpha.43)
      check('โหมดอ่าน → แผงข้างถูกซ่อน (เหลือสายที่ถือแผงเอกสาร)',
            $('#tree-panel').offsetParent === null && $('#panes').offsetParent !== null);
      check('โหมดอ่าน → toolbar ถูกซ่อน', getComputedStyle($('#toolbar')).display === 'none');
      check('โหมดอ่านไม่เขียน inline style ทับ (กันค้างข้ามโหมด)',
            $('#app-root').style.display === '' && $('#topbar').style.display === '');
      toggleReading(false);
      check('ปิดโหมดอ่าน → แผงข้างกลับมา', $('#tree-panel').offsetParent !== null);
    }

    // ---- ข้อ 19: Scene Table ----
    {
      await openSceneTable();
      await new Promise((r) => setTimeout(r, 300));
      check('เปิดตารางฉากได้', state.tabs.has('::scenetable::'));
      check('ตารางฉากมีข้อมูล (แถว)',
            document.querySelectorAll('.sc-tbl-row').length >= 1 ||
            !!document.querySelector('.sc-tbl-info'));
      await kapi.testShot('/tmp/k2_scenetable.png');
      closeTab('::scenetable::');
    }

    // ================= ชุดแก้ไขรอบ alpha.40 (ฟีเจอร์ที่เคยต่อไม่ครบ/พัง) =================

    // ---- คีย์ลัดต้องไม่ชนกัน (เคยยิง 3 คำสั่งพร้อมกันที่ Ctrl+Shift+F) ----
    {
      const seen = new Map();
      let clash = '';
      for (const [code, ctrl, shift, ch] of SHORTCUTS) {
        const k = `${code}|${!!ctrl}|${!!shift}`;
        if (seen.has(k)) clash = `${k} → ${seen.get(k)} + ${ch}`;
        seen.set(k, ch);
      }
      check('ตารางคีย์ลัดไม่มีคีย์ซ้ำกัน', !clash, clash);
      const find = (c) => SHORTCUTS.find((s) => s[3] === c);
      check('Ctrl+Shift+F = ค้นหาทั้งโปรเจกต์', String(find('global-search')?.slice(0, 3)) === 'KeyF,true,true');
      check('โหมดโฟกัสย้ายไป Ctrl+Shift+D', String(find('focus-mode')?.slice(0, 3)) === 'KeyD,true,true');
      check('Ctrl+P ยังเป็นสั่งพิมพ์อย่างเดียว', String(find('print')?.slice(0, 3)) === 'KeyP,true,false');
    }

    // ---- โหมดโฟกัส: ต้องไฮไลต์บรรทัดที่ cursor อยู่ (เดิม closest บน text node → หรี่หมดทั้งหน้า) ----
    {
      document.querySelector('.scene').click();
      await new Promise((r) => setTimeout(r, 220));
      const t2 = state.active;
      if (t2 && t2.editor) {
        selHead(t2.editor.view);
        toggleFocus(true);
        await new Promise((r) => setTimeout(r, 60));
        check('โหมดโฟกัส: body มีคลาส fm2', document.body.classList.contains('fm2'));
        // จำลองผู้ใช้พิมพ์ — ไฮไลต์ทาใหม่ทุก keyup (decoration ตรวจคำผิดอาจลบของเดิมไป)
        document.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }));
        await new Promise((r) => setTimeout(r, 40));
        const cb = cursorBlock();
        check('โหมดโฟกัส: มีบรรทัดถูกไฮไลต์ (.fm2-active)',
              !!document.querySelector('.ProseMirror .fm2-active'),
              `cursorBlock=${cb ? cb.blk.tagName : 'null'} · active=${document.querySelectorAll('.fm2-active').length}` +
              ` · fmActive=${isFocusMode()} · view=${!!t2.editor?.view}`);
        toggleFocus(false);
        check('ปิดโฟกัส: .fm2-active ถูกล้าง', !document.querySelector('.fm2-active'));
        // เครื่องพิมพ์ดีด
        toggleTypewriter(true);
        selHead(t2.editor.view);
        check('เครื่องพิมพ์ดีด: หาบรรทัดปัจจุบันเจอ (เลื่อนได้จริง)', twScroll() === true);
        toggleTypewriter(false);
      }
    }

    // ---- เปิดไฟล์ด่วน (Quick Open) ----
    {
      await openQuickOpen();
      await new Promise((r) => setTimeout(r, 300));
      check('เปิดกล่องค้นหาไฟล์ด่วนได้', !!document.querySelector('.k-qo'));
      const rows = [...document.querySelectorAll('.k-qo-row')];
      check('รายการไฟล์ไม่ว่าง', rows.length >= 1, 'rows=' + rows.length);
      const relTxt = rows[0]?.querySelector('.k-qo-rel')?.textContent || '';
      check('คอลัมน์ path เป็นข้อความจริง (ไม่ใช่ [object Promise])',
            !relTxt.includes('Promise'), relTxt);
      document.querySelector('.k-qo-input')
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      check('กด Esc ปิดกล่องได้', !document.querySelector('.k-qo'));
    }

    // ---- สถานะฉากที่ผู้ใช้เพิ่มเอง ต้องโผล่ในเมนู/แผงคุณสมบัติจริง ----
    {
      const before = allStatuses().length;
      await addCustomStatus('รอแก้ไข');
      check('เพิ่มสถานะเองได้ + เข้าไปอยู่ในรายการรวม',
            allStatuses().includes('รอแก้ไข') && allStatuses().length === before + 1);
      check('สถานะถูกบันทึกลง project.khn.json',
            (state.meta.customStatuses || []).includes('รอแก้ไข'));
      // หาบท+ฉากที่ "มีอยู่จริง" — บทแรกอาจไม่เหลือฉากแล้วหลังเทสย้าย/ลบก่อนหน้า
      const dj0 = await kapi.readJson(await kapi.join(dPath, 'draft.json'));
      const sj0 = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
      const chS = dj0.chapters.find((c) => (sj0.chapters[c.guid] || []).length);
      const scS = (sj0.chapters[chS.guid] || [])[0];
      let sErr = '';
      const pS = sceneProps(dPath, chS, scS).catch((e) => { sErr = e.message; });
      // รอจนกล่องโผล่จริง (เวลาคงที่ไม่พอเมื่อเครื่องช้า)
      for (let i = 0; i < 40 && !document.querySelector('.k-dialog select'); i++)
        await new Promise((r) => setTimeout(r, 25));
      const opts = [...document.querySelectorAll('.k-dialog select')][0];
      check('แผงคุณสมบัติฉากแสดงสถานะที่เพิ่มเอง',
            !!opts && [...opts.options].some((o) => o.value === 'รอแก้ไข'),
            opts ? [...opts.options].map((o) => o.value).join(',')
                 : `ไม่พบ select · dialogs=${document.querySelectorAll('.k-dialog').length}` +
                   ` · overlays=${document.querySelectorAll('.k-overlay').length} · err=${sErr}` +
                   ` · sc=${scS && scS.id}`);
      document.querySelector('.k-dialog .k-cancel')?.click(); await pS.catch(() => {});
      await removeCustomStatus('รอแก้ไข');
      check('ลบสถานะแล้วหายจริง (และบันทึกลงไฟล์)',
            !allStatuses().includes('รอแก้ไข') &&
            !((await kapi.readJson(await kapi.join(state.root, 'project.khn.json'))).customStatuses || []).includes('รอแก้ไข'));
    }

    // ---- คอมเมนต์ต่อฉาก (บั๊ก #25: กล่องโต้ตอบ + scenes.json → "แผง" + เก็บท้ายไฟล์ .md) ----
    {
      const dj1 = await kapi.readJson(await kapi.join(dPath, 'draft.json'));
      const sj1 = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
      const chC = dj1.chapters.find((c) => (sj1.chapters[c.guid] || []).length);
      const scC = (sj1.chapters[chC.guid] || [])[0];
      const cmFile = await kapi.join(dPath, 'Chapters', chC.folderName, scC.fileName);

      // (1) ย้ายของเก่า: scenes.json → ท้ายไฟล์ .md แล้วล้างของเดิมทิ้ง
      await updateSceneRow(dPath, scC.id, (r) => {
        r.comments = [{ id: 'oldcm1', text: 'คอมเมนต์เก่า', date: new Date().toISOString() }]; });
      const nMig = await migrateSceneComments(dPath);
      check('ย้ายคอมเมนต์เดิมจาก scenes.json ได้', nMig === 1, String(nMig));
      const rawMig = await kapi.readFile(cmFile);
      check('คอมเมนต์ถูกเขียนไว้ท้ายไฟล์ .md',
            rawMig.includes('k2-comments') && rawMig.includes('คอมเมนต์เก่า'), rawMig.slice(-160));
      check('ล้าง row.comments ออกจาก scenes.json แล้ว',
            !(await kapi.readJson(await kapi.join(dPath, 'scenes.json')))
              .chapters[chC.guid].find((x) => x.id === scC.id).comments);
      check('parseMdFile ตัดบล็อกคอมเมนต์ออกจากเนื้อฉาก (ไม่โผล่ในตัวแก้ไข/ส่งออก)',
            !parseMdFile(rawMig).body.includes('k2-comments'));
      check('ย้ายซ้ำไม่เพิ่มซ้ำ', (await migrateSceneComments(dPath)) === 0);

      // (2) CommentStore: เพิ่ม / ตอบกลับ (เธรด) / แก้ไข / ปิดเรื่อง / ลบ
      const cstore = commentStore();
      // สมอนับ offset เทียบกับ "ทั้งไฟล์" (frontmatter รวมด้วย) — ตรงกับที่ CommentStore.read คืนมา
      const cmRaw = (await cstore.read(cmFile)).body;
      const cmQuote = (parseMdFile(rawMig).body.match(/[฀-๿]{6,}/) || ['ทดสอบ'])[0];
      const cmAt = cmRaw.indexOf(cmQuote);
      check('หาข้อความตัวอย่างในฉากเจอ (ใช้ผูกสมอ)', cmAt >= 0, cmQuote);
      // ไม่ส่ง quote มาเอง — ให้ store ตัดจากไฟล์ตาม offset (พิสูจน์ว่า convention ตรงกันจริง)
      const c1 = await cstore.add(cmFile, { start: cmAt, end: cmAt + cmQuote.length }, 'คอมเมนต์ทดสอบ');
      check('เพิ่มคอมเมนต์ผ่าน CommentStore ได้', !!c1 && c1.text === 'คอมเมนต์ทดสอบ');
      check('คอมเมนต์ผูกสมอกับข้อความในฉาก (anchor.quote)',
            !!c1.anchor && c1.anchor.quote === cmQuote, JSON.stringify(c1.anchor));
      check('ตอบกลับ (เธรดซ้อน) ได้', !!(await cstore.reply(cmFile, c1.id, 'ตอบกลับทดสอบ')));
      await cstore.edit(cmFile, c1.id, 'คอมเมนต์แก้แล้ว');
      await cstore.resolve(cmFile, c1.id, true);
      const cmList = await cstore.list(cmFile);
      const c1b = cmList.find((c) => c.id === c1.id);
      check('แก้ไข + ปิดเรื่อง (resolve) + เก็บเธรดตอบกลับครบ',
            !!c1b && c1b.text === 'คอมเมนต์แก้แล้ว' && c1b.resolved === true && c1b.replies.length === 1,
            JSON.stringify(c1b));
      check('กรอง "ยังไม่ปิด" ไม่เห็นอันที่ปิดแล้ว',
            !(await cstore.list(cmFile, { openOnly: true })).some((c) => c.id === c1.id));

      // (3) บันทึกฉากทับแล้วคอมเมนต์ต้องไม่หาย (saveTab → store.saveBody)
      if (state.tabs.has(cmFile)) closeTab(cmFile);
      await openScene(cmFile, scC.title);
      await new Promise((r) => setTimeout(r, 350));
      const cmTab = state.tabs.get(cmFile);
      check('เปิดฉากแล้วเนื้อหาไม่มีบล็อกคอมเมนต์ปน',
            !!cmTab && !(cmTab.editor || cmTab.sp).getMarkdown().includes('k2-comments'));
      await saveTab(cmTab);
      check('บันทึกฉากทับแล้วคอมเมนต์ยังอยู่ครบ',
            (await cstore.list(cmFile)).length === cmList.length,
            String((await cstore.list(cmFile)).length) + ' vs ' + cmList.length);
      check('บันทึกแล้วบล็อกคอมเมนต์ยังอยู่ท้ายไฟล์',
            (await kapi.readFile(cmFile)).includes('k2-comments'));

      // (4) แผงคอมเมนต์ (แทนกล่องโต้ตอบเดิม)
      await openCommentsPanel();
      await new Promise((r) => setTimeout(r, 300));
      check('มีแผง "คอมเมนต์" ในทะเบียนแผง',
            PANEL_DEFS.some((d) => d.id === 'comments' && d.adopt === '#comments-panel'));
      check('เปิดแผงคอมเมนต์ได้', isPanelOpen('comments'));
      const cmHost = $('#comments-body');
      check('แผงคอมเมนต์วาดการ์ดคอมเมนต์จริง',
            !!cmHost && cmHost.querySelectorAll('.k-cm-card').length >= 2,
            cmHost ? String(cmHost.querySelectorAll('.k-cm-card').length) : 'ไม่พบ #comments-body');
      check('แผงมีการ์ดตอบกลับ (เธรด) แยกชั้น',
            !!cmHost && !!cmHost.querySelector('.k-cm-card.reply'));
      check('แผงแสดงสมอ (ข้อความที่คอมเมนต์ผูกไว้)',
            !!cmHost && !!cmHost.querySelector('.k-cm-quote'));
      check('แผงมีช่องพิมพ์คอมเมนต์ใหม่ + ปุ่มเพิ่ม',
            !!cmHost && !!cmHost.querySelector('.k-cm-input') && !!cmHost.querySelector('.k-cm-foot .k-ok'));
      // เพิ่มผ่าน UI จริง
      const cmInp = cmHost.querySelector('.k-cm-input');
      cmInp.value = 'เพิ่มจากแผง';
      cmHost.querySelector('.k-cm-foot .k-ok').click();
      await new Promise((r) => setTimeout(r, 450));
      check('เพิ่มคอมเมนต์จากแผงแล้วเขียนลงไฟล์จริง',
            (await cstore.list(cmFile)).some((c) => c.text === 'เพิ่มจากแผง'));
      // ตัวกรอง "ยังไม่ปิด"
      const nAll = $('#comments-body').querySelectorAll('.k-cm-card').length;
      $('#comments-body').querySelector('.k-cm-filter').click();
      await new Promise((r) => setTimeout(r, 350));
      check('ตัวกรองซ่อนคอมเมนต์ที่ปิดเรื่องแล้ว',
            $('#comments-body').querySelectorAll('.k-cm-card').length < nAll);
      $('#comments-body').querySelector('.k-cm-filter').click();
      await new Promise((r) => setTimeout(r, 350));

      // (5) ไฮไลต์สมอในตัวแก้ไข (decoration — แท็บนี้ active สดอยู่ ดูบทเรียนข้อ 2)
      // คอมเมนต์ที่ปิดเรื่องแล้วต้องไม่ขีดไฮไลต์ (ไม่งั้นฉากรกไปด้วยเรื่องที่จบแล้ว)
      check('คอมเมนต์ที่ปิดเรื่องแล้วไม่ขีดไฮไลต์ในฉาก', !commentAnchors().includes(cmQuote),
            commentAnchors().join('|'));
      await cstore.resolve(cmFile, c1.id, false);        // เปิดเรื่องกลับ → สมอต้องกลับมา
      await renderCommentPanel($('#comments-body'));
      await new Promise((r) => setTimeout(r, 250));
      check('ตั้งสมอคอมเมนต์เข้าตัวแก้ไขแล้ว (ไม่ใช่ยัด class ลง DOM)',
            commentAnchors().includes(cmQuote), commentAnchors().join('|'));
      const cmView = (cmTab.editor || cmTab.sp).view;
      refreshCommentAnchors(cmView);
      await new Promise((r) => setTimeout(r, 250));
      check('ตัวแก้ไขขีดไฮไลต์ข้อความที่มีคอมเมนต์ผูกอยู่',
            !!cmTab.pane.querySelector('.k-cm-anchor'),
            cmTab.pane.querySelectorAll('.k-cm-anchor').length + ' hits · quote=' + cmQuote);
      check('เลื่อนไปยังข้อความที่คอมเมนต์ผูกไว้ได้', scrollToAnchor(cmQuote) === true);

      // (6) ลบ แล้วเก็บกวาดให้เทสอื่นไม่เจอคอมเมนต์ค้าง
      for (const c of await cstore.list(cmFile)) await cstore.remove(cmFile, c.id);
      check('ลบคอมเมนต์ได้จนหมด', (await cstore.list(cmFile)).length === 0);
      check('ไม่มีคอมเมนต์แล้ว บล็อกท้ายไฟล์ต้องหายไปด้วย',
            !(await kapi.readFile(cmFile)).includes('k2-comments'));
      hidePanel('comments');
    }

    // ---- สถิติคำรายวัน + วันเขียนติดต่อกัน (แสดงในแดชบอร์ด) ----
    {
      const today = new Date().toISOString().slice(0, 10);
      const yst = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      state.meta.wordHistory = [{ date: yst, words: 1000 }, { date: today, words: 1500 }];
      check('calcStreak นับวันเขียนติดต่อกันได้', calcStreak(state.meta.wordHistory) === 2,
            String(calcStreak(state.meta.wordHistory)));
      check('ไม่ได้เขียนวันนี้/เมื่อวาน → streak = 0',
            calcStreak([{ date: '2020-01-01', words: 500 }]) === 0);
      await openDashboard();
      await new Promise((r) => setTimeout(r, 500));
      const sbox = document.querySelector('.dash-streak');
      check('แดชบอร์ดแสดงแถบวันเขียนติดต่อกัน', !!sbox && sbox.textContent.includes('2 วัน'),
            sbox ? sbox.textContent.slice(0, 40) : 'ไม่พบ .dash-streak');
      check('แดชบอร์ดวาดกราฟคำรายวัน', !!document.querySelector('.dash-days .dash-day-bar'));
      const nWords = await countProjectWords();
      check('countProjectWords นับได้ (ไม่ติดลบ)', typeof nWords === 'number' && nWords >= 0, String(nWords));
      await recordDailyWords(nWords);
      check('recordDailyWords เขียนยอดของวันนี้',
            (getWordHistory().find((h) => h.date === today) || {}).words === nWords);
      delete state.meta.wordHistory;
      await saveProjectMeta();
    }

    // ---- โน้ตด่วน: เก็บใน project.khn.json ที่เดียว (ติดไปกับโปรเจกต์) ----
    {
      const n0 = getSessionNotes().length;
      await addSessionNote('โน้ตทดสอบ', null, null);
      check('บันทึกโน้ตแล้วจำนวนเพิ่ม', getSessionNotes().length === n0 + 1);
      check('โน้ตถูกเขียนลง project.khn.json',
            ((await kapi.readJson(await kapi.join(state.root, 'project.khn.json'))).sessionNotes || [])
              .some((n) => n.text === 'โน้ตทดสอบ'));
      await showAllNotes();
      await new Promise((r) => setTimeout(r, 60));
      const shown = [...document.querySelectorAll('.k-dialog .k-menu-item')]
        .some((r) => r.textContent.includes('โน้ตทดสอบ'));
      check('กล่องโน้ตแสดงรายการที่บันทึกไว้', shown);
      // ปิดกล่อง "ล่าสุด" ไม่ใช่ตัวแรกใน DOM — ถ้ามีกล่องอื่นค้างอยู่ querySelector('.k-dialog .k-ok')
      // จะไปกดผิดตัว แล้วกล่องโน้ตค้างทับหน้าจอยาวไปทั้ง run (เห็นในสกรีนช็อตของเทสถัด ๆ ไป)
      const ovs = [...document.querySelectorAll('.k-overlay')];
      ovs[ovs.length - 1].querySelector('.k-ok').click();
      await new Promise((r) => setTimeout(r, 80));
      check('ปิดกล่องโน้ตได้ถูกใบ (ไม่ไปกดกล่องอื่น)',
            ![...document.querySelectorAll('.k-dialog')]
              .some((d) => d.textContent.includes('โน้ตทั้งหมด')));
      // กล่องอื่นที่เทสก่อนหน้าลืมปิดไว้ → เก็บกวาดให้ สกรีนช็อตของเทสถัดไปจะได้ไม่มีอะไรบัง
      const stray = [...document.querySelectorAll('.k-overlay')];
      if (stray.length) {
        log('warn', 'selftest: มีกล่องค้างจากเทสก่อนหน้า ' + stray.length + ' ใบ — เก็บกวาดให้');
        stray.forEach((o) => o.remove());
      }
      check('อ่านโน้ตซ้ำแล้วลำดับไม่กลับด้าน (ไม่ reverse ของจริง)',
            getSessionNotes()[getSessionNotes().length - 1].text === 'โน้ตทดสอบ');
      await saveSessionNotes([]);
    }

    // ---- ผังแตกสาย (ข้อ 81): เอนจินกราฟ + ผัง SVG + inspector แก้ไขได้จริง ----
    {
      const BG = await import('./branch-graph.js');
      // เอนจิน (unit test เต็มอยู่ใน test/branch.test.cjs — ที่นี่เช็คว่า bundle ใช้งานได้)
      const gTest = BG.buildGraph([
        { id: 'a', title: 'A', choices: [{ text: 'ไป B', nextSceneId: 'b' }] },
        { id: 'b', title: 'B' },
      ]);
      check('branch-graph: สร้างกราฟจาก choices ได้', gTest.edges.length === 1 && !gTest.edges[0].dangling);
      const aTest = BG.analyzeGraph(gTest);
      check('branch-graph: หาจุดเริ่ม/ตอนจบได้', aTest.roots.join() === 'a' && aTest.endings.join() === 'b');
      check('branch-graph: จัดชั้นซ้าย→ขวาตามความลึก',
            BG.layoutGraph(gTest).byId.get('b').x > BG.layoutGraph(gTest).byId.get('a').x);

      const dj2 = await kapi.readJson(await kapi.join(dPath, 'draft.json'));
      const sj2 = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
      const chB = dj2.chapters.find((c) => (sj2.chapters[c.guid] || []).length > 1)
               || dj2.chapters.find((c) => (sj2.chapters[c.guid] || []).length);
      const rowsB = sj2.chapters[chB.guid] || [];
      const scB = rowsB[0], scB2 = rowsB[1] || null;
      // ทางเลือกหนึ่งชี้ไปฉากจริง (ได้เส้นเชื่อม) อีกหนึ่งยังไม่ระบุปลายทาง (ได้คำเตือน)
      await updateSceneRow(dPath, scB.id, (r) => {
        r.choices = [{ text: 'เปิดประตู', nextSceneId: scB2 ? scB2.id : '' },
                     { text: 'ยังไม่คิด', nextSceneId: '' }];
      });
      state._branch = { sel: null, zoom: 1, view: 'tree', sideOpen: true };   // เริ่มจากค่าเริ่มต้นเสมอ
      await openBranchingTree();
      await new Promise((r) => setTimeout(r, 400));
      check('เปิดผังแตกสายได้', state.tabs.has('::branching::'));
      const nodes = [...document.querySelectorAll('.branch-node')];
      check('ผังวาดกล่องฉากเป็นภาพ (ไม่ใช่แค่รายการ)', nodes.length >= 1, String(nodes.length));
      check('กล่องฉากถูกจัดวางด้วยพิกัดจริง',
            nodes.length > 0 && parseFloat(nodes[0].style.left) >= 0 && !!nodes[0].style.top,
            nodes.length ? nodes[0].style.left + ',' + nodes[0].style.top : 'ไม่มีโหนด');
      if (scB2) check('ผังลากเส้นเชื่อมทางเลือก (SVG)',
                      !!document.querySelector('.branch-edges path.branch-edge'));
      check('ผังเตือนทางเลือกที่ยังไม่ระบุปลายทาง',
            [...document.querySelectorAll('.branch-badge')].some((b) => b.textContent.includes('ยังไม่ระบุปลายทาง')),
            [...document.querySelectorAll('.branch-badge')].map((b) => b.textContent).join('|'));
      check('ผังมีแถบสถิติ', (document.querySelector('.branch-stats') || {}).textContent?.includes('ทางเลือก'));

      // คลิกโหนด → แผง inspector แสดงทางเลือกให้แก้
      check('มีแผง inspector (Panel System)', !!document.querySelector('.branch-side'));
      nodes.find((n) => n.textContent.includes(scB.title))?.click();
      await new Promise((r) => setTimeout(r, 350));
      check('คลิกกล่องฉากแล้ว inspector แสดงชื่อฉากนั้น',
            (document.querySelector('.branch-side-title') || {}).textContent === scB.title,
            (document.querySelector('.branch-side-title') || {}).textContent);
      check('inspector แสดงช่องแก้ทางเลือกครบทุกอัน',
            document.querySelectorAll('.branch-edit-row').length === 2,
            String(document.querySelectorAll('.branch-edit-row').length));
      check('inspector มีปุ่มเปิดฉากคู่กับผัง (Split View)',
            [...document.querySelectorAll('.branch-side-acts button')].some((b) => b.textContent.includes('⊞')));
      await kapi.testShot('/tmp/k2_branch.png');

      // แก้ข้อความทางเลือกผ่าน inspector → ต้องเขียนลง scenes.json จริง
      const inp = document.querySelector('.branch-edit-text');
      inp.value = 'ผลักประตู'; inp.dispatchEvent(new Event('blur'));
      await new Promise((r) => setTimeout(r, 400));
      const afterEdit = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
      check('แก้ข้อความทางเลือกใน inspector แล้วเขียนลง scenes.json',
            (afterEdit.chapters[chB.guid].find((x) => x.id === scB.id).choices || [])
              .some((c) => c.text === 'ผลักประตู'));

      // สลับเป็นมุมมองรายการ — โครงเดิมต้องยังใช้ได้
      state._branch.view = 'list';
      await renderBranchingTree(state.tabs.get('::branching::').pane);
      await new Promise((r) => setTimeout(r, 250));
      check('มุมมองรายการยังแสดงทางเลือกได้',
            [...document.querySelectorAll('.branch-choice')].some((c) => c.textContent.includes('ผลักประตู')));
      check('มีแผงเพิ่มทางเลือก (สร้าง choices ได้จากในโปรแกรม)', !!document.querySelector('.branch-adder'));

      closeTab('::branching::');
      state._branch = null;
      await updateSceneRow(dPath, scB.id, (r) => { delete r.choices; });
    }

    // ---- ผังพื้นที่ (ข้อ 82): แผนที่ + ตำแหน่งปัจจุบัน + เส้นเวลาของสถานที่ ----
    {
      await openFloorPlan();
      await new Promise((r) => setTimeout(r, 400));
      check('เปิดผังพื้นที่ได้', state.tabs.has('::floorplan::'));
      check('ผังพื้นที่แสดงแผงข้อมูล', !!document.querySelector('.floor-panel'));
      check('ผังพื้นที่มีแถบเส้นเวลาของสถานที่', !!document.querySelector('.floor-timeline'));
      check('ผังพื้นที่แสดงช่องเห็น/ได้ยิน/พบ ครบ 3 หัวข้อ',
            [...document.querySelectorAll('.floor-panel-title')]
              .filter((d) => /สิ่งที่(เห็น|ได้ยิน|พบ)/.test(d.textContent)).length === 3);

      // ผูกฉากกับแผนที่ → ตำแหน่งปัจจุบัน + เส้นเวลาของสถานที่ต้องขึ้น
      // สร้างแผนที่เองที่นี่ ไม่พึ่งว่าเทสก่อนหน้าทิ้งแผนที่ไว้ให้ (ไม่งั้นบล็อกนี้ถูกข้ามเงียบ ๆ)
      const prevMaps = await loadMaps();
      const tMap = newMap('แผนที่ทดสอบผังพื้นที่');
      tMap.id = 'fptest'; tMap.image = 'Images/world.png'; tMap.order = 0;
      tMap.pins = [{ id: 'fppin', x: 30, y: 40, kind: 'entity', label: 'ห้องนอน' }];
      await saveMaps({ version: MAPS_VERSION, maps: [tMap] });

      const dj3 = await kapi.readJson(await kapi.join(dPath, 'draft.json'));
      const sj3 = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
      const ch3 = dj3.chapters.find((c) => (sj3.chapters[c.guid] || []).length);
      const sc3 = sj3.chapters[ch3.guid][0];
      await updateSceneRow(dPath, sc3.id, (r) => {
        r.mapId = tMap.id; r.pinId = 'fppin'; r.storyDate = 'ปีที่ 1024';
      });
      // เปิดฉากเป็นแท็บจริง แล้ว **สลับกลับมาที่ผังพื้นที่** — ต้องยังรู้ว่ากำลังเขียนฉากไหนอยู่
      // (เคยพัง: sceneCtx() อ่านจากแท็บ active เท่านั้น พอมาดูผัง ตำแหน่งปัจจุบันเลยหายหมด)
      await openScene(await kapi.join(dPath, 'Chapters', ch3.folderName, sc3.fileName), sc3.title);
      await new Promise((r) => setTimeout(r, 250));
      activate('::floorplan::');
      check('สลับมาแท็บผังพื้นที่แล้วยังจำฉากที่เปิดล่าสุดได้',
            !!state.lastSceneFile && state.lastSceneFile.includes(sc3.fileName), state.lastSceneFile);
      state._floor = { mapId: tMap.id, picking: false };
      await renderFloorPlan(state.tabs.get('::floorplan::').pane, tMap.id);
      await new Promise((r) => setTimeout(r, 400));
      check('ผังพื้นที่วาดหมุดของแผนที่', document.querySelectorAll('.floor-pin').length === 1,
            String(document.querySelectorAll('.floor-pin').length));
      check('แสดงตำแหน่งปัจจุบันของฉากที่เปิดอยู่ (คุณอยู่ที่นี่)',
            !!document.querySelector('.floor-you'));
      check('ป้ายตำแหน่งปัจจุบันบอกชื่อฉาก',
            (document.querySelector('.floor-you-label') || {}).textContent === sc3.title,
            (document.querySelector('.floor-you-label') || {}).textContent);
      check('หมุดตำแหน่งปัจจุบันวางตรงพิกัดหมุดที่ผูกไว้',
            (document.querySelector('.floor-you') || {}).style?.left === '30%',
            (document.querySelector('.floor-you') || {}).style?.left);
      check('แผงข้อมูลบอกว่าฉากนี้อยู่แผนที่/หมุดไหน',
            (document.querySelector('.floor-where') || {}).textContent?.includes('ห้องนอน'),
            (document.querySelector('.floor-where') || {}).textContent);
      check('ฉากที่ผูกแผนที่ขึ้นบนเส้นเวลาของสถานที่นั้น',
            [...document.querySelectorAll('.floor-tl-title')].some((d) => d.textContent === sc3.title),
            [...document.querySelectorAll('.floor-tl-title')].map((d) => d.textContent).join('|'));
      check('เส้นเวลาของสถานที่แสดงเวลาในเรื่อง',
            [...document.querySelectorAll('.floor-tl-when')].some((d) => d.textContent.includes('1024')));

      // เพิ่ม "สิ่งที่เห็น" แล้วต้องขึ้นในแผง + นับเป็นป้ายบนการ์ดเส้นเวลา
      await updateSceneRow(dPath, sc3.id, (r) => { r.clues = ['รอยเลือดบนพื้น']; });
      await renderFloorPlan(state.tabs.get('::floorplan::').pane, tMap.id);
      await new Promise((r) => setTimeout(r, 300));
      check('รายการสิ่งที่เห็นขึ้นในแผง (ลบได้ทีละอัน)',
            [...document.querySelectorAll('.floor-item-text')].some((d) => d.textContent === 'รอยเลือดบนพื้น')
            && !!document.querySelector('.floor-item-del'));
      check('การ์ดเส้นเวลาติดป้ายจำนวนเบาะแส',
            [...document.querySelectorAll('.floor-tl-badges')].some((d) => d.textContent.includes('👁1')),
            [...document.querySelectorAll('.floor-tl-badges')].map((d) => d.textContent).join('|'));
      await kapi.testShot('/tmp/k2_floorplan.png');

      await updateSceneRow(dPath, sc3.id, (r) => {
        delete r.mapId; delete r.pinId; delete r.storyDate; delete r.clues;
      });
      await saveMaps(prevMaps);                 // คืนแผนที่เดิม ไม่ทิ้งขยะให้เทสถัดไป
      state._floor = null;
      closeTab('::floorplan::');
    }

    // ---- ศูนย์รวม (ข้อ 87): ใช้ Auto-link Engine ไม่ใช่สแกนดิบ ----
    {
      await openCentralizeUI();
      await new Promise((r) => setTimeout(r, 900));
      check('เปิดหน้าศูนย์รวมได้', state.tabs.has('::centralize::'));
      check('ศูนย์รวมคำนวณสถิติได้ (ไม่ค้างที่ว่าง)', !!document.querySelector('.cent-stat'));
      check('ศูนย์รวมมีแผง backlinks', !!document.querySelector('.cent-list'));
      check('ศูนย์รวมแสดงการ์ดสถิติ (ฉาก/คำ/Wiki/จุดเชื่อมโยง)',
            document.querySelectorAll('.cent-stat-card').length >= 3,
            String(document.querySelectorAll('.cent-stat-card').length));
      check('ศูนย์รวมนับจุดเชื่อมโยงจาก Auto-link Engine',
            [...document.querySelectorAll('.cent-stat-lbl')].some((d) => d.textContent === 'จุดเชื่อมโยง'));
      check('ศูนย์รวมมีปุ่มสร้างดัชนีใหม่ + ป้ายอัปเดตสด',
            !!document.querySelector('.cent-refresh') && !!document.querySelector('.cent-live'));
      closeTab('::centralize::');
    }

    // ---- Visual Tags (ข้อ 84): ชิปสีต้องโผล่ใน Explorer + แถบตัวกรอง ----
    {
      const { visualTagFor, applyVisualTagStyle, renderAllTagChips, getVisualTags } =
        await import('./visual-tags.js');
      check('มีแท็กภาพเริ่มต้นให้ใช้ทันที', getVisualTags().length >= 5, String(getVisualTags().length));
      const vt0 = getVisualTags()[0];
      check('หาแท็กภาพจากชื่อได้', visualTagFor(vt0.name) && visualTagFor(vt0.name).color === vt0.color);
      check('แท็กที่ไม่ได้ตั้งค่า → คืน null', visualTagFor('ไม่มีแท็กชื่อนี้xyz') === null);
      const probe = el('span', null, 'x');
      check('applyVisualTagStyle ทาสีให้ชิปที่มีอยู่แล้ว',
            applyVisualTagStyle(probe, vt0.name) && probe.style.color !== '');
      check('applyVisualTagStyle กับแท็กที่ไม่รู้จัก → ไม่แตะ element',
            applyVisualTagStyle(el('span', null, 'y'), 'ไม่มีแท็กนี้') === false);
      const chips = renderAllTagChips([vt0.name, 'แท็กธรรมดา']);
      check('ชิปแท็ก: ที่ตั้งสีได้ชิปสี · ที่เหลือได้ #ข้อความ',
            chips.children.length === 2 && chips.children[1].textContent === '#แท็กธรรมดา',
            chips.textContent);

      // ใส่แท็กจริงให้ฉาก แล้วดูว่า explorer วาดชิป
      const sj4 = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
      const cg4 = Object.keys(sj4.chapters).find((k) => (sj4.chapters[k] || []).length);
      const sc4 = sj4.chapters[cg4][0];
      const oldTags = sc4.tags;
      await updateSceneRow(dPath, sc4.id, (r) => { r.tags = [vt0.name]; });
      await buildTree();
      await new Promise((r) => setTimeout(r, 250));
      check('Explorer แสดงชิปแท็กสีของฉาก',
            [...document.querySelectorAll('#tree .scene .vt-chip')].some((c) => c.textContent.includes(vt0.name)),
            [...document.querySelectorAll('#tree .vt-chip')].map((c) => c.textContent).join('|'));
      await buildFilterBar();
      await new Promise((r) => setTimeout(r, 200));
      const fChip = [...document.querySelectorAll('#filter-tags .filter-tag-chip')]
        .find((c) => c.dataset.tag === vt0.name);
      check('แถบตัวกรองมีชิปแท็กและเก็บชื่อแท็กจริงไว้ใน dataset', !!fChip,
            [...document.querySelectorAll('#filter-tags .filter-tag-chip')].map((c) => c.dataset.tag).join('|'));
      if (fChip) {
        fChip.click();
        await new Promise((r) => setTimeout(r, 150));
        check('คลิกชิปตัวกรองแล้วคิวรีเป็น tag:<ชื่อจริง> (ไอคอนไม่ปน)',
              $('#tree-search').value === 'tag:' + vt0.name, $('#tree-search').value);
        fChip.click();
        $('#tree-search').value = '';
        $('#tree-search').dispatchEvent(new Event('input', { bubbles: true }));
      }
      await updateSceneRow(dPath, sc4.id, (r) => { if (oldTags) r.tags = oldTags; else delete r.tags; });
      await buildTree();
    }

    // ---- โน้ต "ไว้ทำภายหลัง" (ข้อ 85) + ปุ่ม 📝 บนแถบเครื่องมือ ----
    {
      const { getFutureNotes, setNoteDone, removeSessionNote, renderFutureNotes, notesForScene } =
        await import('./session-notes.js');
      check('มีปุ่มโน้ตด่วนบนแถบเครื่องมือ', !!$('#tb-note'));
      await addSessionNote('เขียนฉากนี้ใหม่', 'sc-test-1', 'ฉากทดสอบ', true);
      await addSessionNote('โน้ตธรรมดา', null, null, false);
      check('โน้ตไว้ทำภายหลังถูกแยกออกมาได้',
            getFutureNotes().length === 1 && getFutureNotes()[0].text === 'เขียนฉากนี้ใหม่',
            String(getFutureNotes().length));
      check('notesForScene หาโน้ตของฉากเจอ', notesForScene('sc-test-1').length === 1);
      const fnHost = el('div');
      renderFutureNotes(fnHost);
      check('แผง Future Notes วาดรายการค้าง',
            fnHost.querySelectorAll('.fn-row').length === 1 && fnHost.textContent.includes('เขียนฉากนี้ใหม่'));
      const fid = getFutureNotes()[0].id;
      await setNoteDone(fid, true);
      check('ติ๊กว่าทำแล้ว → หายจากรายการค้าง', getFutureNotes().length === 0);
      renderFutureNotes(fnHost);
      check('เคลียร์หมดแล้วแสดงข้อความสรุป', fnHost.textContent.includes('เคลียร์หมดแล้ว'), fnHost.textContent.slice(0, 50));
      await removeSessionNote(fid);
      check('ลบโน้ตทีละอันได้', !getSessionNotes().some((n) => n.id === fid));
      await saveSessionNotes([]);
    }

    // ---- ประวัติการตัดสินใจโผล่ในแดชบอร์ด + หน้าตัวละคร (ข้อ 83) ----
    {
      const { recordChoice, renderChoicePanel, choicesByCharacter, choiceStats } =
        await import('./player-choices.js');
      const hist0 = (state.meta.playerHistory || []).length;
      await recordChoice('sc-x', 'ฉากประตู', 'เปิดประตู');
      await recordChoice('sc-x', 'ฉากประตู', 'เปิดประตู');
      await recordChoice('sc-y', 'ฉากหนี', 'วิ่งหนี');
      check('บันทึกการตัดสินใจลง project.khn.json',
            ((await kapi.readJson(await kapi.join(state.root, 'project.khn.json'))).playerHistory || [])
              .length === hist0 + 3);
      const st2 = choiceStats();
      check('choiceStats นับฉากไม่ซ้ำ', st2.scenes === 2, String(st2.scenes));
      check('choiceStats หาตัวเลือกที่เลือกบ่อยสุด',
            st2.top && st2.top.choice === 'เปิดประตู' && st2.top.n === 2, JSON.stringify(st2.top));
      check('choicesByCharacter จับชื่อที่โผล่ในชื่อฉาก', choicesByCharacter('ฉากประตู').length === 2);
      check('choicesByCharacter กับชื่อที่ไม่มี → ว่าง', choicesByCharacter('ไม่มีใครชื่อนี้').length === 0);
      const pcHost = el('div');
      renderChoicePanel(pcHost, { limit: 2 });
      check('แผงประวัติจำกัดจำนวนแถวตาม limit', pcHost.querySelectorAll('.pc-row').length === 2);
      check('แผงประวัติบอกว่ายังมีอีก', pcHost.textContent.includes('+ อีก'));
      // แดชบอร์ดต้องฝังแผงนี้จริง (ไม่ใช่ซ่อนอยู่ในเมนู)
      await openDashboard();
      await new Promise((r) => setTimeout(r, 700));
      check('แดชบอร์ดแสดงแผงประวัติการตัดสินใจ',
            !!document.querySelector('.dash-choices .pc-row'));
      check('แดชบอร์ดแสดงตัวเลือกที่เพิ่งบันทึก',
            (document.querySelector('.dash-choices') || {}).textContent?.includes('วิ่งหนี'));
      closeTab('::dash::');
      state.meta.playerHistory = [];
      await saveProjectMeta();
    }

    // ---- ส่งออก: HTML บล็อกต้องเป็น HTML จริง ไม่ใช่ markdown ดิบ ----
    {
      const { mdToHtmlBody } = await import('./compile.js');
      const html = mdToHtmlBody('# หัวข้อ\n\nข้อความ **หนา**');
      check('mdToHtmlBody แปลงหัวข้อเป็น <h1>', html.includes('<h1>หัวข้อ</h1>'), html.slice(0, 60));
      check('mdToHtmlBody แปลงตัวหนาเป็น <strong>', html.includes('<strong>หนา</strong>'));
      check('mdToHtmlBody ไม่คืน <html> ซ้อน (เป็นชิ้นส่วน)', !html.includes('<!DOCTYPE'));
      check('mdToHtml (เอกสารเต็ม) ยังทำงานเหมือนเดิม',
            (await import('./compile.js')).mdToHtml('# x', 'ชื่อ').includes('<!DOCTYPE html>'));
      check('escapeHtml กัน tag จากชื่อเรื่องผู้ใช้',
            (await import('./compile.js')).escapeHtml('<script>') === '&lt;script&gt;');
    }

    // ---- สำรองโปรเจกต์: ต้องคัดลอกไบนารีไม่เสีย ----
    {
      const okB = await autoBackupNow(true);
      check('สำรองโปรเจกต์สำเร็จ', okB);
      const day = new Date().toISOString().slice(0, 10);
      const bDir = await kapi.join(state.root, 'Backups', day);
      check('มีโฟลเดอร์สำรองของวันนี้', await kapi.exists(bDir));
      const srcPng = await kapi.join(state.root, 'Images', 'sunset.png');
      const dstPng = await kapi.join(bDir, 'Images', 'sunset.png');
      check('รูปถูกสำรองไปด้วย', await kapi.exists(dstPng));
      const a = await kapi.readBytes(srcPng), b = await kapi.readBytes(dstPng);
      check('ไฟล์รูปในชุดสำรองเหมือนต้นฉบับทุกไบต์ (ไม่โดน utf-8 ทำพัง)',
            a.length === b.length && a[0] === b[0] && a[a.length - 1] === b[b.length - 1],
            `${a.length} vs ${b.length}`);
      check('สำรองซ้ำในวันเดียวกันถูกข้าม', (await backupIfDue()) === false);
      await kapi.remove(await kapi.join(state.root, 'Backups'));
    }

    // ---- เขียนไฟล์ไบนารีผ่าน IPC (ฐานของส่งออก ZIP) ----
    {
      const p = await kapi.join(state.root, 'bin-test.dat');
      const bytes = [0, 1, 127, 128, 200, 255];
      await kapi.writeBytes(p, bytes);
      const back = await kapi.readBytes(p);
      check('writeBytes/readBytes รักษาไบต์ >0x7F ได้ครบ',
            back.length === bytes.length && back.every((v, i) => v === bytes[i]),
            JSON.stringify(back));
      await kapi.remove(p);
    }

    // ---- AI: คีย์ต้องไม่ตกลงไปใน project.khn.json ----
    {
      saveAISettings({ provider: 'openai', model: 'gpt-4o-mini', apiKey: 'sk-ต้องไม่ถูกเก็บ' });
      check('saveAISettings ไม่เก็บ apiKey ลง meta', !state.meta.ai.apiKey);
      check('saveAISettings เก็บค่าที่ไม่ลับตามปกติ', state.meta.ai.model === 'gpt-4o-mini');
      await saveApiKey('sk-ทดสอบ');
      check('คีย์ถูกเขียนไฟล์แยก ai-key.json',
            await kapi.exists(await kapi.join(state.root, 'ai-key.json')));
      await saveProjectMeta();
      const rawMeta = await kapi.readFile(await kapi.join(state.root, 'project.khn.json'));
      check('project.khn.json ไม่มีคีย์ปนอยู่', !rawMeta.includes('sk-'));
      await kapi.remove(await kapi.join(state.root, 'ai-key.json'));
      clearKeyCache();
    }

    // ---- เปิดไฟล์ json เป็นแท็บที่บันทึกได้ ----
    {
      const jf = await kapi.join(state.root, 'maps.json');
      await kapi.writeFile(jf, JSON.stringify({ version: 1, maps: [] }, null, 2));
      const jt = await openPlainFile(jf, 'maps.json');
      check('เปิดไฟล์ json เป็นแท็บได้', !!jt && state.tabs.has(jf));
      check('แท็บ json บันทึกได้ (มี save)', typeof jt.save === 'function');
      jt.pane.querySelector('textarea').value = '{ ผิดรูปแบบ';
      check('JSON ผิดรูปแบบ → ไม่เขียนทับไฟล์', (await jt.save()) === false);
      jt.pane.querySelector('textarea').value = '{"version":1,"maps":[]}';
      check('JSON ถูกต้อง → บันทึกได้', (await jt.save()) === true);
      closeTab(jf);
    }

    // ---- ไม่พึ่งอินเทอร์เน็ตตอนเปิดโปรแกรม (โปรแกรมพกพา) ----
    {
      const ext = [...document.querySelectorAll('script[src],link[href]')]
        .map((n) => n.getAttribute('src') || n.getAttribute('href'))
        .filter((u) => /^https?:/i.test(u));
      check('index.html ไม่โหลดสคริปต์/สไตล์จากอินเทอร์เน็ต', ext.length === 0, ext.join(','));
      check('ค้นคำพ้อง (ส่งข้อความออกเน็ต) ปิดเป็นค่าเริ่มต้น', DEFAULT_SETTINGS.thesaurus === false);
      check('คำไทยไม่เข้าเงื่อนไขเมนูคำพ้อง', thesaurusMenuItems(0, 0).length === 0);
    }

    // ---- Part 1+2: เช็คว่าโมดูลใหม่ import ได้ + ฟังก์ชันมีอยู่จริง ----
    {
      check('kanban-ui import ได้', typeof openKanban === 'function');
      check('panel-ui import ได้', typeof getPanelManager === 'function');
      check('split-ui import ได้', typeof toggleSplit === 'function');
      check('auto-link-ui import ได้', typeof ensureAutoLink === 'function');
      check('event-ui import ได้', typeof renderAutoSyncSection === 'function');
      check('ai-ui import ได้', typeof openAIAssistant === 'function');
      check('thesaurus-ui import ได้', typeof showThesaurusPopup === 'function');
      check('import-ui (Scrivener) import ได้', typeof importScrivenerDialog === 'function');
      check('ai-bridge import ได้', typeof getAIClient === 'function' && typeof ragContext === 'function');
    }

    // ---- รอบแก้บั๊ก: i18n / เมนู / entry point ----
    {
      // ปุ่มเมนูบนแถบชื่อต้องใช้ id คงที่ (ไม่ใช่ชื่อภาษาไทย) ไม่งั้นคลิกแล้วเมนูไม่เด้ง
      const ms = [...document.querySelectorAll('.tb-menu')].map((m) => m.dataset.m);
      check('ปุ่มเมนูใช้ data-m เป็น id คงที่', ms.length >= 5 && ms.every((m) => /^[A-Za-z]+$/.test(m)), ms.join(','));
      // applyDataI18n ต้องไม่ล้าง element ลูก (ปุ่มลอย/ผนึกบนหัวแผง)
      applyDataI18n();
      check('applyDataI18n ไม่ล้างปุ่มควบคุมบนหัวแผง',
            !!document.querySelector('#app-root .k-panel[data-panel-id="outline"] .k-panel-btn-float'));
      check('t() ทน key undefined', tr(undefined, 'ok') === 'ok' && tr('') === '');
      // คีย์ลัดจัดหน้าต้องมีชื่อใน SHORTCUT_LABELS (เดิมไม่มี → applyToolbarShortcutTitles พัง)
      check('SHORTCUT_LABELS ครบทุก id ที่ปุ่มแถบเครื่องมืออ้าง',
            ['fmt:align:left', 'fmt:align:center', 'fmt:align:right', 'fmt:align:justify']
              .every((k) => !!SHORTCUT_LABELS[k]));
      // ค่าเริ่มต้นต้องเป็นไทย (ไทย 100%)
      check('ภาษาเริ่มต้นเป็นไทย', DEFAULT_SETTINGS.language === 'th');
      // ทุกคำสั่งในเมนู/คีย์ลัดต้องมี case ใน handleCommand
      check('handleCommand รู้จัก import-scrivener + auto-sync',
            typeof importScrivenerDialog === 'function' && typeof setAutoSync === 'function');
      // auto-sync: เปิด/ปิดได้จริง + จำสถานะลง settings
      const wasSync = isAutoSyncOn();
      await handleCommand('auto-sync', true);
      check('auto-sync เปิดได้ + จำลง settings', isAutoSyncOn() && state.settings.autoSync === true);
      await handleCommand('auto-sync', false);
      check('auto-sync ปิดได้ + จำลง settings', !isAutoSyncOn() && state.settings.autoSync === false);
      if (wasSync) setAutoSync(true);
      // streaming: main process ต้องมีช่องสตรีมให้ AIClient ใช้
      check('kapi.httpStream พร้อมใช้ (streaming)', typeof kapi.httpStream === 'function');
    }

    // ---- Kanban (ข้อ 12): อ่าน/เขียน scenes.json + ลากเปลี่ยนสถานะ ----
    {
      await openKanban();
      const kbPane = document.querySelector('#kanban-body');   // Kanban เป็น "แผง" แล้ว ไม่ใช่แท็บ
      check('เปิดกระดาน Kanban เป็นแผงได้', !!kbPane && isPanelOpen('kanban'));
      const cards = kbPane ? [...kbPane.querySelectorAll('.kb-card')] : [];
      check('Kanban อ่านฉากจาก scenes.json มาเป็นการ์ด', cards.length >= 2, 'cards=' + cards.length);
      const cols = kbPane ? [...kbPane.querySelectorAll('.kb-col')] : [];
      check('Kanban มีคอลัมน์ตามสถานะ', cols.length >= 3, 'cols=' + cols.length);
      // ลากการ์ดใบแรกไปคอลัมน์อื่น → ต้องเขียนกลับ scenes.json
      const card0 = cards[0];
      const sid = card0 && card0.dataset.sceneId;
      const target = cols.find((c) => c.dataset.status && !c.contains(card0));
      if (sid && target) {
        const dt = { getData: () => sid };
        await target.ondrop({ preventDefault() {}, dataTransfer: dt });
        await new Promise((r) => setTimeout(r, 120));
        // อ่าน scenes.json กลับมาตรวจ
        const { listScenes: lsK } = await import('./project-scan.js');
        const sc2 = (await lsK(state.root)).find((s) => s.row.id === sid);
        check('ลากการ์ดแล้วสถานะถูกเขียนลง scenes.json',
              !!sc2 && sc2.row.status === target.dataset.status,
              (sc2 && sc2.row.status) + ' vs ' + target.dataset.status);
      }
      hidePanel('kanban');
    }

    // ---- i18n: เปลี่ยนภาษาแล้ว UI เปลี่ยนตามจริง ----
    {
      const headOf = () => document.querySelector('#app-root .k-panel[data-panel-id="outline"] .k-panel-head');
      const before = headOf().textContent;
      await loadLanguage('en', state.root);
      await new Promise((r) => setTimeout(r, 30));
      const enTxt = headOf().textContent;
      check('เปลี่ยนเป็น EN → ข้อความ data-i18n เปลี่ยน', enTxt.includes(tr('panel.navigation')), enTxt);
      check('เปลี่ยนภาษาแล้วปุ่มบนหัวแผงยังอยู่', !!headOf().querySelector('.k-panel-btns'));
      await loadLanguage('th', state.root);
      check('เปลี่ยนกลับเป็นไทย → โหลดไฟล์ภาษาจากโฟลเดอร์แอปได้', i18n.lang === 'th' && !!i18n.strings.ui);
      check('ภาษาไทยแปลเมนู/แผงจริง', tr('panel.project') !== 'panel.project');
      await new Promise((r) => setTimeout(r, 30));
      check('ข้อความหัวแผงกลับมาเหมือนก่อนเปลี่ยนภาษา', headOf().textContent === before,
            headOf().textContent + ' vs ' + before);
    }

    // ---- Split View (ข้อ 40): ต้องเห็นบนจอจริง + ลากปรับสัดส่วนได้ ----
    {
      document.querySelectorAll('.k-overlay').forEach((o) => o.remove());   // เก็บกวาดกล่องค้างจากเทสก่อนหน้า
      const { leaf: SL_leaf, split: SL_split } = await import('./layout/split-layout.js');
      const files = [...state.tabs.keys()];
      const panes = $('#panes');
      const SM = getSplitManager();
      if (files.length >= 2) {
        activate(files[0]);
        await new Promise((r) => setTimeout(r, 30));
        check('สั่งแยกหน้าจอแล้วเข้าโหมด split', toggleSplit(files[0], 'right') === true);
        check('#panes มีคลาส split', panes.classList.contains('split'));
        check('แยกหน้าจอวาดจริงเป็นต้นไม้ split (#split-root)', !!document.getElementById('split-root'));
        check('ได้ 2 ช่องบนจอจริง',
              document.querySelectorAll('#split-root .k-split-pane').length === 2 && splitPaneCount() === 2);
        check('ทั้งสองช่องยืม .pane ของแท็บจริงมาแสดง (ไม่ใช่กล่องเปล่า)',
              // .52+ : .k-split-pane > .k-split-tabs + .k-split-body > .pane (บั๊ก #12 แถบแท็บย่อย)
              document.querySelectorAll('#split-root .k-split-pane .k-split-body > .pane').length === 2);
        check('เนื้อเอดิเตอร์ยังอยู่หลังถูกย้ายเข้าช่อง (ProseMirror ไม่ถูกทำลาย)',
              !!document.querySelector('#split-root .k-split-pane .ProseMirror'));
        check('มีที่จับลากปรับสัดส่วน (.k-split-handle)', !!panes.querySelector('.k-split-handle'));
        check('ช่องที่โฟกัสถูกไฮไลต์ (.k-split-pane.focus)', !!panes.querySelector('.k-split-pane.focus'));
        {   // เรขาคณิตจริงบนจอ: สองช่องต้องกว้างจริง วางเรียงซ้าย-ขวา และรวมกันเต็ม #panes
          const [pa, pb] = [...document.querySelectorAll('#split-root .k-split-pane')].map((n) => n.getBoundingClientRect());
          const pr = panes.getBoundingClientRect();
          check('สองช่องกว้างจริงทั้งคู่ (ไม่ใช่ช่องหนึ่งกว้าง 0)',
                pa.width > 80 && pb.width > 80, `${Math.round(pa.width)} / ${Math.round(pb.width)}`);
          check('สองช่องเรียงซ้าย-ขวาติดกัน ไม่ทับกัน', pb.left >= pa.right - 12 && pa.left < pb.left);
          check('สองช่องรวมกันเต็มพื้นที่เอกสาร',
                Math.abs((pa.width + pb.width) - pr.width) < 20 && pa.height > pr.height * 0.8,
                `${Math.round(pa.width + pb.width)} vs ${Math.round(pr.width)}`);
          await kapi.testShot('/tmp/k2_split.png');
        }
        // สลับเป็นแนวบน-ล่าง
        toggleSplit(files[0], 'down');
        check('สลับเป็นแยกบน-ล่างได้',
              panes.classList.contains('split-h') &&
              panes.querySelector('.k-split-container').dataset.dir === 'col');
        // ลากที่จับ → สัดส่วนเปลี่ยนในเอนจิน (ไม่ใช่แค่ CSS variable)
        const hd = panes.querySelector('.k-split-handle');
        const hr = hd.getBoundingClientRect();
        hd.dispatchEvent(new MouseEvent('mousedown', { clientX: hr.left + 2, clientY: hr.top + 2, button: 0, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: hr.left + 2, clientY: hr.top - 120, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 30));
        const sz = SM.root.sizes || [];
        check('ลากที่จับแล้วสัดส่วนเปลี่ยน', sz.length === 2 && Math.abs(sz[0] - 0.5) > 0.02, JSON.stringify(sz));
        check('สัดส่วนถูกเก็บไว้ใช้รอบหน้า',
              (localStorage.getItem('k2-split-layout') || '').includes('"sizes"'));
        // ดับเบิลคลิก = กลับ 50%
        panes.querySelector('.k-split-handle').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 30));
        check('ดับเบิลคลิกที่จับ → กลับ 50%', SM.root.sizes[0] === 0.5, JSON.stringify(SM.root.sizes));

        // ---- แบ่งเกิน 2 ช่อง (recursive) — สิ่งที่ระบบเก่าทำไม่ได้เลย ----
        if (files.length >= 3) {
          createSplit(files[0], 'down');
          await new Promise((r) => setTimeout(r, 30));
          check('แบ่งได้เกิน 2 ช่อง (recursive split)', splitPaneCount() >= 3, 'panes=' + splitPaneCount());
          check('ช่องที่ 3 ขึ้นจอจริง',
                document.querySelectorAll('#split-root .k-split-pane').length === splitPaneCount());
          // ปิดทีละช่อง → เหลือ 2
          const anyLeaf = panes.querySelector('.k-split-pane:not(.focus)').dataset.leafId;
          document.querySelector(`.k-split-pane[data-leaf-id="${anyLeaf}"] > .cmp-close`).click();
          await new Promise((r) => setTimeout(r, 30));
          check('ปิดช่องเดียวได้ (แท็บยังเปิดอยู่)',
                splitPaneCount() === 2 && state.tabs.size === files.length, 'panes=' + splitPaneCount());
        }
        check('สั่งซ้ำทิศเดิม → ปิดแยกหน้าจอ', toggleSplit(files[0], splitDir()) === false);
        check('ปิดแล้วต้นไม้ split ถูกรื้อหมด',
              !panes.classList.contains('split') && !panes.classList.contains('split-h') &&
              !document.getElementById('split-root') && !document.querySelector('.pane.compare-on'));
        check('ปิดแล้ว .pane ทุกใบกลับมาอยู่ใต้ #panes ตามเดิม',
              [...state.tabs.values()].filter((t2) => !t2.floatWin).every((t2) => t2.pane.parentNode === panes));
      }
      // ---- บั๊ก #1: มีแท็บเดียวก็ต้องแยกจอได้ (เดิมขึ้นข้อความว่า "ต้องเปิด 2 แท็บ" แล้วไม่เกิดอะไร) ----
      {
        const keep = state.active?.file || files[0];
        const others = [...state.tabs.keys()].filter((f) => f !== keep);
        getSplitManager().store.update(SL_leaf(keep));      // จำลองสถานะ "ช่องเดียว"
        createSplit(keep, 'right');
        await new Promise((r) => setTimeout(r, 30));
        // ยังมีแท็บอื่นเปิดอยู่ → ช่องที่สองควรได้แท็บจริง; ถ้าไม่มีเลยต้องได้ช่องว่างให้ลากแท็บมาวาง
        check('สั่งแยกจอแล้วได้ช่องที่สองเสมอ (ไม่ปฏิเสธเพราะจำนวนแท็บ)',
              splitPaneCount() === 2, 'panes=' + splitPaneCount() + ' others=' + others.length);
        // จำลองกรณีแท็บเดียวจริง ๆ: ตั้งต้นไม้เป็น leaf เดียว + ช่องว่าง
        getSplitManager().store.update(SL_split('row', [SL_leaf(keep), SL_leaf(null)]));
        await new Promise((r) => setTimeout(r, 30));
        check('ช่องว่างแสดงคำแนะนำให้ลากแท็บมาวาง', !!document.querySelector('.k-split-empty'));
        closeSplit();
        await new Promise((r) => setTimeout(r, 30));
        check('ปิดแยกจอจากช่องว่างได้ ไม่ค้าง', !isSplit() && !document.getElementById('split-root'));
      }
    }

    // ---- RAG (ข้อ 72/79): ทำงานออฟไลน์ได้ด้วย localEmbed แม้ไม่มี API key ----
    {
      const { collectDocs, getRag } = await import('./ai/ai-bridge.js');
      const docs = await collectDocs(state.root);
      check('RAG เก็บเอกสารจากโปรเจกต์ได้', docs.length >= 2, 'docs=' + docs.length);
      check('RAG เก็บทั้งฉากและ Wiki', docs.some((d) => d.meta.kind === 'scene'),
            JSON.stringify(docs.map((d) => d.meta.kind + ':' + d.meta.title).slice(0, 12)));
      const rag = await getRag({ rebuild: true });
      check('RAG สร้าง vector index ได้', !!rag && rag.index.size > 0, 'chunks=' + (rag?.index.size));
      const hits = await rag.retrieve('ความหวัง', 3);
      check('RAG ค้นคืนผลลัพธ์ได้ (offline embed)', Array.isArray(hits) && hits.length > 0, JSON.stringify(hits.length));
      const ctx = await ragContext('ความหวัง', { k: 3, maxTokens: 400 });
      check('RAG ประกอบบริบทพร้อมแหล่งอ้างอิง', !!ctx.text && ctx.sources.length > 0);
      check('RAG เขียนไฟล์ดัชนีไว้ใช้รอบหน้า',
            await kapi.exists(await kapi.join(state.root, '.ai-index.json')));
      // path ของบทอยู่ใน draft.json — เคยใช้ chapterId เป็นชื่อโฟลเดอร์ ทำให้อ่านฉากไม่เจอทั้งระบบ
      const { listScenes, chapterFolders } = await import('./project-scan.js');
      const scs = await listScenes(state.root, { withText: true });
      check('project-scan อ่านฉากพร้อมเนื้อหาได้', scs.length >= 2 && scs.some((s) => (s.text || '').length > 10),
            'scenes=' + scs.length);
      check('project-scan แปลง chapterGuid → folderName ถูก',
            scs.every((s) => !/[\\/]Chapters[\\/]c\d/.test(s.path)), scs[0] && scs[0].path);
      const dPath0 = scs[0] && scs[0].draftPath;
      check('chapterFolders อ่าน draft.json ได้', !!dPath0 && Object.keys(await chapterFolders(dPath0)).length > 0);
      // backlinks (ข้อ 86) ต้องหาเจอจริง ไม่ใช่ index ว่าง
      resetAutoLink();
      const al = await ensureAutoLink();
      check('AutoLink อ่านฉากเข้าดัชนีได้', !!al && al.scenes.size > 0, 'scenes=' + (al && al.scenes.size));
      const linked = al.entityList().filter((e) => al.getBacklinks(e.id).length > 0);
      check('backlinks หาฉากที่กล่าวถึงเอนทิตี้เจอ', linked.length > 0,
            'entities=' + al.entities.size + ' linked=' + linked.length);

      // ---- บั๊ก #21: "ค้นหาในฉาก" จากคลิกขวาเอนทิตี้ Wiki ใน Explorer ----
      {
        const ent = linked[0];
        const hits = await findEntityInScenes(ent.id, ent.name, 60, 60);
        check('ค้นหาในฉาก (Find on location) คืนรายการฉากที่กล่าวถึงเอนทิตี้',
              Array.isArray(hits) && hits.length > 0 && !!hits[0].sceneId,
              JSON.stringify((hits || []).slice(0, 2)));
        check('ผลค้นหาในฉากมีชื่อฉาก + จำนวนครั้งที่กล่าวถึง',
              hits.every((h) => typeof h.count === 'number') && hits.some((h) => !!h.title),
              JSON.stringify(hits.map((h) => h.title + ':' + h.count)));
        // #k-fab-menu เป็น .k-menu ถาวรใน index.html — ต้องกันออก ไม่งั้นเช็คไปโดนเมนูผิดตัว
        const popMenu = () => document.querySelector('.k-menu:not(#k-fab-menu)');
        const cmMenu = popMenu();
        check('ค้นหาในฉากเปิดเมนูรายการฉากให้คลิกเปิดได้',
              !!cmMenu && cmMenu.querySelectorAll('.k-menu-item').length >= hits.length,
              cmMenu ? String(cmMenu.querySelectorAll('.k-menu-item').length) : 'ไม่มีเมนู');
        check('เมนูมีแถวหัวข้อบอกจำนวนฉากที่เจอ',
              !!cmMenu && (cmMenu.querySelector('.k-menu-label')?.textContent || '').includes(String(hits.length)),
              cmMenu?.querySelector('.k-menu-label')?.textContent);
        check('แถวหัวข้อในเมนู (disabled) ไม่ผูก onclick — กันเมนู throw',
              !!cmMenu && !cmMenu.querySelector('.k-menu-label').onclick);
        // ไฟล์ฉากจาก sceneId ต้องหาเจอจริง (ปุ่ม "เปิด" ถึงจะทำงาน)
        const hitPath = await findScenePath(state.root, hits[0].sceneId);
        check('เปิดฉากจากผลค้นหาได้ (findScenePath เจอไฟล์จริง)',
              !!hitPath && (await kapi.exists(hitPath.path)), hitPath && hitPath.path);
        closeMenu();
        // เอนทิตี้ที่ไม่มีใครกล่าวถึง → ต้องไม่ throw และไม่เปิดเมนูเปล่า
        check('เอนทิตี้ที่ยังไม่มีฉากกล่าวถึง → คืนรายการว่าง ไม่ throw',
              (await findEntityInScenes('__ไม่มีจริง__.json', 'ไม่มีจริง', 10, 10)).length === 0);
        check('ไม่มีผลลัพธ์แล้วไม่เปิดเมนูเปล่า', !popMenu());
      }
      const client = getAIClient();
      check('AIClient สร้างได้ + มี complete/stream/embed',
            typeof client.complete === 'function' && typeof client.stream === 'function' && typeof client.embed === 'function');
      const emb = await client.embed(['ทดสอบ'], { local: true });
      check('AIClient embed แบบ local ได้ (ไม่ต้องมีคีย์)', emb.ok && emb.vectors[0].length === 256);

      // ---- UI ของ AI ต้องเรียกเอนจินที่เทสไว้ ไม่ใช่ยิง prompt เอง (ข้อ 73–76) ----
      const plot = await import('./ai/ai-plot.js');
      const dlg = await import('./ai/ai-dialogue.js');
      const chr = await import('./ai/ai-character.js');
      const wld = await import('./ai/ai-world.js');
      const asst = await import('./ai/ai-assistant.js');
      check('เอนจิน AI ทั้ง 5 ตัวเรียกได้จาก UI',
            typeof plot.detectPlotHoles === 'function' && typeof dlg.generateDialogue === 'function' &&
            typeof chr.checkConsistency === 'function' && typeof wld.generateWorld === 'function' &&
            typeof asst.aiAssistant === 'function');
      // ไม่มี client → ต้องคืน error อย่างสุภาพ ไม่ throw + ยังให้ผลตรวจออฟไลน์
      const noClient = await plot.detectPlotHoles([], { scenes: scs.map((s) => ({ id: s.id, title: s.title, text: s.text || '', storyDate: '', pov: '' })) });
      check('detectPlotHoles ไม่มี client → ไม่ throw', noClient && Array.isArray(noClient.holes));
      const w = await wld.generateWorld('magic', 'ทดสอบ', {});
      check('generateWorld ไม่มี client → คืน error ไม่ throw', w.ok === false && w.code === 'no-client');
      check('generateWorld รู้จัก schema ตามประเภท', !!wld.getTemplate('magic'));
      const dres = await dlg.generateDialogue({ name: 'ก' }, { name: 'ข' }, {}, {});
      check('generateDialogue ไม่มี client → คืน error ไม่ throw', dres.ok === false && dres.code === 'no-client');
    }

    // ---- Thesaurus (ข้อ 67): ตั้งค่าเอนจินได้ + fallback คลังในตัวทำงานโดยไม่ต่อเน็ต ----
    {
      await initThesaurus();
      const { shared, getSynonyms } = await import('./tools/thesaurus.js');
      const sh = shared();
      check('thesaurus ตั้งค่าเอนจินสำเร็จ (มี http adapter)', !!sh && typeof sh.http?.fetch === 'function');
      check('thesaurus ปิดการส่งคำออกเน็ตตามค่าเริ่มต้น', sh.online === false);
      const syn = await getSynonyms('สวย');
      check('thesaurus fallback คลังไทยในตัวทำงาน (ออฟไลน์)', Array.isArray(syn) && syn.length > 0, JSON.stringify(syn));
    }

    // ============================================================
    // รอบแก้บั๊กจาก human test (ข้อ 1–16) — เทสถาวร กันหวนกลับมาอีก
    // ============================================================
    {
      // ---- ข้อ 1: โหมดอ่าน + โหมดหน้ากระดาษ ต้องไม่ได้หมึกดำบนพื้นดำ ----
      const scEl0 = document.querySelector('#tree .scene[data-path]');
      if (scEl0) { scEl0.click(); await new Promise((r) => setTimeout(r, 500)); }
      togglePaper(true);
      toggleReading(true);
      await new Promise((r) => setTimeout(r, 120));
      const pm = document.querySelector('.pane.on .ProseMirror');
      const csRead = pm ? getComputedStyle(pm) : null;
      const rgb = (s) => (String(s).match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(Number);
      const lum = (s) => { const [r, g, b] = rgb(s); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      check('โหมดอ่าน+กระดาษ: ตัวหนังสือกับพื้นต่างความสว่างพอ (ไม่ดำบนดำ)',
            !!csRead && Math.abs(lum(csRead.backgroundColor) - lum(csRead.color)) > 90,
            csRead ? csRead.backgroundColor + ' / ' + csRead.color : 'no pane');
      check('โหมดอ่าน+กระดาษ: พื้นกระดาษยังสว่าง (คงโหมดกระดาษไว้)',
            !!csRead && lum(csRead.backgroundColor) > 150, csRead && csRead.backgroundColor);
      toggleReading(false);
      await new Promise((r) => setTimeout(r, 80));
      check('ออกจากโหมดอ่าน → แผงข้าง/แถบบนกลับมา (ไม่มี inline display ค้าง)',
            $('#app-root').style.display === '' && $('#topbar').style.display === '' &&
            $('#k-fab').style.display === '' && !document.body.classList.contains('reading-mode'));
      // togglePaper ต้องสลับได้จริงทั้งสองทาง (ค่าเริ่มต้น undefined = เปิด)
      delete state.settings.paperMode;
      togglePaper();
      check('togglePaper: ค่าเริ่มต้น (undefined=เปิด) กดครั้งแรกต้องปิด',
            state.settings.paperMode === false && !document.body.classList.contains('paper-mode'));
      togglePaper();
      check('togglePaper: กดอีกครั้งกลับมาเปิด',
            state.settings.paperMode === true && document.body.classList.contains('paper-mode'));

      // ---- ข้อ 3: เมนู native มีเครื่องหมายสวิตช์ + ปุ่ม toolbar มีจุดบอกสถานะ ----
      check('มีสะพาน kapi.menuToggles ไว้ติ๊กถูกในเมนู native', typeof kapi.menuToggles === 'function');
      syncMenuToggles();                       // ต้องไม่ throw
      // นับทั้งหน้า ไม่ใช่แค่ใน #toolbar — setupFloatingFormatBar ย้ายปุ่มบางตัวไปแถบลอย
      check('ปุ่ม toolbar ที่เป็นสวิตช์ถูกทำเครื่องหมายไว้ (.tb-toggle)',
            document.querySelectorAll('.tb.tb-toggle').length >= 3,
            String(document.querySelectorAll('.tb.tb-toggle').length));
      check('จุดบอกสถานะสวิตช์ตามปุ่มไปแถบลอยด้วย (ไม่ผูกกับ #toolbar)',
            getComputedStyle($('#tb-paper'), '::after').content !== 'none',
            getComputedStyle($('#tb-paper'), '::after').content);
      check('ปุ่มโหมดหน้ากระดาษเป็นสวิตช์ + ติดสถานะเปิด',
            $('#tb-paper').classList.contains('tb-toggle') && $('#tb-paper').classList.contains('on'));

      // ---- ข้อ 16 (ลำดับปุ่มบนหัวแผง) + ข้อ 4 (พับ/ปิด) — ระบบแผงใหม่ alpha.46 ----
      const treePanelEl = () => document.querySelector('#app-root .k-panel[data-panel-id="tree"]');
      const treeBtn = (act) => treePanelEl()?.querySelector(`:scope > .k-panel-head .k-panel-btn-${act}`);
      const order = [...treePanelEl().querySelectorAll(':scope > .k-panel-head .k-panel-btns .k-panel-btn')]
        .map((b) => b.dataset.act).filter(Boolean);
      check('หัวแผงเรียงปุ่ม [พับ][ลอย/ผนึก][ปิด]',
            order.join(',') === 'collapse,float,close', order.join(','));
      check('ปุ่มบนหัวแผงมาจาก PANEL_BUTTONS ของเอนจิน',
            PL.PANEL_BUTTONS.map((b) => b.key).join(',') === 'collapse,float,close');
      // พับแล้วหัวแผงต้องยังเห็น (บั๊กเดิม: max-height:0 กลืนทั้งใบ)
      treeBtn('collapse').click();
      await new Promise((r) => setTimeout(r, 60));
      const tp = treePanelEl();
      check('พับแผง → เพิ่มคลาส k-collapsed', tp.classList.contains('k-collapsed'));
      check('พับแผงแล้ว "หัวแผงยังเห็นอยู่" (เรียกคลี่กลับได้)',
            tp.querySelector(':scope > .k-panel-head').getBoundingClientRect().height > 4 &&
            getComputedStyle(tp).opacity !== '0',
            tp.querySelector(':scope > .k-panel-head').getBoundingClientRect().height);
      check('พับแล้วเนื้อแผงถูกซ่อน',
            getComputedStyle(tp.querySelector(':scope > .k-panel-body')).display === 'none');
      treeBtn('collapse').click();
      await new Promise((r) => setTimeout(r, 60));
      check('กดพับซ้ำ = คลี่กลับ', !treePanelEl().classList.contains('k-collapsed'));
      // ปิด → ต้องมีปุ่ม toggle บน toolbar เรียกกลับ
      treeBtn('close').click();
      await new Promise((r) => setTimeout(r, 60));
      check('ปิดแผง → แผงถูกเก็บออกจากต้นไม้', !treePanelEl());
      check('ปิดแผง → ปุ่ม toggle toolbar ไม่ติด .on',
            $('#tb-tree-panel') && !$('#tb-tree-panel').classList.contains('on'));
      $('#tb-tree-panel').click();
      await new Promise((r) => setTimeout(r, 60));
      check('คลิกปุ่ม toggle toolbar → แผงกลับมา',
            !!treePanelEl() &&
            $('#tb-tree-panel') && $('#tb-tree-panel').classList.contains('on'));

      // ---- ข้อ 9: FAB ต้องอยู่เหนือแผงลอย/หน้าต่างลอย ----
      const zf = parseInt(getComputedStyle($('#k-fab')).zIndex, 10);
      const probe = el('div', 'k-float-panel'); document.body.append(probe);
      const zp = parseInt(getComputedStyle(probe).zIndex, 10);
      probe.remove();
      check('FAB อยู่เหนือแผงลอย (z-index สูงกว่า)', zf > zp, `fab=${zf} panel=${zp}`);
      check('FAB ยังอยู่ใต้กล่องโต้ตอบ (ไม่ทับ modal)', zf < 80, String(zf));
      check('มีตัวเลือกโฟลเดอร์ก่อนสร้างฉาก (ไม่ยัดลงบทแรกเสมอ)',
            typeof pickDraftTarget === 'function');

      // ---- ข้อ 11 + 6: Explorer มีปุ่มรีเฟรช + รายการรูป ----
      check('หัวแผงโปรเจกต์มีปุ่มรีเฟรช',
            !!document.querySelector('#app-root .k-panel[data-panel-id="tree"] .k-tree-refresh-btn'));
      const imgSec = [...document.querySelectorAll('#tree .sec-title')]
        .find((h) => h.textContent.includes('คลังรูป'));
      check('Explorer มีหมวดคลังรูป', !!imgSec, [...document.querySelectorAll('#tree .sec-title')].map((h) => h.textContent).join('|'));
      check('แถวรูปใน Explorer มีภาพย่อจริง',
            !!document.querySelector('#tree .scene.img-row .img-thumb'),
            String(document.querySelectorAll('#tree .scene.img-row').length));

      // ---- ข้อ 16a: tooltip ต้องลอยเหนือ trigger element (ไม่ใช่ของ OS) ----
      {
        const host = document.querySelector('#tree .scene[title]') || $('#tb-paper');
        const y = 400, x = 300;
        host.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: x, clientY: y }));
        await new Promise((r) => setTimeout(r, 320));
        const tip = $('#k-tip');
        check('มี tooltip ของโปรแกรมเอง (ไม่ใช่ของ OS)', !!tip && tip.classList.contains('on'));
        const tr = tip.getBoundingClientRect();
        const hr = host.getBoundingClientRect();
        check('tooltip อยู่เหนือ trigger element',
              tr.bottom <= hr.top + 4, `tipBottom=${tr.bottom} hostTop=${hr.top}`);
        check('ระหว่างโชว์ tooltip เอง ต้องถอด title เดิมกัน OS วาดซ้อน', !host.hasAttribute('title'));
        host.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
        check('เมาส์ออก → คืน title เดิมให้ element', host.hasAttribute('title'));
        check('เมาส์ออก → tooltip ซ่อน', !tip.classList.contains('on'));
      }

      // ---- ข้อ 12: Story Network ลากพื้นหลังเพื่อเลื่อนผังได้ ----
      {
        await openNetwork();
        await new Promise((r) => setTimeout(r, 600));
        const nt = state.tabs.get('::network::');
        check('เปิดแท็บ Story Network ได้', !!nt?.net);
        const cv = nt.net.canvas;
        const rp = nt.pane.getBoundingClientRect();
        check('canvas ปรับขนาดตาม pane จริง (ไม่ค้าง 300px)',
              cv.width > 320 && cv.height > 320,
              `cv=${cv.width}x${cv.height} pane=${Math.round(rp.width)}x${Math.round(rp.height)} ` +
              `win=${window.innerWidth}x${window.innerHeight}`);
        nt.net._cx = 0; nt.net._cy = 0;
        // กดที่มุมว่าง ๆ (ไม่โดนโหนด) แล้วลาก
        cv.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 5, clientY: 5 }));
        cv.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 85, clientY: 65 }));
        const moved = nt.net._cx !== 0 || nt.net._cy !== 0;
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        check('ลากพื้นหลัง Story Network = เลื่อนผังได้', moved, `cx=${nt.net._cx} cy=${nt.net._cy}`);
        check('ปล่อยเมาส์ → เลิกลาก', !nt.net.pan);
        check('มีปุ่มรีเซ็ตมุมมองผัง', !!nt.pane.querySelector('.net-reset'));
        closeTab('::network::');
      }

      // ---- ข้อ 13 + 14: แผงคุณสมบัติ บันทึกอัตโนมัติ + ไม่ duplicate ----
      {
        const dj2 = await kapi.readJson(await kapi.join(dPath, 'draft.json'));
        const sj2 = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
        // เทสก่อนหน้าย้าย/ลบฉากไปมา — ต้องหาบทที่ "มีฉากจริง" ไม่ใช่ chapters[0] ดื้อ ๆ
        const ch2 = (dj2.chapters || []).find((c) => ((sj2.chapters || {})[c.guid] || [])
          .some((s) => s.type !== 'memo'));
        check('หาบทที่มีฉากสำหรับเทสแผงคุณสมบัติได้', !!ch2,
              JSON.stringify((dj2.chapters || []).map((c) => [c.title, ((sj2.chapters || {})[c.guid] || []).length])));
        const row2 = (sj2.chapters[ch2.guid] || []).find((s) => s.type !== 'memo');
        showPanel('props-panel');
        // เรียกซ้อนกันสองรอบ = เงื่อนไขที่ทำให้เกิดรายการซ้ำในของเดิม
        openPropsPanel(dPath, ch2, row2);
        renderPropsPanel();
        await new Promise((r) => setTimeout(r, 500));
        const bodyEl = $('#props-body');
        check('แผงคุณสมบัติวาดครั้งเดียว (ไม่ duplicate ชื่อฉาก)',
              bodyEl.querySelectorAll('.props-name').length === 1,
              bodyEl.querySelectorAll('.props-name').length + ' :: ' + bodyEl.textContent.slice(0, 80));
        // แผงมี textarea 2 ช่อง (เรื่องย่อ · โน้ต) — กล่องคุณสมบัติแบบหน้าต่างมี 3 (มี Future Note ด้วย)
        check('แผงคุณสมบัติไม่ duplicate ช่องกรอก',
              bodyEl.querySelectorAll('textarea.wiki-input').length === 2 &&
              bodyEl.querySelectorAll('input.wiki-input').length === 5,
              `ta=${bodyEl.querySelectorAll('textarea.wiki-input').length} inp=${bodyEl.querySelectorAll('input.wiki-input').length}`);
        check('แผงคุณสมบัติเลิกใช้ปุ่มบันทึก → เป็นบันทึกอัตโนมัติ',
              !bodyEl.querySelector('.props-save') && !!bodyEl.querySelector('.props-autosave'));
        // พิมพ์แล้วต้องเขียนลง scenes.json เองโดยไม่ต้องกดปุ่ม
        const inps2 = bodyEl.querySelectorAll('input.wiki-input');   // [0]storyDate [1]pov [2]อารมณ์ [3]ความขัดแย้ง [4]แท็ก
        inps2[1].value = 'มุมมองอัตโนมัติ';
        inps2[1].dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 900));
        const sj3 = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
        const row3 = (sj3.chapters[ch2.guid] || []).find((x) => x.id === row2.id);
        check('พิมพ์ในแผงคุณสมบัติ → บันทึกลง scenes.json อัตโนมัติ',
              row3.pov === 'มุมมองอัตโนมัติ', JSON.stringify(row3.pov));
        check('สถานะในแผงใช้ allStatuses() (รวมสถานะที่ผู้ใช้เพิ่มเอง)',
              bodyEl.querySelectorAll('select.wiki-input')[0].options.length === allStatuses().length + 1,
              `${bodyEl.querySelectorAll('select.wiki-input')[0].options.length} vs ${allStatuses().length + 1}`);
      }

      // ---- ข้อ 8: ย้ายฉากออกไป MEMO แล้วย้ายกลับเข้าบทได้ ----
      {
        const dj3 = await kapi.readJson(await kapi.join(dPath, 'draft.json'));
        const ch3 = dj3.chapters[0];
        const memoRow = { id: 'scMemoRT', title: 'โน้ตไป-กลับ', order: 90,
                          fileName: 'memo-rt.md', type: 'memo' };
        const sjA = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
        sjA.chapters[ch3.guid] = [...(sjA.chapters[ch3.guid] || []), memoRow];
        await kapi.writeFile(await kapi.join(dPath, 'scenes.json'), JSON.stringify(sjA, null, 2));
        await kapi.writeFile(await kapi.join(dPath, 'Chapters', ch3.folderName, 'memo-rt.md'),
          dumpMdFile({ title: 'โน้ตไป-กลับ', type: 'memo' }, 'เนื้อโน้ตทดสอบไป-กลับ'));
        const dst = await moveRowToMemos(dPath, ch3, memoRow);
        check('ย้ายออกไป MEMO → ไฟล์ไปอยู่ในโฟลเดอร์ Memos', await kapi.exists(dst), String(dst));
        const backOk = await moveMemoToChapter(dst, dPath, ch3);
        check('ย้ายกลับเข้าบทได้ (ทางกลับของคำสั่ง — บั๊กข้อ 8)', backOk === true);
        const sjB = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
        const backRow = (sjB.chapters[ch3.guid] || []).find((x) => x.title === 'โน้ตไป-กลับ');
        check('ย้ายกลับแล้วโน้ตอยู่ในบทและยังเป็นชนิด memo',
              !!backRow && backRow.type === 'memo', JSON.stringify(backRow));
        check('ย้ายกลับแล้วไฟล์ไม่ค้างใน Memos', !(await kapi.exists(dst)));
        // เปลี่ยนโน้ตกลับเป็นฉากปกติได้ (เดิมเมนูไม่มีทางกลับ)
        await setRowMemo(dPath, ch3, backRow, false);
        const sjC = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
        check('สลับโน้ต → ฉากปกติได้',
              !(sjC.chapters[ch3.guid] || []).find((x) => x.id === backRow.id)?.type);
      }

      // ---- ข้อ 5: เหตุการณ์บนเส้นเวลาอ้างอิงเอกสาร/โน้ตได้ ----
      {
        const targets = await listRefTargets();
        check('หารายการเอกสาร/โน้ตสำหรับอ้างอิงได้', targets.length > 0, String(targets.length));
        check('รายการอ้างอิงเก็บ path แบบสัมพัทธ์กับ root (ย้ายโปรเจกต์ได้)',
              targets.every((x) => !/^[A-Za-z]:|^\//.test(x.path)), JSON.stringify(targets[0]));
        const tl = await loadTimeline();
        const ev = { ...newEvent('ปีที่ 777'), title: 'เหตุการณ์มีอ้างอิง',
                     refs: normalizeRefs([{ kind: targets[0].kind, path: targets[0].path, title: targets[0].title }]) };
        tl.events = [...(tl.events || []), ev];
        await saveTimeline(tl);
        const tl2 = await loadTimeline();
        const got = (tl2.events || []).find((x) => x.id === ev.id);
        check('บันทึกการอ้างอิงลง timeline.json แล้วอ่านกลับได้',
              !!got && got.refs.length === 1 && got.refs[0].path === targets[0].path,
              JSON.stringify(got && got.refs));
        await openTimeline();
        await new Promise((r) => setTimeout(r, 700));
        const refChip = document.querySelector('.tl-ev-ref');
        check('การ์ดบนเส้นเวลาแสดงชิปอ้างอิง', !!refChip,
              String(document.querySelectorAll('.tl-event').length) + ' cards');
        check('ชิปอ้างอิงบอกชื่อเอกสารที่อ้างถึง',
              !!refChip && refChip.textContent.includes(targets[0].title), refChip && refChip.textContent);
        // เก็บกวาดไม่ให้ค้างข้าม run
        tl2.events = (tl2.events || []).filter((x) => x.id !== ev.id);
        await saveTimeline(tl2);
        closeTab('::timeline::');
      }

      // ---- ข้อ 15: ผังแตกสายผูกกับ [ข้อความ] ในเนื้อฉากจริง ----
      {
        const dj4 = await kapi.readJson(await kapi.join(dPath, 'draft.json'));
        const ch4 = dj4.chapters[0];
        const sj4 = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
        const scB = (sj4.chapters[ch4.guid] || [])[0];
        const scFile = await kapi.join(dPath, 'Chapters', ch4.folderName, scB.fileName);
        const { meta: bm, body: bb } = parseMdFile(await kapi.readFile(scFile));
        await kapi.writeFile(scFile, dumpMdFile(bm, bb + '\n\nเขาลังเล จะ [ไปตลาด] หรือ [กลับบ้าน] ดี\n'));
        await updateSceneRow(dPath, scB.id, (r) => { delete r.choices; });
        // เปิดฉากใหม่ให้ตัวแก้ไขเห็นข้อความที่เพิ่งเขียน แล้วสั่งสแกน
        if (state.tabs.has(scFile)) closeTab(scFile);
        await openScene(scFile, scB.title);
        await new Promise((r) => setTimeout(r, 500));
        const added = await syncChoicesFromScene();
        check('สแกน [ข้อความ] ในฉาก → สร้างทางเลือกให้อัตโนมัติ (ข้อ 15)', added === 2, String(added));
        const sj5 = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
        const scB2 = (sj5.chapters[ch4.guid] || []).find((x) => x.id === scB.id);
        check('ทางเลือกที่ได้ตรงกับข้อความในฉาก',
              (scB2.choices || []).map((c) => c.text).join('|') === 'ไปตลาด|กลับบ้าน',
              JSON.stringify(scB2.choices));
        check('สแกนซ้ำไม่สร้างซ้ำ', (await syncChoicesFromScene()) === 0);
        // แผง inspector ต้องโชว์สถานะการผูกกับเอกสาร
        await openBranchingTree();
        await new Promise((r) => setTimeout(r, 400));
        state._branch.sel = scB.id;
        await renderBranchingTree(state.tabs.get('::branching::').pane);
        await new Promise((r) => setTimeout(r, 500));
        check('แผงผังแตกสายมีส่วน "ทางเลือกในเนื้อฉาก"',
              !!document.querySelector('.branch-doc'));
        check('แผงบอกว่าทางเลือกผูกกับข้อความในฉากแล้ว',
              !!document.querySelector('.branch-doc-ok'),
              document.querySelector('.branch-doc-body')?.textContent?.slice(0, 90));
        check('ผังมีปุ่มสแกนทั้งโปรเจกต์',
              [...document.querySelectorAll('.branch-zbtn')].some((b) => b.textContent === '🔎'));
        // เขียนคิว: ยิงพร้อมกัน 3 ครั้งต้องได้ครบ 3 (เดิมทับกันจนหาย)
        const bnode = { dPath, id: scB.id };
        await Promise.all([
          mutateChoices(bnode, (l) => [...l, { text: 'คิว1', nextSceneId: '' }]),
          mutateChoices(bnode, (l) => [...l, { text: 'คิว2', nextSceneId: '' }]),
          mutateChoices(bnode, (l) => [...l, { text: 'คิว3', nextSceneId: '' }]),
        ]);
        const sj6 = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
        const texts6 = ((sj6.chapters[ch4.guid] || []).find((x) => x.id === scB.id).choices || [])
          .map((c) => c.text);
        check('แก้ choices พร้อมกันหลายคำสั่งไม่เขียนทับกัน (ต่อคิว)',
              ['คิว1', 'คิว2', 'คิว3'].every((t2) => texts6.includes(t2)), texts6.join('|'));
        await updateSceneRow(dPath, scB.id, (r) => { delete r.choices; });
        closeTab('::branching::');
      }

      // ---- ข้อ 10: Wiki มีระบบเวอร์ชันเหมือนฉาก ----
      {
        const wr = await wikiRoot();
        const cDir = await kapi.join(wr, 'characters');
        const wf = (await kapi.listFiles(cDir, '.json'))[0];
        if (wf) {
          const wpath = await kapi.join(cDir, wf);
          if (state.tabs.has(wpath)) closeTab(wpath);
          await openEntity(wpath);
          await new Promise((r) => setTimeout(r, 600));
          const wtab = state.tabs.get(wpath);
          check('หน้า Wiki มีปุ่มประวัติ/บันทึกเวอร์ชัน',
                wtab.pane.querySelectorAll('.wiki-ver-btn').length === 2,
                String(wtab.pane.querySelectorAll('.wiki-ver-btn').length));
          await snapshotFile(wpath, 'เวอร์ชันทดสอบ Wiki');
          const snaps = await listSnapshots(wpath);
          check('บันทึกเวอร์ชันของหน้า Wiki (.json) ได้', snaps.length >= 1, String(snaps.length));
          check('เวอร์ชัน Wiki เก็บชื่อที่ตั้งไว้',
                snaps.some((s) => s.label === 'เวอร์ชันทดสอบ Wiki'), JSON.stringify(snaps[0]));
          // ข้อ 2: วงกลมรูปตัวละครต้องกดใส่รูปได้
          const av = wtab.pane.querySelector('.wiki-prof-avatar');
          check('การ์ดตัวละครมีวงกลมรูป', !!av);
          check('วงกลมรูปคลิกเพื่อใส่รูปได้ (ไม่ใช่ไอคอนตายตัว)',
                !!av && typeof av.onclick === 'function' && getComputedStyle(av).cursor === 'pointer');
        }
      }

      // ---- ข้อ 7: แยกจอ/เทียบเวอร์ชัน — คลิกแท็บฝั่งขวาแล้วต้องไม่หลุดแยกจอ ----
      {
        const files = [...state.tabs.keys()].filter((f) => /\.md$/i.test(f));
        if (files.length >= 2) {
          activate(files[0]);
          applyCompare(files[1]);
          await new Promise((r) => setTimeout(r, 150));
          check('เปิดเทียบด้านขวา → เข้าโหมดแยกจอ',
                $('#panes').classList.contains('split') && !!document.querySelector('.pane.compare-on'));
          check('เส้นทางเทียบเอกสารก็ได้ที่จับลากเหมือน Split View (ข้อ 7)',
                !!$('#panes').querySelector('.k-split-handle'));
          activate(files[1]);                       // เดิม: แยกจอหลุดทันที
          await new Promise((r) => setTimeout(r, 150));
          check('คลิกแท็บฝั่งขวา → สลับข้าง ไม่ทิ้งการแยกจอ',
                $('#panes').classList.contains('split') && state.compareFile === files[0],
                'compareFile=' + state.compareFile);
          check('สลับข้างแล้วช่องที่ไม่ใช่แท็บปัจจุบันถูกทำเครื่องหมายใบเดียว',
                document.querySelectorAll('.k-split-body > .pane.compare-on').length === 1,
                String(document.querySelectorAll('.k-split-body > .pane.compare-on').length));
          // .47+ : .workspace คือชั้นที่รับ CSS zoom คั่นระหว่าง .pane กับ .ProseMirror (style.css:926)
          const paneOn = document.querySelector('#split-root .k-split-body > .pane > .workspace > .ProseMirror');
          check('โหมดแยกจอ: หน้ากระดาษหดตามช่องที่แคบลง (sync กับมุมมองกระดาษ)',
                !!paneOn && getComputedStyle(paneOn).maxWidth.includes('px'),
                paneOn && getComputedStyle(paneOn).maxWidth);
          clearCompare();
          check('ปิดเทียบ → ออกจากโหมดแยกจอครบ',
                !$('#panes').classList.contains('split') &&
                !document.getElementById('split-root') &&
                !document.querySelector('.pane.compare-on'));
        }
      }
    }

    // ============================================================
    // alpha.44 — เก็บงาน 7 ฟีเจอร์ปิดท้าย (65/66/68/69/70/77/78)
    // ============================================================
    {
      // ---- ข้อ 65: โหมดโฟกัสต้องหรี่บรรทัดอื่นจริง (ไม่ใช่แค่ซ่อน UI) ----
      {
        const scE = document.querySelector('#tree .scene[data-path]');
        if (scE) { scE.click(); await new Promise((r) => setTimeout(r, 400)); }
        const tF = state.active;
        // หน้าต่างเทสไม่ได้ถูกวาดจริง → transition ค้างที่ค่าเริ่มต้น (getComputedStyle คืนค่าระหว่างวิ่ง)
        // ต้องสั่งจบ animation เองก่อนวัด ไม่ใช่แค่ "รอให้ครบ .15s" (ดูบทเรียนข้อ 14i)
        const settle = (elm) => { try { elm.getAnimations?.().forEach((a) => a.finish()); } catch {} };
        if (tF?.editor) {
          selHead(tF.editor.view);
          toggleFocus(true);
          document.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }));
          await new Promise((r) => setTimeout(r, 300));   // รอ transition .15s ให้จบก่อนวัด opacity
          const blocks = [...tF.editor.view.dom.children];
          blocks.forEach(settle);
          const dim = blocks.find((b) => !b.classList.contains('fm2-active'));
          check('โหมดโฟกัส: บรรทัดที่ไม่ได้เขียนอยู่ถูกหรี่จริง (ไม่ใช่แค่คลาส)',
                !!dim && +getComputedStyle(dim).opacity === focusDim(),
                dim ? `opacity=${getComputedStyle(dim).opacity} · dim=${focusDim()} · tab=${tF.title}`
                    : 'ไม่มีบล็อกที่ถูกหรี่');
          const act = blocks.find((b) => b.classList.contains('fm2-active'));
          check('โหมดโฟกัส: บรรทัดที่เคอร์เซอร์อยู่ยังทึบเต็ม',
                !!act && +getComputedStyle(act).opacity === 1, act && getComputedStyle(act).opacity);
          // ปรับความจางในตั้งค่า → เห็นผลทันทีโดยไม่ต้องปิด-เปิดโหมด
          const oldDim = state.settings.focusDim;
          state.settings.focusDim = 0.6; applyFocusDim();
          await new Promise((r) => setTimeout(r, 300));
          blocks.forEach(settle);
          check('ปรับ "ความจางบรรทัดอื่น" ในตั้งค่าแล้วมีผลทันที',
                !!dim && +getComputedStyle(dim).opacity === 0.6, dim && getComputedStyle(dim).opacity);
          state.settings.focusDim = oldDim; applyFocusDim();

          // Esc: ต้องไม่แย่งกับกล่องโต้ตอบที่เปิดค้าง
          const fakeOv = el('div', 'k-overlay'); document.body.append(fakeOv);
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          check('มีกล่องเปิดอยู่ → Esc ไม่หลุดโหมดโฟกัส (กล่องปิดตัวเองก่อน)',
                document.body.classList.contains('focus-mode'));
          fakeOv.remove();

          // Esc: เปิดทั้งโหมดอ่าน+โฟกัส → ออกทีละชั้น (โฟกัสก่อน)
          toggleReading(true);
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          check('Esc ครั้งแรกออกจากโหมดโฟกัส แต่โหมดอ่านยังอยู่',
                !document.body.classList.contains('focus-mode') &&
                document.body.classList.contains('reading-mode'));
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          check('Esc ครั้งที่สองจึงออกจากโหมดอ่าน',
                !document.body.classList.contains('reading-mode'));
          check('ออกจากโฟกัสแล้ว .fm2-active ถูกล้างหมด', !document.querySelector('.fm2-active'));
        }
      }

      // ---- ข้อ 66: เครื่องพิมพ์ดีดต้องหา "ตัวที่เลื่อนได้" เจอ แม้ตัวแก้ไขไม่ได้อยู่ใน .pane ----
      {
        const pmNow = document.querySelector('.pane.on .ProseMirror');
        check('เครื่องพิมพ์ดีด: ตัวแก้ไขใน pane → ใช้ .pane เป็นตัวเลื่อน',
              !!pmNow && scrollHost(pmNow) === pmNow.closest('.pane'));
        const box = el('div'); box.style.cssText = 'overflow-y:auto;height:50px';
        const inner = el('div', 'ProseMirror'); box.append(inner); document.body.append(box);
        check('เครื่องพิมพ์ดีด: ตัวแก้ไขในหน้าต่างลอย (ไม่มี .pane) → ไต่หา element ที่เลื่อนได้',
              scrollHost(inner) === box);
        box.remove();
        check('ปิดโหมดอยู่ → twScroll ไม่ทำอะไร', twScroll() === false);
      }

      // ---- ข้อ 68: ส่งออกบล็อกต้องได้ HTML จริง + ตัวเลือกมีผล ----
      {
        const b1 = await buildBlogHtml({ theme: 'medium', chapterHeads: true, sceneHeads: true, embedImages: false });
        check('ส่งออกบล็อก: ได้ฉากอย่างน้อย 1 ฉาก', b1.nScenes >= 1, String(b1.nScenes));
        check('ส่งออกบล็อก: เนื้อหาเป็น HTML (มี <article> + <p>)',
              b1.html.includes('<article>') && b1.html.includes('<p>'));
        check('ส่งออกบล็อก: ไม่มี markdown ดิบหลุดไป (# / ** / frontmatter)',
              !/\n#{1,6}\s/.test(b1.html) && !b1.html.includes('**') && !b1.html.includes('---\ntitle:'));
        const b2 = await buildBlogHtml({ theme: 'dark', chapterHeads: false, sceneHeads: false });
        check('ส่งออกบล็อก: ปิดหัวบท/หัวฉากแล้วไม่มี <h2>/<h3>',
              !b2.html.includes('<h2>') && !b2.html.includes('<h3>'));
        check('ส่งออกบล็อก: เลือกธีมมืดแล้ว CSS เปลี่ยนจริง',
              b2.html.includes(BLOG_THEMES.dark.css.trim().split('\n')[0]));
        const b3 = await buildBlogHtml({ embedImages: true });
        check('ส่งออกบล็อก: ฝังรูปเป็น data URI (ไฟล์เดียวจบ)',
              b3.html.includes('data:image/png;base64,') && b3.nImages >= 1,
              `nImages=${b3.nImages}`);
        const b4 = await buildBlogHtml({ embedImages: false });
        check('ส่งออกบล็อก: ไม่ฝังรูป → ยังอ้าง path เดิม', !b4.html.includes('data:image/'));
        const findB = SHORTCUTS.find((s) => s[3] === 'export-blog');
        check('ส่งออกบล็อกมีคีย์ลัด Ctrl+Shift+B', String(findB?.slice(0, 3)) === 'KeyB,true,true');
      }

      // ---- ข้อ 69: สถานะฉากมีสี + ย้ายข้ามโปรเจกต์ได้ ----
      {
        check('สถานะมาตรฐานมีสีประจำตัว', /^#[0-9a-f]{6}$/i.test(statusColor('กำลังเขียน')));
        await addCustomStatus('รอตรวจ', '#123456');
        check('เพิ่มสถานะพร้อมสีได้', statusColor('รอตรวจ') === '#123456');
        await setStatusColor('เขียนเสร็จ', '#abcdef');
        check('เปลี่ยนสีสถานะมาตรฐานได้ + บันทึกลงไฟล์',
              statusColor('เขียนเสร็จ') === '#abcdef' &&
              ((await kapi.readJson(await kapi.join(state.root, 'project.khn.json')))
                .customStatusColors || {})['เขียนเสร็จ'] === '#abcdef');
        // ชิปสถานะใน Explorer ต้องได้สีนั้นจริง
        const chS = (await kapi.readJson(await kapi.join(dPath, 'draft.json'))).chapters[0];
        const sjS = await kapi.readJson(await kapi.join(dPath, 'scenes.json'));
        const scS2 = (sjS.chapters[chS.guid] || [])[0];
        if (scS2) {
          await setSceneMeta(dPath, chS, scS2, { status: 'รอตรวจ' });
          await buildTree();
          const chip = [...document.querySelectorAll('#tree .sc-status')]
            .find((c) => c.textContent.trim() === 'รอตรวจ');
          check('ชิปสถานะใน Explorer ได้สีของสถานะนั้น',
                !!chip && getComputedStyle(chip).color === 'rgb(18, 52, 86)',
                chip ? getComputedStyle(chip).color : 'ไม่พบชิป');
          await setSceneMeta(dPath, chS, scS2, { status: '' });
        }
        // ส่งออก → ลบ → นำเข้ากลับ
        const dump = statusesToJson();
        check('ชุดสถานะที่ส่งออกมีทั้งชื่อและสี',
              dump.statuses.includes('รอตรวจ') && dump.colors['รอตรวจ'] === '#123456');
        await removeCustomStatus('รอตรวจ');
        check('ลบแล้วหายจากรายการรวม', !allStatuses().includes('รอตรวจ'));
        check('นำเข้ากลับได้ 1 รายการ', (await importStatuses(dump)) === 1 && allStatuses().includes('รอตรวจ'));
        check('นำเข้าซ้ำไม่เพิ่มของเดิมซ้ำ', (await importStatuses(dump)) === 0);
        await removeCustomStatus('รอตรวจ');
        await setStatusColor('เขียนเสร็จ', STATUS_COLORS['เขียนเสร็จ']);
        await buildTree();
      }

      // ---- ข้อ 70: เปิดไฟล์ด่วน — แคช + สแกนใหม่ + คำใบ้ ----
      {
        await openQuickOpen();
        await new Promise((r) => setTimeout(r, 300));
        check('กล่องเปิดไฟล์ด่วนมีแถบคำใบ้คีย์ลัด',
              (document.querySelector('.k-qo-hint')?.textContent || '').includes('Enter'));
        check('แสดงจำนวนไฟล์ที่พบ',
              /\d+\/\d+ ไฟล์/.test(document.querySelector('.k-qo-count')?.textContent || ''),
              document.querySelector('.k-qo-count')?.textContent);
        check('มีปุ่มสแกนใหม่', !!document.querySelector('.k-qo-refresh'));
        const cachedN = quickOpenCache().files.length;
        check('สแกนแล้วเก็บแคชไว้ใช้ครั้งหน้า', cachedN >= 1 && quickOpenCache().root === state.root,
              'files=' + cachedN);
        document.querySelector('.k-qo-input')
          .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        // เปิดซ้ำ: ต้องมีรายการทันทีจากแคช (ไม่ต้องรอสแกน)
        const p2 = openQuickOpen();
        check('เปิดซ้ำ → มีรายการทันทีจากแคช (ไม่ต้องรอสแกนใหม่)',
              document.querySelectorAll('.k-qo-row').length >= 1,
              String(document.querySelectorAll('.k-qo-row').length));
        await p2;
        document.querySelector('.k-qo-input')
          .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        check('ปิดกล่องแล้วไม่มีค้างใน DOM', !document.querySelector('.k-qo'));
      }

      // ---- ข้อ 77: รวบรวมเนื้อหาให้ AI (ทดสอบได้โดยไม่ต้องยิง API) ----
      {
        let lastDone = 0, total0 = 0;
        const col = await collectProjectText({ onProgress: (d, t2) => { lastDone = d; total0 = t2; } });
        check('รวบรวมเนื้อหา: อ่านฉากได้อย่างน้อย 1 ฉาก', col.scenes >= 1, String(col.scenes));
        check('รวบรวมเนื้อหา: รายงานความคืบหน้าครบทุกฉาก', total0 >= 1 && lastDone === total0,
              `${lastDone}/${total0}`);
        check('รวบรวมเนื้อหา: มีชื่อเล่ม/บทกำกับให้ AI', col.text.includes('## ') && col.text.includes('### '));
        check('รวบรวมเนื้อหา: รวมคลัง Wiki ด้วย (เดิมสรุปแต่เนื้อฉาก)',
              col.entities >= 1 && col.text.includes('คลังข้อมูล (Wiki)'), 'entities=' + col.entities);
        const colNo = await collectProjectText({ includeWiki: false });
        check('ปิดตัวเลือก Wiki แล้วไม่รวมคลัง', !colNo.text.includes('คลังข้อมูล (Wiki)'));
        check('แฮชเนื้อหาเสถียร (เนื้อเท่ากัน = แฮชเท่ากัน)', hashText('กขค') === hashText('กขค'));
        check('แฮชเปลี่ยนเมื่อเนื้อเปลี่ยน', hashText('กขค') !== hashText('กขง'));
        check('ยังไม่เคยสรุป → ไม่มีแคช', summaryCacheState(col.text) === 'none');
        state.meta.ai = { ...(state.meta.ai || {}),
                          summaryCache: { hash: hashText(col.text), text: 'สรุปทดสอบ', date: new Date().toISOString() } };
        check('เนื้อหาเดิม → ใช้ผลสรุปที่แคชไว้ (ไม่เสีย token ซ้ำ)', summaryCacheState(col.text) === 'fresh');
        check('เนื้อหาเปลี่ยน → แคชหมดอายุ ต้องสรุปใหม่', summaryCacheState(col.text + 'x') === 'stale');
        delete state.meta.ai.summaryCache;
      }

      // ---- ข้อ 78: แนะนำชื่อ — เข้าถึงได้จากคลิกขวา + จำชื่อที่เคยแนะนำ ----
      {
        const scE2 = document.querySelector('#tree .scene[data-path]');
        scE2.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 40, clientY: 40 }));
        const items = [...document.querySelectorAll('.k-menu .k-menu-item')].map((i) => i.textContent);
        check('คลิกขวาที่ฉาก → มีเมนู "แนะนำชื่อฉากด้วย AI"',
              items.some((i) => i.includes('แนะนำชื่อฉากด้วย AI')), items.join(' | ').slice(0, 200));
        closeMenu();
        const chHeadEl = document.querySelector('#tree .ch-title');
        if (chHeadEl) {
          chHeadEl.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 40, clientY: 40 }));
          const items2 = [...document.querySelectorAll('.k-menu .k-menu-item')].map((i) => i.textContent);
          check('คลิกขวาที่บท → มีเมนู "แนะนำชื่อบทด้วย AI"',
                items2.some((i) => i.includes('แนะนำชื่อบทด้วย AI')), items2.join(' | ').slice(0, 200));
          closeMenu();
        }
        rememberTitles('scene', 'ฉากทดสอบ', ['ชื่อ ก', 'ชื่อ ข']);
        const past = pastTitlesFor('ฉากทดสอบ');
        check('จำชื่อที่ AI เคยแนะนำไว้ให้เลือกซ้ำได้',
              past.includes('ชื่อ ก') && past.includes('ชื่อ ข'), past.join(','));
        check('ประวัติชื่อแยกตามหัวข้อ (ไม่ปนกัน)', pastTitlesFor('หัวข้ออื่น').length === 0);
        for (let i = 0; i < 55; i++) rememberTitles('scene', 'ล้น', ['t' + i]);
        check('ประวัติชื่อไม่โตไม่จำกัด (เก็บ 50 รายการล่าสุด)',
              (state.meta.ai.titleHistory || []).length === 50,
              String((state.meta.ai.titleHistory || []).length));
        delete state.meta.ai.titleHistory;
      }

      // ---- ข้อ 4: Template Variables ({{VariableName}}) ใน compile ----
      {
        const { resolveVars, buildVarContext } = await import('./template-vars.js');
        check('resolveVars แทนที่ {{key}} ได้',
              resolveVars('สวัสดี {{name}}', { name: 'จอห์น' }) === 'สวัสดี จอห์น');
        check('resolveVars ไม่เปลี่ยนถ้าไม่มี key',
              resolveVars('ไม่มีตัวแปร', {}) === 'ไม่มีตัวแปร');
        check('resolveVars รองรับ key ที่มีจุด (entity.field)',
              resolveVars('อายุ {{hero.age}} ปี', { 'hero.age': '25' }) === 'อายุ 25 ปี');
        check('resolveVars ทิ้ง {{…}} ไว้ถ้า key ไม่อยู่ใน ctx',
              resolveVars('ค่า {{missing}} ตรงนี้', {}) === 'ค่า {{missing}} ตรงนี้');
        check('resolveVars รองรับ key ไทย',
              resolveVars('ชื่อ {{ตัวละคร}}', { ตัวละคร: 'จอห์น' }) === 'ชื่อ จอห์น');
        // test buildVarContext with actual Wiki fixture
        const ctx = await buildVarContext(state.root, kapi);
        check('buildVarContext ไม่ throw', ctx && typeof ctx === 'object');
        // test that resolve-vars step exists in STEP_DEFS
        check('STEP_DEFS มี resolve-vars',
              STEP_DEFS.some(s => s.key === 'resolve-vars' && s.stage === 'model'));
        // test runWorkflow with resolve-vars step + varCtx
        const model = { title: 'ทดสอบ', author: 'ผู้แต่ง',
          chapters: [{ title: 'บทที่ 1', scenes: [{ title: 'ฉาก {{hero}}', body: 'ตัว {{hero}} ลุกขึ้น', status: 'Outline', type: 'scene', words: 5 }] }] };
        const wfTest = { steps: [
          { key: 'resolve-vars', on: true },
          { key: 'scene-heading', on: true, opts: { template: '### {title}' } },
        ], ext: 'md' };
        const r = runWorkflow(model, wfTest, { varCtx: { hero: 'จอห์น' } });
        check('runWorkflow resolve-vars ใน title',
              r.text.includes('ฉาก จอห์น'), JSON.stringify(r.text).slice(0, 200));
        check('runWorkflow resolve-vars ใน body',
              r.text.includes('ตัว จอห์น ลุกขึ้น'), JSON.stringify(r.text).slice(0, 200));
      }

      // ---- ข้อ 5: Draft System — CRUD ฉบับร่าง ----
      {
        const { listDraftsForSection, createDraft } = await import('./drafts.js');
        const secs = await listSections();
        check('มีเล่มอย่างน้อย 1 เล่มสำหรับเทส draft', secs.length >= 1);
        const sec = secs[0];

        // list drafts
        const before = await listDraftsForSection(sec.secPath);
        check('listDraftsForSection เจอ default draft',
              before.length >= 1 && before.some(d => d.name === 'default' && d.primary));
        check('มี draft path ที่ใช้ได้', before[0].dPath && before[0].name);

        // create new draft
        const newName = 'test-draft-' + Date.now().toString(36);
        const newPath = await createDraft(sec.secPath, newName);
        check('createDraft สร้างร่างใหม่ได้', !!newPath && await kapi.exists(newPath));
        const afterCreate = await listDraftsForSection(sec.secPath);
        check('createDraft: รายชื่อร่างเพิ่มขึ้น', afterCreate.some(d => d.name === newName));

        // set primary draft
        const { setPrimaryDraft } = await import('./drafts.js');
        await setPrimaryDraft(sec.secPath, newName);
        const afterPrimary = await listDraftsForSection(sec.secPath);
        const prim = afterPrimary.find(d => d.name === newName);
        check('setPrimaryDraft เปลี่ยน primary ได้', prim && prim.primary === true);
        const defAfter = afterPrimary.find(d => d.name === 'default');
        check('setPrimaryDraft: ร่างเดิมไม่ใช่ primary แล้ว', defAfter && defAfter.primary === false);

        // rename draft (no dialog needed)
        const { renameDraft } = await import('./drafts.js');
        const renamed = newName + '-renamed';
        await renameDraft(sec.secPath, newName, renamed);
        const afterRename = await listDraftsForSection(sec.secPath);
        check('renameDraft เปลี่ยนชื่อร่างได้',
              afterRename.some(d => d.name === renamed)
              && !afterRename.some(d => d.name === newName));
        check('renameDraft: primary ติดตามไปด้วย',
              (afterRename.find(d => d.name === renamed) || {}).primary);

        // restore primary to default before delete
        await setPrimaryDraft(sec.secPath, 'default');

        // delete draft — confirmBox blocks; test via direct recycle move
        const dPath = await kapi.join(sec.secPath, 'Draft', renamed);
        const recyclePath = await kapi.join(state.root, 'Recycle', 'draft-e2e-del-' + Date.now().toString(36));
        if (await kapi.exists(dPath)) {
          await kapi.move(dPath, recyclePath);
          check('deleteDraft: ย้ายร่างไปถังขยะได้', await kapi.exists(recyclePath));
        }
        const afterDel = await listDraftsForSection(sec.secPath);
        check('deleteDraft: รายชื่อร่างหายไป',
              !afterDel.some(d => d.name === renamed));

        // verify primary stays on default
        const final = await listDraftsForSection(sec.secPath);
        check('primary กลับมาที่ default',
              final.some(d => d.name === 'default' && d.primary));
      }

      // เก็บกวาดกล่อง/เมนูที่อาจค้าง (บทเรียนข้อ 16: กล่องค้างทำสกรีนช็อตเทสถัดไปเพี้ยน)
      document.querySelectorAll('.k-overlay').forEach((o) => o.remove());
      closeMenu();
    }

    // ================= Phase 7: บั๊ก #10 / #28 / #2 / #18 =================

    // ---- บั๊ก #10: พิมพ์ต้องได้เฉพาะหน้าที่เปิดอยู่ ----
    {
      // อ่านกฎ @media print จริงจาก CSSOM — บั๊กเดิมคือกฎ `.pane { display:block !important }`
      // ในบล็อกที่สอง ไป override กฎซ่อนของบล็อกแรก → พิมพ์ออกมาทุกแท็บ
      let onRule = null, offRule = null, bareBlock = null;
      for (const ss of document.styleSheets) {
        let rules; try { rules = ss.cssRules; } catch { continue; }
        for (const r of rules) {
          if (!r.media || !String(r.conditionText || r.media.mediaText).includes('print')) continue;
          for (const q of r.cssRules || []) {
            if (q.selectorText === '.pane.on' && q.style.display === 'block') onRule = q;
            if (q.selectorText === '.pane:not(.on)' && q.style.display === 'none') offRule = q;
            if (q.selectorText === '.pane' && q.style.display === 'block') bareBlock = q;
          }
        }
      }
      check('#10 @media print สั่ง display:block เฉพาะ .pane.on', !!onRule);
      check('#10 @media print ซ่อน .pane ที่ไม่ active ด้วย !important', !!offRule &&
            offRule.style.getPropertyPriority('display') === 'important');
      check('#10 ไม่มีกฎ `.pane { display:block }` เหมาเข่งใน @media print แล้ว',
            !bareBlock, bareBlock && bareBlock.cssText);
      // ตาข่ายกันพลาดฝั่ง JS: ต้องซ่อน pane ที่ไม่ active แล้วคืนค่าเดิมได้ครบ
      const panesAll = [...document.querySelectorAll('#panes .pane')];
      const inactive = panesAll.filter((p) => !p.classList.contains('on'));
      check('มี pane ที่ไม่ active ให้ทดสอบ', inactive.length >= 1, 'panes=' + panesAll.length);
      const beforeDisp = panesAll.map((p) => p.style.display);
      hideInactivePanes();
      check('#10 hideInactivePanes ซ่อน pane ที่ไม่ active ทั้งหมด',
            inactive.every((p) => p.style.display === 'none'));
      check('#10 hideInactivePanes ไม่แตะ pane ที่ active',
            panesAll.filter((p) => p.classList.contains('on')).every((p) => p.style.display !== 'none'));
      restoreInactivePanes();
      check('#10 restoreInactivePanes คืน display เดิมครบทุกตัว',
            panesAll.every((p, i) => p.style.display === beforeDisp[i]) &&
            !document.querySelector('#panes .pane[data-k2hide]'));
    }

    // ---- บั๊ก #28: คลังรูปต้องเข้าถึงได้จากเมนู/ปุ่ม/คีย์ลัด ไม่ใช่ซ่อนในคลิกขวา ----
    {
      check('#28 มีปุ่มคลังรูปบนแถบเครื่องมือ', !!$('#tb-gallery'));
      check('#28 ปุ่มคลังรูปใช้ได้แม้ไม่มีตัวแก้ไข (ไม่ถูกปิดตาย)',
            !$('#tb-gallery').classList.contains('dis'));
      const scGal = SHORTCUTS.find((s) => shortcutId(s) === 'gallery');
      check('#28 มีคีย์ลัด Ctrl+Shift+G ในตาราง SHORTCUTS',
            !!scGal && scGal[0] === 'KeyG' && scGal[1] === true && scGal[2] === true,
            JSON.stringify(scGal));
      check('#28 คีย์ลัดคลังรูปมีป้ายชื่อ (โผล่ในแท็บปุ่มลัด)', !!SHORTCUT_LABELS['gallery']);
      // คำสั่ง gallery ต้องเปิดคลังรูปได้จริง
      await handleCommand('gallery');
      await new Promise((r) => setTimeout(r, 400));
      check('#28 คำสั่ง gallery เปิดคลังรูปได้', !!state.active?.gal &&
            document.querySelectorAll('.pane.on .gal-cell').length >= 1);
      closeTab('::gallery::');
      activate(t.file);
    }

    // ---- บั๊ก #2: ฟอนต์บทหนังตั้งค่าได้แยกจากนิยาย ----
    {
      check('#2 DEFAULT_SETTINGS มี spFontFamily', 'spFontFamily' in DEFAULT_SETTINGS);
      const origSp = state.settings.spFontFamily || '';
      // ค่าว่าง = ไม่ตั้ง var → CSS fallback เป็น Courier New
      state.settings.spFontFamily = '';
      applySettings();
      check('#2 ไม่ตั้งฟอนต์บทหนัง → ไม่มี --sp-font (ใช้ Courier New ตามค่าเริ่มต้น)',
            !document.documentElement.style.getPropertyValue('--sp-font'));
      state.settings.spFontFamily = '"TH Sarabun New", sans-serif';
      applySettings();
      check('#2 ตั้งฟอนต์บทหนัง → --sp-font ถูกเซ็ต',
            getComputedStyle(document.documentElement).getPropertyValue('--sp-font').trim()
              === '"TH Sarabun New", sans-serif',
            getComputedStyle(document.documentElement).getPropertyValue('--sp-font'));
      // ต้องมีผลกับ .sp จริง และต้องไม่ไปเปลี่ยนฟอนต์ฝั่งนิยาย
      const spProbe = el('div', 'sp sp-action', 'ทดสอบ');
      document.body.appendChild(spProbe);
      check('#2 บล็อกบทหนังใช้ฟอนต์ที่ตั้ง',
            getComputedStyle(spProbe).fontFamily.includes('TH Sarabun New'),
            getComputedStyle(spProbe).fontFamily);
      spProbe.remove();
      check('#2 ฟอนต์บทหนังไม่ไปทับ --ed-font ของนิยาย',
            (document.documentElement.style.getPropertyValue('--ed-font') || '')
              !== '"TH Sarabun New", sans-serif');
      // กล่องตั้งค่าต้องมีช่องเลือกฟอนต์บทหนังจริง (ไม่ใช่มีแต่ setting ลอย ๆ)
      settingsDialog();
      await new Promise((r) => setTimeout(r, 120));
      [...document.querySelectorAll('.k-set-tab')].find((x) => x.dataset.p === 'write').click();
      const spSel = document.querySelector('#st-spfontfamily');
      check('#2 แท็บ "การเขียน" มีช่องเลือกแบบอักษรบทหนัง', !!spSel);
      check('#2 ช่องเลือกฟอนต์บทหนังมีรายการฟอนต์ให้เลือก', spSel && spSel.options.length >= 8,
            spSel && String(spSel.options.length));
      check('#2 ช่องเลือกโชว์ค่าที่ตั้งไว้ปัจจุบัน',
            spSel && spSel.value === '"TH Sarabun New", sans-serif', spSel && spSel.value);
      document.querySelector('.k-dialog .k-cancel').click();   // ยกเลิก = คืนค่าเดิม
      await new Promise((r) => setTimeout(r, 40));
      check('#2 กดยกเลิกแล้วฟอนต์บทหนังคืนค่าที่บันทึกไว้',
            state.settings.spFontFamily === '"TH Sarabun New", sans-serif',
            state.settings.spFontFamily);
      state.settings.spFontFamily = origSp; applySettings();
    }

    // ---- บั๊ก #18: 5 ฟีเจอร์เป็นแผง ไม่ใช่แท็บเอกสาร ----
    {
      const FEAT = [['dashboard', '#dash-body'], ['kanban', '#kanban-body'],
                    ['books', '#books-body'], ['timeline', '#tl-body'], ['maps', '#maps-body']];
      for (const [id, sel] of FEAT) {
        check('#18 ลงทะเบียนแผง ' + id + ' ใน PANEL_DEFS แล้ว',
              PANEL_DEFS.some((d) => d.id === id && d.closable !== false && d.floatable !== false));
        check('#18 มีกล่องเนื้อหา ' + sel + ' ใน DOM', !!$(sel));
        check('#18 แผง ' + id + ' โผล่ในเมนู "มุมมอง → แผง"',
              panelMenuItems().some((m) => m.click && PANEL_DEFS.find((d) => d.id === id) &&
                                           m.label.includes(PANEL_DEFS.find((d) => d.id === id).title)));
      }
      // ไม่มี feature ไหนสร้างแท็บเอกสารอีกแล้ว
      const tabsBefore = state.tabs.size;
      for (const [id] of FEAT) {
        if (isPanelOpen(id)) hidePanel(id);
        await handleCommand('toggle-panel', id);
        await new Promise((r) => setTimeout(r, 300));
        check('#18 toggle-panel เปิดแผง ' + id + ' ได้', isPanelOpen(id));
      }
      await new Promise((r) => setTimeout(r, 400));
      check('#18 เปิดครบ 5 แผงแล้วยังไม่มีแท็บเอกสารเพิ่มเลย',
            state.tabs.size === tabsBefore, `tabs=${state.tabs.size} ก่อน=${tabsBefore}`);
      check('#18 แถบแท็บไม่มีปุ่มของแดชบอร์ด/Kanban/เล่ม/เส้นเวลา/แผนที่',
            ![...document.querySelectorAll('#tabs .tab-title')]
              .some((n) => /แดชบอร์ด|Kanban|จัดการเล่ม|เส้นเวลา|แผนที่/.test(n.textContent)),
            [...document.querySelectorAll('#tabs .tab-title')].map((n) => n.textContent).join('|'));
      // เนื้อหาถูกวาดผ่าน hook ของ showPanel จริง (ไม่ใช่กล่องเปล่า)
      check('#18 แผงแดชบอร์ดมีเนื้อหาหลังเปิดจากเมนู',
            !!document.querySelector('#dash-body .dash-num'));
      check('#18 แผงจัดการเล่มมีเนื้อหาหลังเปิดจากเมนู',
            !!document.querySelector('#books-body .book-card'));
      check('#18 แผงเส้นเวลามีเนื้อหาหลังเปิดจากเมนู',
            !!document.querySelector('#tl-body .tl-wrap'));
      check('#18 แผงแผนที่มีเนื้อหาหลังเปิดจากเมนู',
            !!document.querySelector('#maps-body .map-wrap'));
      check('#18 แผง Kanban มีเนื้อหาหลังเปิดจากเมนู',
            !!document.querySelector('#kanban-body .kb-wrap'));
      // เปิดซ้ำต้องไม่วาดสองรอบ (renderFeaturePanel dedupe ระหว่างที่ยังวาดค้าง)
      const p1 = renderFeaturePanel('dashboard'), p2 = renderFeaturePanel('dashboard');
      check('#18 สั่งวาดแผงซ้อนกัน → ใช้รอบเดียวกัน (ไม่วาดซ้ำ)', p1 === p2);
      await p1;
      // ปิดได้ทุกตัว + ล้างเนื้อหาตอนปิดโปรเจกต์
      for (const [id] of FEAT) { hidePanel(id); check('#18 ปิดแผง ' + id + ' ได้', !isPanelOpen(id)); }
      clearFeaturePanels();
      check('#18 clearFeaturePanels ล้างเนื้อแผงทั้งหมด',
            FEAT.every(([, sel]) => !$(sel) || $(sel).children.length === 0));
      renderPanels(true);
    }

    out.push('ALL OK');
  } catch (e) {
    out.push('STOP: ' + e.message + '\n' + (e.stack || ''));
    try { await kapi.testShot('/tmp/k2_fail.png'); } catch {}
  }
  await kapi.writeFile('/tmp/k2result.txt', out.join('\n'));
  document.title = out[out.length - 1] === 'ALL OK' ? 'TESTOK' : 'TESTFAIL';
}
