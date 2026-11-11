# Flip 7 — deploy del server

Questo pacchetto contiene tutto ciò che serve per mettere online il gioco:

```
dist/                     client compilato (HTML, CSS, JS)
dist-server/server.mjs    server Node: stanze, turni, bot e WebSocket
node_modules/ws/          unica dipendenza runtime, già inclusa
package.json              script di avvio
Dockerfile                immagine pronta
```

## Requisiti

- Node.js **20 o superiore**.
- Nessuna build e nessun `npm install`: il server è già compilato e `ws` è incluso.

## Avvio

```bash
node dist-server/server.mjs     # oppure: npm start
```

Il gioco risponde su `http://localhost:3000`. La build statica e il WebSocket
(`/flip7-ws`) usano lo stesso host e la stessa porta, quindi non serve altro.

| Variabile | Default | Note |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP (molti host la impostano da soli). |
| `HOST` | `0.0.0.0` | Interfaccia di ascolto. |
| `STATIC_DIR` | `dist` accanto al bundle | Cartella del client compilato. |
| `ALLOWED_ORIGINS` | vuoto | Lista separata da virgole; se impostata, rifiuta i WebSocket con `Origin` diverso. In produzione va impostata sull'URL pubblico. |

Endpoint utili:

- `GET /healthz` → `{"status":"ok","rooms":N,"uptimeSeconds":N}` (health check).
- `GET /` → home del gioco.
- WebSocket `wss://tuo-dominio/flip7-ws` (in locale `ws://localhost:3000/flip7-ws`).

## Dove farlo girare

Serve un host che esegua un processo Node: le stanze vivono in memoria, quindi
**un hosting solo statico non basta** (GitHub Pages, Netlify statico, S3, ecc.).

- **Render** (percorso più semplice, senza dominio): carica il progetto su GitHub,
  poi **New → Blueprint**, collega il repository e premi **Apply**. Render legge
  `render.yaml` (runtime Node, piano free, build `npm ci && npm run build:all`,
  start `node dist-server/server.mjs`, health check `/healthz`). In alternativa
  crea un Web Service a mano con gli stessi valori. A deploy finito copia l'URL
  `https://<servizio>.onrender.com`, aggiungilo in **Environment** come
  `ALLOWED_ORIGINS` e rilancia. Il piano free si spegne dopo 15 minuti senza
  traffico e si riaccende alla visita successiva (circa un minuto).
- **Railway**: nuovo progetto dal repository, start command
  `node dist-server/server.mjs` e variabile `PORT` gestita dalla piattaforma.
- **Fly.io / VPS**: copia questa cartella, avvia `node dist-server/server.mjs`
  (meglio con systemd o `docker run --restart unless-stopped`) e metti davanti
  Nginx o Caddy con TLS e inoltro degli upgrade WebSocket.
- **Docker** (incluso):

  ```bash
  docker build -t flip7 .
  docker run --rm -p 8080:8080 \
    -e ALLOWED_ORIGINS=https://tuo-dominio.example \
    flip7
  ```

  Poi apri `http://localhost:8080`.

## Note operative

- **Una sola istanza**: stanze, sessioni e partite sono in memoria. Non scalare
  orizzontalmente senza uno store condiviso; un riavvio azzera le partite in corso.
- Il reverse proxy deve inoltrare gli header `Upgrade` e `Connection` per
  `/flip7-ws`, altrimenti il tavolo non si connette e resta la schermata di attesa.
- Imposta `ALLOWED_ORIGINS` sul dominio reale in produzione: è la protezione
  contro le connessioni WebSocket da altri siti. Se la lasci vuota, accetta
  qualsiasi `Origin`.
- Aggiornamenti: sostituisci `dist/` e `dist-server/server.mjs`, poi riavvia.
- I log vanno su stdout; `SIGTERM`/`SIGINT` chiudono il server in modo ordinato.

## Verifica rapida

```bash
curl -s https://tuo-dominio.example/healthz
```

Deve rispondere `{"status":"ok",...}`. Poi apri la home, crea una stanza e
controlla che il codice a 5 cifre compaia e che i bot si siedano.
