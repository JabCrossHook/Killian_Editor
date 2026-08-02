// sp-format-guide.js — "แสดงรูปแบบ" (ข้อ 61) + เส้นตัดหน้าในตัวแก้ไข (ใช้กับ Draft View ข้อ 57)
//
//   61  เส้นฟ้าที่ขอบซ้าย/ขวาของแต่ละ element + เครื่องหมายบอกชนิดการจบบรรทัด
//   57  เส้นบาง ๆ คั่นหน้า (ตำแหน่งมาจาก paginate ที่ app.js คำนวณให้ แล้วส่งเข้ามา)
//
// ใช้ decoration ของ ProseMirror เท่านั้น — ห้ามใส่ class ลง DOM ตรง ๆ (DOMObserver ซ่อมกลับ)
// รูปแบบเดียวกับ spellPlugin/commentAnchorPlugin ใน editor.js

import { Plugin as PMPlugin, PluginKey as PMKey } from 'prosemirror-state';
import { Decoration as Deco, DecorationSet as DecoSet } from 'prosemirror-view';
import { lineEndingType, LINE_MARK } from './sp-view.js';

// ───────── 61. แสดงรูปแบบ ─────────
const guideKey = new PMKey('kspguide');
let _guideOn = false;
let _guideFmt = null;              // รูปแบบล่าสุด (ใช้ความกว้างต่อ element หา soft/hard)

export function setFormatGuide(on, fmt) {
  _guideOn = !!on;
  if (fmt) _guideFmt = fmt;
}
export function isFormatGuide() { return _guideOn; }

function elWidth(el) {
  const c = _guideFmt && _guideFmt.elements && _guideFmt.elements[el];
  return c ? c.width : 6;
}

function guideDecos(doc) {
  if (!_guideOn || !doc) return DecoSet.empty;
  const out = [];
  doc.forEach((node, pos) => {
    if (!node.type || node.type.name !== 'sp') return;
    const el = (node.attrs && node.attrs.el) || 'action';
    out.push(Deco.node(pos, pos + node.nodeSize, { class: 'sp-fmt-guide' }));
    const kind = lineEndingType(node.textContent || '', elWidth(el));
    out.push(Deco.widget(pos + node.nodeSize - 1, () => {
      const s = document.createElement('span');
      s.className = 'sp-line-marker ' + kind;
      s.textContent = LINE_MARK[kind];
      s.title = kind === 'soft' ? 'ตัดบรรทัดเอง (soft wrap)' : 'จบบรรทัดด้วยการขึ้นบล็อกใหม่ (hard)';
      s.setAttribute('contenteditable', 'false');
      return s;
    }, { side: 1, key: 'lm' + pos + kind }));
  });
  return DecoSet.create(doc, out);
}

export function spFormatGuidePlugin() {
  return new PMPlugin({
    key: guideKey,
    state: {
      init: (_c, st) => guideDecos(st.doc),
      apply(tr, prev, _o, st) {
        if (!tr.docChanged && !tr.getMeta(guideKey)) return prev.map(tr.mapping, tr.doc);
        return guideDecos(st.doc);
      },
    },
    props: { decorations(state) { return guideKey.getState(state); } },
  });
}
export function refreshFormatGuide(view) {
  if (view) view.dispatch(view.state.tr.setMeta(guideKey, true));
}

// ───────── 57. เส้นคั่นหน้าในตัวแก้ไข ─────────
// ตำแหน่งมาจาก paginate() ที่ app.js เรียกใน scheduleCount (debounce 300ms)
// เก็บเป็นตัวแปรระดับโมดูลแบบเดียวกับสมอคอมเมนต์ — plugin แค่หยิบไปวาด
const pbKey = new PMKey('ksppagebreak');
let _breaks = [];                  // [{pos, page}] — page = เลขหน้าที่เริ่มตรงนั้น

let _breakSig = '';
/**
 * ตั้งรายการเส้นคั่นหน้า — คืน true เมื่อ "เปลี่ยนจริง"
 * ผู้เรียก (scheduleCount) ใช้ค่านี้ตัดสินว่าจะ dispatch transaction ไหม:
 * การวาด decoration ใหม่ทุก 300ms ทั้งที่ตำแหน่งเท่าเดิม ทำให้ ProseMirror รีเฟรช DOM ฟรี ๆ
 * (เคยไปกวนตำแหน่งเลื่อนของหน้ากระดาษระหว่างซูม)
 */
export function setPageBreaks(list) {
  const next = (list || []).filter((b) => b && Number.isFinite(b.pos) && b.pos > 0);
  const sig = next.map((b) => b.pos + ':' + b.page).join(',');
  if (sig === _breakSig) return false;
  _breakSig = sig;
  _breaks = next;
  return true;
}
export function pageBreaks() { return _breaks.slice(); }

function pbDecos(doc) {
  if (!_breaks.length || !doc) return DecoSet.empty;
  const max = doc.content.size;
  const out = [];
  for (const b of _breaks) {
    if (b.pos > max) continue;
    out.push(Deco.widget(b.pos, () => {
      const d = document.createElement('div');
      d.className = 'sp-page-break';
      d.dataset.page = String(b.page || '');
      d.setAttribute('contenteditable', 'false');
      const lbl = document.createElement('span');
      lbl.className = 'sp-page-break-num';
      lbl.textContent = 'หน้า ' + (b.page || '');
      d.append(lbl);
      return d;
    }, { side: -1, key: 'pb' + b.pos + '-' + b.page }));
  }
  return DecoSet.create(doc, out);
}

export function spPageBreakPlugin() {
  return new PMPlugin({
    key: pbKey,
    state: {
      init: (_c, st) => pbDecos(st.doc),
      apply(tr, prev, _o, st) {
        if (!tr.docChanged && !tr.getMeta(pbKey)) return prev.map(tr.mapping, tr.doc);
        return pbDecos(st.doc);
      },
    },
    props: { decorations(state) { return pbKey.getState(state); } },
  });
}
export function refreshPageBreaks(view) {
  if (view) view.dispatch(view.state.tr.setMeta(pbKey, true));
}
