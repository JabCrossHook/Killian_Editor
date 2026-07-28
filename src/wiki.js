// Wiki entity editor — โครงข้อมูลเดียวกับ v1 ทุก field (อ่าน-แก้-เขียน ไม่ทำข้อมูลส่วนอื่นหาย)
import { KEditor } from './editor.js';
import { ask, confirmBox } from './ui.js';

export const CAT_TH = { characters: 'ตัวละคร', locations: 'สถานที่',
                        items: 'สิ่งของ', lore: 'ตำนาน' };

// กล่องขยายรูป (คลิกที่ไหนก็ปิด · Esc ปิด) — ใช้ร่วมกันทั้ง Wiki และคลังรูป
export function imageLightbox(url, caption) {
  const ov = document.createElement('div'); ov.className = 'k-lightbox';
  const img = document.createElement('img'); img.src = url; img.className = 'k-lightbox-img';
  ov.appendChild(img);
  if (caption) { const c = document.createElement('div'); c.className = 'k-lightbox-cap'; c.textContent = caption; ov.appendChild(c); }
  const close = () => { ov.remove(); document.removeEventListener('keydown', esc); };
  function esc(e) { if (e.key === 'Escape') close(); }
  ov.onclick = close; document.addEventListener('keydown', esc);
  document.body.appendChild(ov);
}

export class WikiEditor {
  constructor(pane, file, entity, { onSaved = null, onDeleted = null,
                                    projectRoot = '', labels = {},
                                    entityTitles = () => [], fileOfEntity = () => null,
                                    invertRole = (r) => r, pickTitle = null, pickRelation = null,
                                    onOpenEntity = null, pickFromGallery = null,
                                    getChecker = null, onRendered = null } = {}) {
    this.onRendered = onRendered;
    this.pane = pane; this.file = file; this.e = entity;
    this.projectRoot = projectRoot; this.labels = labels;
    this.entityTitles = entityTitles; this.fileOfEntity = fileOfEntity;
    this.invertRole = invertRole; this.pickTitle = pickTitle; this.pickRelation = pickRelation;
    this.onOpenEntity = onOpenEntity; this.pickFromGallery = pickFromGallery;
    this.getChecker = getChecker;
    this.onSaved = onSaved; this.onDeleted = onDeleted;
    this.dirty = false;
    this.secEditors = [];
    this.render();
  }

  get title() { return this.e.name || 'entity'; }

  markDirty() { if (!this.dirty) { this.dirty = true; this._dirtyCb && this._dirtyCb(); } }
  onDirty(cb) { this._dirtyCb = cb; }

