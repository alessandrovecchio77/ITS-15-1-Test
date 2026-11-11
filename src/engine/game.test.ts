import { describe, expect, it } from 'vitest'
import { buildDeck, type Card } from './cards'
import { Flip7Game, TARGET_SCORE, scoreHand, type SeatInput } from './game'
import { decideBot } from './bots'

function seats(count: number): SeatInput[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    name: `Player ${index}`,
    avatar: '🦊',
    isBot: true,
  }))
}

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const num = (id: string, value: number): Card => ({ id, type: 'number', value })
const freeze = (id: string): Card => ({ id, type: 'freeze' })
const flip3 = (id: string): Card => ({ id, type: 'flip3' })
const secondChance = (id: string): Card => ({ id, type: 'secondChance' })
const bonus = (id: string, value: number): Card => ({ id, type: 'bonus', value })
const multiplier = (id: string): Card => ({ id, type: 'multiplier', value: 2 })

describe('deck', () => {
  it('has the 94 cards from the rulebook', () => {
    const deck = buildDeck()
    expect(deck).toHaveLength(94)

    const numbers = deck.filter((card) => card.type === 'number')
    expect(numbers).toHaveLength(79)
    for (let value = 1; value <= 12; value++) {
      expect(numbers.filter((card) => card.type === 'number' && card.value === value)).toHaveLength(value)
    }
    expect(numbers.filter((card) => card.type === 'number' && card.value === 0)).toHaveLength(1)

    expect(deck.filter((card) => card.type === 'freeze')).toHaveLength(3)
    expect(deck.filter((card) => card.type === 'flip3')).toHaveLength(3)
    expect(deck.filter((card) => card.type === 'secondChance')).toHaveLength(3)
    expect(deck.filter((card) => card.type === 'bonus').map((card) => (card as { value: number }).value)).toEqual([2, 6, 10])
    expect(deck.filter((card) => card.type === 'multiplier')).toHaveLength(3)
  })
})

describe('scoring', () => {
  it('matches the rulebook example: 26 + 6, doubled = 64', () => {
    const hand = [num('a', 2), num('b', 5), num('c', 8), num('d', 11), bonus('e', 6), multiplier('f')]
    const result = scoreHand(hand, false, false)
    expect(result.numbersTotal).toBe(26)
    expect(result.bonuses).toBe(6)
    expect(result.base).toBe(32)
    expect(result.multiplied).toBe(64)
    expect(result.total).toBe(64)
  })

  it('adds the Flip 7 bonus after the multiplier', () => {
    const hand = [num('a', 1), num('b', 2), num('c', 3), num('d', 4), num('e', 5), num('f', 6), num('g', 7), multiplier('h')]
    const result = scoreHand(hand, true, false)
    expect(result.multiplied).toBe(56)
    expect(result.flip7Bonus).toBe(15)
    expect(result.total).toBe(71)
  })

  it('gives a busted player nothing', () => {
    const hand = [num('a', 11), bonus('b', 10), multiplier('c')]
    expect(scoreHand(hand, true, true).total).toBe(0)
  })
})

