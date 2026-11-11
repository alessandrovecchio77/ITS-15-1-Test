import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Avatar } from '../components/Avatar'
import { CardView } from '../components/CardView'
import { ChatPanel } from '../components/ChatPanel'
import { GameOverOverlay, RoundSummaryOverlay } from '../components/RoundOverlays'
import { Seat } from '../components/Seat'
import { TableFelt } from '../components/TableFelt'
import { TopBar } from '../components/TopBar'
import { cardLabel, type Card } from '../engine/cards'
import { scoreHand } from '../engine/game'
import { cn } from '../lib/labels'
import { opponentSeats } from '../lib/seatLayout'
import { useNow } from '../lib/useNow'
import { useTurnAlerts } from '../lib/useTurnAlerts'
import type { ChatMessage, RoomPlayer, RoomView } from '../shared/protocol'

const TURN_MS = 30_000
const PILE_CARD: CSSProperties = { height: 'clamp(46px, 6.6vh, 62px)', width: 'clamp(36px, 5vh, 46px)' }

type FlashTone = 'rose' | 'gold' | 'emerald' | 'sky' | 'amber'

interface Flash {
  id: number
  tone: FlashTone
  title: string
  text: string
}

interface Fly {
  id: number
  card: Card
  x: number
  y: number
  target: string
}

interface Reaction {
  key: number
  emoji: string
  x: number
  y: number
  drift: number
}

const FLASH_TONE: Record<FlashTone, string> = {
  rose: 'border-rose-400/35 text-rose-200 shadow-[0_0_80px_-20px_rgba(251,113,133,0.55)]',
  gold: 'border-gold-400/40 text-gold-200 shadow-[0_0_90px_-20px_rgba(226,192,134,0.6)]',
  emerald: 'border-emerald-400/35 text-emerald-200 shadow-[0_0_80px_-20px_rgba(52,211,153,0.5)]',
  sky: 'border-sky-400/40 text-sky-200 shadow-[0_0_80px_-20px_rgba(56,189,248,0.55)]',
  amber: 'border-amber-400/40 text-amber-200 shadow-[0_0_80px_-20px_rgba(251,191,36,0.5)]',
}

interface TableProps {
  view: RoomView
  onHit: () => void
  onStay: () => void
  onTarget: (playerId: string) => void
  onChat: (text: string) => void
  onReact: (emoji: string) => void
  onNextRound: () => void
  onRematch: () => void
  onLeave: () => void
  onRules: () => void
}

