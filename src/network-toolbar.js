// network-toolbar.js — แถบเครื่องมือ Story Network (filter, search, export, reset)
import { REL_TYPES } from './relationship-types.js';

const CATS = [
  { key: 'characters', label: 'ตัวละคร', color: '#d97757' },
  { key: 'locations', label: 'สถานที่', color: '#7aa8d8' },
  { key: 'items', label: 'ไอเทม', color: '#6fae8a' },
  { key: 'lore', label: 'ตำนาน', color: '#b58fc9' },
];

export function createNetworkToolbar(host, callbacks = {}) {
  const { onFilterChange, onSearch, onExport, onReset } = callbacks;
  const catFilter = new Set(CATS.map((c) => c.key));
  const typeFilter = new Set([...REL_TYPES.map((t) => t.key), 'co-occur']);

  const bar = document.createElement('div');
  bar.className = 'net-toolbar';

  const toggle = document.createElement('button');
  toggle.className = 'net-tbar-toggle';
  toggle.textContent = '▼';
  toggle.title = 'ซ่อน/แสดงแถบเครื่องมือ';
  let collapsed = false;

  const body = document.createElement('div');
  body.className = 'net-tbar-body';

  toggle.onclick = () => {
    collapsed = !collapsed;
    body.style.display = collapsed ? 'none' : '';
    toggle.textContent = collapsed ? '▶' : '▼';
  };

  function makeToggle(cls, color, label, active, onclick) {
    const btn = document.createElement('button');
    btn.className = cls;
    btn.style.setProperty('--tcolor', color);
    btn.title = label;
    btn.dataset.active = active ? '1' : '0';
    if (active) btn.classList.add('on');
    btn.onclick = () => {
      const a = btn.dataset.active === '1';
      btn.dataset.active = a ? '0' : '1';
      if (a) btn.classList.remove('on');
      else btn.classList.add('on');
      onclick(!a);
    };
    return btn;
  }

  function notify() {
    if (onFilterChange) onFilterChange(new Set(catFilter), new Set(typeFilter));
  }

  const catRow = document.createElement('div');
  catRow.className = 'net-tbar-row';
  for (const c of CATS) {
    const btn = makeToggle('net-tcat', c.color, c.label, true, (on) => {
      if (on) catFilter.add(c.key); else catFilter.delete(c.key);
      notify();
    });
    btn.textContent = c.label;
    catRow.appendChild(btn);
  }

  const typeRow = document.createElement('div');
  typeRow.className = 'net-tbar-row net-tbar-types';
  for (const t of REL_TYPES) {
    const dot = makeToggle('net-ttype', t.color, t.label, true, (on) => {
      if (on) typeFilter.add(t.key); else typeFilter.delete(t.key);
      notify();
    });
    typeRow.appendChild(dot);
  }
  const coBtn = makeToggle('net-ttype net-ttype-co', '#8a8885', 'ปรากฏร่วม (co-occur)', true, (on) => {
    if (on) typeFilter.add('co-occur'); else typeFilter.delete('co-occur');
    notify();
  });
  typeRow.appendChild(coBtn);

  const searchWrap = document.createElement('div');
  searchWrap.className = 'net-tbar-search';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'net-tbar-input';
  searchInput.placeholder = '🔍 ค้นหา…';
  let searchTimer;
  searchInput.oninput = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { if (onSearch) onSearch(searchInput.value.trim()); }, 200);
  };
  searchInput.onkeydown = (e) => {
    if (e.key === 'Enter' && onSearch) onSearch(searchInput.value.trim());
  };
  searchWrap.appendChild(searchInput);

  const btnRow = document.createElement('div');
  btnRow.className = 'net-tbar-actions';
  const exportBtn = document.createElement('button');
  exportBtn.className = 'net-tbar-btn';
  exportBtn.textContent = '📥 PNG';
  exportBtn.title = 'ส่งออกเป็นภาพ PNG';
  exportBtn.onclick = () => { if (onExport) onExport(); };
  const resetBtn = document.createElement('button');
  resetBtn.className = 'net-tbar-btn net-reset';
  resetBtn.textContent = '⤾';
  resetBtn.title = 'รีเซ็ตมุมมอง';
  resetBtn.onclick = () => { if (onReset) onReset(); };
  btnRow.append(exportBtn, resetBtn);
  body.append(catRow, typeRow, searchWrap, btnRow);
  bar.append(toggle, body);
  host.appendChild(bar);

  return {
    el: bar,
    getCategoryFilter: () => new Set(catFilter),
    getTypeFilter: () => new Set(typeFilter),
    getSearchQuery: () => searchInput.value.trim(),
    focusSearch: () => { body.style.display = ''; collapsed = false; toggle.textContent = '▼'; searchInput.focus(); },
    destroy: () => { bar.remove(); },
  };
}
