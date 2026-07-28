// books.js — ตัวจัดการเล่ม/ร่าง (Book Manager): เพิ่ม/แก้/ลบ/เรียงเล่มและร่าง
import { SECTION_STATUSES, activate, buildTree, closeTab, openCompileDialog, openFirstSceneOf, resolveImg } from './app.js';
import { addSection, deleteSection, listSections, reorderSections, saveSectionMeta, sectionStats } from './section-ops.js';
import { $, el, setStatus, state } from './core.js';
import { pickImage } from './gallery.js';
import { popupMenu } from './ui.js';

export async function openBookManager() {
  const key = '::books::';
  if (state.tabs.has(key)) { activate(key); return renderBookManager(state.tabs.get(key).pane); }
  const pane = el('div', 'pane');
  $('#panes').append(pane);
  const tabBtn = el('div', 'tab');
  tabBtn.append(el('span', 'tab-title', 'จัดการเล่ม'));
  const x = el('span', 'tab-x', '×'); tabBtn.append(x);
  $('#tabs').append(tabBtn);
  const tab = { file: key, title: 'จัดการเล่ม', pane, tabBtn, dirty: false,
                editor: null, plain: null, wiki: null, gal: null, books: true };
  tabBtn.onclick = (e) => { if (e.target !== x) activate(key); };
  x.onclick = () => closeTab(key);
  state.tabs.set(key, tab);
  activate(key);
  renderBookManager(pane);
}

export async function renderBookManager(pane) {
  pane.innerHTML = '';
  const wrap = el('div', 'books-wrap'); pane.append(wrap);
  const head = el('div', 'books-head');
  head.append(el('div', 'books-title', '📚 เล่มทั้งหมดในโปรเจกต์'));
  const addBtn = el('button', 'k-ok', '＋ เพิ่มเล่ม');
  addBtn.onclick = async () => { await addSection(); renderBookManager(pane); };
  head.append(addBtn);
  wrap.append(head);

  const sections = await listSections();
  const grid = el('div', 'books-grid'); wrap.append(grid);

  const statusOf = (k) => SECTION_STATUSES.find((s) => s[0] === k) || SECTION_STATUSES[0];

  for (const s of sections) {
    const card = el('div', 'book-card');
    card.draggable = true;
    card.dataset.folder = s.folder;

    // ---- ปก ----
    const cover = el('div', 'book-cover');
    const applyCover = (rel) => {
      cover.innerHTML = '';
      if (rel) {
        const img = el('img'); img.src = resolveImg(s.secPath, rel);
        cover.append(img); cover.classList.remove('book-cover-empty');
      } else {
        cover.classList.add('book-cover-empty');
        cover.append(el('div', 'book-cover-ph', '📖'));
      }
    };
    applyCover(s.meta.cover);
    const coverBtns = el('div', 'book-cover-btns');
    const pickCover = el('button', 'cmp-mini', '🖼 เลือกปก');
    pickCover.onclick = async () => {
      const it = await pickImage(state.root);
      if (!it) return;
      // เก็บ path แบบสัมพัทธ์กับโฟลเดอร์เล่ม (รูปอยู่ใน <root>/Images)
      const rel = '../Images/' + it.file;
      s.meta = await saveSectionMeta(s.sf, { cover: rel });
      applyCover(rel); setStatus('ตั้งปกเล่มแล้ว');
    };
    coverBtns.append(pickCover);
    if (s.meta.cover) {
      const clr = el('button', 'cmp-mini', '✕');
      clr.title = 'เอาปกออก';
      clr.onclick = async () => { s.meta = await saveSectionMeta(s.sf, { cover: '' }); applyCover(''); coverBtns.removeChild(clr); };
      coverBtns.append(clr);
    }
    cover.append(coverBtns);
    card.append(cover);

    // ---- เนื้อการ์ด ----
    const bd = el('div', 'book-body'); card.append(bd);

    const titleInp = el('input', 'book-title-inp'); titleInp.value = s.title;
    titleInp.onchange = async () => {
      const v = titleInp.value.trim(); if (!v || v === s.title) { titleInp.value = s.title; return; }
      s.meta = await saveSectionMeta(s.sf, { title: v }); s.title = v;
      await buildTree(); setStatus('เปลี่ยนชื่อเล่มแล้ว');
    };
    bd.append(titleInp);

    // สถานะเล่ม
    const stRow = el('div', 'book-status-row');
    const cur = statusOf(s.meta.status);
    const pill = el('span', 'book-status-pill'); pill.textContent = cur[1];
    pill.style.background = cur[2];
    pill.onclick = (e) => {
      popupMenu(e.clientX, e.clientY, SECTION_STATUSES.map(([k, label, color]) => ({
        label: (k === (s.meta.status || 'outline') ? '● ' : '   ') + label,
        click: async () => { s.meta = await saveSectionMeta(s.sf, { status: k });
          pill.textContent = label; pill.style.background = color; },
      })));
    };
    stRow.append(pill);
    bd.append(stRow);

    // คำโปรย
    const blurb = el('textarea', 'book-blurb'); blurb.placeholder = 'คำโปรย / เรื่องย่อของเล่มนี้…';
    blurb.value = s.meta.blurb || '';
    blurb.onchange = async () => { s.meta = await saveSectionMeta(s.sf, { blurb: blurb.value }); };
    bd.append(blurb);

    // สถิติ
    const stats = el('div', 'book-stats', '…'); bd.append(stats);
    sectionStats(s.secPath).then((st) => {
      stats.textContent = `${st.chapters} บท · ${st.scenes} ฉาก · ${st.words.toLocaleString()} คำ`
        + (st.drafts > 1 ? ` · ${st.drafts} ฉบับร่าง` : '');
    });

    // ปุ่มจัดการ
    const acts = el('div', 'book-acts');
    const openB = el('button', 'cmp-mini', '📂 เปิด');
    openB.onclick = () => openFirstSceneOf(s.secPath);
    const expB = el('button', 'cmp-mini', '📤 ส่งออก');
    expB.onclick = () => openCompileDialog();
    const delB = el('button', 'cmp-mini k-danger', '🗑 ลบ');
    delB.onclick = async () => { await deleteSection(s.secPath, s.meta); renderBookManager(pane); };
    acts.append(openB, expB, delB);
    bd.append(acts);

    // ---- ลากสลับลำดับเล่ม ----
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/k2-book', s.folder);
      card.classList.add('book-dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('book-dragging'));
    card.addEventListener('dragover', (e) => {
      if ([...e.dataTransfer.types].includes('text/k2-book')) { e.preventDefault(); card.classList.add('book-drop'); } });
    card.addEventListener('dragleave', () => card.classList.remove('book-drop'));
    card.addEventListener('drop', async (e) => {
      card.classList.remove('book-drop');
      const from = e.dataTransfer.getData('text/k2-book');
      if (!from || from === s.folder) return;
      e.preventDefault();
      await reorderSections(from, s.folder);
      renderBookManager(pane);
    });

    grid.append(card);
  }

  if (!sections.length) grid.append(el('div', 'books-empty', 'ยังไม่มีเล่ม — กด "＋ เพิ่มเล่ม"'));
}
