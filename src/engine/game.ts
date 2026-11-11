import {
  buildDeck,
  shuffle,
  type Card,
  type NumberCard,
  type OffensiveCard,
} from './cards'

export const TARGET_SCORE = 200
export const FLIP7_BONUS = 15
export const FLIP7_UNIQUE_NUMBERS = 7
export const MIN_PLAYERS = 3
export const MAX_PLAYERS = 8

export type Phase = 'lobby' | 'playing' | 'roundEnd' | 'gameOver'
export type PlayerStatus = 'active' | 'stayed' | 'busted' | 'frozen'

export interface SeatInput {
  id: string
  name: string
  avatar: string
  isBot: boolean
}

export interface ScoreBreakdown {
  numbers: number[]
  numbersTotal: number
  bonusValues: number[]
  bonuses: number
  multipliers: number
  base: number
  multiplied: number
  flip7Bonus: number
  total: number
  busted: boolean
}

export interface GamePlayer extends SeatInput {
  hand: Card[]
  total: number
  status: PlayerStatus
  flip7: boolean
  roundScore: number | null
  breakdown: ScoreBreakdown | null
  bustedCard: NumberCard | null
}

export interface RoundSummaryRow {
  playerId: string
  name: string
  status: PlayerStatus
  breakdown: ScoreBreakdown
  total: number
  roundDelta: number
}

export interface RoundSummary {
  round: number
  rows: RoundSummaryRow[]
  winnerIds: string[]
}

export type GameEvent =
  | { id: number; type: 'roundStart'; round: number }
  | { id: number; type: 'turn'; playerId: string }
  | { id: number; type: 'draw'; playerId: string; card: Card }
  | { id: number; type: 'secondChance'; playerId: string; card: Card; saved: NumberCard }
  | { id: number; type: 'bust'; playerId: string; card: NumberCard }
  | { id: number; type: 'flip7'; playerId: string }
  | { id: number; type: 'stay'; playerId: string }
  | { id: number; type: 'targeted'; playerId: string; targetId: string; card: OffensiveCard }
  | { id: number; type: 'fizzle'; playerId: string; card: Card }
  | { id: number; type: 'roundEnd'; round: number }
  | { id: number; type: 'gameOver'; winnerId: string }

export type GameEventInput = GameEvent extends infer E
  ? E extends { id: number }
    ? Omit<E, 'id'>
    : never
  : never

export interface PendingAction {
  playerId: string
  card: OffensiveCard
  validTargets: string[]
}

export interface PublicState {
  phase: Phase
  round: number
  players: GamePlayer[]
  currentPlayerId: string | null
  pending: PendingAction | null
  deckCount: number
  discardTop: Card | null
  discardCount: number
  events: GameEvent[]
  lastSummary: RoundSummary | null
  winnerId: string | null
  targetScore: number
}

/**
 * Scores a hand. Busted players keep nothing.
 * Base = unique number cards + bonus cards, then multipliers double it
 * once per multiplier card, then the Flip 7 bonus is added.
 */
export function scoreHand(hand: readonly Card[], flip7: boolean, busted: boolean): ScoreBreakdown {
  const numbers = hand
    .filter((card): card is NumberCard => card.type === 'number')
    .map((card) => card.value)
    .sort((a, b) => a - b)
  const bonusValues = hand.filter((card) => card.type === 'bonus').map((card) => card.value)
  const multipliers = hand.filter((card) => card.type === 'multiplier').length

  const numbersTotal = numbers.reduce((sum, value) => sum + value, 0)
  const bonuses = bonusValues.reduce((sum, value) => sum + value, 0)
  const base = numbersTotal + bonuses
  const multiplied = busted ? 0 : base * 2 ** multipliers
  const flip7Bonus = !busted && flip7 ? FLIP7_BONUS : 0

  return {
    numbers,
    numbersTotal,
    bonusValues,
    bonuses,
    multipliers,
    base,
    multiplied,
    flip7Bonus,
    total: busted ? 0 : multiplied + flip7Bonus,
    busted,
  }
}

export class Flip7Game {
  readonly players: GamePlayer[]
  phase: Phase = 'playing'
  round = 0
  deck: Card[] = []
  discard: Card[] = []
  turnIndex = 0
  pending: { playerId: string; card: OffensiveCard; validTargets: string[] } | null = null
  events: GameEvent[] = []
  lastSummary: RoundSummary | null = null
  winnerId: string | null = null
  starterIndex = 0

  private eventId = 0
  private rng: () => number

