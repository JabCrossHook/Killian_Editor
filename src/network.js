// Story Network — alpha.67 · Canvas 2D/3D with full feature set
import { visualTagFor } from './visual-tags.js';
import { REL_COLOR, REL_TYPES, categorizeRole } from './relationship-types.js';
import { state } from './core.js';
import { seedLayout, forceLayout, loadPositions, savePositions } from './network-layout.js';
import { ensureAutoLink, getBacklinksFor } from './world-story/auto-link-ui.js';

REL_COLOR['co-occur'] = '#8a8885';
REL_COLOR['scene-link'] = '#5caf8a';
REL_COLOR['ent-scene'] = '#d9955f';
const CAT_COLOR = { characters:'#d97757', locations:'#7aa8d8', items:'#6fae8a', lore:'#b58fc9',
  scene:'#e8c95c', chapter:'#c08a5e', book:'#a8d870', section:'#8ec8c8' };
const CAT_ARR = ['characters','locations','items','lore','scene','chapter','book'];
const BG = '#1a1a18', GRID = '#3a3a36';
const WIKI_CATS = new Set(['characters','locations','items','lore']);

function tagStyle(n) { for(const t of n.tags||[]){const v=visualTagFor(t);if(v)return v;} return null; }
function isStruct(n){return n.cat==='scene'||n.cat==='chapter'||n.cat==='book'||n.cat==='section';}
function hexToRgba(hex, alpha){const h=hex.replace('#','');const r=parseInt(h.substring(0,2),16);const g=parseInt(h.substring(2,4),16);const b=parseInt(h.substring(4,6),16);return`rgba(${r},${g},${b},${alpha})`;}

// ── toolbar ──
function buildToolbar(pane, cb) {
  const bar=document.createElement('div');bar.className='net-toolbar';
  const tg=document.createElement('button');tg.className='net-tbar-toggle';tg.textContent='▼';tg.title='ซ่อน';
  const bd=document.createElement('div');bd.className='net-tbar-body';let col=false;
  tg.onclick=()=>{col=!col;bd.style.display=col?'none':'';tg.textContent=col?'▶':'▼';};
  const ca=new Set(CAT_ARR.slice(0,4)),tf=new Set([...REL_TYPES.map(t=>t.key),'co-occur','scene-link','ent-scene']);
  const cr=document.createElement('div');cr.className='net-tbar-row';
  [{k:'characters',l:'ตัวละคร',c:'#d97757'},{k:'locations',l:'สถานที่',c:'#7aa8d8'},{k:'items',l:'ไอเทม',c:'#6fae8a'},{k:'lore',l:'ตำนาน',c:'#b58fc9'}].forEach(x=>{const b=document.createElement('button');b.className='net-tcat';b.style.setProperty('--tcolor',x.c);b.title=x.l;b.dataset.active='1';b.classList.add('on');b.textContent=x.l;b.onclick=()=>{const a=b.dataset.active==='1';b.dataset.active=a?'0':'1';if(a)b.classList.remove('on');else b.classList.add('on');if(a)ca.delete(x.k);else ca.add(x.k);cb.filter(ca,tf);};cr.appendChild(b);});
  const tr=document.createElement('div');tr.className='net-tbar-row net-tbar-types';
  REL_TYPES.forEach(t=>{const b=document.createElement('button');b.className='net-ttype';b.style.setProperty('--tcolor',t.color);b.title=t.label;b.dataset.active='1';b.classList.add('on');b.onclick=()=>{const a=b.dataset.active==='1';b.dataset.active=a?'0':'1';if(a)b.classList.remove('on');else b.classList.add('on');if(a)tf.delete(t.key);else tf.add(t.key);cb.filter(ca,tf);};tr.appendChild(b);});
  (()=>{const b=document.createElement('button');b.className='net-ttype net-ttype-co';b.style.setProperty('--tcolor','#8a8885');b.title='ปรากฏร่วม';b.dataset.active='1';b.classList.add('on');b.onclick=()=>{const a=b.dataset.active==='1';b.dataset.active=a?'0':'1';if(a)b.classList.remove('on');else b.classList.add('on');if(a)tf.delete('co-occur');else tf.add('co-occur');cb.filter(ca,tf);};tr.appendChild(b);})();
  (()=>{const b=document.createElement('button');b.className='net-ttype net-ttype-sc';b.style.setProperty('--tcolor','#5caf8a');b.title='ลิงก์ฉาก';b.dataset.active='1';b.classList.add('on');b.onclick=()=>{const a=b.dataset.active==='1';b.dataset.active=a?'0':'1';if(a)b.classList.remove('on');else b.classList.add('on');if(a)tf.delete('scene-link');else tf.add('scene-link');cb.filter(ca,tf);};tr.appendChild(b);})();
  (()=>{const b=document.createElement('button');b.className='net-ttype net-ttype-es';b.style.setProperty('--tcolor','#d9955f');b.title='เอนทิตี้↔ฉาก';b.dataset.active='1';b.classList.add('on');b.onclick=()=>{const a=b.dataset.active==='1';b.dataset.active=a?'0':'1';if(a)b.classList.remove('on');else b.classList.add('on');if(a)tf.delete('ent-scene');else tf.add('ent-scene');cb.filter(ca,tf);};tr.appendChild(b);})();
  const sw=document.createElement('div');sw.className='net-tbar-search';
  const si=document.createElement('input');si.type='text';si.className='net-tbar-input';si.placeholder='🔍 ค้นหา…';
  let tm;si.oninput=()=>{clearTimeout(tm);tm=setTimeout(()=>cb.search(si.value.trim()),200);};si.onkeydown=e=>{if(e.key==='Enter')cb.search(si.value.trim());};sw.appendChild(si);
  const gridRow=document.createElement('div');gridRow.className='net-tbar-row';
  const gridBtn=document.createElement('button');gridBtn.className='net-tbar-btn net-tog on';gridBtn.textContent='📐';gridBtn.title='แสดง grid';
  const gridSize=document.createElement('input');gridSize.type='range';gridSize.className='net-grid-slider';gridSize.min='20';gridSize.max='120';gridSize.value='60';gridSize.title='ขนาด grid: 60px';
  gridBtn.onclick=()=>{cb.toggleGrid();gridBtn.classList.toggle('on');};
  gridSize.oninput=()=>{cb.setGridPx(Number(gridSize.value));gridSize.title='ขนาด grid: '+gridSize.value+'px';};
  const gridAlpha=document.createElement('input');gridAlpha.type='range';gridAlpha.className='net-grid-slider';gridAlpha.min='1';gridAlpha.max='100';gridAlpha.value='12';gridAlpha.title='โปร่งใส grid: 12%';
  gridAlpha.oninput=()=>{cb.setGridAlpha(Number(gridAlpha.value)/100);gridAlpha.title='โปร่งใส grid: '+gridAlpha.value+'%';};
  gridRow.append(gridBtn,gridSize,gridAlpha);
  const btns=document.createElement('div');btns.className='net-tbar-actions';
  [{t:'🔄',ti:'รีเฟรช',f:cb.refresh},{t:'🖼',ti:'แสดงรูปย่อ',f:cb.toggleImages,cl:'net-tog on'},{t:'🗺',ti:'Minimap',f:cb.toggleMinimap,cl:'net-tog'},{t:'3D',ti:'สลับ 2D/3D',f:cb.toggle3D,cl:'net-tog'},{t:'📥',ti:'ส่งออก',f:cb.export},{t:'⤾',ti:'รีเซ็ต',f:cb.reset,cl:'net-reset'}].forEach(x=>{const b=document.createElement('button');b.className='net-tbar-btn'+(x.cl?' '+x.cl:'');b.textContent=x.t;b.title=x.ti;b.onclick=()=>{if(x.cl==='net-tog'){b.classList.toggle('on');}else if(x.cl==='net-tog on'){b.classList.toggle('on');}x.f();};btns.appendChild(b);});
  bd.append(cr,tr,gridRow,sw,btns);bar.append(tg,bd);pane.appendChild(bar);
  return {bar,btns,destroy:()=>bar.remove()};
}

