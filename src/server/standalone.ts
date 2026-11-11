import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RoomManager } from './rooms'
import { createStaticHandler } from './staticFiles'
import { attachGameSocket } from './ws'

/**
 * Deployable Flip 7 server: serves the Vite build and the room websocket on the
 * same port. Build it with `npm run build:all`, then run `npm start`.
 */

const DEFAULT_STATIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const STATIC_DIR = resolve(process.env.STATIC_DIR ?? DEFAULT_STATIC_DIR)
const PORT = Number.parseInt(process.env.PORT ?? '3000', 10)
const HOST = process.env.HOST ?? '0.0.0.0'
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

if (!Number.isInteger(PORT) || PORT <= 0 || PORT > 65_535) {
  console.error(`[flip7] Invalid PORT: ${process.env.PORT}`)
  process.exit(1)
}

try {
  const indexInfo = await stat(join(STATIC_DIR, 'index.html'))
  if (!indexInfo.isFile()) throw new Error('index.html missing')
} catch {
  console.error(`[flip7] No build found in ${STATIC_DIR}. Run "npm run build" first (or set STATIC_DIR).`)
  process.exit(1)
}

const manager = new RoomManager()
const serveStatic = createStaticHandler(STATIC_DIR)
const startedAt = Date.now()

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

    if (url.pathname === '/healthz') {
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      })
      response.end(
        JSON.stringify({
          status: 'ok',
          rooms: manager.roomCount,
          uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        }),
      )
      return
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8' })
      response.end('Method Not Allowed')
      return
    }

    const served = await serveStatic(request, response)
    if (!served && !response.headersSent) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
      response.end('Not Found')
    }
  } catch (error) {
    console.error('[flip7] request failed', error)
    if (!response.headersSent) response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    if (!response.writableEnded) response.end('Internal Server Error')
  }
})

const sockets = attachGameSocket(server, manager, { allowedOrigins: ALLOWED_ORIGINS })

server.listen(PORT, HOST, () => {
  const originNote = ALLOWED_ORIGINS.length ? ` · origins: ${ALLOWED_ORIGINS.join(', ')}` : ''
  console.log(`[flip7] listening on http://${HOST}:${PORT} · static: ${STATIC_DIR}${originNote}`)
})

server.on('error', (error) => {
  console.error('[flip7] server error', error)
  process.exit(1)
})

let shuttingDown = false
const shutdown = (signal: string) => {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[flip7] ${signal} received, closing`)
  sockets.close()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 5000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
