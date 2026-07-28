// dialogs.js — กล่องโต้ตอบ: ตั้งค่าโปรเจกต์ · ประวัติเวอร์ชัน · changelog · ตัวดู log
import { applySettings, applySpellcheck, applyZoomVars, closeTab, fmtTs, listSnapshots, openScene, refreshAllMentions, refreshAllSpell, saveProjectMeta, snapshotFile, tb } from './app.js';
import { $, BASE_ED_FS, LOG_BUF, el, log, setStatus, state, i18n, loadLanguage, t, SHORTCUTS, SHORTCUT_LABELS, accelText, shortcutId } from './core.js';
import { renderDashboard } from './dashboard.js';
import { confirmBox } from './ui.js';
import { parseMdFile } from './md.js';
import { setAutoSync, isAutoSyncOn } from './auto-task/event-ui.js';

export function settingsDialog() {
  if (!state.root) { alert(t('errors.openProjectFirst')); return; }
  const s = state.settings, g = state.goals, m = state.meta;
  const origFont = parseInt(s.uiFontSize, 10) || 0;

  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog k-settings');
  box.innerHTML = `
    <div class="k-dlg-title">${t('settings.title')}</div>
    <div class="k-set-tabs">
      <div class="k-set-tab on" data-p="gen">${t('settings.general')}</div>
      <div class="k-set-tab" data-p="write">${t('settings.writing')}</div>
      <div class="k-set-tab" data-p="auto">${t('settings.automation')}</div>
      <div class="k-set-tab" data-p="lang">${t('settings.language')}</div>
      <div class="k-set-tab" data-p="keys">${t('settings.shortcuts')}</div>
    </div>
    <div class="k-set-page on" data-p="gen">
      <div class="k-row"><label>${t('settings.projectName')}</label><input type="text" id="st-title"></div>
      <div class="k-row"><label>${t('settings.author')}</label><input type="text" id="st-author"></div>
      <div class="k-row"><label>${t('settings.autoSaveMinutes')}<span class="k-hint">${t('settings.autoSaveHint')}</span></label><input type="number" id="st-auto" min="0" max="120"></div>
      <div class="k-row"><label>${t('settings.autoBackup')}</label><input type="checkbox" id="st-backup"></div>
      <div class="k-row"><label>${t('settings.maxBackups')}<span class="k-hint">${t('settings.maxBackupsHint')}</span></label><input type="number" id="st-maxbak" min="1" max="200"></div>
      <div class="k-row"><label>${t('settings.dailyGoal')}</label><input type="number" id="st-daily" min="0"></div>
      <div class="k-row"><label>${t('settings.projectGoal')}</label><input type="number" id="st-proj" min="0"></div>
    </div>
    <div class="k-set-page" data-p="write">
      <div class="k-row"><label>${t('settings.fontSize')}<span class="k-hint">${t('settings.fontSizeHint')} (${BASE_ED_FS}px)</span></label><input type="number" id="st-font" min="-6" max="16" step="1"></div>
      <div class="k-row"><label>${t('settings.lineNumbers')}<span class="k-hint">${t('settings.lineNumbersHint')}</span></label><input type="checkbox" id="st-ln"></div>
      <div class="k-row"><label>${t('settings.spellCheck')}<span class="k-hint">${t('settings.spellCheckHint')}</span></label><input type="checkbox" id="st-spell"></div>
      <div class="k-row"><label>${t('settings.spellCheckDict')}<span class="k-hint">${t('settings.spellCheckDictHint')}</span></label><input type="checkbox" id="st-spelldict"></div>
      <div class="k-row"><label>${t('settings.autoMention')}<span class="k-hint">${t('settings.autoMentionHint')}</span></label><input type="checkbox" id="st-mention"></div>
      <div class="k-row"><label>${t('settings.recycleDays')}<span class="k-hint">${t('settings.recycleDaysHint')}</span></label><input type="number" id="st-recycle" min="0" max="3650"></div>
    </div>
    <div class="k-set-page" data-p="auto">
      <div class="k-row"><label>⚡ ${t('settings.autoSync')}<span class="k-hint">${t('settings.autoSyncHint')}</span></label><input type="checkbox" id="st-autosync"></div>
    </div>
    <div class="k-set-page" data-p="lang">
      <div class="k-row"><label>${t('settings.languageSelect')}</label>
        <select id="st-lang">
          <option value="en">English</option>
          <option value="th">ภาษาไทย</option>
        </select>
      </div>
      <div class="k-hint" style="margin-top:10px">${t('settings.downloadLanguage')}</div>
    </div>
    <div class="k-set-page" data-p="keys">
      <div class="k-hint" style="margin-bottom:10px">${t('settings.shortcutsHint')}</div>
      <div id="st-keys"></div>
    </div>
    <div class="k-dlg-btns"><button class="k-cancel">${t('dialogs.cancel')}</button><button class="k-ok">${t('dialogs.save')}</button></div>`;
  ov.appendChild(box); document.body.appendChild(ov);

  const q = (id) => box.querySelector(id);
  q('#st-title').value = m.title || '';
  q('#st-author').value = m.author || '';
  q('#st-auto').value = s.autoSaveMinutes ?? 5;
  q('#st-backup').checked = s.autoBackup !== false;
  q('#st-maxbak').value = s.maxBackups ?? 10;
  q('#st-daily').value = g.dailyWords ?? 500;
  q('#st-proj').value = g.projectWords ?? 50000;
  q('#st-font').value = origFont;
  q('#st-ln').checked = !!s.lineNumbers;
  q('#st-spell').checked = s.spellCheck !== false;
  q('#st-spelldict').checked = s.spellCheckDict !== false;
  q('#st-mention').checked = s.autoMention !== false;
  q('#st-recycle').value = s.recycleDays ?? 30;
  q('#st-autosync').checked = isAutoSyncOn() || !!s.autoSync;
  // ---- ภาษา ----
  if (q('#st-lang')) q('#st-lang').value = i18n.lang || 'en';
  const origLang = i18n.lang;
  const origLn = !!s.lineNumbers, origSpell = s.spellCheck !== false,
        origSpellDict = s.spellCheckDict !== false, origMention = s.autoMention !== false;
  q('#st-ln').onchange = () => document.body.classList.toggle('k-ln', q('#st-ln').checked);
  q('#st-spell').onchange = () => { s.spellCheck = q('#st-spell').checked; applySpellcheck(); };
  q('#st-spelldict').onchange = () => { s.spellCheckDict = q('#st-spelldict').checked; refreshAllSpell(); };
  q('#st-mention').onchange = () => { s.autoMention = q('#st-mention').checked; refreshAllMentions(); };

  // ---- ปุ่มลัด: ทำงานบนสำเนา (workKeys) จนกดบันทึก ----
  const workKeys = JSON.parse(JSON.stringify(s.shortcuts || {}));
  const keyOf = (id, def) => workKeys[id] || def;         // def = {code,ctrl,shift} จากค่าเริ่มต้น
  function renderShortcuts() {
    const host = q('#st-keys'); host.innerHTML = '';
    // ตรวจซ้ำ: นับ accel ที่ชนกัน
    const seen = {};
    const rows = SHORTCUTS.filter((sc) => SHORTCUT_LABELS[shortcutId(sc)]).map((sc) => {
      const id = shortcutId(sc);
      const def = { code: sc[0], ctrl: sc[1], shift: sc[2] };
      const cur = keyOf(id, def);
      const key = `${cur.code}|${cur.ctrl}|${cur.shift}`;
      seen[key] = (seen[key] || 0) + 1;
      return { id, def, cur, key };
    });
    for (const r of rows) {
      const row = el('div', 'k-key-row');
      row.append(el('span', 'k-key-label', t(SHORTCUT_LABELS[r.id], r.id)));
      const accel = el('span', 'k-key-accel' + (seen[r.key] > 1 ? ' dup' : ''),
        accelText(r.cur.code, r.cur.ctrl, r.cur.shift));
      row.append(accel);
      const edit = el('button', 'k-key-btn', t('dialogs.edit'));
      const reset = el('button', 'k-key-btn', '↺');
      reset.title = t('dialogs.reset');
      reset.style.visibility = workKeys[r.id] ? 'visible' : 'hidden';
      edit.onclick = () => {
        accel.textContent = t('errors.pressShortcut'); accel.classList.add('rec');
        const grab = (e) => {
          e.preventDefault(); e.stopPropagation();
          if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;   // รอปุ่มจริง
          const ctrl = e.ctrlKey || e.metaKey;
          if (!ctrl) { accel.textContent = t('errors.requiresCtrl'); return; }          // บังคับมี modifier
          window.removeEventListener('keydown', grab, true);
          workKeys[r.id] = { code: e.code, ctrl: true, shift: e.shiftKey };
          renderShortcuts();
        };
        window.addEventListener('keydown', grab, true);
      };
      reset.onclick = () => { delete workKeys[r.id]; renderShortcuts(); };
      row.append(edit, reset); host.append(row);
    }
  }
  renderShortcuts();

  box.querySelectorAll('.k-set-tab').forEach((t) => t.onclick = () => {
    box.querySelectorAll('.k-set-tab').forEach((x) => x.classList.toggle('on', x === t));
    box.querySelectorAll('.k-set-page').forEach((p) =>
      p.classList.toggle('on', p.dataset.p === t.dataset.p));
  });
  q('#st-font').oninput = () => applyZoomVars(parseInt(q('#st-font').value, 10) || 0);

  const close = () => ov.remove();
  const cancel = () => {
    applyZoomVars(origFont);
    document.body.classList.toggle('k-ln', origLn);
    s.spellCheck = origSpell; s.autoMention = origMention;
    s.spellCheckDict = origSpellDict;
    applySpellcheck(); refreshAllMentions(); refreshAllSpell();
    close();
  };
  const num = (id, d) => { const n = parseInt(q(id).value, 10); return Number.isFinite(n) ? Math.max(0, n) : d; };

  box.querySelector('.k-cancel').onclick = cancel;
  ov.onclick = (e) => { if (e.target === ov) cancel(); };
  box.querySelector('.k-ok').onclick = async () => {
    m.title = q('#st-title').value.trim() || m.title;
    m.author = q('#st-author').value.trim();
    s.autoSaveMinutes = num('#st-auto', 5);
    s.autoBackup = q('#st-backup').checked;
    s.maxBackups = Math.max(1, num('#st-maxbak', 10));
    s.uiFontSize = Math.max(-6, Math.min(16, parseInt(q('#st-font').value, 10) || 0));
    s.lineNumbers = q('#st-ln').checked;
    s.spellCheck = q('#st-spell').checked;
    s.spellCheckDict = q('#st-spelldict').checked;
    s.autoMention = q('#st-mention').checked;
    s.recycleDays = Math.max(0, num('#st-recycle', 30));
    s.shortcuts = workKeys;
    // Auto-sync (เก็บลง settings ด้วย — ไม่งั้นเปิดโปรแกรมใหม่แล้วกลับไปปิด)
    s.autoSync = q('#st-autosync').checked;
    setAutoSync(s.autoSync);
    g.dailyWords = num('#st-daily', 500);
    g.projectWords = num('#st-proj', 50000);
    try {
      await saveProjectMeta();
      applySettings();
      state.title = m.title;
      document.title = m.title + ' — Killian 2';
      $('#projname').textContent = m.title;
      $('#tb-title').textContent = m.title + ' — Killian 2';
      const dash = state.tabs.get('::dash::');
      if (dash) renderDashboard(dash.pane);
    } catch (e) { log('error', 'บันทึกการตั้งค่าล้มเหลว', e); }
    // ---- บันทึกภาษา ----
    const selLang = q('#st-lang')?.value;
    if (selLang && selLang !== origLang) {
      s.language = selLang;
      await loadLanguage(selLang, state.root);
      await saveProjectMeta();
    }
    setStatus(t('status.settingsSaved'));
    close();
  };
  box.addEventListener('keydown', (e) => { if (e.key === 'Escape') cancel(); });
  q('#st-title').focus();
}

