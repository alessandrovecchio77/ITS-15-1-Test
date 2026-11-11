import type { PlayerStatus } from '../engine/game'

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export const STATUS_META: Record<PlayerStatus, { label: string; tone: string }> = {
  active: { label: 'IN GIOCO', tone: 'border-gold-400/50 bg-gold-500/15 text-gold-200' },
  stayed: { label: 'STAY', tone: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200' },
  frozen: { label: 'CONGELATO', tone: 'border-sky-400/45 bg-sky-500/15 text-sky-200' },
  busted: { label: 'SBALLATO', tone: 'border-rose-400/45 bg-rose-500/15 text-rose-200' },
}

export function numberTier(value: number): string {
  if (value >= 11) return 'linear-gradient(90deg,#b2312f,#e1665f)'
  if (value >= 8) return 'linear-gradient(90deg,#a2622c,#d98a4a)'
  if (value >= 4) return 'linear-gradient(90deg,#8f6a35,#cda45f)'
  return 'linear-gradient(90deg,#2f6f5b,#4fa88a)'
}
