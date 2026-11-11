import { useEffect, useState } from 'react'

/** Re-renders on an interval so countdowns and turn timers stay live. */
export function useNow(interval = 500): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}
