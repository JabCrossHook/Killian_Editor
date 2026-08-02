// บทหนัง WYSIWYG — element แบบ Final Draft (ยกพฤติกรรมจาก v1)
// Tab = วน element · Enter = ไป element ถัดไปตามครรลอง · ไฟล์เก็บเป็นกติกา v1 เป๊ะ
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark, chainCommands } from 'prosemirror-commands';
import { parseScript, lineFor, SP_ELEMS, TAB_CYCLE, NEXT_ELEM,
         splitCharacter, withExtension } from './fountain.js';
import { state, DEFAULT_SP_CYCLE, spCycleKeys, spKeyMatch } from './core.js';

const marks = {
  strong: { parseDOM: [{ tag: 'strong' }], toDOM: () => ['strong', 0] },
  em: { parseDOM: [{ tag: 'em' }], toDOM: () => ['em', 0] },
  underline: { parseDOM: [{ tag: 'u' }], toDOM: () => ['u', 0] },
  strike: { parseDOM: [{ tag: 's' }], toDOM: () => ['s', 0] },
};

export const spSchema = new Schema({
  nodes: {
    doc: { content: '(sp|spimage)+' },
    sp: {
      content: 'inline*',
      attrs: { el: { default: 'action' }, align: { default: null } },
      parseDOM: [{ tag: 'div[data-el]', getAttrs: (d) => ({ el: d.getAttribute('data-el'),
                   align: d.style.textAlign || null }) }],
      toDOM: (n) => ['div', { 'data-el': n.attrs.el, class: 'sp sp-' + n.attrs.el,
                     ...(n.attrs.align ? { style: 'text-align:' + n.attrs.align } : {}) }, 0],
    },
    // รูปในบทหนัง — atom (แก้ text ไม่ได้ · ลากได้) เก็บ md เดิมเป๊ะ ไม่กลายเป็นข้อความ
    spimage: {
      group: 'block', atom: true, draggable: true, selectable: true,
      attrs: { src: {}, alt: { default: '' }, md: { default: '' }, resolved: { default: '' } },
      parseDOM: [{ tag: 'figure[data-md]', getAttrs: (d) => ({
        src: d.getAttribute('data-src') || '', alt: d.getAttribute('data-alt') || '',
        md: d.getAttribute('data-md') || '', resolved: '' }) }],
      toDOM: (n) => ['figure', { 'data-md': n.attrs.md, 'data-src': n.attrs.src,
                                 'data-alt': n.attrs.alt, class: 'sp sp-image',
                                 title: n.attrs.alt || '' },
                     ['img', { src: n.attrs.resolved || n.attrs.src,
                               alt: n.attrs.alt, draggable: 'false' }]],
    },
    text: { group: 'inline' },
  },
  marks,
});

// inline **หนา** ฯลฯ — ชุดเดียวกับ md.js (import ตรงจะวนกันเอง จึงรับผ่านพารามิเตอร์)
import { mdToDoc, docToMd } from './md.js';
import { spellPlugin, mentionPlugin, refreshMentions, focusLinePlugin, commentAnchorPlugin } from './editor.js';
// [61] แสดงรูปแบบ + [57] เส้นคั่นหน้าในตัวแก้ไข
import { spFormatGuidePlugin, spPageBreakPlugin, spSceneNumberPlugin, spContinuedPlugin,
         refreshFormatGuide, refreshPageBreaks, refreshSceneNumbers,
         refreshContinueds } from './sp-format-guide.js';
import { IMG_RE } from './fountain.js';
function inlineContent(text) {
  const doc = mdToDoc(text);
  const p = (doc.content || [])[0] || {};
  return (p.type === 'paragraph' ? p.content : null) || (text ? [{ type: 'text', text }] : []);
}
function inlineToMd(content) {
  return docToMd({ type: 'doc', content: [{ type: 'paragraph', content }] });
}

