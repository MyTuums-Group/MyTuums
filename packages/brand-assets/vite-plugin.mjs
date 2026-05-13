import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const brandPublicDir = path.join(__dirname, "public")

const MIME_TYPES = {
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
}

/**
 * Serves and copies shared favicon / PWA icon files from `packages/brand-assets/public`
 * into each app's dev server and production `outDir`, alongside that app's own `public/`.
 */
export function brandAssetsPublicPlugin() {
  let outDir
  const hasBrandAssets = fs.existsSync(brandPublicDir)

  return {
    name: "@workspace/brand-assets/public",
    enforce: "post",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      if (!hasBrandAssets) {
        return
      }
      server.middlewares.use((req, res, next) => {
        const url = req.url
        const qsIndex = url.indexOf("?")
        const pathname = qsIndex === -1 ? url : url.slice(0, qsIndex)

        const ext = path.extname(pathname).toLowerCase()
        const contentType = MIME_TYPES[ext]
        if (!contentType) {
          return next()
        }

        const filePath = path.join(brandPublicDir, pathname)

        if (
          !filePath.startsWith(brandPublicDir) ||
          !fs.existsSync(filePath) ||
          !fs.statSync(filePath).isFile()
        ) {
          return next()
        }

        res.setHeader("Content-Type", contentType)
        fs.createReadStream(filePath).pipe(res)
      })
    },
    closeBundle() {
      if (!hasBrandAssets || !outDir) {
        return
      }
      fs.cpSync(brandPublicDir, outDir, { recursive: true })
    },
  }
}
