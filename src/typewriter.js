// typewriter.js â€” à¸šà¸£à¸£à¸—à¸±à¸”à¸—à¸µà¹ˆà¸à¸³à¸¥à¸±à¸‡à¹€à¸‚à¸µà¸¢à¸™à¸­à¸¢à¸¹à¹ˆà¸à¸¶à¹ˆà¸‡à¸à¸¥à¸²à¸‡à¸«à¸™à¹‰à¸²à¸ˆà¸­à¹€à¸ªà¸¡à¸­ (Ctrl+Shift+T)
// à¸£à¸°à¸§à¸±à¸‡: selection.anchorNode à¸¡à¸±à¸à¹€à¸›à¹‡à¸™ Text node à¸‹à¸¶à¹ˆà¸‡ "à¹„à¸¡à¹ˆà¸¡à¸µ" .closest() â†’ à¸•à¹‰à¸­à¸‡à¸‚à¸¶à¹‰à¸™ parentElement à¸à¹ˆà¸­à¸™
import { cursorBlock } from './focus-mode.js';

let _twActive = false;

export function isTypewriter() { return _twActive; }

export function toggleTypewriter(on) {
  const want = on === undefined ? !_twActive : !!on;
  if (want === _twActive) return _twActive;
  _twActive = want;
  if (_twActive) {
    document.addEventListener('keyup', twScroll);
    document.addEventListener('click', twScroll);
    twScroll();
  } else {
    document.removeEventListener('keyup', twScroll);
    document.removeEventListener('click', twScroll);
  }
  return _twActive;
}

// à¹€à¸¥à¸·à¹ˆà¸­à¸™à¹ƒà¸«à¹‰à¸šà¸£à¸£à¸—à¸±à¸”à¸—à¸µà¹ˆà¸¡à¸µ cursor à¸­à¸¢à¸¹à¹ˆà¸à¸¥à¸²à¸‡ pane â€” à¸„à¸·à¸™ true à¹€à¸¡à¸·à¹ˆà¸­à¸«à¸²à¸šà¸£à¸£à¸—à¸±à¸”à¹€à¸ˆà¸­à¹à¸¥à¸°à¹€à¸¥à¸·à¹ˆà¸­à¸™à¸ˆà¸£à¸´à¸‡
export function twScroll() {
  if (!_twActive) return false;
  const cur = cursorBlock();          // ใช้ตัวเดียวกับโหมดโฟกัส (อิง ProseMirror ก่อน)
  if (!cur) return false;
  const { pm, blk } = cur;
  const pane = pm.closest('.pane');
  if (!pane) return false;
  const pr = pane.getBoundingClientRect();
  const br = blk.getBoundingClientRect();
  const target = pane.scrollTop + (br.top - pr.top) - pr.height / 2 + br.height / 2;
  pane.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  return true;
}
