// section-ops.js — จัดการเล่ม (section): เพิ่ม/แก้ชื่อ/ลบ/เรียง/สถิติ/บันทึก meta
import { buildTree, closeTab, guid, safeName } from './app.js';
import { setStatus, state } from './core.js';
import { ask, confirmBox } from './ui.js';
import { countWords, parseMdFile } from './md.js';

export async function reorderSections(fromFolder, dstFolder) {
  const secs = await listSections();
  const fromIdx = secs.findIndex((s) => s.folder === fromFolder);
  const dstIdx = secs.findIndex((s) => s.folder === dstFolder);
  if (fromIdx < 0 || dstIdx < 0) return;
  const [moved] = secs.splice(fromIdx, 1);
  const insertAt = secs.findIndex((s) => s.folder === dstFolder);
  secs.splice(insertAt, 0, moved);
  let order = 1;
  for (const s of secs) await saveSectionMeta(s.sf, { order: order++ });
  await buildTree(); setStatus('จัดลำดับเล่มใหม่แล้ว');
}

export async function listSections() {
  const out = [];
  for (const nm of await kapi.listDirs(state.root)) {
    const secPath = await kapi.join(state.root, nm);
    const sf = await kapi.join(secPath, 'section.json');
    if (!(await kapi.exists(sf))) continue;
    let meta = {}; try { meta = await kapi.readJson(sf); } catch {}
    out.push({ folder: nm, secPath, sf, meta,
               title: meta.title || nm, order: meta.order || 0 });
  }
  out.sort((a, b) => (a.order || 0) - (b.order || 0));
  return out;
}

export async function sectionStats(secPath) {
  let chapters = 0, scenes = 0, words = 0, drafts = 0;
  const sf = await kapi.join(secPath, 'section.json');
  let meta = {}; try { meta = await kapi.readJson(sf); } catch {}
  const draftRoot = await kapi.join(secPath, 'Draft');
  if (await kapi.exists(draftRoot)) {
    for (const dn of await kapi.listDirs(draftRoot)) {
      const dPath = await kapi.join(draftRoot, dn);
      const df = await kapi.join(dPath, 'draft.json');
      if (!(await kapi.exists(df))) continue;
      drafts++;
      const chs = (await kapi.readJson(df)).chapters || [];
      const scAll = (await kapi.readJson(await kapi.join(dPath, 'scenes.json'))).chapters || {};
      chapters += chs.length;
      for (const ch of chs) for (const sc of scAll[ch.guid] || []) {
        if (sc.type === 'memo') continue;
        scenes++;
        try { const { body } = parseMdFile(await kapi.readFile(
          await kapi.join(dPath, 'Chapters', ch.folderName, sc.fileName)));
          words += countWords(body); } catch {}
      }
    }
  }
  return { chapters, scenes, words, drafts,
           primaryDraft: (meta.primaryDraft || 'default') };
}

export async function saveSectionMeta(sf, patch) {
  let d = {}; try { d = await kapi.readJson(sf); } catch {}
  Object.assign(d, patch);
  await kapi.writeFile(sf, JSON.stringify(d, null, 2));
  return d;
}

export async function addSection() {
  const title = await ask('ชื่อเล่มใหม่', { placeholder: 'เช่น เล่มสอง' }); if (!title) return;
  let dir = await kapi.join(state.root, safeName(title));
  if (await kapi.exists(dir)) dir += '-' + Date.now().toString(36).slice(-4);
  // ลำดับเล่มถัดจากเล่มที่มีอยู่
  let maxOrder = 0;
  for (const nm of await kapi.listDirs(state.root)) {
    const sp = await kapi.join(state.root, nm, 'section.json');
    if (await kapi.exists(sp)) maxOrder = Math.max(maxOrder, (await kapi.readJson(sp)).order || 0);
  }
  await kapi.writeFile(await kapi.join(dir, 'section.json'),
    JSON.stringify({ guid: guid(), title, order: maxOrder + 1 }, null, 2));
  const dr = await kapi.join(dir, 'Draft', 'default');
  const ch = { guid: guid(), title: 'บทที่หนึ่ง', order: 1, status: 'Outline', act: 'I',
               date: '', isFavorite: false, folderName: '01 - บทที่หนึ่ง' };
  await kapi.writeFile(await kapi.join(dr, 'draft.json'), JSON.stringify({ chapters: [ch] }, null, 2));
  await kapi.writeFile(await kapi.join(dr, 'scenes.json'), JSON.stringify({ chapters: { [ch.guid]: [] } }, null, 2));
  await kapi.mkdir(await kapi.join(dr, 'Chapters', ch.folderName));
  await buildTree(); setStatus('เพิ่มเล่ม: ' + title);
}

export async function renameSection(secPath, sec) {
  const title = await ask('ชื่อเล่มใหม่', { value: sec.title }); if (!title || title === sec.title) return;
  // อัปเดตชื่อใน section.json (เก็บชื่อโฟลเดอร์เดิมไว้ — เลี่ยงย้ายโฟลเดอร์ที่อาจมีแท็บเปิดค้าง)
  const sf = await kapi.join(secPath, 'section.json');
  const d = await kapi.readJson(sf); d.title = title;
  await kapi.writeFile(sf, JSON.stringify(d, null, 2));
  await buildTree(); setStatus('เปลี่ยนชื่อเล่มเป็น: ' + title);
}

export async function deleteSection(secPath, sec) {
  // นับเล่มทั้งหมด — กันลบเล่มสุดท้าย (โปรเจกต์ต้องมีอย่างน้อย 1 เล่ม)
  let nSec = 0;
  for (const nm of await kapi.listDirs(state.root))
    if (await kapi.exists(await kapi.join(state.root, nm, 'section.json'))) nSec++;
  if (nSec <= 1) { setStatus('ลบไม่ได้ — ต้องเหลืออย่างน้อย 1 เล่ม'); return; }
  if (!(await confirmBox(`ลบเล่ม “${sec.title}” ทั้งเล่ม ? (ทุกบท/ฉากในเล่มจะย้ายไปถังขยะ)`, 'ลบเล่ม'))) return;
  // ปิดแท็บที่เปิดไฟล์อยู่ในเล่มนี้ก่อน
  for (const t of [...state.tabs.keys()]) if (typeof t === 'string' && t.startsWith(secPath)) closeTab(t);
  const dst = await kapi.join(state.root, 'Recycle',
    Date.now().toString(36) + '-' + (secPath.split(/[\\/]/).pop()));
  await kapi.move(secPath, dst);
  await kapi.writeFile(dst + '.k2restore.json', JSON.stringify(
    { kind: 'section', root: state.root, folderName: secPath.split(/[\\/]/).pop() }, null, 2));
  await buildTree(); setStatus('ลบเล่มแล้ว: ' + sec.title);
}
