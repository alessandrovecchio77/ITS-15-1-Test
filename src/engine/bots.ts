import { FLIP7_UNIQUE_NUMBERS, scoreHand, type Flip7Game } from './game'

export type BotDecision =
  | { kind: 'hit' }
  | { kind: 'stay' }
  | { kind: 'target'; targetId: string }
  | { kind: 'none' }

/**
 * A small but sensible push-your-luck heuristic: estimate how likely the next
 * number card is a duplicate, then compare that risk with what the player
 * already has banked in the round.
 */
export function decideBot(game: Flip7Game, playerId: string): BotDecision {
  if (game.phase !== 'playing') return { kind: 'none' }
  const player = game.player(playerId)
  if (!player || player.status !== 'active') return { kind: 'none' }

  if (game.pending && game.pending.playerId === playerId) {
    const targets = game.players.filter(
      (other) => other.status === 'active' && other.id !== playerId,
    )
    if (!targets.length) return { kind: 'none' }
    const ranked = targets
      .map((target) => ({
        target,
        threat:
          scoreHand(target.hand, target.flip7, false).total +
          target.hand.filter((card) => card.type === 'number').length * 3,
      }))
      .sort((a, b) => b.threat - a.threat)
    return { kind: 'target', targetId: ranked[0].target.id }
  }

  if (game.currentPlayerId !== playerId) return { kind: 'none' }

  const { risk, deckCount } = game.duplicateRisk(playerId)
  const potential = scoreHand(player.hand, player.flip7, false).total
  const numbers = player.hand.filter((card) => card.type === 'number').length

  if (deckCount === 0) return { kind: 'stay' }
  if (player.total + potential >= 200) return { kind: 'stay' }
  if (risk === 0) return { kind: 'hit' }

  let threshold: number
  if (player.flip7) threshold = 0.06
  else if (potential >= 48) threshold = 0.1
  else if (potential >= 30) threshold = 0.17
  else if (potential >= 16) threshold = 0.26
  else if (potential >= 6) threshold = 0.34
  else threshold = 0.5

  if (numbers >= FLIP7_UNIQUE_NUMBERS - 1) threshold -= 0.04

  return risk <= threshold ? { kind: 'hit' } : { kind: 'stay' }
}
