/* Lumera Site v2 — page logic. Plain-JS port of the design-canvas
   component: router, reveals, theme, hero galaxy. window.THREE and
   window.Lenis are optional and may arrive after init(): the galaxy is
   skipped while THREE is absent (rebuildGalaxy() picks it up when it
   lands) and scrolling stays native while Lenis is absent.
   NOTE: the method bodies are byte-identical to the verified JS —
   typing is added only through erasable syntax (declare fields and the
   global shims in shims.d.ts), so the emitted runtime is unchanged. */
import type { SiteConfig } from './config.js'

export class LumeraSite {
  declare props: SiteConfig;
  declare _dead: any;
  declare _booted: any;
  declare _current: any;
  declare _fitGalaxy: any;
  declare _gal: any;
  declare _galAuto: any;
  declare _galRAF: any;
  declare _galStarted: any;
  declare _galT0: any;
  declare _glowTex: any;
  declare _heroBlur: any;
  declare _heroDist: any;
  declare _heroDur: any;
  declare _heroLive: any;
  declare _heroShown: any;
  declare _heroStatic: any;
  declare _heroTimer: any;
  declare _intervals: any;
  declare _io: any;
  declare _ioMap: any;
  declare _onGalaxyResize: any;
  declare _onHash: any;
  declare _onScroll: any;
  declare _packets: any;
  declare _pages: any;
  declare _paintRail: any;
  declare _pendingAnchor: any;
  declare _planeCur: any;
  declare _rail: any;
  declare _railItems: any;
  declare _repaint: any;
  declare _step: any;
  declare _stepPaused: any;
  declare _sweep: any;
  declare _tgCur: any;
  declare _theme: any;
  declare _themeBooted: any;
  declare lenis: any;

  constructor(props){ this.props = props || {}; }

  // Nothing to wait for — main.ts loads three and lenis after boot and hands
  // them over when they arrive, so the page goes interactive immediately.
  init(){ this._intervals=[]; this.boot(false); }

  mode(){
    try{ if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'off'; }catch(e){}
    return this.props.motion ?? 'full';
  }
  accentHex(){ return this.props.accent || '#47C78A'; }

