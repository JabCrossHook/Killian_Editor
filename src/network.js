// Story Network — alpha.64 · Canvas 2D (no Three.js)
import { visualTagFor } from './visual-tags.js';
import { REL_COLOR, REL_TYPES, categorizeRole } from './relationship-types.js';
import { state } from './core.js';
import { seedLayout, forceLayout, loadPositions, savePositions } from './network-layout.js';

REL_COLOR['co-occur'] = '#8a8885';
const CAT_COLOR = { characters:'#d97757', locations:'#7aa8d8', items:'#6fae8a', lore:'#b58fc9' };
const CAT_ARR = ['characters','locations','items','lore'];
const BG = '#1a1a18', GRID = '#3a3a36';

function tagStyle(n) { for(const t of n.tags||[]){const v=visualTagFor(t);if(v)return v;} return null; }

// ── toolbar ──
function buildToolbar(pane, cb) {
  const bar=document.createElement('div');bar.className='net-toolbar';
  const tg=document.createElement('button');tg.className='net-tbar-toggle';tg.textContent='▼';tg.title='ซ่อน';
  const bd=document.createElement('div');bd.className='net-tbar-body';let col=false;
  tg.onclick=()=>{col=!col;bd.style.display=col?'none':'';tg.textContent=col?'▶':'▼';};
  const ca=new Set(CAT_ARR),tf=new Set([...REL_TYPES.map(t=>t.key),'co-occur']);
  const cr=document.createElement('div');cr.className='net-tbar-row';
  [{k:'characters',l:'ตัวละคร',c:'#d97757'},{k:'locations',l:'สถานที่',c:'#7aa8d8'},{k:'items',l:'ไอเทม',c:'#6fae8a'},{k:'lore',l:'ตำนาน',c:'#b58fc9'}].forEach(x=>{const b=document.createElement('button');b.className='net-tcat';b.style.setProperty('--tcolor',x.c);b.title=x.l;b.dataset.active='1';b.classList.add('on');b.textContent=x.l;b.onclick=()=>{const a=b.dataset.active==='1';b.dataset.active=a?'0':'1';if(a)b.classList.remove('on');else b.classList.add('on');if(a)ca.delete(x.k);else ca.add(x.k);cb.filter(ca,tf);};cr.appendChild(b);});
  const tr=document.createElement('div');tr.className='net-tbar-row net-tbar-types';
  REL_TYPES.forEach(t=>{const b=document.createElement('button');b.className='net-ttype';b.style.setProperty('--tcolor',t.color);b.title=t.label;b.dataset.active='1';b.classList.add('on');b.onclick=()=>{const a=b.dataset.active==='1';b.dataset.active=a?'0':'1';if(a)b.classList.remove('on');else b.classList.add('on');if(a)tf.delete(t.key);else tf.add(t.key);cb.filter(ca,tf);};tr.appendChild(b);});
  (()=>{const b=document.createElement('button');b.className='net-ttype net-ttype-co';b.style.setProperty('--tcolor','#8a8885');b.title='ปรากฏร่วม';b.dataset.active='1';b.classList.add('on');b.onclick=()=>{const a=b.dataset.active==='1';b.dataset.active=a?'0':'1';if(a)b.classList.remove('on');else b.classList.add('on');if(a)tf.delete('co-occur');else tf.add('co-occur');cb.filter(ca,tf);};tr.appendChild(b);})();
  const sw=document.createElement('div');sw.className='net-tbar-search';
  const si=document.createElement('input');si.type='text';si.className='net-tbar-input';si.placeholder='🔍 ค้นหา…';
  let tm;si.oninput=()=>{clearTimeout(tm);tm=setTimeout(()=>cb.search(si.value.trim()),200);};si.onkeydown=e=>{if(e.key==='Enter')cb.search(si.value.trim());};sw.appendChild(si);
  const btns=document.createElement('div');btns.className='net-tbar-actions';
  [{t:'📥',ti:'ส่งออก',f:cb.export},{t:'⤾',ti:'รีเซ็ต',f:cb.reset,cl:'net-reset'}].forEach(x=>{const b=document.createElement('button');b.className='net-tbar-btn'+(x.cl?' '+x.cl:'');b.textContent=x.t;b.title=x.ti;b.onclick=x.f;btns.appendChild(b);});
  bd.append(cr,tr,sw,btns);bar.append(tg,bd);pane.appendChild(bar);
  return {bar,destroy:()=>bar.remove()};
}

