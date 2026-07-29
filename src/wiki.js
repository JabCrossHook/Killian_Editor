// Wiki entity editor — โครงข้อมูลเดียวกับ v1 ทุก field (อ่าน-แก้-เขียน ไม่ทำข้อมูลส่วนอื่นหาย)
import { KEditor } from './editor.js';
import { ask, confirmBox, popupMenu } from './ui.js';
import { iconHtml, icon } from './icons.js';
import { REL_COLOR, REL_LABEL } from './relationship-types.js';

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
                                    getChecker = null, onRendered = null,
                                    onVersions = null, onSnapshot = null,
                                    onSwapTemplate = null } = {}) {
    this.onRendered = onRendered;
    this.onVersions = onVersions; this.onSnapshot = onSnapshot;   // ประวัติเวอร์ชันหน้า Wiki (ข้อ 10)
    this.onSwapTemplate = onSwapTemplate;                          // เปลี่ยนเทมเพลต (ข้อ 18b)
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
    // คลิกขวาทั่ว wiki → เมนูบริบท
    wrap.oncontextmenu = (e) => {
      const target = e.target;
      // คลิกขวาบนลิงก์ (field pill / relationship target) → เปิดหน้า wiki นั้น
      const link = target.closest('.wiki-rel-link');
      if (link) {
        const f = this.fileOfEntity(link.textContent.trim());
        if (f && this.onOpenEntity) {
          e.preventDefault();
          popupMenu(e.clientX, e.clientY, [
            { label: iconHtml('link', 14) + ' เปิดหน้า Wiki นี้', click: () => this.onOpenEntity(f) },
          ]);
          return;
        }
      }
      // คลิกขวาบนชื่อเอนทิตี้ → ค้นหาในฉาก
      if (!target.closest('input') && !target.closest('.ProseMirror') && !target.closest('button')) {
        e.preventDefault();
        const items = [];
        if (this.onOpenEntity) {
          items.push({ label: iconHtml('link', 14) + ' ค้นหาในฉาก (Find on location)', click: async () => {
            // เปิด centralize/backlinks สำหรับ entity นี้
            if (this.file) {
              const { ensureAutoLink } = await import('./world-story/auto-link-ui.js');
              await ensureAutoLink();
              if (this.onRendered) this.onRendered(wrap);
              // เลื่อนไปที่ส่วน backlinks
              const bl = wrap.querySelector('.wiki-backlinks');
              if (bl) bl.scrollIntoView({ behavior: 'smooth' });
            }
          }});
        }
        items.push({ label: iconHtml('edit', 14) + ' เปลี่ยนชื่อ', click: async () => {
          const nv = await ask('ชื่อใหม่', { placeholder: this.e.name });
          if (nv && nv !== this.e.name) { this.e.name = nv; this.markDirty(); this.render(); }
        }});
        popupMenu(e.clientX, e.clientY, items);
      }
    };
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
    // ช่องข้อมูลที่ "ลิงก์ได้": ถ้าค่าตรงกับชื่อ entity ใน Wiki → แสดงป้ายคลิกได้ใต้ input
    // (พิมพ์แก้ได้ตามปกติ · รองรับหลายชื่อคั่นด้วย , · คลิกชื่อ = เปิดหน้า Wiki นั้น)
    const linkedField = (labelText, val, cb) => {
      const r = row(labelText);
      const i = input(val, (v) => { cb(v); syncLink(); });
      r.appendChild(i);
      const linkRow = document.createElement('div');
      linkRow.className = 'wiki-field-links';
      r.appendChild(linkRow);
      const syncLink = () => {
        const names = this.entityTitles();
        const hits = [];
        if (!names.length) { linkRow.innerHTML = ''; return; }
        // ตรวจทั้งแบบตรงทั้งหมดและแบบ substring (ค่า field อาจมีข้อความอื่นปน)
        for (const nm of names) {
          if (!nm || nm === this.e.name) continue;
          const idx = i.value.indexOf(nm);
          if (idx >= 0) hits.push([nm, idx]);
        }
        // ถ้าไม่เจอ substring → ลองเทียบแบบคำ (แยกด้วย ,，、;；\n ช่องว่าง)
        if (!hits.length) {
          const vals = i.value.split(/[,，、;；\n\s]+/).map((s) => s.trim()).filter(Boolean);
          for (const v of vals) {
            const match = names.find((n) => n === v || n.toLowerCase() === v.toLowerCase());
            if (match && !hits.some((h) => h[0] === match)) hits.push([match, i.value.indexOf(match)]);
          }
        }
        // เรียงตามตำแหน่งที่พบ
        hits.sort((a, b) => a[1] - b[1]);
        linkRow.innerHTML = '';
        if (!hits.length) return;
        for (const [nm] of hits) {
          const a = document.createElement('span');
          a.className = 'wiki-rel-link wiki-link-pill';
          a.textContent = nm;
          a.title = 'คลิกเพื่อเปิดหน้า Wiki นี้';
          a.onclick = () => { const f = this.fileOfEntity(nm);
            if (f && this.onOpenEntity) this.onOpenEntity(f); };
          linkRow.appendChild(a);
        }
      };
      i.addEventListener('focus', syncLink);
      i.addEventListener('input', () => setTimeout(syncLink, 100));
      syncLink();
      return r;
    };

    const head = document.createElement('div'); head.className = 'wiki-head';
    const hl = document.createElement('span');
    hl.textContent = (CAT_TH[this.e.entityTypeKey] || this.e.entityTypeKey || 'Wiki');
    const saveBtn = document.createElement('button');
    saveBtn.innerHTML = iconHtml('save', 16) + ' บันทึก (Ctrl+S)';
    saveBtn.onclick = () => this.save().then(() => {
      saveBtn.innerHTML = iconHtml('check', 16) + ' บันทึกแล้ว';
      setTimeout(() => { saveBtn.innerHTML = iconHtml('save', 16) + ' บันทึก (Ctrl+S)'; }, 1500);
    });
    head.append(hl);
    // ประวัติเวอร์ชันของหน้า Wiki — ระบบเดียวกับฉาก (ข้อ 10)
    if (this.onVersions) {
      const verBtn = document.createElement('button');
      verBtn.className = 'wiki-ver-btn'; verBtn.innerHTML = iconHtml('history', 14) + ' ประวัติเวอร์ชัน';
      verBtn.title = 'ดู/กู้คืนเวอร์ชันเก่าของหน้านี้';
      verBtn.onclick = () => this.onVersions();
      head.append(verBtn);
      const snapBtn = document.createElement('button');
      snapBtn.className = 'wiki-ver-btn'; snapBtn.innerHTML = iconHtml('camera', 14) + ' บันทึกเวอร์ชัน';
      snapBtn.title = 'บันทึกเวอร์ชันนี้ไว้ (ตั้งชื่อได้)';
      snapBtn.onclick = () => this.onSnapshot && this.onSnapshot();
      head.append(snapBtn);
    }
    // ปุ่มเปลี่ยนเทมเพลต (ข้อ 18b) — merge fields ไม่ล้างของเดิม
    if (this.onSwapTemplate) {
      const tplBtn = document.createElement('button');
      tplBtn.className = 'wiki-tpl-btn'; tplBtn.innerHTML = iconHtml('cog', 14) + ' เปลี่ยนเทมเพลต';
      tplBtn.title = 'เปลี่ยนเทมเพลตและเพิ่มช่องข้อมูลใหม่จากเทมเพลต (ไม่ลบข้อมูลเดิม)';
      tplBtn.onclick = async () => {
        if (await this.onSwapTemplate()) { this.render(); }
      };
      head.append(tplBtn);
    }
    head.append(saveBtn);
    wrap.appendChild(head);

    // ---- Profile Header (ข้อ 55) — แสดงการ์ดตัวละคร ----
    if (this.e.entityTypeKey === 'characters') {
      const prof = document.createElement('div'); prof.className = 'wiki-prof';
      // รูปในวงกลม — images[] เก็บเป็น "ชื่อไฟล์ในโฟลเดอร์ Images" (string) ไม่ใช่ออบเจกต์ {url}
      // เดิมอ่าน images[0].url จึงได้ undefined ตลอด → เห็นแต่ไอคอน 👤 (บั๊กข้อ 2)
      const avatar = document.createElement('div'); avatar.className = 'wiki-prof-avatar';
      avatar.title = 'คลิกเพื่อตั้งรูปประจำตัว (คลิกขวา = เอารูปออก)';
      const paintAvatar = async () => {
        avatar.textContent = '';
        const first = (this.e.images || [])[0];
        const name = typeof first === 'string' ? first : (first && (first.name || first.file)) || '';
        if (!name) { avatar.innerHTML = iconHtml('user', 32); return; }
        const url = /^(file|https?|data):/i.test(name)
          ? name
          : await kapi.toFileURL(await kapi.join(this.projectRoot, 'Images', name));
        const imgEl = document.createElement('img');
        imgEl.src = url;
        imgEl.onerror = () => { avatar.innerHTML = iconHtml('user', 32); };
        avatar.appendChild(imgEl);
      };
      paintAvatar();
      // ตั้งรูปประจำตัว = ย้ายรูปที่เลือกไปเป็นตัวแรกของ images[] (คลังรูปยังเก็บครบเหมือนเดิม)
      const setAvatar = (name) => {
        const list = (this.e.images || []).filter((x) => x !== name);
        this.e.images = [name, ...list];
        this.markDirty(); this.render();
      };
      avatar.onclick = async () => {
        const items = [];
        if (this.pickFromGallery) items.push('เลือกจากคลังรูปของโปรเจกต์');
        items.push('เพิ่มรูปจากไฟล์…');
        const pick = items.length > 1 && this.pickTitle ? await this.pickTitle(items) : items[items.length - 1];
        if (!pick) return;
        if (pick.startsWith('เลือกจากคลัง')) {
          const it = await this.pickFromGallery();
          if (!it) return;
          setAvatar(it.file || it);
        } else {
          const src = await kapi.openImageDialog(); if (!src) return;
          const dir = await kapi.join(this.projectRoot, 'Images');
          setAvatar(await kapi.copyInto(src, dir));
        }
      };
      avatar.oncontextmenu = (e) => {
        e.preventDefault();
        if (!(this.e.images || []).length) return;
        this.e.images = this.e.images.slice(1);
        this.markDirty(); this.render();
      };
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
        const rl = document.createElement('div'); rl.className = 'wiki-prof-role'; rl.innerHTML = iconHtml('brain', 14) + ' ' + role;
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
    addP.innerHTML = iconHtml('plus', 14); addP.title = 'เพิ่มช่องข้อมูลของตัวเอง';
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
      del.innerHTML = iconHtml('x', 14); del.title = 'ลบช่องนี้';
      del.onclick = () => { delete this.e.customProperties[k]; this.markDirty(); this.render(); };
      r.appendChild(del);
    }

    // คลังรูปของ entity (images[] — ชื่อไฟล์ในโฟลเดอร์ Images ของโปรเจกต์)
    const ih = document.createElement('div'); ih.className = 'wiki-sub';
    ih.textContent = 'รูปภาพ';
    // เลือกจากคลังรูปที่มีอยู่ในโปรเจกต์
    const pickImg = document.createElement('span'); pickImg.className = 'row-add';
    pickImg.innerHTML = iconHtml('image', 14); pickImg.title = 'เลือกจากคลังรูปของโปรเจกต์';
    pickImg.onclick = async () => {
      if (!this.pickFromGallery) return;
      const it = await this.pickFromGallery();
      if (!it) return;
      this.e.images = [...(this.e.images || []), it.file || it];
      this.markDirty(); this.render();
    };
    // เพิ่มรูปใหม่จากไฟล์ (คัดลอกเข้าคลัง)
    const addImg = document.createElement('span'); addImg.className = 'row-add';
    addImg.innerHTML = iconHtml('plus', 14); addImg.title = 'เพิ่มรูปจากไฟล์ (คัดลอกเข้าคลังรูปโปรเจกต์)';
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
        { className: 'wiki-img-miss', innerHTML: iconHtml('error', 14) + ' ' + name })); };
      const del = document.createElement('span'); del.className = 'row-add wiki-img-x';
      del.innerHTML = iconHtml('x', 14); del.title = 'เอารูปนี้ออก (ไฟล์ยังอยู่ในคลัง)';
      del.onclick = (e) => { e.stopPropagation(); this.e.images.splice(i, 1); this.markDirty(); this.render(); };
      cell.append(im, del);
      // รูปแรก = รูปในวงกลมโปรไฟล์ → ให้เลือกได้ว่าจะใช้รูปไหน (ข้อ 2)
      const star = document.createElement('span'); star.className = 'row-add wiki-img-star';
      star.innerHTML = i === 0 ? iconHtml('star', 14) : iconHtml('star', 14);
      star.title = i === 0 ? 'รูปประจำตัวอยู่แล้ว' : 'ตั้งเป็นรูปประจำตัว (วงกลมด้านบน)';
      star.classList.toggle('on', i === 0);
      star.style.opacity = i === 0 ? '1' : '0.4';
      star.onclick = (e) => {
        e.stopPropagation();
        if (i === 0) return;
        const list = [...this.e.images];
        const [pick] = list.splice(i, 1);
        this.e.images = [pick, ...list];
        this.markDirty(); this.render();
      };
      cell.append(star);
      grid.appendChild(cell);
    });

    // ความสัมพันธ์ (sync สองทางตอนบันทึก — เหมือน v1)
    const rh = document.createElement('div'); rh.className = 'wiki-sub';
    rh.textContent = 'ความสัมพันธ์';
    const addR = document.createElement('span'); addR.className = 'row-add';
    addR.innerHTML = iconHtml('plus', 14); addR.title = 'เพิ่มความสัมพันธ์';
    addR.onclick = async () => {
      const others = this.entityTitles().filter((n) => n !== this.e.name);
      if (!others.length) { alert('ยังไม่มี entity อื่นให้ผูกความสัมพันธ์'); return; }
      let target, role, type = '';
      if (this.pickRelation) {
        const res = await this.pickRelation(others, this.e.name);
        if (!res) return;
        target = res.target; role = res.role; type = res.type || '';
      } else {
        target = this.pickTitle ? await this.pickTitle(others) : null;
        if (!target) return;
        role = await ask(`${this.e.name} เป็นอะไรกับ ${target}`,
                         { placeholder: 'เช่น พี่ชาย / เพื่อน / ศัตรู' });
      }
      if (!target || !role) return;
      // ไม่ระบุประเภท = ไม่เก็บ field เลย (เข้ากันได้กับไฟล์เดิมที่ไม่มี type)
      (this.e.relationships = this.e.relationships || [])
        .push(type ? { targetName: target, role, type } : { targetName: target, role });
      this.markDirty();
      await this.save();          // เขียนไฟล์ + ซิงก์ฝั่งตรงข้ามทันที (v1 semantics)
      this.render();
    };
    rh.appendChild(addR); wrap.appendChild(rh);
    (this.e.relationships || []).forEach((rel, i) => {
      const r = document.createElement('div'); r.className = 'wiki-row';
      const lab = document.createElement('label');
      lab.textContent = '';
      // จุดสีบอกประเภทความสัมพันธ์ (ครอบครัว/คนรัก/ศัตรู…) — ไม่มี type = ไม่มีจุด
      if (rel.type && REL_COLOR[rel.type]) {
        const badge = document.createElement('span');
        badge.className = 'rel-type-dot';
        badge.style.background = REL_COLOR[rel.type];
        badge.title = 'ประเภท: ' + (REL_LABEL[rel.type] || rel.type);
        lab.appendChild(badge);
      }
      lab.appendChild(document.createTextNode(rel.role || '—'));
      const val = document.createElement('span'); val.className = 'wiki-rel-target wiki-rel-link';
      val.textContent = rel.targetName || rel.target || '?';
      val.title = 'เปิดหน้า Wiki นี้';
      val.onclick = () => {
        const f = this.fileOfEntity(rel.targetName || rel.target);
        if (f && this.onOpenEntity) this.onOpenEntity(f);
        else alert('ยังไม่พบหน้า Wiki ของ ' + (rel.targetName || rel.target));
      };
      const del = document.createElement('span'); del.className = 'row-add';
      del.innerHTML = iconHtml('x', 14); del.title = 'ลบความสัมพันธ์นี้ (ฝั่งนี้)';
      del.onclick = () => { this.e.relationships.splice(i, 1); this.markDirty(); this.render(); };
      r.append(lab, val, del); wrap.appendChild(r);
    });

    // sections: หัวข้อ + เนื้อหา (WYSIWYG — เก็บเป็น md ใน content เหมือน v1)
    const sh = document.createElement('div'); sh.className = 'wiki-sub';
    sh.textContent = 'เนื้อหา';
    const addSec = document.createElement('span'); addSec.className = 'row-add';     addSec.innerHTML = iconHtml('plus', 14);
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
      const del = document.createElement('span'); del.className = 'row-add';       del.innerHTML = iconHtml('x', 14);
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
          // ประเภทเป็นของคู่ความสัมพันธ์ → ฝั่งตรงข้ามได้ประเภทเดียวกัน
          const inv = { targetName: this.e.name, role: this.invertRole(rel.role || '') };
          if (rel.type) inv.type = rel.type;
          te.relationships.push(inv);
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
