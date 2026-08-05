// ai-chat-panel.js — [alpha.61 ข้อ 2] แผงแชท AI แบบ opencode
//
// โครงหน้าจอ 3 ชั้น (สลับกันในแผงเดียว ไม่เปิดหน้าต่างใหม่):
//   A) รายการเซสชัน  — ช่องค้นหา · เซสชันล่าสุด · ปุ่มเพิ่มเซสชันใหม่
//   B) ตัวเซสชัน     — มุมบนซ้าย = ชื่อเซสชัน · มุมบนขวา = ป้ายบริบท (hover เห็นต้นทุน/%/token)
//                      + เมนู ⋯ (เปลี่ยนชื่อ · แชร์ · จัดเก็บ · ลบ)
//   C) รายละเอียด    — กดที่ป้ายบริบทแล้วเข้ามา · มีปุ่มปิดกลับไปเซสชัน · ปุ่มแสดงข้อความดิบ (JSON)
//
// เซสชันเก็บเป็นไฟล์ JSON ใน `<โปรเจกต์>/Sessions/` — เปลี่ยนโปรเจกต์ = เห็นคนละชุด

import { $, el, state, setStatus, log } from '../core.js';
import { ask, confirmBox, popupMenu } from '../ui.js';
import {
  SESSION_DIR, CHAT_MODES, SCOPES, DEFAULT_MODE, DEFAULT_SCOPE, DEFAULT_SEND_KEY,
  modeDef, scopeLabel, isSendKey, newSession, newMessage, addMessage, renameSession,
  archiveSession, sessionFileName, sessionStats, contextLabel, compact, usd,
  searchSessions, chatMessages, rawJson, shareMarkdown, estimateTokens,
} from './ai-session.js';
import { providerList, providerById, currentProvider, complete, aiMeta } from './ai-provider-ui.js';

// สถานะของแผง (แผงเดียวในแอป — ไม่ต้องแยกอินสแตนซ์)
const S = {
  host: null,
  view: 'list',          // list | session | detail
  sessions: [],          // เซสชันทั้งหมดของโปรเจกต์ที่เปิดอยู่
  cur: null,             // เซสชันที่กำลังเปิด
  query: '',
  showArchived: false,
  sending: false,
  root: null,            // โปรเจกต์ที่โหลดรายการนี้มา (เปลี่ยนโปรเจกต์ = โหลดใหม่)
};

// ────────────────────────────── ที่เก็บไฟล์ ──────────────────────────────
async function sessionsDir() {
  if (!state.root) return null;
  const d = await kapi.join(state.root, SESSION_DIR);
  if (!(await kapi.exists(d))) await kapi.mkdir(d);
  return d;
}
export async function loadSessions(force) {
  if (!state.root) { S.sessions = []; S.root = null; return S.sessions; }
  if (!force && S.root === state.root) return S.sessions;
  S.root = state.root;
  S.sessions = [];
  try {
    const d = await sessionsDir();
    if (!d) return S.sessions;
    for (const f of await kapi.listFiles(d)) {
      if (!/\.json$/i.test(f)) continue;
      try {
        const j = await kapi.readJson(await kapi.join(d, f));
        if (j && j.id) S.sessions.push(newSession(j));
      } catch (e) { log('warn', 'ai-chat: อ่านเซสชันไม่ได้ ' + f, e); }
    }
  } catch (e) { log('warn', 'ai-chat: อ่านโฟลเดอร์เซสชันไม่ได้', e); }
  return S.sessions;
}
async function saveSession(s) {
  const d = await sessionsDir();
  if (!d) return false;
  await kapi.writeFile(await kapi.join(d, sessionFileName(s)), JSON.stringify(s, null, 2));
  const i = S.sessions.findIndex((x) => x.id === s.id);
  if (i === -1) S.sessions.push(s); else S.sessions[i] = s;
  return true;
}
async function deleteSessionFile(s) {
  const d = await sessionsDir();
  if (!d) return false;
  try { await kapi.remove(await kapi.join(d, sessionFileName(s))); } catch {}
  S.sessions = S.sessions.filter((x) => x.id !== s.id);
  return true;
}