// ═════ StoryNetwork ═════

export class StoryNetwork {
  constructor(pane, { loadEntities, onOpen=null }={}) {
    this.pane=pane; this.onOpen=onOpen; this.loadEntities=loadEntities;
    this.title='Story Network'; this.dirty=false;
    this.nodes=[];this.edges=[];this.drag=null;
    this._scale=1;this._cx=0;this._cy=0;
    this._filterNode=null;this._hoverNode=null;
    this._catFilter=new Set(CAT_ARR);
    this._typeFilter=new Set([...REL_TYPES.map(t=>t.key),'co-occur']);
    this._searchQuery='';

    this.canvas=document.createElement('canvas');
    this.canvas.className='net-canvas';
    pane.appendChild(this.canvas);

    this.canvas.addEventListener('mousedown',e=>this._down(e));
    this.canvas.addEventListener('mousemove',e=>this._move(e));
    this._upDoc=e=>this._up(e);
    document.addEventListener('mouseup',this._upDoc);
    this.canvas.addEventListener('wheel',e=>{e.preventDefault();this._zoom(e);});
    this.canvas.addEventListener('contextmenu',e=>{e.preventDefault();this._ctxMenu(e);});

    this._resize=()=>{this._fit();this.draw();};
    window.addEventListener('resize',this._resize);
    if(typeof ResizeObserver!=='undefined'){this._ro=new ResizeObserver(()=>{this._fit();this.draw();});this._ro.observe(pane);}

    const self=this;
    this._tb=buildToolbar(pane,{
      filter(ca,tf){self._catFilter=ca;self._typeFilter=tf;self.draw();},
      search(q){self._searchQuery=q;self.draw();},
      export(){self.draw();const d=self.canvas.toDataURL('image/png');const a=document.createElement('a');a.download='story-network.png';a.href=d;document.body.appendChild(a);a.click();document.body.removeChild(a);},
      reset(){self._scale=1;self._cx=0;self._cy=0;self.draw();},
    });

    this._fit();
    this.draw();
    this.refresh();
  }

  async refresh() {
    try {
      const ents=await this.loadEntities();
      const W=Math.max(600,this.pane.clientWidth||900);
      const H=Math.max(400,this.pane.clientHeight||600);
      this.nodes=ents.map(e=>({name:e.name,cat:e.cat,file:e.file,tags:e.tags||[],relationships:e.relationships||[],x:0,y:0,z:0}));
      const pos=loadPositions();seedLayout(this.nodes,pos,{width:W,height:H,depth:400});
      const byName=Object.fromEntries(this.nodes.map(n=>[n.name,n]));
      this.edges=[];const seen=new Set();
      for(const n of this.nodes){for(const r of n.relationships||[]){const t=byName[r.targetName||r.target];if(!t)continue;const k=[n.name,t.name].sort().join('|');if(seen.has(k))continue;seen.add(k);this.edges.push({a:n,b:t,role:r.role||'',type:r.type||categorizeRole(r.role)});}}
      await this._loadCoOccur(byName,seen);
      forceLayout(this.nodes,this.edges,{width:W,height:H,depth:400,iters:280});
      this._fit();this.draw();
    }catch(e){console.error('SN refresh:',e);}
  }

