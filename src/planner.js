// src/planner.js
// Planner Board (กระดานวางแผน) — Fabric.js
// ไฟล์: <โปรเจกต์>/planner.json  { version:'2.0', nodes[], groups[], edges[] }
// v1 (alpha.25) อ่านได้ปกติ — ฟิลด์ใหม่ (synopsis/status/groups) เติมค่าเริ่มต้นให้เอง
//
// โมเดล: this._nodes/_groups/_edges คือ "ความจริง" ส่วน fabric object เป็นแค่ภาพ
// → วาดใหม่ได้เสมอ ทำให้ undo/redo/ตัวกรอง ไม่เพี้ยน

import { fabric } from 'fabric';
import { visualTagFor } from './visual-tags.js';

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

const ICONS = { scene: '📄', chapter: '📁', entity: '👤', note: '📝' };
const STATUSES = ['', 'โครงร่าง', 'กำลังเขียน', 'ตรวจแล้ว', 'เสร็จแล้ว', 'พัก'];
const STATUS_COLOR = {
  'โครงร่าง': '#6b6b6b', 'กำลังเขียน': '#d97757', 'ตรวจแล้ว': '#5f7a9f',
  'เสร็จแล้ว': '#5f8a6f', 'พัก': '#7a6f9f',
};
const CARD_W = 180, CARD_H = 110;
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export class PlannerBoard {
  constructor(pane, projectRoot, { onOpenFile = null, onDirty = null, onReveal = null } = {}) {
    this.pane = pane;
    this.root = projectRoot;
    this.onOpenFile = onOpenFile;
    this.onDirty = onDirty;
    this.onReveal = onReveal;
    this.title = '📋 Planner';
    this.dirty = false;
    this.zoomLevel = 1;
    this.fileName = 'planner.json';

    this._nodes = [];
    this._groups = [];
    this._edges = [];
    this._nodeVis = new Map();
    this._groupVis = new Map();

    this._history = [];
    this._histIndex = -1;
    this._maxHistory = 50;
    this._restoring = false;
    this._connectMode = null;
    this._filter = { text: '', type: '', status: '' };

    this.toolbar = this._createToolbar();
    this.filterBar = this._createFilterBar();
    this.properties = this._createPropertiesPanel();
    this.canvasWrap = el('div', 'planner-wrap');
    this.canvasEl = document.createElement('canvas');
    this.canvasWrap.appendChild(this.canvasEl);

    this.pane.appendChild(this.toolbar);
    this.pane.appendChild(this.filterBar);
    this.pane.appendChild(this.canvasWrap);
    this.pane.appendChild(this.properties);

    this.canvas = new fabric.Canvas(this.canvasEl, {
      width: Math.max(300, this.pane.clientWidth - 20),
      height: Math.max(300, this.pane.clientHeight - 150),
      backgroundColor: '#262624',
      selection: true,
      selectionColor: 'rgba(217,119,87,0.2)',
      selectionBorderColor: '#d97757',
      preserveObjectStacking: true,
    });

    this._onKeyDown = this._onKeyDown.bind(this);
    document.addEventListener('keydown', this._onKeyDown);

    this._bindEvents();
    this._ready = this._load().then(() => { this._snapshot(true); this._fit(); });
    this._autoSaveTimer = setInterval(() => { if (this.dirty) this.save(); }, 30000);

    this._resizeObserver = new ResizeObserver(() => this._fit());
    this._resizeObserver.observe(this.pane);

    this._bindDrop();          // ลากจาก Explorer มาวาง
    this._makePropsDraggable();
  }

  // ================= UI =================
  _createToolbar() {
    const bar = el('div', 'planner-toolbar');
    bar.innerHTML = `
      <button class="planner-btn" data-action="add-scene">📄 ฉาก</button>
      <button class="planner-btn" data-action="add-chapter">📁 บท</button>
      <button class="planner-btn" data-action="add-entity">👤 Wiki</button>
      <button class="planner-btn" data-action="add-note">📝 โน้ต</button>
      <span class="planner-sep"></span>
      <button class="planner-btn" data-action="connect">🔗 เชื่อมต่อ</button>
      <button class="planner-btn" data-action="group">🗂 จัดกลุ่ม</button>
      <button class="planner-btn" data-action="duplicate">⧉ ทำซ้ำ</button>
      <button class="planner-btn" data-action="reveal">📂 ในเอกสาร</button>
      <button class="planner-btn" data-action="delete">🗑 ลบ</button>
      <span class="planner-sep"></span>
      <button class="planner-btn" data-action="undo" title="Ctrl+Z">↶</button>
      <button class="planner-btn" data-action="redo" title="Ctrl+Shift+Z">↷</button>
      <span class="planner-sep"></span>
      <button class="planner-btn" data-action="auto-layout">📐 จัดเรียง</button>
      <button class="planner-btn" data-action="zoom-in">➕</button>
      <button class="planner-btn" data-action="zoom-out">➖</button>
      <button class="planner-btn" data-action="zoom-fit">⊡ พอดีจอ</button>
      <button class="planner-btn" data-action="export-png">🖼 PNG</button>
      <span style="flex:1"></span>
      <button class="planner-btn" data-action="sample">🧪 ตัวอย่าง</button>
      <button class="planner-btn k-ok" data-action="save">💾 บันทึก</button>
    `;
    return bar;
  }

  _createFilterBar() {
    const bar = el('div', 'planner-filter');
    bar.innerHTML = `
      <input class="planner-filter-input" id="pl-f-text" placeholder="🔍 กรอง — ชื่อ / สรุป / แท็ก">
      <select class="planner-filter-sel" id="pl-f-type">
        <option value="">ทุกประเภท</option>
        <option value="scene">📄 ฉาก</option>
        <option value="chapter">📁 บท</option>
        <option value="entity">👤 Wiki</option>
        <option value="note">📝 โน้ต</option>
      </select>
      <select class="planner-filter-sel" id="pl-f-status">
        <option value="">ทุกสถานะ</option>
        ${STATUSES.filter(Boolean).map((s) => `<option value="${s}">${s}</option>`).join('')}
      </select>
      <button class="planner-btn-small" id="pl-f-clear">ล้าง</button>
      <span class="planner-count" id="pl-count"></span>
    `;
    return bar;
  }

  _createPropertiesPanel() {
    const panel = el('div', 'planner-props');
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="planner-props-title">✏️ คุณสมบัติ</div>
      <div class="planner-prop-row"><label>ชื่อ</label>
        <input class="planner-prop-input" id="pl-title"></div>
      <div class="planner-prop-row"><label>ประเภท</label>
        <select class="planner-prop-input" id="pl-type">
          <option value="scene">📄 ฉาก</option>
          <option value="chapter">📁 บท</option>
          <option value="entity">👤 Wiki</option>
          <option value="note">📝 โน้ต</option>
        </select></div>
      <div class="planner-prop-row"><label>สถานะ</label>
        <select class="planner-prop-input" id="pl-status">
          ${STATUSES.map((s) => `<option value="${s}">${s || '— ไม่ระบุ —'}</option>`).join('')}
        </select></div>
      <div class="planner-prop-row"><label>สรุปย่อ</label>
        <textarea class="planner-prop-input" id="pl-synopsis" rows="3"
                  placeholder="เกิดอะไรขึ้นในฉากนี้"></textarea></div>
      <div class="planner-prop-row"><label>สี</label>
        <input class="planner-prop-input" id="pl-color" type="color"></div>
      <div class="planner-prop-row"><label>ไฟล์ (ลิงก์)</label>
        <input class="planner-prop-input" id="pl-file" placeholder="/path/to/file.md"></div>
      <div class="planner-prop-row"><label>แท็ก</label>
        <input class="planner-prop-input" id="pl-tags" placeholder="คั่นด้วย ,"></div>
      <div class="planner-prop-btns">
        <button class="planner-btn-small" id="pl-link">🔗 เชื่อมต่อ</button>
        <button class="planner-btn-small" id="pl-center">🎯 กึ่งกลาง</button>
      </div>
    `;
    return panel;
  }

  // ================= Load / Save =================
  async _getFilePath() {
    if (!this._filePath) this._filePath = await kapi.join(this.root, this.fileName);
    return this._filePath;
  }

  async _load() {
    try {
      const p = await this._getFilePath();
      if (await kapi.exists(p)) {
        this._loadData(await kapi.readJson(p));
        this._setStatus(`โหลด Planner จาก ${this.fileName} แล้ว`);
      } else {
        this._loadData({ nodes: [], groups: [], edges: [] });
        this._setStatus('Planner ว่าง — กด 📄 ฉาก เพื่อเริ่ม (หรือ 🧪 ตัวอย่าง)');
      }
    } catch (e) {
      console.warn('โหลด Planner ไม่ได้', e);
      this._loadData({ nodes: [], groups: [], edges: [] });
      this._setStatus('อ่าน planner.json ไม่ได้ — เริ่มกระดานเปล่า');
    }
    this.dirty = false;
  }

  _loadData(data) {
    data = data || {};
    this._nodes = (data.nodes || []).map((n) => ({
      id: n.id || uid('pl-'),
      type: n.type || 'scene',
      title: n.title || 'ไม่ระบุชื่อ',
      color: n.color || '#3f3e3a',
      x: Number(n.x) || 0, y: Number(n.y) || 0,
      width: Number(n.width) || CARD_W, height: Number(n.height) || CARD_H,
      file: n.file || null,
      tags: Array.isArray(n.tags) ? n.tags : [],
      synopsis: n.synopsis || '',
      status: n.status || '',
    }));
    this._groups = (data.groups || []).map((g) => ({
      id: g.id || uid('gp-'),
      name: g.name || 'กลุ่ม',
      color: g.color || '#d97757',
      x: Number(g.x) || 0, y: Number(g.y) || 0,
      width: Number(g.width) || 260, height: Number(g.height) || 200,
      childrenIds: Array.isArray(g.childrenIds) ? g.childrenIds : [],
    }));
    const ids = new Set(this._nodes.map((n) => n.id));
    this._edges = (data.edges || [])
      .filter((e) => ids.has(e.from) && ids.has(e.to))
      .map((e) => ({ id: e.id || uid('ed-'), from: e.from, to: e.to,
                     label: e.label || '', color: e.color || '#d97757' }));
    this._renderAll();
  }

  _exportData() {
    return {
      version: '2.0',
      nodes: this._nodes.map((n) => ({ ...n, x: Math.round(n.x), y: Math.round(n.y) })),
      groups: this._groups.map((g) => ({ ...g, x: Math.round(g.x), y: Math.round(g.y) })),
      edges: this._edges.map((e) => ({ ...e })),
      updated: new Date().toISOString(),
    };
  }

  async save() {
    try {
      const p = await this._getFilePath();
      await kapi.writeFile(p, JSON.stringify(this._exportData(), null, 2));
      this.dirty = false;
      this._setStatus(`💾 บันทึก Planner ลง ${this.fileName} แล้ว`);
      return true;
    } catch (e) {
      this._setStatus('❌ บันทึก Planner ไม่ได้: ' + e.message);
      return false;
    }
  }

  _markDirty() {
    this.dirty = true;
    if (this.onDirty) this.onDirty();
  }

  // ================= History =================
  _snapshot(initial = false) {
    if (this._restoring) return;
    const snap = JSON.stringify({ nodes: this._nodes, groups: this._groups, edges: this._edges });
    if (this._history[this._histIndex] === snap) return;
    this._history = this._history.slice(0, this._histIndex + 1);
    this._history.push(snap);
    if (this._history.length > this._maxHistory) this._history.shift();
    this._histIndex = this._history.length - 1;
    if (!initial) this._markDirty();
  }

  _restore(index) {
    if (index < 0 || index >= this._history.length) return false;
    this._restoring = true;
    this._histIndex = index;
    // แผงคุณสมบัติผูกกับ object ชุดเดิม ซึ่ง _loadData สร้างใหม่ทั้งหมด → ปิดกันแก้ค่าแล้วหาย
    this.properties.style.display = 'none';
    this.canvas.discardActiveObject();
    this._loadData(JSON.parse(this._history[index]));
    this._restoring = false;
    this._markDirty();
    return true;
  }

  undo() {
    if (this._histIndex <= 0) { this._setStatus('ย้อนกลับไม่ได้แล้ว'); return false; }
    const ok = this._restore(this._histIndex - 1);
    if (ok) this._setStatus('↶ ย้อนกลับ');
    return ok;
  }

  redo() {
    if (this._histIndex >= this._history.length - 1) { this._setStatus('ทำซ้ำไม่ได้แล้ว'); return false; }
    const ok = this._restore(this._histIndex + 1);
    if (ok) this._setStatus('↷ ทำซ้ำ');
    return ok;
  }

  // ================= Render =================
  _renderAll() {
    this.canvas.clear();
    this.canvas.backgroundColor = '#262624';
    this._nodeVis.clear();
    this._groupVis.clear();
    for (const g of this._groups) this._renderGroup(g);
    for (const n of this._nodes) this._renderNode(n);
    this._renderEdges();
    this._applyFilter();
    this.canvas.requestRenderAll();
  }

  _renderGroup(g) {
    const rect = new fabric.Rect({
      left: g.x, top: g.y, width: g.width, height: g.height, rx: 12, ry: 12,
      fill: 'rgba(255,255,255,0.03)', stroke: g.color, strokeWidth: 1.5,
      strokeDashArray: [8, 5], hasControls: false, borderColor: g.color,
    });
    rect.kind = 'group';
    rect.gid = g.id;
    const label = new fabric.Text('🗂 ' + g.name, {
      left: g.x + 10, top: g.y + 8, fontSize: 12, fill: g.color,
      fontFamily: '"Segoe UI", sans-serif', selectable: false, evented: false,
    });
    label.kind = 'grouplabel';
    label.gid = g.id;
    this.canvas.add(rect); this.canvas.add(label);
    this.canvas.sendToBack(label); this.canvas.sendToBack(rect);
    this._groupVis.set(g.id, { rect, label });
  }

  _cardChildren(n) {
    const W = n.width || CARD_W, H = n.height || CARD_H;
    const kids = [new fabric.Rect({
      left: 0, top: 0, width: W, height: H, rx: 8, ry: 8,
      fill: n.color || '#3f3e3a', stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1,
      originX: 'left', originY: 'top',
    })];

    if (n.status) {
      const c = STATUS_COLOR[n.status] || '#6b6b6b';
      const txt = new fabric.Text(n.status, {
        left: W - 10, top: 9, fontSize: 9, fill: '#fff',
        fontFamily: '"Segoe UI", sans-serif', originX: 'right', originY: 'top',
      });
      const pad = 6;
      kids.push(new fabric.Rect({
        left: W - 10 - (txt.width + pad * 2), top: 6, width: txt.width + pad * 2, height: 16,
        rx: 8, ry: 8, fill: c, originX: 'left', originY: 'top',
      }), txt);
    }

    kids.push(new fabric.Textbox(`${ICONS[n.type] || '📄'} ${n.title || 'ไม่ระบุชื่อ'}`, {
      left: 10, top: 8, width: n.status ? W - 78 : W - 20, fontSize: 12.5, fill: '#faf9f5',
      fontFamily: '"Segoe UI", sans-serif', originX: 'left', originY: 'top',
      editable: false, splitByGrapheme: true,
    }));

    if (n.synopsis) {
      const s = n.synopsis.length > 90 ? n.synopsis.slice(0, 90) + '…' : n.synopsis;
      kids.push(new fabric.Textbox(s, {
        left: 10, top: 44, width: W - 20, fontSize: 9.5, fill: 'rgba(255,255,255,0.55)',
        fontFamily: '"Segoe UI", sans-serif', originX: 'left', originY: 'top',
        editable: false, splitByGrapheme: true, lineHeight: 1.15,
      }));
    }

    // แท็ก: ที่ตั้งสี/ไอคอนไว้ (Visual Tags ข้อ 84) ได้จุดสี+ไอคอน · ที่เหลือเป็น #ข้อความจาง
    if (n.tags && n.tags.length) {
      let tx = 10;
      for (const t of n.tags.slice(0, 3)) {
        const vt = visualTagFor(t);
        const label = vt ? (vt.icon || '●') + ' ' + t : '#' + t;
        const txt = new fabric.Text(label, {
          left: tx, top: H - 30, fontSize: 9,
          fill: vt ? vt.color : 'rgba(255,255,255,0.4)',
          fontFamily: '"Segoe UI", sans-serif', originX: 'left', originY: 'top',
        });
        kids.push(txt);
        tx += (txt.width || 30) + 6;
        if (tx > W - 20) break;                 // ล้นการ์ดแล้ว — ตัดที่เหลือทิ้ง
      }
    }

    if (n.file) {
      const short = n.file.split(/[\\/]/).pop() || n.file;
      kids.push(new fabric.Text('📎 ' + short, {
        left: 10, top: H - 16, fontSize: 9, fill: 'rgba(255,255,255,0.35)',
        fontFamily: '"Segoe UI", sans-serif', originX: 'left', originY: 'top',
      }));
    }
    return kids;
  }

  _renderNode(n) {
    const group = new fabric.Group(this._cardChildren(n), {
      left: n.x, top: n.y, hasControls: false, hasBorders: true,
      borderColor: '#d97757', lockScalingX: true, lockScalingY: true,
    });
    group.kind = 'node';
    group.nid = n.id;
    group.on('mousedblclick', () => {
      if (n.file && this.onOpenFile) this.onOpenFile(n.file);
      else this._showProperties(n);
    });
    this.canvas.add(group);
    this._nodeVis.set(n.id, group);
    return group;
  }

  _rebuildNode(id) {
    const n = this._nodes.find((x) => x.id === id);
    const old = this._nodeVis.get(id);
    const wasActive = this.canvas.getActiveObject() === old;
    if (old) this.canvas.remove(old);
    if (!n) { this._nodeVis.delete(id); this._renderEdges(); return null; }
    const vis = this._renderNode(n);
    this._renderEdges();
    this._applyFilter();
    if (wasActive) this.canvas.setActiveObject(vis);
    this.canvas.requestRenderAll();
    return vis;
  }

  // จุดบนขอบการ์ดที่หันไปหาอีกใบ (เส้นจะได้ไม่ทะลุกลางการ์ด)
  _borderPoint(vis, towards) {
    const c = vis.getCenterPoint();
    const w = (vis.width || CARD_W) / 2, h = (vis.height || CARD_H) / 2;
    const dx = towards.x - c.x, dy = towards.y - c.y;
    if (!dx && !dy) return c;
    const sx = dx ? w / Math.abs(dx) : Infinity;
    const sy = dy ? h / Math.abs(dy) : Infinity;
    const t = Math.min(sx, sy);
    return { x: c.x + dx * t, y: c.y + dy * t };
  }

  _renderEdges() {
    for (const o of this.canvas.getObjects().filter((x) => x.kind === 'edge')) this.canvas.remove(o);
    for (const e of this._edges) {
      const a = this._nodeVis.get(e.from), b = this._nodeVis.get(e.to);
      if (!a || !b) continue;
      const ac = a.getCenterPoint(), bc = b.getCenterPoint();
      const p1 = this._borderPoint(a, bc), p2 = this._borderPoint(b, ac);
      const col = e.color || '#d97757';
      const dim = (a.opacity < 1 || b.opacity < 1) ? 0.12 : 1;
      const sel = this._selectedEdgeId === e.id;

      const line = new fabric.Line([p1.x, p1.y, p2.x, p2.y], {
        stroke: col, strokeWidth: sel ? 3.5 : 2, strokeDashArray: sel ? null : [6, 4],
        opacity: dim, selectable: false, evented: true, hoverCursor: 'pointer',
        perPixelTargetFind: true, padding: 8, originX: 'center', originY: 'center',
      });
      line.kind = 'edge'; line.eid = e.id;

      const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const arrow = new fabric.Triangle({
        left: p2.x, top: p2.y, width: 11, height: 11, fill: col, opacity: dim,
        angle: (ang * 180 / Math.PI) + 90, originX: 'center', originY: 'center',
        selectable: false, evented: false,
      });
      arrow.kind = 'edge'; arrow.eid = e.id;
      this.canvas.add(line); this.canvas.add(arrow);
      this.canvas.sendToBack(arrow); this.canvas.sendToBack(line);

      if (e.label) {
        const lb = new fabric.Text(e.label, {
          left: (p1.x + p2.x) / 2, top: (p1.y + p2.y) / 2 - 10, fontSize: 10, opacity: dim,
          fill: sel ? '#faf9f5' : 'rgba(255,255,255,0.55)', fontFamily: '"Segoe UI", sans-serif',
          originX: 'center', originY: 'bottom', selectable: false, evented: false,
        });
        lb.kind = 'edge'; lb.eid = e.id;
        this.canvas.add(lb); this.canvas.sendToBack(lb);
      }
    }
    for (const [, v] of this._groupVis) { this.canvas.sendToBack(v.label); this.canvas.sendToBack(v.rect); }
  }

  // ================= Nodes / Edges / Groups =================
  _createNode(type, title, color) {
    const n = {
      id: uid('pl-'), type, title: title || 'ใหม่', color: color || '#3f3e3a',
      x: this.canvas.getWidth() / 2 - CARD_W / 2 + (Math.random() - 0.5) * 120,
      y: this.canvas.getHeight() / 2 - CARD_H / 2 + (Math.random() - 0.5) * 120,
      width: CARD_W, height: CARD_H, file: null, tags: [], synopsis: '', status: '',
    };
    this._nodes.push(n);
    const vis = this._renderNode(n);
    this.canvas.setActiveObject(vis);
    this._showProperties(n);
    this._snapshot();
    this.canvas.requestRenderAll();
    return n;
  }

  _createEdge(fromId, toId, label) {
    if (fromId === toId) return null;
    if (this._edges.some((e) => e.from === fromId && e.to === toId)) return null;
    const e = { id: uid('ed-'), from: fromId, to: toId, label: label || '', color: '#d97757' };
    this._edges.push(e);
    this._renderEdges();
    this._snapshot();
    this.canvas.requestRenderAll();
    return e;
  }

  _deleteSelected() {
    const act = this.canvas.getActiveObject();
    if (!act) return false;
    const targets = act.type === 'activeSelection' ? act.getObjects() : [act];
    let changed = false;
    for (const t of targets) {
      if (t.kind === 'node') {
        this._nodes = this._nodes.filter((n) => n.id !== t.nid);
        this._edges = this._edges.filter((e) => e.from !== t.nid && e.to !== t.nid);
        for (const g of this._groups) g.childrenIds = g.childrenIds.filter((c) => c !== t.nid);
        changed = true;
      } else if (t.kind === 'group') {
        this._groups = this._groups.filter((g) => g.id !== t.gid);
        changed = true;
      }
    }
    if (!changed) return false;
    this.canvas.discardActiveObject();
    this._renderAll();
    this._snapshot();
    this.properties.style.display = 'none';
    return true;
  }

  // เลือกการ์ดหลายใบพร้อมกัน (เทียบเท่าลากคลุม) — ใช้ต่อกับ 🗂 จัดกลุ่ม
  _selectNodes(ids) {
    const objs = ids.map((i) => this._nodeVis.get(i)).filter(Boolean);
    if (!objs.length) return null;
    this.canvas.discardActiveObject();
    const sel = objs.length === 1
      ? objs[0]
      : new fabric.ActiveSelection(objs, { canvas: this.canvas });
    this.canvas.setActiveObject(sel);
    this.canvas.requestRenderAll();
    return sel;
  }

  _createGroupFromSelection(name) {
    const act = this.canvas.getActiveObject();
    let members = [];
    if (act && act.type === 'activeSelection') members = act.getObjects().filter((o) => o.kind === 'node');
    else if (act && act.kind === 'node') members = [act];
    if (!members.length) { this._setStatus('เลือกการ์ดก่อน (ลากคลุม / Shift+คลิก) แล้วกด 🗂 จัดกลุ่ม'); return null; }

    const ids = members.map((m) => m.nid);
    const nodes = this._nodes.filter((n) => ids.includes(n.id));
    const pad = 22;
    const g = {
      id: uid('gp-'), name: name || 'กลุ่มใหม่', color: '#d97757',
      x: Math.min(...nodes.map((n) => n.x)) - pad,
      y: Math.min(...nodes.map((n) => n.y)) - pad - 12,
      width: 0, height: 0, childrenIds: ids,
    };
    g.width = Math.max(...nodes.map((n) => n.x + n.width)) + pad - g.x;
    g.height = Math.max(...nodes.map((n) => n.y + n.height)) + pad - g.y;
    this._groups.push(g);
    this.canvas.discardActiveObject();
    this._renderAll();
    this._snapshot();
    this._setStatus(`จัดกลุ่ม "${g.name}" (${ids.length} การ์ด)`);
    return g;
  }

  _updateGroupBounds(g) {
    const nodes = this._nodes.filter((n) => g.childrenIds.includes(n.id));
    if (!nodes.length) return;
    const pad = 22;
    g.x = Math.min(...nodes.map((n) => n.x)) - pad;
    g.y = Math.min(...nodes.map((n) => n.y)) - pad - 12;
    g.width = Math.max(...nodes.map((n) => n.x + n.width)) + pad - g.x;
    g.height = Math.max(...nodes.map((n) => n.y + n.height)) + pad - g.y;
  }

  // ================= Filter =================
  _applyFilter() {
    const f = this._filter;
    const q = (f.text || '').trim().toLowerCase();
    let shown = 0;
    for (const n of this._nodes) {
      const vis = this._nodeVis.get(n.id);
      if (!vis) continue;
      const hay = `${n.title} ${n.synopsis} ${(n.tags || []).join(' ')}`.toLowerCase();
      const ok = (!q || hay.includes(q)) && (!f.type || n.type === f.type) && (!f.status || n.status === f.status);
      vis.set({ opacity: ok ? 1 : 0.12, evented: ok, selectable: ok });
      if (ok) shown++;
    }
    const cnt = this.filterBar.querySelector('#pl-count');
    if (cnt) {
      cnt.textContent = (q || f.type || f.status)
        ? `แสดง ${shown}/${this._nodes.length} การ์ด`
        : `${this._nodes.length} การ์ด · ${this._edges.length} เส้น · ${this._groups.length} กลุ่ม`;
    }
    this._syncEdgeOpacity();
    this.canvas.requestRenderAll();
    return shown;
  }

  _syncEdgeOpacity() {
    for (const o of this.canvas.getObjects().filter((x) => x.kind === 'edge')) {
      const e = this._edges.find((x) => x.id === o.eid);
      if (!e) continue;
      const a = this._nodeVis.get(e.from), b = this._nodeVis.get(e.to);
      o.set('opacity', (a && b && a.opacity === 1 && b.opacity === 1) ? 1 : 0.12);
    }
  }

  // ================= Events =================
  _bindEvents() {
    this.toolbar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (b) this._handleToolbar(b.dataset.action);
    });

    const fb = this.filterBar;
    fb.querySelector('#pl-f-text').oninput = (e) => { this._filter.text = e.target.value; this._applyFilter(); };
    fb.querySelector('#pl-f-type').onchange = (e) => { this._filter.type = e.target.value; this._applyFilter(); };
    fb.querySelector('#pl-f-status').onchange = (e) => { this._filter.status = e.target.value; this._applyFilter(); };
    fb.querySelector('#pl-f-clear').onclick = () => {
      this._filter = { text: '', type: '', status: '' };
      fb.querySelector('#pl-f-text').value = '';
      fb.querySelector('#pl-f-type').value = '';
      fb.querySelector('#pl-f-status').value = '';
      this._applyFilter();
    };

    this.canvas.on('mouse:down', (opt) => {
      if (!this._connectMode) return;
      const t = opt.target;
      if (!t || t.kind !== 'node') return;
      if (this._connectMode.step === 'from') {
        this._connectMode.fromId = t.nid;
        this._connectMode.step = 'to';
        t.set('borderColor', '#f0a68a');
        this._setStatus('คลิกการ์ดปลายทาง');
        this.canvas.requestRenderAll();
      } else {
        if (t.nid === this._connectMode.fromId) { this._setStatus('เลือกคนละการ์ด'); return; }
        const made = this._createEdge(this._connectMode.fromId, t.nid, '');
        this._endConnecting();
        this._setStatus(made ? 'เชื่อมต่อแล้ว' : 'มีเส้นนี้อยู่แล้ว');
      }
    });

    // ลากกลุ่ม → การ์ดในกลุ่มเลื่อนตาม
    this.canvas.on('object:moving', (opt) => {
      const t = opt.target;
      if (t && t.kind === 'group') {
        const g = this._groups.find((x) => x.id === t.gid);
        if (g) {
          const dx = t.left - g.x, dy = t.top - g.y;
          for (const id of g.childrenIds) {
            const n = this._nodes.find((x) => x.id === id);
            const vis = this._nodeVis.get(id);
            if (!n || !vis) continue;
            n.x += dx; n.y += dy;
            vis.set({ left: n.x, top: n.y }); vis.setCoords();
          }
          g.x = t.left; g.y = t.top;
          const gv = this._groupVis.get(g.id);
          if (gv) { gv.label.set({ left: g.x + 10, top: g.y + 8 }); gv.label.setCoords(); }
        }
      }
      this._renderEdges();
    });

    this.canvas.on('object:modified', (opt) => {
      const t = opt.target;
      const list = t && t.type === 'activeSelection' ? t.getObjects() : [t];
      for (const o of list) {
        if (o && o.kind === 'node') {
          const n = this._nodes.find((x) => x.id === o.nid);
          if (!n) continue;
          if (t.type === 'activeSelection') {
            n.x = t.left + o.left + t.width / 2;
            n.y = t.top + o.top + t.height / 2;
          } else { n.x = o.left; n.y = o.top; }
        }
      }
      for (const g of this._groups) if (g.childrenIds.length) this._updateGroupBounds(g);
      for (const [gid, v] of this._groupVis) {
        const g = this._groups.find((x) => x.id === gid);
        if (g) {
          v.rect.set({ left: g.x, top: g.y, width: g.width, height: g.height }); v.rect.setCoords();
          v.label.set({ left: g.x + 10, top: g.y + 8 }); v.label.setCoords();
        }
      }
      this._renderEdges();
      this._snapshot();
    });

    this._bindMiroConnect();

    this.canvas.on('selection:created', (o) => this._onSelect(o));
    this.canvas.on('selection:updated', (o) => this._onSelect(o));
    this.canvas.on('selection:cleared', () => { this.properties.style.display = 'none'; });
  }

  _onSelect(opt) {
    const sel = (opt.selected && opt.selected[0]) || this.canvas.getActiveObject();
    if (sel && sel.kind === 'node') {
      const n = this._nodes.find((x) => x.id === sel.nid);
      if (n) { this._showProperties(n); return; }
    }
    this.properties.style.display = 'none';
  }

  _onKeyDown(e) {
    if (!this.pane.classList.contains('on')) return;
    const tag = (e.target && e.target.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (e.key === 'Escape') { this._cancelLink(); this._endConnecting(); this._selectEdge(null); return; }
    if (typing) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.redo(); else this.undo();
    } else if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault(); this.redo();
    } else if (e.key === 'Delete') {
      e.preventDefault();
      if (this._selectedEdgeId) this._deleteEdge(this._selectedEdgeId);
      else this._deleteSelected();
    }
  }

  _handleToolbar(a) {
    switch (a) {
      case 'add-scene': this._createNode('scene', 'ฉากใหม่', '#3f3e3a'); break;
      case 'add-chapter': this._createNode('chapter', 'บทใหม่', '#5f7a9f'); break;
      case 'add-entity': this._createNode('entity', 'ตัวละครใหม่', '#7a6f9f'); break;
      case 'add-note': this._createNode('note', 'โน้ตใหม่', '#5f8a6f'); break;
      case 'connect': this._startConnecting(); break;
      case 'group': this._createGroupFromSelection(); break;
      case 'duplicate': this._duplicateSelected(); break;
      case 'reveal': this._revealSelected(); break;
      case 'delete': this._deleteSelected(); break;
      case 'undo': this.undo(); break;
      case 'redo': this.redo(); break;
      case 'auto-layout': this._autoLayout(); break;
      case 'zoom-in': this._zoom(1.2); break;
      case 'zoom-out': this._zoom(0.8); break;
      case 'zoom-fit': this._zoomFit(); break;
      case 'export-png': this.exportPNG(); break;
      case 'sample': this.loadSample(); break;
      case 'save': this.save(); break;
    }
  }

  _startConnecting() {
    if (this._connectMode) { this._endConnecting(); return; }
    this._connectMode = { step: 'from', fromId: null };
    this.canvas.selection = false;
    this._setStatus('คลิกการ์ดต้นทาง (Esc = ยกเลิก)');
  }

  _endConnecting() {
    if (this._connectMode && this._connectMode.fromId) {
      const v = this._nodeVis.get(this._connectMode.fromId);
      if (v) v.set('borderColor', '#d97757');
    }
    this._connectMode = null;
    this.canvas.selection = true;
    this.canvas.requestRenderAll();
  }

  // ================= Properties =================
  _showProperties(n) {
    const p = this.properties;
    p.style.display = 'block';
    this._selectedEdgeId = null;
    this._restorePropsForNode();
    const q = (id) => p.querySelector(id);
    q('#pl-title').value = n.title || '';
    q('#pl-type').value = n.type || 'scene';
    q('#pl-status').value = n.status || '';
    q('#pl-synopsis').value = n.synopsis || '';
    q('#pl-color').value = n.color || '#3f3e3a';
    q('#pl-file').value = n.file || '';
    q('#pl-tags').value = (n.tags || []).join(', ');

    const apply = () => {
      n.title = q('#pl-title').value;
      n.type = q('#pl-type').value;
      n.status = q('#pl-status').value;
      n.synopsis = q('#pl-synopsis').value;
      n.color = q('#pl-color').value;
      n.file = q('#pl-file').value.trim() || null;
      n.tags = q('#pl-tags').value.split(',').map((s) => s.trim()).filter(Boolean);
      this._rebuildNode(n.id);
      this._snapshot();
    };
    for (const id of ['#pl-title', '#pl-type', '#pl-status', '#pl-synopsis', '#pl-color', '#pl-file', '#pl-tags'])
      q(id).onchange = apply;

    q('#pl-link').onclick = () => {
      this._connectMode = { step: 'to', fromId: n.id };
      this.canvas.selection = false;
      const v = this._nodeVis.get(n.id);
      if (v) v.set('borderColor', '#f0a68a');
      this.canvas.requestRenderAll();
      this._setStatus('คลิกการ์ดปลายทาง');
    };
    q('#pl-center').onclick = () => {
      n.x = this.canvas.getWidth() / 2 - n.width / 2;
      n.y = this.canvas.getHeight() / 2 - n.height / 2;
      const v = this._nodeVis.get(n.id);
      if (v) { v.set({ left: n.x, top: n.y }); v.setCoords(); }
      this._renderEdges();
      this._snapshot();
      this.canvas.requestRenderAll();
    };
  }

  // ================= Layout / Zoom =================
  _autoLayout() {
    const ns = this._nodes;
    if (ns.length < 2) return;
    const W = this.canvas.getWidth(), H = this.canvas.getHeight();
    const k = Math.min(W, H) / Math.sqrt(ns.length) * 0.8;
    for (let it = 0; it < 120; it++) {
      const F = {};
      for (const n of ns) F[n.id] = { x: 0, y: 0 };
      for (const e of this._edges) {
        const a = ns.find((n) => n.id === e.from), b = ns.find((n) => n.id === e.to);
        if (!a || !b) continue;
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const f = (d / k) * 0.1;
        F[a.id].x -= (dx / d) * f; F[a.id].y -= (dy / d) * f;
        F[b.id].x += (dx / d) * f; F[b.id].y += (dy / d) * f;
      }
      for (let i = 0; i < ns.length; i++)
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i], b = ns[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.max(1, Math.hypot(dx, dy));
          const f = ((k * k) / (d * d)) * 0.05;
          F[a.id].x += (dx / d) * f; F[a.id].y += (dy / d) * f;
          F[b.id].x -= (dx / d) * f; F[b.id].y -= (dy / d) * f;
        }
      for (const n of ns) {
        n.x = Math.max(10, Math.min(W - n.width - 10, n.x + F[n.id].x));
        n.y = Math.max(10, Math.min(H - n.height - 10, n.y + F[n.id].y));
      }
    }
    for (const g of this._groups) this._updateGroupBounds(g);
    this._renderAll();
    this._snapshot();
    this._setStatus('จัดเรียงอัตโนมัติแล้ว');
  }

  _zoom(f) {
    this.zoomLevel = Math.max(0.2, Math.min(4, this.zoomLevel * f));
    const c = this.canvas.getCenter();
    this.canvas.zoomToPoint({ x: c.left, y: c.top }, this.zoomLevel);
    this.canvas.requestRenderAll();
  }

  _zoomFit() {
    if (!this._nodes.length) {
      this.zoomLevel = 1;
      this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      this.canvas.requestRenderAll();
      return;
    }
    const minX = Math.min(...this._nodes.map((n) => n.x));
    const minY = Math.min(...this._nodes.map((n) => n.y));
    const maxX = Math.max(...this._nodes.map((n) => n.x + n.width));
    const maxY = Math.max(...this._nodes.map((n) => n.y + n.height));
    const bw = maxX - minX, bh = maxY - minY;
    const W = this.canvas.getWidth(), H = this.canvas.getHeight();
    const z = Math.min(W / (bw + 60), H / (bh + 60), 1.5);
    this.zoomLevel = z;
    this.canvas.setViewportTransform([z, 0, 0, z, (W - bw * z) / 2 - minX * z, (H - bh * z) / 2 - minY * z]);
    this.canvas.requestRenderAll();
  }

  // ================= Export / ตัวอย่าง =================
  async exportPNG() {
    try {
      const vt = this.canvas.viewportTransform.slice();
      this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      const url = this.canvas.toDataURL({ format: 'png', multiplier: 2 });
      this.canvas.setViewportTransform(vt);
      this.canvas.requestRenderAll();
      const name = await kapi.writeImageData(this.root, 'planner.png', url.split(',')[1]);
      this._setStatus('🖼 บันทึกรูปกระดานแล้ว: ' + (typeof name === 'string' ? name : 'planner.png'));
      return true;
    } catch (e) {
      this._setStatus('ส่งออก PNG ไม่ได้: ' + e.message);
      return false;
    }
  }

  loadSample() {
    this._loadData({
      nodes: [
        { id: uid('pl-'), type: 'scene', title: 'ฉากเปิดเรื่อง', color: '#3f3e3a', x: 80, y: 90,
          width: CARD_W, height: CARD_H, tags: ['เปิดเรื่อง'],
          synopsis: 'ตัวเอกตื่นมาเจอเรื่องผิดปกติ', status: 'กำลังเขียน' },
        { id: uid('pl-'), type: 'scene', title: 'ฉากปะทะ', color: '#5f7a9f', x: 380, y: 90,
          width: CARD_W, height: CARD_H, tags: ['จุดหักเห'],
          synopsis: 'ความจริงถูกเปิดเผยกลางวงสนทนา', status: 'โครงร่าง' },
        { id: uid('pl-'), type: 'entity', title: 'ตัวละครหลัก', color: '#7a6f9f', x: 230, y: 290,
          width: CARD_W, height: CARD_H, tags: ['ตัวละครหลัก'], synopsis: '', status: '' },
      ],
      groups: [], edges: [],
    });
    const [a, b, c] = this._nodes;
    this._edges = [
      { id: uid('ed-'), from: a.id, to: b.id, label: 'ต่อเนื่อง', color: '#d97757' },
      { id: uid('ed-'), from: c.id, to: a.id, label: 'ปรากฏใน', color: '#d97757' },
    ];
    this._renderEdges();
    this._applyFilter();
    this._snapshot();
    this._setStatus('ใส่ตัวอย่างแล้ว — กด 💾 ถ้าจะเก็บไว้');
  }


  // ================= เชื่อมต่อแบบ Miro (ลากจากขอบการ์ด) =================
  _showAnchors(vis) {
    this._hideAnchors();
    if (!vis || vis.opacity < 1) return;
    const c = vis.getCenterPoint();
    const w = (vis.width || CARD_W) / 2, h = (vis.height || CARD_H) / 2;
    const pts = [{ x: c.x, y: c.y - h }, { x: c.x + w, y: c.y }, { x: c.x, y: c.y + h }, { x: c.x - w, y: c.y }];
    this._anchors = pts.map((p) => {
      const dot = new fabric.Circle({
        left: p.x, top: p.y, radius: 5, fill: '#d97757', stroke: '#faf9f5', strokeWidth: 1.5,
        originX: 'center', originY: 'center', selectable: false, evented: true,
        hoverCursor: 'crosshair',
      });
      dot.kind = 'anchor'; dot.nid = vis.nid;
      this.canvas.add(dot);
      this.canvas.bringToFront(dot);
      return dot;
    });
    this.canvas.requestRenderAll();
  }

  _hideAnchors() {
    for (const a of (this._anchors || [])) this.canvas.remove(a);
    this._anchors = [];
  }

  _bindMiroConnect() {
    // โชว์จุดเชื่อมเมื่อเมาส์อยู่บนการ์ด
    this.canvas.on('mouse:over', (opt) => {
      const t = opt.target;
      if (this._link) return;
      if (t && t.kind === 'node') this._showAnchors(t);
      else if (!t || (t.kind !== 'anchor')) this._hideAnchors();
    });

    // เริ่มลากเส้นจากจุดเชื่อม
    this.canvas.on('mouse:down', (opt) => {
      const t = opt.target;
      if (t && t.kind === 'anchor') {
        const p = this.canvas.getPointer(opt.e);
        this._link = { fromId: t.nid };
        this.canvas.selection = false;
        this._linkPreview = new fabric.Line([p.x, p.y, p.x, p.y], {
          stroke: '#d97757', strokeWidth: 2, strokeDashArray: [4, 3],
          selectable: false, evented: false, originX: 'center', originY: 'center',
        });
        this._linkPreview.kind = 'preview';
        this.canvas.add(this._linkPreview);
        this.canvas.bringToFront(this._linkPreview);
        this._setStatus('ลากไปปล่อยบนการ์ดปลายทาง (Esc = ยกเลิก)');
        return;
      }
      // คลิกเส้น = เลือกเส้น (แก้ป้าย/ลบได้)
      if (t && t.kind === 'edge') { this._selectEdge(t.eid); return; }
      if (!t) { this._selectEdge(null); }
    });

    this.canvas.on('mouse:move', (opt) => {
      if (!this._link || !this._linkPreview) return;
      const p = this.canvas.getPointer(opt.e);
      this._linkPreview.set({ x2: p.x, y2: p.y });
      this.canvas.requestRenderAll();
    });

    this.canvas.on('mouse:up', (opt) => {
      if (!this._link) return;
      const from = this._link.fromId;
      const t = opt.target;
      let toId = null;
      if (t && t.kind === 'node') toId = t.nid;
      else if (t && t.kind === 'anchor') toId = t.nid;
      else {
        const p = this.canvas.getPointer(opt.e);
        for (const [id, vis] of this._nodeVis) {
          const c = vis.getCenterPoint();
          if (Math.abs(p.x - c.x) <= (vis.width || CARD_W) / 2 &&
              Math.abs(p.y - c.y) <= (vis.height || CARD_H) / 2) { toId = id; break; }
        }
      }
      this._cancelLink();
      if (!toId || toId === from) { this._setStatus('ยกเลิกการเชื่อม'); return; }
      const made = this._createEdge(from, toId, '');
      this._setStatus(made ? 'เชื่อมต่อแล้ว' : 'มีเส้นนี้อยู่แล้ว');
    });
  }

  _cancelLink() {
    if (this._linkPreview) this.canvas.remove(this._linkPreview);
    this._linkPreview = null;
    this._link = null;
    this.canvas.selection = true;
    this._hideAnchors();
    this.canvas.requestRenderAll();
  }

  _selectEdge(eid) {
    this._selectedEdgeId = eid || null;
    this._renderEdges();
    if (eid) {
      const e = this._edges.find((x) => x.id === eid);
      if (e) { this._showEdgeProperties(e); this.canvas.requestRenderAll(); return; }
    }
    this.properties.style.display = 'none';
    this.canvas.requestRenderAll();
  }

  _deleteEdge(eid) {
    this._edges = this._edges.filter((e) => e.id !== eid);
    this._selectedEdgeId = null;
    this._renderEdges();
    this._snapshot();
    this.properties.style.display = 'none';
    this._setStatus('ลบเส้นเชื่อมแล้ว');
    this.canvas.requestRenderAll();
    return true;
  }

  _showEdgeProperties(e) {
    const p = this.properties;
    p.style.display = 'block';
    p.querySelector('.planner-props-title').textContent = '🔗 เส้นเชื่อม';
    for (const row of p.querySelectorAll('.planner-prop-row')) row.style.display = 'none';
    let row = p.querySelector('#pl-edge-row');
    if (!row) {
      row = el('div', 'planner-prop-row');
      row.id = 'pl-edge-row';
      row.innerHTML = `<label>ป้ายกำกับ</label><input class="planner-prop-input" id="pl-edge-label">
                       <label style="margin-top:6px">สี</label><input class="planner-prop-input" id="pl-edge-color" type="color">`;
      p.querySelector('.planner-prop-btns').before(row);
    }
    row.style.display = 'flex';
    const lb = p.querySelector('#pl-edge-label'), cl = p.querySelector('#pl-edge-color');
    lb.value = e.label || ''; cl.value = e.color || '#d97757';
    const apply = () => {
      e.label = lb.value; e.color = cl.value;
      this._renderEdges(); this._snapshot(); this.canvas.requestRenderAll();
    };
    lb.onchange = apply; cl.onchange = apply;
    p.querySelector('#pl-link').textContent = '🗑 ลบเส้นนี้';
    p.querySelector('#pl-link').onclick = () => this._deleteEdge(e.id);
    p.querySelector('#pl-center').style.display = 'none';
  }

  _restorePropsForNode() {
    const p = this.properties;
    p.querySelector('.planner-props-title').textContent = '✏️ คุณสมบัติ';
    const edgeRow = p.querySelector('#pl-edge-row');
    if (edgeRow) edgeRow.style.display = 'none';
    for (const row of p.querySelectorAll('.planner-prop-row')) {
      if (row.id !== 'pl-edge-row') row.style.display = 'flex';
    }
    p.querySelector('#pl-link').textContent = '🔗 เชื่อมต่อ';
    p.querySelector('#pl-center').style.display = '';
  }

  // ================= ทำซ้ำ / แสดงในเอกสาร =================
  _duplicateSelected() {
    const act = this.canvas.getActiveObject();
    const list = act && act.type === 'activeSelection' ? act.getObjects() : (act ? [act] : []);
    const src = list.filter((o) => o.kind === 'node').map((o) => this._nodes.find((n) => n.id === o.nid)).filter(Boolean);
    if (!src.length) { this._setStatus('เลือกการ์ดที่จะทำซ้ำก่อน'); return null; }
    const made = [];
    for (const n of src) {
      const copy = { ...n, id: uid('pl-'), tags: [...(n.tags || [])], x: n.x + 28, y: n.y + 28,
                     title: n.title + ' (สำเนา)' };
      this._nodes.push(copy);
      this._renderNode(copy);
      made.push(copy);
    }
    this._renderEdges();
    this._applyFilter();
    this._snapshot();
    this._selectNodes(made.map((m) => m.id));
    this._setStatus(`ทำซ้ำ ${made.length} การ์ดแล้ว`);
    return made;
  }

  _revealSelected() {
    const act = this.canvas.getActiveObject();
    const n = act && act.kind === 'node' ? this._nodes.find((x) => x.id === act.nid) : null;
    if (!n) { this._setStatus('เลือกการ์ดก่อน'); return false; }
    if (!n.file) { this._setStatus('การ์ดนี้ยังไม่ได้ผูกไฟล์ — ใส่ช่อง "ไฟล์ (ลิงก์)" ก่อน'); return false; }
    if (this.onReveal) { this.onReveal(n.file); return true; }
    return false;
  }

  // ================= ลากจาก Explorer มาวาง =================
  _bindDrop() {
    const wrap = this.canvasWrap;
    const TYPES = ['text/k2-scene', 'text/k2-entity', 'text/k2-memo', 'text/k2-chapter'];
    wrap.addEventListener('dragover', (e) => {
      if ([...e.dataTransfer.types].some((t) => TYPES.includes(t))) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        wrap.classList.add('planner-drop-on');
      }
    });
    wrap.addEventListener('dragleave', () => wrap.classList.remove('planner-drop-on'));
    wrap.addEventListener('drop', (e) => {
      wrap.classList.remove('planner-drop-on');
      const kind = TYPES.find((t) => [...e.dataTransfer.types].includes(t));
      if (!kind) return;
      e.preventDefault();
      let d; try { d = JSON.parse(e.dataTransfer.getData(kind)); } catch { return; }
      if (!d) return;
      this.dropPayload(kind, d, e);
    });
  }

  // แปลง payload จาก Explorer → การ์ดใหม่ (แยกเมธอดไว้ให้เทสเรียกได้)
  dropPayload(kind, d, ev) {
    const type = kind === 'text/k2-entity' ? 'entity'
               : kind === 'text/k2-memo' ? 'note'
               : kind === 'text/k2-chapter' ? 'chapter' : 'scene';
    const colors = { scene: '#3f3e3a', chapter: '#5f7a9f', entity: '#7a6f9f', note: '#5f8a6f' };
    let x = 60, y = 60;
    if (ev) {
      const r = this.canvasWrap.getBoundingClientRect();
      const z = this.canvas.getZoom() || 1;
      const vt = this.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      x = ((ev.clientX - r.left) - vt[4]) / z - CARD_W / 2;
      y = ((ev.clientY - r.top) - vt[5]) / z - CARD_H / 2;
    }
    const title = d.title || (d.file ? (d.file.split(/[\\/]/).pop() || '').replace(/\.md$/i, '') : 'ใหม่');
    const dup = d.file && this._nodes.find((n) => n.file === d.file);
    if (dup) {
      this._selectNodes([dup.id]);
      this._setStatus(`"${title}" อยู่บนกระดานแล้ว`);
      return dup;
    }
    const n = {
      id: uid('pl-'), type, title, color: colors[type] || '#3f3e3a',
      x, y, width: CARD_W, height: CARD_H,
      file: d.file || null, tags: [], synopsis: '', status: '',
    };
    this._nodes.push(n);
    const vis = this._renderNode(n);
    this._renderEdges();
    this._applyFilter();
    this.canvas.setActiveObject(vis);
    this._showProperties(n);
    this._snapshot();
    this._setStatus(`เพิ่ม "${title}" ลงกระดานแล้ว`);
    this.canvas.requestRenderAll();
    return n;
  }

  // ================= แผงคุณสมบัติ: ลากย้ายได้ =================
  _makePropsDraggable() {
    const p = this.properties;
    const handle = p.querySelector('.planner-props-title');
    handle.style.cursor = 'move';
    let sx = 0, sy = 0, ox = 0, oy = 0, on = false;
    handle.addEventListener('mousedown', (e) => {
      on = true;
      const r = p.getBoundingClientRect();
      const pr = this.pane.getBoundingClientRect();
      ox = r.left - pr.left; oy = r.top - pr.top;
      sx = e.clientX; sy = e.clientY;
      p.style.right = 'auto';
      p.style.left = ox + 'px';
      p.style.top = oy + 'px';
      e.preventDefault();
    });
    const move = (e) => {
      if (!on) return;
      const pr = this.pane.getBoundingClientRect();
      const nx = Math.max(0, Math.min(pr.width - 60, ox + e.clientX - sx));
      const ny = Math.max(0, Math.min(pr.height - 40, oy + e.clientY - sy));
      p.style.left = nx + 'px';
      p.style.top = ny + 'px';
    };
    const up = () => { on = false; };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    this._propsDragCleanup = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
  }

  // ================= Utils =================
  _fit() {
    if (!this.canvas) return;
    const r = this.pane.getBoundingClientRect();
    const h = r.height - this.toolbar.offsetHeight - this.filterBar.offsetHeight - 24;
    this.canvas.setWidth(Math.max(300, r.width - 20));
    this.canvas.setHeight(Math.max(280, h));
    this.canvas.requestRenderAll();
  }

  _setStatus(m) {
    const s = document.getElementById('status');
    if (s) s.textContent = m;
  }

  focus() { if (this.canvas && this.canvas.wrapperEl) this.canvas.wrapperEl.focus?.(); }

  destroy() {
    if (this._autoSaveTimer) clearInterval(this._autoSaveTimer);
    if (this.dirty) { try { this.save(); } catch {} }
    document.removeEventListener('keydown', this._onKeyDown);
    if (this._propsDragCleanup) this._propsDragCleanup();
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this.canvas) this.canvas.dispose();
    this.pane.innerHTML = '';
  }
}
