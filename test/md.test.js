const { mdToDoc, docToMd, parseMdFile, dumpMdFile } = require('../src/md.js');
const cases = [
  "ธรรมดา",
  "# หัวข้อใหญ่",
  "### หัวสาม",
  "นี่ **หนา** และ *เอียง* กับ _ขีด_ และ ~~ฆ่า~~",
  "ผสม ***หนาเอียง*** จ้า",
  "ซ้อน **หนา _ขีดใน_ ต่อ**",
  "> คำพูดยกมา",
  "> สองบรรทัดติดกัน",
  "- รายการหนึ่ง",
  "- รายการ **หนา**",
  "1. ข้อแรก",
  "2. ข้อสอง",
  "",
  "บรรทัดว่างด้านบน",
  "![ภาพ](../../../Images/t.png)",
  "[[ลิงก์วิกิ]] และ ((โน้ต))",
  "ดาวเดี่ยว ** ค้าง",
  "5. เริ่มนับที่ห้า",
  // [alpha.61 ข้อ 3] Shift+Enter = hard break (แบ็กสแลชท้ายบรรทัด · ย่อหน้าเดียวกัน)
  "บรรทัดบน\\",
  "บรรทัดล่างในย่อหน้าเดียวกัน",
  // [alpha.61 ข้อ 3] Ctrl+Enter = ขึ้นหน้าใหม่ด้วยมือ
  "<!--pagebreak-->",
  "หลังขึ้นหน้าใหม่",
  // [alpha.61 ข้อ 3] Tab = อักขระแท็บจริงในเนื้อความ
  "\tเยื้องด้วยแท็บ",
];
const md = cases.join("\n");
const back = docToMd(mdToDoc(md));
if (back !== md) {
  const a = back.split("\n"), b = md.split("\n");
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    console.log(a[i] === b[i] ? "  " : "!!", JSON.stringify(a[i]), "|", JSON.stringify(b[i]));
  throw new Error("round-trip mismatch");
}
console.log("round-trip OK (" + cases.length + " lines)");
const f = "---\ntitle: ทดสอบ\nformat: prose\ntags: [a, b]\n---\n\nเนื้อหา **หนา**";
const { meta, body } = parseMdFile(f);
if (meta.title !== "ทดสอบ" || meta.tags.join() !== "a,b" || body !== "เนื้อหา **หนา**") throw new Error("fm");
const again = parseMdFile(dumpMdFile(meta, body));
if (again.body !== body || again.meta.title !== meta.title) throw new Error("fm round-trip");
console.log("frontmatter OK");
const doc2 = { type: "doc", content: [{ type: "paragraph", content: [
  { type: "text", text: "aa ", marks: [{type:"strong"}]},
  { type: "text", text: "bb", marks: [{type:"strong"},{type:"underline"}]},
  { type: "text", text: " cc", marks: [{type:"underline"}]},
  { type: "text", text: " dd" }]}]};
const one = docToMd(doc2), two = docToMd(mdToDoc(one));
if (one !== two) throw new Error("overlap unstable: " + one + " / " + two);
console.log("overlap stable:", one);

// ── [alpha.61 ข้อ 3] hard break / page break / tab — ตรวจ "โครงสร้าง" ไม่ใช่แค่ round-trip ──
{
  const d = mdToDoc("บน\\\nล่าง");
  if (d.content.length !== 1) throw new Error("hard break: ต้องเป็นย่อหน้าเดียว ได้ " + d.content.length);
  const types = d.content[0].content.map((n) => n.type);
  if (JSON.stringify(types) !== JSON.stringify(["text", "hard_break", "text"]))
    throw new Error("hard break: โครงผิด " + JSON.stringify(types));
  if (docToMd(d) !== "บน\\\nล่าง") throw new Error("hard break: เขียนกลับไม่ตรง " + JSON.stringify(docToMd(d)));

  // แบ็กสแลชคู่ (`\\`) = แบ็กสแลชจริง ไม่ใช่ hard break → ต้องยังเป็นคนละย่อหน้า
  const d2 = mdToDoc("จริง\\\\\nแยกย่อหน้า");
  if (d2.content.length !== 2) throw new Error("escaped backslash ไม่ควรเป็น hard break");

  const d3 = mdToDoc("ก่อน\n<!--pagebreak-->\nหลัง");
  if (d3.content.map((n) => n.type).join(",") !== "paragraph,page_break,paragraph")
    throw new Error("page break: โครงผิด " + d3.content.map((n) => n.type).join(","));
  if (docToMd(d3) !== "ก่อน\n<!--pagebreak-->\nหลัง") throw new Error("page break: เขียนกลับไม่ตรง");

  const d4 = mdToDoc("\tเยื้อง");
  if (d4.content[0].content[0].text !== "\tเยื้อง") throw new Error("tab หายระหว่างอ่าน");
  if (docToMd(d4) !== "\tเยื้อง") throw new Error("tab หายระหว่างเขียน");

  // hard break ต้องปิดเครื่องหมายรูปแบบก่อนขึ้นบรรทัด ไม่งั้นอ่านกลับไม่ได้
  const d5 = { type: "doc", content: [{ type: "paragraph", content: [
    { type: "text", text: "หนา", marks: [{ type: "strong" }] },
    { type: "hard_break" },
    { type: "text", text: "ต่อ", marks: [{ type: "strong" }] }] }] };
  const md5 = docToMd(d5);
  if (md5 !== "**หนา**\\\n**ต่อ**") throw new Error("hard break + mark: " + JSON.stringify(md5));
  if (docToMd(mdToDoc(md5)) !== md5) throw new Error("hard break + mark ไม่นิ่ง");
}
console.log("alpha.61 hard break / page break / tab OK");