  // Brand green is a FILL colour: 1.9:1 on white. Anything rendered as ink
  // on a light surface uses a darkened form of the same hue.
  accentText(){
    if(this._theme!=='light') return this.accentHex();
    const h=this.accentHex().replace('#','');
    const rgb=[0,2,4].map(i=>parseInt(h.substr(i,2),16));
    const lum=c=>{const v=c/255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);};
    let k=1;
    for(let i=0;i<40;i++){
      const d=rgb.map(c=>Math.round(c*k));
      const L=.2126*lum(d[0])+.7152*lum(d[1])+.0722*lum(d[2]);
      // measured against #F0F4FA, the lightest-but-not-white surface it may sit on
      const BG=.2126*lum(240)+.7152*lum(244)+.0722*lum(250);
      if((BG+.05)/(L+.05) >= 4.6) return '#'+d.map(c=>c.toString(16).padStart(2,'0')).join('');
      k-=0.025;
    }
    return '#0B7A47';
  }

  themeTokens(){
    return {
      '#ffffff':['#0A1A30','#FFFFFF'], '#f5f5fa':['#16283F','#F0F4FA'],
      '#c3cbd9':['#41536C','#41536C'], '#96a2b6':['#556781','#556781'],
      '#8c99ad':['#5A6C86','#5A6C86'], '#8693a8':['#5D6F89','#5D6F89'],
      '#8693A8':['#67788F','#67788F'], '#03204a':['#0A1A30','#FFFFFF'],
      '#04193a':['#16283F','#F0F4FA'], '#000b1f':['#0A1A30','#F1F5FA'],
      '#001432':['#06231A','#F7F9FC']
    };
  }

  // t(colour, isInk) — returns the colour for the ACTIVE theme.
  // React re-serialises inline hex to rgb(), so everything is normalised first.
  t(v:any,ink?:any){
    if(this._theme!=='light') return v;
    const str=String(v).trim(), low=str.toLowerCase();
    let r,g,b,al=null;
    const m=low.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)\s*(?:[,\/]\s*([\d.]+)\s*)?\)$/);
    if(m){ r=+m[1]; g=+m[2]; b=+m[3]; al = m[4]==null?null:parseFloat(m[4]); }
    else if(/^#[0-9a-f]{6}$/.test(low)){ r=parseInt(low.substr(1,2),16); g=parseInt(low.substr(3,2),16); b=parseInt(low.substr(5,2),16); }
    else return str;
    const hex='#'+[r,g,b].map(x=>Math.round(x).toString(16).padStart(2,'0')).join('');
    if(al==null || al>=0.999){
      if(hex==='#47c78a') return ink?this.accentText():str;
      const map=this.themeTokens();
      return map[hex] ? map[hex][ink?0:1] : str;
    }
    if(hex==='#47c78a' && ink) return this.accentText();
    if(hex==='#ffffff') return 'rgba(11,32,60,'+Math.min(1,al*1.15).toFixed(3)+')';
    if(hex==='#001432') return 'rgba(247,249,252,'+al+')';
    if(hex==='#000000') return 'rgba(11,32,60,'+(al*0.8).toFixed(3)+')';
    return str;
  }

  tLight(v,ink){ const p=this._theme; this._theme='light'; const r=this.t(v,ink); this._theme=p; return r; }

  // Rewrites a whole inline-style string, deciding ink vs fill per property.
  mapCss(css){
    return css.replace(/([-a-z]+)\s*:\s*([^;]+)/gi,(whole,prop,val)=>{
      const ink = prop.trim().toLowerCase()==='color';
      const out = val.replace(/#[0-9a-f]{6}\b|rgba?\([^)]*\)/gi, tok=>this.t(tok,ink));
      return prop+':'+out;
    });
  }

  applyTheme(mode:any,skipRepaint?:any){
    this._theme = mode;
    const light = mode==='light';
    document.querySelectorAll('[style]').forEach(el=>{
      if(el.hasAttribute('data-theme-fixed')) return;
      if(el.__themeProps===undefined){
        const css=el.getAttribute('style')||'';
        const props=[];
        css.split(';').forEach(decl=>{
          const k=decl.indexOf(':');
          if(k<0) return;
          const prop=decl.slice(0,k).trim(), val=decl.slice(k+1).trim();
          if(!prop||!/#[0-9a-f]{6}\b|rgba?\(/i.test(val)) return;
          const ink = prop.toLowerCase()==='color';
          props.push([prop, val, val.replace(/#[0-9a-f]{6}\b|rgba?\([^)]*\)/gi, tok=>this.tLight(tok,ink))]);
        });
        el.__themeProps = props.length?props:null;
      }
      if(!el.__themeProps) return;
      // Only colour declarations are swapped, so live GSAP opacity/transform survives.
      el.__themeProps.forEach(p=>{ el.style.setProperty(p[0], light?p[2]:p[1]); });
    });
    document.body.style.background = light?'#F7F9FC':'#001432';
    document.body.style.color = light?'#16283F':'#F5F5FA';
    document.querySelectorAll('img[alt="Lumera"]').forEach(i=>{ i.style.filter = light?'brightness(0) saturate(100%) opacity(.88)':''; });
    this.recolourGalaxy();
    this.applyAccent();
    const btn=document.querySelector('[data-theme-btn]');
    if(btn){
      btn.textContent = light?'Dark':'Light';
      btn.setAttribute('aria-label','Switch to '+(light?'dark':'light')+' mode');
    }
    if(!skipRepaint) (this._repaint||[]).forEach(f=>{ try{ f(); }catch(e){} });
    try{ localStorage.setItem('lumera-theme',mode); }catch(e){}
  }

  initTheme(){
    this._repaint=this._repaint||[];
    const btn=document.querySelector('[data-theme-btn]');
    if(btn) btn.addEventListener('click',()=>this.applyTheme(this._theme==='light'?'dark':'light'));
    this._themeBooted = true;
    this.applyTheme(this._theme, true);
  }

  applyAccent(){
    const a=this.accentHex();
    document.querySelectorAll('[data-accent-bg]').forEach(el=>{ el.style.background=a; });
    const ink=this.accentText();
    document.querySelectorAll('[data-accent-fg]').forEach(el=>{ el.style.color=ink; });
  }

  boot(degraded){
    if(this._dead || this._booted) return;
    this._booted=true;
    try{ this._theme = localStorage.getItem('lumera-theme')==='light' ? 'light' : 'dark'; }
    catch(e){ this._theme='dark'; }
    this.applyAccent();
    this.initRouter();
    this.trackProgress();
    this.initLogos();
    const mode=this.mode();
    if(degraded) return;
    if(mode!=='off') this.initGalaxy();
    // The hero copy used to be released only at the end of initGalaxy(), which
    // tied the headline — the LCP element — to three.js loading, and left it
    // permanently invisible whenever the galaxy bailed out (no WebGL, and now
    // also: not downloaded yet). playHeroCopy() guards on _heroShown, so
    // initGalaxy()'s own call becomes a no-op and the timing is unchanged.
    if(mode!=='off') this.playHeroCopy(160);
    let coarsePtr=false;
    try{ coarsePtr = matchMedia('(hover:none) and (pointer:coarse)').matches; }catch(e){}
    if(mode!=='off' && !coarsePtr && (this.props.smoothScroll ?? true)) this.initLenis();
    if(mode!=='off') this.initReveals(mode);
    this.initAccordions();
    this.initRail();
    this.initHoverRows();
    this.initTrustGraph();
    this.initBlogFilter();
    this.initCopy();
    this.initGoto();
    this.initMarquee();
    this.initMagnetic();
    this.initPlanes();
    this.initStepper();
    this.initGantt();
    this.initTheme();
    if(mode!=='off'){ this.refreshReveals(); this.startRevealSweep(); }
  }

  /* ---------- routing ---------- */
  initRouter(){
    this._pages=[...document.querySelectorAll('[data-page]')];
    document.querySelectorAll('[data-nav]').forEach(a=>{
      a.addEventListener('click',(e)=>{ e.preventDefault(); this.go(a.getAttribute('data-nav')); });
    });
    // in-page anchors that point at a page id
    document.querySelectorAll('a[href^="#"]').forEach(a=>{
      const id=a.getAttribute('href').slice(1);
      if(a.hasAttribute('data-nav')) return;
      if(this._pages.some(p=>p.getAttribute('data-page')===id)){
        a.addEventListener('click',(e)=>{ e.preventDefault(); this.go(id); });
      }
    });
    this._onHash=()=>{ const h=(location.hash||'#home').slice(1); this.show(h); };
    window.addEventListener('hashchange',this._onHash);
    const initial=(location.hash||'#home').slice(1);
    this.show(this._pages.some(p=>p.getAttribute('data-page')===initial)?initial:'home');
  }

  go(id){
    if(location.hash!=='#'+id){ try{ history.pushState(null,'','#'+id); }catch(e){} }
    this.show(id);
  }

  show(id){
    if(!this._pages) return;
    // Vision and Token merged into Protocol, keep old links working, land on the right section
    const ALIAS={vision:'protocol',platform:'protocol'};
    let scrollTo=null;
    if(ALIAS[id]){ scrollTo=(id==='platform')?null:id; id=ALIAS[id]; }
    this._pendingAnchor=scrollTo;
    let found=false;
    this._pages.forEach(p=>{
      const on=p.getAttribute('data-page')===id;
      p.style.display=on?'block':'none';
      if(on) found=true;
    });
    if(!found && this._pages[0]) this._pages[0].style.display='block';
    document.querySelectorAll('[data-nav]').forEach(a=>{
      const on=a.getAttribute('data-nav')===id;
      if(a.closest('nav')) a.style.color=on?this.t('#FFFFFF',1):this.t('#C3CBD9',1);
    });
    const target=this._pendingAnchor?document.querySelector('[data-anchor="'+this._pendingAnchor+'"]'):null;
    if(target){
      const y=target.getBoundingClientRect().top+(window.pageYOffset||document.documentElement.scrollTop)-80;
      try{ if(this.lenis) this.lenis.scrollTo(y,{immediate:true}); else window.scrollTo(0,y); }catch(e){ window.scrollTo(0,y); }
    }else{
      try{ if(this.lenis) this.lenis.scrollTo(0,{immediate:true}); else window.scrollTo(0,0); }catch(e){ window.scrollTo(0,0); }
    }
    this._pendingAnchor=null;
    this._current=id;
    this.updateRailVisibility(id);
    this.refreshReveals();
  }

  // Deterministic fallback for the observer. Elements hidden at boot are not
  // re-evaluated when their page becomes visible, and observer delivery is tied
  // to the render pipeline, so also measure directly on scroll and on a sweep.
  // Anything in view gets revealed regardless of whether the observer fired.
  refreshReveals(){
    if(!this._ioMap||!this._ioMap.size) return;
    [...this._ioMap.keys()].forEach(el=>{
      const r=el.getBoundingClientRect();
      if(!r.width && !r.height) return;            // still on a hidden page
      // top has entered OR already passed the fold, either way it should show,
      // so a deep link or a fast scroll can never leave content stuck hidden.
      if(r.top < window.innerHeight*0.94){
        const cb=this._ioMap.get(el);
        if(cb){
          this._ioMap.delete(el);
          try{ if(this._io) this._io.unobserve(el); }catch(e){}
          cb();
        }
      }
    });
  }

  startRevealSweep(){
    if(this._sweep) return;
    this._sweep=setInterval(()=>{
      if(this._dead) return;
      if(!this._ioMap||!this._ioMap.size){ clearInterval(this._sweep); this._sweep=null; return; }
      this.refreshReveals();
    },350);
    this._intervals.push(this._sweep);
  }

  /* ---------- scroll ---------- */
  trackProgress(){
    const bar=document.getElementById('prog');
    if(!bar) return;
    this._onScroll=()=>{
      const h=document.documentElement;
      const max=(h.scrollHeight-h.clientHeight)||1;
      bar.style.transform='scaleX('+Math.min(1,Math.max(0,h.scrollTop/max))+')';
      if(!this.lenis) this.applyParallax(h.scrollTop);
      this.refreshReveals();
    };
    window.addEventListener('scroll',this._onScroll,{passive:true});
    this._onScroll();
  }

  initLenis(){
    try{
      this.lenis=new window.Lenis({ lerp:0.085, autoRaf:true, allowNestedScroll:true, stopInertiaOnNavigate:true });
      this.lenis.on('scroll',(e)=>{
        const bar=document.getElementById('prog');
        if(bar) bar.style.transform='scaleX('+((e&&e.progress)||0)+')';
        this.applyParallax((e&&e.animatedScroll)||0);
        this.refreshReveals();
      });
    }catch(e){}
  }

  applyParallax(px){
    const inner=document.getElementById('hero-inner');
    const hero=document.getElementById('hero');
    if(!inner||!hero||this._current!=='home') return;
    const t=Math.min(1,Math.max(0,px/(hero.offsetHeight||1)));
    inner.style.transform='translateY('+(-16*t).toFixed(2)+'%)';
    inner.style.opacity=(1-0.85*t).toFixed(3);
  }

  // Reveals run on CSS transitions, not JS tweens: requestAnimationFrame can be
  // suspended (hidden tab, throttled frame loop) and anything waiting on a JS
  // clock would then stay stuck at opacity 0. A transition always lands.
  EASE='cubic-bezier(.22,.61,.36,1)';

  prep(el,dist,blur){
    el.style.transition='none';
    void el.offsetWidth;                 // flush, so the hidden state is not animated
    el.style.opacity='0';
    el.style.transform='translateY('+dist+'px)';
    if(blur) el.style.filter='blur('+blur+'px)';
    el.style.willChange='opacity,transform';
  }

  play(el,dur,delay){
    el.style.transition='opacity '+dur+'ms '+this.EASE+' '+delay+'ms, transform '+dur+'ms '+this.EASE+' '+delay+'ms, filter '+dur+'ms ease '+delay+'ms';
    el.style.opacity='1';
    el.style.transform='translateY(0)';
    el.style.filter='blur(0px)';
    setTimeout(()=>{ el.style.willChange='auto'; },dur+delay+60);
  }

  countUp(el,target,dur){
    const t0=(window.performance&&performance.now)?performance.now():Date.now();
    const now=()=>(window.performance&&performance.now)?performance.now():Date.now();
    const id=setInterval(()=>{
      const p=Math.min(1,(now()-t0)/dur);
      const v=target*(1-Math.pow(1-p,3));
      const dp=parseInt(el.dataset.decimals||'0',10);
      el.textContent = dp ? v.toFixed(dp) : Math.round(v).toLocaleString();
      if(p>=1) clearInterval(id);
    },33);
    this._intervals.push(id);
  }

  /* ---------- reveals ---------- */
  observe(el,fn){
    if(!('IntersectionObserver' in window)){ fn(); return; }
    if(!this._io){
      this._ioMap=new Map();
      this._io=new IntersectionObserver(entries=>{
        entries.forEach(e=>{
          if(!e.isIntersecting) return;
          const cb=this._ioMap.get(e.target);
          if(cb){ this._ioMap.delete(e.target); this._io.unobserve(e.target); cb(); }
        });
      },{threshold:0.12});
    }
    this._ioMap.set(el,fn);
    this._io.observe(el);
  }

  splitWords(el){
    if(!el) return [];
    // already split: hand back the same spans so a replay can re-animate them
    if(el.dataset.split) return [...el.children].filter(n=>n.tagName==='SPAN');
    const parts=el.textContent.split(/(\s+)/);
    el.textContent='';
    const spans=[];
    parts.forEach(p=>{
      if(!p) return;
      if(/^\s+$/.test(p)){ el.appendChild(document.createTextNode(p)); return; }
      const s=document.createElement('span');
      s.textContent=p;
      s.style.display='inline-block';
      s.style.willChange='transform,opacity,filter';
      el.appendChild(s);
      spans.push(s);
    });
    el.dataset.split='1';
    return spans;
  }

  initReveals(mode){
    const subtle = mode==='subtle';
    const dist = subtle ? 14 : 34;
    const blur = subtle ? 3 : 8;
    const dur  = subtle ? 520 : 780;

    // hero copy rises out of the galaxy once the disc has spread
    this._heroDur=dur; this._heroDist=dist; this._heroBlur=blur;
    this.prepHeroCopy();

    document.querySelectorAll('[data-reveal-head]').forEach(el=>{
      const w=this.splitWords(el);
      if(!w.length) return;
      w.forEach(s=>this.prep(s,dist,blur));
      this.observe(el,()=>w.forEach((s,i)=>this.play(s,dur+140,i*45)));
    });

    document.querySelectorAll('[data-row]').forEach(row=>{
      const rule=row.querySelector('[data-rule]');
      this.prep(row,dist,0);
      if(rule){
        rule.style.transform='scaleX(0)';
        rule.style.transformOrigin='left center';
      }
      const d=parseFloat(row.dataset.stagger||0 as any)*110;
      this.observe(row,()=>{
        this.play(row,dur,d);
        if(rule){
          rule.style.transition='transform 1000ms '+this.EASE+' '+d+'ms';
          rule.style.transform='scaleX(1)';
        }
      });
    });

    document.querySelectorAll('[data-count]').forEach(el=>{
      const target=parseFloat(el.dataset.count);
      if(isNaN(target)) return;
      el.textContent='0';
      this.observe(el,()=>this.countUp(el,target,1600));
    });
  }

  // Uses the `translate` property so it never fights the reveal's `transform`.
  initAccordions(){
    document.querySelectorAll('[data-acc-item]').forEach(item=>{
      const head=item.querySelector('[data-acc-head]');
      const body=item.querySelector('[data-acc-body]');
      const icon=item.querySelector('[data-acc-icon]');
      if(!head||!body||head.dataset.wired) return;
      head.dataset.wired='1';
      const setIcon=(on)=>{ if(!icon) return;
        icon.style.transform=on?'rotate(135deg)':'rotate(0deg)';
        icon.style.borderColor=on?this.accentText():this.t('rgba(255,255,255,.18)');
        icon.style.color=on?this.accentText():this.t('#C3CBD9',1);
      };
      // start state, no animation, survives being on a hidden page
      const startOpen=body.hasAttribute('data-acc-open');
      body.style.maxHeight=startOpen?'none':'0px';
      body.style.opacity=startOpen?'1':'0';
      item.dataset.open=startOpen?'1':'0';
      setIcon(startOpen);

      body.addEventListener('transitionend',e=>{
        if(e.propertyName==='max-height' && item.dataset.open==='1') body.style.maxHeight='none';
      });

      const toggle=()=>{
        const willOpen=item.dataset.open!=='1';
        if(willOpen){
          const group=item.closest('[data-acc]');
          if(group) group.querySelectorAll('[data-acc-item]').forEach(sib=>{
            if(sib!==item && sib.dataset.open==='1'){
              const sb=sib.querySelector('[data-acc-body]');
              const si=sib.querySelector('[data-acc-icon]');
              if(sb){ sb.style.maxHeight=sb.scrollHeight+'px'; void sb.offsetHeight; sb.style.maxHeight='0px'; sb.style.opacity='0'; }
              sib.dataset.open='0';
              if(si){ si.style.transform='rotate(0deg)'; si.style.borderColor=this.t('rgba(255,255,255,.18)'); si.style.color=this.t('#C3CBD9',1); }
            }
          });
          body.style.maxHeight=body.scrollHeight+'px';
          body.style.opacity='1';
          item.dataset.open='1';
          setIcon(true);
        }else{
          body.style.maxHeight=body.scrollHeight+'px';
          void body.offsetHeight;
          body.style.maxHeight='0px';
          body.style.opacity='0';
          item.dataset.open='0';
          setIcon(false);
        }
      };
      head.addEventListener('click',toggle);
      head.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); } });
      head.addEventListener('mouseenter',()=>{ if(item.dataset.open!=='1' && icon) icon.style.borderColor=this.t('rgba(255,255,255,.38)'); });
      head.addEventListener('mouseleave',()=>{ if(item.dataset.open!=='1' && icon) icon.style.borderColor=this.t('rgba(255,255,255,.18)'); });
    });
  }

  initRail(){
    this._rail=document.querySelector('[data-rail]');
    if(!this._rail) return;
    const items=[...this._rail.querySelectorAll('[data-rail-item]')];
    this._railItems=items.map(a=>({
      a, tick:a.querySelector('[data-rail-tick]'), label:a.querySelector('[data-rail-label]'),
      section:document.querySelector('[data-anchor="'+a.getAttribute('data-rail-target')+'"]')
    })).filter(o=>o.section);

    this._railItems.forEach(o=>{
      o.a.addEventListener('click',e=>{
        e.preventDefault();
        const y=o.section.getBoundingClientRect().top+(window.pageYOffset||document.documentElement.scrollTop)-70;
        try{ if(this.lenis) this.lenis.scrollTo(y); else window.scrollTo({top:y,behavior:'smooth'}); }
        catch(err){ window.scrollTo(0,y); }
      });
      o.a.addEventListener('mouseenter',()=>{ if(o.a.dataset.on!=='1') o.label.style.color=this.t('#C3CBD9',1); });
      o.a.addEventListener('mouseleave',()=>{ if(o.a.dataset.on!=='1') o.label.style.color=this.t('#8693A8',1); });
    });

    this._paintRail=()=>{
      if(this._current!=='protocol') return;
      let active=this._railItems[0];
      this._railItems.forEach(o=>{ if(o.section.getBoundingClientRect().top<=150) active=o; });
      this._railItems.forEach(o=>{
        const on=(o===active);
        o.a.dataset.on=on?'1':'0';
        o.tick.style.width=on?'30px':'16px';
        o.tick.style.background=on?this.accentText():this.t('rgba(255,255,255,.22)');
        o.label.style.color=on?this.t('#FFFFFF',1):this.t('#8693A8',1);
        o.label.style.opacity='1';
      });
    };
    window.addEventListener('scroll',this._paintRail,{passive:true});
    this._paintRail();
  }

  updateRailVisibility(id){
    if(!this._rail) return;
    this._rail.style.display=(id==='protocol' && window.innerWidth>1180)?'flex':'none';
    if(id==='protocol' && this._paintRail) setTimeout(this._paintRail,60);
  }

  initHoverRows(){
    document.querySelectorAll('[data-hoverrow]').forEach(row=>{
      if(row.dataset.wired) return;
      row.dataset.wired='1';
      const arrow=row.querySelector('[data-arrow]');
      row.addEventListener('mouseenter',()=>{
        row.style.background=this.t('rgba(255,255,255,.035)');
        row.style.paddingLeft='22px';
        if(arrow){ arrow.style.transform='translateX(7px)'; arrow.style.color=this.accentHex(); }
      });
      row.addEventListener('mouseleave',()=>{
        row.style.background='transparent';
        row.style.paddingLeft='12px';
        if(arrow){ arrow.style.transform='translateX(0)'; arrow.style.color=this.t('#8C99AD',1); }
      });
    });
  }

  initTrustGraph(){
    const wrap=document.querySelector('[data-tg]');
    if(!wrap) return;

    const data={
      a7:{id:'A research agent',verdict:'Trusted for research. Untested for anything financial.',
        skills:[['Research and analysis','0.92',92,1],['Financial decisions','0.18',18,0],['Finding data','0.81',81,1]],
        evidence:'1,284 paid jobs · 3 disputes · 40,000 LUME staked',
        cost:'pay for 1,284 real jobs and stake 40,000 LUME'},
      ent:{id:'A company',verdict:'Gives agents a budget to spend. Every grant is limited and can be withdrawn.',
        skills:[['Budgets granted','0.96',96,1],['Grants pulled back early','0.04',4,0],['Pays on time','0.99',99,1]],
        evidence:'38 active budgets · 0 disputes raised · 2 years on the network',
        cost:'run two years of clean payment history'},
      n4f2:{id:'A compute provider',verdict:'Reliable at storing and serving. Lost part of its stake once, eighteen months ago.',
        skills:[['Serves stored files','0.97',97,1],['Stays online','0.94',94,1],['Repeatable results','0.71',71,0]],
        evidence:'44,102 verified proofs · 1 penalty · 120,000 LUME staked',
        cost:'stake 120,000 LUME and serve 44,102 verified proofs'},
      pack:{id:'A risk-scoring workflow',verdict:'Produces the same answer every time, so anyone can re-run it and check.',
        skills:[['Re-runs that matched','1.00',100,1],['How widely used','0.63',63,1],['Results disputed','0.02',2,0]],
        evidence:'8,940 runs · 8,940 independent checks matched · 0 mismatches',
        cost:'publish work that survives 8,940 independent re-runs'},
      ds:{id:'A market data feed',verdict:'Its origin is traceable, and every agent that used it is on record.',
        skills:[['Origin traceable','0.88',88,1],['Agents using it','0.54',54,1],['Times it was corrupted','0.00',0,0]],
        evidence:'612 signed checks · 0 corruptions · 41 agents using it',
        cost:'collect 612 signed checks from independent parties'}
    };
    const nodes=[...wrap.querySelectorAll('[data-node]')];
    const edges=[...wrap.querySelectorAll('[data-edge]')];
    const q=s=>wrap.querySelector(s);
    const paint=(key)=>{
      const d=data[key]; if(!d) return;
      const A=this.accentText(), DIM=this.t('#8693A8',1);
      nodes.forEach(n=>{
        const on=n.getAttribute('data-node')===key;
        n.style.opacity='1';
        const dot=n.querySelector('[data-dot]');
        dot.style.background=on?A:this.t('#04193A');
        dot.style.borderColor=on?A:this.t('rgba(255,255,255,.28)');
        dot.style.boxShadow=on?'0 0 0 7px '+A+'22':'0 0 0 0 rgba(71,199,138,0)';
        n.querySelector('[data-nlabel]').style.color=on?this.t('#FFFFFF',1):DIM;
        n.querySelector('[data-nsub]').style.color=on?A:this.t('#8693A8',1);
      });
      edges.forEach(e=>{
        const on=e.getAttribute('data-edge').split(',').indexOf(key)>-1;
        e.setAttribute('stroke',on?A+'99':this.t('rgba(255,255,255,.14)'));
        e.setAttribute('stroke-width',on?'1.6':'1');
      });
      q('[data-tg-id]').textContent=d.id;
      q('[data-tg-verdict]').textContent=d.verdict;
      q('[data-tg-evidence]').textContent=d.evidence;
      q('[data-tg-cost]').textContent=d.cost;
      const rows=[...wrap.querySelectorAll('[data-skill]')];
      d.skills.forEach((s,i)=>{
        const r=rows[i]; if(!r) return;
        const tone=s[3]?A:DIM;
        r.querySelector('[data-sname]').textContent=s[0];
        const v=r.querySelector('[data-sval]'); v.textContent=s[1]; v.style.color=tone;
        const b=r.querySelector('[data-sbar]'); b.style.width=s[2]+'%'; b.style.background=tone;
      });
    };
    nodes.forEach(n=>{
      const k=n.getAttribute('data-node');
      n.addEventListener('click',()=>{ this._tgCur=k; paint(k); });
      n.addEventListener('mouseenter',()=>{ this._tgCur=k; paint(k); });
    });
    paint('a7');
    (this._repaint=this._repaint||[]).push(()=>paint(this._tgCur||'a7'));
  }

  // The headline must be readable without any interaction, so this only ever runs
  // once, at load, as a short entrance. The galaxy click no longer touches the copy.
  prepHeroCopy(){
    if(this._heroShown) return;
    const dist=this._heroDist??34, blur=this._heroBlur??8;
    const h1=document.getElementById('hero-h1');
    if(!h1) return;
    this.splitWords(h1).forEach(w=>this.prep(w,dist+18,blur));
    ['#hero-eyebrow','#hero-sub'].forEach(sel=>{
      const el=document.querySelector(sel);
      if(el) this.prep(el,14,sel==='#hero-sub'?4:0);
    });
    document.querySelectorAll('#hero-cta > *').forEach(el=>this.prep(el,16,0));
    const inner=document.getElementById('hero-inner');
    if(inner) inner.style.pointerEvents='none';
  }

  releaseHeroCopy(){
    const inner=document.getElementById('hero-inner');
    if(inner) inner.style.pointerEvents='';
  }

  playHeroCopy(startAfter){
    const dur=this._heroDur??780;
    const h1=document.getElementById('hero-h1');
    if(!h1) return;
    if(this._heroShown) return;
    this._heroShown=true;
    const words=this.splitWords(h1);
    clearTimeout(this._heroTimer);
    this._heroTimer=setTimeout(()=>{
      const eb=document.querySelector('#hero-eyebrow');
      if(eb) this.play(eb,620,0);
      words.forEach((w,i)=>this.play(w,dur+220,90+i*55));
      const sub=document.querySelector('#hero-sub');
      if(sub) this.play(sub,820,430);
      document.querySelectorAll('#hero-cta > *').forEach((el,i)=>this.play(el,700,660+i*110));
      clearTimeout(this._heroLive);
      this._heroLive=setTimeout(()=>this.releaseHeroCopy(), 660+2*110+700);
    }, Math.max(0,startAfter||0));
  }

  initBlogFilter(){
    const bar=document.querySelector('[data-blogfilter]');
    if(!bar) return;
    const btns=[...bar.querySelectorAll('[data-cat]')];
    const posts=[...document.querySelectorAll('[data-post]')];
    const empty=document.querySelector('[data-blogempty]');
    const paint=(cat)=>{
      btns.forEach(b=>{
        const on=b.getAttribute('data-cat')===cat;
        b.dataset.on=on?'1':'0';
        b.style.background=on?this.accentHex():'transparent';
        b.style.color=on?'#001432':this.t('#C3CBD9',1);
        b.style.borderColor=on?this.accentHex():this.t('rgba(255,255,255,.18)');
      });
      let shown=0;
      posts.forEach(p=>{
        const hit = cat==='All' || p.getAttribute('data-cat')===cat;
        p.style.display=hit?'':'none';
        if(hit) shown++;
      });
      if(empty) empty.style.display=shown?'none':'block';
    };
    btns.forEach(b=>b.addEventListener('click',()=>paint(b.getAttribute('data-cat'))));
    this._repaint=this._repaint||[];
    this._repaint.push(()=>{
      const on=btns.find(b=>b.dataset.on==='1');
      paint(on?on.getAttribute('data-cat'):'All');
    });
  }

  initCopy(){
    document.querySelectorAll('[data-copy]').forEach(btn=>{
      if(btn.dataset.wired) return;
      btn.dataset.wired='1';
      btn.addEventListener('click',async(e)=>{
        e.stopPropagation();
        const txt=btn.getAttribute('data-copy')||'';
        try{ await navigator.clipboard.writeText(txt); }
        catch(err){
          const ta=document.createElement('textarea');
          ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0';
          document.body.appendChild(ta); ta.select();
          try{ document.execCommand('copy'); }catch(e2){}
          document.body.removeChild(ta);
        }
        const was=btn.textContent;
        btn.textContent='Copied';
        btn.style.color=this.accentText();
        clearTimeout(btn._t);
        btn._t=setTimeout(()=>{ btn.textContent=was; btn.style.color=this.t('#C3CBD9',1); },1500);
      });
    });
  }

  // Community lives on the home page, so this link routes then scrolls.
  initGoto(){
    document.querySelectorAll('[data-goto]').forEach(a=>{
      if(a.dataset.wired) return;
      a.dataset.wired='1';
      a.addEventListener('click',(e)=>{
        e.preventDefault();
        const id=a.getAttribute('data-goto');
        this.go('home');
        setTimeout(()=>{
          const t=document.getElementById(id);
          if(t) window.scrollTo({top:t.getBoundingClientRect().top+(window.pageYOffset||0)-110,behavior:'smooth'});
        },120);
      });
    });
  }

  initMarquee(){
    const wrap=document.querySelector('[data-marquee]');
    const track=wrap&&wrap.querySelector('[data-marquee-track]');
    if(!track) return;
    if(this.mode()==='off'){ track.style.animation='none'; return; }
    wrap.addEventListener('mouseenter',()=>{ track.style.animationPlayState='paused'; });
    wrap.addEventListener('mouseleave',()=>{ track.style.animationPlayState='running'; });
  }

  initMagnetic(){
    if(this.mode()==='off') return;
    document.querySelectorAll('[data-magnetic]').forEach(el=>{
      if(el.dataset.mag) return;
      el.dataset.mag='1';
      el.style.translate='0px 0px';
      el.addEventListener('mouseenter',()=>{ el.style.transition=(el.style.transition?el.style.transition+', ':'')+'translate 240ms '+this.EASE; });
      el.addEventListener('mousemove',e=>{
        const r=el.getBoundingClientRect();
        el.style.translate=((e.clientX-(r.left+r.width/2))*0.18).toFixed(1)+'px '+((e.clientY-(r.top+r.height/2))*0.28).toFixed(1)+'px';
      });
      el.addEventListener('mouseleave',()=>{ el.style.translate='0px 0px'; });
    });
  }

  /* ---------- interactive diagrams ---------- */
  initPlanes(){
    const bands=[...document.querySelectorAll('[data-plane]')];
    if(!bands.length) return;
    const hint=document.querySelector('[data-plane-hint]');
    const paint=(active)=>{
      bands.forEach(b=>{
        const on=(b===active);
        b.style.background = on ? 'rgba(71,199,138,.09)' : 'transparent';
        b.style.opacity = '1';
        b.querySelectorAll('[data-chip]').forEach(c=>{
          c.style.color = on ? this.t('#FFFFFF',1) : this.t('#C3CBD9',1);
          c.style.borderColor = on ? 'rgba(71,199,138,.55)' : this.t('rgba(255,255,255,.14)');
          c.style.background = on ? 'rgba(71,199,138,.1)' : 'transparent';
        });
      });
      this._planeCur=active;
      if(hint) hint.textContent = active
        ? ({control:'A permanent record. Every claim, escrow and receipt, checkable by anyone.',
            execution:'Bonded compute. Objective misbehaviour is slashable.',
            memory:'Memory the agent owns, across sessions and providers.'})[active.getAttribute('data-plane')]
        : 'Hover a plane to see what lives there.';
    };
    bands.forEach(b=>{
      b.addEventListener('mouseenter',()=>paint(b));
      b.addEventListener('focus',()=>paint(b));
      b.addEventListener('click',()=>paint(b));
    });
    const wrap=document.querySelector('[data-planes]');
    if(wrap) wrap.addEventListener('mouseleave',()=>paint(null));
    (this._repaint=this._repaint||[]).push(()=>paint(this._planeCur||null));
  }

  initStepper(){
    const steps=[...document.querySelectorAll('[data-step]')];
    if(!steps.length) return;
    const copy=[
      'Fund a Global Credits balance once, on-chain. Provider-agnostic from the start.',
      'Grant the agent scoped authority over a budget class or dataset, time-bound and revocable.',
      'Credits escrow at session start and a provider is matched from the catalogue.',
      'Review each turn. Only acknowledged turns ever become billable.',
      'Escrow releases on acknowledged completion. Receipts and fingerprints remain as evidence.'
    ];
    const state=[[100,0,0],[100,0,0],[80,20,0],[80,20,0],[80,0,20]];
    const set=(n)=>{
      this._step=n;
      steps.forEach((st,i)=>{
        const on=i===n, done=i<n;
        const dot=st.querySelector('[data-step-dot]'), lab=st.querySelector('[data-step-label]');
        if(dot){
          dot.style.background = on ? '#47C78A' : (done ? 'rgba(71,199,138,.18)' : this.t('#001432'));
          dot.style.borderColor = (on||done) ? 'rgba(71,199,138,.7)' : this.t('rgba(255,255,255,.18)');
          dot.style.color = on ? this.t('#001432',1) : (done ? this.accentText() : this.t('#8C99AD',1));
          dot.style.transform = on ? 'scale(1.14)' : 'scale(1)';
        }
        if(lab) lab.style.color = on ? this.t('#FFFFFF',1) : (done ? this.t('#C3CBD9',1) : this.t('#8C99AD',1));
      });
      const fill=document.querySelector('[data-step-fill]');
      if(fill) fill.style.width=(n/(steps.length-1)*88)+'%';
      const p=document.querySelector('[data-step-copy]');
      if(p) p.textContent=copy[n];
      ['balance','escrow','settled'].forEach((id,i)=>{
        const m=document.querySelector('[data-meter="'+id+'"]');
        if(m){ m.textContent=state[n][i] as any; m.style.color = state[n][i]>0 && i>0 ? this.accentText() : this.t('#FFFFFF',1); }
      });
    };
    (this._repaint=this._repaint||[]).push(()=>set(this._step||0));
    steps.forEach((st,i)=>{
      st.addEventListener('click',()=>{ set(i); this._stepPaused=true; });
      st.addEventListener('mouseenter',()=>{ set(i); this._stepPaused=true; });
    });
    const wrap=document.querySelector('[data-stepper]');
    if(wrap) wrap.addEventListener('mouseleave',()=>{ this._stepPaused=false; });
    set(0);
    const id=setInterval(()=>{
      if(this._dead||this._stepPaused) return;
      if(this._current!=='build') return;
      set(((this._step||0)+1)%steps.length);
    },2800);
    this._intervals.push(id);
  }

  initGantt(){
    document.querySelectorAll('[data-bar]').forEach(b=>{
      b.addEventListener('mouseenter',()=>{
        b.style.background='rgba(71,199,138,.3)';
        b.style.borderColor='rgba(71,199,138,.75)';
        b.style.transform='translateY(-1px)';
        const t=b.querySelector('span'); if(t) t.style.color=this.t('#FFFFFF',1);
      });
      b.addEventListener('mouseleave',()=>{
        b.style.background=''; b.style.borderColor=''; b.style.transform='';
        const t=b.querySelector('span'); if(t) t.style.color='';
      });
    });
  }

  /* ---------- galaxy hero ----------
     A spiral disc of nodes that starts collapsed in the core and flies outward
     into formation. Rendered on a transparent canvas so a theme change only
     needs a recolour, never a rebuild. */

  glowTexture(){
    if(this._glowTex) return this._glowTex;
    const T=window.THREE, cv=document.createElement('canvas');
    cv.width=cv.height=64;
    const g=cv.getContext('2d');
    const rg=g.createRadialGradient(32,32,0,32,32,32);
    rg.addColorStop(0,'rgba(255,255,255,1)');
    rg.addColorStop(.14,'rgba(255,255,255,.92)');
    rg.addColorStop(.38,'rgba(255,255,255,.30)');
    rg.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=rg; g.fillRect(0,0,64,64);
    this._glowTex=new T.CanvasTexture(cv);
    return this._glowTex;
  }

  galaxyPalette(){
    const T=window.THREE, light=this._theme==='light';
    const base=new T.Color(light?this.accentText():this.accentHex());
    // core burns toward white on dark, toward ink on light
    const core=base.clone().lerp(new T.Color(light?0x0A1A30:0xFFFFFF), light?0.62:0.9);
    return {base,core,light};
  }

  ecoPalette(){
    const T=window.THREE, light=this._theme==='light';
    const hex = light
      ? [0x5B4BD6,0xB46A18,0x1D6FA8,0x9C3F7A,0x2F7D4F,0x8A5A1E]
      : [0x8B7CF6,0xF0A64E,0x56B8E8,0xE87BB4,0x5FD39B,0xE0C36A];
    return hex.map(h=>new T.Color(h));
  }

  initGalaxy(){
    const el=document.getElementById('hero-net');
    const T=window.THREE;
    if(!el||!T) return;
    this.disposeGalaxy();

    const W=el.clientWidth||el.offsetWidth||1, H=el.clientHeight||el.offsetHeight||1;
    let renderer;
    try{ renderer=new T.WebGLRenderer({alpha:true,antialias:true}); }catch(e){ return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.setSize(W,H);
    renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;';
    el.appendChild(renderer.domElement);

    const scene=new T.Scene();
    const camera=new T.PerspectiveCamera(52,W/H,0.1,3000);
    camera.position.set(0,0,124);
    const group=new T.Group();
    group.rotation.x=-1.40;
    group.position.y=-3;
    scene.add(group);

    const narrow=Math.min(W,H)<520 || (W/H)<0.9;
    let coarse=false, thin=false;
    try{ coarse = matchMedia('(hover:none) and (pointer:coarse)').matches; }catch(e){}
    try{ thin = (navigator.hardwareConcurrency||8) <= 4; }catch(e){}
    // Device capability only. A narrow desktop window is still a desktop, and
    // fitGalaxy() already scales the group to whatever is visible.
    this._heroStatic = coarse || thin;
    const st=this._heroStatic;
    // fixed mobile budget — nodeCount's own default is far above it
    const NM = st ? 190
      : Math.max(110, Math.min(1200, Math.round((this.props.nodeCount ?? 560)*(narrow?0.62:1))));
    const RO=44, RI=28, THICK=6.6, R=RO;
    // fixed world units — fitGalaxy() scales the whole group to whatever is visible
    const SPAN=RO+92;
    const NEAR=RO+14;
    const lerpX=(t)=>NEAR+(SPAN-NEAR)*t;
    // three neighbouring networks a side, scattered rather than stacked
    const CL:any[]=[
      {x:-lerpX(0.10), z:-40, r:13.0, n:0.22},
      {x:-lerpX(0.52), z: -6, r:16.0, n:0.28},
      {x:-lerpX(0.94), z: 26, r:13.5, n:0.22},
      {x:-lerpX(0.30), z: 44, r:11.0, n:0.16},
      {x: lerpX(0.12), z: 42, r:13.0, n:0.22},
      {x: lerpX(0.56), z:  4, r:16.0, n:0.28},
      {x: lerpX(0.96), z:-28, r:13.5, n:0.22},
      {x: lerpX(0.34), z:-46, r:11.0, n:0.16}
    ];
    const MAXR=Math.max.apply(null,CL.map(c=>c.r))*1.25;
    const NEED=NEAR+MAXR*0.6;                                    // ring + nearest clusters must fit
    const NSTOT=Math.round(NM*0.5);
    CL.forEach(c=>{ c.count=Math.max(14,Math.round(NSTOT*c.n/2)); });
    const NS=CL.reduce((a,c)=>a+c.count,0);
    const ND=st?0:Math.round(NM*0.34);                           // unlinked background dust
    const N=NM+NS+ND;
    const bandOf=(i)=>{ let k=NM; for(let b=0;b<CL.length;b++){ if(i<k+CL[b].count) return b; k+=CL[b].count; } return CL.length-1; };
    const gauss=()=>(Math.random()+Math.random()+Math.random()-1.5)/1.5;

    const pos=new Float32Array(N*3), tgt=new Float32Array(N*3), src=new Float32Array(N*3);
    const col=new Float32Array(N*3), delay=new Float32Array(N);
    const eco=new Int8Array(N);                                 // 0 = Lumera, 1..6 = neighbours, -1 = dust
    const hub=new Uint8Array(N);
    const phase=new Float32Array(N), amp=new Float32Array(N);
    const {base,core}=this.galaxyPalette();
    const ecoCols=this.ecoPalette();
    const tmp=new T.Color();

    for(let i=0;i<N;i++){
      const dust = i>=NM+NS;
      const band = (i<NM||dust) ? -1 : bandOf(i);
      const sat = dust ? -1 : (band<0 ? 0 : band+1);
      eco[i]=sat;
      if(dust){
        tgt[i*3]=(Math.random()*2-1)*(SPAN+34);
        tgt[i*3+1]=(Math.random()*2-1)*30;
        tgt[i*3+2]=(Math.random()*2-1)*70;
        delay[i]=0.30+Math.random()*0.34;
        phase[i]=Math.random()*Math.PI*2; amp[i]=0;
        tmp.copy(base).multiplyScalar(0.42);
      } else if(sat===0){
        if(Math.random()<0.07) hub[i]=1;
        const ang=Math.random()*Math.PI*2;
        const r=Math.sqrt(RI*RI + Math.random()*(RO*RO-RI*RI));  // even spread across the band
        tgt[i*3]=Math.cos(ang)*r;
        tgt[i*3+1]=gauss()*THICK;
        tgt[i*3+2]=Math.sin(ang)*r;
        delay[i]=(ang/(Math.PI*2))*0.26 + Math.random()*0.12;    // unfurls around the ring
        const t=(r-RI)/(RO-RI);
        tmp.copy(core).lerp(base, Math.min(1,0.25+t*0.9));
        if(hub[i]) tmp.lerp(new T.Color(0xffffff), this._theme==='light'?0.30:0.55);
      } else {
        const c=CL[band];
        tgt[i*3]=c.x+gauss()*c.r*1.25;
        tgt[i*3+1]=gauss()*c.r*0.42;
        tgt[i*3+2]=c.z+gauss()*c.r*1.25;
        delay[i]=0.42+band*0.03+Math.random()*0.16;              // land after the ring, one by one
        phase[i]=Math.random()*Math.PI*2;
        amp[i]=0.5+Math.random()*1.5;                            // its own small orbit
        tmp.copy(ecoCols[(sat-1)%ecoCols.length]);
      }
      const cr=26;                                               // the starting cluster
      src[i*3]=gauss()*cr; src[i*3+1]=gauss()*cr*0.6; src[i*3+2]=gauss()*cr;
      pos[i*3]=src[i*3]; pos[i*3+1]=src[i*3+1]; pos[i*3+2]=src[i*3+2];
      col[i*3]=tmp.r; col[i*3+1]=tmp.g; col[i*3+2]=tmp.b;
    }

    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(pos,3));
    geo.setAttribute('color',new T.BufferAttribute(col,3));
    const light=this._theme==='light';
    const pMat=new T.PointsMaterial({
      size:light?2.6:3.4, map:this.glowTexture(), vertexColors:true,
      transparent:true, depthWrite:false, sizeAttenuation:true,
      blending:light?T.NormalBlending:T.AdditiveBlending,
      opacity:light?0.95:1
    });
    const points=new T.Points(geo,pMat);
    group.add(points);

    // links between neighbours in the finished formation, so it still reads as a graph
    const LD=st?13.4:11.8, MAXL=st?1200:8200, pairs=[];
    const cell=new Map(), key=(x,y,z)=>((x/LD)|0)+','+((y/LD)|0)+','+((z/LD)|0);
    for(let i=0;i<N;i++){
      const k=key(tgt[i*3],tgt[i*3+1],tgt[i*3+2]);
      if(!cell.has(k)) cell.set(k,[]);
      cell.get(k).push(i);
    }
    outer:
    for(let i=0;i<N;i++){
      const cx=(tgt[i*3]/LD)|0, cy=(tgt[i*3+1]/LD)|0, cz=(tgt[i*3+2]/LD)|0;
      if(eco[i]<0) continue;
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
        const c=cell.get((cx+dx)+','+(cy+dy)+','+(cz+dz));
        if(!c) continue;
        for(const j of c){
          if(j<=i || eco[j]!==eco[i]) continue;
          const ddx=tgt[i*3]-tgt[j*3], ddy=tgt[i*3+1]-tgt[j*3+1], ddz=tgt[i*3+2]-tgt[j*3+2];
          if(ddx*ddx+ddy*ddy+ddz*ddz < LD*LD){
            pairs.push(i,j);
            if(pairs.length/2>=MAXL) break outer;
          }
        }
      }
    }
    const members=[];
    for(let sat=1;sat<=CL.length;sat++){
      const from=[]; for(let i=0;i<N;i++) if(eco[i]===sat) from.push(i);
      members.push(from);
      // long spokes into the ring, anchored at random points so they fan out
      for(let b=0;b<9 && from.length;b++){
        const a=from[(Math.random()*from.length)|0];
        pairs.push(a, (Math.random()*NM)|0);
      }
    }
    // neighbour-to-neighbour links, so the field is webbed rather than radial
    for(let x=0;x<members.length;x++){
      for(let y=x+1;y<members.length;y++){
        const A=members[x], B=members[y];
        if(!A.length||!B.length) continue;
        const n=(x%3===y%3)?2:1;
        for(let k=0;k<n;k++) pairs.push(A[(Math.random()*A.length)|0], B[(Math.random()*B.length)|0]);
      }
    }

    const lp=new Float32Array(pairs.length*3);
    const lc=new Float32Array(pairs.length*3);
    for(let k=0;k<pairs.length;k++){
      const n=pairs[k];
      lc[k*3]=col[n*3]; lc[k*3+1]=col[n*3+1]; lc[k*3+2]=col[n*3+2];
    }
    const lGeo=new T.BufferGeometry();
    lGeo.setAttribute('position',new T.BufferAttribute(lp,3));
    lGeo.setAttribute('color',new T.BufferAttribute(lc,3));
    const lMat=new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0,depthWrite:false,
      blending:light?T.NormalBlending:T.AdditiveBlending});
    const lines=new T.LineSegments(lGeo,lMat);
    group.add(lines);

    this._gal={renderer,scene,camera,group,points,lines,geo,lGeo,pMat,lMat,
      pos,tgt,src,delay,pairs,eco,phase,amp,N,NM,R,el,need:NEED,rot:0};

    this._fitGalaxy=()=>{
      const g=this._gal; if(!g) return;
      const hw=Math.tan(26*Math.PI/180)*124*g.camera.aspect;
      g.group.scale.setScalar(Math.min(1, hw/g.need));
    };
    this._onGalaxyResize=()=>{
      const g=this._gal; if(!g) return;
      const w=g.el.clientWidth||1, h=g.el.clientHeight||1;
      g.camera.aspect=w/h; g.camera.updateProjectionMatrix(); g.renderer.setSize(w,h);
      this._fitGalaxy();
    el.__gal=this._gal;                                          // debug handle
    };
    this._fitGalaxy();
    el.__gal=this._gal;                                          // debug handle
    window.addEventListener('resize',this._onGalaxyResize);

    const hero=document.getElementById('hero');
    (hero||el).addEventListener('click',(e)=>{
      if(e.target.closest('a,button')) return;          // let the CTAs and Replay work normally
      this._galStarted ? this.replayGalaxy() : this.triggerGalaxy();
    });
    if(hero) hero.style.cursor='pointer';
    const rb=document.getElementById('hero-replay');
    if(rb) rb.addEventListener('click',(e)=>{ e.stopPropagation(); this.replayGalaxy(); });

    if(!this._heroStatic) this.initPackets();
    this.startGalaxy();
    this.playHeroCopy(160);
  }

  startGalaxy(){
    const g=this._gal; if(!g) return;
    // On phones the simulation is the most expensive thing on the page and the
    // payoff is smallest, so render the finished network once and stop.
    if(this._heroStatic){
      this._galStarted=true;
      this._galT0=-1e9;                         // p resolves to 1: fully expanded
      this.stepGalaxy();
      const hint=document.getElementById('hero-hint');
      if(hint) hint.style.display='none';
      const hero=document.getElementById('hero');
      if(hero) hero.style.cursor='';
      return;
    }
    this._galT0=Infinity;                       // cluster holds until clicked, or 3s
    this._galStarted=false;
    clearTimeout(this._galAuto);
    this._galAuto=setTimeout(()=>this.triggerGalaxy(), this.mode()==='off'?0:3000);
    const loop=()=>{
      if(this._dead||!this._gal) return;
      this._galRAF=requestAnimationFrame(loop);
      this.stepGalaxy();
    };
    if(this._galRAF) cancelAnimationFrame(this._galRAF);
    loop();
  }

  HOLD(){ return 420; }
  DUR(){ return 2200; }

  triggerGalaxy(){
    if(!this._gal||this._galStarted) return;
    this._galStarted=true;
    clearTimeout(this._galAuto);
    this._galT0=performance.now()+90;
    const hint=document.getElementById('hero-hint');
    if(hint){ hint.style.opacity='0'; hint.style.pointerEvents='none'; }
    const rb=document.getElementById('hero-replay');
    if(rb) rb.style.opacity='1';
  }

  replayGalaxy(){
    if(!this._gal) return;
    this._galStarted=false;
    this.triggerGalaxy();
  }

  stepGalaxy(){
    const g=this._gal, T=window.THREE; if(!g) return;
    const now=performance.now();
    const p=Math.max(0,Math.min(1,(now-this._galT0)/this.DUR()));
    const {pos,tgt,src,delay,N,eco,phase,amp}=g;
    const spread=1.46;
    const tsec=now*0.001;
    for(let i=0;i<N;i++){
      const u=Math.max(0,Math.min(1,(p*spread-delay[i])));
      const e=1-Math.pow(1-u,3);
      const k=i*3;
      pos[k]  =src[k]  +(tgt[k]  -src[k]  )*e;
      pos[k+1]=src[k+1]+(tgt[k+1]-src[k+1])*e;
      pos[k+2]=src[k+2]+(tgt[k+2]-src[k+2])*e;
      if(eco && eco[i] && e>0.6){
        // internal traffic: each node drifts on its own orbit once its cluster lands
        const a=amp[i]*(e-0.6)/0.4, ph=phase[i];
        pos[k]  += Math.sin(tsec*0.9+ph)*a;
        pos[k+1]+= Math.sin(tsec*1.27+ph*1.7)*a*0.5;
        pos[k+2]+= Math.cos(tsec*1.06+ph*0.8)*a;
      }
    }
    g.geo.attributes.position.needsUpdate=true;

    const lo=Math.max(0,Math.min(1,(p-0.42)/0.58));
    g.lMat.opacity=lo*(this._theme==='light'?0.28:0.38);
    if(lo>0){
      const lp=g.lGeo.attributes.position.array, pr=g.pairs;
      for(let n=0;n<pr.length;n++){
        const i=pr[n]*3, o=n*3;
        lp[o]=pos[i]; lp[o+1]=pos[i+1]; lp[o+2]=pos[i+2];
      }
      g.lGeo.attributes.position.needsUpdate=true;
    }

    g.group.rotation.x += (-1.40 - g.group.rotation.x)*0.04;

    this.updatePackets(p);
    g.renderer.render(g.scene,g.camera);
  }

  recolourGalaxy(){
    const g=this._gal, T=window.THREE; if(!g||!T) return;
    const {base,core,light}=this.galaxyPalette();
    const ecoCols=this.ecoPalette();
    const cols=g.geo.attributes.color.array, tmp=new T.Color();
    for(let i=0;i<g.N;i++){
      const sat=g.eco?g.eco[i]:0;
      if(sat<0){ tmp.copy(base).multiplyScalar(0.42); }
      else if(sat){ tmp.copy(ecoCols[(sat-1)%ecoCols.length]); }
      else{
        const x=g.tgt[i*3], z=g.tgt[i*3+2];
        const rr=Math.min(1,Math.sqrt(x*x+z*z)/g.R);
        tmp.copy(core).lerp(base,Math.min(1,0.25+rr*0.9));
      }
      cols[i*3]=tmp.r; cols[i*3+1]=tmp.g; cols[i*3+2]=tmp.b;
    }
    g.geo.attributes.color.needsUpdate=true;
    const lcArr=g.lGeo.attributes.color && g.lGeo.attributes.color.array;
    if(lcArr){
      for(let k=0;k<g.pairs.length;k++){
        const n=g.pairs[k];
        lcArr[k*3]=cols[n*3]; lcArr[k*3+1]=cols[n*3+1]; lcArr[k*3+2]=cols[n*3+2];
      }
      g.lGeo.attributes.color.needsUpdate=true;
    }
    g.pMat.blending = light?T.NormalBlending:T.AdditiveBlending;
    g.pMat.size = light?2.6:3.4;
    g.pMat.opacity = light?0.95:1;
    g.pMat.needsUpdate=true;
    g.lMat.blending = light?T.NormalBlending:T.AdditiveBlending;
    g.lMat.needsUpdate=true;
    const hot=base.clone().lerp(new T.Color(light?0x0A1A30:0xFFFFFF),light?0.5:0.72);
    (this._packets||[]).forEach(pk=>pk.sprites.forEach((sp,k)=>{
      sp.material.color.copy(k<=1?hot:base);
      sp.material.blending = light?T.NormalBlending:T.AdditiveBlending;
      sp.material.needsUpdate=true;
    }));
  }

  initPackets(){
    const g=this._gal, T=window.THREE;
    if(!g||!T||!g.pairs.length) return;
    this.destroyPackets();
    const {base,light}=this.galaxyPalette();
    const hot=base.clone().lerp(new T.Color(light?0x0A1A30:0xFFFFFF),light?0.5:0.72);
    const trail=[{s:1,o:1},{s:.72,o:.5},{s:.5,o:.26},{s:.34,o:.12}];
    const n=Math.max(0,Math.min(40,this.props.packets ?? 14));
    this._packets=[];
    for(let i=0;i<n;i++){
      const sprites=trail.map((t,k)=>{
        const m=new T.SpriteMaterial({map:this.glowTexture(),color:(k<=1?hot:base).clone(),
          transparent:true,blending:light?T.NormalBlending:T.AdditiveBlending,
          depthWrite:false,depthTest:false,opacity:0});
        const sp=new T.Sprite(m);
        sp.scale.setScalar(2.6*t.s);
        sp.visible=false;
        g.group.add(sp);
        return sp;
      });
      const pk={sprites,baseOp:trail.map(t=>t.o),pair:0,t:-Math.random()*1.6,speed:0.004};
      this.assignPacket(pk);
      this._packets.push(pk);
    }
  }

  assignPacket(pk){
    const g=this._gal; if(!g) return;
    pk.pair=((Math.random()*(g.pairs.length/2))|0)*2;
    pk.t=-Math.random()*1.2;
    pk.speed=0.004+Math.random()*0.008;
  }

  updatePackets(p){
    const ps=this._packets, g=this._gal;
    if(!ps||!g) return;
    const vis = p>0.6;
    for(let i=0;i<ps.length;i++){
      const pk=ps[i];
      if(!vis){ pk.sprites.forEach(s=>{s.visible=false;}); continue; }
      pk.t+=pk.speed;
      if(pk.t>=1){ pk.sprites.forEach(s=>{s.visible=false;}); this.assignPacket(pk); continue; }
      if(pk.t<0){ pk.sprites.forEach(s=>{s.visible=false;}); continue; }
      const ai=g.pairs[pk.pair]*3, bi=g.pairs[pk.pair+1]*3;
      const env=Math.sin(pk.t*Math.PI);
      for(let k=0;k<pk.sprites.length;k++){
        const sp=pk.sprites[k], tt=pk.t-k*0.03;
        if(tt<=0){ sp.visible=false; continue; }
        sp.visible=true;
        sp.position.set(
          g.pos[ai]+(g.pos[bi]-g.pos[ai])*tt,
          g.pos[ai+1]+(g.pos[bi+1]-g.pos[ai+1])*tt,
          g.pos[ai+2]+(g.pos[bi+2]-g.pos[ai+2])*tt
        );
        sp.material.opacity=pk.baseOp[k]*env*0.9;
      }
    }
  }

  destroyPackets(){
    try{
      (this._packets||[]).forEach(pk=>pk.sprites.forEach(sp=>{
        if(sp.parent) sp.parent.remove(sp);
        if(sp.material) sp.material.dispose();
      }));
    }catch(e){}
    this._packets=null;
  }

  rebuildGalaxy(){ this.initGalaxy(); }

  // Replaces the old template hover bindings on the partner-marquee logos.
  initLogos(){
    document.querySelectorAll('[data-partner] img').forEach(img=>{
      img.addEventListener('mouseenter',()=>{ img.style.opacity='1'; });
      img.addEventListener('mouseleave',()=>{ img.style.opacity='.78'; });
    });
  }


  disposeGalaxy(){
    this.destroyPackets();
    const g=this._gal;
    if(this._galRAF){ cancelAnimationFrame(this._galRAF); this._galRAF=null; }
    if(this._onGalaxyResize){ window.removeEventListener('resize',this._onGalaxyResize); this._onGalaxyResize=null; }
    if(!g) return;
    try{ g.geo.dispose(); g.lGeo.dispose(); g.pMat.dispose(); g.lMat.dispose(); }catch(e){}
    try{ g.renderer.dispose(); if(g.renderer.domElement.parentNode) g.renderer.domElement.parentNode.removeChild(g.renderer.domElement); }catch(e){}
    this._gal=null;
  }
}
