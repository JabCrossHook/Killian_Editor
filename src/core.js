// core.js — รากฐานที่ทุกโมดูลใช้ร่วม: DOM helpers, state, smart, log, constants, i18n, shortcuts
// กฎ: ที่นี่มีเฉพาะสิ่งที่ "แชร์ข้ามไฟล์และไม่ reassign" เท่านั้น
//     ตัวแปร let ที่ reassign (pageScale, autosaveTimer, floatBar, …) อยู่กับฟังก์ชันที่แก้มันในไฟล์ของมันเอง
import { SmartType } from './smart.js';

// ---- DOM helpers ----
export const $ = (s) => document.querySelector(s);
export const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

// ---- state กลางของทั้งแอป (object — mutate ได้ผ่าน import binding, ไม่ reassign) ----
export const state = { root: null, title: '', tabs: new Map(), active: null,
                       meta: null, settings: {}, goals: {}, compareFile: null };

// ---- SmartType (auto-mention / spellcheck names) ----
export const smart = new SmartType();

// ---------------- ระบบบันทึกการทำงาน (log) ----------------
// เก็บ buffer ในหน่วยความจำ (สำหรับ viewer) + append ลงไฟล์ <userData>/logs/app-<วันที่>.log
export const LOG_BUF = [];
const LOG_MAX = 1000;                                // กัน buffer โตไม่จำกัด
export function log(level, msg, extra) {
  const ts = new Date().toISOString();
  let line = `[${ts}] ${String(level).toUpperCase()} ${msg}`;
  if (extra !== undefined) {
    try { line += ' | ' + (extra instanceof Error ? (extra.stack || extra.message) : JSON.stringify(extra)); }
    catch { line += ' | ' + String(extra); }
  }
  LOG_BUF.push(line);
  if (LOG_BUF.length > LOG_MAX) LOG_BUF.shift();
  try { kapi.logWrite && kapi.logWrite(line); } catch {}
  if (level === 'error' || level === 'warn') {
    (level === 'error' ? console.error : console.warn)(line);
  }
  return line;
}
// ดักข้อผิดพลาดระดับหน้าต่างทั้งหมด → ลง log
window.addEventListener('error', (e) => {
  log('error', 'window.onerror: ' + (e.message || ''),
      e.error || (e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined));
});
window.addEventListener('unhandledrejection', (e) => {
  log('error', 'unhandledrejection', e.reason);
});

// ---- แถบสถานะล่าง ----
export function setStatus(s) { $('#status').textContent = s; }

// ---- ค่าตั้งต้น settings/goals (โครงเดียวกับ v1 — เก็บครบใน project.khn.json) ----
export const DEFAULT_SETTINGS = {
  autoSaveMinutes: 5, maxBackups: 10, autoBackup: true, lineNumbers: false,
  uiFontSize: 0, uiScale: 1, spellCheck: true, spellCheckDict: true, autoMention: true, recycleDays: 30,
  paperMode: true, shortcuts: {}, fontFamily: '', language: 'th',   // ไทยเป็นค่าเริ่มต้น (ไทย 100%)
  autoSync: false,                 // auto-task: อัปเดตชื่อเอนทิตี้ทุกไฟล์อัตโนมัติ (ข้อ 88)
  // ค้นคำพ้องอังกฤษผ่าน datamuse.com — ปิดไว้ก่อน (ส่งคำที่เลือกออกอินเทอร์เน็ต)
  thesaurus: false,
  focusDim: 0.3,                   // ความจางของบรรทัดอื่นในโหมดโฟกัส (0.05–0.8)
};
export const DEFAULT_GOALS = { dailyWords: 500, projectWords: 50000 };
export const BASE_ED_FS = 15.5; // px — ขนาดฟอนต์ตัวแก้ไขพื้นฐาน (ตรงกับ .ProseMirror ใน style.css)
export const BASE_SP_FS = 14.5; // px — ขนาดฟอนต์บทหนังพื้นฐาน (ตรงกับ .sp ใน style.css)
// ซูมหน้ากระดาษ = ย่อ/ขยาย "ทั้งหน้า" ด้วย CSS zoom (ฟอนต์+ระยะขอบ+ความกว้าง ไปพร้อมกัน)
export const SCALE_MIN = 0.5, SCALE_MAX = 2.5;
// ขนาด UI (แถบเครื่องมือ/แผง/กล่อง) — คนละตัวกับซูมหน้ากระดาษ
export const UI_SCALE_MIN = 0.75, UI_SCALE_MAX = 2.0;

