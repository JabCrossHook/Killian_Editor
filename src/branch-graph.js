// branch-graph.js — เอนจินผังแตกสาย (ข้อ 81)
// บริสุทธิ์ล้วน: ไม่แตะ DOM / ไม่แตะ fs → ทดสอบด้วย node ได้ (test/branch.test.cjs)
// branching-ui.js เอาผลลัพธ์ไปวาด SVG · โครงเดียวกับ timeline.js ↔ timeline-ui.js
//
//   scenes[] (จาก scenes.json) ──buildGraph──▶ {nodes, edges}
//                                    ├─layoutGraph──▶ ตำแหน่ง x/y แบบ "ชั้นตามความลึก"
//                                    └─analyzeGraph─▶ จุดเริ่ม/ตอนจบ/วนซ้ำ/ทางตัน/เข้าไม่ถึง

// ---- ขนาดกล่องโหนดบนผัง (px) — UI ใช้ค่าเดียวกันตอนวาด SVG ----
export const NODE_W = 178, NODE_H = 56;
export const GAP_X = 92, GAP_Y = 22, PAD = 26;

// ---------------------------------------------------------------------------
// ทางเลือกที่ "อยู่ในเนื้อเรื่องจริง" (ข้อ 15)
// กติกา: ในไฟล์ .md ของฉาก ถ้าผู้เขียนพิมพ์ [ไปตลาด] = ประกาศว่าตรงนี้คือทางแยก
// เอนจินนี้แค่หา/เทียบ — การเขียนกลับลง scenes.json/.md เป็นหน้าที่ของ UI
// ---------------------------------------------------------------------------

// จับ [ข้อความ] — แต่ต้องไม่ใช่ ![alt](รูป) และไม่ใช่ [ข้อความ](ลิงก์) ของ markdown
const MARKER_SRC = /(!?)\[([^\[\]\n]{1,80})\](\()?/;

/** หา “ทางเลือกในข้อความ” ทั้งหมดของฉาก → [{text, index}] เรียงตามตำแหน่งในไฟล์ */
export function scanChoiceMarkers(text) {
  const out = [];
  if (!text) return out;
  const re = new RegExp(MARKER_SRC.source, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1] === '!') continue;                 // รูปภาพ
    if (m[3] === '(') continue;                 // ลิงก์ markdown
    const t = m[2].trim();
    if (!t) continue;
    if (/^[ x*+-]$/i.test(t)) continue;         // [ ] / [x] = ช่องติ๊ก ไม่ใช่ทางเลือก
    out.push({ text: t, index: m.index + m[1].length });
  }
  return out;
}

/** ข้อความทางเลือกที่ไม่ซ้ำ เรียงตามที่พบในไฟล์ */
export function markerTexts(markers) {
  const seen = new Set();
  const out = [];
  for (const m of markers || []) {
    if (seen.has(m.text)) continue;
    seen.add(m.text); out.push(m.text);
  }
  return out;
}

/**
 * เทียบ “ข้อความในฉาก” กับ “choices ใน scenes.json”
 *   missing = มีในข้อความแล้วแต่ยังไม่เป็นทางเลือก (ควรชวนผู้ใช้ผูก)
 *   orphan  = เป็นทางเลือกอยู่ แต่หาข้อความ [..] ในฉากไม่เจอ (ควรชวนแทรกกลับ)
 */
export function diffChoiceMarkers(markers, choices) {
  const inText = markerTexts(markers);
  const inTextSet = new Set(inText);
  const inData = [];
  const seen = new Set();
  for (const c of choices || []) {
    const t = (c.text || '').trim();
    if (!t || seen.has(t)) continue;
    seen.add(t); inData.push(t);
  }
  return {
    missing: inText.filter((t) => !seen.has(t)),
    orphan: inData.filter((t) => !inTextSet.has(t)),
    linked: inData.filter((t) => inTextSet.has(t)),
  };
}

/**
 * แปลงรายการฉากดิบ → กราฟ {nodes, edges, byId}
 * แต่ละ choice ของฉากกลายเป็น edge หนึ่งเส้น (เก็บ idx ไว้เพื่ออ้างกลับไปแก้ scenes.json ได้ตรงตัว)
 */
