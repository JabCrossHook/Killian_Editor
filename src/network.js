// Story Network — กราฟความสัมพันธ์แบบ Obsidian (canvas, ลากโหนดได้, คลิกเปิด Wiki)
// แท็กภาพ (Visual Tags ข้อ 84): เอนทิตี้ที่มีแท็กตั้งสีไว้ → วงแหวนสีแท็ก + ไอคอนข้างชื่อ
import { visualTagFor } from './visual-tags.js';
// สีเส้นตามประเภทความสัมพันธ์ (ครอบครัว/คนรัก/ศัตรู…)
import { REL_COLOR, categorizeRole } from './relationship-types.js';

const CAT_COLOR = { characters: '#d97757', locations: '#7aa8d8',
                    items: '#6fae8a', lore: '#b58fc9' };

// สีของแท็กภาพตัวแรกที่ตั้งค่าไว้ (ใช้เป็นวงแหวนรอบโหนด)
function tagStyle(node) {
  for (const t of (node.tags || [])) {
    const vt = visualTagFor(t);
    if (vt) return vt;
  }
  return null;
}

export class StoryNetwork {
  constructor(pane, { loadEntities, onOpen = null } = {}) {
    this.pane = pane; this.onOpen = onOpen; this.loadEntities = loadEntities;
    this.title = 'Story Network';
    this.dirty = false;
    this.nodes = []; this.edges = [];
    this.drag = null;
    this._scale = 1;           // zoom level
    this._cx = 0; this._cy = 0; // pan offset
    this._filterNode = null;   // filter by node
    this._hoverNode = null;    // hover highlight
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'net-canvas';
    pane.appendChild(this.canvas);
    this.canvas.addEventListener('mousedown', (e) => this._down(e));
    this.canvas.addEventListener('mousemove', (e) => this._move(e));
    // ปล่อยเมาส์นอกแคนวาสก็ต้องจบการลาก ไม่งั้นค้างลากทั้งที่ยกนิ้วไปแล้ว
    this._upDoc = (e) => this._up(e);
    document.addEventListener('mouseup', this._upDoc);
    this.canvas.addEventListener('wheel', (e) => { e.preventDefault(); this._zoom(e); });
    this.canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); this._ctxMenu(e); });
    this._resize = () => { this._fit(); this.draw(); };
    window.addEventListener('resize', this._resize);
    // pane ถูกซ่อนตอนสร้าง (แท็บยังไม่ active) → getBoundingClientRect เป็น 0 แล้ว canvas เหลือ 300x300
    // ทำให้คลิกนอกกรอบ 300px ไม่โดนอะไรเลย = "ทำอะไรไม่ได้" (บั๊กข้อ 12) → เฝ้าขนาด pane ไว้
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => { this._fit(); this.draw(); });
      this._ro.observe(pane);
    }
    this.refresh();
  }

  // ---- แถบเครื่องมือเล็ก ๆ: รีเซ็ตมุมมอง + คำใบ้วิธีใช้ ----
  _buildHint() {
    if (this._hint) return;
    const bar = document.createElement('div');
    bar.className = 'net-hint';
    const txt = document.createElement('span');
    txt.textContent = 'ลากพื้นหลัง = เลื่อนผัง · ลากโหนด = ย้าย · ล้อ = ซูม · คลิกขวา = เมนู';
    const reset = document.createElement('button');
    reset.className = 'net-reset'; reset.textContent = '⤾ รีเซ็ตมุมมอง';
    reset.onclick = () => { this._scale = 1; this._cx = 0; this._cy = 0; this.draw(); };
    bar.append(txt, reset);
    this.pane.appendChild(bar);
    this._hint = bar;
  }

  // ---- Zoom ด้วยล้อเมาส์ (ข้อ 54) ----
  _zoom(e) {
    const r = this.canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.max(0.3, Math.min(3, this._scale * factor));
    // zoom toward mouse position
    this._cx = mx - (mx - this._cx) * (newScale / this._scale);
    this._cy = my - (my - this._cy) * (newScale / this._scale);
    this._scale = newScale;
    this.draw();
  }

  // ---- คลิกขวา → filter by character (ข้อ 54) ----
  _ctxMenu(e) {
    const { node } = this._hit(e);
    if (!node) return;
    // popup menu
    const menu = document.createElement('div');
    menu.className = 'k-menu';
    menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;z-index:80;
      background:var(--side);border:1px solid var(--border);border-radius:8px;padding:4px;
      box-shadow:0 6px 20px rgba(0,0,0,.4);`;
    const items = [
      { label: this._filterNode === node ? '🔄 แสดงความสัมพันธ์ทั้งหมด' : '🔍 แสดงเฉพาะของ: ' + node.name,
        click: () => {
          this._filterNode = this._filterNode === node ? null : node;
          this.draw();
          document.body.removeChild(menu);
        } },
      { label: '📖 เปิดหน้า Wiki', click: () => { if (this.onOpen) this.onOpen(node); document.body.removeChild(menu); } },
    ];
    items.forEach((it) => {
      const d = document.createElement('div');
      d.className = 'k-menu-item'; d.textContent = it.label;
      d.onclick = it.click; menu.appendChild(d);
    });
    document.body.appendChild(menu);
    // close on outside click
    const close = (ev) => {
      if (!menu.contains(ev.target)) { document.body.removeChild(menu); document.removeEventListener('click', close); }
    };
    setTimeout(() => document.addEventListener('click', close), 10);
  }

  async refresh() {
    const ents = await this.loadEntities();        // [{name, cat, file, relationships}]
    const W = Math.max(600, this.pane.clientWidth || 900);
    const H = Math.max(400, this.pane.clientHeight || 600);
    this.nodes = ents.map((e, i) => ({
      ...e,
      x: W / 2 + Math.cos((i / Math.max(1, ents.length)) * Math.PI * 2) * Math.min(W, H) * 0.32,
      y: H / 2 + Math.sin((i / Math.max(1, ents.length)) * Math.PI * 2) * Math.min(W, H) * 0.32,
    }));
    const byName = Object.fromEntries(this.nodes.map((n) => [n.name, n]));
    this.edges = [];
    const seen = new Set();
    for (const n of this.nodes) {
      for (const r of n.relationships || []) {
        const t = byName[r.targetName || r.target];
        if (!t) continue;
        const key = [n.name, t.name].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        this.edges.push({ a: n, b: t, role: r.role || '', type: r.type || categorizeRole(r.role) });
      }
    }
    this._force(120, W, H);
    this._buildHint();
    this._fit();
    this.draw();
  }

  _force(iters, W, H) {
    for (let it = 0; it < iters; it++) {
      for (const a of this.nodes) {
        let fx = 0, fy = 0;
        for (const b of this.nodes) {
          if (a === b) continue;
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = Math.max(400, dx * dx + dy * dy);
          fx += (dx / d2) * 9000; fy += (dy / d2) * 9000;
        }
        for (const e of this.edges) {
          if (e.a !== a && e.b !== a) continue;
          const o = e.a === a ? e.b : e.a;
          fx += (o.x - a.x) * 0.02; fy += (o.y - a.y) * 0.02;
        }
        fx += (W / 2 - a.x) * 0.004; fy += (H / 2 - a.y) * 0.004;
        a.x += Math.max(-14, Math.min(14, fx));
        a.y += Math.max(-14, Math.min(14, fy));
      }
    }
  }

  _fit() {
    const r = this.pane.getBoundingClientRect();
    this.canvas.width = Math.max(300, r.width);
    this.canvas.height = Math.max(300, r.height);
  }

  draw() {
    const c = this.canvas.getContext('2d');
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.save();
    // apply zoom + pan transform
    c.translate(this._cx, this._cy);
    c.scale(this._scale, this._scale);
    c.font = '12px "Segoe UI", "Leelawadee UI", sans-serif';
    // filter: show only edges connected to filter node
    const visibleEdges = this._filterNode
      ? this.edges.filter((e) => e.a === this._filterNode || e.b === this._filterNode)
      : this.edges;
    const visibleNodes = this._filterNode
      ? this.nodes.filter((n) => n === this._filterNode || visibleEdges.some((e) => e.a === n || e.b === n))
      : this.nodes;

    for (const e of visibleEdges) {
      if (e.a === this._hoverNode || e.b === this._hoverNode) {
        c.strokeStyle = '#d97757'; c.lineWidth = 2.5;
      } else if (e.type && REL_COLOR[e.type]) {
        c.strokeStyle = REL_COLOR[e.type]; c.lineWidth = 2.0;
      } else {
        c.strokeStyle = '#4a4842'; c.lineWidth = 1.4;
      }
      c.beginPath(); c.moveTo(e.a.x, e.a.y); c.lineTo(e.b.x, e.b.y); c.stroke();
      if (e.role) {
        c.fillStyle = '#98958b';
        c.fillText(e.role, (e.a.x + e.b.x) / 2 + 6, (e.a.y + e.b.y) / 2 - 4);
      }
    }
    for (const n of visibleNodes) {
      const vt = tagStyle(n);
      const r = n === this._hoverNode ? 18 : 14;
      // วงแหวนสีแท็ก (วาดก่อน แล้วให้วงกลมหมวดทับตรงกลาง → เห็นเป็นขอบสีรอบโหนด)
      if (vt) {
        c.beginPath();
        c.fillStyle = vt.color;
        c.arc(n.x, n.y, r + 3.5, 0, Math.PI * 2); c.fill();
      }
      c.beginPath();
      c.fillStyle = CAT_COLOR[n.cat] || '#d9955f';
      c.arc(n.x, n.y, r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = this._filterNode === n ? '#faf9f5' : '#1f1e1c';
      c.lineWidth = this._filterNode === n ? 3 : 2;
      c.stroke();
      c.fillStyle = '#faf9f5';
      c.fillText((vt && vt.icon ? vt.icon + ' ' : '') + n.name, n.x + 20, n.y + 4);
    }
    c.restore();
  }

  _hit(e) {
    const r = this.canvas.getBoundingClientRect();
    // reverse zoom/pan to get world coordinates
    const x = (e.clientX - r.left - this._cx) / this._scale;
    const y = (e.clientY - r.top - this._cy) / this._scale;
    return { x, y, node: this.nodes.find((n) => (n.x - x) ** 2 + (n.y - y) ** 2 <= 20 * 20) };
  }

  _down(e) {
    if (e.button !== 0) return;
    const { x, y, node } = this._hit(e);
    if (node) { this.drag = { node, moved: false, ox: node.x - x, oy: node.y - y }; return; }
    // กดพื้นหลัง = เลื่อนผังทั้งแผ่น (เดิมไม่มี → ผังเลื่อนไม่ได้เลย บั๊กข้อ 12)
    this.pan = { sx: e.clientX, sy: e.clientY, cx: this._cx, cy: this._cy, moved: false };
    this.canvas.classList.add('net-panning');
  }
  _move(e) {
    if (this.pan) {
      this._cx = this.pan.cx + (e.clientX - this.pan.sx);
      this._cy = this.pan.cy + (e.clientY - this.pan.sy);
      if (Math.abs(e.clientX - this.pan.sx) + Math.abs(e.clientY - this.pan.sy) > 3) this.pan.moved = true;
      this.draw();
      return;
    }
    if (!this.drag) {
      // hover highlight
      const { node } = this._hit(e);
      if (this._hoverNode !== node) { this._hoverNode = node; this.draw(); }
      this.canvas.style.cursor = node ? 'pointer' : 'grab';
      return;
    }
    const { x } = this._hit(e);
    this.drag.node.x = x + this.drag.ox;
    this.drag.node.y = (e.clientY - this.canvas.getBoundingClientRect().top - this._cy) / this._scale + this.drag.oy;
    this.drag.moved = true;
    this.draw();
  }
  _up() {
    if (this.pan) { this.pan = null; this.canvas.classList.remove('net-panning'); return; }
    if (this.drag && !this.drag.moved && this.onOpen) this.onOpen(this.drag.node);
    this.drag = null;
  }

  // แท็บถูกเรียกขึ้นมา → ตอนนี้ pane มีขนาดจริงแล้ว วัดใหม่ก่อนวาด
  focus() { this._fit(); this.draw(); }
  save() { return true; }
  destroy() {
    window.removeEventListener('resize', this._resize);
    document.removeEventListener('mouseup', this._upDoc);
    this._ro?.disconnect();
  }
}