  async _loadCoOccur(byName,seen) {
    try {
      const root=state.root;if(!root)return;
      const meta=await kapi.readJson(await kapi.join(root,'project.khn.json'));
      const bl=(meta&&meta.backlinks)||{};if(!Object.keys(bl).length)return;
      const byFile={};
      for(const n of this.nodes){let rel=n.file;if(rel.startsWith(root))rel=rel.slice(root.length);rel=rel.replace(/^[/\\]+/,'').replace(/\\/g,'/');byFile[rel]=n;const p=rel.split('/');if(p.length>=2&&(p[0]==='Wiki'||p[0]==='Bible')){const nr=p.slice(1).join('/');if(!byFile[nr])byFile[nr]=n;}}
      const pairs={};const keys=Object.keys(bl);
      for(let i=0;i<keys.length;i++){const a=byFile[keys[i]];if(!a)continue;const aS=new Set(bl[keys[i]]);
        for(let j=i+1;j<keys.length;j++){const b=byFile[keys[j]];if(!b||a===b)continue;const sh=bl[keys[j]].filter(s=>aS.has(s)).length;if(sh<2)continue;
          const k=[a.name,b.name].sort().join('|');if(seen.has(k))continue;pairs[k]=Math.max(pairs[k]||0,sh);}}
      for(const[k] of Object.entries(pairs)){const[na,nb]=k.split('|');const a=byName[na],b=byName[nb];if(!a||!b)continue;seen.add(k);this.edges.push({a,b,role:'',type:'co-occur'});}
    }catch{}
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
    c.save();c.translate(this._cx,this._cy);c.scale(this._scale,this._scale);

    // empty state
    if(!this.nodes.length){
      c.restore();c.fillStyle='#6a6862';c.font='15px sans-serif';c.textAlign='center';
      c.fillText('ยังไม่มีเอนทิตี้ใน Wiki',w/2,h/2-10);c.font='12px sans-serif';
      c.fillText('สร้างตัวละคร/สถานที่/ไอเทม/ตำนานใน Wiki',w/2,h/2+14);return;
    }

    // grid
    const ext=Math.max(w,h)/this._scale*1.5;
    c.strokeStyle=GRID;c.lineWidth=0.4;c.globalAlpha=0.15;c.beginPath();
    for(let x=-ext;x<=ext;x+=60){c.moveTo(x,-ext);c.lineTo(x,ext);}
    for(let y=-ext;y<=ext;y+=60){c.moveTo(-ext,y);c.lineTo(ext,y);}
    c.stroke();c.globalAlpha=1;

    c.font='12px "Segoe UI","Leelawadee UI",sans-serif';
    const ac=this._catFilter.size===CAT_ARR.length,at=this._typeFilter.size===REL_TYPES.length+1;
    const q=this._searchQuery.toLowerCase();const m=new Set();
    if(q)for(const n of this.nodes)if(n.name.toLowerCase().includes(q))m.add(n);

    // edges
    for(const e of this.edges){
      if((!ac&&!this._catFilter.has(e.a.cat)&&!this._catFilter.has(e.b.cat))||(q&&!m.has(e.a)&&!m.has(e.b)))continue;
      let alpha=at||this._typeFilter.has(e.type)?1:0.08;
      let color=REL_COLOR[e.type]||'#4a4842',lw=2.2;
      if(e.type==='co-occur'){color='#8a8885';lw=1.4;if(alpha===1)alpha=0.5;c.setLineDash([4,3]);}else c.setLineDash([]);
      if(e.a===this._hoverNode||e.b===this._hoverNode){color='#d97757';lw=2.5;alpha=1;}
      c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=lw;
      c.beginPath();c.moveTo(e.a.x,e.a.y);c.lineTo(e.b.x,e.b.y);c.stroke();c.setLineDash([]);
      if(e.role&&alpha>0.1&&e.type!=='co-occur'){c.globalAlpha=1;c.fillStyle='#98958b';c.fillText(e.role,(e.a.x+e.b.x)/2+6,(e.a.y+e.b.y)/2-4);}
      c.globalAlpha=1;
    }

    // nodes
    for(const n of this.nodes){
      if((!ac&&!this._catFilter.has(n.cat))||(q&&!m.has(n)))continue;
      const vt=tagStyle(n);const r=n===this._hoverNode?18:14;
      if(vt){c.beginPath();c.fillStyle=vt.color;c.arc(n.x,n.y,r+3.5,0,Math.PI*2);c.fill();}
      c.beginPath();c.fillStyle=CAT_COLOR[n.cat]||'#d9955f';c.arc(n.x,n.y,r,0,Math.PI*2);c.fill();
      c.strokeStyle=this._filterNode===n?'#faf9f5':'#1f1e1c';c.lineWidth=this._filterNode===n?3:2;c.stroke();
      if(q&&m.has(n)){const pulse=0.5+Math.sin(performance.now()*0.005)*0.5;c.beginPath();c.strokeStyle='#61afef';c.lineWidth=3;c.globalAlpha=pulse;c.arc(n.x,n.y,r+6,0,Math.PI*2);c.stroke();c.globalAlpha=1;}
      c.fillStyle='#faf9f5';c.fillText((vt&&vt.icon?vt.icon+' ':'')+n.name,n.x+20,n.y+4);
    }
    c.restore();
    if(q&&m.size&&!this._rafId)this._rafId=requestAnimationFrame(()=>{this._rafId=null;this.draw();});
  }