  render() {
    const p = this.pane; p.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className = 'wiki-wrap';
    p.appendChild(wrap);
    const row = (label) => {
      const r = document.createElement('div'); r.className = 'wiki-row';
      const l = document.createElement('label'); l.textContent = label;
      r.appendChild(l); wrap.appendChild(r); return r;
    };
    const input = (val, cb) => {
      const i = document.createElement('input'); i.className = 'wiki-input'; i.value = val;
      i.addEventListener('input', () => { cb(i.value); this.markDirty(); });
      return i;
    };
    // ช่องข้อมูลที่ "ลิงก์ได้": ถ้าค่าตรงกับชื่อ entity ใน Wiki → โชว์ปุ่ม 🔗 เปิดหน้านั้น
    // (พิมพ์แก้ได้ตามปกติ · ปุ่มโผล่เฉพาะเมื่อค่าตรงชื่อจริง · รองรับหลายชื่อคั่นด้วย ,)
    const linkedField = (labelText, val, cb) => {
      const r = row(labelText);
      const i = input(val, (v) => { cb(v); syncLink(); });
      r.appendChild(i);
      const link = document.createElement('span'); link.className = 'wiki-field-link';
      link.title = 'เปิดหน้า Wiki ที่เชื่อมโยง';
      r.appendChild(link);
      const syncLink = () => {
        const names = this.entityTitles();
        // แยกค่าด้วย , แล้วหาชื่อที่ตรง (ไม่รวมตัวเอง)
        const hits = i.value.split(',').map((s) => s.trim())
          .filter((s) => s && s !== this.e.name && names.includes(s));
        link.innerHTML = '';
        if (!hits.length) { link.style.display = 'none'; return; }
        link.style.display = '';
        for (const nm of hits) {
          const a = document.createElement('span'); a.className = 'wiki-rel-link'; a.textContent = '🔗 ' + nm;
          a.onclick = () => { const f = this.fileOfEntity(nm);
            if (f && this.onOpenEntity) this.onOpenEntity(f); };
          link.appendChild(a);
        }
      };
      syncLink();
      return r;
    };

    const head = document.createElement('div'); head.className = 'wiki-head';
    const hl = document.createElement('span');
    hl.textContent = (CAT_TH[this.e.entityTypeKey] || this.e.entityTypeKey || 'Wiki');
    const saveBtn = document.createElement('button');
    saveBtn.className = 'k-ok wiki-save'; saveBtn.textContent = '💾 บันทึก (Ctrl+S)';
    saveBtn.onclick = () => this.save().then(() => {
      saveBtn.textContent = '✓ บันทึกแล้ว';
      setTimeout(() => { saveBtn.textContent = '💾 บันทึก (Ctrl+S)'; }, 1500);
    });
    head.append(hl, saveBtn);
    wrap.appendChild(head);

    // ---- Profile Header (ข้อ 55) — แสดงการ์ดตัวละคร ----
    if (this.e.entityTypeKey === 'characters') {
      const prof = document.createElement('div'); prof.className = 'wiki-prof';
      // รูป
      const avatar = document.createElement('div'); avatar.className = 'wiki-prof-avatar';
      const img = (this.e.images && this.e.images[0]) ? this.e.images[0].url || '' : '';
      if (img) {
        const imgEl = document.createElement('img');
        imgEl.src = img; imgEl.onerror = () => { avatar.textContent = '👤'; };
        avatar.appendChild(imgEl);
      } else {
        avatar.textContent = '👤';
      }
      prof.appendChild(avatar);
      // ข้อมูล
      const info = document.createElement('div'); info.className = 'wiki-prof-info';
      const nameEl = document.createElement('div'); nameEl.className = 'wiki-prof-name';
      nameEl.textContent = this.e.name || '(ไม่มีชื่อ)';
      info.appendChild(nameEl);
      // ชื่ออื่น
      if (this.e.aliases && this.e.aliases.length) {
        const ali = document.createElement('div'); ali.className = 'wiki-prof-aliases';
        this.e.aliases.forEach((a) => {
          const s = document.createElement('span'); s.textContent = a; ali.appendChild(s);
        });
        info.appendChild(ali);
      }
      // บทบาท (จาก fields)
      const role = (this.e.fields && (this.e.fields.Role || this.e.fields.role || this.e.fields['Role'] || this.e.fields['บทบาท']));
      if (role) {
        const rl = document.createElement('div'); rl.className = 'wiki-prof-role'; rl.textContent = '🎭 ' + role;
        info.appendChild(rl);
      }
      // สถานะ (Living/Deceased/Unknown)
      const status = (this.e.fields && (this.e.fields.Status || this.e.fields.status || ''));
      if (status) {
        const st = document.createElement('span'); st.className = 'wiki-prof-status';
        const sl = status.toLowerCase();
        st.classList.add(sl.includes('dead') || sl.includes('เสีย') ? 'deceased' : sl.includes('unknown') || sl.includes('ไม่ทราบ') ? 'unknown' : 'living');
        st.textContent = status;
        info.appendChild(st);
      }
      prof.appendChild(info);
      wrap.appendChild(prof);
    }

    row('ชื่อ').appendChild(input(this.e.name || '', (v) => { this.e.name = v; }));
    row('ชื่ออื่น (คั่นด้วย , )').appendChild(
      input((this.e.aliases || []).join(', '),
            (v) => { this.e.aliases = v.split(',').map((x) => x.trim()).filter(Boolean); }));

    // fields จากเทมเพลต (label ไทย) + customProperties (เพิ่ม field เองได้)
    const fields = this.e.fields || {};
    if (Object.keys(fields).length) {
      const fh = document.createElement('div'); fh.className = 'wiki-sub';
      fh.textContent = 'ข้อมูล (จากเทมเพลต)';
      wrap.appendChild(fh);
      for (const k of Object.keys(fields)) {
        linkedField(this.labels[k] || k, String(fields[k] ?? ''), (v) => { this.e.fields[k] = v; });
      }
    }
    const ch = document.createElement('div'); ch.className = 'wiki-sub';
    ch.textContent = 'ข้อมูลเพิ่มเอง';
    const addP = document.createElement('span'); addP.className = 'row-add';
    addP.textContent = '+'; addP.title = 'เพิ่มช่องข้อมูลของตัวเอง';
    addP.onclick = async () => {
      const k = await ask('ชื่อช่องข้อมูลใหม่', { placeholder: 'เช่น อาวุธประจำตัว' });
      if (!k) return;
      (this.e.customProperties = this.e.customProperties || {})[k] = '';
      this.markDirty(); this.render();
    };
    ch.appendChild(addP); wrap.appendChild(ch);
    for (const k of Object.keys(this.e.customProperties || {})) {
      const r = linkedField(k, String(this.e.customProperties[k] ?? ''),
                            (v) => { this.e.customProperties[k] = v; });
      const del = document.createElement('span'); del.className = 'row-add';
      del.textContent = '✕'; del.title = 'ลบช่องนี้';
      del.onclick = () => { delete this.e.customProperties[k]; this.markDirty(); this.render(); };
      r.appendChild(del);
    }

    // คลังรูปของ entity (images[] — ชื่อไฟล์ในโฟลเดอร์ Images ของโปรเจกต์)
    const ih = document.createElement('div'); ih.className = 'wiki-sub';
    ih.textContent = 'รูปภาพ';
    // เลือกจากคลังรูปที่มีอยู่ในโปรเจกต์
    const pickImg = document.createElement('span'); pickImg.className = 'row-add';
    pickImg.textContent = '🖼'; pickImg.title = 'เลือกจากคลังรูปของโปรเจกต์';
    pickImg.onclick = async () => {
      if (!this.pickFromGallery) return;
      const it = await this.pickFromGallery();
      if (!it) return;
      this.e.images = [...(this.e.images || []), it.file || it];
      this.markDirty(); this.render();
    };
    // เพิ่มรูปใหม่จากไฟล์ (คัดลอกเข้าคลัง)
    const addImg = document.createElement('span'); addImg.className = 'row-add';
    addImg.textContent = '+'; addImg.title = 'เพิ่มรูปจากไฟล์ (คัดลอกเข้าคลังรูปโปรเจกต์)';
    addImg.onclick = async () => {
      const src = await kapi.openImageDialog(); if (!src) return;
      const dir = await kapi.join(this.projectRoot, 'Images');
      const name = await kapi.copyInto(src, dir);
      this.e.images = [...(this.e.images || []), name];
      this.markDirty(); this.render();
    };
    ih.append(pickImg, addImg); wrap.appendChild(ih);
    const grid = document.createElement('div'); grid.className = 'wiki-imgs';
    wrap.appendChild(grid);
    (this.e.images || []).forEach(async (name, i) => {
      const cell = document.createElement('div'); cell.className = 'wiki-img';
      const im = document.createElement('img');
      const url = await kapi.toFileURL(await kapi.join(this.projectRoot, 'Images', name));
      im.src = url;
      im.title = 'คลิกเพื่อขยาย';
      im.onclick = () => imageLightbox(url, name);           // คลิกขยายภาพ
      im.onerror = () => { im.replaceWith(Object.assign(document.createElement('div'),
        { className: 'wiki-img-miss', textContent: '⚠ ' + name })); };
      const del = document.createElement('span'); del.className = 'row-add wiki-img-x';
      del.textContent = '✕'; del.title = 'เอารูปนี้ออก (ไฟล์ยังอยู่ในคลัง)';
      del.onclick = (e) => { e.stopPropagation(); this.e.images.splice(i, 1); this.markDirty(); this.render(); };
      cell.append(im, del); grid.appendChild(cell);
    });

    // ความสัมพันธ์ (sync สองทางตอนบันทึก — เหมือน v1)
    const rh = document.createElement('div'); rh.className = 'wiki-sub';
    rh.textContent = 'ความสัมพันธ์';
    const addR = document.createElement('span'); addR.className = 'row-add';
    addR.textContent = '+'; addR.title = 'เพิ่มความสัมพันธ์';
    addR.onclick = async () => {
      const others = this.entityTitles().filter((n) => n !== this.e.name);
      if (!others.length) { alert('ยังไม่มี entity อื่นให้ผูกความสัมพันธ์'); return; }
      let target, role;
      if (this.pickRelation) {
        const res = await this.pickRelation(others, this.e.name);
        if (!res) return;
        target = res.target; role = res.role;
      } else {
        target = this.pickTitle ? await this.pickTitle(others) : null;
        if (!target) return;
        role = await ask(`${this.e.name} เป็นอะไรกับ ${target}`,
                         { placeholder: 'เช่น พี่ชาย / เพื่อน / ศัตรู' });
      }
      if (!target || !role) return;
      (this.e.relationships = this.e.relationships || [])
        .push({ targetName: target, role });
      this.markDirty();
      await this.save();          // เขียนไฟล์ + ซิงก์ฝั่งตรงข้ามทันที (v1 semantics)
      this.render();
    };
    rh.appendChild(addR); wrap.appendChild(rh);
    (this.e.relationships || []).forEach((rel, i) => {
      const r = document.createElement('div'); r.className = 'wiki-row';
      const lab = document.createElement('label');
      lab.textContent = rel.role || '—';
      const val = document.createElement('span'); val.className = 'wiki-rel-target wiki-rel-link';
      val.textContent = rel.targetName || rel.target || '?';
      val.title = 'เปิดหน้า Wiki นี้';
      val.onclick = () => {
        const f = this.fileOfEntity(rel.targetName || rel.target);
        if (f && this.onOpenEntity) this.onOpenEntity(f);
        else alert('ยังไม่พบหน้า Wiki ของ ' + (rel.targetName || rel.target));
      };
      const del = document.createElement('span'); del.className = 'row-add';
      del.textContent = '✕'; del.title = 'ลบความสัมพันธ์นี้ (ฝั่งนี้)';
      del.onclick = () => { this.e.relationships.splice(i, 1); this.markDirty(); this.render(); };
      r.append(lab, val, del); wrap.appendChild(r);
    });

    // sections: หัวข้อ + เนื้อหา (WYSIWYG — เก็บเป็น md ใน content เหมือน v1)
    const sh = document.createElement('div'); sh.className = 'wiki-sub';
    sh.textContent = 'เนื้อหา';
    const addSec = document.createElement('span'); addSec.className = 'row-add'; addSec.textContent = '+';
    addSec.title = 'เพิ่มหัวข้อ';
    addSec.onclick = async () => {
      const t = await ask('ชื่อหัวข้อใหม่', { placeholder: 'เช่น ประวัติ / นิสัย' });
      if (!t) return;
      this.e.sections = [...(this.e.sections || []), { title: t, content: '' }];
      this.markDirty(); this.render();
    };
    sh.appendChild(addSec); wrap.appendChild(sh);

    this.secEditors = [];
    (this.e.sections || []).forEach((sec, i) => {
      const box = document.createElement('div'); box.className = 'wiki-sec';
      const st = document.createElement('div'); st.className = 'wiki-sec-title';
      const ti = document.createElement('input'); ti.className = 'wiki-input'; ti.value = sec.title || '';
      ti.addEventListener('input', () => { sec.title = ti.value; this.markDirty(); });
      const del = document.createElement('span'); del.className = 'row-add'; del.textContent = '✕';
      del.title = 'ลบหัวข้อนี้';
      del.onclick = async () => {
        if (!(await confirmBox(`ลบหัวข้อ “${sec.title}” ?`))) return;
        this.e.sections.splice(i, 1); this.markDirty(); this.render();
      };
      st.append(ti, del); box.appendChild(st);
      const ed = document.createElement('div'); ed.className = 'wiki-sec-ed';
      box.appendChild(ed);
      const k = new KEditor(ed, { markdown: sec.content || '',
        onChange: () => { this.markDirty(); },
        // ให้เนื้อหา wiki พิมพ์ @ แล้วลิงก์ไปหา entity อื่นได้ (Ctrl+คลิกเปิด) + ตรวจคำผิด
        getNames: () => this.entityTitles() || [],
        onMention: (name) => {
          const f = this.fileOfEntity && this.fileOfEntity(name);
          if (f && this.onOpenEntity) this.onOpenEntity(f);
        },
        getChecker: this.getChecker || undefined,
      });
      this.secEditors.push({ sec, k });
      wrap.appendChild(box);
    });
    // หลัง render ใหม่ แผง backlinks (wiki-ui.js เป็นคนเติม) จะหายไป → ให้เติมกลับ
    this.onRendered && this.onRendered(wrap);
  }

