import { motion } from 'framer-motion'
import { useState } from 'react'
import type { Card } from '../engine/cards'
import { Avatar } from '../components/Avatar'
import { Brand } from '../components/Brand'
import { CardView } from '../components/CardView'
import { CodeInput } from '../components/CodeInput'
import { AVATARS, loadAvatar, loadName, saveIdentity } from '../lib/identity'
import { cn } from '../lib/labels'
import type { ConnectionStatus } from '../lib/useRoom'

const HERO_CARDS: Card[] = [
  { id: 'hero-freeze', type: 'freeze' },
  { id: 'hero-7', type: 'number', value: 7 },
  { id: 'hero-mult', type: 'multiplier', value: 2 },
]

interface HomeProps {
  status: ConnectionStatus
  onCreate: (name: string, avatar: string) => void
  onJoin: (code: string, name: string, avatar: string) => void
  onRules: () => void
}

export function HomeScreen({ status, onCreate, onJoin, onRules }: HomeProps) {
  const [name, setName] = useState(loadName)
  const [avatar, setAvatar] = useState(loadAvatar)
  const [code, setCode] = useState('')

  const submitName = name.trim() || 'Giocatore'

  const create = () => {
    saveIdentity(submitName, avatar)
    onCreate(submitName, avatar)
  }

  const join = () => {
    if (code.length !== 5) return
    saveIdentity(submitName, avatar)
    onJoin(code, submitName, avatar)
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#04070a]">
      <div className="pointer-events-none absolute -left-[18%] -top-[28%] h-[72vh] w-[72vw] rounded-full bg-[radial-gradient(circle,rgba(16,84,60,0.55),transparent_66%)] blur-[90px]" />
      <div className="pointer-events-none absolute -right-[12%] top-[18%] h-[62vh] w-[58vw] rounded-full bg-[radial-gradient(circle,rgba(150,108,48,0.24),transparent_66%)] blur-[90px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.32] [background-image:linear-gradient(rgba(255,255,255,0.024)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.024)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_at_50%_115%,rgba(4,7,10,1),transparent_62%)]" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col justify-center gap-5 px-4 py-6 sm:gap-8 sm:px-8 sm:py-10">
        <div className="flex items-center justify-between">
          <Brand />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRules}
              className="hidden rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-cream/45 transition hover:border-gold-400/40 hover:text-gold-200 sm:block"
            >
              Regole
            </button>
            <div className="flex items-center gap-2 rounded-full border border-white/8 bg-black/30 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-cream/40">
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  status === 'online'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : status === 'connecting'
                      ? 'animate-pulse bg-amber-300'
                      : 'bg-rose-400',
                )}
              />
              {status === 'online' ? 'tavolo live' : status === 'connecting' ? 'connessione' : 'riconnessione'}
            </div>
          </div>
        </div>

        <div className="relative">
          <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-gold-400/70">
            3–8 giocatori · 200 punti
          </p>
          <h1 className="mt-2 font-display text-[clamp(62px,12vw,138px)] italic leading-[0.8] tracking-[-0.02em]">
            <span className="gold-text drop-shadow-[0_6px_30px_rgba(0,0,0,0.6)]">Flip</span>
            <span className="relative ml-1.5 inline-block font-sans text-[0.78em] font-bold not-italic tracking-[-0.07em] text-cream">
              7
              <span className="absolute -right-2 top-1 h-2 w-2 rounded-full bg-gold-300/80 shadow-[0_0_14px_rgba(239,216,171,0.9)]" />
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-[13.5px] leading-relaxed text-cream/50 sm:text-[15px]">
            Pesca, somma, moltiplica. Fermati prima del doppione: un round può valere 64 punti… o zero.
            Un tavolo, cinque cifre, nessun download.
          </p>

          <div className="pointer-events-none absolute right-0 top-[-14px] hidden items-end gap-1 lg:flex">
            {HERO_CARDS.map((card, index) => (
              <motion.div
                key={card.id}
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 7 + index, repeat: Infinity, ease: 'easeInOut', delay: index * 0.6 }}
                style={{ rotate: `${-14 + index * 13}deg` }}
                className={cn('origin-bottom drop-shadow-[0_24px_40px_rgba(0,0,0,0.7)]', index === 1 ? 'z-10 -translate-y-4' : '')}
              >
                <CardView card={card} size="xl" />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3.5 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.9)] sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex items-center gap-2.5">
              <Avatar emoji={avatar} name={submitName} size="lg" />
              <div className="sm:w-48">
                <label htmlFor="player-name" className="text-[9px] font-semibold uppercase tracking-[0.22em] text-cream/35">
                  Il tuo nome
                </label>
                <input
                  id="player-name"
                  value={name}
                  maxLength={16}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Il tuo nome"
                  className="mt-1 w-full border-0 border-b border-white/15 bg-transparent px-0 py-1 text-[15px] text-cream outline-none transition placeholder:text-cream/25 focus:border-gold-400/70"
                />
              </div>
            </div>

            <div className="h-px bg-white/8 sm:h-10 sm:w-px" />

            <div className="flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-cream/35">Il tuo segnalino</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatar(emoji)}
                    aria-label={`Segnalino ${emoji}`}
                    aria-pressed={avatar === emoji}
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-full border text-[15px] transition',
                      avatar === emoji
                        ? 'scale-105 border-gold-300/80 bg-gold-400/15 shadow-[0_0_16px_-4px_rgba(226,192,134,0.7)]'
                        : 'border-white/10 bg-white/[0.03] opacity-70 hover:border-white/25 hover:opacity-100',
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl border border-gold-400/25 bg-[linear-gradient(160deg,rgba(205,164,95,0.16),rgba(6,15,12,0.55)_55%)] p-4 sm:p-5">
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(239,216,171,0.22),transparent_65%)] blur-xl" />
            <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-gold-300/80">Opzione 01</p>
            <h2 className="mt-1 font-display text-[26px] italic leading-tight text-cream">Crea una stanza</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-cream/50">
              Generazione di un codice a 5 cifre e tre bot che si siedono al tavolo mentre aspetti gli amici.
            </p>
            <button
              type="button"
              onClick={create}
              className="group mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gold-200 via-gold-400 to-gold-600 text-[12px] font-bold uppercase tracking-[0.2em] text-[#221607] shadow-[0_14px_30px_-14px_rgba(205,164,95,0.9),inset_0_1px_0_rgba(255,255,255,0.6)] transition active:translate-y-px hover:brightness-110"
            >
              Crea stanza
              <span className="transition group-hover:translate-x-0.5">→</span>
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.022] p-4 sm:p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-cream/35">Opzione 02</p>
            <h2 className="mt-1 font-display text-[26px] italic leading-tight text-cream">Partecipa</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-cream/50">
              Hai un codice? Inserisci le cinque cifre e prendi posto.
            </p>
            <div className="mt-3">
              <CodeInput value={code} onChange={setCode} onSubmit={join} />
            </div>
            <button
              type="button"
              onClick={join}
              disabled={code.length !== 5}
              className={cn(
                'mt-3 flex h-11 w-full items-center justify-center rounded-xl border text-[11px] font-semibold uppercase tracking-[0.2em] transition',
                code.length === 5
                  ? 'border-emerald-300/40 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15'
                  : 'cursor-not-allowed border-white/8 bg-white/[0.02] text-cream/25',
              )}
            >
              Entra al tavolo
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] uppercase tracking-[0.2em] text-cream/25">
          Round veloci · Second Chance · Flip 7 bonus +15
        </p>
      </div>
    </div>
  )
}