export function TableScreen({
  view,
  onHit,
  onStay,
  onTarget,
  onChat,
  onReact,
  onNextRound,
  onRematch,
  onLeave,
  onRules,
}: TableProps) {
  const me = view.players.find((player) => player.id === view.you)
  const others = view.players.filter((player) => player.id !== view.you)
  const seats = opponentSeats(others.length)
  const pending = view.pending
  const mustChoose = pending?.playerId === view.you
  const isMyTurn = view.phase === 'playing' && view.currentPlayerId === view.you && !pending
  const now = useNow(250)
  const turnAlerts = useTurnAlerts({ isMyTurn, round: view.round })

  const [flash, setFlash] = useState<Flash | null>(null)
  const [fly, setFly] = useState<Fly | null>(null)
  const lastEventRef = useRef<number | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [seenChatId, setSeenChatId] = useState(0)
  const [toastChat, setToastChat] = useState<ChatMessage | null>(null)
  const [reactions, setReactions] = useState<Reaction[]>([])
  const lastChatRef = useRef<number | null>(null)
  const chatInitialised = useRef(false)

  useEffect(() => {
    const events = view.events
    const maxId = events.length ? events[events.length - 1].id : 0
    if (lastEventRef.current === null || maxId < lastEventRef.current) {
      lastEventRef.current = maxId
      return
    }
    const fresh = events.filter((event) => event.id > (lastEventRef.current as number))
    lastEventRef.current = maxId
    if (!fresh.length) return

    const nameOf = (id: string) => view.players.find((player) => player.id === id)?.name ?? 'Giocatore'
    const opponents = view.players.filter((player) => player.id !== view.you)
    const points = opponentSeats(opponents.length)

    for (const event of fresh) {
      if (event.type === 'bust') {
        setFlash({ id: event.id, tone: 'rose', title: 'BUST', text: `${nameOf(event.playerId)} perde il round` })
      } else if (event.type === 'flip7') {
        setFlash({ id: event.id, tone: 'gold', title: 'FLIP 7', text: `${nameOf(event.playerId)} · +15 punti` })
      } else if (event.type === 'secondChance') {
        setFlash({
          id: event.id,
          tone: 'emerald',
          title: 'SECOND CHANCE',
          text: `${nameOf(event.playerId)} evita lo sballo`,
        })
      } else if (event.type === 'targeted') {
        const index = opponents.findIndex((player) => player.id === event.targetId)
        if (index >= 0) {
          setFly({
            id: event.id,
            card: event.card,
            x: points[index].x,
            y: points[index].y,
            target: nameOf(event.targetId),
          })
        }
        setFlash({
          id: event.id,
          tone: event.card.type === 'freeze' ? 'sky' : 'amber',
          title: event.card.type === 'freeze' ? 'FREEZE' : 'FLIP THREE',
          text: `${nameOf(event.playerId)} → ${nameOf(event.targetId)}`,
        })
      }
    }
  }, [view])

  useEffect(() => {
    if (!flash) return
    const timer = setTimeout(() => setFlash(null), 1750)
    return () => clearTimeout(timer)
  }, [flash])

  useEffect(() => {
    if (!fly) return
    const timer = setTimeout(() => setFly(null), 1100)
    return () => clearTimeout(timer)
  }, [fly])

  useEffect(() => {
    const chat = view.chat
    if (!chat.length) return
    const maxId = chat[chat.length - 1].id
    if (lastChatRef.current === null || maxId < lastChatRef.current) {
      lastChatRef.current = maxId
      return
    }
    const fresh = chat.filter((message) => message.id > (lastChatRef.current as number))
    lastChatRef.current = maxId
    if (!fresh.length) return

    const opponents = view.players.filter((player) => player.id !== view.you)
    const points = opponentSeats(opponents.length)

    for (const message of fresh) {
      if (message.kind === 'reaction') {
        const index = opponents.findIndex((player) => player.id === message.playerId)
        const x = index >= 0 ? points[index].x : 50
        const y = index >= 0 ? points[index].y : 76
        const key = message.id
        setReactions((current) => [
          ...current.slice(-7),
          { key, emoji: message.text, x, y, drift: Math.random() * 44 - 22 },
        ])
        setTimeout(() => setReactions((current) => current.filter((item) => item.key !== key)), 2400)
      } else if (message.playerId !== view.you) {
        setToastChat(message)
      }
    }
  }, [view])

  useEffect(() => {
    if (!view.chat.length) return
    const maxId = view.chat[view.chat.length - 1].id
    if (!chatInitialised.current) {
      chatInitialised.current = true
      setSeenChatId(maxId)
      return
    }
    if (chatOpen) setSeenChatId(maxId)
  }, [view.chat, chatOpen])

  useEffect(() => {
    if (!toastChat) return
    const timer = setTimeout(() => setToastChat(null), 4200)
    return () => clearTimeout(timer)
  }, [toastChat])

  const unread = view.chat.filter(
    (message) => message.id > seenChatId && message.playerId !== view.you,
  ).length

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (!isMyTurn) return
      const key = event.key.toLowerCase()
      if (key === 'h') onHit()
      if (key === 's') onStay()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isMyTurn, onHit, onStay])

  const remaining = view.turnEndsAt ? Math.max(0, view.turnEndsAt - now) : 0
  const turnProgress = view.turnEndsAt ? Math.min(1, remaining / TURN_MS) : 0

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#04070a] text-cream">
      <div className="pointer-events-none absolute -left-[18%] -top-[30%] h-[62vh] w-[62vw] rounded-full bg-[radial-gradient(circle,rgba(16,84,60,0.4),transparent_66%)] blur-[80px]" />
      <div className="pointer-events-none absolute -right-[12%] bottom-[0%] h-[52vh] w-[52vw] rounded-full bg-[radial-gradient(circle,rgba(150,108,48,0.18),transparent_66%)] blur-[80px]" />

      <TopBar
        code={view.code}
        round={view.round}
        target={view.targetScore}
        deckCount={view.deckCount}
        onRules={onRules}
        onLeave={onLeave}
        chat={{ unread, onOpen: () => setChatOpen(true) }}
        turnAlerts={{ status: turnAlerts.status, onToggle: turnAlerts.toggle }}
      />

      <div className="relative min-h-0 flex-1">
        <TableFelt />

        {others.map((player, index) => (
          <Seat
            key={player.id}
            player={player}
            isCurrent={view.currentPlayerId === player.id}
            isTargetable={Boolean(mustChoose && pending?.validTargets.includes(player.id))}
            onTarget={() => onTarget(player.id)}
            style={{ left: `${seats[index].x}%`, top: `${seats[index].y}%` }}
          />
        ))}

        <CenterStage view={view} />

        {reactions.map((reaction) => (
          <motion.span
            key={reaction.key}
            className="pointer-events-none absolute z-30 -translate-x-1/2 select-none text-[30px] drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)] sm:text-4xl"
            style={{ left: `${reaction.x}%`, top: `${reaction.y}%` }}
            initial={{ opacity: 0, y: 12, scale: 0.6 }}
            animate={{ opacity: [0, 1, 1, 0], y: -88, x: reaction.drift, scale: 1.15 }}
            transition={{ duration: 2.3, times: [0, 0.12, 0.68, 1] }}
          >
            {reaction.emoji}
          </motion.span>
        ))}

        <AnimatePresence>
          {toastChat && !chatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="pointer-events-none absolute bottom-1 left-1/2 z-20 flex max-w-[94%] -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/70 px-2.5 py-1.5 backdrop-blur"
            >
              <Avatar emoji={toastChat.avatar} name={toastChat.name} size="xs" />
              <span className="max-w-[74px] truncate text-[9px] uppercase tracking-[0.1em] text-cream/40">
                {toastChat.playerId === view.you ? 'tu' : toastChat.name}
              </span>
              <span className="truncate text-[11.5px] text-cream/85">{toastChat.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {fly && (
            <motion.div
              key={fly.id}
              className="pointer-events-none absolute z-30 drop-shadow-[0_30px_50px_rgba(0,0,0,0.8)]"
              initial={{ left: '50%', top: '46%', x: '-50%', y: '-50%', scale: 0.7, rotate: -18, opacity: 0 }}
              animate={{
                left: `${fly.x}%`,
                top: `${fly.y}%`,
                x: '-50%',
                y: '-50%',
                scale: 1,
                rotate: 8,
                opacity: 1,
              }}
              exit={{ opacity: 0, scale: 1.15 }}
              transition={{ duration: 0.62, ease: 'easeOut' }}
            >
              <CardView card={fly.card} size="xl" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {flash && (
            <motion.div
              key={flash.id}
              className="pointer-events-none absolute inset-0 z-40 grid place-items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ scale: 0.86, y: 14 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: -8 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className={cn(
                  'rounded-2xl border bg-[linear-gradient(170deg,rgba(8,20,16,0.94),rgba(3,7,6,0.9))] px-6 py-4 text-center backdrop-blur-xl',
                  FLASH_TONE[flash.tone],
                )}
              >
                <p className="font-display text-4xl italic leading-none tracking-tight sm:text-5xl">{flash.title}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] opacity-70">{flash.text}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PlayerDock
        me={me}
        isMyTurn={isMyTurn}
        mustChoose={Boolean(mustChoose)}
        turnProgress={turnProgress}
        onHit={onHit}
        onStay={onStay}
      />

      {chatOpen && (
        <ChatPanel view={view} onClose={() => setChatOpen(false)} onSend={onChat} onReact={onReact} />
      )}

      {view.phase === 'roundEnd' && <RoundSummaryOverlay view={view} onNext={onNextRound} />}
      {view.phase === 'gameOver' && <GameOverOverlay view={view} onRematch={onRematch} onLeave={onLeave} />}
    </div>
  )
}

function CenterStage({ view }: { view: RoomView }) {
  const current = view.players.find((player) => player.id === view.currentPlayerId)
  const pending = view.pending
  const text = tickerText(view)

  return (
    <div className="pointer-events-none absolute left-1/2 top-[46%] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 sm:gap-2.5">
      <div className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[8px] uppercase tracking-[0.2em] text-cream/55 backdrop-blur sm:text-[9px]">
        {view.phase === 'playing' ? (
          current ? (
            <>
              tocca a <span className="font-semibold normal-case tracking-normal text-gold-200">{current.name}</span>
            </>
          ) : (
            'turno'
          )
        ) : (
          'round chiuso'
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-7">
        <div className="flex flex-col items-center gap-1">
          <div className="relative h-[46px] w-[36px] sm:h-[62px] sm:w-[46px]">
            <div className="absolute left-[5px] top-[3px] opacity-40">
              <CardView faceDown size="md" style={PILE_CARD} />
            </div>
            <div className="absolute left-[2px] top-[2px] opacity-70">
              <CardView faceDown size="md" style={PILE_CARD} />
            </div>
            <div className="absolute left-0 top-0">
              <CardView faceDown size="md" style={PILE_CARD} />
            </div>
            <span className="absolute -right-2 -top-2 z-10 rounded-full border border-white/15 bg-[#08150f] px-1.5 py-[1px] font-mono text-[9px] text-cream/70 tabular">
              {view.deckCount}
            </span>
          </div>
          <span className="text-[7px] uppercase tracking-[0.2em] text-cream/25">mazzo</span>
        </div>

        <div className="relative grid h-[54px] w-[54px] place-items-center rounded-full border border-gold-400/25 bg-black/35 sm:h-[76px] sm:w-[76px]">
          <div className="absolute inset-0 rounded-full [background:radial-gradient(circle,rgba(226,192,134,0.16),transparent_70%)]" />
          <div className="absolute inset-[5px] rounded-full border border-gold-400/12" />
          {pending ? (
            <motion.div
              initial={{ scale: 0.6, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              className="z-10"
            >
              <CardView card={pending.card} size="md" className="animate-breathe" />
            </motion.div>
          ) : (
            <span className="font-display text-lg italic text-gold-300/75 sm:text-2xl">F7</span>
          )}
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="relative h-[46px] w-[36px] sm:h-[62px] sm:w-[46px]">
            {view.discardTop ? (
              <CardView card={view.discardTop} size="md" style={PILE_CARD} />
            ) : (
              <div className="h-full w-full rounded-md border border-dashed border-white/12 bg-black/20" />
            )}
            <span className="absolute -right-2 -top-2 z-10 rounded-full border border-white/15 bg-[#08150f] px-1.5 py-[1px] font-mono text-[9px] text-cream/70 tabular">
              {view.discardCount}
            </span>
          </div>
          <span className="text-[7px] uppercase tracking-[0.2em] text-cream/25">scarti</span>
        </div>
      </div>

      <div className="max-w-[74vw] truncate text-center text-[9px] text-cream/40 sm:max-w-[40vw] sm:text-[10.5px]">
        {text}
      </div>
    </div>
  )
}

function PlayerDock({
  me,
  isMyTurn,
  mustChoose,
  turnProgress,
  onHit,
  onStay,
}: {
  me?: RoomPlayer
  isMyTurn: boolean
  mustChoose: boolean
  turnProgress: number
  onHit: () => void
  onStay: () => void
}) {
  if (!me) return null
  const potential = scoreHand(me.hand, me.flip7, me.status === 'busted')
  const statusLabel =
    me.status === 'busted' ? 'SBALLATO' : me.status === 'frozen' ? 'CONGELATO' : me.status === 'stayed' ? 'STAY' : null

  return (
    <div className="relative z-30 mx-auto w-[min(1180px,97vw)] shrink-0 pb-2">
      <div
        className={cn(
          'relative rounded-2xl border bg-[linear-gradient(170deg,rgba(11,26,20,0.94),rgba(4,9,7,0.95))] px-2 py-2 backdrop-blur-xl transition sm:px-4 sm:py-2.5',
          isMyTurn
            ? 'border-gold-400/50 shadow-[0_0_0_1px_rgba(226,192,134,0.18),0_0_60px_-22px_rgba(226,192,134,0.9)]'
            : 'border-white/10 shadow-[0_-20px_50px_-30px_rgba(0,0,0,1)]',
        )}
      >
        {isMyTurn && (
          <div className="absolute inset-x-4 top-0 h-[2px] overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-gold-300 to-gold-400 transition-[width] duration-200 ease-linear"
              style={{ width: `${turnProgress * 100}%` }}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 sm:flex-nowrap sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
            <Avatar emoji={me.avatar} name={me.name} size="md" active={isMyTurn} dim={me.status === 'busted'} />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="max-w-[86px] truncate text-[9px] uppercase tracking-[0.14em] text-cream/40 sm:max-w-none">
                  tu · {me.name}
                </span>
                {me.flip7 && (
                  <span className="rounded-sm bg-gold-400/20 px-1 text-[6.5px] font-bold uppercase tracking-[0.08em] text-gold-200">
                    flip 7
                  </span>
                )}
                {statusLabel && (
                  <span
                    className={cn(
                      'rounded-sm px-1 text-[6.5px] font-bold uppercase tracking-[0.08em]',
                      me.status === 'busted'
                        ? 'bg-rose-500/20 text-rose-200'
                        : me.status === 'frozen'
                          ? 'bg-sky-500/20 text-sky-200'
                          : 'bg-emerald-500/20 text-emerald-200',
                    )}
                  >
                    {statusLabel}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-xl leading-none tabular text-gold-200 sm:text-2xl">{me.total}</span>
                <span className="text-[8px] uppercase tracking-[0.1em] text-cream/30">punti</span>
                {potential.total > 0 && (
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-[1px] text-[9px] font-semibold tabular text-emerald-300">
                    +{potential.total}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="order-last flex w-full min-w-0 justify-center sm:order-none sm:w-auto sm:flex-1">
            <HandFan hand={me.hand} dim={me.status === 'busted'} />
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={cn(
                'hidden text-[8px] uppercase tracking-[0.16em] sm:block',
                mustChoose ? 'text-sky-300' : isMyTurn ? 'text-gold-300/80' : 'text-cream/30',
              )}
            >
              {mustChoose ? 'scegli il bersaglio' : isMyTurn ? 'tocca a te' : 'attendi'}
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ActionButton variant="stay" disabled={!isMyTurn} onClick={onStay} />
              <ActionButton variant="hit" disabled={!isMyTurn} onClick={onHit} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HandFan({ hand, dim }: { hand: Card[]; dim?: boolean }) {
  const sorted = [...hand].sort((a, b) => {
    const rank = (type: string) => (type === 'number' ? 0 : type === 'bonus' ? 1 : type === 'multiplier' ? 2 : 3)
    return rank(a.type) - rank(b.type) || (a.type === 'number' && b.type === 'number' ? a.value - b.value : 0)
  })
  const count = sorted.length
  const overlap = count <= 4 ? 14 : count <= 6 ? 22 : count <= 9 ? 30 : 38

  if (!count) {
    return (
      <span className="text-[9px] uppercase tracking-[0.2em] text-cream/20">nessuna carta</span>
    )
  }

  return (
    <div className={cn('flex items-end justify-center', dim && 'opacity-45 saturate-50')}>
      {sorted.map((card, index) => {
        const offset = index - (count - 1) / 2
        return (
          <motion.div
            key={card.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            style={{ marginLeft: index === 0 ? 0 : -overlap, zIndex: index }}
            className="relative"
          >
            <div
              style={{
                transform: `rotate(${offset * 4.2}deg) translateY(${Math.abs(offset) ** 1.7 * 1.4}px)`,
                transformOrigin: '50% 140%',
              }}
            >
              <CardView card={card} size="lg" />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function ActionButton({
  variant,
  disabled,
  onClick,
}: {
  variant: 'hit' | 'stay'
  disabled?: boolean
  onClick: () => void
}) {
  const isHit = variant === 'hit'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isHit ? 'Pesca una carta (H)' : 'Fermati (S)'}
      className={cn(
        'group relative flex h-[clamp(42px,6.4vh,54px)] w-[clamp(66px,9vw,112px)] flex-col items-center justify-center gap-0.5 rounded-xl transition active:translate-y-px',
        isHit
          ? 'bg-gradient-to-b from-gold-100 via-gold-300 to-gold-600 text-[#221607] shadow-[0_14px_30px_-14px_rgba(205,164,95,0.95),inset_0_1px_0_rgba(255,255,255,0.65)]'
          : 'border border-emerald-300/35 bg-emerald-400/[0.08] text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-emerald-400/[0.14]',
        disabled && 'cursor-not-allowed opacity-30 shadow-none',
      )}
    >
      <span className={cn('text-[11px] font-bold uppercase tracking-[0.22em] sm:text-[12px]')}>
        {isHit ? 'HIT' : 'STAY'}
      </span>
      <span className="hidden text-[6.5px] uppercase tracking-[0.16em] opacity-55 sm:block">
        {isHit ? 'pesca' : 'fermati'}
      </span>
    </button>
  )
}

function tickerText(view: RoomView): string {
  // The turn banner already names the active player, so show the last real beat.
  const event = [...view.events].reverse().find((candidate) => candidate.type !== 'turn')
  if (!event) return 'In attesa delle carte'
  const nameOf = (id: string) => view.players.find((player) => player.id === id)?.name ?? 'Giocatore'
  switch (event.type) {
    case 'roundStart':
      return `Round ${event.round} · carte distribuite`
    case 'draw':
      return `${nameOf(event.playerId)} pesca ${cardLabel(event.card)}`
    case 'bust':
      return `${nameOf(event.playerId)} sballa con un altro ${event.card.value}`
    case 'flip7':
      return `Flip 7 di ${nameOf(event.playerId)} · +15 punti`
    case 'stay':
      return `${nameOf(event.playerId)} si ferma e mette al sicuro i punti`
    case 'secondChance':
      return `${nameOf(event.playerId)} gioca Second Chance`
    case 'targeted':
      return `${nameOf(event.playerId)} lancia ${cardLabel(event.card)} su ${nameOf(event.targetId)}`
    case 'fizzle':
      return `${nameOf(event.playerId)} scarta ${cardLabel(event.card)}`
    case 'roundEnd':
      return `Round ${event.round} chiuso`
    case 'gameOver':
      return `${nameOf(event.winnerId)} vince la partita`
  }
}
