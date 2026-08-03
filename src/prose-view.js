// prose-view.js — โหมดมุมมองของ "นิยาย" (alpha.58r · บั๊ก 15 + 20)
//
// เดิมมุมมองหน้ากระดาษ (ปกติ/จัดหน้า/ร่าง/เรียงหน้าคู่/ภาพรวม 1px-4px) มีเฉพาะโหมดบทภาพยนตร์
// คนเขียนนิยายจึงไม่รู้เลยว่าตัวเองอยู่หน้าไหน · ขึ้นหน้าใหม่ตรงไหน
// ไฟล์นี้ทำสิ่งเดียวกันให้นิยาย โดยใช้ "คลาสของ pane ชุดเดียวกัน" (sp-view-*) เพื่อไม่ต้องซ้ำ CSS
//
// ส่วนคำนวณบริสุทธิ์ (ทดสอบด้วย node ได้) · ส่วนที่แตะ DOM = renderProsePageView + plugin เส้นคั่นหน้า

import { Plugin as PMPlugin, PluginKey as PMKey } from 'prosemirror-state';
import { Decoration as Deco, DecorationSet as DecoSet } from 'prosemirror-view';
import { mergeProseFormat, paginateProse, proseMetrics, prosePageLabel,
         proseFontStack, proseHeadingStack, proseLinePx, proseFontPx } from './prose-format.js';
import { PAPER_SIZES, MARGIN_DEFAULTS } from './sp-format.js';

// ───────── รายการโหมด (ชื่อเดียวกับบทภาพยนตร์ เพื่อให้เมนู/คลาส CSS ใช้ร่วมกันได้) ─────────
export const PROSE_VIEWS = ['normal', 'layout', 'draft', 'side', 'overview1', 'overview4'];
export const PROSE_VIEW_LABELS = {
  normal:    'ปกติ (หน้ากระดาษ)',
  layout:    'จัดหน้า — เห็นหน้าจริง (Layout)',
  draft:     'ร่าง — ข้อความล้วน (Draft)',
  side:      'เรียงหน้าคู่ (Side-by-Side)',
  overview1: 'ภาพรวม 1px/ตัวอักษร',
  overview4: 'ภาพรวม 4px/ตัวอักษร',
};
export const isValidProseView = (m) => PROSE_VIEWS.includes(m);
export const isProsePageView = (m) => m === 'side' || m === 'overview1' || m === 'overview4';
export const isProseEditView = (m) => !isProsePageView(m);

/** ตัวแปร CSS ของ Layout View ฝั่งนิยาย */
export function proseLayoutCssVars(fmt, paper, margins, gapPx = 28) {
  const mt = proseMetrics(fmt, paper, margins);
  return {
    '--ed-body-h': mt.bodyHeightPx + 'px',
    '--ed-page-gap': Math.max(8, Math.round(gapPx)) + 'px',
    '--ed-line-h': mt.lineHeightPx + 'px',
  };
}

/** หน้าของเอกสารนิยาย (ตัวช่วยสั้น ๆ ให้ app.js เรียกที่เดียว) */
export function prosePagesOf(blocks, fmt, paper, margins) {
  return paginateProse(blocks, { fmt, paper, margins });
}

// ───────── เส้นคั่นหน้าในตัวแก้ไขนิยาย (widget decoration) ─────────
// แยกคีย์/สถานะจาก spPageBreakPlugin เพราะ KEditor กับ SPEditor เปิดพร้อมกันได้คนละแท็บ
const edPbKey = new PMKey('kedpagebreak');
let _edBreaks = [];
let _edBreakSig = '';

/** ตั้งรายการเส้นคั่นหน้าของนิยาย — คืน true เมื่อเปลี่ยนจริง (บทเรียน 44: อย่า dispatch ซ้ำ) */
export function setProsePageBreaks(list) {
  const next = (list || []).filter((b) => b && Number.isFinite(b.pos) && b.pos > 0);
  const sig = next.map((b) => b.pos + ':' + b.page).join(',');
  if (sig === _edBreakSig) return false;
  _edBreakSig = sig;
  _edBreaks = next;
  return true;
}
export function prosePageBreaks() { return _edBreaks.slice(); }

function edPbDecos(doc) {
  if (!_edBreaks.length || !doc) return DecoSet.empty;
  const max = doc.content.size;
  const out = [];
  for (const b of _edBreaks) {
    if (b.pos > max) continue;
    out.push(Deco.widget(b.pos, () => {
      const d = document.createElement('div');
      d.className = 'sp-page-break ed-page-break';
      d.dataset.page = String(b.page || '');
      d.setAttribute('contenteditable', 'false');
      const lbl = document.createElement('span');
      lbl.className = 'sp-page-break-num';
      lbl.textContent = 'หน้า ' + (b.page || '');
      d.append(lbl);
      return d;
    }, { side: -1, key: 'edpb' + b.pos + '-' + b.page }));
  }
  return DecoSet.create(doc, out);
}

