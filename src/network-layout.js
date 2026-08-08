// network-layout.js — เอนจิน Force Layout 3D สำหรับ Story Network (pure module)
// import { forceLayout, seedLayout, loadPositions, savePositions } from './network-layout.js';

const STORE_KEY = 'k2-net-layout';

export function forceLayout(nodes, edges, { width = 900, height = 600, depth = 400, iters = 300, pinned = null } = {}) {
  const n = nodes.length;
  if (n < 2) return;
  const centerX = 0, centerY = 0, centerZ = 0;
  for (let it = 0; it < iters; it++) {
    const alpha = 1 - it / iters;
    const damping = 0.5 + alpha * 0.5;
    const repulsion = 9000 * alpha + 2500;
    const attraction = 0.02 * alpha + 0.006;
    const gravity = 0.004 * alpha + 0.001;
    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      if (pinned && pinned.has(a)) continue; // ล็อกโหนดที่มีตำแหน่งบันทึกไว้
      let fx = 0, fy = 0, fz = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y, dz = (a.z || 0) - (b.z || 0);
        const d2 = Math.max(100, dx * dx + dy * dy + dz * dz);
        const f = repulsion / d2;
        fx += dx * f; fy += dy * f; fz += dz * f;
      }
      for (const e of edges) {
        if (e.a !== a && e.b !== a) continue;
        const o = e.a === a ? e.b : e.a;
        fx += (o.x - a.x) * attraction;
        fy += (o.y - a.y) * attraction;
        fz += ((o.z || 0) - (a.z || 0)) * attraction;
      }
      fx += (centerX - a.x) * gravity;
      fy += (centerY - a.y) * gravity;
      fz += (centerZ - (a.z || 0)) * gravity;
      const clamp = 22 * damping;
      a.x += Math.max(-clamp, Math.min(clamp, fx * damping));
      a.y += Math.max(-clamp, Math.min(clamp, fy * damping));
      a.z = (a.z || 0) + Math.max(-clamp, Math.min(clamp, fz * damping));
    }
  }
}

export function seedLayout(nodes, positions, { width = 900, height = 600, depth = 400 } = {}) {
  const halfW = width * 0.28, halfH = height * 0.28, halfD = depth * 0.28;
  const n = nodes.length;
  for (let i = 0; i < n; i++) {
    const node = nodes[i];
    const pos = positions && positions[node.name];
    if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
      node.x = pos.x;
      node.y = pos.y;
      node.z = typeof pos.z === 'number' ? pos.z : (Math.random() - 0.5) * halfD * 2;
    } else {
      const angle = (i / Math.max(1, n)) * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * halfW;
      node.x = Math.cos(angle) * r;
      node.y = Math.sin(angle) * r;
      node.z = (Math.random() - 0.5) * halfD * 2;
    }
  }
}

export function layoutPositions(nodes) {
  const out = {};
  for (const n of nodes) {
    if (n.name) out[n.name] = { x: Math.round(n.x), y: Math.round(n.y), z: Math.round(n.z || 0) };
  }
  return out;
}

export function loadPositions() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function savePositions(nodes) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(layoutPositions(nodes)));
  } catch { /* quota exceeded */ }
}