export function buildGraph(scenes) {
  const nodes = (scenes || []).map((s, order) => ({
    id: s.id,
    order,
    title: s.title || '(ไม่มีชื่อ)',
    chapterName: s.chapterName || '',
    filePath: s.filePath || '',
    dPath: s.dPath || '',
    status: s.status || '',
    color: s.color || '',
    tags: Array.isArray(s.tags) ? s.tags : [],
    // เนื้อฉาก (ถ้า UI อ่านมาให้) — ใช้เทียบว่าทางเลือกไหนมี [ข้อความ] อยู่ในเรื่องจริง (ข้อ 15)
    body: typeof s.body === 'string' ? s.body : '',
    choices: (s.choices || []).map((c) => ({ text: c.text || '', nextSceneId: c.nextSceneId || '' })),
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = [];
  for (const n of nodes) {
    n.choices.forEach((c, idx) => {
      edges.push({
        from: n.id, to: c.nextSceneId || '', text: c.text, idx,
        // ปลายทางว่าง หรือชี้ไปฉากที่ถูกลบไปแล้ว = เส้นห้อย (ต้องเตือนผู้ใช้)
        dangling: !c.nextSceneId || !byId.has(c.nextSceneId),
      });
    });
  }
  return { nodes, edges, byId };
}

/** id ของฉากที่ "อยู่ในผัง" = มีทางเลือกของตัวเอง หรือถูกทางเลือกอื่นชี้มา */
export function involvedIds(graph) {
  const set = new Set();
  for (const n of graph.nodes) if (n.choices.length) set.add(n.id);
  for (const e of graph.edges) if (!e.dangling) set.add(e.to);
  return set;
}

// รายการฉากถัดไปของแต่ละฉาก (เฉพาะเส้นที่ไม่ห้อย, ตัดปลายทางซ้ำออก)
function adjacency(graph, ids) {
  const adj = new Map([...ids].map((id) => [id, []]));
  for (const e of graph.edges) {
    if (e.dangling || !ids.has(e.from) || !ids.has(e.to)) continue;
    const list = adj.get(e.from);
    if (!list.includes(e.to)) list.push(e.to);
  }
  return adj;
}

function indegrees(adj) {
  const deg = new Map([...adj.keys()].map((id) => [id, 0]));
  for (const [, outs] of adj) for (const to of outs) deg.set(to, (deg.get(to) || 0) + 1);
  return deg;
}

/**
 * จัดวางแบบชั้น (layered): ความลึก = ระยะสั้นสุดจากจุดเริ่ม → คอลัมน์ซ้าย→ขวา
 * โหนดที่วนซ้ำจนเข้าไม่ถึงจากจุดเริ่มไหนเลย ถูกวางต่อท้ายเป็นชั้นสุดท้าย (ไม่หายไปจากจอ)
 * @returns {{placed:Array, width:number, height:number, depths:Map, byId:Map}}
 */
export function layoutGraph(graph) {
  const ids = involvedIds(graph);
  const adj = adjacency(graph, ids);
  const deg = indegrees(adj);

  // จุดเริ่ม = ไม่มีใครชี้มา · เรียงตามลำดับฉากเดิมเพื่อให้ผังนิ่ง (ไม่สลับทุกครั้งที่เปิด)
  const inOrder = graph.nodes.filter((n) => ids.has(n.id)).map((n) => n.id);
  let roots = inOrder.filter((id) => (deg.get(id) || 0) === 0);
  // ทั้งผังเป็นวงกลมล้วน (ทุกโหนดมีคนชี้มา) → หยิบฉากแรกสุดเป็นจุดเริ่มแทน ไม่งั้นจะไม่มีอะไรถูกวาง
  if (!roots.length && inOrder.length) roots = [inOrder[0]];

  // BFS ระยะสั้นสุด — จบเสมอแม้มีวง เพราะ enqueue เฉพาะตอนเจอความลึกครั้งแรก
  const depths = new Map();
  const queue = [];
  for (const r of roots) { depths.set(r, 0); queue.push(r); }
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    const d = depths.get(cur);
    for (const to of adj.get(cur) || []) {
      if (depths.has(to)) continue;
      depths.set(to, d + 1);
      queue.push(to);
    }
  }
  // ที่เหลือ (ติดอยู่ในวงที่เข้าไม่ถึง) → ต่อท้ายชั้นสุดท้าย
  const maxD = depths.size ? Math.max(...depths.values()) : 0;
  for (const id of inOrder) if (!depths.has(id)) depths.set(id, maxD + 1);

  // จัดแถวในแต่ละคอลัมน์ตามลำดับฉากเดิม
  const rows = new Map();
  const placed = [];
  for (const id of inOrder) {
    const d = depths.get(id);
    const row = rows.get(d) || 0;
    rows.set(d, row + 1);
    const n = graph.byId.get(id);
    placed.push({
      ...n, depth: d, row,
      x: PAD + d * (NODE_W + GAP_X),
      y: PAD + row * (NODE_H + GAP_Y),
    });
  }
  const cols = rows.size ? Math.max(...depths.values()) + 1 : 0;
  const maxRow = rows.size ? Math.max(...rows.values()) : 0;
  return {
    placed,
    byId: new Map(placed.map((p) => [p.id, p])),
    depths,
    width: cols ? PAD * 2 + cols * NODE_W + (cols - 1) * GAP_X : 0,
    height: maxRow ? PAD * 2 + maxRow * NODE_H + (maxRow - 1) * GAP_Y : 0,
  };
}

/**
 * วิเคราะห์สุขภาพของผัง — ผู้เขียนจะได้เห็นทันทีว่าเรื่องขาดตรงไหน
 * roots      = ฉากเปิดเรื่อง (ไม่มีทางเลือกไหนชี้มา)
 * endings    = ฉากจบ (ไม่มีทางเลือกออก)
 * unreachable= อยู่ในผังแต่เดินจากจุดเริ่มไปไม่ถึง
 * cycles     = ฉากที่อยู่ในวงวนซ้ำ
 * dangling   = ทางเลือกที่ยังไม่ได้ระบุปลายทาง (หรือชี้ไปฉากที่ถูกลบแล้ว)
 */
export function analyzeGraph(graph) {
  const ids = involvedIds(graph);
  const adj = adjacency(graph, ids);
  const deg = indegrees(adj);
  const inOrder = graph.nodes.filter((n) => ids.has(n.id)).map((n) => n.id);

  const roots = inOrder.filter((id) => (deg.get(id) || 0) === 0);
  const endings = inOrder.filter((id) => !(adj.get(id) || []).length);

  // เข้าถึงได้จากจุดเริ่ม (ถ้าไม่มีจุดเริ่มเลย = วงล้วน → ถือว่าเข้าถึงได้หมด ไม่ต้องเตือนซ้ำกับ cycles)
  const seen = new Set(roots);
  const stack = [...roots];
  while (stack.length) {
    const cur = stack.pop();
    for (const to of adj.get(cur) || []) if (!seen.has(to)) { seen.add(to); stack.push(to); }
  }
  const unreachable = roots.length ? inOrder.filter((id) => !seen.has(id)) : [];

  // หาโหนดในวง: DFS สีขาว(0)/เทา(1)/ดำ(2) — เจอขอบชี้กลับไปโหนดเทา = มีวง
  const color = new Map(inOrder.map((id) => [id, 0]));
  const inCycle = new Set();
  for (const start of inOrder) {
    if (color.get(start) !== 0) continue;
    const path = [];                          // เส้นทางปัจจุบัน — ใช้ตัดวงออกมาตอนเจอขอบย้อนกลับ
    const st = [{ id: start, i: 0 }];
    color.set(start, 1); path.push(start);
    while (st.length) {
      const top = st[st.length - 1];
      const outs = adj.get(top.id) || [];
      if (top.i < outs.length) {
        const to = outs[top.i++];
        const c = color.get(to);
        if (c === 1) {                        // ขอบย้อนกลับ → ทุกโหนดตั้งแต่ to ถึงปลายทางคือวง
          const at = path.indexOf(to);
          if (at >= 0) for (let k = at; k < path.length; k++) inCycle.add(path[k]);
        } else if (c === 0) {
          color.set(to, 1); path.push(to); st.push({ id: to, i: 0 });
        }
      } else {
        color.set(top.id, 2); path.pop(); st.pop();
      }
    }
  }

  const dangling = graph.edges.filter((e) => e.dangling);
  return {
    roots, endings, unreachable,
    cycles: [...inCycle],
    dangling,
    total: ids.size,
    choiceCount: graph.edges.length,
  };
}

/** สรุปเป็นข้อความไทยสั้น ๆ สำหรับแถบสถิติบนหัวผัง */
export function graphSummary(a) {
  return `${a.total} ฉากในผัง · ${a.choiceCount} ทางเลือก · ${a.roots.length} จุดเริ่ม · ${a.endings.length} ตอนจบ`;
}

/**
 * ไล่ทุกเส้นทางจากจุดเริ่มถึงตอนจบ (ตัดวงด้วยการห้ามซ้ำในเส้นทางเดียวกัน)
 * ใช้แสดง "เส้นทางที่เป็นไปได้" ในแผง inspector — จำกัดจำนวนกันเรื่องใหญ่ระเบิด
 */
export function enumeratePaths(graph, startId, limit = 40) {
  const ids = involvedIds(graph);
  const adj = adjacency(graph, ids);
  if (!ids.has(startId)) return [];
  const out = [];
  const walk = (id, path) => {
    if (out.length >= limit) return;
    const next = (adj.get(id) || []).filter((t) => !path.includes(t));
    if (!next.length) { out.push([...path]); return; }
    for (const t of next) { walk(t, [...path, t]); if (out.length >= limit) return; }
  };
  walk(startId, [startId]);
  return out;
}
