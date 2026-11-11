import { randomUUID } from 'node:crypto'
import { WebSocket } from 'ws'
import { decideBot } from '../engine/bots'
import {
  Flip7Game,
  MAX_PLAYERS,
  MIN_PLAYERS,
  TARGET_SCORE,
  type GamePlayer,
  type PublicState,
  type SeatInput,
} from '../engine/game'
import type { ChatMessage, ClientMessage, RoomPlayer, RoomView, ServerMessage } from '../shared/protocol'

const TURN_MS = 30_000
const NEXT_ROUND_MS = 9_000
const ROOM_TTL = 45 * 60_000
const NO_HUMAN_TTL = 10 * 60_000

const CHAT_LIMIT = 40
const MAX_CHAT_LENGTH = 80
const CHAT_COOLDOWN_MS = 650
const REACTION_COOLDOWN_MS = 400
const REACTIONS = new Set(['🔥', '😂', '😱', '👏', '🍀', '💀', '🃏', '👑'])

const BOT_NAMES = ['Nova', 'Vega', 'Orion', 'Lumen', 'Kai', 'Wren']
const BOT_AVATARS = ['🦊', '🐙', '🦉', '🐺', '🐯', '🦅']

interface Member {
  id: string
  name: string
  avatar: string
  isBot: boolean
  token: string
  connected: boolean
  socket?: WebSocket
  lastChatAt?: number
  lastReactionAt?: number
}

interface Conn {
  ws: WebSocket
  roomCode?: string
  memberId?: string
}

interface Room {
  code: string
  hostId: string
  members: Member[]
  game: Flip7Game | null
  createdAt: number
  lastActivity: number
  lastHumanAt: number
  turnEndsAt: number | null
  nextRoundAt: number | null
  turnTimer: ReturnType<typeof setTimeout> | null
  nextRoundTimer: ReturnType<typeof setTimeout> | null
  joinTimers: ReturnType<typeof setTimeout>[]
  chat: ChatMessage[]
  chatSeq: number
}

function cleanName(input: unknown): string {
  const raw = typeof input === 'string' ? input : ''
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, 16)
  return name || 'Giocatore'
}

function cleanAvatar(input: unknown): string {
  const raw = typeof input === 'string' ? input.trim() : ''
  return [...raw].slice(0, 2).join('') || '🦊'
}

function cleanChat(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHAT_LENGTH)
}

export class RoomManager {
  private rooms = new Map<string, Room>()
  private conns = new Map<WebSocket, Conn>()
  private sweeper: ReturnType<typeof setInterval>

  constructor() {
    this.sweeper = setInterval(() => this.sweep(), 60_000)
    this.sweeper.unref?.()
  }

  dispose() {
    clearInterval(this.sweeper)
    for (const room of this.rooms.values()) this.clearTimers(room)
    this.rooms.clear()
  }

  get roomCount(): number {
    return this.rooms.size
  }

  attach(ws: WebSocket) {
    const conn: Conn = { ws }
    this.conns.set(ws, conn)
    ws.on('message', (raw) => {
      let message: ClientMessage
      try {
        message = JSON.parse(String(raw)) as ClientMessage
      } catch {
        return
      }
      try {
        this.handle(conn, message)
      } catch (error) {
        console.error('[flip7] message failed', error)
        this.send(ws, { type: 'error', message: 'Qualcosa è andato storto, riprova.' })
      }
    })
    ws.on('close', () => this.detach(conn, false))
    ws.on('error', () => this.detach(conn, false))
  }

