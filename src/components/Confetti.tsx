import { useMemo, type CSSProperties } from 'react'

const COLORS = ['#efd8ab', '#e2c086', '#34d399', '#38bdf8', '#c084fc', '#fb7185', '#f6f1e6']

export function Confetti({ pieces = 40 }: { pieces?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 1.6,
        duration: 2.6 + Math.random() * 2.2,
        drift: `${(Math.random() - 0.5) * 220}px`,
        spin: `${Math.random() * 900 - 450}deg`,
        color: COLORS[index % COLORS.length],
        width: 4 + Math.random() * 5,
        height: 8 + Math.random() * 10,
        round: Math.random() > 0.6,
      })),
    [pieces],
  )

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {bits.map((bit) => (
        <span
          key={bit.id}
          className="confetti-piece absolute top-0 block"
          style={
            {
              left: `${bit.left}%`,
              width: bit.width,
              height: bit.height,
              background: bit.color,
              borderRadius: bit.round ? '999px' : '2px',
              opacity: 0.9,
              '--duration': `${bit.duration}s`,
              '--delay': `${bit.delay}s`,
              '--drift': bit.drift,
              '--spin': bit.spin,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
