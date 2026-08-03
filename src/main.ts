import * as THREE from 'three'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { CONFIG } from './config.js'
import { LumeraSite } from './lumera-site.js'

declare global {
  interface Window { THREE: any; Lenis: any; lumera: LumeraSite }
}

// The page logic was written against the UMD globals; expose the npm builds
// the same way so its code stays untouched (pinned: three@0.134.0 = r134,
// lenis@1.3.23 — the exact versions previously vendored).
window.THREE = THREE
window.Lenis = Lenis

const site = new LumeraSite(CONFIG);
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>site.init());
else site.init();
window.lumera = site;   // debug handle
