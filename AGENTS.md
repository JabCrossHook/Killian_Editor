# AGENTS.md — คู่มือสำหรับ AI agent (opencode ฯลฯ) ที่ทำงานกับ Killian 2

Killian 2 (คิเลียน / K2) — โปรแกรมเขียนนิยาย+บทภาพยนตร์ แบบพกพา
Electron 43 + ProseMirror · Thai-first · เก็บไฟล์เป็น Markdown + JSON (เข้ากับ v1 ได้ 100%)

---

## ⚙️ คำสั่งที่ต้องรู้ (บังคับ)

```bash
node build.js          # bundle src/*.js → renderer/bundle.js (esbuild IIFE) — รันหลังแก้ทุกครั้ง
```

**e2e (ต้องผ่านก่อน commit ทุกครั้ง):**
```bash
ps aux | grep -iE "electron|xvfb" | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null; sleep 1
node build.js
node test/fixture.js /tmp/k2proj                       # สร้างโปรเจกต์ทดสอบ
export KILLIAN_TEST=1 KILLIAN_TEST_PROJECT=/tmp/k2proj
xvfb-run -a --server-args="-screen 0 1500x950x24" ./node_modules/.bin/electron . --no-sandbox --disable-gpu
# ผลอยู่ /tmp/k2result.txt — บรรทัดสุดท้ายต้องเป็น "ALL OK"
```
ปัจจุบัน **1,012 checks · ALL OK** — ห้ามทำให้จำนวนลดลง
(บน Windows: `node test/fixture.js C:\tmp\k2proj` แล้วตั้ง `KILLIAN_TEST_PROJECT=C:\tmp\k2proj`
 ผลออกที่ `C:\tmp\k2result.txt` · unit test `.cjs` ใช้ `os.tmpdir()` แล้วรันได้ทั้งสองระบบ)

---

## 📁 โครงสร้างไฟล์ (src/)

### แกนกลาง (import จากที่นี่เสมอ)
- **core.js** — `$`, `el`, `state`, `smart`, `log`, `setStatus`, ค่าคงที่ (`DEFAULT_SETTINGS`, `SCENE_STATUSES`, `SCENE_COLORS`, `BUILTIN_CATS`, `CAT_ICON`, `BASE_ED_FS`, ...) — **ทุกโมดูลใหม่ import จากที่นี่**
- **app.js** (~5,300 บรรทัด) — orchestrator: bootstrap, explorer (buildTree/tree), tabs, toolbar (floatBar), commands, shortcuts, zoom, **selftest ทั้งหมด**

### engine (pure logic — มีอยู่เดิม)
editor.js · screenplay.js · md.js (⚠️ CommonJS) · smart.js · spell.js · wiki.js · gallery.js · network.js · planner.js · timeline.js · maps.js · compile.js · fountain.js · sceneFilter.js · search.js · ui.js · nav.js
- **sp-format.js** (alpha.56, บริสุทธิ์) — รูปแบบบทภาพยนตร์ระดับใช้งานจริง (ข้อ 81–85, 92, 97):
  `PAPER_SIZES`/`MARGIN_DEFAULTS`/`linesPerPage`/`textWidth` · `SP_ELEMENT_CONFIG` (เยื้อง/กว้าง/เว้นบรรทัด
  ต่อ element · หน่วยนิ้ว วัดจากขอบกระดาษ) · `SP_ELEMENT_STYLES` (screen vs print) · `PAGE_BREAK_RULES` ·
  `SP_STRINGS` · `mergeSpFormat(user)` · `pageCssVars()` · `spCss()` (สร้าง CSS + `@page` เป็นข้อความ) ·
  `paginate()`/`pageCount()`/`wrapLines()`/`splitText()` · `newRoster`/`normalizeRoster`/`rosterToText`
  → re-export ผ่าน core.js · **unit test 74 ข้อ** (`node test/sp-format.test.cjs`)

### Core Infrastructure (pure logic — **ยังไม่มี UI · รอต่อ**) — spec อยู่ใน `docs/`
- **panels/panel-layout.js + panel-store.js** (ข้อ 8) — dock/snap/tab group/float/collapse + `PanelManager` (registerPanel/showPanel/dockPanel/floatPanel/groupPanels) → [docs/08-panel-system.md](docs/08-panel-system.md)
- **layout/split-layout.js** (ข้อ 40) — recursive split + drag handle(snap 50%) + `SplitManager` · เชื่อม Panel ผ่าน `leaf.tabId` → [docs/40-split-view.md](docs/40-split-view.md)
- **kanban/kanban-core.js** (ข้อ 12) — จัดกลุ่มฉากตาม status + ลากการ์ด + `KanbanBoard` (เขียน scenes.json อัตโนมัติ) → [docs/12-kanban.md](docs/12-kanban.md)
- **world-story/auto-link.js** (ข้อ 86) — auto-link Wiki↔ฉาก + backlinks index ใน project.khn.json → [docs/86-world-story.md](docs/86-world-story.md)
- **auto-task/event-queue.js** (ข้อ 88) — EventBus + คิวงานเบื้องหลัง + taskLog[] → [docs/88-auto-task.md](docs/88-auto-task.md)

