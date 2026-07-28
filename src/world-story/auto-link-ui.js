// auto-link-ui.js — แท็บ Backlinks ในหน้า Wiki entity (ข้อ 86)
// แสดงรายการฉากที่กล่าวถึง entity นี้
import { el, setStatus, state } from '../core.js';
import { AutoLink } from '../world-story/auto-link.js';
import { listScenes, listEntities } from '../project-scan.js';

let autoLink = null;   // AutoLink instance

// สร้าง/คืน AutoLink พร้อมดัชนีเชื่อมโยง Wiki↔ฉาก
export async function ensureAutoLink() {
  if (autoLink) return autoLink;
  autoLink = new AutoLink({ meta: state.meta });
  // ลองโหลดจาก project.khn.json ก่อน (เร็ว)
  if (state.meta && state.meta.backlinks) {
    autoLink.load(state.meta);
  }
  if (!state.root) return autoLink;
  // รวบรวม entities + scenes จากโปรเจกต์ (path บทมาจาก draft.json — ดู project-scan.js)
  try {
    const entities = (await listEntities(state.root))
      .map((e) => ({ id: e.path, name: e.name, aliases: e.aliases }));
    const scenes = (await listScenes(state.root, { withText: true }))
      .map((s) => ({ id: s.id, title: s.title, chapterId: s.chapterId, text: s.text || '' }));
    autoLink.build(entities, scenes);
    // บันทึกลง project.khn.json
    autoLink.persist(state.meta);
  } catch (e) { /* silently fail */ }
  return autoLink;
}

// โหลดข้อมูล backlinks
export function getBacklinksFor(entityPath) {
  if (!autoLink) return [];
  return autoLink.getRelatedScenes(entityPath);
}

// เรนเดอร์แท็บ backlinks ใน Wiki entity panel
export function renderBacklinksTab(host, entityPath, onOpenScene) {
  host.innerHTML = '';
  if (!autoLink) {
    host.append(el('div', 'dim', '(กำลังโหลดดัชนีเชื่อมโยง…)'));
    ensureAutoLink().then(() => renderBacklinksTab(host, entityPath, onOpenScene));
    return;
  }
  const links = getBacklinksFor(entityPath);
  if (!links.length) {
    host.append(el('div', 'dim', '(ยังไม่มีฉากที่กล่าวถึงเอนทิตี้นี้)'));
    return;
  }

  const list = el('div', 'bl-list');
  for (const link of links) {
    const row = el('div', 'bl-row');
    row.append(el('span', 'bl-count', (link.count || 1) + '× '));
    const name = el('span', 'bl-name', link.title || link.sceneId);
    name.style.cursor = 'pointer';
    name.style.color = 'var(--link)';
    name.style.textDecoration = 'underline';
    name.onclick = async () => {
      if (onOpenScene) onOpenScene(link.sceneId, link.title);
    };
    row.append(name);
    if (link.via) row.append(el('span', 'bl-via', ' (' + link.via + ')'));
    list.append(row);
  }
  host.append(list);
}

// ล้างดัชนีเมื่อเปลี่ยนโปรเจกต์
export function resetAutoLink() { autoLink = null; }
