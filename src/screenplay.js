// บทหนัง WYSIWYG — element แบบ Final Draft (ยกพฤติกรรมจาก v1)
// Tab = วน element · Enter = ไป element ถัดไปตามครรลอง · ไฟล์เก็บเป็นกติกา v1 เป๊ะ
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark, chainCommands } from 'prosemirror-commands';
import { parseScript, lineFor, SP_ELEMS, TAB_CYCLE, NEXT_ELEM } from './fountain.js';

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
import { spellPlugin, mentionPlugin, refreshMentions, focusLinePlugin } from './editor.js';
import { IMG_RE } from './fountain.js';
function inlineContent(text) {
  const doc = mdToDoc(text);
  const p = (doc.content || [])[0] || {};
  return (p.type === 'paragraph' ? p.content : null) || (text ? [{ type: 'text', text }] : []);
}
function inlineToMd(content) {
  return docToMd({ type: 'doc', content: [{ type: 'paragraph', content }] });
}

export class SPEditor {
  constructor(mount, { markdown = '', onChange = null, onKeyDown = null,
                       onElement = null, getChecker = null, resolveSrc = (p) => p,
                       getNames = null, onMention = null, editable = null } = {}) {
    this.onChange = onChange; this.onElement = onElement;
    this.getChecker = getChecker; this.resolveSrc = resolveSrc;
    this.getNames = getNames;
    const blocks = parseScript(markdown).map((b) => {
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
    const doc = spSchema.nodeFromJSON({ type: 'doc', content: blocks });
    const self = this;
    this.view = new EditorView(mount, {
      editable: editable ? () => editable() : undefined,
      state: EditorState.create({
        doc, schema: spSchema,
        plugins: [
          ...(getNames ? [mentionPlugin(getNames)] : []),
          keymap({
            Tab: () => true,           // สงวนให้ SmartType — ไม่สลับ element ด้วย Tab อีกต่อไป
            'Shift-Tab': () => true,
            'Mod-ArrowDown': () => { self.cycle(1); return true; },   // สลับรูปแบบถัดไป
            'Mod-ArrowUp': () => { self.cycle(-1); return true; },    // สลับรูปแบบก่อนหน้า
            Enter: () => self.enter(),
          }),
          keymap(baseKeymap),
          history(),
          ...(getChecker ? [spellPlugin(getChecker)] : []),
          focusLinePlugin(),
        ],
      }),
      handleKeyDown(view, ev) { return onKeyDown ? onKeyDown(ev) : false; },
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
        if (tr.docChanged && self.onChange) self.onChange();
        if (self.onElement) self.onElement(self.curElement());
      },
    });
  }
  refreshMentions() { refreshMentions(this.view); }

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

  enter() {
    const v = this.view;
    const cur = this.curElement();
    const nextEl = NEXT_ELEM[cur] || 'action';
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

  getText() { return this.view.state.doc.textBetween(0, this.view.state.doc.content.size, '\n'); }
  focus() { this.view.focus(); }
  destroy() { this.view.destroy(); }
}