### AI & Advanced (pure logic — **ยังไม่มี UI · รอต่อ**) — spec อยู่ใน `docs/`
- **ai/ai-core.js** (ข้อ 72) — แกน AI ทั้งหมด: provider (openai/claude/ollama) · `AIClient` (retry/ไม่ throw) ·
  `KeyStore`(ai-key.json)/`mask`/`redact` · `RateLimiter` · `CostTracker` · RAG (`chunkText`/`localEmbed`/`VectorIndex`/`RagPipeline`) ·
  `extractJson`/`validate` → [docs/72-ai-core.md](docs/72-ai-core.md)
- **ai/ai-assistant.js** (ข้อ 72) — `aiAssistant(prompt, context, options)` + `expand`/`summarize`/`rewrite`/`changeTone`
- **ai/ai-plot.js** (ข้อ 73) — `detectPlotHoles` + ตรวจออฟไลน์ (เวลาย้อนกลับ/pov ลอย) → [docs/73-ai-plot.md](docs/73-ai-plot.md)
- **ai/ai-dialogue.js** (ข้อ 74) — `generateDialogue` (อ่านบุคลิกจาก Wiki · ออกเป็น fountain `@ชื่อ`)
- **ai/ai-character.js** (ข้อ 75) — `checkConsistency` + ตรวจคำลงท้าย/สรรพนามไทยแบบออฟไลน์
- **ai/ai-world.js** (ข้อ 76) — `generateWorld` 6 เทมเพลต → `toWikiEntity`
- **ai/ai-chat.js** (ข้อ 79) — `ChatSession`/`chat` (RAG ฉาก+วิกิ+เส้นเวลา · สตรีม · อ้างอิงที่มา)
- **tools/thesaurus.js** (ข้อ 67) — เอนจินคำพ้อง (คลังไทยในตัว/Datamuse/แคช) — คนละไฟล์กับ `src/thesaurus.js` ที่เป็น UI เดิม
- **import/import-scrivener.js** (ข้อ 63) — `.scrivx` XML + RTF(`\uNNNN` ไทย) → โครง Killian
- **comments/comment-core.js** (ข้อ 64) — คอมเมนต์มีเธรด เก็บใน `.md` (บล็อก `<!-- k2-comments -->`) + สมอตามข้อความ

**กฎของโมดูล AI**: ไม่ยิงเน็ตเอง (รับ `client`/`http` เข้ามา) · ไม่ throw (คืน `{ok:false,error,code}` ภาษาไทย) ·
`buildXPrompt`/`parseX` เป็น pure เสมอ · คีย์อยู่ `ai-key.json` เท่านั้น · ฟีเจอร์ตรวจสอบมีชั้นออฟไลน์ก่อน

ทุกตัวไม่แตะ DOM/fs (ต่อไฟล์ผ่าน `io` adapter = `kapi`) · `npm run test:unit` = **805 checks**
UI ที่ต้องทำต่อ: `panels/panel-ui.js` · `layout/split-ui.js` · `kanban/kanban-ui.js` · แผง "ฉากที่กล่าวถึง" ในหน้า Wiki ·
แผง AI (ผู้ช่วยเขียน/ตรวจปม/บทสนทนา/สร้างโลก/แชท) · หน้านำเข้า Scrivener · แถบคอมเมนต์ข้างฉาก
แล้วค่อยต่อ entry point ตามกฎข้อ 7 (เมนู main.js + `case` ใน `handleCommand`)

### feature modules (แยกจาก app.js — จุดที่ feature ใหม่มาต่อยอด)
- **dashboard.js** — แดชบอร์ด/สถิติ/analytics
- **books.js** — จัดการเล่ม/ร่าง (Book Manager)
- **timeline-ui.js / maps-ui.js** — UI ของเส้นเวลา/แผนที่
- **wiki-ui.js** — หมวด Wiki + เอนทิตี้ (เพิ่ม/เปิด/ทำสำเนา)
- **scene-ops.js** — จัดการฉาก+บท (เพิ่ม/แก้/ลบ/ย้าย/เมนู)
- **section-ops.js** — จัดการเล่ม (section)
- **scene-props.js** — แผงคุณสมบัติฉาก
- **dialogs.js** — ตั้งค่า/ประวัติเวอร์ชัน/changelog/log viewer
- **recycle.js** — ถังขยะ
- **roster-ui.js** (alpha.56) — หน้ารายชื่อตัวละคร (Cast of Characters) ประจำเล่ม → `<เล่ม>/roster.json`