// ────────────────────────────── บริบทที่ AI มองเห็น (ระดับการเข้าถึง) ──────────────────────────────
/**
 * ดึงเนื้อหาของโปรเจกต์ตาม scope ที่เซสชันตั้งไว้
 * project = ทุกฉากทุกเล่ม · book/chapter = เฉพาะสาขานั้น · scene = ไฟล์ที่เปิดอยู่ · none = ไม่ให้เลย
 */
export async function collectScope(session, { maxChars = 24000 } = {}) {
  const scope = session.scope || DEFAULT_SCOPE;
  if (scope === 'none' || !state.root) return '';
  const parts = [];
  const push = async (file, label) => {
    try {
      const raw = await kapi.readFile(file);
      const { parseMdFile } = await import('../md.js');
      parts.push('### ' + label + '\n' + parseMdFile(raw).body);
    } catch {}
  };
  const active = state.active;
  if (scope === 'scene') {
    if (active && active.file && !active.file.startsWith('::')) await push(active.file, active.title || 'ฉากที่เปิดอยู่');
  } else {
    // ระดับที่กว้างกว่าฉาก — เดินโครงโปรเจกต์จริง แล้วกรองตาม "ที่อยู่" ของไฟล์ที่เปิดอยู่
    const here = (active && active.file) || '';
    const sep = here.includes('\\') ? '\\' : '/';
    const upto = (n) => here.split(sep).slice(0, -n).join(sep);
    const prefix = scope === 'project' ? state.root
                 : scope === 'chapter' ? upto(1)          // โฟลเดอร์บท
                 : upto(3);                               // .../Draft/<ฉบับร่าง>/Chapters/<บท>/x.md → เล่ม
    const files = await allMdFiles(state.root);
    for (const f of files) {
      if (prefix && !f.startsWith(prefix)) continue;
      await push(f, f.slice(state.root.length + 1));
      if (parts.join('\n').length > maxChars) break;
    }
  }
  // แนบไฟล์ที่ผู้ใช้เพิ่มเองด้วย 📎 (นอกเหนือจาก scope)
  for (const f of session.files || []) await push(f.path, '📎 ' + (f.name || f.path));
  const text = parts.join('\n\n');
  return text.length > maxChars ? text.slice(0, maxChars) + '\n…(ตัดเพราะยาวเกิน)' : text;
}
async function allMdFiles(root, depth = 0) {
  if (depth > 6) return [];
  const out = [];
  let dirs = [], files = [];
  try { dirs = await kapi.listDirs(root); } catch {}
  try { files = await kapi.listFiles(root); } catch {}
  for (const f of files) if (/\.md$/i.test(f)) out.push(await kapi.join(root, f));
  for (const d of dirs) {
    if (['Snapshots', 'Recycle', 'Images', SESSION_DIR, 'Plugins'].includes(d)) continue;
    out.push(...await allMdFiles(await kapi.join(root, d), depth + 1));
  }
  return out;
}

// ────────────────────────────── entry ──────────────────────────────
export async function renderAIChatPanel(host) {
  S.host = host || $('#ai-chat-body');
  if (!S.host) return null;
  if (!state.root) {
    S.host.innerHTML = '';
    S.host.append(el('div', 'ai-chat-empty dim', 'เปิดโปรเจกต์ก่อน แล้วเซสชันแชทจะถูกเก็บใน Sessions/ ของโปรเจกต์นั้น'));
    return S.host;
  }
  await loadSessions();
  if (S.cur) { const fresh = S.sessions.find((x) => x.id === S.cur.id); if (fresh) S.cur = fresh; else S.cur = null; }
  if (!S.cur && S.view !== 'list') S.view = 'list';
  draw();
  return S.host;
}
function draw() {
  const h = S.host;
  if (!h) return;
  h.innerHTML = '';
  h.classList.add('ai-chat');
  if (S.view === 'list') h.append(listView());
  else if (S.view === 'detail') h.append(detailView());
  else h.append(sessionView());
}

