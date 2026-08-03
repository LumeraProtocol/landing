import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { defineConfig } from 'vite'

// Expands `<!-- @include partials/x.html -->` markers (each on its own line)
// with the referenced file's exact bytes, recursively. Runs before Vite's own
// HTML processing in both dev and build, so the served page is identical to
// the pre-split single file.
const INCLUDE = /<!--\s*@include\s+(\S+)\s*-->\r?\n/g

function htmlPartials() {
  let root
  return {
    name: 'html-partials',
    configResolved(config) { root = config.root },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const expand = (src, dir) => src.replace(INCLUDE, (_, ref) => {
          const file = resolve(dir, ref)
          return expand(readFileSync(file, 'utf8'), dirname(file))
        })
        return expand(html, root)
      },
    },
    handleHotUpdate({ file, server }) {
      if (file.replace(/\\/g, '/').includes('/partials/')) {
        server.ws.send({ type: 'full-reload' })
        return []
      }
    },
  }
}

export default defineConfig({
  plugins: [htmlPartials()],
})
