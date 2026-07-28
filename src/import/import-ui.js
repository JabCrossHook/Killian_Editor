// import-ui.js — UI นำเข้าโปรเจกต์ Scrivener (ข้อ 63)
// เลือกโฟลเดอร์ .scriv → ดูตัวอย่างโครงที่จะได้ (dryRun) → เลือกปลายทาง → เขียนจริง → เปิดโปรเจกต์
import { setStatus, log } from '../core.js';
import { importScrivener } from './import-scrivener.js';
import { confirmBox } from '../ui.js';
import { syncIo } from '../project-scan.js';

// io adapter ให้เอนจิน (join ต้องเป็น sync — ดู syncIo ใน project-scan.js)
const makeIo = () => syncIo();

export async function importScrivenerDialog(onOpenProject) {
  const src = await kapi.openProjectDialog();
  if (!src) return null;

  setStatus('กำลังอ่านโปรเจกต์ Scrivener…');
  const io = makeIo();
  const preview = await importScrivener(src, { io, dryRun: true });
  if (!preview.ok) { setStatus('นำเข้าไม่สำเร็จ: ' + preview.error); return null; }

  const c = preview.counts || {};
  const lines = [
    'ชื่อโปรเจกต์: ' + (preview.title || '(ไม่มีชื่อ)'),
    'บท: ' + (c.chapters ?? 0) + '  ·  ฉาก: ' + (c.scenes ?? 0),
    'ไฟล์ที่จะสร้าง: ' + (preview.plan?.count ?? 0),
  ];
  if (preview.warnings?.length) lines.push('⚠ คำเตือน ' + preview.warnings.length + ' รายการ (ดูใน Log)');
  if (preview.warnings?.length) log('warn', 'scrivener import: มีคำเตือน', preview.warnings);

  if (!(await confirmBox(lines.join('\n') + '\n\nเลือกโฟลเดอร์ปลายทางแล้วนำเข้าเลยไหม?'))) return null;

  const dest = await kapi.openProjectDialog();
  if (!dest) return null;
  if (await kapi.exists(io.join(dest, 'project.khn.json'))) {
    if (!(await confirmBox('โฟลเดอร์ปลายทางมีโปรเจกต์อยู่แล้ว — เขียนทับไหม?'))) return null;
  }

  setStatus('กำลังนำเข้า…');
  const res = await importScrivener(src, { io, dest, title: preview.title,
    now: new Date().toISOString(),
    onProgress: (n, total) => { if (n % 10 === 0) setStatus(`นำเข้า ${n}/${total} ไฟล์…`); } });
  if (!res.ok) { setStatus('นำเข้าไม่สำเร็จ: ' + res.error); return null; }

  setStatus(`นำเข้าเสร็จ ${res.written} ไฟล์ → ${dest}`);
  log('info', 'scrivener import สำเร็จ', { src, dest, written: res.written });
  if (onOpenProject) await onOpenProject(dest);
  return res;
}

// ดูตัวอย่างอย่างเดียว (ใช้ใน selftest — ไม่เปิด dialog)
export function scrivenerIo() { return makeIo(); }
