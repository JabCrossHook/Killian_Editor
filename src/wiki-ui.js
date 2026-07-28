// wiki-ui.js — Wiki: หมวด (สร้าง/แก้/ลบ) + เอนทิตี้ (เพิ่ม/เปิด/ทำสำเนา)
import { INV_C, activate, allCatKeys, applyTemplate, buildTree, catEditDialog, catIcon, catKeyFrom, catLabel, closeTab, entityCreateDialog, fieldLabels, guid, invertRole, markDirty, pickFromList, relationDialog, safeName, saveProjectMeta, spellChecker, wikiRoot } from './app.js';
import { $, BUILTIN_CATS, el, setStatus, smart, state } from './core.js';
import { pickImage } from './gallery.js';
import { confirmBox } from './ui.js';
import { CAT_TH, WikiEditor } from './wiki.js';
import { ensureAutoLink, renderBacklinksTab } from './world-story/auto-link-ui.js';
import { notifyEntityRenamed } from './auto-task/event-ui.js';
import { findScenePath } from './project-scan.js';

export function wikiCats() {
  if (!state.meta) return [];
  if (!Array.isArray(state.meta.wikiCats)) state.meta.wikiCats = [];
  return state.meta.wikiCats;
}

export function applyWikiCats() { for (const c of wikiCats()) if (c.key && c.label) CAT_TH[c.key] = c.label; }

export async function newWikiCat() {
  const res = await catEditDialog({ label: '', icon: '🔖' }, 'สร้างหมวดใหม่');
  if (!res) return null;
  const key = catKeyFrom(res.label);
  const exist = await allCatKeys();
  if (exist.includes(key)) { setStatus('มีหมวดชื่อนี้แล้ว'); return null; }
  wikiCats().push({ key, label: res.label, icon: res.icon || '🔖' });
  await saveProjectMeta(); applyWikiCats();
  await kapi.mkdir(await kapi.join(await wikiRoot(), key));
  await buildTree();
  setStatus('สร้างหมวด “' + res.label + '” แล้ว');
  return key;
}

export async function editWikiCat(key) {
  const cur = wikiCats().find((c) => c.key === key);
  const res = await catEditDialog({ label: catLabel(key), icon: catIcon(key) }, 'แก้ไขหมวด');
  if (!res) return;
  if (cur) { cur.label = res.label; cur.icon = res.icon || cur.icon; }
  else wikiCats().push({ key, label: res.label, icon: res.icon || '🔖' });
  await saveProjectMeta(); applyWikiCats();
  await buildTree(); setStatus('แก้ไขหมวดแล้ว');
}

export async function deleteWikiCat(key, catDir) {
  if (BUILTIN_CATS.includes(key)) { setStatus('หมวดหลักลบไม่ได้'); return; }
  const files = (await kapi.exists(catDir)) ? await kapi.listFiles(catDir, '.json') : [];
  if (files.length) { setStatus(`ลบไม่ได้ — ยังมี ${files.length} รายการในหมวดนี้`); return; }
  if (!(await confirmBox(`ลบหมวด “${catLabel(key)}” ?`, 'ลบหมวด'))) return;
  const arr = wikiCats(); const i = arr.findIndex((c) => c.key === key);
  if (i >= 0) arr.splice(i, 1);
  await saveProjectMeta();
  if (await kapi.exists(catDir)) await kapi.remove(catDir);
  await buildTree(); setStatus('ลบหมวดแล้ว');
}

export async function addEntity(catDir, cat) {
  const tps = state.templates.filter((t) => t.entityTypeKey === cat);
  const res = await entityCreateDialog(cat, tps);
  if (!res) return;
  await kapi.mkdir(catDir);
  const tp = tps.find((t) => t.id === res.templateId) || null;
  const e = { id: guid(), entityTypeKey: cat, name: res.name, aliases: [], fields: {},
              customProperties: {}, images: [], sections: [],
              relationships: [], chapterOverrides: [], templateId: '',
              created: new Date().toISOString() };
  if (tp) applyTemplate(e, tp);
  if (!(e.sections || []).length) e.sections = [{ title: 'คำอธิบาย', content: '' }];
  const file = await kapi.join(catDir, safeName(res.name) + '-' + Date.now().toString(36) + '.json');
  await kapi.writeFile(file, JSON.stringify(e, null, 2));
  await buildTree(); await smart.loadNames(state.root);
  openEntity(file);
}

