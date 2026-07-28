// export-blog.js — ส่งออกเป็น HTML สำหรับบล็อก (Medium/WordPress)
// เดิมยัด markdown ดิบ (รวม frontmatter) ลง <div> → บล็อกได้ตัวอักษร # ** ติดไปด้วย
import { state, setStatus, log } from './core.js';
import { mdToHtmlBody, escapeHtml, stripComments, stripMentions } from './compile.js';
import { parseMdFile } from './md.js';

export async function exportBlogHTML() {
  if (!state.root) { setStatus('ยังไม่ได้เปิดโปรเจกต์'); return false; }
  setStatus('กำลังสร้าง HTML…');
  try {
    let body = '';
    let nScenes = 0;
    for (const sec of await kapi.listDirs(state.root)) {
      if (['Wiki','Bible','Images','Memos','Recycle','Snapshots','Backups','Plugins','Research'].includes(sec)) continue;
      const sp = await kapi.join(state.root, sec);
      if (!(await kapi.exists(await kapi.join(sp, 'section.json')))) continue;
      const dr = await kapi.join(sp, 'Draft');
      if (!(await kapi.exists(dr))) continue;
      for (const dn of await kapi.listDirs(dr)) {
        const dp = await kapi.join(dr, dn);
        const dj = await kapi.join(dp, 'draft.json');
        if (!(await kapi.exists(dj))) continue;
        const draft = await kapi.readJson(dj);
        const scData = await kapi.readJson(await kapi.join(dp, 'scenes.json')).catch(() => ({}));
        const chMap = scData.chapters || {};
        for (const ch of (draft.chapters || [])) {
          body += `<h2>${escapeHtml(ch.title || '')}</h2>\n`;
          for (const sc of (chMap[ch.guid] || [])) {
            if (sc.type === 'memo') continue;
            const fp = await kapi.join(dp, 'Chapters', ch.folderName, sc.fileName);
            try {
              const raw = await kapi.readFile(fp);
              const { body: md } = parseMdFile(raw);            // ตัด frontmatter ออก
              const clean = stripMentions(stripComments(md));    // เอา %%โน้ต%% / [[ลิงก์]] ออก
              body += `<article>\n<h3>${escapeHtml(sc.title || '')}</h3>\n${mdToHtmlBody(clean)}\n</article>\n`;
              nScenes++;
            } catch (e) { log('warn', 'export-blog: ข้ามฉาก ' + fp, e); }
          }
        }
      }
    }

    const title = escapeHtml(state.title || 'Blog Export');
    const html = `<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
body{max-width:720px;margin:40px auto;padding:0 20px;font:16px/1.8 Georgia,serif;color:#333;background:#fff}
h1{font-size:2em;border-bottom:2px solid #eee;padding-bottom:8px}
h2{font-size:1.5em;margin:32px 0 12px;color:#555}
h3{font-size:1.2em;color:#777}
article{margin:0 0 32px;padding:16px;background:#fafafa;border-radius:8px}
blockquote{border-left:3px solid #ccc;margin:1em 0;padding-left:1em;color:#666}
img{max-width:100%}
@media(prefers-color-scheme:dark){body{color:#e8e6df;background:#1a1a1a}h1{border-color:#333}h2{color:#aaa}article{background:#222}}
</style></head><body>
<h1>${title}</h1>
${body}<p style="color:#999;font-size:12px;margin-top:40px">ส่งออกจาก Killian 2</p>
</body></html>`;

    const dest = await kapi.saveAsDialog((state.title || 'blog') + '-blog.html');
    if (!dest) return false;
    await kapi.writeFile(dest, html);
    setStatus(`ส่งออก HTML สำหรับบล็อกแล้ว (${nScenes} ฉาก): ` + dest);
    return true;
  } catch (e) {
    log('error', 'export-blog failed', e);
    setStatus('ส่งออก HTML ล้มเหลว');
    return false;
  }
}
