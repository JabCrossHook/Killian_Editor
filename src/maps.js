// ระบบแผนที่ (Maps) — ตรรกะบริสุทธิ์ ไม่แตะ DOM/ไฟล์ เพื่อทดสอบตรง ๆ ได้
//
// แนวคิด: ใช้ไฟล์รูปเป็นแผนที่ แล้วปัก "หมุด" (pin) ลงบนรูป
//   - หมุดเก็บพิกัดเป็น % (x,y ระหว่าง 0–100) → คงตำแหน่งถูกต้องทุกขนาด/ซูม
//   - หมุดลิงก์ได้ 2 แบบ: ไปหน้า Wiki (entityFile) หรือ "ประตู" ไปแผนที่อื่น (toMap) = โลก→เมือง→ห้อง
//
// map = { id, name, image (rel ใน Images/), pins:[pin], order }
// pin = { id, x, y, label, kind:'entity'|'portal'|'note', entityFile?, toMap?, color?, note? }

export const MAPS_VERSION = '1.0';

export const PIN_COLORS = ['#d9575e', '#5f9fd9', '#6fae6f', '#d9b757', '#a97fd0', '#d97757', '#7fb8b0'];
export const PIN_KIND = {
  entity: { icon: '📍', label: 'ตำแหน่งเอนทิตี้' },
  portal: { icon: '🚪', label: 'ประตูไปแผนที่อื่น' },
  note:   { icon: '📌', label: 'หมายเหตุ' },
};

export function newMap(name, image) {
  return { id: 'map-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
           name: name || 'แผนที่ใหม่', image: image || '', pins: [], order: 0 };
}

export function newPin(x, y, kind = 'note') {
  return { id: 'pin-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
           x: clamp(x), y: clamp(y), label: '', kind, entityFile: '', toMap: '', color: '', note: '' };
}

export function clamp(n) { return Math.max(0, Math.min(100, n)); }

// หา map ตาม id
export function findMap(maps, id) { return (maps || []).find((m) => m.id === id) || null; }

// เรียงแผนที่ตาม order แล้วชื่อ
export function sortMaps(maps) {
  return (maps || []).slice().sort((a, b) =>
    (a.order || 0) - (b.order || 0) || String(a.name).localeCompare(String(b.name), 'th'));
}

// สร้าง "เส้นทาง" (breadcrumb) จากแผนที่ราก → แผนที่ปัจจุบัน ตามลิงก์ portal
// คืน [{id,name}] เรียงจากบนสุดลงล่าง — ใช้แสดงลำดับชั้น โลก→เมือง→ห้อง
export function breadcrumb(maps, currentId) {
  const byId = new Map((maps || []).map((m) => [m.id, m]));
  // หา parent: แผนที่ที่มี pin.toMap === currentId
  const parentOf = (id) => {
    for (const m of maps || []) if ((m.pins || []).some((p) => p.kind === 'portal' && p.toMap === id)) return m.id;
    return null;
  };
  const chain = [];
  let cur = currentId, guard = 0;
  while (cur && byId.has(cur) && guard++ < 50) {
    chain.unshift({ id: cur, name: byId.get(cur).name });
    cur = parentOf(cur);
    if (chain.some((c) => c.id === cur)) break;   // กันวน
  }
  return chain;
}

// แผนที่ที่ไม่มีใครชี้มา (ราก) — ใช้แสดงเป็นจุดเริ่มของลำดับชั้น
export function rootMaps(maps) {
  const pointed = new Set();
  for (const m of maps || []) for (const p of m.pins || [])
    if (p.kind === 'portal' && p.toMap) pointed.add(p.toMap);
  return sortMaps((maps || []).filter((m) => !pointed.has(m.id)));
}

// นับหมุดแยกชนิด
export function pinStats(map) {
  const s = { entity: 0, portal: 0, note: 0 };
  for (const p of (map && map.pins) || []) s[p.kind] = (s[p.kind] || 0) + 1;
  return s;
}

// ลบแผนที่ + ล้าง portal ที่ชี้มาหามัน (กัน pin ค้างชี้แผนที่ที่หายไป)
export function deleteMap(maps, id) {
  const out = (maps || []).filter((m) => m.id !== id);
  for (const m of out) m.pins = (m.pins || []).filter((p) => !(p.kind === 'portal' && p.toMap === id));
  return out;
}
