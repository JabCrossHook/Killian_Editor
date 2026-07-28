// UI ประกอบ: dialog ถามข้อความ (แทน prompt ที่ Electron ไม่รองรับ) + เมนูคลิกขวาใน tree

export function ask(title, { placeholder = '', value = '', okLabel = 'ตกลง' } = {}) {
  return new Promise((resolve) => {
    const ov = document.createElement('div'); ov.className = 'k-overlay';
    const box = document.createElement('div'); box.className = 'k-dialog';
    box.innerHTML = `<div class="k-dlg-title"></div>
      <input class="k-dlg-input">
      <div class="k-dlg-btns"><button class="k-cancel">ยกเลิก</button>
      <button class="k-ok"></button></div>`;
    box.querySelector('.k-dlg-title').textContent = title;
    const inp = box.querySelector('.k-dlg-input');
    inp.placeholder = placeholder; inp.value = value;
    box.querySelector('.k-ok').textContent = okLabel;
    ov.appendChild(box); document.body.appendChild(ov);
    const done = (v) => { ov.remove(); resolve(v); };
    box.querySelector('.k-ok').onclick = () => done(inp.value.trim() || null);
    box.querySelector('.k-cancel').onclick = () => done(null);
    ov.onclick = (e) => { if (e.target === ov) done(null); };
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') done(inp.value.trim() || null);
      if (e.key === 'Escape') done(null);
    };
    inp.focus(); inp.select();
  });
}

export function confirmBox(title, okLabel = 'ลบ') {
  return new Promise((resolve) => {
    const ov = document.createElement('div'); ov.className = 'k-overlay';
    const box = document.createElement('div'); box.className = 'k-dialog';
    box.innerHTML = `<div class="k-dlg-title"></div>
      <div class="k-dlg-btns"><button class="k-cancel">ยกเลิก</button>
      <button class="k-ok k-danger"></button></div>`;
    box.querySelector('.k-dlg-title').textContent = title;
    box.querySelector('.k-ok').textContent = okLabel;
    ov.appendChild(box); document.body.appendChild(ov);
    const done = (v) => { ov.remove(); resolve(v); };
    box.querySelector('.k-ok').onclick = () => done(true);
    box.querySelector('.k-cancel').onclick = () => done(false);
    ov.onclick = (e) => { if (e.target === ov) done(false); };
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', esc); done(false); }
    });
  });
}

let curMenu = null;
export function popupMenu(x, y, items) {
  closeMenu();
  const m = document.createElement('div'); m.className = 'k-menu';
  for (const it of items) {
    if (it === '-') { m.appendChild(Object.assign(document.createElement('div'), { className: 'k-menu-sep' })); continue; }
    const d = document.createElement('div');
    d.className = 'k-menu-item' + (it.danger ? ' k-danger' : '');
    d.textContent = it.label;
    d.onclick = () => { closeMenu(); it.click(); };
    m.appendChild(d);
  }
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, window.innerWidth - r.width - 8) + 'px';
  m.style.top = Math.min(y, window.innerHeight - r.height - 8) + 'px';
  curMenu = m;
  setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
}
function onDoc(e) { if (curMenu && !curMenu.contains(e.target)) closeMenu(); }
export function closeMenu() {
  if (curMenu) { curMenu.remove(); curMenu = null; document.removeEventListener('mousedown', onDoc); }
}

export function choose(title, options) {
  // options: [{label, value, danger?, primary?}]
  return new Promise((resolve) => {
    const ov = document.createElement('div'); ov.className = 'k-overlay';
    const box = document.createElement('div'); box.className = 'k-dialog';
    const t = document.createElement('div'); t.className = 'k-dlg-title'; t.textContent = title;
    const btns = document.createElement('div'); btns.className = 'k-dlg-btns';
    box.append(t, btns); ov.appendChild(box); document.body.appendChild(ov);
    const done = (v) => { ov.remove(); resolve(v); };
    for (const op of options) {
      const b = document.createElement('button');
      b.textContent = op.label;
      if (op.primary) b.className = 'k-ok';
      if (op.danger) b.className = 'k-ok k-danger';
      b.onclick = () => done(op.value);
      btns.appendChild(b);
    }
    ov.onclick = (e) => { if (e.target === ov) done(null); };
  });
}