  async save() {
    for (const { sec, k } of this.secEditors) sec.content = k.getMarkdown();
    await kapi.writeFile(this.file, JSON.stringify(this.e, null, 2));
    await this._syncInverse();
    this.dirty = false;
    this.onSaved && this.onSaved(this.e);
    return true;
  }

  async _syncInverse() {
    // ให้ความสัมพันธ์ปรากฏบนอีกฝั่งด้วย (v1 semantics: เพิ่มเฉพาะที่ยังไม่มี ไม่ลบของเขา)
    for (const rel of this.e.relationships || []) {
      const tf = this.fileOfEntity(rel.targetName);
      if (!tf || tf === this.file) continue;
      try {
        const te = await kapi.readJson(tf);
        te.relationships = te.relationships || [];
        const already = te.relationships.some((r) =>
          (r.targetName || r.target) === this.e.name);
        if (!already) {
          te.relationships.push({ targetName: this.e.name,
                                  role: this.invertRole(rel.role || '') });
          await kapi.writeFile(tf, JSON.stringify(te, null, 2));
        }
      } catch {}
    }
  }

  focus() {}
  // โหลด entity ใหม่จากไฟล์ถ้าไม่มีการแก้ค้าง (ใช้เมื่ออีกฝั่งซิงก์ความสัมพันธ์เข้ามา)
  async reloadIfExists() {
    if (this.dirty) return;
    try {
      const fresh = await kapi.readJson(this.file);
      this.e = fresh; this.render();
    } catch {}
  }
  destroy() { for (const { k } of this.secEditors) k.destroy(); }
}
