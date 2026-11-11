import type { IncomingMessage, Server } from 'node:http'
import type { Duplex } from 'node:stream'
import { WebSocketServer } from 'ws'
import type { RoomManager } from './rooms'

export interface GameSocketOptions {
  /** Upgrade path, shared by the Vite plugin and the standalone server. */
  path?: string
  /** Optional browser origin allowlist (CSWSH protection). Empty = allow any. */
  allowedOrigins?: readonly string[]
}

/**
 * Mounts the Flip 7 realtime protocol on an existing HTTP server so the app and
 * its websocket share one port and one origin.
 */
export function attachGameSocket(server: Server, manager: RoomManager, options: GameSocketOptions = {}) {
  const path = options.path ?? '/flip7-ws'
  const allowedOrigins = options.allowedOrigins ?? []
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 })

  const onUpgrade = (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (!(request.url ?? '').startsWith(path)) return

    const origin = request.headers.origin
    if (allowedOrigins.length && origin && !allowedOrigins.includes(origin)) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n')
      return
    }

    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request))
  }

  server.on('upgrade', onUpgrade)
  wss.on('connection', (ws) => manager.attach(ws))

  return {
    close() {
      server.off('upgrade', onUpgrade)
      manager.dispose()
      wss.close()
    },
  }
}