// ═════ 3D projection (pure world coordinates, no scale/center — canvas transform handles that) ═════
function project3D(x, y, z, rx, ry) {
  const cosX = Math.cos(rx), sinX = Math.sin(rx);
  const cosY = Math.cos(ry), sinY = Math.sin(ry);
  let px = x * cosY + z * sinY;
  let py = y * cosX - (x * -sinY + z * cosY) * sinX;
  return { x: px, y: py, zDepth: x * -sinY + z * cosY };
}

// ═════ draw rounded rect with dark background ═════
function drawLabelBox(c, text, cx, cy, fontSize) {
  c.font = fontSize + 'px "Segoe UI","Leelawadee UI",sans-serif';
  const m = c.measureText(text);
  const tw = m.width + 12, th = fontSize + 10;
  const x = cx - tw / 2, y = cy - th / 2, r = 6;
  c.fillStyle = 'rgba(0,0,0,0.82)';
  c.beginPath();
  c.moveTo(x + r, y); c.lineTo(x + tw - r, y);
  c.quadraticCurveTo(x + tw, y, x + tw, y + r);
  c.lineTo(x + tw, y + th - r);
  c.quadraticCurveTo(x + tw, y + th, x + tw - r, y + th);
  c.lineTo(x + r, y + th);
  c.quadraticCurveTo(x, y + th, x, y + th - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
  c.closePath(); c.fill();
  c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, cx, cy + 1);
  return { w: tw + 4, h: th + 4 };
}

function drawEdgeLabel(c, text, x, y, fontSize) {
  c.font = fontSize + 'px "Segoe UI","Leelawadee UI",sans-serif';
  const m = c.measureText(text); const tw = m.width + 10, th = fontSize + 8;
  const bx = x - tw / 2, by = y - th / 2, r = 4;
  c.fillStyle = 'rgba(0,0,0,0.85)'; c.beginPath();
  c.moveTo(bx + r, by); c.lineTo(bx + tw - r, by);
  c.quadraticCurveTo(bx + tw, by, bx + tw, by + r);
  c.lineTo(bx + tw, by + th - r);
  c.quadraticCurveTo(bx + tw, by + th, bx + tw - r, by + th);
  c.lineTo(bx + r, by + th);
  c.quadraticCurveTo(bx, by + th, bx, by + th - r);
  c.lineTo(bx, by + r); c.quadraticCurveTo(bx, by, bx + r, by);
  c.closePath(); c.fill();
  c.fillStyle = '#e0e0dc'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, x, y + 1);
}