// ---- ค่าคงที่ที่หลายโมดูลใช้ร่วม (pure — ไม่มี dependency) ----
export const SCENE_STATUSES = ['โครงร่าง', 'กำลังเขียน', 'เขียนเสร็จ', 'ตรวจแล้ว', 'เก็บถาวร'];
export const SCENE_COLORS = [
  ['แดง', '#d9575e'], ['ส้ม', '#d97757'], ['เหลือง', '#d9b757'],
  ['เขียว', '#6fae6f'], ['ฟ้า', '#5f9fd9'], ['ม่วง', '#a97fd0'],
];
// สีประจำสถานะมาตรฐาน (สถานะที่ผู้ใช้เพิ่มเองเก็บสีไว้ที่ meta.customStatusColors — ดู custom-status.js)
export const STATUS_COLORS = {
  'โครงร่าง': '#8a8f98', 'กำลังเขียน': '#d97757', 'เขียนเสร็จ': '#5f9fd9',
  'ตรวจแล้ว': '#6fae6f', 'เก็บถาวร': '#a97fd0',
};
export const DEFAULT_STATUS_COLOR = '#8a8f98';
export const BUILTIN_CATS = ['characters', 'locations', 'items', 'lore'];
export const CAT_ICON = { characters: 'user', locations: 'map', items: 'briefcase', lore: 'bookmark' };
// ประเภทความสัมพันธ์ (ครอบครัว/คนรัก/ศัตรู…) — โมดูลบริสุทธิ์ ส่งต่อจาก relationship-types.js
// เพื่อให้ feature module ดึงจาก core.js ที่เดียวเหมือนค่าคงที่ตัวอื่น
export { REL_TYPES, REL_COLOR, REL_ICON, REL_LABEL, categorizeRole, categorizeWith } from './relationship-types.js';

// ---- ระบบภาษา (i18n) ----
export const i18n = { lang: 'en', strings: {}, fallback: null, available: ['en'] };

// ฮุก: หลังจากเปลี่ยนภาษาเสร็จ → ให้โมดูลอื่นลงทะเบียน callback (ex. applyToolbarShortcutTitles)
const langHooks = [];
export function onLanguageChanged(fn) { langHooks.push(fn); }

