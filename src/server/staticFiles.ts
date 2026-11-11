import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

const IMMUTABLE_ASSETS = ['assets']

async function statSafe(path: string) {
  try {
    return await stat(path)
  } catch {
    return null
  }
}

/**
 * Serves the Vite build from `directory`. Hashed bundles are cached forever,
 * index.html is always revalidated, and unknown HTML routes fall back to the
 * SPA shell while missing assets stay 404s.
 */
export function createStaticHandler(directory: string) {
  const root = resolve(directory)
  const indexFile = join(root, 'index.html')

  const sendFile = async (request: IncomingMessage, response: ServerResponse, filePath: string): Promise<boolean> => {
    const info = await statSafe(filePath)
    if (!info?.isFile()) return false

    const extension = extname(filePath).toLowerCase()
    const isHtml = extension === '.html'
    const isHashedAsset = IMMUTABLE_ASSETS.some((folder) => filePath.startsWith(join(root, folder) + sep))

    response.writeHead(200, {
      'content-type': MIME[extension] ?? 'application/octet-stream',
      'content-length': info.size,
      'cache-control': isHtml
        ? 'no-cache'
        : isHashedAsset
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
    })

    if (request.method === 'HEAD') {
      response.end()
      return true
    }

    await new Promise<void>((done) => {
      const stream = createReadStream(filePath)
      stream.on('error', () => {
        response.destroy()
        done()
      })
      stream.on('close', done)
      response.on('close', () => stream.destroy())
      stream.pipe(response)
    })
    return true
  }

  return async function serveStatic(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
    let pathname: string
    try {
      pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
    } catch {
      return false
    }
    if (pathname.includes('\0')) return false

    const candidate = resolve(root, `.${pathname}`)
    if (candidate !== root && !candidate.startsWith(root + sep)) return false

    const info = await statSafe(candidate)
    if (info?.isDirectory()) {
      return sendFile(request, response, join(candidate, 'index.html'))
    }
    if (info?.isFile()) {
      return sendFile(request, response, candidate)
    }

    // Client-side navigation: hand back the app shell, never for asset lookups.
    const acceptsHtml = (request.headers.accept ?? '').includes('text/html')
    if (!extname(pathname) && acceptsHtml) {
      return sendFile(request, response, indexFile)
    }
    return false
  }
}
