import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ClientMessage, RoomView, ServerMessage } from '../shared/protocol'

const TOKEN_KEY = 'flip7.token'

export type ConnectionStatus = 'connecting' | 'online' | 'offline'

export function useRoom() {
  const [view, setView] = useState<RoomView | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const queueRef = useRef<string[]>([])
  const retryRef = useRef(0)

  useEffect(() => {
    let disposed = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let socket: WebSocket | null = null

    const connect = () => {
      if (disposed) return
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
      socket = new WebSocket(`${protocol}//${location.host}/flip7-ws`)
      socketRef.current = socket

      socket.onopen = () => {
        if (disposed) return
        retryRef.current = 0
        setStatus('online')
        const token = localStorage.getItem(TOKEN_KEY)
        if (token) socket?.send(JSON.stringify({ type: 'hello', token } satisfies ClientMessage))
        for (const payload of queueRef.current.splice(0)) socket?.send(payload)
      }

      socket.onmessage = (event) => {
        let message: ServerMessage
        try {
          message = JSON.parse(String(event.data)) as ServerMessage
        } catch {
          return
        }
        if (message.type === 'view') {
          setView(message.view)
          if (message.token) localStorage.setItem(TOKEN_KEY, message.token)
        } else if (message.type === 'error') {
          if (message.message === 'session-expired') {
            localStorage.removeItem(TOKEN_KEY)
            setView(null)
          } else {
            setError(message.message)
          }
        } else if (message.type === 'left') {
          localStorage.removeItem(TOKEN_KEY)
          setView(null)
        }
      }

      socket.onclose = () => {
        if (disposed) return
        socketRef.current = null
        setStatus('offline')
        const delay = Math.min(4000, 500 * 2 ** retryRef.current)
        retryRef.current += 1
        retryTimer = setTimeout(connect, delay)
      }

      socket.onerror = () => socket?.close()
    }

    connect()

    return () => {
      disposed = true
      if (retryTimer) clearTimeout(retryTimer)
      socket?.close()
    }
  }, [])

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(null), 4500)
    return () => clearTimeout(timer)
  }, [error])

  const send = useCallback((message: ClientMessage) => {
    const payload = JSON.stringify(message)
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(payload)
    else queueRef.current.push(payload)
  }, [])

  const actions = useMemo(
    () => ({
      create: (name: string, avatar: string) => send({ type: 'create', name, avatar }),
      join: (code: string, name: string, avatar: string) => send({ type: 'join', code, name, avatar }),
      start: () => send({ type: 'start' }),
      addBot: () => send({ type: 'addBot' }),
      removeBot: (playerId: string) => send({ type: 'removeBot', playerId }),
      hit: () => send({ type: 'hit' }),
      stay: () => send({ type: 'stay' }),
      target: (targetId: string) => send({ type: 'target', targetId }),
      chat: (text: string) => send({ type: 'chat', text }),
      react: (emoji: string) => send({ type: 'reaction', emoji }),
      nextRound: () => send({ type: 'nextRound' }),
      rematch: () => send({ type: 'rematch' }),
      leave: () => {
        localStorage.removeItem(TOKEN_KEY)
        setView(null)
        send({ type: 'leave' })
      },
    }),
    [send],
  )

  return { view, status, error, actions, clearError: useCallback(() => setError(null), []) }
}
