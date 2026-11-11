// Temporary live smoke test for the realtime protocol (run against a running dev server).
import { WebSocket } from 'ws'

const URL = process.env.FLIP7_WS ?? 'ws://127.0.0.1:3000/flip7-ws'
const HOST = process.env.FLIP7_HOST
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function invariant(condition, message) {
  if (!condition) throw new Error(`ASSERT: ${message}`)
}

class Client {
  constructor(label) {
    this.label = label
    this.view = null
    this.token = null
    this.errors = []
    this.events = new Set()
    this.ws = new WebSocket(URL, HOST ? { headers: { Host: HOST } } : undefined)
    this.ready = new Promise((resolve, reject) => {
      this.ws.once('open', resolve)
      this.ws.once('error', reject)
    })
    this.ws.on('message', (raw) => {
      const message = JSON.parse(String(raw))
      if (message.type === 'view') {
        this.view = message.view
        if (message.token) this.token = message.token
        for (const event of message.view.events ?? []) this.events.add(event.type)
      } else if (message.type === 'error') {
        this.errors.push(message.message)
      }
    })
  }

  send(message) {
    this.ws.send(JSON.stringify(message))
  }

  async waitFor(predicate, label = 'condition', timeout = 10_000) {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      if (this.view && predicate(this.view)) return this.view
      await sleep(60)
    }
    throw new Error(`${this.label}: timeout waiting for ${label}`)
  }
}

const a = new Client('host')
await a.ready
a.send({ type: 'create', name: 'Host', avatar: '🦊' })
await a.waitFor((view) => /^\d{5}$/.test(view.code), 'room code')
const code = a.view.code
console.log('room code:', code)
invariant(/^\d{5}$/.test(code), 'code has five digits')

await a.waitFor((view) => view.players.length === 4, 'three bots joined', 8000)
console.log('lobby:', a.view.players.map((player) => `${player.name}${player.isBot ? '(bot)' : ''}`).join(', '))

const b = new Client('guest')
await b.ready
b.send({ type: 'join', code, name: 'Guest', avatar: '🐙' })
await b.waitFor((view) => view.players.length === 5, 'guest joined')
invariant(b.view.hostId === a.view.you, 'guest is not host')

b.send({ type: 'start' })
await sleep(400)
invariant(b.errors.some((message) => message.includes('host')), 'non-host cannot start the game')
console.log('non-host start rejected:', b.errors.at(-1))

a.send({ type: 'start' })
await a.waitFor((view) => view.phase === 'playing', 'game started')
invariant(a.view.players.every((player) => player.hand.length >= 1), 'everyone got an opening card')
console.log('round 1 started, hands:', a.view.players.map((player) => player.hand.length).join('/'))

a.send({ type: 'chat', text: 'Forza!' })
a.send({ type: 'chat', text: 'Spam' })
a.send({ type: 'reaction', emoji: '🔥' })
a.send({ type: 'reaction', emoji: '🚀' })
await sleep(600)
const chat = b.view.chat ?? []
invariant(chat.some((message) => message.kind === 'chat' && message.text === 'Forza!'), 'chat visible to every player')
invariant(!chat.some((message) => message.text === 'Spam'), 'chat rate limit applied')
invariant(chat.some((message) => message.kind === 'reaction' && message.text === '🔥'), 'reaction visible to every player')
invariant(!chat.some((message) => message.text === '🚀'), 'unknown reaction rejected')
console.log('chat + reactions verified:', chat.map((message) => message.text).join(' | '))

let acting = true
const loop = async (client) => {
  while (acting) {
    const view = client.view
    if (view?.phase === 'playing' && view.currentPlayerId === client.view?.you) {
      if (view.pending) {
        if (view.pending.playerId === view.you && view.pending.validTargets.length) {
          client.send({ type: 'target', targetId: view.pending.validTargets[0] })
        }
      } else {
        const me = view.players.find((player) => player.id === view.you)
        const numbers = me?.hand.filter((card) => card.type === 'number').length ?? 0
        client.send({ type: numbers < 2 ? 'hit' : 'stay' })
      }
    }
    await sleep(120)
  }
}

const playA = loop(a)
const playB = loop(b)

const deadline = Date.now() + 240_000
let outcome = 'timeout'
let lastLog = Date.now()
while (Date.now() < deadline) {
  const view = a.view
  if (view.phase === 'roundEnd' || view.phase === 'gameOver') {
    outcome = view.phase
    break
  }
  if (Date.now() - lastLog > 10_000) {
    lastLog = Date.now()
    const me = view.players.find((player) => player.id === view.you)
    console.log(
      'progress:',
      'round',
      view.round,
      '| deck',
      view.deckCount,
      '| current',
      view.players.find((player) => player.id === view.currentPlayerId)?.name,
      '| pending',
      view.pending?.card.type ?? '-',
      '| hands',
      view.players.map((player) => player.hand.length).join('/'),
      '| me',
      me?.status,
      '| statuses',
      view.players.map((player) => player.status[0]).join(''),
    )
  }
  await sleep(200)
}
acting = false
await Promise.all([playA, playB])
console.log('round outcome:', outcome)
if (outcome === 'timeout') {
  console.log('stalled state:', JSON.stringify(a.view, null, 2).slice(0, 2500))
}
invariant(outcome !== 'timeout', 'round completed before the deadline')

const summary = a.view.lastSummary
invariant(summary?.rows.length === 5, 'summary covers all five seats')
for (const row of summary.rows) {
  const bd = row.breakdown
  const expected = bd.busted ? 0 : bd.base * 2 ** bd.multipliers + bd.flip7Bonus
  invariant(bd.total === expected, `score math for ${row.name}`)
  invariant(row.roundDelta === expected, `round delta for ${row.name}`)
}
for (const player of a.view.players) {
  const numbers = player.hand.filter((card) => card.type === 'number').map((card) => card.value)
  invariant(new Set(numbers).size === numbers.length, `no duplicate numbers for ${player.name}`)
}
console.log('summary verified:', summary.rows.map((row) => `${row.name} +${row.roundDelta} (${row.total})`).join(', '))
console.log('event types seen:', [...a.events].join(', '))

// Session resume: a fresh socket with the host token must land back in the same seat.
const c = new Client('resume')
await c.ready
c.send({ type: 'hello', token: a.token })
const resumed = await c.waitFor((view) => view.you === a.view.you, 'session resume', 5000)
invariant(resumed.code === code, 'resumed into the same room')
console.log('session resume ok for', resumed.you)

for (const client of [a, b, c]) client.ws.close()
console.log('SMOKE OK')