describe('turn resolution', () => {
  it('saves a player with Second Chance, then busts them on the next duplicate', () => {
    const game = new Flip7Game(seats(3), mulberry32(1))
    const player = game.currentPlayer!
    player.hand = [num('seven', 7), secondChance('shield')]

    game.deck = [num('dup-a', 7)]
    expect(game.hit(player.id)).toBe(true)
    expect(player.status).toBe('active')
    expect(player.hand.some((card) => card.type === 'secondChance')).toBe(false)
    expect(player.hand.filter((card) => card.type === 'number')).toHaveLength(1)

    game.turnIndex = game.players.indexOf(player)
    game.deck = [num('dup-b', 7)]
    expect(game.hit(player.id)).toBe(true)
    expect(player.status).toBe('busted')
    expect(player.bustedCard?.value).toBe(7)
  })

  it('freezes the chosen opponent and skips their turn', () => {
    const game = new Flip7Game(seats(3), mulberry32(2))
    const actor = game.currentPlayer!
    const target = game.players[(game.players.indexOf(actor) + 1) % 3]

    game.deck = [freeze('ice')]
    game.hit(actor.id)
    expect(game.pending?.card.type).toBe('freeze')
    expect(game.pending?.validTargets).toContain(target.id)

    expect(game.chooseTarget(actor.id, target.id)).toBe(true)
    expect(target.status).toBe('frozen')
    expect(game.pending).toBeNull()
    expect(game.currentPlayerId).not.toBe(target.id)
  })

  it('resolves Flip Three as three immediate draws', () => {
    const game = new Flip7Game(seats(3), mulberry32(3))
    const actor = game.currentPlayer!
    const target = game.players[(game.players.indexOf(actor) + 1) % 3]
    target.hand = [num('two', 2)]

    // Cards pop off the end of the deck: flip3 for the actor, then 5, then a duplicate 2.
    game.deck = [num('unused', 3), num('dup', 2), num('five', 5), flip3('triple')]
    game.hit(actor.id)
    expect(game.pending?.card.type).toBe('flip3')
    game.chooseTarget(actor.id, target.id)

    expect(target.status).toBe('busted')
    expect(target.hand.map((card) => (card.type === 'number' ? card.value : card.type))).toContain(5)
    expect(game.deck).toHaveLength(1)
  })

  it('keeps the last active player on turn until they act again', () => {
    const game = new Flip7Game(seats(3), mulberry32(11))
    const player = game.currentPlayer!
    game.players.filter((other) => other.id !== player.id).forEach((other) => (other.status = 'stayed'))
    game.deck = [num('one', 4), num('two', 5)]

    expect(game.hit(player.id)).toBe(true)
    // Nobody else is active, so the seat stays the same and the round goes on.
    expect(game.currentPlayerId).toBe(player.id)
    expect(game.phase).toBe('playing')
    expect(game.hit(player.id)).toBe(true)
    expect(game.phase).toBe('playing')
  })

  it('awards the Flip 7 bonus in the round summary', () => {
    const game = new Flip7Game(seats(3), mulberry32(4))
    const player = game.currentPlayer!
    player.hand = [1, 2, 3, 4, 5, 6].map((value) => num(`n${value}`, value))
    game.players.filter((other) => other.id !== player.id).forEach((other) => (other.status = 'stayed'))

    game.deck = [num('seven', 7)]
    game.hit(player.id)
    expect(player.flip7).toBe(true)

    game.stay(player.id)
    const row = game.lastSummary?.rows.find((entry) => entry.playerId === player.id)
    expect(row?.breakdown.numbersTotal).toBe(28)
    expect(row?.breakdown.flip7Bonus).toBe(15)
    expect(row?.roundDelta).toBe(43)
  })
})

describe('full games', () => {
  for (const count of [3, 5, 8]) {
    it(`plays a ${count}-player game to a winner without breaking invariants`, () => {
      const game = new Flip7Game(seats(count), mulberry32(100 + count))
      let steps = 0

      while (game.phase !== 'gameOver' && steps < 40_000) {
        steps++
        if (game.phase === 'roundEnd') {
          expect(game.nextRound()).toBe(true)
          continue
        }

        const actorId = game.currentPlayerId
        expect(actorId).toBeTruthy()
        const decision = decideBot(game, actorId!)

        if (decision.kind === 'target') {
          expect(game.chooseTarget(actorId!, decision.targetId)).toBe(true)
        } else if (decision.kind === 'hit') {
          expect(game.hit(actorId!)).toBe(true)
        } else if (decision.kind === 'stay') {
          expect(game.stay(actorId!)).toBe(true)
        } else if (game.pending) {
          expect(game.chooseTarget(actorId!, game.pending.validTargets[0])).toBe(true)
        } else {
          expect(game.stay(actorId!)).toBe(true)
        }

        for (const player of game.players) {
          const values = player.hand.filter((card) => card.type === 'number').map((card) => (card as { value: number }).value)
          expect(new Set(values).size).toBe(values.length)
          expect(values.length).toBeLessThanOrEqual(7)
        }
        const cardsInPlay =
          game.deck.length + game.discard.length + game.players.reduce((sum, player) => sum + player.hand.length, 0)
        expect(cardsInPlay).toBe(94)
      }

      expect(steps).toBeLessThan(40_000)
      expect(game.phase).toBe('gameOver')
      expect(game.winnerId).toBeTruthy()
      expect(game.players.every((player) => player.total >= 0)).toBe(true)
      expect(Math.max(...game.players.map((player) => player.total))).toBeGreaterThanOrEqual(TARGET_SCORE)
      expect(game.players.find((player) => player.id === game.winnerId)?.total).toBe(
        Math.max(...game.players.map((player) => player.total)),
      )
      expect(game.lastSummary?.rows).toHaveLength(count)
    })
  }

  it('never banks points for a busted round', () => {
    const game = new Flip7Game(seats(4), mulberry32(9))
    const busted = game.currentPlayer!
    busted.hand = [num('x', 9)]
    game.deck = [num('dup', 9)]
    game.hit(busted.id)
    expect(busted.status).toBe('busted')

    // Finish the round by having everyone else stay.
    let guard = 0
    while (game.phase === 'playing' && guard++ < 50) {
      const actorId = game.currentPlayerId
      if (!actorId) break
      game.stay(actorId)
    }
    const row = game.lastSummary?.rows.find((entry) => entry.playerId === busted.id)
    expect(row?.roundDelta).toBe(0)
    expect(busted.total).toBe(0)
  })
})
