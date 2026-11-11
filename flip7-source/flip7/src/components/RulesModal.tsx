import { motion } from 'framer-motion'

export function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3 backdrop-blur-md sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="relative flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/12 bg-[linear-gradient(170deg,#0a1a15,#050c09_70%)] shadow-[0_60px_120px_-40px_rgba(0,0,0,1)]"
      >
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-gold-400/70">Regolamento</p>
            <h2 className="font-display text-2xl italic text-cream sm:text-3xl">Come si gioca a Flip 7</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-cream/60 transition hover:border-gold-400/40 hover:text-gold-200"
            aria-label="Chiudi"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="hide-scrollbar space-y-5 overflow-y-auto px-4 py-4 text-[13px] leading-relaxed text-cream/70 sm:px-6 sm:py-5">
          <p>
            Un <span className="text-cream">push-your-luck</span> da 3 a 8 giocatori: pesca, somma i numeri,
            moltiplica i bonus e fermati prima di pescare un doppione. Primo a{' '}
            <span className="text-gold-300">200 punti</span> vince.
          </p>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3.5">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-300">Il mazzo · 94 carte</h3>
              <p className="mb-2 text-[12px] text-cream/60">
                Le carte numero valgono il loro numero e ne esistono tante copie quanto il valore: 1 carta da 0,
                1 da 1, 3 da 3, fino a 12 copie del 12.
              </p>
              <ul className="space-y-1 text-[12px]">
                <li><span className="text-sky-300">Freeze</span> ×3 — congela un avversario, che incassa i punti.</li>
                <li><span className="text-amber-300">Flip Three</span> ×3 — costringe un avversario a pescare 3 carte.</li>
                <li><span className="text-emerald-300">Second Chance</span> ×3 — scudo: annulla un doppione.</li>
                <li><span className="text-gold-300">Bonus</span> +2, +6, +10 — punti extra a fine round.</li>
                <li><span className="text-violet-300">Moltiplicatore</span> ×3 — raddoppia il totale del round.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3.5">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-300">Il turno</h3>
              <ul className="space-y-1.5 text-[12px]">
                <li>Il round apre con una carta scoperta a testa.</li>
                <li><span className="text-cream">HIT</span> — pesca una carta. Se è un numero che hai già, sballi e perdi i punti del round.</li>
                <li><span className="text-cream">STAY</span> — ti fermi e metti al sicuro il punteggio del round.</li>
                <li>7 numeri diversi = <span className="text-gold-300">Flip 7</span>, bonus di +15 punti.</li>
                <li>Freeze, Flip Three e Second Chance si attivano appena pescate.</li>
              </ul>
            </div>
          </section>

          <section className="rounded-xl border border-gold-400/15 bg-gold-500/[0.045] p-3.5">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-300">Punteggio di fine round</h3>
            <ol className="list-inside list-decimal space-y-1 text-[12px]">
              <li>Somma i numeri unici davanti a te.</li>
              <li>Aggiungi le carte Bonus.</li>
              <li>Applica il moltiplicatore ×2 per ogni carta viola.</li>
              <li>Aggiungi +15 se hai fatto Flip 7.</li>
            </ol>
            <p className="mt-2 text-[12px] text-cream/50">
              Esempio: 2 + 5 + 8 + 11 = 26, più Bonus +6 = 32, ×2 = <span className="text-gold-200">64 punti</span>.
              Chi sballa non incassa nulla.
            </p>
          </section>

          <p className="text-[12px] text-cream/45">
            Le stanze hanno un codice di 5 cifre: condividilo con chi vuoi al tavolo. Se siete in meno di tre,
            ai bot pensiamo noi; se un giocatore esce, il suo posto continua a giocare da solo.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