  private handle(conn: Conn, message: ClientMessage) {
    switch (message.type) {
      case 'hello':
        if (message.token) this.resume(conn, message.token)
        return
      case 'create':
        this.createRoom(conn, cleanName(message.name), cleanAvatar(message.avatar))
        return
      case 'join':
        this.joinRoom(conn, message.code, cleanName(message.name), cleanAvatar(message.avatar))
        return
      default:
        break
    }

    const room = conn.roomCode ? this.rooms.get(conn.roomCode) : undefined
    const member = room?.members.find((candidate) => candidate.id === conn.memberId)
    if (!room || !member) {
      this.send(conn.ws, { type: 'error', message: 'Non sei in una stanza.' })
      return
    }

    switch (message.type) {
      case 'start': {
        if (room.hostId !== member.id) return this.send(conn.ws, { type: 'error', message: 'Solo l\'host può avviare.' })
        if (room.game) return
        this.fillWithBots(room)
        room.game = this.buildGame(room)
        this.refresh(room)
        return
      }
      case 'addBot': {
        if (room.hostId !== member.id || room.game) return
        if (room.members.length >= MAX_PLAYERS) return
        this.addBot(room)
        this.refresh(room)
        return
      }
      case 'removeBot': {
        if (room.hostId !== member.id || room.game) return
        const bot = room.members.find((candidate) => candidate.id === message.playerId && candidate.isBot)
        if (!bot) return
        room.members = room.members.filter((candidate) => candidate.id !== bot.id)
        this.refresh(room)
        return
      }
      case 'hit':
        if (room.game) {
          room.game.hit(member.id)
          this.refresh(room)
        }
        return
      case 'stay':
        if (room.game) {
          room.game.stay(member.id)
          this.refresh(room)
        }
        return
      case 'target':
        if (room.game) {
          room.game.chooseTarget(member.id, message.targetId)
          this.refresh(room)
        }
        return
      case 'chat': {
        const text = cleanChat(message.text)
        const now = Date.now()
        if (!text) return
        if (member.lastChatAt && now - member.lastChatAt < CHAT_COOLDOWN_MS) return
        member.lastChatAt = now
        this.pushChat(room, member, 'chat', text)
        this.refresh(room, false)
        return
      }
      case 'reaction': {
        const now = Date.now()
        if (!REACTIONS.has(message.emoji)) return
        if (member.lastReactionAt && now - member.lastReactionAt < REACTION_COOLDOWN_MS) return
        member.lastReactionAt = now
        this.pushChat(room, member, 'reaction', message.emoji)
        this.refresh(room, false)
        return
      }
      case 'nextRound':
        if (room.game && room.game.phase === 'roundEnd') {
          room.game.nextRound()
          this.refresh(room)
        }
        return
      case 'rematch': {
        if (!room.game || room.game.phase !== 'gameOver') return
        room.game = this.buildGame(room)
        this.refresh(room)
        return
      }
      case 'leave':
        this.detach(conn, true)
        this.send(conn.ws, { type: 'left' })
        return
      default:
        return
    }
  }

  private resume(conn: Conn, token: string) {
    for (const room of this.rooms.values()) {
      const member = room.members.find((candidate) => candidate.token === token)
      if (!member) continue
      member.connected = true
      member.socket = conn.ws
      conn.roomCode = room.code
      conn.memberId = member.id
      room.lastActivity = Date.now()
      if (!member.isBot) room.lastHumanAt = Date.now()
      this.send(conn.ws, { type: 'view', view: this.viewFor(room, member) })
      this.refresh(room)
      return
    }
    this.send(conn.ws, { type: 'error', message: 'session-expired' })
  }

  private createRoom(conn: Conn, name: string, avatar: string) {
    this.detach(conn, false)
    const code = this.newCode()
    const host: Member = {
      id: randomUUID(),
      name,
      avatar,
      isBot: false,
      token: randomUUID(),
      connected: true,
      socket: conn.ws,
    }
    const room: Room = {
      code,
      hostId: host.id,
      members: [host],
      game: null,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      lastHumanAt: Date.now(),
      turnEndsAt: null,
      nextRoundAt: null,
      turnTimer: null,
      nextRoundTimer: null,
      joinTimers: [],
      chat: [],
      chatSeq: 0,
    }
    this.rooms.set(code, room)
    conn.roomCode = code
    conn.memberId = host.id

    // Bots stroll into the lobby one by one, as a real table would fill up.
    for (const delay of [500, 1200, 2100]) {
      room.joinTimers.push(
        setTimeout(() => {
          if (!this.rooms.has(code) || room.game || room.members.length >= MAX_PLAYERS) return
          this.addBot(room)
          this.refresh(room)
        }, delay),
      )
    }

    this.send(conn.ws, { type: 'view', view: this.viewFor(room, host), token: host.token })
    this.refresh(room)
  }

  private joinRoom(conn: Conn, rawCode: string, name: string, avatar: string) {
    const code = String(rawCode ?? '').replace(/\D/g, '').slice(0, 5)
    const room = this.rooms.get(code)
    if (!room) {
      this.send(conn.ws, { type: 'error', message: 'Nessuna stanza con questo codice.' })
      return
    }
    if (room.game) {
      this.send(conn.ws, { type: 'error', message: 'Partita già iniziata: chiedi un nuovo codice.' })
      return
    }
    if (room.members.length >= MAX_PLAYERS) {
      this.send(conn.ws, { type: 'error', message: 'La stanza è piena (8 giocatori).' })
      return
    }
    this.detach(conn, false)
    const member: Member = {
      id: randomUUID(),
      name: this.uniqueName(room, name),
      avatar,
      isBot: false,
      token: randomUUID(),
      connected: true,
      socket: conn.ws,
    }
    room.members.push(member)
    room.lastHumanAt = Date.now()
    conn.roomCode = code
    conn.memberId = member.id
    this.send(conn.ws, { type: 'view', view: this.viewFor(room, member), token: member.token })
    this.refresh(room)
  }

