import type { Server as HttpServer } from 'node:http'
import type { Plugin } from 'vite'
import { RoomManager } from './rooms'
import { attachGameSocket } from './ws'

/**
 * Mounts the realtime Flip 7 server on the Vite dev server's own HTTP server,
 * so the client and the websocket share one origin and one port.
 */
export function flip7Realtime(): Plugin {
  return {
    name: 'flip7-realtime',
    apply: 'serve',
    configureServer(server) {
      if (!server.httpServer) return
      const manager = new RoomManager()
      // Vite types the dev server as http | http2; websocket upgrades need HTTP/1.
      const sockets = attachGameSocket(server.httpServer as HttpServer, manager)
      server.httpServer.on('close', () => sockets.close())
    },
  }
}