/** แปลง markdown ของบท → doc ของ spSchema (ใช้ทั้งตอนสร้างตัวแก้ไขและตอน setMarkdown) */
export function spDocFromMarkdown(markdown, resolveSrc = (p) => p) {
  const blocks = parseScript(markdown || '').map((b) => {
    if (b.el === 'image') {
      const m = IMG_RE.exec(b.text) || [];
      return { type: 'spimage', attrs: { alt: m[1] || '', src: m[2] || '',
               md: b.text, resolved: resolveSrc(m[2] || '') } };
    }
    return {
      type: 'sp',
      attrs: { el: b.el === 'blank' ? 'action' : b.el },
      content: b.el === 'raw'
        ? (b.text ? [{ type: 'text', text: b.text }] : [])
        : inlineContent(b.text),
    };
  });
  if (!blocks.length) blocks.push({ type: 'sp', attrs: { el: 'scene' } });
  return spSchema.nodeFromJSON({ type: 'doc', content: blocks });
}

export class SPEditor {
  constructor(mount, { markdown = '', onChange = null, onKeyDown = null,
                       onElement = null, getChecker = null, resolveSrc = (p) => p,
                       getNames = null, onMention = null, editable = null } = {}) {
    this.onChange = onChange; this.onElement = onElement;
    this.getChecker = getChecker; this.resolveSrc = resolveSrc;
    this.getNames = getNames;
    const doc = spDocFromMarkdown(markdown, resolveSrc);
    const self = this;
    this.view = new EditorView(mount, {
      editable: editable ? () => editable() : undefined,
      state: EditorState.create({
        doc, schema: spSchema,
        plugins: [
          ...(getNames ? [mentionPlugin(getNames)] : []),
          // [แก้ไข feature 1] ปุ่มควบคุม element ย้ายไปที่ handleKeyDown ทั้งหมด
          // (ผู้ใช้ตั้งปุ่มเองได้ + ปิดระบบได้ → ผูกกับ keymap ที่เป็นชื่อปุ่มตายตัวไม่ได้)
          // ที่เหลือไว้กัน Tab ย้ายโฟกัสออกจากตัวแก้ไขเมื่อผู้ใช้ย้ายคำสั่งไปปุ่มอื่น
          keymap({
            Tab: () => true,
            'Shift-Tab': () => true,
            'Mod-ArrowDown': () => { self.cycle(1); return true; },   // สลับรูปแบบถัดไป
            'Mod-ArrowUp': () => { self.cycle(-1); return true; },    // สลับรูปแบบก่อนหน้า
          }),
          keymap(baseKeymap),
          history(),
          ...(getChecker ? [spellPlugin(getChecker)] : []),
          focusLinePlugin(),
          commentAnchorPlugin(),
          spFormatGuidePlugin(),      // [61] เส้นขอบ element + เครื่องหมายจบบรรทัด
          spPageBreakPlugin(),        // [57] เส้นคั่นหน้า (ตำแหน่งมาจาก paginate ใน app.js)
          spSceneNumberPlugin(),      // [alpha.57a] เลขฉากสองฝั่งหัวฉาก
          spContinuedPlugin(),        // [alpha.58 · 55–56] (CONTINUED)/CONTINUED:/(MORE)/(cont'd)
        ],
      }),
      handleKeyDown(view, ev) {
        // [53] Parenthetical auto-wrap: กด ( ใน character/dialogue → parenthetical
        if (ev.key === '(' && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
          const el = self.curElement();
          if (el === 'character' || el === 'dialogue') {
            ev.preventDefault();
            const { node, pos } = self.curBlock();
            const from = view.state.selection.from;
            let tr = view.state.tr;
            tr = tr.setNodeMarkup(pos, null, { el: 'parenthetical', align: node.attrs.align || null });
            tr = tr.insertText('()', from);
            tr = tr.setSelection(TextSelection.create(tr.doc, from + 1));
            view.dispatch(tr);
            if (self.onElement) self.onElement('parenthetical');
            return true;
          }
        }
        // [77] Non-breaking space — Ctrl+Shift+Space
        if (ev.code === 'Space' && (ev.ctrlKey || ev.metaKey) && ev.shiftKey) {
          ev.preventDefault();
          view.dispatch(view.state.tr.insertText('\u00A0'));
          return true;
        }
        // [แก้ไข feature 1] ปุ่มสลับ element — ค่าเริ่มต้น Tab / Shift+Tab / Enter แต่ผู้ใช้เปลี่ยนได้
        // และปิดทั้งระบบได้ (spCycleEnabled=false → Enter ขึ้นบรรทัดใหม่ชนิดเดิมเท่านั้น)
        const cycleOn = state.settings?.spCycleEnabled !== false;
        const K = spCycleKeys(state.settings);
        for (const dir of ['shiftTab', 'tab', 'enter']) {
          if (!spKeyMatch(K[dir], ev)) continue;
          // SmartType มาก่อนเสมอ (ปุ่มยืนยันคำเดา = Tab · บั๊ก #1 ห้ามใช้ Enter)
          if (onKeyDown && onKeyDown(ev)) { ev.preventDefault(); return true; }
          if (!cycleOn) {
            if (dir !== 'enter') return false;
            ev.preventDefault(); return self.enter(true);   // ปิดระบบ = ขึ้นบรรทัดใหม่ชนิดเดิม
          }
          ev.preventDefault();
          return dir === 'enter' ? self.enter() : self._tabCycle(dir);
        }
        return onKeyDown ? onKeyDown(ev) : false;
      },
      // [93] Auto-capitalize: ขึ้นต้นประโยคด้วยตัวใหญ่ + i→I
      handleTextInput(view, from, to, text) {
        if (text.length > 20) return false;  // กัน paste ใหญ่ ๆ
        return self._handleAutoText(view, from, to, text);
      },
      handleDOMEvents: {
        // Ctrl/Cmd+คลิก หรือคลิกกลาง บนชื่อ Wiki → เปิดหน้า Wiki (เหมือนโหมดนิยาย)
        mousedown(view, ev) {
          if (!onMention || !(ev.ctrlKey || ev.metaKey)) return false;
          const t = ev.target && ev.target.closest && ev.target.closest('.k-mention');
          if (!t) return false;
          ev.preventDefault(); onMention(t.textContent.replace(/^\[\[|\]\]$/g, '')); return true;
        },
        auxclick(view, ev) {
          if (!onMention || ev.button !== 1) return false;
          const t = ev.target && ev.target.closest && ev.target.closest('.k-mention');
          if (!t) return false;
          ev.preventDefault(); onMention(t.textContent.replace(/^\[\[|\]\]$/g, '')); return true;
        },
      },
      dispatchTransaction(tr) {
        const st = self.view.state.apply(tr);
        self.view.updateState(st);
        if (tr.docChanged) {
          if (self.onChange) self.onChange();
          // [52] Auto-detect INT./EXT. → switch to scene
          self._autoDetect();
        }
        if (self.onElement) self.onElement(self.curElement());
      },
    });
  }
  refreshMentions() { refreshMentions(this.view); }

