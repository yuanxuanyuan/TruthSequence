import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, Microscope, Clock } from 'lucide-react'
import { useGame } from '../store/gameState.jsx'
import relicsData from '../data/relics.json'

const ICON_MAP = { Compass, Microscope, Clock }
const PICK_COUNT = 3

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function RelicRewardView() {
  const { relics, finishRelicReward } = useGame()
  const [choice, setChoice] = useState(null)

  const options = useMemo(() => {
    const available = relicsData.filter(r => !relics.includes(r.id))
    return shuffle([...available]).slice(0, PICK_COUNT)
  }, [relics])

  const handleSelect = (relic) => {
    if (relics.includes(relic.id)) return
    setChoice(relic.id)
    finishRelicReward(relic.id)
  }

  const handleSkip = () => {
    finishRelicReward(null)
  }

  return (
    <div className="min-h-screen bg-void text-white flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-amber-950/30 via-transparent to-slate-900/40" />

      <div className="relative z-10 text-center mb-8">
        <h2 className="font-serif text-2xl font-bold text-amber-300 mb-2">Boss 击败</h2>
        <p className="font-mono text-amber-400/70 text-sm tracking-widest">选择一件遗物</p>
      </div>

      <div className="relative z-10 flex gap-4 sm:gap-8 justify-center flex-wrap px-4 sm:px-6">
        {options.length === 0 ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-slate-400">已集齐所有遗物</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSkip}
              className="px-8 py-3 font-mono text-sm rounded-lg bg-amber-600/80 hover:bg-amber-500 border border-amber-400/50"
            >
              继续
            </motion.button>
          </div>
        ) : (
        <AnimatePresence mode="popLayout">
          {options.map((relic, i) => {
            const Icon = ICON_MAP[relic.icon] ?? Compass
            const owned = relics.includes(relic.id)
            return (
              <motion.div
                key={relic.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={!owned ? { scale: 1.08, y: -8 } : {}}
                whileTap={!owned ? { scale: 0.95 } : {}}
                onClick={() => !owned && handleSelect(relic)}
                className={`flex flex-col items-center p-6 rounded-xl border-2 cursor-pointer transition-all
                  ${owned
                    ? 'opacity-50 cursor-not-allowed border-amber-500/30 bg-amber-500/5'
                    : 'border-amber-500/50 bg-amber-500/10 hover:border-amber-400 hover:shadow-[0_0_24px_rgba(251,191,36,0.3)]'
                  }`}
              >
                <Icon className="w-12 h-12 text-amber-400 mb-3" />
                <p className="font-serif font-bold text-amber-200 mb-1">{relic.name}</p>
                <p className="text-slate-400 text-xs text-center max-w-[140px]">{relic.desc}</p>
                {owned && <p className="text-amber-500/80 text-xs mt-2">已拥有</p>}
              </motion.div>
            )
          })}
        </AnimatePresence>
        )}
      </div>
    </div>
  )
}
