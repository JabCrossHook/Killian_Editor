// quick-open.js — เปิดไฟล์ด่วนแบบ fuzzy (Ctrl+Shift+O)
import { $, el, state, setStatus, log } from './core.js';
import Fuse from 'fuse.js';

const SKIP_DIRS = ['Snapshots', 'Backups', 'Recycle', 'node_modules', '.git'];

export function openQuickOpen() {
  if (!state.root) { setStatus('ยังไม่ได้เปิดโปรเจกต์'); return null; }

  const ov = el('div', 'k-overlay');
  ov.style.cssText = 'z-index:100;background:rgba(0,0,0,.45)';
  const box = el('div', 'k-qo');
  const input = el('input', 'k-qo-input');
  input.placeholder = 'พิมพ์ชื่อไฟล์…';
  const list = el('div', 'k-qo-list');
  box.append(input, list);
  ov.append(box);
  document.body.append(ov);

  const allFiles = [];
  let fuse = null;
  let selectedIdx = 0;
  let results = [];

  const ready = (async () => {
    try {
      const rootLen = state.root.length;
      const scan = async (dir) => {
        for (const f of await kapi.listFiles(dir, '').catch(() => [])) {
          const fp = await kapi.join(dir, f);
          // kapi.relative เป็น IPC (async) — เดิมเรียกแบบ sync เลยได้ Promise มาโชว์เป็น [object Promise]
          const rel = fp.slice(rootLen).replace(/^[\\/]/, '').replace(/\\/g, '/');
          allFiles.push({ path: fp, name: f, rel, ext: (f.split('.').pop() || '').toLowerCase() });
        }
        for (const d of await kapi.listDirs(dir).catch(() => [])) {
          if (SKIP_DIRS.includes(d)) continue;
          await scan(await kapi.join(dir, d));
        }
      };
      await scan(state.root);
      fuse = new Fuse(allFiles, { keys: ['name', 'rel'], threshold: 0.4, distance: 100 });
      doFilter();
    } catch (e) { log('warn', 'quick-open: scan failed', e); }
  })();

  function doFilter() {
    const q = input.value.trim();
    results = q && fuse ? fuse.search(q).map((r) => r.item).slice(0, 20) : allFiles.slice(0, 20);
    list.innerHTML = '';
    selectedIdx = 0;
    results.forEach((f) => {
      const row = el('div', 'k-qo-row');
      const icon = f.ext === 'md' ? '📄' : f.ext === 'json' ? '📋' : '📎';
      row.append(el('span', 'k-qo-icon', icon));
      row.append(el('span', 'k-qo-name', f.name));
      row.append(el('span', 'k-qo-rel', f.rel));
      row.onclick = () => openFile(f);
      list.append(row);
    });
    highlight(selectedIdx);
  }

  function highlight(idx) {
    const rows = [...list.querySelectorAll('.k-qo-row')];
    rows.forEach((r, i) => r.classList.toggle('on', i === idx));
    if (rows[idx]) rows[idx].scrollIntoView({ block: 'nearest' });
  }

  async function openFile(f) {
    ov.remove();
    const { openScene, openPlainFile } = await import('./app.js');
    if (f.ext === 'md') openScene(f.path, f.name.replace(/\.md$/i, ''));
    else if (f.ext === 'json' || f.ext === 'txt') await openPlainFile(f.path, f.name);
    else kapi.revealInOS(f.path);
  }

  input.oninput = doFilter;
  input.onkeydown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx + 1, results.length - 1); highlight(selectedIdx); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(selectedIdx - 1, 0); highlight(selectedIdx); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[selectedIdx]) openFile(results[selectedIdx]); }
    else if (e.key === 'Escape') { e.preventDefault(); ov.remove(); }
  };
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  input.focus();
  return ready;                     // ให้ selftest รอสแกนเสร็จได้
}