export async function versionDialog(dPath, ch, sc) {
  const file = await kapi.join(dPath, 'Chapters', ch.folderName, sc.fileName);
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog k-ver');
  box.append(el('div', 'k-dlg-title', t('panel.versionHistoryTitle') + sc.title));
  const body = el('div', 'k-ver-body');
  const listCol = el('div', 'k-ver-list');
  const prev = el('div', 'k-ver-prev'); prev.textContent = t('panel.chooseVersion');
  body.append(listCol, prev); box.append(body);
  const foot = el('div', 'k-dlg-btns'); const closeB = el('button', null, t('dialogs.close'));
  foot.append(closeB); box.append(foot);
  ov.append(box); document.body.append(ov);
  closeB.onclick = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };

  async function refresh() {
    listCol.innerHTML = '';
    const snaps = await listSnapshots(file);
    if (!snaps.length) { listCol.append(el('div', 'dim', t('panel.noVersions'))); return; }
    for (const s of snaps) {
      const it = el('div', 'k-ver-item');
      const meta = el('div', 'k-ver-meta');
      meta.append(el('div', 'k-ver-time', fmtTs(s.ts)));
      if (s.label) meta.append(el('span', 'k-ver-label', s.label));
      it.append(meta);
      const acts = el('div', 'k-ver-acts');
      const bView = el('button', null, t('dialogs.view')); bView.onclick = async () => {
        try { const c = await kapi.readFile(s.path); prev.textContent = parseMdFile(c).body || t('panel.emptyContent'); }
        catch { prev.textContent = t('panel.unreadable'); }
        [...listCol.querySelectorAll('.k-ver-item')].forEach((x) => x.classList.remove('on'));
        it.classList.add('on');
      };
      const bRes = el('button', 'k-ok', t('dialogs.restore')); bRes.onclick = async () => {
        if (!(await confirmBox(t('panel.confirmRestore'), t('dialogs.restore')))) return;
        await snapshotFile(file, t('panel.beforeRestore'));           // เซฟของปัจจุบันไว้ก่อน
        const c = await kapi.readFile(s.path);
        await kapi.writeFile(file, c);
        const openTab = state.tabs.get(file);
        if (openTab) {                                     // ปิดแล้วเปิดใหม่ให้โหลดสด (รองรับทั้งนิยาย/บทหนัง)
          openTab.dirty = false;
          const title = openTab.title;
          closeTab(file); openScene(file, title);
        }
        setStatus(t('status.versionRestored')); refresh();
      };
      const bDel = el('button', 'k-danger-btn', t('dialogs.delete')); bDel.onclick = async () => {
        if (await confirmBox(t('panel.confirmDelete'))) { await kapi.remove(s.path); refresh(); }
      };
      acts.append(bView, bRes, bDel); it.append(acts); listCol.append(it);
    }
  }
  refresh();
}

