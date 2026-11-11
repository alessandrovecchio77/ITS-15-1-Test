import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'flip7.turnAlerts'
const BASE_TITLE = 'Flip 7 — Push your luck'
const TURN_TITLE = '🎯 Tocca a te · Flip 7'

export type TurnAlertStatus = 'unsupported' | 'off' | 'on' | 'blocked'

interface TurnAlertOptions {
  isMyTurn: boolean
  round: number
}

/**
 * Signals that it is the local player's turn even when the tab is in the
 * background: the title always changes, while a system notification and a
 * vibration fire only for players who opted in and are not looking.
 */
export function useTurnAlerts({ isMyTurn, round }: TurnAlertOptions) {
  const supported = typeof window !== 'undefined' && 'Notification' in window
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== '0'
    } catch {
      return true
    }
  })
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification === 'undefined' ? 'denied' : Notification.permission,
  )
  const notified = useRef(false)
  const activeNotification = useRef<Notification | null>(null)

  useEffect(() => {
    document.title = isMyTurn ? TURN_TITLE : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [isMyTurn])

  useEffect(() => {
    if (!isMyTurn) {
      notified.current = false
      activeNotification.current?.close()
      activeNotification.current = null
    }
  }, [isMyTurn])

  const notify = useCallback(() => {
    if (notified.current || !enabled) return
    notified.current = true

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([90, 60, 90])
      } catch {
        // Vibration is best effort.
      }
    }

    if (!supported || permission !== 'granted') return
    try {
      activeNotification.current?.close()
      const notification = new Notification('Tocca a te!', {
        body: `Round ${round} · pesca o fermati`,
        tag: 'flip7-turn',
        silent: false,
      })
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
      activeNotification.current = notification
    } catch {
      // Mobile browsers only allow notifications through a service worker.
    }
  }, [enabled, permission, round, supported])

  useEffect(() => {
    if (!isMyTurn) return
    const isAway = () => document.visibilityState === 'hidden' || !document.hasFocus()

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        notify()
      } else {
        activeNotification.current?.close()
        activeNotification.current = null
      }
    }
    const onBlur = () => {
      if (isAway()) notify()
    }
    const onFocus = () => {
      activeNotification.current?.close()
      activeNotification.current = null
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    if (isAway()) notify()

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [isMyTurn, notify])

  useEffect(
    () => () => {
      activeNotification.current?.close()
      activeNotification.current = null
    },
    [],
  )

  const toggle = useCallback(async () => {
    if (!supported) return
    if (Notification.permission === 'granted') {
      setEnabled((current) => {
        const next = !current
        try {
          localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
        } catch {
          // Storage can be unavailable in private mode.
        }
        return next
      })
      return
    }
    if (Notification.permission === 'denied') {
      setPermission('denied')
      return
    }
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        try {
          localStorage.setItem(STORAGE_KEY, '1')
        } catch {
          // ignore
        }
        setEnabled(true)
      }
    } catch {
      // ignore
    }
  }, [supported])

  const status: TurnAlertStatus = !supported
    ? 'unsupported'
    : permission === 'denied'
      ? 'blocked'
      : permission === 'granted' && enabled
        ? 'on'
        : 'off'

  return { status, toggle }
}
