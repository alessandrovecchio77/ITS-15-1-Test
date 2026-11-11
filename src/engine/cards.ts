/**
 * Flip 7 — deck definition.
 *
 * 94 cards:
 *  - 79 number cards: one 0, then N copies of each value N (1..12)
 *  - 9 action cards: 3 Freeze, 3 Flip Three, 3 Second Chance
 *  - 6 modifier cards: +2, +6, +10, and 3 multipliers (x2)
 */
export type CardType = 'number' | 'freeze' | 'flip3' | 'secondChance' | 'bonus' | 'multiplier'

export interface NumberCard {
  id: string
  type: 'number'
  value: number
}
export interface FreezeCard {
  id: string
  type: 'freeze'
}
export interface FlipThreeCard {
  id: string
  type: 'flip3'
}
export interface SecondChanceCard {
  id: string
  type: 'secondChance'
}
export interface BonusCard {
  id: string
  type: 'bonus'
  value: number
}
export interface MultiplierCard {
  id: string
  type: 'multiplier'
  value: 2
}

export type Card = NumberCard | FreezeCard | FlipThreeCard | SecondChanceCard | BonusCard | MultiplierCard
export type ActionCard = FreezeCard | FlipThreeCard | SecondChanceCard
export type OffensiveCard = FreezeCard | FlipThreeCard

let sequence = 0
const nextId = (prefix: string) => `${prefix}-${++sequence}`

export const DECK_SIZE = 94

export function buildDeck(): Card[] {
  const cards: Card[] = []

  cards.push({ id: nextId('n0'), type: 'number', value: 0 })
  for (let value = 1; value <= 12; value++) {
    for (let copy = 0; copy < value; copy++) {
      cards.push({ id: nextId(`n${value}`), type: 'number', value })
    }
  }

  for (let i = 0; i < 3; i++) cards.push({ id: nextId('freeze'), type: 'freeze' })
  for (let i = 0; i < 3; i++) cards.push({ id: nextId('flip3'), type: 'flip3' })
  for (let i = 0; i < 3; i++) cards.push({ id: nextId('second'), type: 'secondChance' })

  for (const value of [2, 6, 10]) cards.push({ id: nextId(`bonus${value}`), type: 'bonus', value })
  for (let i = 0; i < 3; i++) cards.push({ id: nextId('multiplier'), type: 'multiplier', value: 2 })

  return cards
}

/** Fisher–Yates on a copy, so callers never mutate their input. */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function isNumberCard(card: Card): card is NumberCard {
  return card.type === 'number'
}

export function cardLabel(card: Card): string {
  switch (card.type) {
    case 'number':
      return `${card.value}`
    case 'freeze':
      return 'Freeze'
    case 'flip3':
      return 'Flip Three'
    case 'secondChance':
      return 'Second Chance'
    case 'bonus':
      return `Bonus +${card.value}`
    case 'multiplier':
      return 'Moltiplicatore x2'
  }
}
