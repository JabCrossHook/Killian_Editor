// ai-settings.js — ตั้งค่า AI (Provider/Key/Model/Temperature) + ทดสอบเชื่อมต่อ + นับการใช้งาน
// หลักสำคัญ 2 ข้อ:
//  1) เรียก API ผ่าน main process (kapi.httpFetch) — fetch จาก renderer โดน CORS (origin เป็น file://)
//  2) API key ไม่เก็บใน project.khn.json (ไฟล์ที่ตั้งใจให้ก๊อป/แชร์) → เก็บแยกที่ <root>/ai-key.json
import { $, el, state, setStatus, log } from './core.js';

const KEY_FILE = 'ai-key.json';
let _keyCache = null;       // { apiKey } — อ่านครั้งเดียวต่อโปรเจกต์

// ---- ค่าที่ไม่ลับ (เก็บใน project.khn.json ได้) ----
export function getAISettings() {
  if (!state.meta) return {};
  return state.meta.ai || {};
}

export function saveAISettings(cfg) {
  if (!state.meta) return;
  const { apiKey, ...safe } = cfg;                 // กัน key หลุดลง project.khn.json
  state.meta.ai = { ...(state.meta.ai || {}), ...safe };
}

// ---- API key (ไฟล์แยก) ----
export async function loadApiKey() {
  if (_keyCache) return _keyCache.apiKey || '';
  if (!state.root) return '';
  try {
    const p = await kapi.join(state.root, KEY_FILE);
    if (await kapi.exists(p)) { _keyCache = await kapi.readJson(p); return _keyCache.apiKey || ''; }
  } catch (e) { log('warn', 'ai: อ่าน ai-key.json ไม่ได้', e); }
  _keyCache = { apiKey: '' };
  return '';
}

export async function saveApiKey(apiKey) {
  if (!state.root) return false;
  _keyCache = { apiKey };
  await kapi.writeFile(await kapi.join(state.root, KEY_FILE),
                       JSON.stringify({ apiKey, note: 'ไฟล์นี้เก็บคีย์ส่วนตัว — อย่าแชร์/อย่าใส่ใน zip ที่ส่งต่อ' }, null, 2));
  return true;
}

export function clearKeyCache() { _keyCache = null; }

// ---- เรียก AI (ผ่าน main process) ----
export async function callAI(prompt, system = '') {
  const ai = getAISettings();
  const apiKey = await loadApiKey();
  const provider = ai.provider || 'openai';
  if (!apiKey && provider !== 'ollama') {
    setStatus('❌ ยังไม่ได้ตั้งค่า AI — ไฟล์ → ตั้งค่า AI');
    return null;
  }
  const model = ai.model || (provider === 'claude' ? 'claude-sonnet-4-5' : provider === 'ollama' ? 'llama3' : 'gpt-4o-mini');
  const temperature = ai.temperature ?? 0.7;
  const maxTokens = ai.maxTokens || 500;

  let url, headers, body;
  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey };
    body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], temperature, max_tokens: maxTokens };
  } else if (provider === 'claude') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
    body = { model, max_tokens: maxTokens, temperature, system, messages: [{ role: 'user', content: prompt }] };
  } else {
    url = (ai.ollamaUrl || 'http://localhost:11434') + '/api/generate';
    headers = { 'Content-Type': 'application/json' };
    body = { model, prompt: (system ? system + '\n\n' : '') + prompt, stream: false };
  }

  try {
    const res = await kapi.httpFetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res || !res.ok) {
      log('error', 'AI HTTP ' + (res?.status), (res?.body || '').slice(0, 300));
      setStatus('❌ AI: HTTP ' + (res?.status || 'error'));
      return null;
    }
    const data = JSON.parse(res.body);
    let text = '';
    if (provider === 'openai') text = data.choices?.[0]?.message?.content || '';
    else if (provider === 'claude') text = data.content?.[0]?.text || '';
    else text = data.response || '';
    recordUsage(data.usage?.total_tokens || Math.round(text.length / 4), provider, model);
    return text.trim();
  } catch (e) {
    log('error', 'AI call failed', e);
    setStatus('❌ เชื่อมต่อ AI ไม่ได้: ' + e.message);
    return null;
  }
}

function recordUsage(tokens, provider, model) {
  if (!state.meta) return;
  state.meta.ai = state.meta.ai || {};
  const usage = state.meta.ai.usage || [];
  usage.push({ date: new Date().toISOString(), tokens, provider, model });
  if (usage.length > 500) usage.splice(0, usage.length - 500);
  state.meta.ai.usage = usage;
}

export async function testAIConnection() {
  setStatus('กำลังทดสอบเชื่อมต่อ AI…');
  const result = await callAI('ตอบกลับคำว่า ok เท่านั้น', '');
  const ok = !!result && result.toLowerCase().includes('ok');
  setStatus(ok ? '✅ AI: เชื่อมต่อสำเร็จ' : '❌ AI: ทดสอบล้มเหลว');
  return ok;
}

