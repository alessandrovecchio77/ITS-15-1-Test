import { cn } from '../lib/labels'

export function Brand({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'relative grid place-items-center rounded-[7px] border border-gold-400/40 shadow-[0_6px_16px_-8px_rgba(0,0,0,0.9)]',
          compact ? 'h-7 w-[22px]' : 'h-10 w-8',
        )}
        style={{ background: 'linear-gradient(160deg,#0e4433,#082219 58%,#0b2f24)' }}
      >
        <span className={cn('font-display italic leading-none text-gold-300', compact ? 'text-[15px]' : 'text-xl')}>
          7
        </span>
        <span className="absolute inset-[2px] rounded-[5px] border border-gold-400/20" />
      </div>
      <span
        className={cn(
          'font-display italic leading-none tracking-tight text-cream/90',
          compact ? 'text-lg' : 'text-2xl',
        )}
      >
        Flip <span className="not-italic font-sans text-[0.8em] font-semibold tracking-[-0.04em] text-gold-300">7</span>
      </span>
    </div>
  )
}
