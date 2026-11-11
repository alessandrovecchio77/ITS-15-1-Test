import type { ReactNode } from 'react'
import { cn } from '../lib/labels'

interface TableFeltProps {
  children?: ReactNode
  className?: string
  watermark?: boolean
}

/** The oval table: brass rail, felt, inner rings and a subtle logo watermark. */
export function TableFelt({ children, className, watermark = true }: TableFeltProps) {
  return (
    <div className={cn('pointer-events-none absolute inset-x-[2.5%] top-[6%] bottom-[1%]', className)}>
      <div
        className="h-full w-full rounded-[50%] p-[3px] shadow-[0_70px_140px_-60px_rgba(0,0,0,0.95),0_30px_60px_-40px_rgba(0,0,0,0.8)]"
        style={{
          background:
            'linear-gradient(168deg,#f0d9ac 0%,#a1804a 9%,#4a3b22 22%,#191813 44%,#14130f 60%,#4b3a22 82%,#c4a268 94%,#7c6134 100%)',
        }}
      >
        <div
          className="relative h-full w-full overflow-hidden rounded-[50%] shadow-[inset_0_0_150px_rgba(0,0,0,0.72),inset_0_2px_0_rgba(255,255,255,0.09)]"
          style={{
            background:
              'radial-gradient(ellipse at 50% 30%, #1a6b4f 0%, #11503a 30%, #0a3125 62%, #061a13 100%)',
          }}
        >
          <div className="absolute inset-[3.2%] rounded-[50%] border border-gold-300/15" />
          <div className="absolute inset-[8.5%] rounded-[50%] border border-white/[0.06]" />
          <div className="felt-noise pointer-events-none absolute inset-0 opacity-[0.13]" />
          <div className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_at_50%_118%,rgba(0,0,0,0.8),transparent_58%)]" />
          <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_-10%,rgba(255,240,200,0.12),transparent_45%)]" />
          {watermark && (
            <div className="pointer-events-none absolute left-1/2 top-[62%] -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[clamp(48px,9vw,132px)] italic leading-none text-cream/[0.045]">
              Flip 7
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
