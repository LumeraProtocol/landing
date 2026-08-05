import 'lenis/dist/lenis.css'
import { CONFIG } from './config.js'
import { LumeraSite } from './lumera-site.js'

declare global {
  interface Window { THREE: any; Lenis: any; lumera: LumeraSite }
}

const site = new LumeraSite(CONFIG);

/* three and lenis are decoration, and between them they were 93% of the entry
   bundle. Neither is needed for the page to render, route or scroll, so the
   site boots without them and they load afterwards — and only when they are
   going to be used at all. The page logic already tolerates their absence:
   initGalaxy() bails on a missing window.THREE, and every lenis call site
   falls back to native scrolling behind an `if(this.lenis)` guard. */

function deferLibraries(){
  const motion = site.mode();                 // 'off' under prefers-reduced-motion
  if(motion==='off') return;                  // boot() skips the galaxy and lenis entirely

  // Smooth scroll — same conditions boot() uses to decide whether to call
  // initLenis(), checked here so touch devices never download it.
  let coarsePtr = false;
  try{ coarsePtr = matchMedia('(hover:none) and (pointer:coarse)').matches; }catch(e){}
  if(!coarsePtr && (CONFIG.smoothScroll ?? true)){
    idle(()=>{
      import('lenis')
        .then(m=>{ window.Lenis = m.default; site.initLenis(); })
        .catch(()=>{});                       // native scrolling is the fallback
    });
  }

  // Hero galaxy — deferred until #hero-net is on screen, so a deep link to
  // #token or #roadmap (where the hero is display:none) never pays for three.
  const hero = document.getElementById('hero-net');
  if(!hero) return;
  let started = false;
  const load = ()=>{
    if(started) return;
    started = true;
    import('./three-globals.js')
      .then(m=>{ window.THREE = m.default; site.rebuildGalaxy(); })
      .catch(()=>{});                         // hero just stays a flat backdrop
  };
  if(!('IntersectionObserver' in window)) return idle(load);
  const io = new IntersectionObserver(entries=>{
    if(entries.some(e=>e.isIntersecting)){ io.disconnect(); load(); }
  });
  io.observe(hero);
}

function idle(fn){
  if('requestIdleCallback' in window) requestIdleCallback(fn,{timeout:2000});
  else setTimeout(fn,200);
}

function start(){
  site.init();
  deferLibraries();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start);
else start();
window.lumera = site;   // debug handle