  // ── hit / mouse (original logic) ──
  _hit(e){const r=this.canvas.getBoundingClientRect();const x=(e.clientX-r.left-this._cx)/this._scale;const y=(e.clientY-r.top-this._cy)/this._scale;return{x,y,node:this.nodes.find(n=>(n.x-x)**2+(n.y-y)**2<=400)||null};}
  _down(e){if(e.button!==0)return;const{x,y,node}=this._hit(e);if(node){this.drag={node,moved:false,ox:node.x-x,oy:node.y-y};return;}this.pan={sx:e.clientX,sy:e.clientY,cx:this._cx,cy:this._cy,moved:false};this.canvas.classList.add('net-panning');}
  _move(e){if(this.pan){this._cx=this.pan.cx+(e.clientX-this.pan.sx);this._cy=this.pan.cy+(e.clientY-this.pan.sy);if(Math.abs(e.clientX-this.pan.sx)+Math.abs(e.clientY-this.pan.sy)>3)this.pan.moved=true;this.draw();return;}if(!this.drag){const{node}=this._hit(e);if(this._hoverNode!==node){this._hoverNode=node;this.draw();}this.canvas.style.cursor=node?'pointer':'grab';return;}const{x}=this._hit(e);this.drag.node.x=x+this.drag.ox;this.drag.node.y=(e.clientY-this.canvas.getBoundingClientRect().top-this._cy)/this._scale+this.drag.oy;this.drag.moved=true;this.draw();}
  _up(){if(this.pan){this.pan=null;this.canvas.classList.remove('net-panning');return;}if(this.drag&&!this.drag.moved&&this.onOpen)this.onOpen(this.drag.node);if(this.drag&&this.drag.moved)savePositions(this.nodes);this.drag=null;}
  _zoom(e){const r=this.canvas.getBoundingClientRect();const mx=e.clientX-r.left,my=e.clientY-r.top;const f=e.deltaY<0?1.1:0.9;const ns=Math.max(0.3,Math.min(3,this._scale*f));this._cx=mx-(mx-this._cx)*(ns/this._scale);this._cy=my-(my-this._cy)*(ns/this._scale);this._scale=ns;this.draw();}
  _ctxMenu(e){const{node}=this._hit(e);if(!node)return;const menu=document.createElement('div');menu.className='k-menu';menu.style.cssText='position:fixed;left:'+e.clientX+'px;top:'+e.clientY+'px;z-index:80;background:var(--side);border:1px solid var(--border);border-radius:8px;padding:4px;box-shadow:0 6px 20px rgba(0,0,0,.4);';const items=[{label:this._filterNode===node?'🔄 แสดงทั้งหมด':'🔍 เฉพาะ: '+node.name,click:()=>{this._filterNode=this._filterNode===node?null:node;this.draw();document.body.removeChild(menu);}},{label:'📖 เปิด Wiki',click:()=>{if(this.onOpen)this.onOpen(node);document.body.removeChild(menu);}}];items.forEach(it=>{const d=document.createElement('div');d.className='k-menu-item';d.textContent=it.label;d.onclick=it.click;menu.appendChild(d);});document.body.appendChild(menu);const close=ev=>{if(!menu.contains(ev.target)){document.body.removeChild(menu);document.removeEventListener('click',close);}};setTimeout(()=>document.addEventListener('click',close),10);}

  focus(){this._fit();this.draw();}
  save(){return true;}
  destroy(){if(this._rafId)cancelAnimationFrame(this._rafId);window.removeEventListener('resize',this._resize);document.removeEventListener('mouseup',this._upDoc);if(this._ro)this._ro.disconnect();if(this._tb)this._tb.destroy();savePositions(this.nodes);}
}
