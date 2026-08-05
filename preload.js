const { contextBridge, ipcRenderer } = require('electron');
const call = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);
let _appVersion = '2.0.0';
try { _appVersion = require('./package.json').version || _appVersion; } catch {}
contextBridge.exposeInMainWorld('kapi', {
  appVersion: _appVersion,
  appDir: call('app:dir'),                 // โฟลเดอร์แอป — ใช้หาไฟล์ภาษา/ทรัพยากรที่มากับโปรแกรม (preload sandbox ไม่มี __dirname)
  readFile: call('fs:readFile'), writeFile: call('fs:writeFile'),
  readJson: call('fs:readJson'), exists: call('fs:exists'), listDirs: call('fs:listDirs'),
  listFiles: call('fs:listFiles'), mkdir: call('fs:mkdir'), move: call('fs:move'), remove: call('fs:remove'), isDir: call('fs:isDir'), mtime: call('fs:mtime'),
  copyInto: call('fs:copyInto'), writeImageData: call('fs:writeImageData'),
  writeBytes: call('fs:writeBytes'), readBytes: call('fs:readBytes'), copyFile: call('fs:copyFile'),
  spellBase: call('spell:base'), spellExtra: call('spell:extra'),
  spellAddWord: call('spell:addWord'), spellDownload: call('spell:download'), spellHasBase: call('spell:hasBase'),
  join: call('path:join'), resolve: call('path:resolve'),
  relative: call('path:relative'), toFileURL: call('path:toFileURL'),
  openProjectDialog: call('dialog:openProject'), openImageDialog: call('dialog:openImage'),
  saveAsDialog: call('dialog:saveAs'), savePdfDialog: call('dialog:savePdf'),
  openFileDialog: call('dialog:openFile'),   // เลือกไฟล์เดียว (นำเข้าสถานะฉาก ฯลฯ)
  openDirDialog: call('dialog:openDir'),     // [70] เลือกโฟลเดอร์ปลายทางของ PDF ลายน้ำ
  openScreenplayFile: call('dialog:openScreenplay'), // [alpha.60 ข้อ 62-66] เลือกไฟล์บททุกฟอร์แมต
  // [alpha.60r3 ข้อ 7] ปลั๊กอินระดับผู้ใช้ (%APPDATA%/Killian2/Plugins/) — คืน path ให้ใช้ fs:* ต่อ
  globalPluginsDir: call('plugins:globalDir'),
  listGlobalPlugins: call('plugins:listGlobal'),
  readGlobalSettings: call('settings:readGlobal'),    // [alpha.60 ข้อ 94] อ่าน global settings จาก userData
  writeGlobalSettings: call('settings:writeGlobal'),  // [alpha.60 ข้อ 94] เขียน global settings ไป userData
  print: call('win:print'), printToPdf: call('win:printToPdf'),
  pdfFromHtml: call('pdf:fromHtml'),         // [70] สร้าง PDF จาก HTML (หน้าต่างซ่อน)
  pushRecent: call('recent:push'), listRecent: call('recent:list'),
  testShot: call('test:shot'), revealInOS: call('shell:reveal'),
  // [alpha.62 บั๊ก 3] คลิปบอร์ดผ่าน main — เชื่อถือได้กว่า navigator.clipboard ในหน้าต่างไร้ขอบ
  clipboardWrite: call('clipboard:write'), clipboardRead: call('clipboard:read'),
  winMin: call('win:minimize'), winMax: call('win:maximize'), winClose: call('win:close'),
  quitNow: call('win:quitNow'), menuPopup: call('menu:popup'),
  menuToggles: call('menu:toggles'),        // แจ้งสถานะสวิตช์ให้เมนู native ติ๊กถูกให้ตรง
  httpFetch: call('http:fetch'),
  // สตรีมทีละบรรทัด — main ส่งกลับทาง channel เฉพาะคำขอ แล้วถอด listener เมื่อจบ
  httpStream: (url, options, onLine) => {
    const id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const ch = 'http:stream:' + id;
    const h = (e, line) => { try { onLine(line); } catch {} };
    ipcRenderer.on(ch, h);
    return ipcRenderer.invoke('http:stream', url, options, id)
      .finally(() => ipcRenderer.removeListener(ch, h));
  },
  logWrite: call('log:write'), logRead: call('log:read'), logPath: call('log:path'), logReveal: call('log:reveal'),
  onMenu: (cb) => ipcRenderer.on('menu', (e, ch, ...a) => cb(ch, ...a)),
});