  constructor(seats: readonly SeatInput[], rng: () => number = Math.random) {
    if (seats.length < MIN_PLAYERS || seats.length > MAX_PLAYERS) {
      throw new Error(`Flip 7 needs between ${MIN_PLAYERS} and ${MAX_PLAYERS} players`)
    }
    this.rng = rng
    this.players = seats.map((seat) => ({
      ...seat,
      hand: [],
      total: 0,
      status: 'active',
      flip7: false,
      roundScore: null,
      breakdown: null,
      bustedCard: null,
    }))
    this.startRound()
  }

  get currentPlayerId(): string | null {
    return this.players[this.turnIndex]?.id ?? null
  }

  get currentPlayer(): GamePlayer | null {
    return this.players[this.turnIndex] ?? null
  }

  player(id: string): GamePlayer | undefined {
    return this.players.find((candidate) => candidate.id === id)
  }

  activePlayers(): GamePlayer[] {
    return this.players.filter((candidate) => candidate.status === 'active')
  }

  duplicateRisk(playerId: string): { duplicates: number; deckCount: number; risk: number } {
    const player = this.player(playerId)
    if (!player) return { duplicates: 0, deckCount: this.deck.length, risk: 0 }
    const held = new Set(
      player.hand.filter((card): card is NumberCard => card.type === 'number').map((card) => card.value),
    )
    const duplicates = this.deck.filter(
      (card): card is NumberCard => card.type === 'number' && held.has(card.value),
    ).length
    return {
      duplicates,
      deckCount: this.deck.length,
      risk: this.deck.length ? duplicates / this.deck.length : 0,
    }
  }

  private emit(event: GameEventInput) {
    this.events.push({ ...event, id: ++this.eventId } as GameEvent)
    if (this.events.length > 80) this.events.splice(0, this.events.length - 80)
  }

  private drawCard(): Card | null {
    return this.deck.pop() ?? null
  }

  private dealInitial(): Card | null {
    // An offensive action card dealt as the opening card has no target yet,
    // so it is discarded and replaced (Second Chance and modifiers are kept).
    for (;;) {
      const card = this.drawCard()
      if (!card) return null
      if (card.type === 'freeze' || card.type === 'flip3') {
        this.discard.push(card)
        continue
      }
      return card
    }
  }

  startRound() {
    this.round += 1
    this.phase = 'playing'
    this.deck = shuffle(buildDeck(), this.rng)
    this.discard = []
    this.pending = null
    this.lastSummary = null

    for (const player of this.players) {
      player.hand = []
      player.status = 'active'
      player.flip7 = false
      player.roundScore = null
      player.breakdown = null
      player.bustedCard = null
    }

    this.turnIndex = this.starterIndex % this.players.length
    this.emit({ type: 'roundStart', round: this.round })

    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[(this.turnIndex + i) % this.players.length]
      const card = this.dealInitial()
      if (card) {
        player.hand.push(card)
        this.emit({ type: 'draw', playerId: player.id, card })
      }
    }

