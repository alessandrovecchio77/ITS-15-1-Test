import type { CSSProperties, ReactNode } from 'react'
import type { Card } from '../engine/cards'
import { cn, numberTier } from '../lib/labels'

export type CardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface SizeTokens {
  box: string
  num: string
  corner: string
  icon: string
  label: string
}

const SIZES: Record<CardSize, SizeTokens> = {
  xs: {
    box: 'h-[27px] w-[20px] rounded-[3px]',
    num: 'text-[11px]',
    corner: 'hidden',
    icon: 'h-3 w-3',
    label: 'hidden',
  },
  sm: {
    box: 'h-[38px] w-[27px] rounded-[4px]',
    num: 'text-[15px]',
    corner: 'hidden',
    icon: 'h-4 w-4',
    label: 'hidden',
  },
  md: {
    box: 'h-[70px] w-[50px] rounded-[6px]',
    num: 'text-[28px]',
    corner: 'text-[8px]',
    icon: 'h-6 w-6',
    label: 'hidden',
  },
  lg: {
    box: 'h-[clamp(74px,9vh,104px)] w-[clamp(53px,6.4vh,74px)] rounded-[8px]',
    num: 'text-[clamp(24px,3.2vh,36px)]',
    corner: 'text-[8px]',
    icon: 'h-[clamp(18px,2.4vh,26px)] w-[clamp(18px,2.4vh,26px)]',
    label: 'hidden',
  },
  xl: {
    box: 'h-[clamp(96px,13.5vh,148px)] w-[clamp(68px,9.6vh,104px)] rounded-xl',
    num: 'text-[clamp(30px,4.8vh,54px)]',
    corner: 'text-[10px]',
    icon: 'h-[clamp(24px,3.6vh,42px)] w-[clamp(24px,3.6vh,42px)]',
    label: 'text-[7px]',
  },
}

interface CardViewProps {
  card?: Card | null
  size?: CardSize
  faceDown?: boolean
  className?: string
  style?: CSSProperties
}

export function CardView({ card, size = 'md', faceDown, className, style }: CardViewProps) {
  const tokens = SIZES[size]
  const shell = cn(
    'relative shrink-0 select-none overflow-hidden ring-1 ring-black/30 card-shadow',
    tokens.box,
    className,
  )

  if (faceDown || !card) {
    return (
      <div
        className={cn(shell, 'text-gold-300')}
        style={{
          ...style,
          background: 'linear-gradient(160deg,#0e4433 0%,#082219 58%,#0b2f24 100%)',
        }}
      >
        <div className="absolute inset-[3px] rounded-[inherit] border border-gold-400/35" />
        <div className="absolute inset-[6px] rounded-[inherit] border border-gold-400/15" />
        <div className="absolute inset-0 grid place-items-center">
          <span className={cn('font-display italic leading-none text-gold-300/85', tokens.num)}>7</span>
        </div>
        <div className="absolute inset-0 [background:linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.1)_50%,transparent_65%)]" />
      </div>
    )
  }

  if (card.type === 'number') {
    return (
      <div
        className={cn(shell, 'bg-[#f7f1e3] text-[#171310]')}
        style={style}
      >
        <div className="absolute inset-0 [background:radial-gradient(circle_at_28%_12%,rgba(255,255,255,0.95),transparent_58%)]" />
        <span className={cn('absolute left-[7%] top-[3%] font-semibold leading-none opacity-80', tokens.corner)}>
          {card.value}
        </span>
        <span
          className={cn(
            'absolute bottom-[3%] right-[7%] rotate-180 font-semibold leading-none opacity-80',
            tokens.corner,
          )}
        >
          {card.value}
        </span>
        <div className="absolute inset-0 grid place-items-center">
          <span className={cn('font-display font-semibold leading-none tabular', tokens.num)}>{card.value}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[7%]" style={{ background: numberTier(card.value) }} />
      </div>
    )
  }

  const special = (label: string, gradient: string, content: ReactNode) => (
    <div className={cn(shell, 'text-white')} style={{ ...style, background: gradient }}>
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_28%_0%,rgba(255,255,255,0.42),transparent_62%)]" />
      <div className="absolute inset-[3px] rounded-[inherit] border border-white/30" />
      <div className="absolute inset-0 grid place-items-center">
        <span className={cn('drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]', size === 'xs' ? 'text-[10px]' : '')}>{content}</span>
      </div>
      <div
        className={cn(
          'absolute inset-x-0 bottom-[6%] text-center font-semibold uppercase leading-none tracking-[0.1em] text-white/85',
          tokens.label,
        )}
      >
        {label}
      </div>
    </div>
  )

  switch (card.type) {
    case 'freeze':
      return special('Freeze', 'linear-gradient(158deg,#38bdf8 0%,#0d84c9 48%,#08507f 100%)', (
        <Snowflake className={tokens.icon} />
      ))
    case 'flip3':
      return special('Flip Three', 'linear-gradient(158deg,#fbbf24 0%,#e07a1f 48%,#9a4715 100%)', (
        <Chevrons className={tokens.icon} />
      ))
    case 'secondChance':
      return special('Second Chance', 'linear-gradient(158deg,#34d399 0%,#0f9d76 48%,#06694f 100%)', (
        <ShieldIcon className={tokens.icon} />
      ))
    case 'bonus':
      return special('Bonus', 'linear-gradient(158deg,#f8e0a8 0%,#d8ab5e 45%,#9a6a2c 100%)', (
        <span className={cn('font-display font-semibold leading-none text-[#3a2410]', tokens.num)}>+{card.value}</span>
      ))
    case 'multiplier':
      return special('Moltiplicatore', 'linear-gradient(158deg,#c084fc 0%,#8b3ddb 48%,#5b1f9e 100%)', (
        <span className={cn('font-display font-semibold leading-none', tokens.num)}>×2</span>
      ))
    default:
      return null
  }
}

function Snowflake({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" className={className}>
      <path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2 3.8 16.8" />
      <path d="M12 6.4 9.6 4M12 6.4 14.4 4M12 17.6 9.6 20M12 17.6l2.4 2.4M6.4 9.6 3.4 9.2M6.4 14.4l-3 .4M17.6 9.6l3-.4M17.6 14.4l3 .4" />
    </svg>
  )
}

function Chevrons({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6.5 8 12l-5 5.5M10 6.5 15 12l-5 5.5M17 6.5 22 12l-5 5.5" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2.8 19 5.6v5.9c0 4.6-3 7.7-7 9.4-4-1.7-7-4.8-7-9.4V5.6L12 2.8Z" />
      <path d="M9.2 11.7h3.3a1.9 1.9 0 0 1 0 3.8H9.6M9.4 9.4v6.4M11.9 9.4v.4" />
    </svg>
  )
}
