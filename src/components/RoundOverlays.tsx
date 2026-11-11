import { motion } from 'framer-motion'
import { Avatar } from '../components/Avatar'
import { Confetti } from '../components/Confetti'
import { scoreHand, type ScoreBreakdown } from '../engine/game'
import { cn } from '../lib/labels'
import { useNow } from '../lib/useNow'
import type { RoomPlayer, RoomView } from '../shared/protocol'

export function RoundSummaryOverlay({ view, onNext }: { view: RoomView; onNext: () => void }) {
  const summary = view.lastSummary
  const now = useNow(400)
  const countdown = view.nextRoundAt ? Math.max(0, Math.ceil((view.nextRoundAt - now) / 1000)) : null
  if (!summary) return null

  const rows = [...summary.rows].sort((a, b) => b.total - a.total)
  const byId = new Map(view.players.map((player) => [player.id, player]))

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/72 p-3 backdrop-blur-md sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 26 }}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/12 bg-[linear-gradient(170deg,#0b1d16,#050c09_72%)] shadow-[0_70px_140px_-50px_rgba(0,0,0,1)]"
      >
        <div className="flex items-end justify-between border-b border-white/8 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-gold-400/70">
              Round {summary.round} chiuso
            </p>
            <h2 className="font-display text-3xl italic leading-tight text-cream">Punteggi</h2>
          </div>
          <div className="text-right">
            <p className="text-[8px] uppercase tracking-[0.2em] text-cream/30">obiettivo</p>
            <p className="font-display text-xl text-gold-300 tabular">{view.targetScore}</p>
          </div>
        </div>

        <div className="hide-scrollbar max-h-[52dvh] space-y-1.5 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
          {rows.map((row) => {
            const player = byId.get(row.playerId)
            return (
              <div
                key={row.playerId}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-2.5 py-2 sm:px-3',
                  row.breakdown.busted
                    ? 'border-rose-400/15 bg-rose-500/[0.045]'
                    : 'border-white/8 bg-white/[0.025]',
                )}
              >
                <Avatar emoji={player?.avatar ?? '🦊'} name={row.name} size="sm" dim={row.breakdown.busted} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[12.5px] font-medium text-cream/85">{row.name}</span>
                    {row.status === 'frozen' && (
                      <span className="rounded-sm bg-sky-400/15 px-1 text-[7px] font-semibold uppercase tracking-[0.1em] text-sky-300">
                        congelato
                      </span>
                    )}
                    {row.status === 'stayed' && (
                      <span className="rounded-sm bg-emerald-400/15 px-1 text-[7px] font-semibold uppercase tracking-[0.1em] text-emerald-300">
                        stay
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[10px] tabular text-cream/40">{breakdownLine(row.breakdown)}</p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-200"
                      style={{ width: `${Math.min(100, (row.total / view.targetScore) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="w-[68px] shrink-0 text-right">
                  <p
                    className={cn(
                      'font-display text-2xl leading-none tabular',
                      row.roundDelta > 0 ? 'text-emerald-300' : 'text-cream/25',
                    )}
                  >
                    {row.roundDelta > 0 ? `+${row.roundDelta}` : '0'}
                  </p>
                  <p className="mt-0.5 text-[9px] tabular text-cream/35">{row.total} punti</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/8 px-4 py-3 sm:px-6">
          <p className="text-[10px] text-cream/35">
            {countdown !== null ? `Prossimo round in ${countdown}s` : 'In attesa del prossimo round'}
          </p>
          {view.isHost ? (
            <button
              type="button"
              onClick={onNext}
              className="rounded-xl bg-gradient-to-b from-gold-200 via-gold-400 to-gold-600 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#221607] shadow-[0_10px_24px_-12px_rgba(205,164,95,0.9)] transition hover:brightness-110 active:translate-y-px"
            >
              Prossimo round →
            </button>
          ) : (
            <span className="text-[9px] uppercase tracking-[0.16em] text-cream/30">l&apos;host continua</span>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export function GameOverOverlay({
  view,
  onRematch,
  onLeave,
}: {
  view: RoomView
  onRematch: () => void
  onLeave: () => void
}) {
  const winner = view.players.find((player) => player.id === view.winnerId) ?? view.players[0]
  const standings = [...view.players].sort((a, b) => b.total - a.total)

  return (
    <>
      <Confetti />
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/78 p-3 backdrop-blur-md sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gold-400/30 bg-[linear-gradient(170deg,#0d2419,#050c09_70%)] px-4 py-5 text-center shadow-[0_80px_160px_-50px_rgba(0,0,0,1)] sm:px-7 sm:py-7"
        >
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(ellipse_at_center,rgba(239,216,171,0.25),transparent_70%)] blur-2xl" />
          <p className="text-[9px] font-semibold uppercase tracking-[0.34em] text-gold-400/70">partita conclusa</p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <WinnerAvatar player={winner} />
            <div className="text-left">
              <p className="text-[9px] uppercase tracking-[0.2em] text-cream/35">vincitore</p>
              <h2 className="font-display text-[34px] italic leading-none text-cream sm:text-[42px]">
                {winner?.name ?? 'Nessuno'}
              </h2>
              <p className="mt-1 font-display text-xl text-gold-300 tabular">
                {winner?.total ?? 0} punti
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-1 text-left">
            {standings.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center gap-2.5 rounded-lg border border-white/6 bg-white/[0.02] px-2.5 py-1.5"
              >
                <span className="w-4 text-center font-mono text-[10px] text-cream/30">{index + 1}</span>
                <Avatar emoji={player.avatar} name={player.name} size="xs" />
                <span className="flex-1 truncate text-[12px] text-cream/75">{player.name}</span>
                <span className="font-display text-base tabular text-gold-200">{player.total}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col items-center gap-2">
            {view.isHost ? (
              <button
                type="button"
                onClick={onRematch}
                className="w-full max-w-xs rounded-xl bg-gradient-to-b from-gold-200 via-gold-400 to-gold-600 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#221607] shadow-[0_14px_34px_-14px_rgba(205,164,95,0.95)] transition hover:brightness-110 active:translate-y-px"
              >
                Nuova partita
              </button>
            ) : (
              <span className="rounded-full border border-white/10 px-3 py-1 text-[9px] uppercase tracking-[0.16em] text-cream/35">
                l&apos;host può avviare la rivincita
              </span>
            )}
            <button
              type="button"
              onClick={onLeave}
              className="text-[9px] uppercase tracking-[0.18em] text-cream/30 transition hover:text-cream/60"
            >
              torna alla home
            </button>
          </div>
        </motion.div>
      </div>
    </>
  )
}

function WinnerAvatar({ player }: { player?: RoomPlayer }) {
  if (!player) return null
  const score = scoreHand(player.hand, player.flip7, false)
  return (
    <div className="relative">
      <div className="absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(239,216,171,0.35),transparent_70%)] blur-md" />
      <Avatar emoji={player.avatar} name={player.name} size="xl" active />
      <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-gold-300/60 bg-[#0b1a14] text-[12px]">
        🏆
      </span>
      {score.flip7Bonus > 0 && (
        <span className="absolute -left-2 -top-2 rounded-full bg-gold-400 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-[#221607]">
          flip 7
        </span>
      )}
    </div>
  )
}

export function breakdownLine(breakdown: ScoreBreakdown): string {
  if (breakdown.busted) return 'sballato · zero punti'
  const parts = [`numeri ${breakdown.numbersTotal}`]
  if (breakdown.bonuses > 0) parts.push(`+${breakdown.bonuses} bonus`)
  if (breakdown.multipliers > 0) parts.push(`×${2 ** breakdown.multipliers}`)
  if (breakdown.flip7Bonus > 0) parts.push(`+${breakdown.flip7Bonus} flip 7`)
  return `${parts.join(' · ')} = ${breakdown.total}`
}
