---
name: killian-2
description: Build, maintain, extend, and debug Killian 2 (คิเลียน / Killian Editor v2 / K2) — a portable Electron 43 + ProseMirror desktop app for writing novels + screenplays, Thai-first, storing everything as Markdown + JSON (100% file-compatible with the old Python v1). Use whenever the user asks to add a feature, fix a bug, change the UI, adjust the Wiki/screenplay/explorer/spellcheck/panel systems, or ship a new build for this writing app. Triggers on "คิเลียน", "Killian", "Killian 2", "K2", "โปรแกรมเขียน", "บทหนัง/บทภาพยนตร์", "screenplay editor", "ProseMirror", "SmartType", "wiki", "story network", "explorer", "scenes.json", "draft.json", "templates.json", "ตรวจคำผิด", "spell check", "panel docking", "floating bar", "e2e/selftest", "ถังขยะ", "คลังรูป", "เวิร์กโฟลว์ส่งออก/compile", "จัดการเล่ม/book manager", "เส้นเวลา/timeline", "แผนที่/maps", "โหมดหน้ากระดาษ/paper mode", "ซูม/zoom", "จัดหน้า/align", "หมวด wiki", and any request about this novel/screenplay app — even a pasted stack trace or a bare "แก้บั๊ก".
---

# Killian 2 (คิเลียน อีดิเตอร์ v2)

โปรแกรมเขียนนิยาย + บทภาพยนตร์ของ Top — **Electron 43 + ProseMirror**, พกพาได้, ไทยเป็นหลัก
เขียนใหม่จาก v1 (Python/Tkinter) แต่ **ไฟล์งานเข้ากันได้ 100%** (.md + .json เหมือนเดิม)

**คุยกับผู้ใช้เป็นภาษาไทย กระชับ ตรงไปตรงมา** ผู้ใช้ = Top (นักออกแบบ/dev, กรุงเทพฯ)

---

## เริ่มงานทุกครั้ง: เอาซอร์สมาก่อน

แซนด์บ็อกซ์อาจล้างระหว่าง task — เช็คก่อน ถ้าไม่มีให้ขอ `Killian2-src.zip` (ล่าสุด) แตกที่ `/home/claude/work/v2_extract/`

```bash
ls /home/claude/work/v2_extract/Killian2/src/app.js 2>/dev/null && echo "มีแล้ว" || echo "ขอ zip"
cd /home/claude/work/v2_extract/Killian2 && npm install   # ~1-2 นาที (node_modules ไม่อยู่ในซิป)
```

Src zip **ไม่มี node_modules** แต่ **มี `renderer/bundle.js` ที่ build แล้ว** + **dict** (`renderer/assets/dict_th.txt` 1.5MB, `dict_en.txt`) → รันได้หลัง npm install ทันที

---

## ข้อห้าม/หลักที่ผู้ใช้ย้ำ

| หลัก | หมายเหตุ |
|---|---|
| **ไทย 100%** ทุก UI | Fade In/Final Draft ใช้ไม่ได้เพราะไม่รองรับไทย |
| **พกพาได้ ไม่ต้องติดตั้ง** | win portable / mac .app |
| **ไฟล์แก้นอกโปรแกรมได้** | เนื้อหา = .md · เมทาดาทา = .json |
| **คีย์ลัดทำงานทุกแป้นพิมพ์** | จับด้วย `e.code` (ปุ่มกายภาพ) ไม่ใช่ตัวอักษร |
| **"เอาให้ครบก่อน แล้วแก้บั๊กทีเดียว"** | ผู้ใช้ชอบทำหลายฟีเจอร์รวดเดียว |

---

## สถาปัตยกรรม (เสถียร)