function buildMinimap(pane) {
  const mc = document.createElement('canvas'); mc.className = 'net-minimap'; mc.width = 160; mc.height = 120;
  pane.appendChild(mc); return mc;
}
function buildStatusBar(pane) {
  const sb = document.createElement('div'); sb.className = 'net-status';
  pane.appendChild(sb); return sb;
}
function buildTipBar(pane) {
  const tb = document.createElement('div'); tb.className = 'net-tip';
  tb.textContent = '🖱 ลากพื้น=เลื่อน · ล้อ=ซูม · ลากโหนด=ย้าย · Shift+คลิก=ผลัก · ดับเบิลคลิก=เปิด · คลิกขวา=เมนู';
  pane.appendChild(tb); return tb;
}

// ═════ StoryNetwork ═════
export class StoryNetwork {
  constructor(pane, { loadEntities, onOpen=null, onOpenScene=null, onReveal=null,
                       onDeleteStruct=null, onRenameStruct=null, onDuplicateStruct=null, onAddChild=null }) {
    this.pane=pane; this.onOpen=onOpen; this.onOpenScene=onOpenScene; this.onReveal=onReveal;
    this.onDeleteStruct=onDeleteStruct; this.onRenameStruct=onRenameStruct;
    this.onDuplicateStruct=onDuplicateStruct; this.onAddChild=onAddChild;
    this.loadEntities=loadEntities;
    this.title='Story Network'; this.dirty=false;
    this.nodes=[];this.edges=[];this.drag=null;
    this._scale=1;this._cx=0;this._cy=0;
    this._hoverNode=null;
    this._catFilter=new Set(CAT_ARR.slice(0,4));
    this._typeFilter=new Set([...REL_TYPES.map(t=>t.key),'co-occur','scene-link','ent-scene']);
    this._searchQuery='';
    this._mode3D=false; this._rx=0.4; this._ry=-0.3;
    this._showImages=true; this._showMinimap=false;
    this._showGrid=true; this._gridPx=60; this._gridAlpha=0.12;
    this._orbitDrag=null;

    this.canvas=document.createElement('canvas');
    this.canvas.className='net-canvas';
    pane.appendChild(this.canvas);

    this.canvas.addEventListener('mousedown',e=>this._down(e));
    this.canvas.addEventListener('mousemove',e=>this._move(e));
    this._upDoc=e=>this._up(e);
    document.addEventListener('mouseup',this._upDoc);
    this.canvas.addEventListener('wheel',e=>{e.preventDefault();this._zoom(e);});
    this.canvas.addEventListener('contextmenu',e=>{e.preventDefault();this._ctxMenu(e);});
    this.canvas.addEventListener('dblclick',e=>{e.preventDefault();const{node}=this._hit(e);if(!node)return;const st=isStruct(node);if(st&&this.onOpenScene)this.onOpenScene(node.file);else if(!st&&this.onOpen)this.onOpen(node);});

    this._resize=()=>{this._fit();this.draw();};
    window.addEventListener('resize',this._resize);
    if(typeof ResizeObserver!=='undefined'){
      this._ro=new ResizeObserver(()=>{try{this._fit();this.draw();this._updateMinimap();}catch{}});
      this._ro.observe(pane);
    }

    const self=this;
    this._tb=buildToolbar(pane,{
      filter(ca,tf){self._catFilter=ca;self._typeFilter=tf;self.draw();},
      search(q){self._searchQuery=q;self.draw();},
      refresh(){self.refresh();},
      toggleImages(){self._showImages=!self._showImages;self.draw();},
      toggleMinimap(){self._showMinimap=!self._showMinimap;self._mm.style.display=self._showMinimap?'':'none';self._updateMinimap();},
      toggle3D(){self._mode3D=!self._mode3D;self._fit();self.draw();if(self._showMinimap)self._updateMinimap();},
      toggleGrid(){self._showGrid=!self._showGrid;self.draw();},
      setGridPx(v){self._gridPx=v;self.draw();},
      setGridAlpha(v){self._gridAlpha=v;self.draw();},
      export(){self.draw();const d=self.canvas.toDataURL('image/png');const a=document.createElement('a');a.download='story-network.png';a.href=d;document.body.appendChild(a);a.click();document.body.removeChild(a);},
      reset(){self._scale=1;self._cx=0;self._cy=0;self._rx=0.4;self._ry=-0.3;self.draw();if(self._showMinimap)self._updateMinimap();},
    });

    this._mm = buildMinimap(pane); this._mm.style.display = 'none';
    this._sb = buildStatusBar(pane);
    this._tip = buildTipBar(pane);

    this._fit(); this.readColors(); this.draw(); this.refresh();
  }

  readColors(){
    const nc=state.settings?.netColors||{};
    const cc=nc.cats||{}, ce=nc.edges||{};
    this._catCol={
      characters: cc['nc-char']||'#d97757', locations: cc['nc-loca']||'#7aa8d8',
      items: cc['nc-item']||'#6fae8a', lore: cc['nc-lore']||'#b58fc9',
      scene: cc['nc-scen']||'#e8c95c', chapter: cc['nc-chap']||'#c08a5e',
      book: cc['nc-chap']||'#a8d870', section: cc['nc-sect']||'#8ec8c8',
    };
    this._edgeCol={...REL_COLOR,
      'scene-link': ce['ne-sl']||'#5caf8a', 'co-occur': ce['ne-co']||'#8a8885',
      'ent-scene': ce['ne-es']||'#d9955f',
    };
    if(ce['ne-rel']){for(const k of Object.keys(this._edgeCol)){if(!['scene-link','co-occur','ent-scene'].includes(k))this._edgeCol[k]=ce['ne-rel'];}}
  }

