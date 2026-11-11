# Flip 7 — tavolo multiplayer

Un'applicazione web completa per **Flip 7**, il gioco di carte push-your-luck: tavolo ovale sempre
dentro la viewport, stanze reali con codice a 5 cifre e server di gioco autorevole via WebSocket.

## Stack

- **React 19 + TypeScript + Vite**
- **Tailwind CSS v4** per il design system (dark mode, feltro, ottone, carte)
- **Framer Motion** per le animazioni (carte pescate, carte lanciate, ingressi al tavolo)
- **ws** per il server realtime, montato sullo stesso server HTTP di Vite (una sola porta)
- **Vitest** per il motore di gioco

## Avvio

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # test del motore
npm run build    # typecheck + build di produzione
```

Apri due schede: nella prima **Crea stanza**, nella seconda **Partecipa** con il codice a 5 cifre.
Tre bot si siedono automaticamente, quindi puoi anche giocare subito in solitaria.

Con il dev server attivo, `node scripts/smoke.mjs` apre due client reali, avvia un round con i bot
e verifica punteggi, invarianti del mazzo e ripresa della sessione.

## Come è fatto

```
src/engine/    motore puro e condiviso: mazzo, regole, punteggi, euristiche dei bot
src/server/    stanze, sessioni, turni, timer e server WebSocket (solo Node)
src/shared/    tipi del protocollo client <-> server
src/screens/   Home, Lobby, Table
src/components/ carte, postazioni, feltro, overlay, regolamento
```

### Regole implementate

- Mazzo da 94 carte: 79 numeri (N copie del valore N, più lo 0), 3 Freeze, 3 Flip Three,
  3 Second Chance, bonus +2/+6/+10 e 3 moltiplicatori ×2.
- Una carta scoperta a testa a inizio round; poi HIT o STAY a ogni turno.
- Doppione = sballo e zero punti del round; Second Chance annulla un solo doppione.
- Freeze congela un avversario (incassa i punti), Flip Three gli fa pescare subito 3 carte.
- 7 numeri diversi = **+15** punti Flip 7; chi arriva a 200 vince.
- Punteggio: numeri + bonus, poi ×2 per ogni moltiplicatore, poi +15 del Flip 7.

### Multiplayer e sessioni

Il server tiene lo stato di ogni stanza (mazzo compreso: i client non lo vedono), valida ogni
azione, gestisce il turno dei bot, il timeout di 30 secondi dei giocatori umani e l'avanzamento
automatico dei round. Ogni giocatore riceve un token di sessione salvato nel browser, così un
refresh o una disconnessione riporta al proprio posto. Il tavolo include una chat rapida con frasi
pronte, messaggi liberi e reazioni emoji: il server valida lunghezza, whitelist delle emoji e cooldown
per evitare spam, e le reazioni compaiono sopra la postazione di chi le invia. Se un giocatore esce,
il suo seggio continua a giocare in automatico per non bloccare il tavolo.

Quando arriva il tuo turno e la finestra non è attiva, il titolo della scheda diventa
«🎯 Tocca a te» e, se hai autorizzato le notifiche, ricevi anche un avviso di sistema (con
vibrazione su mobile). L'interruttore a campana nella barra del tavolo attiva o disattiva gli avvisi.

## Deploy (server autonomo)

La build statica da sola non basta: le stanze vivono nel server WebSocket. `src/server/standalone.ts`
serve sia `dist/` sia le stanze sullo stesso host e sulla stessa porta, quindi in produzione
l'applicazione non ha bisogno del dev server Vite.

```bash
npm ci
npm run build:all   # tsc + vite build + bundle del server in dist-server/server.mjs
npm start           # node dist-server/server.mjs
```

Variabili d'ambiente:

| Variabile | Default | Note |
| --- | --- | --- |
| `PORT` | `3000` | porta HTTP |
| `HOST` | `0.0.0.0` | interfaccia di ascolto |
| `STATIC_DIR` | `dist` accanto al bundle | cartella della build |
| `ALLOWED_ORIGINS` | vuoto | lista separata da virgole; se impostata, rifiuta gli upgrade con `Origin` diverso |

Endpoint e comportamento:

- `GET /healthz` risponde `{"status":"ok","rooms":N,"uptimeSeconds":N}` con `no-store`.
- WebSocket su `/flip7-ws`, stesso host e porta, `wss://` dietro un reverse proxy TLS.
- Asset hashati in `/assets/*` con cache `immutable`, `index.html` con `no-cache`.
- Le rotte senza estensione che accettano HTML ricevono la SPA; i file mancanti restano 404.
- `SIGINT`/`SIGTERM` chiudono il server e le stanze in modo ordinato.

Note per l'hosting: il processo deve restare in ascolto (niente build on-demand), il reverse proxy
deve inoltrare gli upgrade WebSocket e le sessioni sono in memoria, quindi una singola istanza
è il setup previsto; per scalare servirebbe uno store condiviso. In produzione conviene impostare
`ALLOWED_ORIGINS` sul dominio reale.