- **main.js** — electron main: IPC `H('channel', fn)` (fs/dialog/print/printToPdf/recent/spell/mtime/writeImageData), frameless titlebar (`frame:false`), contextIsolation
- **preload.js** — บริดจ์ `kapi` (readFile/writeFile/readJson/exists/join/mkdir/move/remove/listFiles/listDirs/mtime/copyInto/writeImageData/spellBase/spellExtra/spellAddWord/spellDownload/spellHasBase/testShot/**openFileDialog**). **ไม่มี writeJson** (ใช้ writeFile + JSON.stringify) · `saveAsDialog(name, kind?)` เลือกฟิลเตอร์ตามนามสกุลให้เอง
- **src/** (esbuild → `renderer/bundle.js`):
  - `md.js` — พาร์เซอร์ .md ↔ doc (พอร์ตตรงจาก v1 → ไฟล์เข้ากันได้ 100%)
  - `editor.js` — `KEditor` (นิยาย): schema + `mentionPlugin` + `spellPlugin` + export `imageLightbox`
  - `screenplay.js` — `SPEditor` (บทหนัง): fountain, Enter=element ถัดไป, **Ctrl+↑/↓ สลับ element** (Tab สงวนให้ SmartType), มี spellPlugin
  - `fountain.js` — `SP_ELEMS/TAB_CYCLE/NEXT_ELEM/SCENE_PREFIX/TIMES/TRANSITIONS`
  - `smart.js` — `SmartType` (เดาชื่อขณะพิมพ์ · prefix match ไทยไม่มีช่องว่าง)
  - `spell.js` — เอนจินตรวจคำผิด (ไทย maximal-matching DP + อังกฤษ wordlist+morphology) · `loadBase/setExtra/check/ready`
  - `wiki.js` — `WikiEditor` + `imageLightbox`
  - `gallery.js`, `network.js`, `ui.js` (**`window.prompt()` = no-op ใน Electron!** ใช้ ask/confirmBox)
  - **`core.js`** — แกนกลางที่ทุกโมดูลใช้ร่วม: `$`,`el`,`state`,`smart`,`log`,`setStatus` + ค่าคงที่ (`DEFAULT_SETTINGS`,`SCENE_STATUSES`,`SCENE_COLORS`,`BUILTIN_CATS`,`CAT_ICON`,`BASE_ED_FS`,`ZOOM_*`) — **ทุกไฟล์ใหม่ import จากนี่**
  - `app.js` (~5,300 บรรทัด: bootstrap/explorer(buildTree)/tabs/toolbar(floatBar)/zoom(pageZoom)/commands/shortcuts/**selftest**) — orchestrator
  - **แยกจาก app.js แล้ว (alpha.39, feature modules):** `dashboard.js` · `books.js` · `timeline-ui.js` · `maps-ui.js` · `wiki-ui.js` · `scene-ops.js` · `section-ops.js` · `scene-props.js` · `dialogs.js` · `recycle.js` — จุดที่ feature ใหม่มาต่อยอด (ดู **AGENTS.md** สำหรับกฎ import/circular/CommonJS ก่อนแก้)
  - **โมดูล feature รอบ .39–.40 (ต่อเมนูครบแล้วทุกตัว):** `home-ui.js` · `tag-pane.js` · `global-search.js` · `scene-table.js` · `scratchpad.js` · `quick-open.js` (fuse.js) · `custom-status.js` (`allStatuses()` = มาตรฐาน+ที่ผู้ใช้เพิ่ม — scene-ops/scene-props ใช้ตัวนี้) · `focus-mode.js` (มี `cursorBlock()` ที่ typewriter ใช้ร่วม) · `typewriter.js` · `word-history.js` · `backup.js` (`backupIfDue` รายวัน) · `export-zip.js` (jszip + `writeBytes`) · `export-blog.js` · `comments/comment-core.js`+`comment-ui.js` (แผงคอมเมนต์ · เก็บท้ายไฟล์ .md — `comments.js` เดิมถูกลบใน .48) · `thesaurus.js` (คืน menu items ให้เมนูคลิกขวาเดิม) · `project.js` (เทมเพลตโปรเจกต์) · `ai-settings.js`+`ai-summary.js` (key แยกไฟล์ · `kapi.httpFetch`) · `branching-ui.js` · `floorplan-ui.js` · `player-choices.js` · `visual-tags.js` (ชิปสีในตารางฉาก) · `session-notes.js` · `centralize-ui.js`
  - **`relationship-types.js`** (alpha.45, บริสุทธิ์) — 9 ประเภทความสัมพันธ์ + สี/ไอคอน: `REL_TYPES`/`REL_COLOR`/`REL_LABEL`/`REL_ICON`,
    `categorizeRole(role)` เดาประเภทจากบทบาทไทย+อังกฤษ (เช็ค mentor/ลูก-น้อง-ค้า-หนี้ **ก่อน** family ไม่งั้น "ลูก" ดูดหมด),
    `categorizeWith(map, role)` ให้ตาราง `categories` ใน `renderer/inverse_roles.json` ชนะ regex. re-export ผ่าน core.js · **unit test 28 ข้อ**
  - **`sensory-profile.js`** (alpha.45) — บรรยากาศรับรู้ของสถานที่: `renderSensoryProfile(wrap, entity, onDirty)` (เรียกซ้ำได้ ไม่ซ้ำช่อง),
    `ensureSensory` (เรียกใน `addEntity` + `openEntity`), `isSensoryEntity`/`sensoryFilled` · เก็บใน `entity.sensoryProfile`
  - **`branch-graph.js`** (alpha.42, บริสุทธิ์) — เอนจินผังแตกสาย: `buildGraph` (choices→edges, ตั้ง `dangling`), `layoutGraph` (จัดชั้น BFS ระยะสั้นสุด → x/y), `analyzeGraph` (roots/endings/unreachable/cycles ด้วย DFS สี), `enumeratePaths`. UI = `branching-ui.js` วาด SVG (เส้น) + div (กล่อง). **unit test แยก 37 ข้อ** (`test/branch.test.cjs`)
  - **`search-engine.js`** (alpha.39, บริสุทธิ์) — ค้นหาเต็มข้อความทั้งโปรเจกต์: tokenizer ไทย (`Intl.Segmenter('th')`+bigram fallback) → inverted index → `SearchIndex.build/search` (คำเดียว/AND/OR/NOT/`field:`) → snippet+line+score. `indexProject(root,kapi,parseMd)` เป็น integration layer. **unit test แยก · ค้น 1,000 ไฟล์ ~16ms/คิวรี**
  - **`panels/panel-layout.js` + `panel-store.js`** (alpha.39, บริสุทธิ์ · **ห้ามแก้**) — layout tree ของ panel: `snapZone`,`dockPanel`,`addAsTab/moveTab/splitTab`,`resizeDock`,`removePanel`(+collapse) · store: `serializeLayout`/versioning/migrate + `PanelStore`(รับ storage adapter) + `PanelManager`
  - **`panels/panel-renderer.js` + `panel-drag.js` + `panel-ui.js`** (alpha.46) — **UI จริงของ Panel System** (ดูหัวข้อด้านล่าง)
  - **`layout/split-layout.js`** (alpha.39, บริสุทธิ์) — recursive split tree: `splitPane`(ลากขอบ→row/col),`resizeSplit`(+snap 50%),`removeLeaf`(+collapse), `leaf.tabId` เชื่อมกับ Panel System · store: `serializeSplit`/`SplitStore`. UI = `split-ui.js` (`renderSplitTree`/`initSplitSystem` + โหมดเทียบ 2 ช่องแบบเดิม)
  - `compile.js` — **เอนจินเวิร์กโฟลว์ส่งออก** (บริสุทธิ์ ไม่แตะ DOM/fs): `STEP_DEFS` 3 stage (model/render/text), `PRESETS`×7, `runWorkflow(model,wf)`, `mdToHtml`, strip helpers — มี unit test แยก
  - `timeline.js` — **เอนจินเส้นเวลา + Gantt** (บริสุทธิ์): `extractNum` (ถอดเลขจากข้อความไทย "ปีที่ 1,024"→1024), `sortEvents`, `mergeTimeline(events,sceneEvents)` (**ต้อง copy ทุก field ที่ UI ใช้ รวม whenEnd**), `groupByTrack`, `findClashes`, `ganttData/ganttBar/ganttTicks`, `newEvent`
  - **`sp-format.js`** (alpha.56, บริสุทธิ์ · **ข้อ 81–85, 92, 97**) — รูปแบบบทภาพยนตร์ระดับใช้งานจริง
    `PAPER_SIZES`(letter/a4/legal/custom)/`MARGIN_DEFAULTS`(T1 B1 L1.5 R1)/`linesPerPage`(Letter=54)/`textWidth` ·
    `SP_ELEMENT_CONFIG` **หน่วยนิ้ว วัดจากขอบกระดาษแบบ Final Draft** (character 3.7"/3.8" · dialogue 2.5"/3.5") ·
    `SP_ELEMENT_STYLES` screen vs print · `PAGE_BREAK_RULES` · `SP_STRINGS` · `mergeSpFormat(user)` ·
    `pageCssVars()` → `--page-w/--mg-*/--text-w` · `spCss()` **สร้าง CSS + `@page` เป็นข้อความ**
    (`@page` ใช้ CSS var ไม่ได้ · `max-width:calc(100%-x)` ก็ใช้ไม่ได้เพราะ 100% รวมเส้นขอบ 2px → หนีบใน JS แทน) ·
    `paginate()` (MORE/cont'd/CONTINUED · ไม่ทิ้งชื่อตัวละครท้ายหน้า) · `rosterToText()` · **unit test 74 ข้อ**
  - **`roster-ui.js`** (alpha.56, ข้อ 97) — หน้ารายชื่อตัวละคร: หน้าเดี่ยว**ประจำเล่ม** เก็บ `<Section>/roster.json`
    (ไม่อยู่ในฉากเลย) · แท็บ `::roster::<secPath>` · `saveTab()` แยกทางไป `saveRosterTab()` · ไม่มีเลขหน้า
  - `maps.js` — **เอนจินแผนที่** (บริสุทธิ์): `newMap/newPin`, `breadcrumb` (ลำดับชั้น world→city→room ตาม portal), `rootMaps`, `pinStats`, `deleteMap` (ล้าง portal ค้าง), `PIN_COLORS/PIN_KIND`
- **build**: `node build.js` (esbuild bundle src/app.js) — dict แยกไฟล์ไม่ฝัง bundle

โครงโปรเจกต์: `<root>/{project.khn.json, <Section>/{section.json (มี title/order/status/cover/blurb), Draft/<name>/{draft.json, scenes.json, Chapters/<folder>/*.md}}, Wiki|Bible/{characters,locations,items,lore,<หมวดเอง>}/*.json, Images/, Memos/, Snapshots/, Recycle/, timeline.json, maps.json, dictionary.json, Plugins/dictionaries/*.txt}`
- `project.khn.json` เก็บ settings + `compileWorkflows[]` (เวิร์กโฟลว์ผู้ใช้) + `wikiCats[{key,label,icon}]` (หมวด Wiki สร้างเอง)
- `scenes.json` แต่ละ scene row มี `storyDate` (เวลาในเรื่อง สำหรับเส้นเวลา) เพิ่มจากเดิม

---

## E2E test workflow (สำคัญ — ทำทุกครั้งก่อนเชื่อว่าแก้สำเร็จ)

Selftest ใน `app.js` (`check(name, cond, extra)` เขียน PASS/FAIL แล้ว throw ตอน fail). ปัจจุบัน **1,012 checks** target `ALL OK`. เพิ่มฟีเจอร์ = เพิ่ม check เสมอ (ห้ามลด). โมดูลบริสุทธิ์ (compile/timeline/maps/search-engine/panels/split) มี unit test แยกรันด้วย node ก่อน แล้วค่อยเทส UI ใน e2e

**Unit test โมดูลบริสุทธิ์ (alpha.39, รันเร็ว ไม่ต้องเปิด electron):**
```bash
node test/search-engine.test.cjs   # 22 checks — tokenize/AND/OR/NOT/field/snippet/score/perf
node test/panel.test.cjs           # 26 checks — snap/dock/tab/resize/store/migrate
node test/split.test.cjs           # 16 checks — split/resize(snap50)/collapse/store
node test/branch.test.cjs          # 53 checks — graph/layout/cycles/unreachable/dangling/paths + [ข้อความ]ทางเลือก
node test/timeline.test.cjs        # 34 checks — extractNum/sort/merge(whenEnd+refs)/gantt/normalizeRefs
node test/relationship.test.cjs    # 28 checks — REL_TYPES/สี/ไอคอนมีจริง/categorizeRole/categorizeWith
```
`npm run test:unit` รันชุดบริสุทธิ์ทั้งหมดรวดเดียว

**รัน e2e บน Windows ได้ด้วย** (ไม่ต้องมี xvfb — มี electron ใน node_modules อยู่แล้ว):
```powershell
Get-Process electron -EA SilentlyContinue | Stop-Process -Force      # ฆ่า zombie ก่อนเสมอ
New-Item -ItemType Directory -Force C:\tmp | Out-Null                # ผลลัพธ์ /tmp/k2result.txt → C:\tmp\
$p="$env:TEMP\k2proj"; Remove-Item -Recurse -Force $p -EA SilentlyContinue; node test/fixture.js $p
Remove-Item -Force C:\tmp\k2result.txt -EA SilentlyContinue
$env:KILLIAN_TEST="1"; $env:KILLIAN_TEST_PROJECT=$p
& .\node_modules\.bin\electron.cmd . --no-sandbox --disable-gpu *> C:\tmp\k2elec.log
```
**ต้องสร้าง fixture ใหม่ทุกครั้ง** — เทสรูป ("รูป render จริง") พังถ้าใช้โปรเจกต์ที่รันไปแล้วซ้ำ (เทสคลังรูปย้ายไฟล์)
หน้าต่างไม่ปิดเองหลังจบ → รอจน `tail -1 C:\tmp\k2result.txt` = `ALL OK` แล้วค่อยฆ่า process
เทคนิค: ไฟล์ src เป็น ES module แต่ root ไม่ใช่ `type:module` → test เป็น `.cjs` ที่ `esbuild.buildSync({format:'cjs'})` แปลงชั่วคราวแล้ว `require`. โมดูลบริสุทธิ์ (ไม่ import DOM/kapi) จึงเทสได้ตรง ๆ — เพิ่ม unit test ทุกครั้งที่เพิ่ม logic ในไฟล์เหล่านี้

```bash
# 1. KILL ZOMBIE ก่อนทุกครั้ง (pkill ใช้ไม่ได้ — ดูบทเรียน)
ps aux | grep -iE "electron|xvfb" | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null; sleep 1
cd /home/claude/work/v2_extract/Killian2
node build.js 2>&1 | tail -1                              # ต้องเห็น "bundle OK"
rm -f /tmp/k2result.txt
node test/fixture.js /tmp/k2proj >/dev/null 2>&1         # สร้างโปรเจกต์ทดสอบ (เทสฮาร์ดโค้ด path นี้)
export KILLIAN_TEST=1 KILLIAN_TEST_PROJECT=/tmp/k2proj
setsid bash -c 'cd /home/claude/work/v2_extract/Killian2 && xvfb-run -a --server-args="-screen 0 1500x950x24" ./node_modules/.bin/electron . --no-sandbox --disable-gpu >/tmp/k2elec.log 2>&1' </dev/null >/dev/null 2>&1 &
sleep 52                                                  # dict โหลด + spell + เทสเยอะขึ้น ~50s
grep -c PASS /tmp/k2result.txt; tail -1 /tmp/k2result.txt # ต้องลงท้าย "ALL OK"
grep -E "FAIL|STOP" /tmp/k2result.txt | head -3
```

- `kapi.testShot('/tmp/x.png')` = สกรีนช็อต · **view tool คืน [image] อ่านไม่ได้** → PIL pixel-check crop แทน
- ผลสตรีมทีละบรรทัด — **อย่าอ่านก่อนจบ** (รอ ALL OK / sleep ครบ)
- เพิ่มเทสในบล็อกที่ tab นั้น active สดๆ อยู่แล้ว (ดูบทเรียน matchesNode)

---

## บทเรียน env/บั๊ก (เจ็บมาแล้ว — อย่าซ้ำ)

1. **ZOMBIE ELECTRON** (เผา ~15 call): `pkill -9 -f electron` **ไม่ฆ่า** electron ใต้ setsid+xvfb-run (หลุด process tree) — zombie ถือ `/tmp/k2result.txt` เก่า **และ** ล็อก esbuild ไม่ให้เขียน bundle.js ทับ → อ่านผลเก่าซ้ำทั้งที่ build OK. **แก้: kill ด้วย pid จริงทุกครั้ง** ยืนยัน ps เหลือ 0. นาฬิกาแซนด์บ็อกซ์เพี้ยน — ตัดสิน stale จาก **เนื้อหา** ไม่ใช่ mtime
2. **ProseMirror "reading 'matchesNode'"**: เทสที่ `activate(t.file)+setMarkdown()+refreshMentions/Spell()` บน tab ท้าย run → view/DOM ไม่ sync. **แก้: วางเทส decoration ในบล็อกที่ tab นั้น active สดๆ พร้อมเนื้อหา**
3. **`window.prompt()` = no-op ใน Electron** → modal ใน `ui.js`
4. **e2e ไม่ idempotent เพราะ localStorage คงค้างข้าม run** (`k2-ui-layout`) → ต้น UI test: ผนึกแผงลอย + `localStorage.removeItem('k2-ui-layout')`
5. **`parseInt("0px")||999`** = 999 (0 falsy!) — snap พังตอน left=0. ใช้ `const lx=parseInt(...); if(lx<70)` (NaN<70=false ปลอดภัย)
6. **fixed element `offsetParent`=null** → makeDraggable ต้อง `op ? op.getBoundingClientRect() : {left:0,top:0,width:innerWidth,height:innerHeight}`
7. **`insertBefore(node, ref)` throw** ถ้า ref หลุด parent (แผงข้างลอย) → `ref=(home.next&&home.next.parentNode===home.parent)?home.next:null`
8. **`grep -c` exit 1 เมื่อ 0 match** → พัง `&&` chain
9. **zip stale**: `[ -f zip ]||zip` ข้าม rebuild → **`rm -f <zip> && zip` เสมอ** + verify version ในซิปก่อน copy
10. **`.k-ok` ชนกัน dialog vs wiki-save** → scope `.k-dialog .k-ok`
11. **str_replace กลืนบรรทัดหัวฟังก์ชันถัดไป**: เมื่อ old_str จบตรง `function toggleFocus(on) {` (หรือ `const pngSig=...`) แล้วลืมใส่กลับใน new_str → esbuild `Unexpected "}"` / `X is not defined`. **หลัง build fail ทุกครั้งดู error บรรทัดไหน แล้วเช็คว่ากลืนหัวฟังก์ชัน/ประกาศตัวแปรไปไหม**
12. **เพิ่ม field ในกล่อง = e2e ที่อ้าง input by index พัง**: เพิ่มช่อง storyDate ระหว่าง synopsis↔pov ทำให้ `inps[1]` (เดิม=อารมณ์) กลายเป็น pov → เทส sceneProps fail. **แก้: อัปเดต index ในเทสให้ตรง (มี comment [0]storyDate [1]pov...)**
13. **e2e ที่พึ่งค่าฮาร์ดโค้ด (สี/ขนาด) พังเมื่อเปลี่ยน design token**: เปลี่ยนกระดาษขาว→ครีมทำให้ assert `rgb(255,255,255)` fail; ลดฟอนต์ฐานทำให้ assert `21px`/`19.5px` fail. **หาเทสที่ hard-code ค่าเดิมแล้วอัปเดตพร้อมกัน** (`.toFixed(2)` ทิ้ง trailing zero: ใช้ `+(x).toFixed(2)` ไม่งั้น "19.50px"≠"19.5px")
14b. **โมดูลใหม่ที่ import แล้วไม่มีจุดเรียก = ผู้ใช้เข้าไม่ถึงเลย** (เจอ 13 ตัวรวดในรอบ deepseek)
   เช็คเร็ว: ชื่อฟังก์ชันต้องปรากฏใน app.js **>1 ครั้ง** (ถ้า =1 คือมีแต่บรรทัด import)
   ต้องมี: เมนูใน main.js (`send('ch')`) + `case 'ch'` ใน `handleCommand` หรือคีย์ลัดในตาราง `SHORTCUTS`
14h. **listener หลายตัวบน Esc เดียวกัน = ออกหลายโหมดพร้อมกัน** — โฟกัสถอดคลาสก่อน แล้วตัวจับของโหมดอ่าน
   เช็ค `classList.contains('focus-mode')` ได้ false ตามไปด้วย → กด Esc ครั้งเดียวหลุดทั้งคู่
   **แก้: ปักธงบน "อีเวนต์" (`e._k2EscUsed = true`) ไม่ใช่ดูสถานะ DOM** (ลำดับ listener ขึ้นกับใครลงทะเบียนก่อน)
14i. **เทสที่วัด `opacity`/`transform` ต้องรอ transition จบ** — `.15s` แต่รอ 60ms ได้ค่ากลางทาง (0.52 แทน 0.3)
   → รอ ≥ 2× ของ transition ก่อน assert
14i-2. **รอเฉย ๆ ไม่พอ ถ้าหน้าต่างเทสไม่ถูกวาด** (ไม่ได้อยู่หน้าสุด/ถูกบัง): Chromium หยุด animation frame
   → transition **ค้างที่ค่าเริ่มต้น** และ `getComputedStyle` คืนค่าที่กำลังวิ่ง = ค่าเดิม (opacity ได้ 1 ทั้งที่กฎ CSS ถูกทุกอย่าง:
   `matches=true` · rule อยู่ใน styleSheets · `--fm2-dim` resolve เป็น 0.3 · ไม่มี inline style) — **เผา 4 รอบ e2e กว่าจะรู้**
   **แก้: สั่งจบ animation เองก่อนวัด** `el.getAnimations?.().forEach(a => a.finish())` แล้วค่อย `getComputedStyle`
14c. **`selection.anchorNode` เป็น Text node → ไม่มี `.closest()`** · `anchorNode.closest?.()` คืน undefined เงียบ ๆ
   ใช้ `cursorBlock()` ใน focus-mode.js (อิง `view.domAtPos` ของ ProseMirror ก่อน แล้ว fallback DOM selection)
   — สำคัญกับ e2e ด้วย เพราะหน้าต่างเทสไม่มี DOM focus จริง
14d. **ไบนารีห้ามผ่าน readFile/writeFile** (main เขียน utf-8 → ไบต์ ≥0x80 บวม ไฟล์เสีย) ใช้ `readBytes/writeBytes/copyFile`
14e. **`kapi.*` ทุกตัวเป็น async (IPC)** — เรียกแบบ sync จะได้ Promise ไปโชว์บนจอ (`[object Promise]`)
14f. **`test:shot` ห้าม throw** — capturePage ล้มได้เมื่อหน้าต่างถูกย่อ (UnknownVizError) จะทำ selftest ตายทั้งชุดทั้งที่โค้ดไม่ผิด
14g. **เทสซูมต้องวัดจาก `getComputedStyle(el).maxWidth`** ไม่ใช่ความกว้างจริง — บนจอแคบ pane จะ clamp ทำให้ fail ปลอม
15. **Thai sort ทำ default map/section เลือกผิด**: `sortMaps` เรียงตามชื่อไทย → "เมือง"(เ) มาก่อน "โลก"(โ) → default currentId ผิด. **อย่าพึ่งชื่อ ใช้ `order` เป็นตัวเรียงหลัก** (Book Manager/Timeline/Maps ทุกตัวเก็บ order)
16. **กล่อง modal ที่เทสก่อนหน้าลืมปิด ทำให้ `testShot` ของเทสถัดไปได้ภาพผิด** (เผาไป 2 รอบ e2e)
   `document.querySelector('.k-dialog .k-ok').click()` กดกล่อง**ใบแรกใน DOM** ถ้ามีกล่องอื่นค้างอยู่ = กดผิดใบ
   → กล่องเดิมค้างทับหน้าจอยาวทั้ง run และสกรีนช็อตของเทสถัด ๆ ไปกลายเป็นภาพเก่า (ดูเหมือน capturePage พัง ทั้งที่ไม่ใช่)
   **แก้: ปิดใบล่าสุดเสมอ** `const ovs=[...document.querySelectorAll('.k-overlay')]; ovs[ovs.length-1].querySelector('.k-ok').click()`
   แล้วเก็บกวาด `.k-overlay` ที่เหลือทิ้ง · อาการ: assert ผ่านหมด (DOM ถูก) แต่ภาพไม่ตรง → **เชื่อ DOM ก่อน อย่าเพิ่งโทษ capturePage**
17. **view tool คืน [image] ว่างช่วงกลาง session** → PIL pixel-analysis แทน: color histogram (`Counter` สแกน crop) หา card-bg/accent-orange, หรือวัดความกว้างแถบสีกระดาษ (%ของจอ) เพื่อยืนยัน layout
18. **CSS 2 บล็อกความจำเพาะเท่ากัน = บล็อกล่างชนะ "เฉพาะ property ที่เขียนซ้ำ"** — `body.reading-mode` ทับ `background` แต่ไม่ทับ `color` ที่ยังมาจาก `body.paper-mode` → หมึกดำบนพื้นดำ. **โหมดที่ใช้ร่วมกันได้ ต้องมีกฎ combo (`body.a.b`) เสมอ** ไม่ใช่หวังว่าลำดับจะพอดี
19. **`style.display='none'` ทับ CSS = ค้างข้ามโหมด** — ซ่อน UI ให้ใช้ class ล้วน. เทสก็ต้องวัดด้วย `getComputedStyle` ไม่ใช่ `el.style.display`
20. **`.k-collapsed { max-height:0 }` กลืนหัวแผงไปด้วย** → ปุ่มคลี่กลับหายตาม = แผงเรียกคืนไม่ได้. **"พับ" ต้องซ่อนเฉพาะเนื้อ หัวอยู่เสมอ · "ย่อ" ต้องทิ้งปุ่มลอยไว้เรียกกลับ**
21. **async render ที่ `body.innerHTML=''` ตอนต้นแล้ว await ต่อ = รายการซ้ำเมื่อถูกเรียกซ้อน** (`setPropsTarget`+`openPropsPanel` ยิงติดกัน) → ใช้หมายเลขรอบ `const gen=++_gen; ... if(gen!==_gen) return;` หลัง await ทุกจุด
22. **อ่าน→แก้→เขียนทั้งไฟล์ (updateSceneRow) ยิงพร้อมกัน = ตัวหลังเขียนทับตัวแรก** เงียบ ๆ → ต่อคิวด้วย `q = q.then(run, run)` (ใส่ handler ทั้งสองช่องไม่งั้นคิวค้างเมื่อ error)
23. **z-index ที่ `++` ไปเรื่อย ๆ ไต่ขึ้นไปบังของที่ควรอยู่บนสุด** (หน้าต่างลอยบัง FAB/modal) → กำหนดเพดานแล้วเรียงใหม่เมื่อชน
24. **`setupFloatingFormatBar()` ย้ายปุ่ม toolbar ไปแถบลอย** → CSS/เทสที่ผูก `#toolbar .tb…` จะพลาดปุ่มที่ย้ายไปแล้ว ใช้ selector ที่ไม่ผูกคอนเทนเนอร์
26. **frontmatter ของ .md ไม่มีชนิดข้อมูล** — `parseMdFile` คืน **สตริงล้วน** (`isFlashback: true` → `"true"`)
   → อย่า assert `=== true` กับค่าจาก frontmatter · ค่า boolean ควรเขียนเฉพาะตอนจริง แล้ว `delete` ตอนเท็จ
   (ไม่งั้นได้บรรทัด `x: false` รกทุกไฟล์ · ระวัง `locked: undefined` ที่หลุดมาแบบนี้)
27. **ไอคอนย้ายจากอีโมจิ → ชื่อไอคอน SVG แล้ว** (`icons.js`) — meta เก่าที่เก็บอีโมจิไว้ (เช่น `wikiCats[].icon`)
   ทำให้ `iconHtml()` วาด **svg ว่าง** → ใช้ `hasIcon(name)` กรองก่อนเสมอ แล้ว fallback ไป `CAT_ICON`/`bookmark`
28. **dock ที่มีลูก `flex:0 0 auto` ปนกับลูกที่ยืดได้ → พื้นที่ว่างหายไปเฉย ๆ** (เผา 3 รอบ e2e)
   `removePanel` ของเอนจินตั้ง `sizes = evenSizes(n)` ให้ **ทุก dock** → `col[toolbar, row, statusbar]` ได้ `[.33,.33,.33]`
   toolbar/statusbar เป็น fixed จึงไม่ใช้ค่านี้ เหลือ row ตัวเดียวที่ `flex-grow:.33` = กินพื้นที่ว่างแค่ 1/3
   → หน้ากระดาษ/canvas เตี้ยผิดปกติ (Story Network ค้าง 300px) ทั้งที่ layout tree ถูกทุกอย่าง
   **แก้: normalize `flex-grow` ของลูกที่ยืดได้ให้รวมกัน = 1 ตอน render** (`growSum` ใน `renderDock`)
29. **re-render ทั้งต้นไม้ระหว่างลาก = ProseMirror ถูกถอด-ใส่ 60 ครั้ง/วินาที** → ลาก resize/float ต้องแก้ `style` สดบน DOM
   แล้ว commit ลง store ครั้งเดียวตอน mouseup · และ `renderPanels()` เทียบลายเซ็น JSON ของ layout ก่อนวาด (ข้ามถ้าไม่เปลี่ยน)
25. **ตั้งชื่อตัวแปรว่า `t` บัง `t()` ของ i18n** — `showSourceView` เคยพังตรงปุ่มคัดลอกเพราะ `t('status.copied')` กลายเป็นเรียก tab object
30. **`mergeComments()` ตัดช่องว่างท้ายไฟล์ทิ้งเสมอ** (`stripComments` มี `.replace(/\s+$/,'')`) — เอา `store.saveBody()`
   ไปแทน `kapi.writeFile` ใน `saveTab` ตรง ๆ = **ทุกไฟล์ในโปรเจกต์ถูกแก้ท้ายไฟล์ทุกครั้งที่บันทึก** แม้ไม่มีคอมเมนต์เลย
   (e2e ล้มที่ "กดซ้ำคืนสภาพไฟล์เดิม"). **แก้: `writeKeepingComments()` — ไม่มีคอมเมนต์ = เขียนตัวต่อตัวเหมือนเดิม**
   · สมอของ CommentStore นับ offset เทียบ **ทั้งไฟล์ (frontmatter รวมด้วย)** ไม่ใช่ `parseMdFile().body`
31. **`document.querySelector('.k-menu')` ไม่ได้คืนเมนูที่เพิ่งเปิด** — `#k-fab-menu` เป็น `.k-menu` ถาวรใน index.html
   และอยู่ก่อนใน document order → เทสเมนูป๊อปอัปผ่านทั้งที่เช็คผิดตัว. ใช้ `.k-menu:not(#k-fab-menu)` เสมอ

32. **`max-width:calc(100% - Xin)` บนหน้ากระดาษเพี้ยน 2px** — `* { box-sizing:border-box }` + เส้นขอบกระดาษ 1px×2
   ทำให้ 100% = ความกว้างเนื้อใน **ลบเส้นขอบไปแล้ว** → element ที่ควรกว้าง 3.8in ได้ 362.8px แทน 364.8px
   **แก้: หนีบความกว้างเป็น "นิ้ว" ตอนสร้าง CSS ใน JS** (`Math.min(width, textWidth - indent)`) ไม่ใช้ calc(%)
33. **`addAsTab` ตั้ง active = แท็บใหม่เสมอ** — ถ้ามีอะไรถูก dock แบบ `center` ลงบน **แผงเอกสาร (docs)**
   docs จะกลายเป็น `k-tabbed k-tab-hidden` → `#tabs`/`#panes` หายทั้งก้อน ดูเหมือนโปรแกรมพัง
   **แก้ 3 ชั้น**: `showPanel` แปลง center+docs → defaultSide · `detectSnapTarget` ข้ามโซนกลางของ docs ·
   `ensureDocsVisible()` ใน `renderPanels` บังคับ docs เป็นแท็บ active เสมอ (มีธงกัน re-entrant)
34. **e2e ต้องล้าง localStorage ทุกคีย์ที่จำเลย์เอาต์** — เพิ่ม `k2-panel-home` (alpha.56) เข้าไปด้วย
   ไม่งั้นรอบที่ตายกลางคันทิ้ง "ที่เดิมของแผง" ไว้ แล้วรอบถัดไปเปิดแผงกลับไปตำแหน่งแปลก ๆ = FAIL คนละที่ทุกครั้ง
   (ตอนนี้ `runTest` ล้าง `k2-ui-layout` `k2-panel-layout` `k2-panel-home` `k2-split-layout` `k2-home-view` + `resetPanels()`)
35. **ซูมยึดกึ่งกลาง** — เก็บ *สัดส่วน* ของจุดกึ่งกลาง (ไม่ใช่พิกเซล) ก่อนซูม แล้วคืนใน `requestAnimationFrame`
   เรียกซูมสองครั้งติดกันจะได้ค่ากลางทาง → เทสต้อง `await` ระหว่างการกดซูมแต่ละครั้ง

---

## Build recipes (app ไม่ต้องมี node_modules ตอน runtime — main/preload ใช้แค่ electron+fs/path/url, bundle.js มี prosemirror ครบ)

Electron **43.1.1**. github (allowlist: github.com + release-assets.githubusercontent.com):
`https://github.com/electron/electron/releases/download/v43.1.1/electron-v43.1.1-<PLATFORM>.zip`
PLATFORM = `win32-x64` / `darwin-arm64` / `darwin-x64`

**Windows portable** (~139MB, top folder K2WIN/) — electron runtime cache ที่ `/home/claude/work/build_win/K2WIN` ใช้ซ้ำได้ (แค่รีเฟรช resources/app):
```bash
cd /home/claude/work/build_win/K2WIN; SRC=/home/claude/work/v2_extract/Killian2
rm -rf resources/app && mkdir -p resources/app
cp $SRC/main.js $SRC/preload.js $SRC/package.json resources/app/; cp -r $SRC/renderer $SRC/src resources/app/
# ครั้งแรกเท่านั้น: rm -f resources/default_app.asar; mv electron.exe Killian2.exe
# rm -f zip && cd .. && zip -qr K2WIN  (+ อ่านก่อน.txt)  — verify version ในซิปก่อน copy
```

**macOS .app** (arm64/x64):
```bash
cp main.js preload.js package.json Electron.app/Contents/Resources/app/; cp -r renderer src ...
rm -f Electron.app/Contents/Resources/default_app.asar
# Info.plist: CFBundleName/DisplayName='Killian 2', CFBundleExecutable=Killian2, CFBundleIdentifier=com.topgraphix.killian2
mv Contents/MacOS/Electron Contents/MacOS/Killian2; mv Electron.app 'Killian 2.app'
zip -qry out.zip 'Killian 2.app'           # -y สำคัญ! เก็บ 14 Framework symlinks
```
**CAVEAT macOS**: แก้ plist+rename binary ทำลาย signature. Apple Silicon **บังคับ** signature → build บน Linux รันไม่ได้จนผู้ใช้รันบน Mac: `xattr -cr 'Killian 2.app'` แล้ว `codesign --force --deep --sign - 'Killian 2.app'` (ใส่ใน วิธีเปิดบน-macOS.txt). **`.dmg` สร้างบน Linux ไม่ได้**. Intel(x64) bypass ง่ายกว่า arm64

**Verify เสมอ**: unzip ใหม่ → `ln -s <real>/node_modules node_modules` → build → e2e ALL OK ก่อน ship → `/mnt/user-data/outputs/` + `present_files`

---

## ระบบสำคัญ + จุดต่อ

- **ตั้งค่า**: `settingsDialog()` แท็บ ทั่วไป/การเขียน/ปุ่มลัด → `project.khn.json` ผ่าน `saveProjectMeta()`. `DEFAULT_SETTINGS` = autoSaveMinutes/maxBackups/autoBackup/lineNumbers/uiFontSize/spellCheck/spellCheckDict/autoMention/recycleDays/shortcuts
- **ปุ่มลัดตั้งเอง**: `onShortcut()` วน `effectiveShortcuts()` = `SHORTCUTS` merge `settings.shortcuts[id]` (id=channel+args). แท็บ "ปุ่มลัด" อัดคีย์ (บังคับ Ctrl/⌘), `accelText` แสดง ⌘⇧ บน mac
- **ตรวจคำผิด**: 2 ชั้นผสมได้ — `spellCheck` (Chromium อังกฤษ) + `spellCheckDict` (spell.js ไทย+อังกฤษ, decoration `.k-spell-bad`). dict แยกไฟล์ (assets + `Plugins/dictionaries/*.txt` + `dictionary.json`). คลิกขวาคำแดง→เพิ่มคำ
- **SmartType บทหนัง** (Final Draft): `spSmartCheck` + `screenplayTerms(tab)` สแกน sp doc เก็บ character/location ที่พิมพ์ในบทเอง รวม SCENE_PREFIX/TIMES/TRANSITIONS
- **relationship**: `relationDialog` (target dropdown + role datalist) → `_syncInverse` เขียนฝั่งตรงข้าม (`invertRole` ใช้ `INV` cache, ต้อง `warmInverse()`) + คลิกชื่อ→`onOpenEntity`. `reloadIfExists()` รีเฟรชแท็บเปิดค้าง
- **Wiki images**: เพิ่มจากไฟล์ หรือ **เลือกจากคลัง** (`pickFromGallery`→pickImage). คลิกรูป→`imageLightbox`
- **Explorer**: `buildTree()` — sections→chapters→scenes(สี/สถานะ/⭐flag/#tags) + Memo + Wiki + ถังขยะ. `#tree-search`→`filterTree(q)` (ชื่อ/แท็ก/สถานะ). scene มี `title` tooltip (hover) + `dataset.search`
- **Panel System (alpha.46, Photoshop-style)** — ทุกพื้นที่ของหน้าต่างคือแผงในต้นไม้เดียว วาดลง `#app-root`
  - `panel-ui.js` = `initPanelSystem()` (เรียกใน DOMContentLoaded) · `PANEL_DEFS` 6 แผง: `toolbar`/`tree`/`outline`/`docs`/`props`/`statusbar`
    · `showPanel/hidePanel/togglePanel/resetPanels/panelMenuItems/panelToggleState/isPanelOpen` · `ALIAS` แปลงชื่อเก่า (`tree-panel`→`tree`)
    · **`addPanelButton(id, el)`** = ฝากปุ่มบนหัวแผง (element เดิมถูกใช้ซ้ำทุก render จึงไม่เสีย onclick)
  - `panel-renderer.js` = `renderPanelLayout` → dock/tabs/panel/float + `createResizeHandle` + `markDocsChain`
  - `panel-drag.js` = `detectSnapTarget` (ใบเล็กสุดที่ครอบจุด = ลึกสุด) → overlay `.k-drop-zone` → `dockPanel`/`floatPanel`/`moveTab`
  - **เนื้อแผง = element เดิมใน index.html** (`#tree-panel` `#outline-panel` `#props-panel` `#content` `#toolbar` `#statusbar`)
    พักอยู่ที่ `#k-panel-src` (hidden) แล้วถูก "ย้าย" เข้าแผง — **ห้ามสร้างใหม่** (ทั้งโปรเจกต์อ้าง `#panes` `#tabs` `#tree` `#props-body`)
  - โหมดอ่าน/โฟกัส/พิมพ์: ซ่อน `.k-dock > *:not(.k-holds-docs)` (ไม่มี `#sidebar` แล้ว)
- **Floating format bar**: `setupFloatingFormatBar()` ย้ายปุ่มจัดรูปแบบ (id เดิม + #tb-source) เข้าแถบลอยใน #content. dblclick grip=reset. `syncFloatBarVisible()` ใน refreshToolbar
- **UI layout persist**: localStorage `k2-ui-layout` (ก้อนเดียว) ผ่าน `uiLayout()/saveUiLayout()`
- **สลับนิยาย↔บทหนัง**: `switchFormat()` — ใช้ `tab.body` verbatim ตอน !dirty (fountain round-trip ข้าม grammar ไม่ได้)
- **snapshot**: auto-backup ตอน saveTab → `Snapshots/` (ts เป็น ms กันชน), pruneSnapshots เก็บ maxBackups ที่ไม่มี label
- **คอมเมนต์ (alpha.48)**: แผง `comments` ← `comments/comment-ui.js` (`renderCommentPanel(host)`) บนเอนจิน `comment-core.js`
  (`CommentStore` · `addComment/replyTo/resolveComment/editComment/deleteComment/reanchorAll`). เก็บ **ท้ายไฟล์ `.md`**
  ในบล็อก `<!-- k2-comments … -->` — `parseMdFile` ตัดทิ้งให้อัตโนมัติ, **`saveTab` ต้องเขียนผ่าน `writeKeepingComments()`**
  (ดูบทเรียนข้อ 30). สมอไฮไลต์ในตัวแก้ไขผ่าน `commentAnchorPlugin()` ใน editor.js (ใช้ทั้ง KEditor/SPEditor)

### ระบบใหม่ (alpha.30–37 — Storyteller-inspired)

- **เวิร์กโฟลว์ส่งออก (compile)** — ไฟล์→ส่งออกด้วยเวิร์กโฟลว์ (Ctrl+Shift+E). `openCompileDialog()` ใช้ `buildDraftModel(dPath,title)` (แชร์กับ `compileDraftText`/`exportDraft`). พรีเซ็ต builtIn แก้ไม่ได้ (ต้อง clone). เก็บใน `project.khn.json→compileWorkflows`. ตรรกะอยู่ `compile.js` (`runWorkflow`)
- **หมวด Wiki สร้างเอง** — `wikiCats:[{key,label,icon}]` ใน project.khn.json. `BUILTIN_CATS`=[characters,locations,items,lore] ลบไม่ได้. `newWikiCat/editWikiCat/deleteWikiCat` (กันลบหมวดที่มีของ), `applyWikiCats()` ยัด label ไทยเข้า `CAT_TH`, `catLabel/catIcon`. buildTree + template manager รวมหมวดเอง
- **แดชบอร์ด analytics** — `renderDashboard` เก็บ byStatus + chapterWords, `statBars()` วาดแถบสัดส่วน (สถานะฉาก / Wiki ตามหมวด / ความยาวบท)
- **จัดการเล่ม (Book Manager)** — `openBookManager()` tab `::books::`. การ์ดต่อเล่ม: ปก(pickImage→`section.json→cover` เป็น `../Images/<f>`), ชื่อแก้ inline, สถานะ(`SECTION_STATUSES`), คำโปรย, สถิติ(`sectionStats()`), ลากสลับลำดับ(`reorderSections()`). helpers: `listSections()/saveSectionMeta()`. section.json มี title/order/status/cover/blurb
- **เส้นเวลา (Timeline)** — `openTimeline()` tab `::timeline::`. **2 มุมมอง สลับได้** (`state._tlView` cards/gantt): (1) การ์ด = เลนตาม track เรียงตามเวลา; (2) **Gantt** = แท่งตามช่วงเวลาบนแกน (`ganttData/ganttBar/ganttTicks` ใน timeline.js) ใช้ `whenEnd` เป็นจุดจบแท่ง. `sceneEventsFromProject()` ดึงฉากที่มี `storyDate` (ตั้งใน sceneProps ทั้ง dialog+panel) มาแสดงอัตโนมัติ. event เอง→`timeline.json`. `eventDialog()` (title/when/whenEnd/track/sort/desc). ตรรกะ `timeline.js`. **ระวัง: `mergeTimeline` ต้อง copy ทุก field ที่มุมมองใช้** (เคยลืม whenEnd → Gantt แท่งกลายเป็นจุดหมด)
- **แผนที่ (Maps)** — `openMaps()` tab `::maps::` (state ใน `mapsState`). รูปเป็นแผนที่, คลิกปักหมุด (พิกัด %), หมุด 3 ชนิด entity/portal/note, ลากย้ายได้. portal = ลำดับชั้น world→city→room + breadcrumb. `pinDialog()`. เก็บ `maps.json`. ตรรกะ `maps.js`
- **โหมดหน้ากระดาษ (paper mode)** — `togglePaper()` + `body.paper-mode` (ค่าเริ่มต้นเปิด, เก็บใน settings). กระดาษครีม `--paper:#f5f1e6` (ปรับได้), นิยาย+บทหนังใช้กรอบเดียวกัน. ปุ่ม 📄 `#tb-paper` (ไม่ disable ตอนไม่มี editor)
- **ซูมหน้ากระดาษ (alpha.47 — ซูมจริง)** — `pageScale` (`SCALE_MIN/MAX` 0.5–2.5), `applyZoomVars(off)` set `--ed-fs`/`--sp-fs` (ฟอนต์ฐาน+ค่าที่ตั้ง **ไม่คูณซูม**) + `--page-scale`; CSS ซูมด้วย **`zoom` property** ที่ `.pane > .ProseMirror` → ฟอนต์/padding/margin/ความกว้างขยายพร้อมกัน (max-width คงที่ 940px). ห้ามใช้ `transform:scale` (พิกัดคลิก/selection/scroll พัง) · **ห้ามใส่ `role:'zoomIn/zoomOut/resetZoom'` ของ Electron กลับเข้าเมนู** (zoom ระดับ webContents ซ้อนทับจนเพี้ยน) · slider ล่างขวาใน statusbar (`#zoom-slider/#zoom-label`) + Ctrl+ล้อ/=/-//Shift+0. **font preview ในตั้งค่าต้องเรียก `applyZoomVars(val)`** · **เทสในซับทรีที่ถูก zoom ต้องวัดด้วย `getBoundingClientRect()` ไม่ใช่ `getComputedStyle().maxWidth`**
- **ขนาด UI (alpha.47)** — `settings.uiScale` (`UI_SCALE_MIN/MAX` 0.75–2.0) → `applyUIScale(v)` ตั้ง `--ui-scale`. style.css: `body{font-size:calc(14px*var(--ui-scale))}` (ปุ่ม/select/input ใช้ `font:inherit` จึงไล่ตาม) + font-size ทุกกฎของเปลือก UI เป็น `calc(px*var(--ui-scale))` + **บล็อกท้ายไฟล์** เก็บขนาดโครงสร้าง (titlebar/toolbar/แท็บ/หัวแผง/statusbar/dialog/tree/FAB) ผ่าน `var(--uis)`. เพิ่มของใหม่ที่ต้อง scale → เติมในบล็อกนั้น. เส้นขอบ 1px + max-width หน้ากระดาษ = **ไม่ scale**. เข้าถึงได้ที่ ตั้งค่า→การเขียน (`#st-uiscale`) และเมนู มุมมอง→ขนาด UI (`send('ui-scale', 1/-1/0)`)
- **จัดหน้า (align)** — attr `align` บน paragraph/heading (prose) + sp node. `cmd('align',dir)` ทั้ง 2 editor, ปุ่ม `#tb-align-*` + Ctrl+Shift+L/K/R/J. prose persist เป็น `<!--align:x-->` นำหน้าบล็อก (md.js, v1 เปิดได้). **บทหนัง align = session-only** (ไม่ persist กันพัง fountain round-trip)
- **screenplay indent** — margin sp element เป็น % (`.sp-character 38%`, dialogue 19%, parenthetical 29%) scale ตามซูม. `classify()` character auto-detect รับชื่อผสมพิมพ์เล็ก/ไทย (ไม่บังคับ ALL-CAPS)

---

## เวอร์ชัน (ล่าสุด alpha.56 · e2e 1,012 + unit 805)

.13–.22 (v1→v2 พื้นฐาน): snapshot, line numbers, spellcheck ไทย+Chromium, ปุ่มลัดตั้งเอง, mac build, บทหนัง Ctrl+arrow, relationship sync, floating format bar, sidebar resize, SmartType Final Draft, wiki gallery/lightbox, explorer search+tags, panel docking, tree float+snap
.24 batch 8 (drag-move explorer, panel snap, split compare, version tracking, scene lock, screenplay Final Draft look, screenplay images, wiki links) · .25–.27 **Planner board** (fabric.js) · .28 **floating windows** · .29 memo-in-chapter + scoped search
.30 **compile workflows** + **หมวด Wiki สร้างเอง** + **dashboard analytics** · .31 section mgmt + wiki field-linking + explorer flicker fix + ctrl-wheel zoom + page align + screenplay smart-type fix · .32 **Book Manager** · .33 **paper mode** · .34 กระดาษครีม + unified display + wiki-link ทุก sp block · .35 real page-zoom + zoom slider + screenplay indent fix · .36 **Timeline** · .37 **Maps** (world→city→room) · .38 **Gantt view** ในเส้นเวลา
.39 **Phase 1** (save-all/log system+viewer/explorer accordion/dirty badge/floating-bar reorder) + **แยก app.js → core.js + 11 feature modules** (มี AGENTS.md ให้ opencode) + **3 เอนจินบริสุทธิ์ใหม่**: full-text **search-engine** (inverted index, ค้น 1k ไฟล์ ~16ms) · **Panel System** docking (panel-layout/store) · **Split View** (split-layout) — logic+unit test เสร็จ, UI ส่ง opencode ทำต่อ
.40 **รอบเก็บกวาดฟีเจอร์ชุด deepseek (19 โมดูล)** — เดิม 13 โมดูล import แล้วไม่มีเมนู/ปุ่มเรียก + อีกหลายตัวพังจริง
  ต่อเมนู/คำสั่งครบ · แก้คีย์ลัดชน (Ctrl+Shift+F ยิง 3 คำสั่ง, Ctrl+P ยิง 2) → **Ctrl+Shift+F**=ค้นทั้งโปรเจกต์ · **Ctrl+Shift+D**=โฟกัส · **Ctrl+Shift+O**=quick open
  แก้: focus/typewriter (`.closest()` บน text node → ไม่เคยทำงาน) · zip+backup (utf-8 ทำไบนารีพัง → `kapi.readBytes/writeBytes/copyFile`) ·
  คอมเมนต์ (push ใส่อาร์เรย์ทั้งบทแทนแถวฉาก → หาย) · custom status (ไม่โผล่ที่ไหน + `confirmBox` ไม่ import) ·
  export-blog (md ดิบ → ใช้ `mdToHtmlBody` ใหม่ใน compile.js) · quick-open (`kapi.relative` async → `[object Promise]`) ·
  branching (ไม่มีที่ไหนเขียน choices → เพิ่มแผงสร้าง) · floorplan (อิง field ที่ไม่มีจริง → อิง maps.json + `sceneCtx()`)
  ความปลอดภัย: API key → `ai-key.json` แยก · AI ผ่าน `kapi.httpFetch` (renderer โดน CORS) · เลิกใช้ innerHTML กับข้อความผู้ใช้ · ถอด iconify CDN · thesaurus ปิดเป็นค่าเริ่มต้น (อังกฤษเท่านั้น)
  helper ใหม่ใน app.js: `openPlainFile` · `sceneCtx` · `updateSceneRow` · `newProjectFromTemplate`
.41 รอบแก้บั๊กหลัง DeepSeek ต่อ UI (เปิดโปรแกรมไม่ขึ้น: import หาย · `t(undefined)` พัง · i18n เป็นอังกฤษหมด · เมนู id ไทย/อังกฤษไม่ตรง)
.42 **Advanced Storytelling UI (ข้อ 81–87)** — ของเดิมมีไฟล์อยู่แต่ใช้งานไม่ได้จริง
  **81 ผังแตกสาย**: เอนจินใหม่ `branch-graph.js` (บริสุทธิ์ + unit test 37) → วาด **SVG จริง** (กล่องจัดชั้น + เส้นโค้งมีลูกศร + ป้ายทางเลือก)
    · สีขอบบอกบทบาท (จุดเริ่ม/ตอนจบ/วนซ้ำ/เข้าไม่ถึง) · **แผง inspector** แก้ทางเลือกได้ในตัว · **⊞ = Split View** (ผังซ้าย ฉากขวา) · ย่อ/ขยาย/พอดีจอ
  **82 ผังพื้นที่**: ผูกฉาก↔หมุด (`sc.mapId`/`pinId` หรือ `pinX/pinY`) · หมุด **"คุณอยู่ที่นี่" เต้น** · **แถบเส้นเวลาของสถานที่** (เรียงด้วย `extractNum`) · breadcrumb · ลบ เห็น/ได้ยิน/พบ ทีละอันได้
  **83 ประวัติการตัดสินใจ**: `renderChoicePanel()`/`choiceStats()`/`choicesByCharacter()` → ฝังใน **แดชบอร์ด** + **หน้า Wiki ตัวละคร** (ไม่ใช่ซ่อนในเมนู)
  **84 Visual Tags**: `applyVisualTagStyle()`/`renderAllTagChips()` → **Explorer** (ชิปสี, คลิก=กรอง) · **แถบตัวกรอง** (ชื่อจริงใน `dataset.tag` กันไอคอนปนคิวรี) · **Planner** (ไอคอน+สีบนการ์ด) · **Network** (วงแหวนสีรอบโหนด)
  **85 โน้ตด่วน**: **ปุ่ม 📝 บน toolbar** (คลิกขวา = ดูทั้งหมด) · **"ไว้ทำภายหลัง" (Future Notes)** โผล่เป็นแผงค้างบน**หน้าเส้นเวลา** · การ์ดฉากติดป้ายจำนวนโน้ต
  **87 ศูนย์รวม**: เลิก `raw.includes(ชื่อ)` → **ใช้ Auto-link Engine** (รู้จัก aliases/ขอบคำ/นับครั้ง) · **real-time** ผ่าน `markCentralizeStale()` ใน `saveTab` + รีเฟรชตอนกลับมาที่แท็บ · การ์ดสถิติ · ชื่อฉากคลิกเปิดได้ · "🕳 ยังไม่ถูกกล่าวถึงเลย"

.43 **รอบแก้บั๊กจาก human test (16 ข้อ)** — ดู CHANGELOG เต็มใน `renderer/CHANGELOG.md`
  **1** โหมดอ่าน+กระดาษ = หมึกดำบนพื้นดำ (กฎ combo `body.reading-mode.paper-mode` + เลิกใช้ inline display)
  **2** วงกลมรูป Wiki อ่าน `images[0].url` แต่เก็บเป็น string → ไม่เคยขึ้นรูป · คลิกวงกลม=เลือกรูป · ☆/★ เลือกรูปประจำตัว
  **3** เมนู native ติ๊กถูกจริงผ่าน `kapi.menuToggles` → main สร้างเมนูใหม่ด้วย `type:'checkbox'/'radio'` · ปุ่ม `.tb-toggle` มีจุดบอกสถานะ
  **4+16** `.k-collapsed` กลืนหัวแผง → แผงหายถาวร · ปุ่มหัวแผงเรียง **[—ย่อ][▾พับ][📌ปัก][✕]** · ย่อ=ปุ่มลอยในถาด `#k-min-tray`
  **5** เหตุการณ์เส้นเวลามี `refs[]` (ฉาก/memo, path สัมพัทธ์) · `normalizeRefs` ใน timeline.js · ชิปคลิกเปิดไฟล์
  **6+11** Explorer หมวด 🖼 คลังรูป (thumb/ลาก/แทรก) + ปุ่ม 🔄 รีเฟรช
  **7** `activate()` เจอไฟล์ฝั่งขวา→`clearCompare()` ทิ้งแยกจอ → เปลี่ยนเป็น **สลับข้าง** · applyCompare ใช้ `syncSplitPanes` (ได้เส้นคั่น) · กระดาษหดตามช่องแคบ · ปุ่ม ⇋ เทียบด้านขวา ในกล่องประวัติเวอร์ชัน (`openSnapshotRight`)
  **8** เพิ่ม ↩ ย้ายกลับเข้าบท (memo) + 📄 กลับเป็นฉากปกติ (`setRowMemo(...,false)` เดิมไม่มีทางเรียก)
  **9** FAB z 50→76 + จำกัด float-win ที่ 60–74 · `pickDraftTarget()` เลือก เล่ม→ร่าง→บท ก่อนสร้าง
  **10** `fileVersionDialog(file,title,{onRestored})` ใช้กับไฟล์อะไรก็ได้ → Wiki มี 🕘/📸 + สำรองอัตโนมัติตอนบันทึก
  **12** Story Network ไม่เคยมีโค้ด pan + canvas ค้าง 300px (pane ซ่อนตอนสร้าง) → เพิ่ม pan/ResizeObserver/`focus()` refit/ปุ่มรีเซ็ต
  **13+14** `renderPropsPanel` async ซ้อนกัน → duplicate (แก้ด้วย `_propsGen`) · เปลี่ยนเป็น autosave debounce 600ms · ใช้ `allStatuses()`
  **15** ผังแตกสายผูกกับเนื้อเรื่อง: `scanChoiceMarkers`/`markerTexts`/`diffChoiceMarkers` ใน branch-graph.js · แผง "🔗 ทางเลือกในเนื้อฉาก" · ปุ่ม 🔎 สแกนทั้งโปรเจกต์ · เมนู `branch-sync` · `mutateChoices` ต่อคิวกัน race
  **16a** tooltip เอง `#k-tip` ลอย**เหนือ** pointer (ยืม `title` มาวาด แล้วคืนตอน mouseout)
  **ยังไม่ทำ**: "พื้นที่ทำงานเป็น floating panel" (ท้ายข้อ 16) — ต้องรื้อระบบ pane/แท็บทั้งชุด

.44 **เก็บงาน 7 ฟีเจอร์ปิดท้ายก่อนออกอัลฟา (65/66/68/69/70/77/78)** — ของเดิม "มีโค้ด+ต่อเมนูแล้ว" แต่ยังไม่ครบมุมใช้งาน
  **65 โฟกัส**: ความจางปรับเองได้ (`settings.focusDim` → CSS var `--fm2-dim`, สไลเดอร์ในตั้งค่า → การเขียน) ·
    **Esc ปักธงบนอีเวนต์** (`e._k2EscUsed`) กันโฟกัส+โหมดอ่านหลุดพร้อมกัน · มีกล่องเปิดอยู่ = Esc เป็นของกล่อง ·
    คีย์ลัดยืนยันที่ Ctrl+Shift+D (ไม่ย้ายกลับ Ctrl+Shift+F ที่เป็นค้นทั้งโปรเจกต์)
  **66 เครื่องพิมพ์ดีด**: `scrollHost(pm)` = `.pane` → ถ้าไม่มี ไต่หา `overflowY:auto/scroll` (หน้าต่างลอยเลื่อนตามได้แล้ว)
  **68 ส่งออกบล็อก**: `Ctrl+Shift+B` · กล่องตัวเลือก (ธีม medium/minimal/dark · หัวบท · หัวฉาก · **ฝังรูป base64**
    ผ่าน `kapi.readBytes`+`btoa`) · แยก `buildBlogHtml(opts)` ให้เทสตรงได้ · จำตัวเลือกที่ `meta.blogExport`
  **69 สถานะฉาก**: `statusColor(label)` = `meta.customStatusColors` → `STATUS_COLORS` (core.js) → สีกลาง —
    ใช้ร่วมกันทั้ง Explorer/Kanban/ตารางฉาก · `statusesToJson`/`importStatuses` (นำเข้า = รวม ไม่ทับ)
  **70 เปิดไฟล์ด่วน**: แคชระดับโมดูล (`quickOpenCache()`) + สแกนซ้ำพื้นหลังทุกครั้ง + ปุ่ม 🔄/Ctrl+R + แถบคำใบ้
  **77 AI สรุป**: `collectProjectText({onProgress,includeWiki})` (แยกออกมาเทสได้โดยไม่ยิง API) · กล่องความคืบหน้า ·
    รวม Wiki ผ่าน `listEntities` · **แคชด้วยแฮชเนื้อหา** (`hashText` djb2 → `meta.ai.summaryCache`, `summaryCacheState`)
  **78 AI ชื่อ**: คลิกขวาฉาก/บท → แนะนำชื่อ (ใช้ `setSceneTitle`/`setChapterTitle` ที่แยกออกจาก rename ที่ถาม) ·
    ประวัติ `meta.ai.titleHistory` (cap 50) + `pastTitlesFor(base)`
  อื่น ๆ: `dialog:saveAs` เลือกฟิลเตอร์ตามนามสกุล (เดิมบังคับ .md) · เพิ่ม `kapi.openFileDialog(kind)`

.45 **3 ฟีเจอร์เล่าเรื่อง**
  **ป้ายเล่าเรื่อง (Narrative Markers)**: `isFlashback`/`isFlashforward` ในคุณสมบัติฉาก (เลือกได้อย่างละหนึ่ง —
    กันชนทั้งตอน `change` และตอนบันทึก) · badge `.tree-flash` ⏪/⏩ ใน buildTree + tooltip · ซิงก์ frontmatter (เขียนเฉพาะตอน true)
  **ประเภทความสัมพันธ์ (Typed Relationships)**: `relationship-types.js` + `categories` ใน inverse_roles.json (`INV_C.cat`) ·
    `relationDialog` เพิ่ม `<select.rel-type>` **เดาจากบทบาทที่พิมพ์** (`typeTouched` = เลือกเองแล้วไม่เดาทับ) → คืน `{target, role, type}` ·
    `wiki.js` จุดสี `.rel-type-dot` + `_syncInverse` พา `type` ไปฝั่งตรงข้าม · `network.js` เส้นสีตาม `REL_COLOR` (ไม่ระบุ = `categorizeRole`)
  **บรรยากาศรับรู้ (Sensory Profiles)**: `sensory-profile.js` — หน้า Wiki หมวด locations เท่านั้น ·
    ต่อผ่าน `onRendered: (wrap) => { attachBacklinks(); renderSensoryProfile(...) }` ใน wiki-ui.js
  แก้บั๊กที่เจอระหว่างทาง: **`catIcon` คืนอีโมจิเก่า → `iconHtml` วาด svg ว่าง** (เพิ่ม `hasIcon()`) ·
    เทสโหมดโฟกัสวัด opacity ตอน transition ค้าง (ดูบทเรียน 14i-2)

.46 **Panel System แบบ Photoshop (UI จริง)** — ต่อเอนจิน `panel-layout/panel-store` เข้ากับ DOM
  ใหม่: `panels/panel-renderer.js` (วาด dock/tabs/panel/float + ที่จับปรับสัดส่วน + icon strip) ·
    `panels/panel-drag.js` (snap zone + ลากหัวแผง/หัวแท็บ) · `panels/panel-ui.js` (เขียนใหม่ · 6 แผง · ถาดเรียกแผงกลับ) ·
    `layout/split-ui.js` เพิ่ม `renderSplitTree`/`initSplitSystem` (recursive)
  ลบ System A ใน app.js: `PANELS`/`registerPanel`/`showPanel`/`resetPanels`/`panelMenuItems`/`makeFloatablePanel` ·
    `savePanelOrder`/`restorePanelOrder` · `setupSidebarResize` · `minTray/addTrayChip/removeTrayChip` · `#sidebar` หายทั้ง HTML/CSS
  บทเรียนใหม่ที่เจอตอนทำ → ดูข้อ 28–29 ด้านล่าง

.47 รอบแก้บั๊ก 5 ข้อ (แยกหน้าจอ · แผงลอยปรับขนาด · สัดส่วนแผง · ถาดแผงสองฝั่ง · แผงโผล่เอง) + ซูมจริง + ขนาด UI
.48 **Phase 6 — คอมเมนต์เป็นแผง (บั๊ก #25) + ค้นหาเอนทิตี้ Wiki ในฉาก (บั๊ก #21)**
  ใหม่: `comments/comment-ui.js` — แผง `comments` (เธรดซ้อน · resolve · แก้ในที่ · ตัวกรอง · สมอผูกข้อความ)
    ต่อกับ `comment-core.js` ที่เคยเป็น orphan · `openCommentsPanel()`/`refreshCommentsPanel()` ใน app.js
    (`activate()` + `saveTab()` เรียกให้ · `_cmMigrated` กันย้ายซ้ำต่อฉบับร่าง)
  เก็บท้ายไฟล์ `.md` (`<!-- k2-comments -->`) แทน scenes.json · `migrateSceneComments(dPath)` ย้ายของเก่าให้อัตโนมัติ
  `editor.js`: `commentAnchorPlugin()` + `setCommentAnchors/commentAnchors/refreshCommentAnchors`
    (decoration `.k-cm-anchor` — ใส่ทั้ง KEditor และ SPEditor · จับด้วย **quote ไม่ใช่ offset**)
  `md.js`: `parseMdFile` ตัดบล็อกคอมเมนต์ทิ้ง (จุดเดียว → ไม่โผล่ในตัวแก้ไข/ส่งออก/นับคำ/ค้นหา)
  `findEntityInScenes(path,name,x,y)` ใน app.js → คลิกขวาเอนทิตี้ Wiki ใน Explorer (ใช้ auto-link ที่มีอยู่)
  `popupMenu` รองรับ `{disabled:true}` (แถวหัวข้อ · `.k-menu-label`) — เดิมแถวไม่มี `click` จะ throw
  ลบ `src/comments.js` (ระบบเก่า) · บทเรียนใหม่ → ข้อ 30–31

**Storyteller Suite ครบแล้ว**: compile workflows · custom wiki categories · analytics · book manager · timeline (การ์ด+Gantt) · maps (portals) · branch tree · floor plan · centralize

.49 **Panel UX 2 เรื่อง** — เลิก min-tray → **Toolbar Toggle** (ปุ่ม `tb-toggle` 4 ตัวบน toolbar: tree/outline/props/search · มีจุด ● บอกสถานะ · sync ผ่าน `onPanelLayoutChange`) · **Panel Drag** แยก "ลากชื่อ" vs "ลากแท็บ" (`makePanelDraggable` เช็ค `.k-panel-head-title` → `floatOnly`; `makeFloatDraggable` dock เฉพาะ center zone)
.50 **Workspace Canvas Model** — แก้ซูมตัดบรรทัด: แทรก `.workspace {zoom; flow-root}` กั้นกลาง `.pane` กับ `.ProseMirror` → zoom แล้วได้ scrollbar แนวนอนแทนคำถูกตัด · **Home Page** ใช้ `createProjectCard()` (การ์ดสวย) แทน list เปล่า · **FloatBar ใน Wiki** (`syncFloatBarVisible` เช็ค `secEditors`) · **Panel Drag** กลับ logic: ลาก title=float เท่านั้น, ลาก head padding/icon=snap ได้
.51 **Sweep UX 12 ข้อ** — makeFloatDraggable title-vs-bar (ลาก title=ทุก zone, bar=ย้ายอย่างเดียว) · zoom width:fit-content + min-width · pane.on/k-tab.active full-frame box-shadow · reading-mode !important · reading cleanup ครบทุก element · Home → overlay dialog (ออกจาก PANEL_DEFS) · togglePanel → collapsePanel (คงตำแหน่ง) · Kanban empty state · refreshToolbar หลัง focus/typewriter/line-numbers
.52 **Sweep 4 บั๊ก** — zoom `min-width` dynamic ตาม scale (JS: `pageScale*100%` → overflow จริง) · togglePanel กลับเป็น hidePanel/showPanel + จำ `lastSide` · Kanban toggle (`isPanelOpen` check) · Home wider (1100px) + settings 680px · grid 4 คอลัมน์ (`minmax(190px,1fr)`) · ปุ่ม 📱/📋 list view toggle + CSS

.53–.54 ฟีเจอร์บทหนัง (element 15 ชนิด · auto-capitalize · parenthetical auto-wrap · เลือกทั้งฉาก · nbsp)
.55 กู้คืนสาย .49–.52 กลับมารวมกับ .53/.54 + แก้บั๊กที่โผล่ตอนรวม
.56 **บทภาพยนตร์ระดับใช้งานจริง (81-85, 92, 97, 98) + แก้บั๊กจาก human test 13 ข้อ**
  ใหม่: `sp-format.js` (บริสุทธิ์ · unit 74) + `roster-ui.js`
  **[85]** ขนาดกระดาษ (Letter/A4/Legal/เอง) + ระยะขอบ **บน1 ล่าง1 ซ้าย1.5 ขวา1 นิ้ว** เป็น CSS var
    (`--page-w/--mg-*`) **ใช้ร่วมกันทั้งโหมดนิยายและบทหนัง** · `@page` ตอนพิมพ์สร้างจากค่าเดียวกัน
  **[81][82]** ระยะเยื้อง/ความกว้าง/ระยะเว้นบรรทัด ต่อ element เป็น **นิ้ววัดจากขอบกระดาษ** (เลิกใช้ % ที่เพี้ยน)
  **[83]** สไตล์ caps/bold/italic/underline **แยก "บนจอ" กับ "ตอนพิมพ์"** (ตารางติ๊ก 8 ช่อง/แถวในตั้งค่า)
  **[84]** `paginate()` จริง — แบ่งบทพูดข้ามหน้าพร้อม (MORE)/ทวนชื่อ+(cont'd) · แถบสถานะบอก "N หน้า"
  **[92]** (CONTINUED)/CONTINUED:/(MORE)/(cont'd)/Scene/Time แก้ได้
  **[97]** หน้ารายชื่อตัวละคร — หน้าเดี่ยว**ประจำเล่ม** `<Section>/roster.json` · hanging indent ที่คอลัมน์รายละเอียด
    · Scene/Time เลือกเอา/ไม่เอาได้ · สวิตช์ใส่ตอนส่งออก · **ไม่มีเลขหน้า**
  **[98]** 11 ช่องใน project.khn.json (อีเมล/ติดต่อ/Screenplay By/Based On/Revisions by/โทร/ตัวแทน 4 ช่อง/Copyright)
  **ฟอนต์มาตรฐานใหม่: Courier Final Draft 12pt ทุกภาษา ทั้ง 2 โหมด** (`DEFAULT_SCRIPT_FONT`, `edFontPt/spFontPt`)
    → **`BASE_ED_FS`/`BASE_SP_FS` เปลี่ยนเป็น 16px (=12pt)** จาก 15.5/14.5 — เทสที่ hard-code ต้องอัปเดต
  **ปุ่ม Tab/Enter/Shift+Tab ตั้งเองได้ + ปิดได้** (`spCycleKeys`/`spCycleEnabled` · ย้ายจาก keymap → handleKeyDown)
  บั๊ก: SmartType ยืนยันด้วย **Tab อย่างเดียว** (Enter เคยวน) · togglePanel = **ปิด** ไม่ใช่พับ ·
    จับกลุ่มแท็บได้เฉพาะชื่อแผง/20% ขวาของหัวแผง (`inGroupHandle`) · แผงจำที่เดิม (`k2-panel-home`) ·
    ซูมยึดกึ่งกลาง (`keepZoomCenter`) · หน้ากระดาษกว้างคงที่ ไม่หดตามแผง (`width:var(--page-w)`) ·
    `centerPage()` เป็นมุมมองเริ่มต้น · โหมดอ่าน/โฟกัสซ่อน **ทุกโหนดที่ไม่อยู่ในสาย docs** ·
    แผงลอย snap ขอบ (`snapToEdges`) · Kanban เป็น toggle · `ALWAYS_ON_TB` · หน้าแรก 4 คอลัมน์ขนาดนิ่ง ·
    `entitySearchBlob()` ค้นถึงเนื้อในไฟล์เอนทิตี้

**ยังเหลือ**: `search-engine.js` ยังเป็น orphan — Global Search (`global-search.js`) ยังสแกนไฟล์ตรง ๆ ไม่ได้ใช้ inverted index (ควรสลับมาใช้เพื่อความเร็ว) · multiple-drafts-per-book UI (โครงรองรับแล้ว), screenplay align persistence, Campaign/D&D mode, electron-builder + code signing, .icns/.ico icon, native arm64 build. Top เคยบอก paper/indent "อาจต้องปรับปรุง ไว้ก่อน"

**นิสัยผู้ใช้ (Top)**: พูด "เริ่มเลย"/"continue"/"ทำต่อ"/"เอาให้จบ" = ให้ลงมือทำเลย **อย่าถามย้ำ scope** (เคยโดนบ่น "เช็คอะไรละ"). ชอบทำหลายฟีเจอร์รวดเดียวแล้วแก้บั๊กทีเดียว. ส่งสกรีนช็อตบั๊ก = pixel-verify คือเทสจริง. มักจบ session ด้วย "update skill"

---

## วิธีทำงาน

reproduce → แก้ root cause → **เพิ่ม selftest ถาวร** → build+e2e ALL OK → (ถ้า UI) pixel-check → bump version + CHANGELOG + README → rm+rezip + verify จากไฟล์แตกใหม่ → outputs + present. บอกข้อจำกัดตรงๆ (รันบน Linux ทดสอบ win/mac จริงไม่ได้ — โครงสร้างถูก + โค้ดผ่าน e2e). งานใหญ่แยก phase + สื่อสารว่าอะไรเหลือ
