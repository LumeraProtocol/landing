/* The galaxy was written against the UMD `window.THREE` namespace, and
   `import * as THREE` re-exports every symbol three has — which the bundler
   must then keep, because a namespace object assigned to a global could be
   indexed by anything. Naming the symbols instead lets three tree-shake, and
   keeping them in their own module means the survivors land in a lazy chunk
   that is only fetched once the hero is actually on screen.

   The list is exhaustive: every three access in lumera-site.ts goes through
   `const T = window.THREE` followed by a literal `T.<Symbol>` — there is no
   computed access, so this is the complete surface. Re-check with:
     grep -o '\bT\.[A-Za-z_][A-Za-z0-9_]*' src/lumera-site.ts | sort -u   */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  NormalBlending,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Sprite,
  SpriteMaterial,
  WebGLRenderer,
} from 'three'

export default {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  NormalBlending,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Sprite,
  SpriteMaterial,
  WebGLRenderer,
}