export async function showChangelog() {
  const md = await fetch('CHANGELOG.md').then((r) => r.text()).catch(() => t('panel.changelogNotFound'));
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog k-wide');
  const ttl = el('div', 'k-dlg-title', t('panel.changelogTitle'));
  const body = el('pre', 'k-changelog', md);
  const btns = el('div', 'k-dlg-btns');
  const ok = el('button', 'k-ok', t('dialogs.close'));
  ok.onclick = () => ov.remove();
  btns.append(ok); box.append(ttl, body, btns); ov.append(box);
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.append(ov);
}

export async function showLog() {
  log('info', 'เปิดตัวดู log');
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog k-wide');
  const ttl = el('div', 'k-dlg-title', t('panel.logTitle'));
  const body = el('pre', 'k-changelog k-logview');
  const load = async () => {
    let text = '';
    try { text = (await kapi.logRead(800)) || ''; } catch {}
    if (!text) text = LOG_BUF.slice(-800).join('\n');
    body.textContent = text || t('panel.logEmpty');
    body.scrollTop = body.scrollHeight;
  };
  await load();
  const btns = el('div', 'k-dlg-btns');
  const refresh = el('button', null, '↻ ' + t('dialogs.refresh')); refresh.onclick = load;
  const reveal = el('button', null, '📁 ' + t('dialogs.openFolder')); reveal.onclick = () => kapi.logReveal && kapi.logReveal();
  const copy = el('button', null, '📋 ' + t('dialogs.copy'));
  copy.onclick = () => { navigator.clipboard.writeText(body.textContent).then(() => setStatus(t('status.logCopied'))); };
  const ok = el('button', 'k-ok', t('dialogs.close')); ok.onclick = () => ov.remove();
  btns.append(refresh, reveal, copy, ok);
  box.append(ttl, body, btns); ov.append(box);
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.append(ov);
}
