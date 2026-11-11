import { motion } from 'framer-motion'
import { useState, type CSSProperties } from 'react'
import { Avatar } from '../components/Avatar'
import { Brand } from '../components/Brand'
import { TableFelt } from '../components/TableFelt'
import { cn } from '../lib/labels'
import { lobbySeats } from '../lib/seatLayout'
import type { ConnectionStatus } from '../lib/useRoom'
import type { RoomPlayer, RoomView } from '../shared/protocol'

interface LobbyProps {
  view: RoomView
  status: ConnectionStatus
  onStart: () => void
  onAddBot: () => void
  onRemoveBot: (playerId: string) => void
  onLeave: () => void
  onRules: () => void
}

export function LobbyScreen({ view, status, onStart, onAddBot, onRemoveBot, onLeave, onRules }: LobbyProps) {
  const me = view.players.find((player) => player.id === view.you)
  const others = view.players.filter((player) => player.id !== view.you)
  const ordered = me ? [me, ...others] : others
  const seats = lobbySeats(ordered.length)
  const [copied, setCopied] = useState(false)
  const enoughPlayers = view.players.length >= view.minPlayers

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(view.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#04070a] text-cream">
      <div className="pointer-events-none absolute -left-[15%] -top-[25%] h-[60vh] w-[60vw] rounded-full bg-[radial-gradient(circle,rgba(16,84,60,0.45),transparent_66%)] blur-[80px]" />
      <div className="pointer-events-none absolute -right-[10%] bottom-[5%] h-[50vh] w-[50vw] rounded-full bg-[radial-gradient(circle,rgba(150,108,48,0.18),transparent_66%)] blur-[80px]" />

      <header className="relative z-30 flex h-12 shrink-0 items-center justify-between px-3 sm:h-14 sm:px-5">
        <Brand compact />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRules}
            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-cream/45 transition hover:border-gold-400/40 hover:text-gold-200"
          >
            Regole
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-cream/45 transition hover:border-rose-400/40 hover:text-rose-300"
          >
            Esci
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <TableFelt watermark={false} />

        {ordered.map((player, index) => (
          <LobbySeat
            key={player.id}
            player={player}
            isMe={player.id === view.you}
            isHost={player.id === view.hostId}
            canRemove={view.isHost && player.isBot && view.players.length > 1}
            onRemove={() => onRemoveBot(player.id)}
            style={{ left: `${seats[index].x}%`, top: `${seats[index].y}%` }}
          />
        ))}

        <div className="absolute left-1/2 top-1/2 z-10 w-[min(440px,72vw)] -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-[8px] font-semibold uppercase tracking-[0.32em] text-cream/35">codice stanza</p>
          <button
            type="button"
            onClick={copy}
            className="group mt-0.5 inline-flex items-baseline gap-1 px-2"
            title="Copia il codice"
          >
            {view.code.split('').map((digit, index) => (
              <span
                key={index}
                className="font-mono text-[clamp(30px,6.4vw,48px)] font-semibold leading-none tracking-[0.06em] text-gold-200 drop-shadow-[0_4px_18px_rgba(0,0,0,0.8)] transition group-hover:text-gold-100"
              >
                {digit}
              </span>
            ))}
          </button>
          <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-cream/30">
            {copied ? 'codice copiato' : 'tocca per copiare'}
          </p>

          <div className="mx-auto mt-3 h-px w-28 gold-line" />

          <div className="mt-3 flex flex-col items-center gap-2">
            {view.isHost ? (
              <button
                type="button"
                onClick={onStart}
                disabled={!enoughPlayers}
                className={cn(
                  'group relative flex h-11 w-[min(280px,64vw)] items-center justify-center gap-2 rounded-xl text-[11px] font-bold uppercase tracking-[0.22em] transition',
                  enoughPlayers
                    ? 'bg-gradient-to-b from-gold-200 via-gold-400 to-gold-600 text-[#221607] shadow-[0_16px_36px_-16px_rgba(205,164,95,0.95),inset_0_1px_0_rgba(255,255,255,0.6)] hover:brightness-110 active:translate-y-px'
                    : 'cursor-not-allowed border border-white/10 bg-white/[0.03] text-cream/30',
                )}
              >
                Avvia partita
              </button>
            ) : (
              <div className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 text-[10px] uppercase tracking-[0.18em] text-cream/50">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-300" />
                attesa dell&apos;host
              </div>
            )}

            <div className="flex items-center gap-2 text-[10px] text-cream/40">
              <span className="tabular">
                {view.players.length}/{view.maxPlayers}
              </span>
              <span className="h-3 w-px bg-white/10" />
              <span>{enoughPlayers ? 'pronti al tavolo' : `servono ${view.minPlayers} giocatori`}</span>
            </div>

            {view.isHost && (
              <button
                type="button"
                onClick={onAddBot}
                disabled={view.players.length >= view.maxPlayers}
                className="rounded-lg border border-white/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-cream/40 transition hover:border-gold-400/40 hover:text-gold-200 disabled:opacity-30"
              >
                + aggiungi un bot
              </button>
            )}
          </div>
        </div>
      </div>

      <footer className="relative z-20 flex shrink-0 items-center justify-center gap-2 px-4 pb-3 text-[10px] text-cream/30">
        <span>Condividi il codice: chi lo inserisce prende posto al tavolo</span>
        {status !== 'online' && (
          <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-amber-200">
            riconnessione
          </span>
        )}
      </footer>
    </div>
  )
}

interface LobbySeatProps {
  player: RoomPlayer
  isMe: boolean
  isHost: boolean
  canRemove: boolean
  onRemove: () => void
  style: CSSProperties
}

function LobbySeat({ player, isMe, isHost, canRemove, onRemove, style }: LobbySeatProps) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={style}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.7, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="relative flex w-[clamp(84px,11vw,132px)] flex-col items-center gap-1.5"
      >
        <div className="relative">
          <Avatar emoji={player.avatar} name={player.name} size="lg" active={isMe} dim={!player.connected && !player.isBot} />
          {isHost && (
            <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-gold-300/50 bg-[#0b1a14] text-[10px] shadow">
              👑
            </span>
          )}
          {player.isBot && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-sm bg-sky-400/90 px-1 text-[6px] font-bold uppercase tracking-[0.1em] text-sky-950">
              bot
            </span>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Rimuovi ${player.name}`}
              className="absolute -right-2 top-6 grid h-4 w-4 place-items-center rounded-full border border-white/15 bg-black/70 text-[9px] text-cream/60 transition hover:border-rose-400/50 hover:text-rose-300"
            >
              ×
            </button>
          )}
        </div>
        <div className="max-w-full truncate rounded-md border border-white/8 bg-black/40 px-1.5 py-0.5 text-[10px] text-cream/75">
          {player.name}
          {isMe && <span className="ml-1 text-[7px] uppercase tracking-[0.1em] text-gold-300/80">tu</span>}
        </div>
        <span className="text-[8px] uppercase tracking-[0.16em] text-cream/25">
          {player.isBot ? 'pronto' : player.connected ? 'connesso' : 'offline'}
        </span>
      </motion.div>
    </div>
  )
}
