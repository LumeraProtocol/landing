# Lumera

Static HTML assembled from partials, styled by
inline styles + one stylesheet, driven by one TypeScript class. Vite serves
it in dev and produces the production bundle.

## Commands

```sh
npm install
npm run dev       # dev server on http://localhost:5173
npm run check     # TypeScript type-check (tsc --noEmit)
npm run build     # production build -> dist/
npm run preview   # serve the production build
```

## Layout

```
index.html            29-line shell: <head> + one @include marker per section
partials/
  nav.html            fixed navbar + scroll progress bar
  page-home.html      one file per data-page block — inner HTML is
  page-protocol.html  byte-identical to the original single-file page
  page-token.html
  page-build.html
  page-memory.html
  page-blog.html
  page-network.html
  page-roadmap.html
  footer.html
src/
  main.ts             entry: exposes three/lenis as the globals the class
                      expects, boots the site on DOMContentLoaded
  config.ts           SiteConfig + CONFIG (accent, motion, smooth scroll,
                      galaxy node count, packet count)
  lumera-site.ts      LumeraSite class: router, reveals, theme engine,
                      accordions, trust graph, hero galaxy (Three.js)
  shims.d.ts          typing shims (Element.style etc.) — see note below
  vite-env.d.ts       Vite client types (CSS imports)
styles.css            keyframes + responsive media overrides
public/assets/        favicon, logo, partner marquee logos
vite.config.js        html-partials plugin (assembles index.html from
                      partials in dev and build)
tsconfig.json
```

Dependencies are pinned exactly: `three@0.134.0` (same r134 previously
vendored) and `lenis@1.3.23`, plus `@types/three@0.134`.

## How the partials work

`index.html` contains `<!-- @include partials/x.html -->` markers, one per
line. The `html-partials` plugin in `vite.config.js` expands them (recursively)
before Vite's own HTML processing, in both dev and build, so the browser
always receives one assembled page. Editing a partial triggers a full reload.

## TypeScript posture

The class was ported from verified JS with **erasable syntax only** (declare
fields, optional-parameter markers, `as any` casts), so the transpiled output
is token-identical to the original JS. `tsconfig.json` is deliberately
non-strict and `src/shims.d.ts` types `Element` like `HTMLElement` — the
alternative was rewriting verified DOM code. To ratchet strictness later:
enable one flag (or delete one shim entry) at a time and fix the fallout,
then re-verify against a live render.

Theme note: `applyTheme()` rewrites inline style colors per element (see
`t()`/`themeTokens()`); colors must stay in inline styles until a CSS
custom-property migration replaces that mechanism wholesale.