// EN built-in สำรอง — ฝังมาด้วยกันตอน build (ใช้ตอนโหลดภาษาจากโปรเจกต์ยังไม่ได้)
const BUILTIN_EN = {
  "ui": {
    "app": { "title": "Killian 2", "newProject": "New Project...", "openProject": "Open Project...", "saveAll": "Save All", "home": "Home", "ready": "Ready", "project": "Project", "saving": "Saving...", "saved": "Saved", "loading": "Loading...", "searching": "Searching..." },
    "menu": { "file": "File", "edit": "Edit", "view": "View", "format": "Format", "help": "Help", "ai": "AI" },
    "toolbar": {
      "paperMode": "Paper Mode", "toggleMode": "Toggle Mode", "normalText": "Body Text",
      "heading1": "Heading 1", "heading2": "Heading 2", "heading3": "Heading 3",
      "heading4": "Heading 4", "heading5": "Heading 5", "heading6": "Heading 6",
      "quote": "Blockquote", "bold": "Bold", "italic": "Italic", "underline": "Underline",
      "strike": "Strikethrough", "bulletList": "Bullet List", "numberList": "Numbered List",
      "blockquote": "Blockquote", "alignLeft": "Align Left", "alignCenter": "Align Center",
      "alignRight": "Align Right", "alignJustify": "Justify", "insertImage": "Insert Image",
      "viewSource": "View Markdown Source", "readingMode": "Reading Mode",
      "globalSearch": "Search Project", "kanban": "Kanban Board",
      "aiAssistant": "AI Writing Assistant", "aiChat": "Chat with Story", "plugins": "Plugin Commands"
    },
    "dialogs": { "ok": "OK", "cancel": "Cancel", "save": "Save", "delete": "Delete", "confirm": "Confirm", "yes": "Yes", "no": "No", "close": "Close", "apply": "Apply", "reset": "Reset" },
    "settings": {
      "title": "Project Settings", "general": "General", "writing": "Writing", "automation": "Automation",
      "shortcuts": "Shortcuts", "language": "Language", "projectName": "Project Name", "author": "Author",
      "autoSaveMinutes": "Auto Save every (minutes)", "autoSaveHint": "0 = disable auto save",
      "autoBackup": "Auto-backup versions on save", "maxBackups": "Max auto backups",
      "maxBackupsHint": "Named versions are not deleted", "dailyGoal": "Daily word goal",
      "projectGoal": "Project word goal",       "fontSize": "Editor font size",
      "fontSizeHint": "Adjust from default size", "uiScale": "UI size", "uiScaleHint": "Scale toolbar, panels, tabs and dialogs (75-200%)", "fontFamily": "Font Family", "fontFamilyHint": "Select a font for the editor",
      "lineNumbers": "Show line numbers",
      "lineNumbersHint": "Count by paragraph/block", "spellCheck": "Spell check",
      "spellCheckHint": "Underline misspelled words", "spellCheckDict": "Spell check with dictionary (Thai+English)",
      "spellCheckDictHint": "Offline word list", "autoMention": "Auto-detect Wiki names",
      "autoMentionHint": "Highlight names from Wiki", "recycleDays": "Auto-empty trash older than (days)",
      "recycleDaysHint": "0 = never", "focusDim": "Dim level of other lines (Focus Mode)", "focusDimHint": "0.05 = very dim - 0.8 = barely dim", "autoSync": "Auto-sync",
      "autoSyncHint": "Update entity names in all files", "languageSelect": "Interface Language",
      "downloadLanguage": "Download additional language...", "shortcutsHint": "Click Edit then press new key combo"
    },
    "errors": { "noProject": "No project open", "noFile": "File not found", "saveFailed": "Save failed", "loadFailed": "Load failed", "aiNoKey": "Please set AI API key", "aiFailed": "AI request failed", "openProjectFirst": "Open a project first", "notKillianProject": "This folder is not a Killian project", "needScene": "Open a scene first", "moveCrossDraft": "Moving across drafts not supported", "requiresCtrl": "Ctrl/⌘ required", "pressShortcut": "Press shortcut..." },
    "status": { "ready": "Ready", "saving": "Saving...", "saved": "Saved", "loading": "Loading...", "searching": "Searching...", "settingsSaved": "Settings saved", "zoom": "Zoom", "zoomReset": "Zoom reset to 100%", "uiScale": "UI size", "copied": "Markdown copied", "movedScene": "Moved scene to", "typewriterOn": "Typewriter: ON", "typewriterOff": "Typewriter: OFF", "focusOn": "Focus mode: ON", "focusOff": "Focus mode: OFF", "paperOn": "Paper mode: ON", "paperOff": "Paper mode: OFF", "dirtyClose": "tabs with unsaved changes", "saveAllAndClose": "Save all and close", "closeWithoutSaving": "Close without saving" },
    "shortcuts": { "save": "Save", "saveAll": "Save All", "saveAs": "Save As...", "newProject": "New Project", "openProject": "Open Project", "print": "Print", "closeTab": "Close Tab", "find": "Find", "settings": "Settings", "undo": "Undo", "redo": "Redo", "bold": "Bold", "italic": "Italic", "underline": "Underline", "strikethrough": "Strikethrough", "heading1": "Heading 1", "heading2": "Heading 2", "heading3": "Heading 3", "bodyText": "Body Text", "bulletList": "Bullet List", "numberedList": "Numbered List", "clearFormatting": "Clear Formatting", "alignLeft": "Align Left", "alignCenter": "Align Center", "alignRight": "Align Right", "justify": "Justify", "toggleFormat": "Toggle Mode", "paperMode": "Paper Mode", "globalSearch": "Search Project", "focusMode": "Focus Mode", "quickOpen": "Quick Open", "typewriter": "Typewriter Mode", "compile": "Compile", "splitView": "Split View", "kanban": "Kanban Board", "exportBlog": "Export as Blog HTML" }
  }
};

// แปลง dot-path (ex. "ui.toolbar.bold") → หาค่าใน i18n.strings โดยมี fallback เป็น BUILTIN_EN
export function t(key, fallback) {
  if (typeof key !== 'string' || !key) return fallback || '';   // กัน key undefined (ex. SHORTCUT_LABELS ไม่มีคีย์)
  const src = i18n.strings?.ui || BUILTIN_EN.ui;
  let v = src;
  const parts = key.split('.');
  for (const p of parts) {
    if (v && typeof v === 'object') v = v[p];
    else { v = undefined; break; }
  }
  if (v != null && typeof v === 'string' && v.length) return v;
  // fallback ใน BUILTIN_EN
  let fb = BUILTIN_EN.ui;
  for (const p of parts) {
    if (fb && typeof fb === 'object') fb = fb[p];
    else { fb = undefined; break; }
  }
  if (fb != null && typeof fb === 'string' && fb.length) return fb;
  return fallback || key;
}