export function prosePageBreakPlugin() {
  return new PMPlugin({
    key: edPbKey,
    state: {
      init: (_c, st) => edPbDecos(st.doc),
      apply(tr, prev, _o, st) {
        if (!tr.docChanged && !tr.getMeta(edPbKey)) return prev.map(tr.mapping, tr.doc);
        return edPbDecos(st.doc);
      },
    },
    props: { decorations(state) { return edPbKey.getState(state); } },
  });
}
export function refreshProsePageBreaks(view) {
  if (view) view.dispatch(view.state.tr.setMeta(edPbKey, true));
}

// ───────── การวาดหน้ากระดาษจริง (side / overview) ─────────
const cssIn = (v) => (+v || 0) + 'in';

/**
 * วาดหน้ากระดาษนิยายลง host (DOM) — โครงเดียวกับ renderPageView ของบทภาพยนตร์
 * @returns {{pages:HTMLElement[], scale:number, perRow:number}}
 */
export function renderProsePageView(host, pages, fmt, opts = {}) {
  const f = fmt && fmt.headings ? fmt : mergeProseFormat(fmt);
  const paper = opts.paper || PAPER_SIZES.letter;
  const m = { ...MARGIN_DEFAULTS, ...(opts.margins || {}) };
  const list = (pages && pages.pages) || pages || [];
  const scale = opts.scale ?? 1;
  const gap = opts.gap ?? 20;
  const pw = +paper.width, ph = +paper.height;
  const pxW = pw * 96 * scale, pxH = ph * 96 * scale;

  host.innerHTML = '';
  host.style.setProperty('--sp-pv-scale', String(scale));
  host.style.setProperty('--sp-pv-gap', gap + 'px');
  const els = [];

  for (const pg of list) {
    const slot = document.createElement('div');
    slot.className = 'sp-page-slot';
    slot.style.width = pxW + 'px';
    slot.style.height = pxH + 'px';

    const page = document.createElement('div');
    page.className = 'sp-page ed-page';
    page.dataset.page = String(pg.index);
    page.style.width = cssIn(pw);
    page.style.minHeight = cssIn(ph);
    page.style.paddingTop = cssIn(m.top);
    page.style.paddingBottom = cssIn(m.bottom);
    page.style.paddingLeft = cssIn(m.left);
    page.style.paddingRight = cssIn(m.right);
    page.style.transform = 'scale(' + scale + ')';
    page.style.fontFamily = proseFontStack(f);
    page.style.fontSize = proseFontPx(f) + 'px';
    page.style.lineHeight = String(f.lineHeight);

    const label = f.pageNumbers ? prosePageLabel(pg.index, f, opts.startPage)
                                : (opts.showPageNumbers !== false && pg.index > 1 ? String(pg.index) : '');
    if (label) {
      const n = document.createElement('div');
      n.className = 'sp-page-num';
      n.textContent = label;
      page.append(n);
    }
    for (const b of pg.blocks || []) {
      const type = b.type || 'p';
      let d;
      if (type === 'hr') { d = document.createElement('hr'); }
      else if (/^h[1-6]$/.test(type)) {
        d = document.createElement(type);
        d.style.fontSize = ((f.headings[+type[1] - 1] || f.headings[0]).size) + 'em';
        d.style.fontFamily = proseHeadingStack(f);
        d.textContent = b.text || '';
      } else if (type === 'blockquote') {
        d = document.createElement('blockquote');
        d.textContent = b.text || '';
      } else if (type === 'figure') {
        d = document.createElement('div');
        d.className = 'pv-figure';
        d.textContent = '🖼 ' + (b.alt || 'รูป');
      } else {
        d = document.createElement('p');
        d.style.textIndent = f.firstLineIndent + 'in';
        d.style.marginBottom = f.paraSpacing + 'em';
        d.textContent = b.text || '';
      }
      d.classList.add('pv-block');
      if (Number.isFinite(b.pos)) d.dataset.pos = String(b.pos);
      page.append(d);
    }
    slot.append(page);
    host.append(slot);
    els.push(page);
  }
  return { pages: els, scale, perRow: opts.perRow ?? 0 };
}

/** ข้อความสรุปมุมมองปัจจุบัน (แถบสถานะ) */
export function proseViewStatusText(mode, pageCount) {
  const name = PROSE_VIEW_LABELS[mode] || PROSE_VIEW_LABELS.normal;
  return Number.isFinite(pageCount) ? `มุมมอง: ${name} · ${pageCount} หน้า` : 'มุมมอง: ' + name;
}

export { proseLinePx };