  private pushChat(room: Room, member: Member, kind: 'chat' | 'reaction', text: string) {
    room.chatSeq += 1
    room.chat.push({
      id: room.chatSeq,
      playerId: member.id,
      name: member.name,
      avatar: member.avatar,
      kind,
      text,
      at: Date.now(),
    })
    if (room.chat.length > CHAT_LIMIT) room.chat.splice(0, room.chat.length - CHAT_LIMIT)
  }

  private uniqueName(room: Room, name: string): string {
    if (!room.members.some((member) => member.name.toLowerCase() === name.toLowerCase())) return name
    for (let i = 2; i < 10; i++) {
      const candidate = `${name} ${i}`
      if (!room.members.some((member) => member.name === candidate)) return candidate
    }
    return name
  }

  private addBot(room: Room) {
    const botCount = room.members.filter((member) => member.isBot).length
    const name = BOT_NAMES[botCount % BOT_NAMES.length]
    const avatar = BOT_AVATARS[botCount % BOT_AVATARS.length]
    room.members.push({
      id: randomUUID(),
      name: this.uniqueName(room, name),
      avatar,
      isBot: true,
      token: randomUUID(),
      connected: true,
    })
  }

  private fillWithBots(room: Room) {
    while (room.members.length < MIN_PLAYERS) this.addBot(room)
  }

  private buildGame(room: Room): Flip7Game {
    const seats: SeatInput[] = room.members.map((member) => ({
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      isBot: member.isBot,
    }))
    return new Flip7Game(seats)
  }

  private viewFor(room: Room, member: Member): RoomView {
    const connected = new Map(room.members.map((candidate) => [candidate.id, candidate.connected]))
    const base: PublicState = room.game ? room.game.view() : this.emptyState()
    const players: RoomPlayer[] = room.game
      ? base.players.map((player) => ({ ...player, connected: connected.get(player.id) ?? false }))
      : room.members.map((candidate) => this.lobbyPlayer(candidate))

    return {
      ...base,
      players,
      code: room.code,
      hostId: room.hostId,
      you: member.id,
      isHost: room.hostId === member.id,
      turnEndsAt: room.turnEndsAt,
      nextRoundAt: room.nextRoundAt,
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      chat: room.chat.slice(-CHAT_LIMIT),
    }
  }

  private lobbyPlayer(member: Member): RoomPlayer {
    const player: GamePlayer = {
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      isBot: member.isBot,
      hand: [],
      total: 0,
      status: 'active',
      flip7: false,
      roundScore: null,
      breakdown: null,
      bustedCard: null,
    }
    return { ...player, connected: member.connected }
  }

  private emptyState(): PublicState {
    return {
      phase: 'lobby',
      round: 0,
      players: [],
      currentPlayerId: null,
      pending: null,
      deckCount: 0,
      discardTop: null,
      discardCount: 0,
      events: [],
      lastSummary: null,
      winnerId: null,
      targetScore: TARGET_SCORE,
    }
  }

  /** Schedules bot moves, human turn timeouts and the next round, then pushes state. */
  private refresh(room: Room, schedule = true) {
    if (!this.rooms.has(room.code)) return
    room.lastActivity = Date.now()
    if (schedule) this.tick(room)
    for (const member of room.members) {
      if (member.socket && member.socket.readyState === WebSocket.OPEN) {
        this.send(member.socket, { type: 'view', view: this.viewFor(room, member) })
      }
    }
    if (room.members.every((member) => member.isBot)) this.deleteRoom(room)
  }