  async refresh() {
    try {
      this._sb && (this._sb.textContent = 'กำลังโหลด…');
      const ents=await this.loadEntities();
      if (!ents || !Array.isArray(ents)) { this._sb && (this._sb.textContent = 'โหลดผิดพลาด'); return; }
      if (!ents.length) { this._sb && (this._sb.textContent = 'ไม่พบเอนทิตี้ — สร้างตัวละคร/สถานที่ใน Wiki ก่อน'); this.draw(); this._updateStatus(); return; }
      const W=Math.max(600,this.pane.clientWidth||900);
      const H=Math.max(400,this.pane.clientHeight||600);
      const D = this._mode3D ? 400 : 0;
      const pos=loadPositions();
      this.nodes = ents.map((e)=>({...e, x:0,y:0,z:0}));
      seedLayout(this.nodes,pos,{width:W,height:H,depth:D||400});
      const byName=Object.fromEntries(this.nodes.map(n=>[n.name,n]));
      this.edges=[];const seen=new Set();
      for(const n of this.nodes){for(const r of n.relationships||[]){const t=byName[r.targetName||r.target];if(!t)continue;const k=[n.name,t.name].sort().join('|');if(seen.has(k))continue;seen.add(k);this.edges.push({a:n,b:t,role:r.role||'',type:r.type||categorizeRole(r.role)});}}
      await this._loadCoOccur(byName,seen);
      this._linkStructNodes(byName,seen);
      const pinned=new Set();
      for(const n of this.nodes){if(pos&&pos[n.name])pinned.add(n);}
      forceLayout(this.nodes,this.edges,{width:W,height:H,depth:D||400,iters:280,pinned});
      savePositions(this.nodes);
      this._fit();this.draw();this._updateMinimap();
    }catch(e){console.error('SN refresh error:',e?.message||e);}
  }

  async _loadCoOccur(byName,seen) {
    try {
      const root=state.root;if(!root)return;
      const bl=(state.meta&&state.meta.backlinks)||{};
      const hasBl=Object.keys(bl).length>0;
      if(hasBl){
        const byFile={};
        for(const n of this.nodes){let rel=n.file;if(rel.startsWith(root))rel=rel.slice(root.length);rel=rel.replace(/^[/\\]+/,'').replace(/\\/g,'/');byFile[rel]=n;const p=rel.split('/');if(p.length>=2&&(p[0]==='Wiki'||p[0]==='Bible')){const nr=p.slice(1).join('/');if(!byFile[nr])byFile[nr]=n;}}
        const pairs={};const keys=Object.keys(bl);
        for(let i=0;i<keys.length;i++){const a=byFile[keys[i]];if(!a)continue;const aS=new Set(bl[keys[i]]);
          for(let j=i+1;j<keys.length;j++){const b=byFile[keys[j]];if(!b||a===b)continue;const sh=bl[keys[j]].filter(s=>aS.has(s)).length;if(sh<2)continue;
            const k=[a.name,b.name].sort().join('|');if(seen.has(k))continue;pairs[k]=Math.max(pairs[k]||0,sh);}}
        for(const[k,count] of Object.entries(pairs)){const[na,nb]=k.split('|');const a=byName[na],b=byName[nb];if(!a||!b)continue;seen.add(k);this.edges.push({a,b,role:'co-occur '+count,type:'co-occur'});}
        const bySid={};
        for(const n of this.nodes){if(n.cat==='scene'&&n.sid){const s=String(n.sid).toLowerCase();if(!bySid[s])bySid[s]=[];bySid[s].push(n);}}
        if(Object.keys(bySid).length){
          for(const[k,scenes] of Object.entries(bl)){
            const ent=byFile[k];if(!ent||ent.cat==='scene'||ent.cat==='chapter'||ent.cat==='section')continue;
            const scArr=[];
            for(const scId of scenes){const sn=bySid[String(scId).toLowerCase()];if(sn)scArr.push(...sn);}
            for(const sn of scArr){
              const ek=[ent.name,sn.name].sort().join('|')+'+esc';if(seen.has(ek))continue;
              seen.add(ek);this.edges.push({a:ent,b:sn,role:'กล่าวถึง',type:'ent-scene'});
            }
          }
        }
      }
      await this._linkEntToScenes(byName,seen);
    }catch{}
  }

  async _linkEntToScenes(byName,seen){
    await ensureAutoLink();
    const ents=this.nodes.filter(n=>WIKI_CATS.has(n.cat||''));
    const scs=this.nodes.filter(n=>n.cat==='scene');
    if(!ents.length||!scs.length)return;
    const bySid={};
    for(const n of scs){
      if(n.sid){const s=String(n.sid).toLowerCase();if(!bySid[s])bySid[s]=[];bySid[s].push(n);}
    }
    for(const ent of ents){
      if(!ent.file)continue;
      const bks=getBacklinksFor(ent.file);
      if(!bks||!bks.length)continue;
      for(const bk of bks){
        const sns=bySid[String(bk.sceneId).toLowerCase()];
        if(!sns)continue;
        for(const sn of sns){
          const ek=[ent.name,sn.name].sort().join('|')+'+esc';
          if(seen.has(ek))continue;
          seen.add(ek);
          this.edges.push({a:ent,b:sn,role:'กล่าวถึง',type:'ent-scene'});
        }
      }
    }
  }

