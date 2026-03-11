import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../store/gameState.jsx'
import eventsData from '../data/events.json'

function pickRandomEvent() {
  return eventsData[Math.floor(Math.random() * eventsData.length)]
}

export function EventView() {
  const {
    damagePlayer,
    healPlayer,
    addCardToDeck,
    removeCardFromDeck,
    removeRandomCardFromDeck,
    finishEvent,
    INIT_PLAYER_HP,
  } = useGame()

  const event = useMemo(() => pickRandomEvent(), [])

  const [selected, setSelected] = useState(null)
  const [resolved, setResolved] = useState(false)

  const applyEffects = (effects) => {
    if (!effects || effects.length === 0) return
    for (const eff of effects) {
      switch (eff.type) {
        case 'lose_hp':
          damagePlayer(eff.value ?? 0)
          break
        case 'heal':
          healPlayer(eff.value === 'full' ? INIT_PLAYER_HP : (eff.value ?? 0))
          break
        case 'gain_card':
          if (eff.cardId) addCardToDeck(eff.cardId)
          break
        case 'remove_card':
          if (eff.random) {
            removeRandomCardFromDeck()
          } else if (eff.cardId) {
            removeCardFromDeck(eff.cardId)
          }
          break
        default:
          break
      }
    }
  }

  const handleOption = (opt) => {
    if (resolved) return
    setSelected(opt.id)
    applyEffects(opt.effects)
    setResolved(true)
  }

  const handleContinue = () => {
    finishEvent()
  }

  return (
    <div className="min-h-screen bg-void text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-violet-950/30 via-slate-900/40 to-void" />

      <main className="relative z-10 flex-1 flex flex-col md:flex-row gap-6 p-6 max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative flex-shrink-0 w-full md:w-80 h-48 md:h-96 rounded-xl overflow-hidden
            bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900
            border border-violet-500/30"
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_40%,rgba(139,92,246,0.1)_100%)]" />
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm font-mono">
            {event.imageHint ?? '随机奇遇'}
          </div>
        </motion.div>

        <div className="flex-1 flex flex-col">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-2xl font-bold text-violet-300 mb-4"
          >
            {event.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-300 leading-relaxed mb-8"
          >
            {event.description}
          </motion.p>

          <div className="flex flex-col gap-3">
            {event.options.map((opt, i) => (
              <motion.button
                key={opt.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                whileHover={!resolved ? { scale: 1.01 } : {}}
                whileTap={!resolved ? { scale: 0.99 } : {}}
                onClick={() => handleOption(opt)}
                disabled={resolved}
                className={`text-left px-4 py-3 rounded-lg border transition-colors
                  ${resolved
                    ? selected === opt.id
                      ? 'bg-violet-600/30 border-violet-400/50'
                      : 'opacity-50 cursor-default'
                    : 'hover:bg-violet-600/20 border-violet-500/40 hover:border-violet-400/60 cursor-pointer'
                  }`}
              >
                <span className="font-mono font-bold text-violet-200">选项 {opt.id.toUpperCase()}：</span>
                <span className="text-cyan-100 ml-2">{opt.text}</span>
                <p className="text-slate-400 text-sm mt-1 ml-4">{opt.desc}</p>
              </motion.button>
            ))}
          </div>

          {resolved && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleContinue}
              className="mt-8 px-6 py-3 font-mono text-sm tracking-widest rounded-lg
                bg-violet-600/80 hover:bg-violet-500 border border-violet-400/50 self-start"
            >
              继续
            </motion.button>
          )}
        </div>
      </main>
    </div>
  )
}
