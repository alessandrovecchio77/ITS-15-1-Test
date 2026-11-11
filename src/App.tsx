import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { RulesModal } from './components/RulesModal'
import { useRoom } from './lib/useRoom'
import { HomeScreen } from './screens/Home'
import { LobbyScreen } from './screens/Lobby'
import { TableScreen } from './screens/Table'

export default function App() {
  const { view, status, error, actions, clearError } = useRoom()
  const [rules, setRules] = useState(false)

  return (
    <>
      {!view ? (
        <HomeScreen
          status={status}
          onCreate={actions.create}
          onJoin={actions.join}
          onRules={() => setRules(true)}
        />
      ) : view.phase === 'lobby' ? (
        <LobbyScreen
          view={view}
          status={status}
          onStart={actions.start}
          onAddBot={actions.addBot}
          onRemoveBot={actions.removeBot}
          onLeave={actions.leave}
          onRules={() => setRules(true)}
        />
      ) : (
        <TableScreen
          view={view}
          onHit={actions.hit}
          onStay={actions.stay}
          onTarget={actions.target}
          onChat={actions.chat}
          onReact={actions.react}
          onNextRound={actions.nextRound}
          onRematch={actions.rematch}
          onLeave={actions.leave}
          onRules={() => setRules(true)}
        />
      )}

      {view && status !== 'online' && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center p-2">
          <div className="rounded-full border border-amber-300/30 bg-[#1a1408]/90 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-amber-200 shadow-lg backdrop-blur">
            connessione in corso…
          </div>
        </div>
      )}

      {rules && <RulesModal onClose={() => setRules(false)} />}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-4 left-1/2 z-[80] -translate-x-1/2 rounded-xl border border-rose-400/30 bg-[#1a0a0d]/95 px-4 py-2.5 text-[12px] text-rose-100 shadow-2xl backdrop-blur"
          >
            <button type="button" onClick={clearError} className="flex items-center gap-2">
              <span>{error}</span>
              <span className="text-rose-300/60">✕</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