  _linkStructNodes(byName,seen) {
    const scs=this.nodes.filter(n=>n.cat==='scene');
    const chs=this.nodes.filter(n=>n.cat==='chapter');
    for(const s of scs){
      const chId=(s.chapterId||s.ch||'').toLowerCase();
      const ch=chs.find(c=>(c.name||'').toLowerCase()===chId||(c.chName||'').toLowerCase()===chId);
      if(!ch)continue;
      const k=[s.name,ch.name].sort().join('|');if(seen.has(k))continue;
      seen.add(k);this.edges.push({a:s,b:ch,role:'อยู่ใน',type:'scene-link'});
    }
    const secs=this.nodes.filter(n=>n.cat==='section');
    for(const ch of chs){
      if(!ch.sectionName)continue;
      const sec=secs.find(s=>(s.name||'').toLowerCase()===ch.sectionName.toLowerCase());
      if(!sec)continue;
      const k=[ch.name,sec.name].sort().join('|');if(seen.has(k))continue;
      seen.add(k);this.edges.push({a:ch,b:sec,role:'อยู่ใน',type:'scene-link'});
    }
  }

  _fit() {
    const r=this.pane.getBoundingClientRect();
    const w=Math.max(300,r.width),h=Math.max(300,r.height);
    if(w>0&&h>0&&(this.canvas.width!==w||this.canvas.height!==h)){this.canvas.width=w;this.canvas.height=h;}
  }

  draw() {
    const c=this.canvas.getContext('2d');const w=this.canvas.width,h=this.canvas.height;
    if(!w||!h)return;
    c.clearRect(0,0,w,h);c.fillStyle=BG;c.fillRect(0,0,w,h);
    c.save();
    // unified transform: both 2D and 3D use same _cx,_cy,_scale
    c.translate(this._cx,this._cy);c.scale(this._scale,this._scale);

    if(!this.nodes.length){
      c.restore();c.fillStyle='#6a6862';c.font='15px sans-serif';c.textAlign='center';
      c.fillText('ยังไม่มีเอนทิตี้ใน Wiki',w/2,h/2-10);c.font='12px sans-serif';
      c.fillText('สร้างตัวละคร/สถานที่/ไอเทม/ตำนานใน Wiki',w/2,h/2+14);
      this._updateStatus();return;
    }

    // grid — extent accounts for camera offset + scale
    if(this._showGrid){
      const viewW=w/this._scale,viewH=h/this._scale;
      const cx=-this._cx/this._scale,cy=-this._cy/this._scale;
      const ext=Math.max(viewW,viewH)*2+Math.max(Math.abs(cx),Math.abs(cy))*1.5;
      c.strokeStyle=GRID;c.lineWidth=0.4;c.globalAlpha=this._gridAlpha;c.beginPath();
      for(let x=-ext;x<=ext;x+=this._gridPx){c.moveTo(x,-ext);c.lineTo(x,ext);}
      for(let y=-ext;y<=ext;y+=this._gridPx){c.moveTo(-ext,y);c.lineTo(ext,y);}
      c.stroke();c.globalAlpha=1;
    }
    c.font='11px "Segoe UI","Leelawadee UI",sans-serif';

    const ac=this._catFilter.size===4,at=this._typeFilter.size===REL_TYPES.length+3;
    const q=this._searchQuery.toLowerCase();const m=new Set();
    if(q)for(const n of this.nodes)if(n.name.toLowerCase().includes(q))m.add(n);

    const visNodes = []; const visSet = new Set();
    for(const n of this.nodes){
      if((!ac&&!this._catFilter.has(n.cat)&&!isStruct(n))||(q&&!m.has(n)))continue;
      visNodes.push(n); visSet.add(n);
    }

    const proj = new Map();
    if(this._mode3D){
      for(const n of this.nodes){
        proj.set(n, project3D(n.x,n.y,n.z||0,this._rx,this._ry));
      }
    }

    const px=(n)=>{if(this._mode3D){const p=proj.get(n);return p?p.x:n.x;}return n.x;};
    const py=(n)=>{if(this._mode3D){const p=proj.get(n);return p?p.y:n.y;}return n.y;};
    const pz=(n)=>{if(this._mode3D){const p=proj.get(n);return p?p.zDepth:0;}return 0;};

    const sortedEdges=this._mode3D
      ?[...this.edges].sort((a,b)=>((pz(a.a)+pz(a.b))-(pz(b.a)+pz(b.b))))
      :this.edges;

    // edges
    for(const e of sortedEdges){
      const aVis=visSet.has(e.a),bVis=visSet.has(e.b);
      if(!aVis&&!bVis)continue;
      let alpha=at||this._typeFilter.has(e.type)?1:0.08;
      let color=this._edgeCol[e.type]||'#4a4842',lw=2.0;
      if(e.type==='co-occur'){color='#8a8885';lw=1.2;if(alpha===1)alpha=0.5;c.setLineDash([4,3]);}
      else if(e.type==='scene-link'){color='#5caf8a';lw=1.6;if(alpha===1)alpha=0.7;c.setLineDash([3,4]);}
      else if(e.type==='ent-scene'){color='#d9955f';lw=1.4;if(alpha===1)alpha=0.55;c.setLineDash([5,4,2,4]);}
      else c.setLineDash([]);
      const isHover=this._hoverNode&&(e.a===this._hoverNode||e.b===this._hoverNode);
      if(isHover){lw=3.2;alpha=1;c.shadowColor=color.replace(')','');c.shadowColor+='0.55)';c.shadowBlur=10;}
      c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=lw;
      c.beginPath();c.moveTo(px(e.a),py(e.a));c.lineTo(px(e.b),py(e.b));c.stroke();c.setLineDash([]);c.shadowBlur=0;
      if(e.role&&alpha>0.3){
        const mx=(px(e.a)+px(e.b))/2,my=(py(e.a)+py(e.b))/2;
        drawEdgeLabel(c,e.role,mx,my-10,isHover?11:9);
      }
      c.globalAlpha=1;
    }

    const sortedNodes=this._mode3D?[...visNodes].sort((a,b)=>pz(b)-pz(a)):visNodes;

    for(const n of sortedNodes){
      const vt=tagStyle(n);
      const isHov=n===this._hoverNode;
      const struct=isStruct(n);
      const baseR=struct?10:14;
      let r=isHov?baseR+6:baseR;
      const degree=this.edges.filter(e=>e.a===n||e.b===n).length;
      r=Math.max(baseR,Math.min(28,baseR+degree*0.6));
      if(isHov)r+=4;

      const nx=px(n),ny=py(n);
      const col=this._catCol[n.cat]||'#d9955f';

      // glow on hover — use node's own category color
      if(isHov){
        c.beginPath();c.arc(nx,ny,r+12,0,Math.PI*2);
        const glow=c.createRadialGradient(nx,ny,r,nx,ny,r+14);
        glow.addColorStop(0,hexToRgba(col,0.45));glow.addColorStop(1,'rgba(0,0,0,0)');
        c.fillStyle=glow;c.fill();
        c.shadowColor=hexToRgba(col,0.6);c.shadowBlur=14;
      }

      // thumbnail
      if(this._showImages&&n.image&&n._img&&!struct){
        c.save();c.beginPath();c.arc(nx,ny,r+2,0,Math.PI*2);c.clip();
        c.drawImage(n._img,nx-r-2,ny-r-2,(r+2)*2,(r+2)*2);
        c.restore();
        c.beginPath();c.strokeStyle='rgba(255,255,255,0.3)';c.lineWidth=2;c.arc(nx,ny,r+3,0,Math.PI*2);c.stroke();
      }

      if(vt){c.beginPath();c.fillStyle=vt.color;c.arc(nx,ny,r+3.5,0,Math.PI*2);c.fill();}

      if(struct){
        const sw2=r*1.6,sh2=r*1.4;
        c.fillStyle=col;c.fillRect(nx-sw2/2,ny-sh2/2,sw2,sh2);
        c.strokeStyle=isHov?'#faf9f5':'#1f1e1c';
        c.lineWidth=isHov?3:2;c.strokeRect(nx-sw2/2,ny-sh2/2,sw2,sh2);
      }else{
        c.beginPath();c.fillStyle=col;c.arc(nx,ny,r,0,Math.PI*2);c.fill();
        c.strokeStyle=isHov?'#faf9f5':'#1f1e1c';
        c.lineWidth=isHov?3:2;c.stroke();
      }
      c.shadowBlur=0;

      if(q&&m.has(n)&&!this._rafId){
        c.beginPath();c.strokeStyle='#61afef';c.lineWidth=3;c.globalAlpha=0.5+Math.sin(performance.now()*0.005)*0.5;
        c.arc(nx,ny,r+6,0,Math.PI*2);c.stroke();c.globalAlpha=1;
      }

      const label=(vt&&vt.icon?vt.icon+' ':'')+(n.name.length>20?n.name.slice(0,19)+'…':n.name);
      drawLabelBox(c,label,nx,ny+r+12+4,isHov?11:9);
    }

    c.restore();
    this._updateStatus();
    if(q&&m.size&&!this._rafId)this._rafId=requestAnimationFrame(()=>{this._rafId=null;this.draw();});
  }