export async function openEntity(file) {
  if (state.tabs.has(file)) return activate(file);
  const entity = await kapi.readJson(file);
  const pane = el('div', 'pane wiki-pane');    // wiki-pane = กัน paper-mode ทับ field เนื้อหา
  $('#panes').append(pane);
  const tabBtn = el('div', 'tab');
  tabBtn.append(el('span', 'tab-title', entity.name || 'entity'));
  const x = el('span', 'tab-x', '×'); tabBtn.append(x);
  $('#tabs').append(tabBtn);
  const tab = { file, title: entity.name || 'entity', pane, tabBtn, dirty: false,
                editor: null, plain: null, wiki: null };
  tab.wiki = new WikiEditor(pane, file, entity, {
    projectRoot: state.root,
    labels: fieldLabels(entity.templateId),
    entityTitles: () => smart.titles || [],
    fileOfEntity: (n) => smart.fileOf[n] || null,
    invertRole: (r) => (INV_C.m && INV_C.m[r]) || r,
    pickTitle: (items) => pickFromList('ผูกความสัมพันธ์กับใคร', items),
    pickRelation: (items, fromName) => relationDialog(items, fromName),
    onOpenEntity: (f) => openEntity(f),
    pickFromGallery: () => pickImage(state.root),
    getChecker: spellChecker,          // เนื้อหา wiki ตรวจคำผิดได้เหมือน editor นิยาย
    onSaved: (e2) => {
      // ชื่อเปลี่ยน → แจ้ง auto-task ให้ไล่แก้ทุกไฟล์ (ทำงานเมื่อเปิด auto-sync)
      if (tab.title && e2.name && tab.title !== e2.name) notifyEntityRenamed(file, tab.title, e2.name);
      tab.title = e2.name;
      tab.tabBtn.querySelector('.tab-title').textContent = e2.name;
      smart.loadNames(state.root); buildTree();
      state.tabs.get('::network::')?.net?.refresh();
      // ถ้าฝั่งตรงข้ามเปิดอยู่เป็นแท็บ → รีเฟรชให้เห็นความสัมพันธ์ที่เพิ่งซิงก์
      for (const t of state.tabs.values())
        if (t.wiki && t.wiki !== tab.wiki) t.wiki.reloadIfExists?.();
    },
    // WikiEditor.render() ล้าง pane ทุกครั้ง → ต้องเติมแผง backlinks กลับหลัง render
    onRendered: () => attachBacklinks(),
  });
  tab.wiki.onDirty(() => markDirty(tab));
  // ---- Backlinks (ข้อ 86): ฉากที่กล่าวถึงเอนทิตี้นี้ ----
  function attachBacklinks() { ensureAutoLink().then(() => {
    const wrap = pane.querySelector('.wiki-wrap');
    if (!wrap) return;
    let blSec = wrap.querySelector('.wiki-backlinks');
    if (!blSec) {
      blSec = el('div', 'wiki-backlinks');
      blSec.style.cssText = 'margin-top:24px;padding-top:16px;border-top:1px solid var(--border)';
      const blHead = el('div'); blHead.style.cssText = 'font-weight:600;color:var(--dim);margin-bottom:8px'; blHead.textContent = '🔗 ฉากที่กล่าวถึง';
      blSec.append(blHead);
      const blBody = el('div', 'wiki-bl-body');
      blSec.append(blBody);
      wrap.append(blSec);
    }
    const blBody = blSec.querySelector('.wiki-bl-body');
    renderBacklinksTab(blBody, file, async (sceneId) => {
      const { openScene } = await import('./app.js');
      const hit = await findScenePath(state.root, sceneId);
      if (hit && await kapi.exists(hit.path)) openScene(hit.path, hit.title);
      else setStatus('ไม่พบไฟล์ฉาก');
    });
  }); }
  attachBacklinks();
  tabBtn.onclick = (e) => { if (e.target !== x) activate(file); };
  x.onclick = () => closeTab(file);
  state.tabs.set(file, tab);
  activate(file);
}

export async function duplicateEntity(file) {
  const e = await kapi.readJson(file);
  const dir = file.replace(/[\\/][^\\/]*$/, '');
  const copy = { ...e, id: guid(), name: (e.name || 'entity') + ' (สำเนา)', created: new Date().toISOString() };
  const nf = await kapi.join(dir, safeName(copy.name) + '-' + Date.now().toString(36) + '.json');
  await kapi.writeFile(nf, JSON.stringify(copy, null, 2));
  await buildTree(); await smart.loadNames(state.root);
  openEntity(nf);
}
