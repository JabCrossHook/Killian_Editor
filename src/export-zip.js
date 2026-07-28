// export-zip.js — ส่งออกโปรเจกต์ทั้งหมดเป็น .zip (รูปภาพต้องไม่เสีย → อ่าน/เขียนเป็นไบต์เท่านั้น)
import { state, setStatus, log } from './core.js';
import JSZip from 'jszip';

const SKIP_DIRS = ['Snapshots', 'Backups', 'Recycle'];
// นามสกุลที่ต้องอ่านเป็นไบต์ (ถ้าอ่านเป็น utf-8 ไฟล์จะเสีย)
const BIN_EXT = /\.(png|jpe?g|gif|webp|bmp|ico|pdf|zip|mp3|mp4|wav|ttf|otf|woff2?)$/i;

export async function exportProjectZip() {
  if (!state.root) { setStatus('ยังไม่ได้เปิดโปรเจกต์'); return false; }
  setStatus('กำลังแพ็ค ZIP…');
  try {
    const zip = new JSZip();
    let nFiles = 0;
    const addDir = async (dir, prefix = '') => {
      for (const f of await kapi.listFiles(dir, '').catch(() => [])) {
        const full = await kapi.join(dir, f);
        try {
          if (BIN_EXT.test(f)) {
            const bytes = await kapi.readBytes(full);       // ไบต์ดิบ — รูปไม่เสีย
            zip.file(prefix + f, new Uint8Array(bytes));
          } else {
            zip.file(prefix + f, await kapi.readFile(full));
          }
          nFiles++;
        } catch (e) { log('warn', 'export-zip: ข้ามไฟล์ ' + full, e); }
      }
      for (const d of await kapi.listDirs(dir).catch(() => [])) {
        if (SKIP_DIRS.includes(d)) continue;
        await addDir(await kapi.join(dir, d), prefix + d + '/');
      }
    };
    await addDir(state.root);

    const dest = await kapi.saveAsDialog((state.title || 'project') + '.zip');
    if (!dest) return false;
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    // ส่งเป็น byte array ผ่าน IPC — ห้ามแปลงเป็น string (utf-8 จะบวมไฟล์เสีย)
    await kapi.writeBytes(dest, Array.from(bytes));
    setStatus(`ส่งออก ZIP แล้ว (${nFiles} ไฟล์): ` + dest);
    log('info', 'export-zip: done ' + nFiles + ' files');
    return true;
  } catch (e) {
    log('error', 'export-zip failed', e);
    setStatus('ส่งออก ZIP ล้มเหลว: ' + e.message);
    return false;
  }
}

// export-json — ส่งออกเมทาดาทาทั้งหมดเป็น JSON ก้อนเดียว
export async function exportProjectJson() {
  if (!state.root) { setStatus('ยังไม่ได้เปิดโปรเจกต์'); return false; }
  setStatus('กำลังรวบรวม JSON…');
  try {
    const data = { project: state.meta, sections: [] };
    for (const sec of await kapi.listDirs(state.root)) {
      if (['Wiki','Bible','Images','Memos','Recycle','Snapshots','Backups','Plugins','Research'].includes(sec)) continue;
      const sp = await kapi.join(state.root, sec);
      const sj = await kapi.join(sp, 'section.json');
      if (!(await kapi.exists(sj))) continue;
      const secData = { name: sec, section: await kapi.readJson(sj), drafts: [] };
      const dr = await kapi.join(sp, 'Draft');
      if (await kapi.exists(dr)) {
        for (const dn of await kapi.listDirs(dr)) {
          const dp = await kapi.join(dr, dn);
          secData.drafts.push({
            name: dn,
            draft: await kapi.readJson(await kapi.join(dp, 'draft.json')).catch(() => ({})),
            scenes: await kapi.readJson(await kapi.join(dp, 'scenes.json')).catch(() => ({})),
          });
        }
      }
      data.sections.push(secData);
    }
    const dest = await kapi.saveAsDialog((state.title || 'project') + '-export.json');
    if (!dest) return false;
    await kapi.writeFile(dest, JSON.stringify(data, null, 2));
    setStatus('ส่งออก JSON แล้ว: ' + dest);
    return true;
  } catch (e) {
    log('error', 'export-json failed', e);
    setStatus('ส่งออก JSON ล้มเหลว');
    return false;
  }
}