// ---- กล่องตั้งค่า ----
export async function showAISettingsDialog() {
  if (!state.root) { setStatus('เปิดโปรเจกต์ก่อนจึงตั้งค่า AI ได้'); return; }
  const ai = getAISettings();
  const curKey = await loadApiKey();
  const ov = el('div', 'k-overlay');
  const box = el('div', 'k-dialog k-ai-settings');
  box.append(el('div', 'k-dlg-title', '🤖 ตั้งค่า AI'));

  const mkRow = (label) => { const r = el('div', 'wiki-row'); r.append(el('label', null, label)); box.append(r); return r; };

  const provRow = mkRow('ผู้ให้บริการ');
  const provSel = el('select', 'wiki-input k-dlg-select');
  for (const [v, t] of [['openai', 'OpenAI'], ['claude', 'Claude (Anthropic)'], ['ollama', 'Ollama (เครื่องตัวเอง)']]) {
    const o = el('option', null, t); o.value = v; provSel.append(o);
  }
  provSel.value = ai.provider || 'openai';
  provRow.append(provSel);

  const keyRow = mkRow('API Key');
  const keyInp = el('input', 'wiki-input'); keyInp.type = 'password'; keyInp.value = curKey; keyInp.placeholder = 'sk-…';
  keyRow.append(keyInp);
  const keyNote = el('div', 'dim', `เก็บแยกที่ ${KEY_FILE} ในโฟลเดอร์โปรเจกต์ (ไม่อยู่ใน project.khn.json ที่แชร์กัน)`);
  keyNote.style.cssText = 'font-size:11px;margin:-4px 0 6px';
  box.append(keyNote);

  const modelRow = mkRow('โมเดล');
  const modelInp = el('input', 'wiki-input'); modelInp.value = ai.model || ''; modelInp.placeholder = 'gpt-4o-mini / claude-sonnet-4-5 / llama3';
  modelRow.append(modelInp);

  const tempRow = mkRow('ความสร้างสรรค์ (temperature)');
  const tempRng = el('input', 'wiki-input'); tempRng.type = 'range'; tempRng.min = '0'; tempRng.max = '1'; tempRng.step = '0.1';
  tempRng.value = String(ai.temperature ?? 0.7);
  const tempLbl = el('span', null, ' ' + (ai.temperature ?? 0.7));
  tempRng.oninput = () => { tempLbl.textContent = ' ' + tempRng.value; };
  tempRow.append(tempRng, tempLbl);

  const tokRow = mkRow('ความยาวสูงสุด (tokens)');
  const tokInp = el('input', 'wiki-input'); tokInp.type = 'number'; tokInp.value = String(ai.maxTokens || 500);
  tokInp.min = '50'; tokInp.max = '8192';
  tokRow.append(tokInp);

  // แถว Ollama URL — แสดง/ซ่อนตามผู้ให้บริการที่เลือก (เดิมสร้างแล้วไม่เคยอ่านค่ากลับ)
  const urlRow = mkRow('Ollama URL');
  const urlInp = el('input', 'wiki-input'); urlInp.value = ai.ollamaUrl || 'http://localhost:11434';
  urlRow.append(urlInp);
  const syncProv = () => {
    urlRow.style.display = provSel.value === 'ollama' ? '' : 'none';
    keyRow.style.display = provSel.value === 'ollama' ? 'none' : '';
  };
  provSel.onchange = syncProv;
  syncProv();

  const usage = ai.usage || [];
  if (usage.length) {
    const total = usage.reduce((s, u) => s + (u.tokens || 0), 0);
    const last = usage[usage.length - 1];
    const stat = el('div', 'dim',
      `รวม ${total.toLocaleString()} tokens · ${usage.length} ครั้ง · ล่าสุด ${new Date(last.date).toLocaleString('th-TH')}`);
    stat.style.cssText = 'margin:10px 0;font-size:12px';
    box.append(stat);
  }

  const collect = () => ({
    provider: provSel.value, model: modelInp.value.trim(),
    temperature: parseFloat(tempRng.value), maxTokens: parseInt(tokInp.value, 10) || 500,
    ollamaUrl: urlInp.value.trim() || 'http://localhost:11434',
  });

  const btns = el('div', 'k-dlg-btns');
  const testB = el('button', null, '🔌 ทดสอบเชื่อมต่อ');
  const cB = el('button', null, 'ยกเลิก');
  const okB = el('button', 'k-ok', 'บันทึก');
  btns.append(testB, cB, okB);
  box.append(btns);
  ov.append(box);
  document.body.append(ov);

  testB.onclick = async () => {
    saveAISettings(collect());
    await saveApiKey(keyInp.value.trim());
    await testAIConnection();
  };
  cB.onclick = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  okB.onclick = async () => {
    saveAISettings(collect());
    await saveApiKey(keyInp.value.trim());
    const { saveProjectMeta } = await import('./app.js');
    await saveProjectMeta();
    ov.remove();
    setStatus('บันทึกการตั้งค่า AI แล้ว');
  };
}