// ลำดับที่ค้นหาไฟล์ภาษา: โปรเจกต์ (ผู้ใช้แก้เองได้) → ที่มากับโปรแกรม (appDir)
async function langCandidates(lang, root) {
  const out = [];
  if (typeof kapi === 'undefined') return out;
  if (root) out.push(await kapi.join(root, 'languages', lang + '.json'));
  let appDir = '';
  try { appDir = await kapi.appDir(); } catch {}
  if (appDir) {
    out.push(await kapi.join(appDir, 'languages', lang + '.json'));
    out.push(await kapi.join(appDir, 'renderer', 'languages', lang + '.json'));
  }
  return out;
}

// โหลดไฟล์ภาษา: โปรเจกต์ → ไฟล์ที่มากับโปรแกรม → ถ้าไม่มีเลย ใช้ built-in EN
export async function loadLanguage(lang, root) {
  i18n.lang = lang || 'en';
  i18n.strings = {};
  try {
    for (const langPath of await langCandidates(i18n.lang, root)) {
      if (await kapi.exists(langPath)) {
        i18n.strings = await kapi.readJson(langPath);
        i18n.available = [i18n.lang];
        applyDataI18n();
        for (const fn of langHooks) fn();
        return true;
      }
    }
  } catch {}
  // ถ้า lang==='en' → BUILTIN_EN ก็พอ (ไม่ต้องอ่านไฟล์ก็ได้)
  if (lang === 'en') {
    i18n.strings = {};
    i18n.available = ['en'];
    applyDataI18n();
    for (const fn of langHooks) fn();
    return true;
  }
  // lang อื่น แต่ไม่มีไฟล์ → fallback en
  setStatus('ไม่พบภาษา "' + lang + '" ใช้ภาษาอังกฤษแทน');
  i18n.strings = {};
  i18n.available = ['en'];
  applyDataI18n();
  return true;
}

// แทนข้อความ data-i18n ทั้งเอกสาร
export function applyDataI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      let text = t(key);
      if (text == null) { el.removeAttribute('data-i18n-applied'); return; }
      // ถ้ามี data-i18n-attr → ใส่ลง attribute นั้นแทน textContent
      const attr = el.getAttribute('data-i18n-attr');
      if (attr) { el.setAttribute(attr, text); }
      else if (el.querySelector('*')) {
        // มี element ลูกอยู่ (ex. ปุ่มควบคุมบนหัวแผง) — แทนเฉพาะ text node ห้ามล้างลูก
        const texts = [...el.childNodes].filter((n) => n.nodeType === 3);
        if (texts.length) { texts[0].nodeValue = text; for (let i = 1; i < texts.length; i++) texts[i].nodeValue = ''; }
        else el.insertBefore(document.createTextNode(text), el.firstChild);
      }
      else { el.textContent = text; }
      el.setAttribute('data-i18n-applied', '1');
    }
  });
}

