import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import type { Card } from '../engine/cards'
import { scoreHand } from '../engine/game'
import { cn, STATUS_META } from '../lib/labels'
import type { RoomPlayer } from '../shared/protocol'
import { Avatar } from './Avatar'
import { CardView } from './CardView'

interface SeatProps {
  player: RoomPlayer
  isCurrent: boolean
  isTargetable?: boolean
  onTarget?: () => void
  style?: CSSProperties
}

export function Seat({ player, isCurrent, isTargetable, onTarget, style }: SeatProps) {
  const potential = player.status === 'busted' ? 0 : scoreHand(player.hand, player.flip7, false).total
  const cards = [...player.hand].sort((a, b) => {
    const rank = (type: string) => (type === 'number' ? 0 : type === 'bonus' ? 1 : type === 'multiplier' ? 2 : 3)
    return rank(a.type) - rank(b.type)
  })
  const status = STATUS_META[player.status]
  const renderCards = (list: Card[], overlap: number) =>
    list.map((card, index) => (
      <div
        key={card.id}
        className="relative"
        style={{
          marginLeft: index === 0 ? 0 : -overlap,
          zIndex: index,
          transform: `rotate(${(index - (list.length - 1) / 2) * 5}deg)`,
        }}
      >
        <CardView card={card} size="xs" />
      </div>
    ))

  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={style}>
      <motion.div
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="relative"
      >
        {isTargetable && (
          <div className="absolute -top-5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-sky-400 px-2 py-[2px] text-[8px] font-bold tracking-[0.14em] text-sky-950 shadow-[0_0_18px_rgba(56,189,248,0.8)]">
            SCEGLI
          </div>
        )}
        <button
          type="button"
          onClick={isTargetable ? onTarget : undefined}
          disabled={!isTargetable}
          className={cn(
            'relative block w-[clamp(78px,10.5vw,158px)] rounded-xl border px-1.5 py-1 text-left backdrop-blur-md transition sm:rounded-2xl sm:px-2 sm:py-1.5',
            'bg-[linear-gradient(165deg,rgba(12,26,22,0.88),rgba(5,12,10,0.82))]',
            isCurrent
              ? 'border-gold-400/70 shadow-[0_0_0_1px_rgba(226,192,134,0.25),0_0_38px_-8px_rgba(226,192,134,0.7)]'
              : 'border-white/10 shadow-[0_14px_30px_-18px_rgba(0,0,0,0.9)]',
            isTargetable &&
              'cursor-pointer border-sky-300/80 shadow-[0_0_0_1px_rgba(125,211,252,0.35),0_0_34px_-6px_rgba(56,189,248,0.8)] hover:scale-[1.03]',
            player.status === 'busted' && 'opacity-70',
          )}
        >
          {isCurrent && (
            <span className="pointer-events-none absolute -inset-[3px] rounded-xl border border-gold-300/40 sm:rounded-2xl" />
          )}
          <div className="flex items-center gap-1.5">
            <Avatar
              emoji={player.avatar}
              name={player.name}
              size="sm"
              active={isCurrent}
              dim={player.status === 'busted'}
              className="scale-[0.82] origin-left sm:scale-100"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="truncate text-[9px] font-medium leading-tight text-cream/85 sm:text-[10.5px]">
                  {player.name}
                </span>
                {player.isBot && (
                  <span className="hidden shrink-0 rounded-sm bg-white/10 px-1 text-[6.5px] font-semibold uppercase leading-[10px] tracking-[0.1em] text-cream/45 sm:inline-block">
                    bot
                  </span>
                )}
                {!player.connected && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.9)]" />
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[15px] leading-none tabular text-gold-300 sm:text-[17px]">
                  {player.total}
                </span>
                {potential > 0 && player.status !== 'busted' && (
                  <span className="hidden text-[8.5px] font-medium tabular leading-none text-emerald-300/70 sm:inline">
                    +{potential}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-1 flex h-[26px] items-center justify-center sm:h-[27px]">
            {cards.length ? (
              <>
                <div className="flex items-center sm:hidden">{renderCards(cards.slice(0, 5), 8)}</div>
                <div className="hidden items-center sm:flex">{renderCards(cards.slice(0, 7), 6)}</div>
                {cards.length > 5 && (
                  <span className="ml-1 text-[7.5px] font-semibold text-cream/45 sm:hidden">
                    +{cards.length - 5}
                  </span>
                )}
                {cards.length > 7 && (
                  <span className="ml-1 hidden text-[8.5px] font-semibold text-cream/45 sm:inline">
                    +{cards.length - 7}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[8px] uppercase tracking-[0.16em] text-cream/25">in attesa</span>
            )}
          </div>

          <div
            className={cn(
              'absolute -bottom-[7px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-1.5 py-[1px] text-[6.5px] font-bold tracking-[0.12em] shadow-sm sm:text-[7.5px]',
              status.tone,
            )}
          >
            {status.label}
          </div>
        </button>
      </motion.div>
    </div>
  )
}
