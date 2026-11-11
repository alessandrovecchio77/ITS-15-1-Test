import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { RoomView } from '../shared/protocol'
import { Avatar } from './Avatar'

const QUICK_MESSAGES = ['Vai così!', 'Che pesca 😂', 'Mi fermo qui', 'Ancora una!', 'GG', 'Freeze!']
const QUICK_REACTIONS = ['🔥', '😂', '😱', '👏', '🍀', '💀', '🃏', '👑']

interface ChatPanelProps {
  view: RoomView
  onClose: () => void
  onSend: (text: string) => void
  onReact: (emoji: string) => void
}

export function ChatPanel({ view, onClose, onSend, onReact }: ChatPanelProps) {
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [view.chat.length])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const send = (text: string) => {
    const value = text.trim()
    if (!value) return
    onSend(value)
    setDraft('')
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <motion.aside
        role="dialog"
        aria-label="Chat del tavolo"
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="fixed right-2 top-14 z-50 flex max-h-[min(74dvh,540px)] w-[min(340px,calc(100vw-16px))] flex-col overflow-hidden rounded-2xl border border-white/12 bg-[linear-gradient(172deg,#0a1b15,#050c09_72%)] shadow-[0_40px_90px_-30px_rgba(0,0,0,1)]"
      >
        <header className="flex items-center justify-between border-b border-white/8 px-3 py-2">
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-[0.24em] text-gold-400/70">tavolo</p>
            <h2 className="font-display text-lg italic leading-none text-cream">Chat rapida</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi chat"
            className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-[13px] text-cream/55 transition hover:border-gold-400/40 hover:text-gold-200"
          >
            ✕
          </button>
        </header>

        <div ref={listRef} className="hide-scrollbar min-h-[104px] flex-1 space-y-2 overflow-y-auto px-3 py-2.5">
          {view.chat.length ? (
            view.chat.map((message) => (
              <div key={message.id} className="flex items-start gap-2">
                <Avatar emoji={message.avatar} name={message.name} size="xs" />
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.12em] text-cream/40">
                    {message.playerId === view.you ? 'tu' : message.name}
                  </p>
                  {message.kind === 'reaction' ? (
                    <p className="mt-0.5 text-[24px] leading-none">{message.text}</p>
                  ) : (
                    <p className="mt-0.5 break-words text-[12.5px] leading-snug text-cream/85">{message.text}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-[11px] leading-relaxed text-cream/30">
              Nessun messaggio.
              <br />
              Rompi il ghiaccio con una frase rapida.
            </p>
          )}
        </div>

        <div className="border-t border-white/8 px-2.5 pb-2.5 pt-2">
          <div className="mb-1.5 flex flex-wrap gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                aria-label={`Reazione ${emoji}`}
                className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-[15px] transition hover:border-gold-400/40 hover:bg-white/[0.07]"
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="mb-1.5 flex flex-wrap gap-1">
            {QUICK_MESSAGES.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => send(text)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-[3px] text-[9.5px] text-cream/65 transition hover:border-gold-400/40 hover:text-gold-200"
              >
                {text}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              value={draft}
              maxLength={80}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') send(draft)
              }}
              placeholder="Scrivi un messaggio…"
              aria-label="Messaggio"
              className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2.5 text-[12px] text-cream outline-none transition placeholder:text-cream/25 focus:border-gold-400/50"
            />
            <button
              type="button"
              onClick={() => send(draft)}
              disabled={!draft.trim()}
              className="h-9 shrink-0 rounded-lg bg-gradient-to-b from-gold-200 via-gold-400 to-gold-600 px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#221607] transition disabled:opacity-30"
            >
              Invia
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  )
}