// ---- คีย์ลัด (ย้ายจาก app.js → core.js) ----
export const SHORTCUTS = [
  // [code, needCtrl, needShift, channel, ...args]
  ['KeyS', true, false, 'save'],
  ['KeyS', true, true, 'save-as'],
  ['KeyN', true, false, 'new-project'],
  ['KeyO', true, false, 'open-project'],
  ['KeyP', true, false, 'print'],
  ['KeyW', true, false, 'close-tab'],
  ['KeyW', true, true, 'close-all-tabs'],
  ['KeyF', true, false, 'find'],
  ['Comma', true, false, 'settings'],
  ['KeyE', true, true, 'compile'],
  ['KeyZ', true, false, 'editor-undo'],
  ['KeyZ', true, true, 'editor-redo'],
  ['KeyY', true, false, 'editor-redo'],
  ['KeyB', true, false, 'fmt', 'bold'],
  ['KeyI', true, false, 'fmt', 'italic'],
  ['KeyU', true, false, 'fmt', 'underline'],
  ['KeyX', true, true, 'fmt', 'strike'],
  ['Digit1', true, false, 'fmt', 'heading', 1],
  ['Digit2', true, false, 'fmt', 'heading', 2],
  ['Digit3', true, false, 'fmt', 'heading', 3],
  ['Digit0', true, false, 'fmt', 'paragraph'],
  ['Digit8', true, true, 'fmt', 'ul'],
  ['Digit7', true, true, 'fmt', 'ol'],
  ['Space', true, false, 'fmt', 'clear'],
  ['KeyL', true, true, 'fmt', 'align', 'left'],
  ['KeyK', true, true, 'fmt', 'align', 'center'],
  ['KeyR', true, true, 'fmt', 'align', 'right'],
  ['KeyJ', true, true, 'fmt', 'align', 'justify'],
  ['KeyM', true, true, 'toggle-format'],
  ['KeyP', true, true, 'paper-mode'],
  ['KeyF', true, true, 'global-search'],
  ['KeyD', true, true, 'focus-mode'],
  ['KeyO', true, true, 'quick-open'],
  ['KeyT', true, true, 'typewriter'],
  ['KeyB', true, true, 'export-blog'],
  ['Backslash', true, true, 'split-view'],
  ['KeyK', true, false, 'kanban'],
];

export const shortcutId = (s) => s.slice(3).join(':');

export const SHORTCUT_LABELS = {
  'save': 'shortcuts.save', 'save-as': 'shortcuts.saveAs', 'new-project': 'shortcuts.newProject',
  'open-project': 'shortcuts.openProject', 'print': 'shortcuts.print', 'close-tab': 'shortcuts.closeTab',
  'find': 'shortcuts.find', 'settings': 'shortcuts.settings', 'editor-undo': 'shortcuts.undo', 'editor-redo': 'shortcuts.redo',
  'fmt:bold': 'shortcuts.bold', 'fmt:italic': 'shortcuts.italic', 'fmt:underline': 'shortcuts.underline', 'fmt:strike': 'shortcuts.strikethrough',
  'fmt:heading:1': 'shortcuts.heading1', 'fmt:heading:2': 'shortcuts.heading2', 'fmt:heading:3': 'shortcuts.heading3',
  'fmt:paragraph': 'shortcuts.bodyText', 'fmt:ul': 'shortcuts.bulletList', 'fmt:ol': 'shortcuts.numberedList',
  'fmt:clear': 'shortcuts.clearFormatting', 'toggle-format': 'shortcuts.toggleFormat', 'focus-mode': 'shortcuts.focusMode',
  'paper-mode': 'shortcuts.paperMode', 'global-search': 'shortcuts.globalSearch',
  'quick-open': 'shortcuts.quickOpen', 'typewriter': 'shortcuts.typewriter',
  'fmt:align:left': 'shortcuts.alignLeft', 'fmt:align:center': 'shortcuts.alignCenter',
  'fmt:align:right': 'shortcuts.alignRight', 'fmt:align:justify': 'shortcuts.justify',
  'compile': 'shortcuts.compile', 'save-all': 'shortcuts.saveAll',
  'split-view': 'shortcuts.splitView', 'kanban': 'shortcuts.kanban',
  'export-blog': 'shortcuts.exportBlog', 'close-all-tabs': 'shortcuts.closeAllTabs',
  'line-numbers': 'shortcuts.lineNumbers',
};

const isMac = (() => { try { return navigator.platform.toLowerCase().includes('mac'); } catch { return false; } })();

// แปลง code/ctrl/shift เป็นข้อความ (ใช้ใน title/tooltip/ปุ่มลัด)
export function formatShortcut(code, ctrl, shift) {
  const parts = [];
  if (ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
  if (shift) parts.push(isMac ? '⇧' : 'Shift');
  let key = code.replace(/^Key/, '').replace(/^Digit/, '');
  if (code === 'Comma') key = ','; else if (code === 'Space') key = 'Space';
  parts.push(key);
  return parts.join(isMac ? '' : '+');
}

// ชื่อเก่า (he กัน break import ใน dialogs.js)
export const accelText = formatShortcut;

// ตัวช่วย: แทรก shortcut ลงใน title string — "ข้อความ (Ctrl+B)"
export function withShortcut(labelKey, code, ctrl, shift) {
  const label = t(labelKey, labelKey);
  const sc = formatShortcut(code, ctrl, shift);
  return label + ' (' + sc + ')';
}