  _updateStatus() {
    if(!this._sb)return;
    const structN=this.nodes.filter(n=>!WIKI_CATS.has(n.cat)).length;
    const st=structN?` (+${structN} ฉาก/บท)`:'';
    this._sb.textContent=`⦿ ${this.nodes.length}${st} · ${this.edges.length} เส้น · `+
      `✕ ${Math.round(this._cx)} ${Math.round(this._cy)}`+
      (this._mode3D?` Z${Math.round(this._rx*180/Math.PI)}°`:'')+
      ` · ซูม ${Math.round(this._scale*100)}%`;
  }

  _updateMinimap() {
    if(!this._showMinimap||!this._mm||this._mm.style.display==='none')return;
    const c=this._mm.getContext('2d');const mw=160,mh=120;
    c.clearRect(0,0,mw,mh);c.fillStyle='rgba(26,26,24,0.92)';c.fillRect(0,0,mw,mh);
    if(!this.nodes.length){c.strokeStyle='#4a4842';c.strokeRect(0,0,mw,mh);return;}
    let mnx=Infinity,mny=Infinity,mxx=-Infinity,mxy=-Infinity;
    for(const n of this.nodes){if(n.x<mnx)mnx=n.x;if(n.y<mny)mny=n.y;if(n.x>mxx)mxx=n.x;if(n.y>mxy)mxy=n.y;}
    const pw=mxx-mnx||200,ph=mxy-mny||200;
    const sx=(mw-20)/pw,sy=(mh-20)/ph,s=Math.min(sx,sy);
    const ox=10+(mw-20-pw*s)/2,oy=10+(mh-20-ph*s)/2;
    for(const n of this.nodes){
      const nx=ox+(n.x-mnx)*s,ny=oy+(n.y-mny)*s;
      c.fillStyle=this._catCol[n.cat]||'#d9955f';c.beginPath();c.arc(nx,ny,2.5,0,Math.PI*2);c.fill();
    }
    const vw=this.canvas.width/this._scale,vh=this.canvas.height/this._scale;
    const vx=ox+(-this._cx/this._scale-mnx)*s,vy=oy+(-this._cy/this._scale-mny)*s;
    c.strokeStyle='#61afef';c.lineWidth=1.5;c.strokeRect(vx,vy,vw*s,vh*s);
  }

