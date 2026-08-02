// scene-props.js — แผงคุณสมบัติฉาก (สถานะ/สี/ปักหมุด/ล็อก/futureNote)
import { buildTree, guid, updatePageNumberHint, refreshSpView } from './app.js';
import { SCENE_COLORS, SCENE_STATUSES, el, setStatus, state } from './core.js';
import { allStatuses } from './custom-status.js';
import * as spell from './spell.js';
import { dumpMdFile, parseMdFile } from './md.js';

export async function sceneProps(dPath, ch, sc) {
  const sf = await kapi.join(dPath, 'scenes.json');
  const d = await kapi.readJson(sf);
  const row = (d.chapters[ch.guid] || []).find((x) => x.id === sc.id);
  if (!row) return;
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog');
  box.append(el('div', 'k-dlg-title', 'คุณสมบัติฉาก — ' + row.title));
  const mk = (label, val, tag = 'input') => {
    const r = el('div', 'wiki-row');
    r.append(el('label', null, label));
    const i = el(tag, 'wiki-input');
    i.value = val || '';
    r.append(i); box.append(r); return i;
  };
  // ช่องเลือก (สถานะ/สี) — คืน <select>
  const mkSelect = (label, options, cur) => {
    const r = el('div', 'wiki-row');
    r.append(el('label', null, label));
    const s = el('select', 'wiki-input k-dlg-select');
    for (const [val, txt] of options) {
      const o = el('option', null, txt); o.value = val;
      if (val === cur) o.selected = true;
      s.append(o);
    }
    r.append(s); box.append(r); return s;
  };
  // สวิตช์ (ปักหมุด) — คืน checkbox
  const mkCheck = (label, checked) => {
    const r = el('div', 'wiki-row');
    r.append(el('label', null, label));
    const c = el('input', 'wiki-check'); c.type = 'checkbox'; c.checked = !!checked;
    r.append(c); box.append(r); return c;
  };

  const iSyn = mk('เรื่องย่อ', row.synopsis, 'textarea');
  const iStoryDate = mk('เวลาในเรื่อง (เส้นเวลา)', row.storyDate);
  iStoryDate.placeholder = 'เช่น วันที่ 3 · ปีที่ 1024 · เช้าวันจันทร์';
  // [alpha.57a ข้อ 2] เลขหน้าเริ่มต้นของไฟล์ฉากนี้ — เลขหน้าบนกระดาษนับต่อจากค่านี้
  const iStartPage = mk('เลขหน้าเริ่มต้น (บทภาพยนตร์)', row.startPage || '');
  iStartPage.type = 'number'; iStartPage.min = '1';
  iStartPage.placeholder = '1 — ใช้เมื่อเปิด "เลขหน้า" ในตั้งค่าโปรเจกต์';
  const iPov = mk('มุมมอง (POV)', row.pov);
  const iEmotion = mk('อารมณ์', row.emotion);
  const iConflict = mk('ความขัดแย้ง', row.conflict);
  const iStatus = mkSelect('สถานะ',
    [['Outline', '— ยังไม่ตั้ง —'], ...allStatuses().map((s) => [s, s])],
    allStatuses().includes(row.status) ? row.status : 'Outline');
  const iColor = mkSelect('สี',
    [['', '— ไม่มี —'], ...SCENE_COLORS.map(([n, hex]) => [hex, '● ' + n])], row.color || '');
  const iFlag = mkCheck('ปักหมุด', row.flag);
  const iTags = mk('แท็ก (คั่น , )', (row.tags || []).join(', '));
  const iNote = mk('โน้ต', row.note, 'textarea');
  const iFuture = mk('Future Note (หมายเหตุนักเขียน)', row.futureNote || '', 'textarea');
  iFuture.placeholder = 'โน้ตสำหรับนักเขียน — แสดงเฉพาะที่นี่และ Planner ไม่แสดงในฉากปกติ';
  // ป้ายเล่าเรื่อง (Narrative Markers) — ฉากนี้อยู่นอกลำดับเวลาหลัก
  const iFb = mkCheck('⏪ ย้อนอดีต (Flashback)', row.isFlashback);
  const iFf = mkCheck('⏩ ล่วงหน้า (Flashforward)', row.isFlashforward);
  // เลือกได้อย่างละหนึ่ง — ติ๊กตัวหนึ่งแล้วอีกตัวหลุดเอง
  iFb.addEventListener('change', () => { if (iFb.checked) iFf.checked = false; });
  iFf.addEventListener('change', () => { if (iFf.checked) iFb.checked = false; });

  const btns = el('div', 'k-dlg-btns');
  const cB = el('button', null, 'ยกเลิก');
  const okB = el('button', 'k-ok', 'บันทึก');
  btns.append(cB, okB); box.append(btns); ov.append(box); document.body.append(ov);
  cB.onclick = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  okB.onclick = async () => {
    row.synopsis = iSyn.value; row.pov = iPov.value; row.status = iStatus.value; row.storyDate = iStoryDate.value.trim();
    // เก็บเฉพาะเมื่อผู้ใช้กรอกจริง (ค่าว่าง = เริ่มที่ 1) — กัน field ว่างรกทุกแถว
    { const sp = parseInt(iStartPage.value, 10);
      if (Number.isFinite(sp) && sp > 0) row.startPage = sp; else delete row.startPage; }
    row.emotion = iEmotion.value; row.conflict = iConflict.value;
    row.color = iColor.value; row.flag = iFlag.checked; row.note = iNote.value;
    row.futureNote = iFuture.value;
    if (iFb.checked && iFf.checked) iFf.checked = false;   // กันติ๊กพร้อมกัน (เผื่อถูกตั้งค่าจากโค้ด/เทส)
    row.isFlashback = iFb.checked; row.isFlashforward = iFf.checked;
    row.tags = iTags.value.split(',').map((x) => x.trim()).filter(Boolean);
    await kapi.writeFile(sf, JSON.stringify(d, null, 2));
    const file = await kapi.join(dPath, 'Chapters', ch.folderName, row.fileName);
    try {
      const { meta, body } = parseMdFile(await kapi.readFile(file));
      meta.pov = row.pov; meta.tags = row.tags;
      meta.emotion = row.emotion; meta.conflict = row.conflict; meta.note = row.note;
      // frontmatter เป็นข้อความล้วน (โครง v1) → เขียนเฉพาะตอนติ๊ก ไม่งั้นลบทิ้ง (กันบรรทัด false รกทุกไฟล์)
      if (row.isFlashback) meta.isFlashback = true; else delete meta.isFlashback;
      if (row.isFlashforward) meta.isFlashforward = true; else delete meta.isFlashforward;
      await kapi.writeFile(file, dumpMdFile(meta, body));
    } catch {}
    await buildTree();                 // สี/สถานะที่เพิ่งตั้งเห็นผลใน tree ทันที
    // เลขหน้าเริ่มต้นเปลี่ยน → แท็บที่เปิดไฟล์นี้อยู่ต้องวาดเลขหน้าใหม่ทันที
    const openTab = state.tabs.get(file);
    if (openTab) { openTab.startPage = row.startPage || 1; updatePageNumberHint(); refreshSpView(); }
    ov.remove(); setStatus('บันทึกคุณสมบัติฉากแล้ว');
  };
}