**feature ใหม่ที่เป็นไฟล์ของตัวเอง** (home page, kanban, mood board, scene table ฯลฯ) → สร้างไฟล์ใหม่ใน src/ import จาก core.js + engine ที่เกี่ยว แล้วให้ app.js `import { openX } from './x.js'` + เพิ่ม entry point (เมนู/ปุ่ม/command)

---

## 🚨 กฎเหล็ก (ทำผิดแล้ว build ผ่านแต่ runtime พัง — เจอเฉพาะตอน e2e)

1. **import helper ให้ครบทุกตัว** — `$`, `el`, `state`, `setStatus`, `log` ฯลฯ ต้อง import จาก core.js
   esbuild ปล่อย identifier ที่ไม่รู้จักเป็น runtime global → **`node build.js` ผ่าน แต่พังตอนใช้งาน**
   → ทุกครั้งที่เพิ่ม/ยกโมดูล ต้องรัน e2e ยืนยัน

2. **ES module: ตัวแปร `let` ที่ reassign export ข้ามไฟล์ไม่ได้** (import เป็น read-only binding)
   ถ้าต้องแชร์ตัวแปร mutable ข้ามไฟล์ → เก็บใน object: `const X_C = { v: null }` แล้วใช้ `X_C.v`
   (ตัวอย่างในโค้ด: `INV_C.m`, `mapsState_C.s`, `propsTarget_C.t`)

3. **md.js เป็น CommonJS** (`module.exports = {...}`) ไม่ใช่ ES export
   import แบบ ES ได้ปกติ (`import { parseMdFile, dumpMdFile, countWords } from './md.js'`) — esbuild interop ให้

4. **namespace import ต้องตรง** — `import * as spell from './spell.js'` แล้วเรียก `spell.check(...)`
   อย่าเปลี่ยนเป็น `import { check }` ถ้าโค้ดเรียกแบบ `spell.check`

5. **`state` ใน editor.js/screenplay.js/smart.js คือ ProseMirror EditorState (local)** ไม่ใช่ app `state`
   → **ห้ามแตะไฟล์ engine เหล่านี้เพื่อ "แก้ import"** — จะ shadow ผิด

6. **circular import (feature → app.js) ใช้ได้** ถ้าเรียกฟังก์ชันตอน runtime (event handler / หลังโหลด)
   ไม่ใช่ตอน module top-level · ฟังก์ชันใน app.js ที่ feature ต้องใช้ต้องมี `export` หน้า declaration

---

## 🚧 กฎเพิ่มหลังรอบ alpha.40 (บทเรียนจากฟีเจอร์ชุดที่ต่อไม่ครบ)

7. **เขียนโมดูลแล้วต้องต่อจุดเข้าใช้งานให้ครบ** — `import` ใน app.js อย่างเดียว = ผู้ใช้เข้าไม่ถึงเลย
   ต้องมีอย่างน้อยหนึ่งอย่าง: เมนูใน `main.js` (`send('channel')`) + `case 'channel'` ใน `handleCommand`
   หรือปุ่ม/คีย์ลัดในตาราง `SHORTCUTS` · เช็คเร็ว: ชื่อฟังก์ชันต้องปรากฏใน app.js **มากกว่า 1 ครั้ง**
8. **คีย์ลัดใหม่ต้องเข้าตาราง `SHORTCUTS` เท่านั้น** ห้ามผูก `document.addEventListener('keydown')` เอง
   (จะชนกับคีย์เดิมโดยไม่รู้ตัว — มี selftest กันคีย์ซ้ำแล้ว)
9. **`selection.anchorNode` เป็น Text node** → ไม่มี `.closest()` ต้องขึ้น `parentElement` ก่อน
   `anchorNode.closest?.(...)` จะคืน undefined เงียบ ๆ ทำให้ฟีเจอร์ตายโดยไม่มี error
10. **ไฟล์ไบนารีห้ามผ่าน `readFile`/`writeFile`** (main เขียน utf-8 → ไบต์ ≥0x80 บวม ไฟล์เสีย)
    ใช้ `kapi.readBytes` / `kapi.writeBytes` / `kapi.copyFile`
11. **ข้อความจากผู้ใช้ห้ามลง `innerHTML`** — ใช้ `el(tag, cls, text)` (textContent) เสมอ
12. **เรียก API ภายนอกต้องผ่าน `kapi.httpFetch`** (main process) — `fetch` ใน renderer ติด CORS
    และของลับ (API key) เก็บไฟล์แยก ห้ามลง `project.khn.json`

