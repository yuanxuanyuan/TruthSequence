import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../store/gameState.jsx'
import { Card } from '../components/Card'
import cardsData from '../data/cards.json'

const cardsById = Object.fromEntries(cardsData.map(c => [c.id, c]))

export function CardUpgradeResultView() {
  const { lastUpgradedCards, finishCardUpgradeResult } = useGame()

  const cards = useMemo(() => {
    return lastUpgradedCards
      .map(({ cardId, addedBonus, totalBonus }) => {
        const card = cardsById[cardId] ?? cardsData.find(c => c.id === cardId)
        return card ? { card, addedBonus, totalBonus } : null
      })
      .filter(Boolean)
  }, [lastUpgradedCards])

  return (
    <div className="min-h-screen bg-void text-white flex flex-col items-center relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-transparent to-slate-900/40" />

      <div className="relative z-10 text-center py-8 px-4">
        <h2 className="font-serif text-2xl font-bold text-amber-300 mb-2">Boss 击败</h2>
        <p className="font-mono text-amber-400/70 text-sm tracking-widest mb-1">卡牌强化</p>
        <p className="text-slate-400 text-xs">共强化 {cards.length} 张卡牌</p>
      </div>

      <div className="relative z-10 flex-1 w-full max-w-4xl px-4 pb-8 overflow-y-auto">
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4">
          {cards.map(({ card, addedBonus, totalBonus }, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: i * 0.04,
                duration: 0.3,
                type: 'spring',
                stiffness: 200,
                damping: 20,
              }}
              className="relative"
            >
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ delay: i * 0.04 + 0.25, duration: 0.25 }}
                className="relative"
              >
                <Card
                  card={card}
                  variant="hand"
                  bonus={totalBonus}
                  comboSizes={[]}
                  disabled
                  bonusPosition="top-center"
                />
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 + 0.2, duration: 0.4 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <span className="font-mono font-bold text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                    style={{ fontSize: 'clamp(1.25rem, 4vw, 2rem)' }}
                  >
                    +{addedBonus}
                  </span>
                </motion.span>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="relative z-10 pb-12">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={finishCardUpgradeResult}
          className="px-10 py-3 font-mono text-sm rounded-lg bg-amber-600/80 hover:bg-amber-500
            border border-amber-400/50 text-amber-100"
        >
          继续
        </motion.button>
      </div>
    </div>
  )
}