  // ── hit / mouse ──
  _hit(e){
    const r=this.canvas.getBoundingClientRect();
    const sx=(e.clientX-r.left-this._cx)/this._scale;
    const sy=(e.clientY-r.top-this._cy)/this._scale;
    if(this._mode3D){
      let best=null,bestD=400;
      for(const n of this.nodes){
        const p=project3D(n.x,n.y,n.z||0,this._rx,this._ry);
        const d=(p.x-sx)**2+(p.y-sy)**2;
        if(d<bestD){bestD=d;best=n;}
      }
      return{x:sx,y:sy,node:bestD<400?best:null};
    }
    return{x:sx,y:sy,node:this.nodes.find(n=>(n.x-sx)**2+(n.y-sy)**2<=400)||null};
  }

  _down(e){
    if(e.button===2&&this._mode3D){this._orbitDrag={sx:e.clientX,sy:e.clientY,orx:this._rx,ory:this._ry};return;}
    if(e.button!==0)return;
    const{x,y,node}=this._hit(e);
    if(node&&e.shiftKey){this._repel(node,x,y);this.draw();return;}
    if(node){this.drag={node,moved:false,ox:node.x-x,oy:node.y-y};return;}
    this.pan={sx:e.clientX,sy:e.clientY,cx:this._cx,cy:this._cy,moved:false};this.canvas.classList.add('net-panning');
  }

  _move(e){
    if(this._orbitDrag){
      this._rx=this._orbitDrag.orx+(e.clientY-this._orbitDrag.sy)*0.008;
      this._ry=this._orbitDrag.ory+(e.clientX-this._orbitDrag.sx)*0.008;
      this._rx=Math.max(-Math.PI/2.2,Math.min(Math.PI/2.2,this._rx));
      this.draw();if(this._showMinimap)this._updateMinimap();return;
    }
    if(this.pan){this._cx=this.pan.cx+(e.clientX-this.pan.sx);this._cy=this.pan.cy+(e.clientY-this.pan.sy);if(Math.abs(e.clientX-this.pan.sx)+Math.abs(e.clientY-this.pan.sy)>3)this.pan.moved=true;this.draw();if(this._showMinimap)this._updateMinimap();return;}
    if(!this.drag){const{node}=this._hit(e);if(this._hoverNode!==node){this._hoverNode=node;this.draw();}this.canvas.style.cursor=node?'pointer':'grab';return;}
    const{x}=this._hit(e);this.drag.node.x=x+this.drag.ox;this.drag.node.y=(e.clientY-this.canvas.getBoundingClientRect().top-this._cy)/this._scale+this.drag.oy;this.drag.moved=true;this.draw();if(this._showMinimap)this._updateMinimap();}

  _up(){
    if(this._orbitDrag){this._orbitDrag=null;return;}
    if(this.pan){this.pan=null;this.canvas.classList.remove('net-panning');return;}
    // no single-click open — use double-click only
    if(this.drag&&this.drag.moved)savePositions(this.nodes);
    this.drag=null;
  }

  _repel(node, hx, hy) {
    for(const n of this.nodes){
      if(n===node)continue;
      const dx=n.x-node.x,dy=n.y-node.y,dz=(n.z||0)-(node.z||0);
      const d=Math.sqrt(dx*dx+dy*dy+dz*dz)||1;
      const f=180/(d*d*0.01+1);
      n.x+=dx/d*f;n.y+=dy/d*f;n.z=(n.z||0)+dz/d*f;
    }
  }

  _zoom(e){
    const r=this.canvas.getBoundingClientRect();const mx=e.clientX-r.left,my=e.clientY-r.top;
    const f=e.deltaY<0?1.1:0.9;
    const ns=this._scale*f;
    this._cx=mx-(mx-this._cx)*(ns/this._scale);
    this._cy=my-(my-this._cy)*(ns/this._scale);
    this._scale=ns;
    this.draw();if(this._showMinimap)this._updateMinimap();
  }

