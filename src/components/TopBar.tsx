import { useState, type ReactNode } from 'react'
import { cn } from '../lib/labels'
import type { TurnAlertStatus } from '../lib/useTurnAlerts'
import { Brand } from './Brand'

interface TopBarProps {
  code: string
  round?: number
  target?: number
  deckCount?: number
  onRules?: () => void
  onLeave: () => void
  extra?: ReactNode
  chat?: { unread: number; onOpen: () => void }
  turnAlerts?: { status: TurnAlertStatus; onToggle: () => void }
}

export function TopBar({ code, round, target, deckCount, onRules, onLeave, extra, chat, turnAlerts }: TopBarProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <header className="relative z-30 flex h-12 shrink-0 items-center justify-between gap-2 px-2 sm:h-14 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Brand compact className="hidden sm:flex" />
        <button
          type="button"
          onClick={copy}
          className={cn(
            'group flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/35 px-2 py-1.5 transition hover:border-gold-400/40 hover:bg-black/55',
            copied && 'border-emerald-400/50',
          )}
          title="Copia il codice stanza"
        >
          <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-cream/40">stanza</span>
          <span className="font-mono text-[13px] font-semibold tracking-[0.16em] text-gold-200 sm:text-sm">{code}</span>
          <span className="text-[10px] text-cream/40 group-hover:text-gold-300">
            {copied ? <CheckIcon /> : <CopyIcon />}
          </span>
        </button>
        {extra}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {round !== undefined && (
          <div className="hidden items-center gap-2 rounded-lg border border-white/8 bg-black/25 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-cream/45 sm:flex">
            <span>
              Round <span className="font-semibold text-cream/80">{round}</span>
            </span>
            <span className="h-3 w-px bg-white/10" />
            <span>
              Obiettivo <span className="font-semibold text-gold-300">{target ?? 200}</span>
            </span>
            {deckCount !== undefined && (
              <>
                <span className="h-3 w-px bg-white/10" />
                <span>
                  Mazzo <span className="font-semibold text-cream/80">{deckCount}</span>
                </span>
              </>
            )}
          </div>
        )}
        {turnAlerts && turnAlerts.status !== 'unsupported' && (
          <button
            type="button"
            onClick={turnAlerts.onToggle}
            aria-label={
              turnAlerts.status === 'on'
                ? 'Disattiva gli avvisi di turno'
                : turnAlerts.status === 'blocked'
                  ? 'Notifiche bloccate dal browser'
                  : 'Attiva gli avvisi di turno'
            }
            title={
              turnAlerts.status === 'on'
                ? 'Avvisi di turno attivi: notifica e vibrazione quando la finestra non è attiva'
                : turnAlerts.status === 'blocked'
                  ? 'Notifiche bloccate dal browser: il titolo della scheda segnala comunque il tuo turno'
                  : 'Attiva notifica e vibrazione quando è il tuo turno e la finestra non è attiva'
            }
            className={cn(
              'relative grid h-8 w-8 place-items-center rounded-lg border bg-black/30 transition',
              turnAlerts.status === 'on'
                ? 'border-gold-400/40 text-gold-200'
                : 'border-white/10 text-cream/50 hover:border-gold-400/40 hover:text-gold-200',
              turnAlerts.status === 'blocked' && 'opacity-50',
            )}
          >
            <BellIcon />
            {turnAlerts.status === 'on' && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-gold-300 shadow-[0_0_6px_rgba(239,216,171,0.9)]" />
            )}
          </button>
        )}
        {chat && (
          <button
            type="button"
            onClick={chat.onOpen}
            aria-label={`Chat del tavolo${chat.unread ? `, ${chat.unread} nuovi` : ''}`}
            className="relative grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/30 text-cream/60 transition hover:border-gold-400/40 hover:text-gold-200"
          >
            <ChatIcon />
            {chat.unread > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full border border-[#221607]/30 bg-gold-300 px-1 text-[8px] font-bold leading-none text-[#221607]">
                {chat.unread > 9 ? '9+' : chat.unread}
              </span>
            )}
          </button>
        )}
        {onRules && (
          <button
            type="button"
            onClick={onRules}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/30 text-cream/60 transition hover:border-gold-400/40 hover:text-gold-200"
            title="Regole"
          >
            <HelpIcon />
          </button>
        )}
        <button
          type="button"
          onClick={onLeave}
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/30 text-cream/60 transition hover:border-rose-400/40 hover:text-rose-300"
          title="Esci dalla stanza"
        >
          <ExitIcon />
        </button>
      </div>
    </header>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6a2 2 0 0 0-2 2v9" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3.5 w-3.5">
      <path d="m4 12.5 5 5L20 6.5" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.2a2.6 2.6 0 1 1 3.6 2.4c-.8.4-1.2 1-1.2 1.9" />
      <path d="M12 17.2h.01" strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z" />
      <path d="M10.3 19a2 2 0 0 0 3.4 0" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5H8L4 23v-4.4A8.5 8.5 0 0 1 12.5 3.5H13A8 8 0 0 1 21 12Z" />
      <path d="M8.5 12h.01M12.5 12h.01M16.5 12h.01" strokeWidth={2.4} />
    </svg>
  )
}

function ExitIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-4 w-4">
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 8 6 12l4 4M6 12h10" />
    </svg>
  )
}