  /** แทนที่เนื้อหาทั้งเอกสารด้วย markdown ใหม่ (เก็บ undo history ไว้) */
  setMarkdown(md) {
    const v = this.view;
    const doc = spDocFromMarkdown(md, this.resolveSrc);
    v.dispatch(v.state.tr.replaceWith(0, v.state.doc.content.size, doc.content));
    return true;
  }

  // [61][57] วาด decoration ของ "แสดงรูปแบบ" / เส้นคั่นหน้าใหม่ (เรียกหลังเปลี่ยนค่าตั้ง)
  refreshGuides() {
    refreshFormatGuide(this.view); refreshPageBreaks(this.view); refreshSceneNumbers(this.view);
    refreshContinueds(this.view);
  }

  /** [alpha.57a ข้อ 2] ใส่/ถอด "ส่วนเสริม" ท้ายชื่อตัวละคร — เว้นจากชื่อ 1 วรรคเสมอ */
  setExtension(ext) {
    const { node, pos } = this.curBlock();
    if (!node || node.attrs.el !== 'character') return false;
    const next = withExtension(node.textContent || '', ext);
    const v = this.view;
    const from = pos + 1, to = pos + 1 + node.content.size;
    let tr = next ? v.state.tr.insertText(next, from, to) : v.state.tr.delete(from, to);
    tr = tr.setSelection(TextSelection.create(tr.doc, from + next.length));
    v.dispatch(tr);
    v.focus();
    return true;
  }
  /** ส่วนเสริมของบล็อกตัวละครที่เคอร์เซอร์อยู่ ('' = ไม่มี) */
  curExtension() {
    try {
      const { node } = this.curBlock();
      return node.attrs.el === 'character' ? splitCharacter(node.textContent || '').ext : '';
    } catch { return ''; }
  }

