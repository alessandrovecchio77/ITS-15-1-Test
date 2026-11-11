import { avatarGradient } from '../lib/identity'
import { cn } from '../lib/labels'

const SIZES = {
  xs: 'h-6 w-6 text-[11px]',
  sm: 'h-7 w-7 text-sm',
  md: 'h-9 w-9 text-lg',
  lg: 'h-12 w-12 text-2xl',
  xl: 'h-16 w-16 text-3xl',
} as const

interface AvatarProps {
  emoji: string
  name: string
  size?: keyof typeof SIZES
  active?: boolean
  dim?: boolean
  className?: string
}

export function Avatar({ emoji, name, size = 'md', active, dim, className }: AvatarProps) {
  return (
    <div
      className={cn(
        'relative grid shrink-0 place-items-center rounded-full ring-1 ring-white/20',
        'shadow-[0_6px_18px_-8px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.35)]',
        SIZES[size],
        dim && 'opacity-50 saturate-50',
        className,
      )}
      style={{ background: avatarGradient(name) }}
      aria-hidden
    >
      <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">{emoji}</span>
      {active && (
        <span className="absolute -inset-1 rounded-full border border-gold-300/70 shadow-[0_0_18px_rgba(226,192,134,0.55)]" />
      )}
    </div>
  )
}