  _ctxMenu(e){
    if(this._orbitDrag)return;
    if(this._ctxMenus){for(const m of this._ctxMenus){try{m.remove();}catch{}}this._ctxMenus=[];}
    else this._ctxMenus=[];
    this._ctxCleanup=this._ctxCleanup||(ev=>{
      if(!this._ctxMenus||!this._ctxMenus.length)return;
      for(const m of[...this._ctxMenus]){try{if(!m.contains(ev.target)){if(m.parentNode)m.remove();this._ctxMenus=this._ctxMenus.filter(x=>x!==m);}}catch{}}
      if(!this._ctxMenus.length){document.removeEventListener('click',this._ctxCleanup);this._ctxListenerAdded=false;}
    });

    const{node}=this._hit(e);
    const menu=document.createElement('div');menu.className='k-menu net-ctx-menu';
    this._ctxMenus.push(menu);
    menu.style.cssText='position:fixed;left:'+e.clientX+'px;top:'+e.clientY+'px;z-index:80;background:var(--side);border:1px solid var(--border);border-radius:8px;padding:4px;box-shadow:0 6px 20px rgba(0,0,0,.4);min-width:160px;';
    const done=()=>{this._ctxMenus=this._ctxMenus.filter(x=>x!==menu);try{menu.remove();}catch{}};
    const addItem=(label,click,opts={})=>{const d=document.createElement('div');d.className='k-menu-item';d.textContent=label;if(opts.danger)d.style.color='#e06c75';if(opts.dim)d.style.opacity='0.5';if(label==='-'){d.style.cssText='height:1px;background:var(--border);margin:2px 6px;padding:0;cursor:default;';d.onclick=()=>{};}else{d.onclick=()=>{click();done();}}menu.appendChild(d);};
    if(node){
      const struct=isStruct(node);
      if(struct){
        // structural node — copy from explorer
        if(node.cat==='scene'){
          addItem('📄 เปิด',()=>{if(this.onOpenScene)this.onOpenScene(node.file);});
          if(this.onRenameStruct)addItem('✎ เปลี่ยนชื่อ…',()=>this.onRenameStruct(node));
          if(this.onDuplicateStruct)addItem('📋 ทำซ้ำ',()=>this.onDuplicateStruct(node));
          if(node.file&&this.onReveal)addItem('📂 หาในดิสก์',()=>{try{this.onReveal(node.file);}catch{}});
          addItem('-',()=>{});
          if(this.onDeleteStruct)addItem('🗑 ลบ (ย้ายไปถังขยะ)',()=>this.onDeleteStruct(node),{danger:true});
        }else if(node.cat==='chapter'){
          addItem('📂 เปิดบท',()=>{if(this.onOpenScene&&node.file)this.onOpenScene(node.file);});
          if(this.onAddChild)addItem('＋ เพิ่มฉาก…',()=>this.onAddChild(node));
          if(this.onRenameStruct)addItem('✎ เปลี่ยนชื่อบท…',()=>this.onRenameStruct(node));
          addItem('-',()=>{});
          if(this.onDeleteStruct)addItem('🗑 ลบบททั้งบท',()=>this.onDeleteStruct(node),{danger:true});
        }else if(node.cat==='section'){
          if(this.onOpenScene&&node.file)addItem('📂 เปิดเล่ม',()=>this.onOpenScene(node.file));
          if(this.onAddChild)addItem('＋ เพิ่มเล่มใหม่…',()=>this.onAddChild(node));
          if(this.onRenameStruct)addItem('✎ เปลี่ยนชื่อเล่ม…',()=>this.onRenameStruct(node));
          addItem('-',()=>{});
          if(this.onDeleteStruct)addItem('🗑 ลบเล่มทั้งเล่ม',()=>this.onDeleteStruct(node),{danger:true});
        }
      }else{
        // wiki entity — match explorer style
        addItem('📖 เปิด',()=>{if(this.onOpen)this.onOpen(node);});
        if(node.file&&this.onReveal){
          addItem('📂 หาในดิสก์',()=>{try{this.onReveal(node.file);}catch{}});
        }
        if(node.cat)addItem('🏷 หมวด: '+node.cat,()=>{},{dim:true});
        if(node.desc)addItem('📝 '+(node.desc.length>50?node.desc.slice(0,49)+'…':node.desc),()=>{},{dim:true});
        if(node.tags&&node.tags.length)addItem('🏷 แท็ก: '+node.tags.join(', '),()=>{},{dim:true});
        if(node.relationships&&node.relationships.length){
          addItem('🔗 ความสัมพันธ์ ('+node.relationships.length+')…',()=>{
            const sm=document.createElement('div');sm.className='k-menu net-ctx-menu';this._ctxMenus.push(sm);
            sm.style.cssText='position:fixed;left:'+(e.clientX+170)+'px;top:'+e.clientY+'px;z-index:81;background:var(--side);border:1px solid var(--border);border-radius:8px;padding:4px;box-shadow:0 6px 20px rgba(0,0,0,.4);';
            for(const r of node.relationships.slice(0,15)){
              const sd=document.createElement('div');sd.className='k-menu-item';
              sd.textContent=(this._edgeCol[r.type]?'⬤ ':'')+(r.targetName||r.target||'?')+' — '+(r.role||'');
              sd.style.color=this._edgeCol[r.type]||'inherit';
              sd.onclick=()=>{document.body.removeChild(sm);};
              sm.appendChild(sd);
            }
            document.body.appendChild(sm);
          });
        }
      }
    }else{
      addItem('⤾ รีเซ็ตมุมมอง',()=>{this._scale=1;this._cx=0;this._cy=0;this._rx=0.4;this._ry=-0.3;this.draw();});
      addItem('🔄 รีเฟรช',()=>this.refresh());
    }
    document.body.appendChild(menu);
    document.addEventListener('click',this._ctxCleanup);this._ctxListenerAdded=true;
  }

  focus(){this._fit();this.draw();}
  save(){return true;}
  destroy(){
    if(this._ctxCleanup){document.removeEventListener('click',this._ctxCleanup);this._ctxListenerAdded=false;}
    if(this._ctxMenus){for(const m of this._ctxMenus)try{m.remove();}catch{}this._ctxMenus=[];}
    if(this._rafId)cancelAnimationFrame(this._rafId);
    window.removeEventListener('resize',this._resize);
    document.removeEventListener('mouseup',this._upDoc);
    if(this._ro)this._ro.disconnect();
    if(this._tb)this._tb.destroy();
    savePositions(this.nodes);
  }
}