  /** [78] ย้ายเคอร์เซอร์ไปตำแหน่ง pos แล้วเลื่อนจอให้เห็น */
  gotoPos(pos) {
    const v = this.view;
    const max = v.state.doc.content.size;
    const p = Math.max(0, Math.min(Number(pos) || 0, max));
    const $p = v.state.doc.resolve(p);
    const sel = TextSelection.near($p, 1);
    v.dispatch(v.state.tr.setSelection(sel).scrollIntoView());
    v.focus();
    return true;
  }

  curBlock() {
    const $f = this.view.state.selection.$from;
    return { node: $f.node(1), pos: $f.before(1) };
  }
  curElement() { try { return this.curBlock().node.attrs.el; } catch { return 'action'; } }

  setElement(el) {
    const { node, pos } = this.curBlock();
    this.view.dispatch(this.view.state.tr.setNodeMarkup(pos, null, { el, align: node.attrs.align || null }));
    this.view.focus();
    if (this.onElement) this.onElement(el);
  }

  // จัดหน้าบล็อกบทหนังในช่วงเลือก (arg: 'left'|'center'|'right'|'justify')
  setAlign(align) {
    const v = this.view;
    const val = align === 'left' ? null : align;
    const { from, to } = v.state.selection;
    let tr = v.state.tr, changed = false;
    v.state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.type === spSchema.nodes.sp) {
        tr = tr.setNodeMarkup(pos, null, { ...node.attrs, align: val }); changed = true;
      }
    });
    if (changed) v.dispatch(tr);
    v.focus();
  }
  curAlign() { try { return this.curBlock().node.attrs.align || 'left'; } catch { return 'left'; } }

  cycle(dir) {
    const cur = this.curElement();
    const i = TAB_CYCLE.indexOf(cur);
    const next = TAB_CYCLE[(i === -1 ? 0 : i + dir + TAB_CYCLE.length) % TAB_CYCLE.length];
    this.setElement(next);
  }

  // [95] Per-element switch — Ctrl+1..9
  switchTo(el) { this.setElement(el); }

  // [51] Tab/Shift-Tab cycle ตาม spCycle
  _tabCycle(dir) {
    const cur = this.curElement();
    const spCycle = state.settings?.spCycle || DEFAULT_SP_CYCLE;
    const cfg = spCycle[cur];
    if (!cfg) return true;
    const nextEl = cfg[dir];
    if (nextEl) this.setElement(nextEl);
    return true;
  }

  // [52] Auto-detect INT./EXT. — ตรวจหลังพิมพ์ทุกครั้ง
  _autoDetect() {
    const el = this.curElement();
    if (el === 'scene') return;
    const text = this.curBlock().node.textContent.trim();
    if (/^(int\.|ext\.|int\/ext\.|i\/e\.|est\.|ฉาก)\s/i.test(text)) {
      const { node, pos } = this.curBlock();
      this.view.dispatch(this.view.state.tr.setNodeMarkup(pos, null, {
        el: 'scene', align: node.attrs.align || null
      }));
      if (this.onElement) this.onElement('scene');
    }
  }

  // [79] เลือกทั้งฉาก (ทุกบรรทัดระหว่างหัวฉาก) + กดซ้ำ = select all
  selectScene() {
    const v = this.view;
    const curPos = v.state.selection.$from.before(1);
    let start = curPos + 1, end = v.state.doc.content.size;
    // หาหัวฉากก่อนหน้า (รวมบล็อกปัจจุบันถ้าเป็น scene)
    let lastScene = 0;
    v.state.doc.forEach((node, pos) => {
      if (pos > curPos) return false;
      if (node.type.name === 'sp' && node.attrs.el === 'scene') lastScene = pos;
    });
    if (lastScene > 0) start = lastScene + 1;
    // หาหัวฉากถัดไป (หลัง curPos) — จบที่ก่อนบล็อกถัดไป
    v.state.doc.forEach((node, pos) => {
      if (pos <= curPos) return;
      if (node.type.name === 'sp' && node.attrs.el === 'scene') { end = pos; return false; }
    });
    // กดซ้ำ = select all
    const sel = v.state.selection;
    if (sel.from === start && sel.to === end && start > 1 && end !== v.state.doc.content.size) {
      // เลือกทั้งเอกสาร: เริ่มหลัง doc โหนด, จบท้ายสุด
      const firstPos = v.state.doc.firstChild ? 2 : 0;
      start = firstPos; end = v.state.doc.content.size;
    }
    v.dispatch(v.state.tr.setSelection(TextSelection.create(v.state.doc, start, end)));
    v.focus();
  }

  // sameEl = true → ขึ้นบรรทัดใหม่ชนิดเดิม (ใช้ตอนผู้ใช้ปิดระบบปุ่มสลับ element)
  enter(sameEl) {
    const v = this.view;
    const cur = this.curElement();
    const spCycle = state.settings?.spCycle || DEFAULT_SP_CYCLE;
    const nextEl = sameEl ? cur : ((spCycle[cur]?.enter) || NEXT_ELEM[cur] || 'action');
    const sp = spSchema.nodes.sp.create({ el: nextEl });
    const { $from } = v.state.selection;
    const insertAt = $from.after(1);
    let tr = v.state.tr.insert(insertAt, sp);
    tr = tr.setSelection(TextSelection.create(tr.doc, insertAt + 1));
    v.dispatch(tr.scrollIntoView());
    if (this.onElement) this.onElement(nextEl);
    return true;
  }

  cmd(name, arg) {
    const v = this.view;
    const run = (c) => { c(v.state, v.dispatch, v); v.focus(); };
    const mk = { bold: 'strong', italic: 'em', underline: 'underline', strike: 'strike' }[name];
    if (mk) return run(toggleMark(spSchema.marks[mk]));
    if (name === 'undo') return run(undo);
    if (name === 'redo') return run(redo);
    if (name === 'align') return this.setAlign(arg);
  }

  getMarkdown() {
    const lines = [];
    let prevBlank = true, prevType = 'action';
    this.view.state.doc.forEach((node) => {
      if (node.type.name === 'spimage') {          // รูป → คืนบรรทัด md เดิม (ไม่กลายเป็นข้อความ)
        const line = node.attrs.md || `![${node.attrs.alt || ''}](${node.attrs.src || ''})`;
        lines.push(line); prevBlank = false; prevType = 'action'; return;
      }
      const el = node.attrs.el;
      const text = el === 'raw'
        ? node.textContent
        : inlineToMd(node.toJSON().content || []);
      const line = lineFor(el, text, prevBlank, prevType);
      lines.push(line);
      if (line.trim() === '') prevBlank = true;
      else { prevBlank = false; prevType = el; }
    });
    return lines.join('\n');
  }

  // แทรกรูปในบทหนัง (เรียกจาก insertImage ของ app.js)
  insertImage(src, alt, md) {
    const node = spSchema.nodes.spimage.create({ src, alt, md, resolved: this.resolveSrc(src) });
    this.view.dispatch(this.view.state.tr.replaceSelectionWith(node).scrollIntoView());
    this.view.focus();
  }

  // [93] Auto-capitalize sentences + i→I ในบทหนัง
  _handleAutoText(view, from, to, text) {
    const s = state.settings;
    if (!s.spAutoCapitalize && !s.spAutoCorrectI) return false;
    let modified = text;
    if (s.spAutoCapitalize) {
      const $from = view.state.doc.resolve(from);
      // ขึ้นต้นบล็อก → ตัวใหญ่
      if ($from.parentOffset === 0) {
        modified = modified.replace(/^[a-z]/, (c) => c.toUpperCase());
      } else if ($from.parentOffset >= 2) {
        const before = $from.parent.textBetween($from.parentOffset - 2, $from.parentOffset);
        if (/[.!?]\s$/.test(before)) {
          modified = modified.replace(/^[a-z]/, (c) => c.toUpperCase());
        }
      }
    }
    if (s.spAutoCorrectI && modified.length <= 2) {
      const $from = view.state.doc.resolve(from);
      const solo = $from.parentOffset === 0 || $from.parent.textBetween($from.parentOffset - 1, $from.parentOffset).endsWith(' ');
      if (solo && /^i$/i.test(modified.trim())) {
        modified = 'I' + modified.slice(1);
      }
    }
    if (modified !== text) {
      view.dispatch(view.state.tr.insertText(modified, from, to));
      return true;
    }
    return false;
  }

  getText() { return this.view.state.doc.textBetween(0, this.view.state.doc.content.size, '\n'); }
  focus() { this.view.focus(); }
  destroy() { this.view.destroy(); }
}