  private tick(room: Room) {
    const game = room.game
    if (!game) {
      room.turnEndsAt = null
      room.nextRoundAt = null
      return
    }

    if (game.phase === 'playing') {
      room.nextRoundAt = null
      if (room.nextRoundTimer) {
        clearTimeout(room.nextRoundTimer)
        room.nextRoundTimer = null
      }
      // `refresh` only runs when the game actually changed, so the timer can be
      // re-armed every time. A per-turn key would stall when the same player is
      // still the only active one (their seat does not change).
      if (room.turnTimer) {
        clearTimeout(room.turnTimer)
        room.turnTimer = null
      }

      const actorId = game.currentPlayerId
      if (!actorId) return
      const member = room.members.find((candidate) => candidate.id === actorId)
      const automated = !member || member.isBot || !member.connected

      if (automated) {
        room.turnEndsAt = null
        room.turnTimer = setTimeout(() => {
          room.turnTimer = null
          if (room.game !== game || game.phase !== 'playing') return
          this.playAutomated(game, actorId)
          this.refresh(room)
        }, 480 + Math.random() * 520)
      } else {
        const deadline = Date.now() + TURN_MS
        room.turnEndsAt = deadline
        room.turnTimer = setTimeout(() => {
          room.turnTimer = null
          if (room.game !== game || game.phase !== 'playing') return
          this.playAutomated(game, actorId)
          this.refresh(room)
        }, TURN_MS)
      }
      return
    }

    room.turnEndsAt = null
    if (room.turnTimer) {
      clearTimeout(room.turnTimer)
      room.turnTimer = null
    }

    if (game.phase === 'roundEnd') {
      if (!room.nextRoundTimer) {
        room.nextRoundAt = Date.now() + NEXT_ROUND_MS
        room.nextRoundTimer = setTimeout(() => {
          room.nextRoundTimer = null
          room.nextRoundAt = null
          if (room.game !== game) return
          if (game.phase === 'roundEnd') game.nextRound()
          this.refresh(room)
        }, NEXT_ROUND_MS)
      }
      return
    }

    room.nextRoundAt = null
    if (room.nextRoundTimer) {
      clearTimeout(room.nextRoundTimer)
      room.nextRoundTimer = null
    }
  }

  private playAutomated(game: Flip7Game, playerId: string) {
    const decision = decideBot(game, playerId)
    if (decision.kind === 'target') game.chooseTarget(playerId, decision.targetId)
    else if (decision.kind === 'hit') game.hit(playerId)
    else if (decision.kind === 'stay') game.stay(playerId)
    else if (game.pending) {
      const target = game.pending.validTargets[0]
      if (target) game.chooseTarget(playerId, target)
    } else {
      game.stay(playerId)
    }
  }

  private detach(conn: Conn, explicit: boolean) {
    const room = conn.roomCode ? this.rooms.get(conn.roomCode) : undefined
    const memberId = conn.memberId
    conn.roomCode = undefined
    conn.memberId = undefined
    if (!room || !memberId) return

    const member = room.members.find((candidate) => candidate.id === memberId)
    if (!member) return
    member.socket = undefined
    member.connected = false

    if (explicit) {
      if (room.game) {
        // Keep the seat (and its score) alive: the engine plays it out as a bot.
        member.isBot = true
      } else {
        room.members = room.members.filter((candidate) => candidate.id !== memberId)
      }
    }

    if (room.hostId === memberId) {
      const nextHost =
        room.members.find((candidate) => !candidate.isBot && candidate.connected) ??
        room.members.find((candidate) => !candidate.isBot) ??
        room.members[0]
      if (nextHost) room.hostId = nextHost.id
    }

    if (!room.members.length || !room.members.some((candidate) => !candidate.isBot)) {
      this.deleteRoom(room)
      return
    }
    this.refresh(room)
  }

  private clearTimers(room: Room) {
    if (room.turnTimer) clearTimeout(room.turnTimer)
    if (room.nextRoundTimer) clearTimeout(room.nextRoundTimer)
    for (const timer of room.joinTimers) clearTimeout(timer)
    room.turnTimer = null
    room.nextRoundTimer = null
    room.joinTimers = []
  }

  private deleteRoom(room: Room) {
    this.clearTimers(room)
    this.rooms.delete(room.code)
  }

  private newCode(): string {
    for (let attempt = 0; attempt < 500; attempt++) {
      const code = String(10000 + Math.floor(Math.random() * 90_000))
      if (!this.rooms.has(code)) return code
    }
    throw new Error('No room codes available')
  }

  private sweep() {
    const now = Date.now()
    for (const room of [...this.rooms.values()]) {
      const hasConnectedHuman = room.members.some((member) => !member.isBot && member.connected)
      const stale = now - room.lastActivity > ROOM_TTL
      const abandoned = !hasConnectedHuman && now - room.lastHumanAt > NO_HUMAN_TTL
      if (stale || abandoned) this.deleteRoom(room)
    }
  }

  private send(ws: WebSocket, message: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }
}