    this.emit({ type: 'turn', playerId: this.currentPlayerId ?? this.players[0].id })
  }

  private resolveDraw(player: GamePlayer, card: Card, forced: boolean) {
    this.emit({ type: 'draw', playerId: player.id, card })

    switch (card.type) {
      case 'number': {
        const duplicate = player.hand.some(
          (held) => held.type === 'number' && held.value === card.value,
        )
        if (duplicate) {
          const shield = player.hand.find((held) => held.type === 'secondChance')
          if (shield) {
            player.hand = player.hand.filter((held) => held.id !== shield.id)
            this.discard.push(shield, card)
            this.emit({ type: 'secondChance', playerId: player.id, card: shield, saved: card })
          } else {
            player.status = 'busted'
            player.bustedCard = card
            this.discard.push(card)
            this.emit({ type: 'bust', playerId: player.id, card })
          }
        } else {
          player.hand.push(card)
          const uniqueNumbers = player.hand.filter((held) => held.type === 'number').length
          if (!player.flip7 && uniqueNumbers >= FLIP7_UNIQUE_NUMBERS) {
            player.flip7 = true
            this.emit({ type: 'flip7', playerId: player.id })
          }
        }
        break
      }
      case 'bonus':
      case 'multiplier':
        player.hand.push(card)
        break
      case 'secondChance':
        if (player.hand.some((held) => held.type === 'secondChance')) {
          this.discard.push(card)
        } else {
          player.hand.push(card)
        }
        break
      case 'freeze':
      case 'flip3': {
        if (forced) {
          this.discard.push(card)
          this.emit({ type: 'fizzle', playerId: player.id, card })
          break
        }
        const targets = this.players.filter(
          (other) => other.id !== player.id && other.status === 'active',
        )
        if (!targets.length) {
          this.discard.push(card)
          this.emit({ type: 'fizzle', playerId: player.id, card })
          break
        }
        // The card is already played, so it goes to the discard pile while the
        // actor picks a victim. Every one of the 94 cards stays accounted for.
        this.discard.push(card)
        this.pending = { playerId: player.id, card, validTargets: targets.map((other) => other.id) }
        break
      }
    }
  }

  private advanceTurn() {
    if (this.phase !== 'playing') return
    if (this.players.every((player) => player.status !== 'active')) {
      this.finishRound()
      return
    }
    for (let step = 1; step <= this.players.length; step++) {
      const index = (this.turnIndex + step) % this.players.length
      if (this.players[index].status === 'active') {
        this.turnIndex = index
        this.emit({ type: 'turn', playerId: this.players[index].id })
        return
      }
    }
    this.finishRound()
  }

  hit(playerId: string): boolean {
    if (this.phase !== 'playing' || this.pending) return false
    const player = this.player(playerId)
    if (!player || player.status !== 'active' || this.currentPlayerId !== playerId) return false

    const card = this.drawCard()
    if (!card) {
      this.finishRound()
      return true
    }
    this.resolveDraw(player, card, false)
    if (!this.pending) this.advanceTurn()
    return true
  }

  stay(playerId: string): boolean {
    if (this.phase !== 'playing' || this.pending) return false
    const player = this.player(playerId)
    if (!player || player.status !== 'active' || this.currentPlayerId !== playerId) return false

    player.status = 'stayed'
    this.emit({ type: 'stay', playerId })
    this.advanceTurn()
    return true
  }

  chooseTarget(playerId: string, targetId: string): boolean {
    if (this.phase !== 'playing' || !this.pending || this.pending.playerId !== playerId) return false
    const actor = this.player(playerId)
    const target = this.player(targetId)
    if (!actor || !target || target.id === actor.id || target.status !== 'active') return false

    const card = this.pending.card
    this.pending = null

    if (card.type === 'freeze') {
      target.status = 'frozen'
      this.emit({ type: 'targeted', playerId: actor.id, targetId: target.id, card })
    } else {
      this.emit({ type: 'targeted', playerId: actor.id, targetId: target.id, card })
      for (let draw = 0; draw < 3; draw++) {
        if (target.status !== 'active') break
        const forcedCard = this.drawCard()
        if (!forcedCard) break
        this.resolveDraw(target, forcedCard, true)
      }
    }

    this.advanceTurn()
    return true
  }

  private finishRound() {
    if (this.phase !== 'playing') return
    this.phase = 'roundEnd'
    this.pending = null

    const rows: RoundSummaryRow[] = this.players.map((player) => {
      const busted = player.status === 'busted'
      const breakdown = scoreHand(player.hand, player.flip7, busted)
      player.breakdown = breakdown
      player.roundScore = breakdown.total
      player.total += breakdown.total
      return {
        playerId: player.id,
        name: player.name,
        status: player.status,
        breakdown,
        total: player.total,
        roundDelta: breakdown.total,
      }
    })

    const winnerIds = this.players.filter((player) => player.total >= TARGET_SCORE).map((p) => p.id)
    this.lastSummary = { round: this.round, rows, winnerIds }
    this.emit({ type: 'roundEnd', round: this.round })

    if (winnerIds.length) {
      const best = Math.max(...winnerIds.map((id) => this.player(id)!.total))
      const winners = winnerIds.filter((id) => this.player(id)!.total === best)
      this.winnerId = winners[0]
      this.phase = 'gameOver'
      this.emit({ type: 'gameOver', winnerId: this.winnerId })
    }
  }

  nextRound(): boolean {
    if (this.phase !== 'roundEnd') return false
    this.starterIndex = (this.starterIndex + 1) % this.players.length
    this.startRound()
    return true
  }

  view(): PublicState {
    return {
      phase: this.phase,
      round: this.round,
      players: this.players.map((player) => ({
        ...player,
        hand: [...player.hand],
        breakdown: player.breakdown ? { ...player.breakdown } : null,
      })),
      currentPlayerId: this.phase === 'playing' ? this.currentPlayerId : null,
      pending: this.pending
        ? {
            playerId: this.pending.playerId,
            card: this.pending.card,
            validTargets: [...this.pending.validTargets],
          }
        : null,
      deckCount: this.deck.length,
      discardTop: this.discard.length ? this.discard[this.discard.length - 1] : null,
      discardCount: this.discard.length,
      events: [...this.events],
      lastSummary: this.lastSummary
        ? {
            ...this.lastSummary,
            rows: this.lastSummary.rows.map((row) => ({ ...row, breakdown: { ...row.breakdown } })),
          }
        : null,
      winnerId: this.winnerId,
      targetScore: TARGET_SCORE,
    }
  }
}
