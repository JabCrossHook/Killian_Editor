// คลังรูปภาพแบบ v1 — โฟลเดอร์ Images/ + images.json [{file, caption}]
import { ask, confirmBox } from './ui.js';
import { imageLightbox } from './wiki.js';
import { iconHtml } from './icons.js';

async function readIndex(root) {
  const f = await kapi.join(root, 'Images', 'images.json');
  let items = [];
  try { items = (await kapi.readJson(f)).images || []; } catch {}
  // sync: ไฟล์ที่อยู่ในโฟลเดอร์แต่ไม่มีใน index → เพิ่มให้ (เข้ากับโปรเจกต์ที่ไปวางไฟล์เอง)
  const dir = await kapi.join(root, 'Images');
  const onDisk = (await kapi.listFiles(dir)).filter((x) => !x.endsWith('.json'));
  const known = new Set(items.map((i) => i.file));
  for (const file of onDisk)
    if (!known.has(file)) items.push({ file, caption: file.replace(/\.[^.]+$/, '') });
  items = items.filter((i) => onDisk.includes(i.file));
  return items;
}

async function writeIndex(root, items) {
  await kapi.writeFile(await kapi.join(root, 'Images', 'images.json'),
    JSON.stringify({ images: items }, null, 2));
}

export class Gallery {
  constructor(pane, root, { onChanged = null } = {}) {
    this.pane = pane; this.root = root; this.onChanged = onChanged;
    this.title = 'คลังรูปภาพ';
    this.dirty = false;
    this.render();
  }

  async render() {
    const p = this.pane; p.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className = 'gal-wrap';
    p.appendChild(wrap);
    const head = document.createElement('div'); head.className = 'wiki-head';
    const t = document.createElement('span'); t.textContent = 'คลังรูปภาพของโปรเจกต์ (Images/)';
    const add = document.createElement('button'); add.className = 'k-ok';
    add.textContent = '＋ เพิ่มรูป…';
    head.append(t, add); wrap.appendChild(head);
    add.onclick = async () => {
      const src = await kapi.openImageDialog(); if (!src) return;
      const name = await kapi.copyInto(src, await kapi.join(this.root, 'Images'));
      const items = await readIndex(this.root);
      if (!items.some((i) => i.file === name))
        items.push({ file: name, caption: name.replace(/\.[^.]+$/, '') });
      await writeIndex(this.root, items);
      this.render(); this.onChanged && this.onChanged();
    };

    const grid = document.createElement('div'); grid.className = 'gal-grid';
    wrap.appendChild(grid);
    const items = await readIndex(this.root);
    await writeIndex(this.root, items);            // sync ลง index เสมอ
    if (!items.length) {
      const d = document.createElement('div'); d.className = 'dim';
      d.textContent = '(ยังไม่มีรูป — กด "เพิ่มรูป…" หรือวางไฟล์ในโฟลเดอร์ Images ของโปรเจกต์)';
      grid.appendChild(d);
    }
    for (const it of items) {
      const cell = document.createElement('div'); cell.className = 'gal-cell';
      const im = document.createElement('img');
      im.src = await kapi.toFileURL(await kapi.join(this.root, 'Images', it.file));
      im.style.cursor = 'zoom-in'; im.title = 'คลิกเพื่อขยาย';
      im.onclick = () => imageLightbox(im.src, it.caption || it.file);
      const cap = document.createElement('input'); cap.className = 'wiki-input gal-cap';
      cap.value = it.caption || '';
      cap.title = 'คำบรรยายรูป — แก้แล้วบันทึกให้อัตโนมัติ';
      cap.addEventListener('change', async () => {
        const cur = await readIndex(this.root);
        const row = cur.find((x) => x.file === it.file);
        if (row) { row.caption = cap.value; await writeIndex(this.root, cur); }
      });
      const del = document.createElement('span'); del.className = 'row-add wiki-img-x';
      del.innerHTML = iconHtml('x', 14); del.title = 'ลบรูป (ย้ายไปถังขยะ)';
      del.onclick = async () => {
        if (!(await confirmBox(`ลบรูป “${it.file}” ? (ย้ายไปถังขยะ)`))) return;
        await kapi.move(await kapi.join(this.root, 'Images', it.file),
          await kapi.join(this.root, 'Recycle', Date.now().toString(36) + '-' + it.file));
        const cur = (await readIndex(this.root)).filter((x) => x.file !== it.file);
        await writeIndex(this.root, cur);
        this.render(); this.onChanged && this.onChanged();
      };
      cell.append(im, cap, del);
      grid.appendChild(cell);
    }
  }

  focus() {}
  destroy() {}
  save() { return true; }
}

// เลือกรูปจากคลัง (ใช้ตอนแทรกรูปในฉาก/entity) — คืน {file, caption} หรือ null
export function pickImage(root) {
  return new Promise(async (resolve) => {
    const ov = document.createElement('div'); ov.className = 'k-overlay';
    const box = document.createElement('div'); box.className = 'k-dialog k-wide';
    const t = document.createElement('div'); t.className = 'k-dlg-title';
    t.textContent = 'เลือกรูปจากคลัง';
    const grid = document.createElement('div'); grid.className = 'gal-grid gal-pick';
    const btns = document.createElement('div'); btns.className = 'k-dlg-btns';
    const addB = document.createElement('button'); addB.textContent = '＋ เพิ่มรูปใหม่…';
    const cancel = document.createElement('button'); cancel.textContent = 'ยกเลิก';
    btns.append(addB, cancel);
    box.append(t, grid, btns); ov.appendChild(box); document.body.appendChild(ov);
    const done = (v) => { ov.remove(); resolve(v); };
    cancel.onclick = () => done(null);
    ov.onclick = (e) => { if (e.target === ov) done(null); };
    const fill = async () => {
      grid.innerHTML = '';
      const items = await readIndex(root);
      if (!items.length) {
        const d = document.createElement('div'); d.className = 'dim';
        d.textContent = '(คลังยังว่าง — กด "เพิ่มรูปใหม่…")';
        grid.appendChild(d);
      }
      for (const it of items) {
        const cell = document.createElement('div'); cell.className = 'gal-cell gal-choice';
        const im = document.createElement('img');
        im.src = await kapi.toFileURL(await kapi.join(root, 'Images', it.file));
        const cap = document.createElement('div'); cap.className = 'gal-cap-ro';
        cap.textContent = it.caption || it.file;
        cell.append(im, cap);
        cell.onclick = () => done(it);
        grid.appendChild(cell);
      }
    };
    addB.onclick = async () => {
      const src = await kapi.openImageDialog(); if (!src) return;
      const name = await kapi.copyInto(src, await kapi.join(root, 'Images'));
      const items = await readIndex(root);
      if (!items.some((i) => i.file === name))
        items.push({ file: name, caption: name.replace(/\.[^.]+$/, '') });
      await writeIndex(root, items);
      fill();
    };
    await fill();
  });
}