// ══════════════════════════ A) รายการเซสชัน ══════════════════════════
function listView() {
  const wrap = el('div', 'ai-chat-list');

  const bar = el('div', 'ai-chat-listbar');
  const q = el('input', 'ai-chat-search');
  q.type = 'search';
  q.placeholder = 'ค้นหาเซสชัน (ชื่อ หรือข้อความในเซสชัน)…';
  q.value = S.query;
  const addBtn = el('button', 'k-ok ai-chat-new', '➕ เซสชันใหม่');
  bar.append(q, addBtn);
  wrap.append(bar);

  const rows = el('div', 'ai-chat-rows');
  wrap.append(rows);

  const arch = el('label', 'ai-chat-archtoggle');
  const cb = el('input');
  cb.type = 'checkbox';
  cb.checked = S.showArchived;
  arch.append(cb, document.createTextNode(' แสดงเซสชันที่จัดเก็บแล้ว'));
  wrap.append(arch);

  function fill() {
    rows.innerHTML = '';
    const list = searchSessions(S.sessions, S.query, { includeArchived: S.showArchived });
    if (!list.length) {
      rows.append(el('div', 'ai-chat-empty dim',
        S.query ? 'ไม่พบเซสชันที่ตรงกับคำค้น' : 'ยังไม่มีเซสชัน — กด "➕ เซสชันใหม่" เพื่อเริ่มคุย'));
      return;
    }
    for (const s of list) rows.append(sessionRow(s));
  }
  q.oninput = () => { S.query = q.value; fill(); };
  cb.onchange = () => { S.showArchived = cb.checked; fill(); };
  addBtn.onclick = async () => {
    const s = newSession({ mode: DEFAULT_MODE, scope: DEFAULT_SCOPE });
    await saveSession(s);
    S.cur = s; S.view = 'session';
    draw();
  };
  fill();
  return wrap;
}
function sessionRow(s) {
  const row = el('div', 'ai-chat-row');
  if (s.archived) row.classList.add('archived');
  row.dataset.session = s.id;
  const main = el('div', 'ai-chat-row-main');
  main.append(el('div', 'ai-chat-row-title', s.title || 'เซสชัน'));
  const last = [...(s.messages || [])].reverse().find((m) => m.text);
  main.append(el('div', 'ai-chat-row-sub dim',
    last ? String(last.text).replace(/\s+/g, ' ').slice(0, 90) : 'ยังไม่มีข้อความ'));
  const meta = el('div', 'ai-chat-row-meta dim');
  const st = sessionStats(s);
  meta.append(el('span', 'ai-chat-row-date', fmtDate(s.updated)));
  meta.append(el('span', 'ai-chat-row-tok', compact(st.total) + ' tok'));
  row.append(main, meta);
  row.onclick = () => { S.cur = s; S.view = 'session'; draw(); };
  return row;
}
function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString('th-TH',
      { year: '2-digit', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

// ══════════════════════════ B) ตัวเซสชัน ══════════════════════════
function sessionView() {
  const s = S.cur;
  const wrap = el('div', 'ai-chat-session');

  // ── หัว: ซ้าย = ชื่อเซสชัน · ขวา = ป้ายบริบท + เมนู ⋯ ──
  const head = el('div', 'ai-chat-head');
  const back = el('button', 'ai-chat-back', '←');
  back.title = 'กลับไปรายการเซสชัน';
  back.onclick = () => { S.view = 'list'; draw(); };
  const title = el('div', 'ai-chat-title', s.title || 'เซสชัน');
  title.title = s.title || '';
  const right = el('div', 'ai-chat-head-right');
  const st = sessionStats(s);
  const badge = el('button', 'ai-chat-ctx', contextLabel(st));
  // hover = ต้นทุน (USD) · การใช้งาน % ของเซสชัน · token ที่ใช้
  badge.title = [
    'ต้นทุน: ' + usd(st.usd),
    'การใช้งาน: ' + (st.limit ? st.percent + '%' : 'ไม่รู้ขีดจำกัดของโมเดล'),
    'โทเค็นที่ใช้: ' + st.total.toLocaleString(),
    '— คลิกเพื่อดูรายละเอียด —',
  ].join('\n');
  badge.onclick = () => { S.view = 'detail'; draw(); };
  const more = el('button', 'ai-chat-more', '⋯');
  more.title = 'ตัวเลือกของเซสชัน';
  more.onclick = (e) => sessionMenu(e, s);
  right.append(badge, more);
  head.append(back, title, right);
  wrap.append(head);

  // ── ข้อความ ──
  const body = el('div', 'ai-chat-msgs');
  if (!(s.messages || []).length) {
    body.append(el('div', 'ai-chat-empty dim',
      'เริ่มคุยได้เลย — โหมด "' + modeDef(s.mode).label + '" · เห็นข้อมูล: ' + scopeLabel(s.scope)));
  }
  for (const m of s.messages || []) body.append(msgNode(m));
  wrap.append(body);

  // ── กล่องพิมพ์ ──
  wrap.append(composer(s, body));
  setTimeout(() => { body.scrollTop = body.scrollHeight; }, 0);
  return wrap;
}
function msgNode(m) {
  const n = el('div', 'ai-msg ai-msg-' + m.role);
  const who = el('div', 'ai-msg-who dim',
    m.role === 'user' ? 'คุณ' : m.role === 'assistant' ? (m.model ? '🤖 ' + m.model : '🤖 ผู้ช่วย') : m.role);
  const txt = el('div', 'ai-msg-text', m.text);
  n.append(who, txt);
  if (m.error) n.append(el('div', 'ai-msg-err', '⚠ ' + m.error));
  if (m.files && m.files.length) {
    n.append(el('div', 'ai-msg-files dim', '📎 ' + m.files.map((f) => f.name || f.path).join(', ')));
  }
  return n;
}

function composer(s, body) {
  const box = el('div', 'ai-chat-composer');

  // แถวควบคุม: 📎 ไฟล์ · โหมด · โมเดล (override) · ระดับการเข้าถึง
  const ctrls = el('div', 'ai-chat-ctrls');
  const fileBtn = el('button', 'ai-chat-file', '📎');
  fileBtn.title = 'เพิ่มไฟล์เข้าบริบทของเซสชันนี้';
  const modeSel = el('select', 'ai-chat-mode');
  for (const m of CHAT_MODES) { const o = el('option', null, m.icon + ' ' + m.label); o.value = m.id; modeSel.append(o); }
  modeSel.value = s.mode || DEFAULT_MODE;
  modeSel.title = 'โหมดการทำงาน — วางแผน = อ่านอย่างเดียว · ช่วยเขียน = แก้ไข/สร้างไฟล์ได้';

  // โมเดลของเซสชัน = **override จากตั้งค่า** แยกกันเป็นอิสระ
  const modelSel = el('select', 'ai-chat-model');
  modelSel.title = 'โมเดลของเซสชันนี้ — ทับค่าที่ตั้งไว้ในตั้งค่า AI (อิสระต่อกัน)';
  const scopeSel = el('select', 'ai-chat-scope');
  for (const sc of SCOPES) { const o = el('option', null, sc.label); o.value = sc.id; scopeSel.append(o); }
  scopeSel.value = s.scope || DEFAULT_SCOPE;
  scopeSel.title = 'ระดับการเข้าถึง — AI จะเห็นเนื้อหาแค่ระดับนี้';
  ctrls.append(fileBtn, modeSel, modelSel, scopeSel);
  box.append(ctrls);

  fillModelSelect(modelSel, s);

  const filesRow = el('div', 'ai-chat-files dim');
  const drawFiles = () => {
    filesRow.innerHTML = '';
    filesRow.style.display = (s.files || []).length ? '' : 'none';
    for (const f of s.files || []) {
      const chip = el('span', 'ai-chat-filechip', '📎 ' + (f.name || f.path));
      const x = el('span', 'ai-chat-filex', '×');
      x.onclick = async () => {
        s.files = s.files.filter((y) => y.path !== f.path);
        await saveSession(s); drawFiles();
      };
      chip.append(x);
      filesRow.append(chip);
    }
  };
  drawFiles();
  box.append(filesRow);

  // แถวพิมพ์ + ปุ่มส่ง
  const inputRow = el('div', 'ai-chat-inputrow');
  const ta = el('textarea', 'ai-chat-input');
  ta.rows = 3;
  const sendKey = aiMeta().sendKey || DEFAULT_SEND_KEY;
  ta.placeholder = sendKey === 'shift-enter'
    ? 'พิมพ์ข้อความ… (Shift+Enter = ส่ง · Enter = ขึ้นบรรทัด)'
    : 'พิมพ์ข้อความ… (Enter = ส่ง · Shift+Enter = ขึ้นบรรทัด)';
  const sendBtn = el('button', 'k-ok ai-chat-send', 'ส่ง');
  sendBtn.title = 'ปุ่มส่งตั้งได้ที่ ไฟล์ → ตั้งค่า AI';
  inputRow.append(ta, sendBtn);
  box.append(inputRow);

  modeSel.onchange = async () => { s.mode = modeSel.value; await saveSession(s); };
  scopeSel.onchange = async () => { s.scope = scopeSel.value; await saveSession(s); };
  modelSel.onchange = async () => {
    const [pid, model] = String(modelSel.value).split(' ');
    s.providerId = pid || ''; s.model = model || '';
    await saveSession(s);
  };
  fileBtn.onclick = async () => {
    const p = await (kapi.openFileDialog ? kapi.openFileDialog() : null);
    if (!p) { setStatus('เลือกไฟล์ไม่สำเร็จ'); return; }
    s.files = [...(s.files || []), { path: p, name: String(p).replace(/^.*[\\/]/, '') }];
    await saveSession(s); drawFiles();
  };

  const doSend = () => send(s, ta, body, sendBtn);
  sendBtn.onclick = doSend;
  ta.onkeydown = (e) => {
    if (!isSendKey(e, aiMeta().sendKey || DEFAULT_SEND_KEY)) return;
    e.preventDefault();
    doSend();
  };
  setTimeout(() => ta.focus(), 0);
  return box;
}

function fillModelSelect(sel, s) {
  sel.innerHTML = '';
  const provs = providerList();
  const dflt = el('option', null, '(ตามตั้งค่า AI)');
  dflt.value = '';
  sel.append(dflt);
  for (const p of provs) {
    const models = p.models && p.models.length ? p.models : (p.model ? [p.model] : []);
    if (!models.length) continue;
    const g = el('optgroup');
    g.label = p.name;
    for (const m of models) {
      const o = el('option', null, m);
      o.value = p.id + ' ' + m;
      g.append(o);
    }
    sel.append(g);
  }
  sel.value = s.providerId && s.model ? s.providerId + ' ' + s.model : '';
}

// ── ส่งข้อความ ──
async function send(s, ta, body, sendBtn) {
  const text = String(ta.value || '').trim();
  if (!text || S.sending) return;
  const prov = s.providerId ? await providerById(s.providerId) : await currentProvider();
  if (!prov) {
    setStatus('❌ ยังไม่ได้ตั้งค่าผู้ให้บริการ AI — ไฟล์ → ตั้งค่า AI');
    return;
  }
  S.sending = true;
  sendBtn.disabled = true;
  ta.value = '';

  const userMsg = newMessage('user', text, { files: (s.files || []).slice() });
  S.cur = addMessage(s, userMsg);
  await saveSession(S.cur);
  body.append(msgNode(userMsg));
  const pend = el('div', 'ai-msg ai-msg-assistant ai-msg-pending');
  pend.append(el('div', 'ai-msg-who dim', '🤖 กำลังคิด…'));
  body.append(pend);
  body.scrollTop = body.scrollHeight;

  const md = modeDef(S.cur.mode);
  let system = md.system;
  try {
    const ctx = await collectScope(S.cur);
    if (ctx) system += '\n\nข้อมูลจากโปรเจกต์ (ระดับการเข้าถึง: ' + scopeLabel(S.cur.scope) + '):\n' + ctx;
  } catch (e) { log('warn', 'ai-chat: รวบรวมบริบทไม่สำเร็จ', e); }

  const res = await complete(prov, {
    system,
    messages: chatMessages(S.cur),
    model: s.model || undefined,
  });
  pend.remove();

  const reply = res.ok
    ? newMessage('assistant', res.text, { usage: res.usage, model: res.model, provider: res.provider })
    : newMessage('assistant', '', { error: res.error || 'เรียก AI ไม่สำเร็จ' });
  S.cur = addMessage(S.cur, reply);
  // ขีดจำกัดบริบทของโมเดล: เดาจากยอดสูงสุดที่เคยเห็น (API ส่วนใหญ่ไม่บอกตรง ๆ)
  if (res.ok && res.usage) {
    const used = (res.usage.input || 0) + (res.usage.output || 0);
    S.cur.contextLimit = Math.max(S.cur.contextLimit || 0, guessLimit(used));
  }
  await saveSession(S.cur);
  recordUsage(res, prov, s);
  S.sending = false;
  sendBtn.disabled = false;
  body.append(msgNode(reply));
  body.scrollTop = body.scrollHeight;
  // ชื่อเซสชันอาจเพิ่งถูกตั้งจากข้อความแรก → วาดหัวใหม่
  const t = S.host && S.host.querySelector('.ai-chat-title');
  if (t) t.textContent = S.cur.title;
  const badge = S.host && S.host.querySelector('.ai-chat-ctx');
  if (badge) {
    const st2 = sessionStats(S.cur);
    badge.textContent = contextLabel(st2);
    badge.title = ['ต้นทุน: ' + usd(st2.usd),
                   'การใช้งาน: ' + (st2.limit ? st2.percent + '%' : 'ไม่รู้ขีดจำกัดของโมเดล'),
                   'โทเค็นที่ใช้: ' + st2.total.toLocaleString(),
                   '— คลิกเพื่อดูรายละเอียด —'].join('\n');
  }
  if (!res.ok) setStatus('❌ AI: ' + (res.error || ''));
}
/** ขีดจำกัดที่พบบ่อย — เลือกอันเล็กสุดที่ยังใหญ่กว่ายอดที่ใช้จริง */
function guessLimit(used) {
  for (const L of [8192, 16384, 32768, 65536, 128000, 200000, 1000000]) if (used <= L) return L;
  return used;
}
function recordUsage(res, prov, s) {
  if (!state.meta || !res.ok || !res.usage) return;
  const ai = aiMeta();
  const list = ai.usage || [];
  list.push({ date: new Date().toISOString(), tokens: res.usage.total || 0,
              in: res.usage.input || 0, out: res.usage.output || 0,
              provider: prov.name, model: res.model, feature: 'chat', session: s.id });
  if (list.length > 500) list.splice(0, list.length - 500);
  ai.usage = list;
}

// ── เมนู ⋯ ──
function sessionMenu(ev, s) {
  popupMenu(ev.clientX, ev.clientY, [
    { label: '✎ เปลี่ยนชื่อ', click: async () => {
      const v = await ask('ชื่อเซสชัน', { value: s.title });
      if (v === null) return;
      S.cur = renameSession(s, v);
      await saveSession(S.cur); draw();
    } },
    { label: '↗ แชร์ (คัดลอกเป็น Markdown)', click: async () => {
      try { await navigator.clipboard.writeText(shareMarkdown(s)); setStatus('คัดลอกบทสนทนาแล้ว'); }
      catch { setStatus('คัดลอกไม่สำเร็จ'); }
    } },
    { label: s.archived ? '📤 เอาออกจากที่จัดเก็บ' : '📥 จัดเก็บ', click: async () => {
      S.cur = archiveSession(s, !s.archived);
      await saveSession(S.cur);
      S.view = 'list'; draw();
      setStatus(S.cur.archived ? 'จัดเก็บเซสชันแล้ว' : 'เอาเซสชันออกจากที่จัดเก็บแล้ว');
    } },
    '-',
    { label: '🗑 ลบเซสชันนี้', click: async () => {
      if (!(await confirmBox(`ลบเซสชัน "${s.title}" ?`))) return;
      await deleteSessionFile(s);
      S.cur = null; S.view = 'list'; draw();
      setStatus('ลบเซสชันแล้ว');
    } },
  ]);
}

// ══════════════════════════ C) รายละเอียดบริบท ══════════════════════════
function detailView() {
  const s = S.cur;
  const st = sessionStats(s);
  const wrap = el('div', 'ai-chat-detail');

  const head = el('div', 'ai-chat-head');
  head.append(el('div', 'ai-chat-title', 'รายละเอียดบริบท'));
  const closeBtn = el('button', 'ai-chat-close', '✕');
  closeBtn.title = 'ปิด — กลับไปที่เซสชัน';
  closeBtn.onclick = () => { S.view = 'session'; draw(); };
  const hr = el('div', 'ai-chat-head-right');
  hr.append(closeBtn);
  head.append(hr);
  wrap.append(head);

  const prov = providerList().find((p) => p.id === s.providerId);
  const lastAssistant = [...(s.messages || [])].reverse().find((m) => m.role === 'assistant' && m.model);
  const rows = [
    ['ชื่อเซสชัน', s.title || '—'],
    ['ข้อความในเซสชัน', (s.messages || []).length.toLocaleString() + ' ข้อความ'],
    ['ผู้ให้บริการ', prov ? prov.name : (lastAssistant && lastAssistant.provider) || '(ตามตั้งค่า AI)'],
    ['โมเดล', s.model || (lastAssistant && lastAssistant.model) || '(ตามตั้งค่า AI)'],
    ['ขีดจำกัด', st.limit ? st.limit.toLocaleString() + ' tokens' : 'ไม่ทราบ'],
    ['โทเค็นที่ใช้', st.total.toLocaleString()],
    ['การใช้งาน', st.limit ? st.percent + '%' : '—'],
    ['โทเค็นนำเข้า', st.input.toLocaleString()],
    ['โทเค็นส่งออก', st.output.toLocaleString()],
    ['โทเค็นแบบใช้เหตุผล', st.reasoning.toLocaleString()],
    ['โทเค็นแคช', st.cached.toLocaleString()],
    ['จำนวนข้อความผู้ใช้', String(st.userMsgs)],
    ['จำนวนข้อความผู้ช่วย', String(st.agentMsgs)],
    ['ต้นทุน (USD)', usd(st.usd)],
    ['วันที่สร้างเซสชัน', fmtDate(s.created)],
    ['ใช้งานล่าสุด', fmtDate(s.updated)],
    ['โหมด', modeDef(s.mode).label],
    ['ระดับการเข้าถึง', scopeLabel(s.scope)],
  ];
  const table = el('div', 'ai-detail-grid');
  for (const [k, v] of rows) {
    table.append(el('div', 'ai-detail-k dim', k));
    table.append(el('div', 'ai-detail-v', v));
  }
  wrap.append(table);

  const rawBtn = el('button', 'ai-detail-raw', '{ } แสดงข้อความดิบ (JSON)');
  const pre = el('pre', 'ai-detail-json');
  pre.style.display = 'none';
  pre.textContent = rawJson(s);
  rawBtn.onclick = () => {
    const on = pre.style.display === 'none';
    pre.style.display = on ? '' : 'none';
    rawBtn.classList.toggle('on', on);
  };
  wrap.append(rawBtn, pre);
  return wrap;
}

// ────────────────────────────── ทางเข้าจากภายนอก ──────────────────────────────
/** เปิดแผงแล้วเริ่มเซสชันใหม่ทันที (เมนู AI → แชท) */
export async function newChatSession() {
  await loadSessions(true);
  const s = newSession({ mode: DEFAULT_MODE, scope: DEFAULT_SCOPE });
  await saveSession(s);
  S.cur = s; S.view = 'session';
  draw();
  return s;
}
/** สำหรับ selftest — เข้าถึงสถานะภายในโดยไม่ต้องผ่าน DOM */
export function _chatState() { return S; }
export { estimateTokens };
