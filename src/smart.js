// SmartType — เดาชื่อจาก Wiki ขณะพิมพ์ (ยกพฤติกรรมจาก v1)
// พิมพ์ตัวอักษรต้นของชื่อ (≥2 ตัว) → popup รายชื่อ · ↑↓ เลือก · Enter/Tab ยืนยัน · Esc ปิด

export class SmartType {
  constructor() {
    this.names = [];
    this.items = [];
    this.sel = 0;
    this.prefixLen = 0;
    this.box = document.createElement('div');
    this.box.className = 'smart-pop';
    this.box.style.display = 'none';
    document.body.appendChild(this.box);
  }

  async loadNames(root) {
    // ชื่อจาก Wiki ทุกที่ + จำหมวดและไฟล์ต้นทาง (ให้คลิกชื่อแล้วเปิด Wiki ได้)
    const names = new Set();
    this.byCat = {};
    this.fileOf = {};
    this.titles = [];
    const scanWiki = async (wikiDir) => {
      if (!(await kapi.exists(wikiDir))) return;
      for (const cat of await kapi.listDirs(wikiDir)) {
        const catDir = await kapi.join(wikiDir, cat);
        for (const f of await kapi.listFiles(catDir, '.json')) {
          try {
            const p = await kapi.join(catDir, f);
            const e = await kapi.readJson(p);
            const extra = [...(Array.isArray(e.aliases) ? e.aliases : []),
                           ...(Array.isArray(e.aka) ? e.aka : [])];
            if (e.name && !this.titles.includes(e.name)) this.titles.push(e.name);
            for (const n of [e.name, ...extra]) {
              if (!n) continue;
              names.add(n);
              this.fileOf[n] = p;
              (this.byCat[cat] = this.byCat[cat] || []).push(n);
            }
          } catch {}
        }
      }
    };
    await scanWiki(await kapi.join(root, 'Wiki'));
    await scanWiki(await kapi.join(root, 'Bible'));      // ชื่อเดิมของ v1
    for (const sec of await kapi.listDirs(root)) {
      await scanWiki(await kapi.join(root, sec, 'Wiki'));
      await scanWiki(await kapi.join(root, sec, 'Bible'));
    }
    this.names = [...names];
  }

  get visible() { return this.box.style.display !== 'none'; }

  // เรียกหลังทุกการพิมพ์: ดูข้อความก่อนเคอร์เซอร์ หาชื่อที่ขึ้นต้นตรงกัน
  // opts.minLen = จำนวนอักษรขั้นต่ำที่เริ่มเดา (บทหนังแบบ Final Draft = 1: พิมพ์ e → EXT.)
  // opts.ci = จับคู่โดยไม่สนตัวพิมพ์เล็กใหญ่ (หัวฉาก/ทรานซิชัน)
  check(view, list, opts = {}) {
    return this._check(view, list || this.names, opts);
  }

  _check(view, NAMES, opts = {}) {
    const minLen = opts.minLen || 2;
    const ci = !!opts.ci;
    const eq = ci ? (a, b) => a.toLowerCase() === b.toLowerCase() : (a, b) => a === b;
    const starts = ci
      ? (n, t) => n.toLowerCase().startsWith(t.toLowerCase())
      : (n, t) => n.startsWith(t);
    const { $from, empty } = view.state.selection;
    if (!empty || !$from.parent.isTextblock) return this.hide();
    const before = $from.parent.textBetween(
      Math.max(0, $from.parentOffset - 24), $from.parentOffset, '\n');
    let best = [];
    let bestLen = 0;
    for (let k = Math.min(before.length, 18); k >= minLen; k--) {
      const tail = before.slice(-k);
      if (/\s/.test(tail[0]) && k > minLen) continue;
      const hit = NAMES.filter((n) => starts(n, tail) && !eq(n, tail));
      if (hit.length) { best = hit.slice(0, 8); bestLen = k; break; }
    }
    if (!best.length) return this.hide();
    this.items = best; this.sel = 0; this.prefixLen = bestLen;
    this.render();
    const c = view.coordsAtPos(view.state.selection.from);
    this.box.style.left = c.left + 'px';
    this.box.style.top = c.bottom + 6 + 'px';
    this.box.style.display = 'block';
  }

  render() {
    this.box.innerHTML = '';
    this.items.forEach((n, i) => {
      const d = document.createElement('div');
      d.className = 'smart-item' + (i === this.sel ? ' on' : '');
      d.textContent = n;
      d.onmousedown = (e) => { e.preventDefault(); this.sel = i; this._accept(); };
      this.box.appendChild(d);
    });
  }

  hide() { this.box.style.display = 'none'; this.items = []; }

  bindView(view) { this._view = view; }

  _accept() {
    const view = this._view;
    if (!view || !this.items.length) return;
    const name = this.items[this.sel];
    const to = view.state.selection.from;
    view.dispatch(view.state.tr.insertText(name, to - this.prefixLen, to));
    this.hide(); view.focus();
  }

  // คืน true = กิน key แล้ว
  onKey(ev) {
    if (!this.visible) return false;
    if (ev.key === 'ArrowDown') { this.sel = (this.sel + 1) % this.items.length; this.render(); return true; }
    if (ev.key === 'ArrowUp') { this.sel = (this.sel - 1 + this.items.length) % this.items.length; this.render(); return true; }
    if (ev.key === 'Enter' || ev.key === 'Tab') { this._accept(); return true; }
    if (ev.key === 'Escape') { this.hide(); return true; }
    return false;
  }
}
