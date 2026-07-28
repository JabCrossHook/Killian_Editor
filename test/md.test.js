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
