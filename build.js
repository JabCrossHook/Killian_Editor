const fs = require('fs');
const path = require('path');

// ก๊อปไฟล์ภาษา (แหล่งจริง = languages/) เข้า renderer/languages/
// เพราะ electron-builder แพ็กแค่ renderer/** — ไม่งั้นแอปที่ build แล้วจะไม่มีไฟล์ภาษา
function syncLanguages() {
  const src = path.join(__dirname, 'languages');
  const dst = path.join(__dirname, 'renderer', 'languages');
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    if (f.endsWith('.json')) fs.copyFileSync(path.join(src, f), path.join(dst, f));
  }
}

syncLanguages();

require('esbuild').build({
  entryPoints: ['src/app.js'],
  bundle: true, outfile: 'renderer/bundle.js',
  format: 'iife', platform: 'browser', target: 'chrome120',
  minify: false, sourcemap: false,
}).then(() => console.log('bundle OK')).catch((e) => { console.error(e); process.exit(1); });
