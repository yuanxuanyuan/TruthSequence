import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Heart, BookOpen, Trash2 } from 'lucide-react'
import { useGame } from '../store/gameState.jsx'
import { Card } from '../components/Card'
import cardsData from '../data/cards.json'
import { getComboSizesForCard } from '../engine/evaluateCombo'

export function CampView() {
  const { playerHP, INIT_PLAYER_HP, healPlayer, deck, upgradedCards, upgradeCard, removeCardFromDeck, finishCamp } = useGame()
  const [choice, setChoice] = useState(null) // 'rest' | 'upgrade' | 'forget'
  const [upgradeSelected, setUpgradeSelected] = useState(null)
  const [forgetSelected, setForgetSelected] = useState(null)
  const [done, setDone] = useState(false)

  const cardsById = Object.fromEntries(cardsData.map(c => [c.id, c]))
  const deckCards = deck.map(id => cardsById[id]).filter(Boolean)
  const healAmount = Math.ceil(INIT_PLAYER_HP * 0.3)

  const handleRest = () => {
    setChoice('rest')
    healPlayer(healAmount)
    setDone(true)
  }

  const handleUpgradeSelect = (cardId) => {
    if (upgradedCards.has(cardId)) return
    setUpgradeSelected(cardId)
    upgradeCard(cardId)
    setDone(true)
  }

  const handleForgetSelect = (cardId) => {
    setForgetSelected(cardId)
    removeCardFromDeck(cardId)
    setDone(true)
  }

  const handleContinue = () => {
    setChoice(null)
    setUpgradeSelected(null)
    setForgetSelected(null)
    setDone(false)
    finishCamp()
  }

  return (
    <div className="min-h-screen bg-void text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-slate-900/30 to-void" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.08)_0%,transparent_70%)]" />

      {/* 篝火装饰 */}
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 flex justify-center">
        <Flame className="w-16 h-16 text-amber-400/60" />
      </div>

      <header className="relative z-10 text-center py-8">
        <h1 className="font-serif text-2xl font-bold text-emerald-300 mb-2">自习室</h1>
        <p className="font-mono text-emerald-400/70 text-sm tracking-widest">短暂休整 · 温故知新</p>
        <p className="mt-2 text-slate-400 text-sm">HP {playerHP} / {INIT_PLAYER_HP}</p>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {!choice && !done && (
          <div className="relative w-96 h-72 flex items-center justify-center">
            {/* 三足鼎立布局：上、左下、右下 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRest}
              className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-xl bg-emerald-600/40 hover:bg-emerald-500/50 border border-emerald-400/50 text-left shadow-lg"
            >
              <Heart className="w-7 h-7 text-rose-400 flex-shrink-0" />
              <div>
                <p className="font-serif font-bold text-emerald-200">小憩</p>
                <p className="text-xs text-slate-400">回复 30% HP（+{healAmount}）</p>
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setChoice('upgrade')}
              className="absolute bottom-0 left-0 flex items-center gap-3 px-5 py-3 rounded-xl bg-cyan-600/40 hover:bg-cyan-500/50 border border-cyan-400/50 text-left shadow-lg"
            >
              <BookOpen className="w-7 h-7 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="font-serif font-bold text-cyan-200">温故知新</p>
                <p className="text-xs text-slate-400">升级一张卡牌</p>
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setChoice('forget')}
              className="absolute bottom-0 right-0 flex items-center gap-3 px-5 py-3 rounded-xl bg-violet-600/40 hover:bg-violet-500/50 border border-violet-400/50 text-left shadow-lg"
            >
              <Trash2 className="w-7 h-7 text-violet-300 flex-shrink-0" />
              <div>
                <p className="font-serif font-bold text-violet-200">知识迭代</p>
                <p className="text-xs text-slate-400">遗忘一张废牌</p>
              </div>
            </motion.button>
          </div>
        )}

        {choice === 'upgrade' && !upgradeSelected && !done && (
          <div className="w-full max-w-2xl">
            <p className="font-mono text-cyan-400/80 text-sm mb-4">选择一张卡牌升级</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {deckCards.map((card, i) => (
                <motion.div
                  key={`upgrade-${card.id}-${i}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => upgradedCards.has(card.id) ? undefined : handleUpgradeSelect(card.id)}
                  className={upgradedCards.has(card.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                >
                  <Card
                    card={card}
                    variant="hand"
                    upgraded={upgradedCards.has(card.id)}
                    disabled={upgradedCards.has(card.id)}
                  />
                  {upgradedCards.has(card.id) && (
                    <p className="text-xs text-amber-400 text-center mt-1">已升级</p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {choice === 'forget' && !forgetSelected && !done && (
          <div className="w-full max-w-3xl">
            <p className="font-mono text-violet-400/80 text-sm mb-4">选择一张卡牌遗忘（永久移除）</p>
            {deckCards.length <= 1 ? (
              <div className="flex flex-col items-center gap-4">
                <p className="text-slate-400 text-sm">卡组至少需保留一张卡，无法遗忘</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setChoice(null)}
                  className="px-6 py-2 font-mono text-sm rounded-lg bg-slate-600/60 hover:bg-slate-500/60 border border-slate-500/50"
                >
                  返回
                </motion.button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3 justify-center">
                <AnimatePresence>
                  {deckCards.map((card, i) => (
                    <motion.div
                      key={`forget-${card.id}-${i}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.05, borderColor: 'rgba(139,92,246,0.6)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleForgetSelect(card.id)}
                      className="cursor-pointer rounded-lg border-2 border-transparent p-1 transition-colors hover:border-violet-400/50"
                    >
                      <Card card={card} variant="hand" comboSizes={getComboSizesForCard(card.id)} />
                      <p className="text-xs text-violet-400/80 text-center mt-1">点击遗忘</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {(choice === 'rest' || upgradeSelected || forgetSelected) && (
          <p className="text-emerald-300 font-mono text-sm mb-6">
            {choice === 'rest' && `已回复 ${healAmount} HP`}
            {upgradeSelected && '卡牌已升级'}
            {forgetSelected && '已遗忘该卡牌'}
          </p>
        )}

        {done && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleContinue}
            className="px-8 py-3 font-mono text-sm tracking-widest rounded-lg bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-400/50"
          >
            继续前进
          </motion.button>
        )}
      </main>
    </div>
  )
}
