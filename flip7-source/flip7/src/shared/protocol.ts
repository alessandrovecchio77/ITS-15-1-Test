import type { GamePlayer, PublicState } from '../engine/game'

export type ClientMessage =
  | { type: 'hello'; token?: string }
  | { type: 'create'; name: string; avatar: string }
  | { type: 'join'; code: string; name: string; avatar: string }
  | { type: 'start' }
  | { type: 'addBot' }
  | { type: 'removeBot'; playerId: string }
  | { type: 'hit' }
  | { type: 'stay' }
  | { type: 'target'; targetId: string }
  | { type: 'chat'; text: string }
  | { type: 'reaction'; emoji: string }
  | { type: 'nextRound' }
  | { type: 'rematch' }
  | { type: 'leave' }

export interface RoomPlayer extends GamePlayer {
  connected: boolean
}

export interface ChatMessage {
  id: number
  playerId: string
  name: string
  avatar: string
  kind: 'chat' | 'reaction'
  text: string
  at: number
}

export interface RoomView extends Omit<PublicState, 'players'> {
  players: RoomPlayer[]
  code: string
  hostId: string
  you: string
  isHost: boolean
  turnEndsAt: number | null
  nextRoundAt: number | null
  minPlayers: number
  maxPlayers: number
  chat: ChatMessage[]
}

export type ServerMessage =
  | { type: 'view'; view: RoomView; token?: string }
  | { type: 'error'; message: string }
  | { type: 'left' }