---

## ✅ ทุกฟีเจอร์ใหม่ต้องมี selftest (ห้ามลด check)

selftest อยู่ใน `runTest()` ท้าย app.js — รูปแบบ `check('ชื่อไทย', เงื่อนไข, ข้อมูล debug)`
- เพิ่มฟีเจอร์ = เพิ่ม `check(...)` พิสูจน์ว่ามันทำงานจริง (ไม่ใช่แค่มี element)
- วาง check ในบริบทที่ state พร้อม (แท็บ/โปรเจกต์เปิดอยู่จริง)
- `check` ตัวแรกที่ fail จะ `throw` → STOP ทั้งชุด: ดู `/tmp/k2result.txt` หา `FAIL`/`STOP`
- ห้ามลบ check เดิมเพื่อให้ผ่าน

---

## 📝 convention

- ข้อความ UI + คอมเมนต์เป็น **ภาษาไทย**
- ไฟล์งานผู้ใช้: Markdown (`.md`) + JSON (draft.json/scenes.json/section.json/project.khn.json) — เข้ากับ v1
- อย่า commit `renderer/bundle.js` เป็นการแก้มือ — มันถูก generate จาก `node build.js`
- format/lint: ตามสไตล์เดิมในไฟล์ (2-space indent, single quote, ไม่มี semicolon-less)

---

## เครื่องมือช่วย refactor (tools/)
- `tools/refactor.py` — ยกกลุ่มฟังก์ชันจาก app.js → ไฟล์ใหม่ (auto-detect import + auto-export cross-ref)
- `tools/fiximports2.py` — เติม import ที่ขาดในกลุ่ม feature modules (spoke-only)
- `tools/redirect.py` — แก้ import ข้ามโมดูลให้ชี้แหล่งจริง
- `REFACTOR_PROGRESS.md` — บันทึกความคืบหน้า/บทเรียนการแยกไฟล์

---

## 🔌 เอนจินใหม่ (alpha.39) — logic เสร็จ, รอต่อ UI + wire เข้า app.js

3 ไฟล์นี้เป็น **pure logic บริสุทธิ์** (ไม่แตะ DOM/kapi) ยังเป็น orphan (ยังไม่ถูก import จาก app.js)
มี unit test ครบแล้ว (`node test/{search-engine,panel,split}.test.cjs`) — **opencode ต่อ UI + wire + เพิ่ม selftest ใน app.js**

### search-engine.js (ข้อ 33 — full-text search)
```js
import { SearchIndex, indexProject } from './search-engine.js';
const idx = await indexProject(state.root, kapi, parseMdFile);   // สร้าง index ครั้งเดียว (cache ใน state)
const results = idx.search('ทอร่า เค้ก');                          // AND · OR · NOT · title:/tags:/status:
// results: [{ id, path, title, status, score, freq, matches:[{line, pos, snippet}] }]
```
UI ที่ต้องทำ: ช่องค้นหา global (Ctrl+Shift+F?) → เรียก idx.search → แสดง results (path+snippet+line) → คลิกเปิดไฟล์+กระโดดบรรทัด · rebuild index เมื่อ saveTab/เพิ่ม-ลบไฟล์

### panels/panel-layout.js + panel-store.js (ข้อ 8 — docking)
```js
import * as PL from './panels/panel-layout.js';
import { PanelStore } from './panels/panel-store.js';
const store = new PanelStore();                     // ใช้ localStorage อัตโนมัติ
store.load();
const zone = PL.snapZone(mouseX, mouseY, paneRect); // 'left'|'right'|'top'|'bottom'|'center'|null
store.update(PL.dockPanel(store.root, targetId, zone, PL.panel('outline','เค้าโครง')));
```
UI ที่ต้องทำ (panel-ui.js): วาด tree จาก store.root, drag panel + แสดง drop-zone hint, ต่อ resize handle → PL.resizeDock, tab bar → PL.moveTab/splitTab

### layout/split-layout.js (ข้อ 40 — split view)
```js
import * as SL from './layout/split-layout.js';
import { SplitStore } from './layout/split-layout.js';   // store อยู่ในไฟล์เดียวกัน
const store = new SplitStore(); store.load();
store.update(SL.splitPane(store.root, targetLeafId, 'right', tabId));  // ลากแท็บไปขอบ
store.update(SL.resizeSplit(store.root, splitId, i, ratio));           // มี snap 50% ในตัว
```
UI ที่ต้องทำ (split-ui.js): วาด pane recursive จาก store.root (leaf.tabId → เนื้อหาแท็บ), drag handle ระหว่าง pane, drop-zone ที่ขอบ pane → splitPane · เชื่อม Panel System ผ่าน tabId ร่วมกัน
