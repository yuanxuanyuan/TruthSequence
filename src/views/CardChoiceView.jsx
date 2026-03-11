import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../store/gameState.jsx'
import { Card } from '../components/Card'
import { getComboSizesForCard, comboCardIds } from '../engine/evaluateCombo'

const PICK_COUNT = 3

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function CardChoiceView() {
  const { cardsData, finishCardChoice } = useGame()
  const [choice, setChoice] = useState(null)

  const comboCards = useMemo(() => cardsData.filter(c => comboCardIds.has(c.id)), [cardsData])
  const options = useMemo(() => shuffle([...comboCards]).slice(0, Math.min(PICK_COUNT, comboCards.length)), [comboCards])

  const handleSelect = (card) => {
    setChoice(card.id)
    finishCardChoice(card.id)
  }

  return (
    <div className="min-h-screen bg-void text-white flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/30 via-transparent to-slate-900/40" />

      <div className="relative z-10 text-center mb-8">
        <h2 className="font-serif text-2xl font-bold text-cyan-300 mb-2">战斗胜利</h2>
        <p className="font-mono text-cyan-400/70 text-sm tracking-widest">选择一张卡牌加入卡组</p>
      </div>

      <div className="relative z-10 flex gap-8 justify-center flex-wrap px-6">
        <AnimatePresence mode="popLayout">
          {options.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="cursor-pointer"
              onClick={() => handleSelect(card)}
            >
              <motion.div whileHover={{ scale: 1.08, y: -8 }} whileTap={{ scale: 0.95 }}>
                <Card card={card} variant="hand" comboSizes={getComboSizesForCard(card.id)} />
                <p className="text-center text-cyan-400/80 text-xs mt-2 font-mono">点击选择</p>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
