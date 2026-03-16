import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Hand } from 'lucide-react'
import { useGame } from '../store/gameState.jsx'

function FloatingShape({ delay, duration, x, y, size, opacity }) {
  return (
    <motion.div
      className="absolute rounded-full border border-cyan-500/20"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        opacity,
      }}
      animate={{
        x: [0, 30, -20, 0],
        y: [0, -25, 15, 0],
        scale: [1, 1.2, 0.9, 1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatType: 'reverse',
      }}
    />
  )
}

const TEST_SUBJECTS = [
  { key: '', label: '所有' },
  { key: '地理', label: '地理' },
  { key: '生物', label: '生物' },
  { key: '历史', label: '历史' },
]

export function HomeView() {
  const { startTestGame, goToMap, deck } = useGame()
  const [testOpen, setTestOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const hasSave = deck && deck.length > 0

  const showComingSoon = () => {
    setToast('敬请期待')
    setTimeout(() => setToast(null), 1500)
  }

  const shapes = [
    { delay: 0, duration: 8, x: 10, y: 20, size: 80, opacity: 0.15 },
    { delay: 1, duration: 10, x: 85, y: 15, size: 60, opacity: 0.12 },
    { delay: 2, duration: 12, x: 5, y: 70, size: 100, opacity: 0.1 },
    { delay: 0.5, duration: 9, x: 90, y: 75, size: 50, opacity: 0.15 },
    { delay: 1.5, duration: 11, x: 50, y: 40, size: 40, opacity: 0.08 },
  ]

  return (
      <div className="min-h-screen bg-void text-white flex flex-col items-center justify-center relative overflow-hidden px-4 sm:px-0">
      {/* 背景 */}
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/30 via-slate-900/50 to-void" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

      {/* 缓慢浮动的几何粒子 */}
      {shapes.map((s, i) => (
        <FloatingShape key={i} {...s} />
      ))}
      <motion.div
        className="absolute w-64 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
        style={{ left: '20%', top: '35%' }}
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute w-48 h-px bg-gradient-to-r from-transparent via-teal-400/20 to-transparent"
        style={{ right: '15%', bottom: '40%' }}
        animate={{ opacity: [0.1, 0.4, 0.1] }}
        transition={{ duration: 5, delay: 1, repeat: Infinity }}
      />

      {/* 主标题区 */}
      <div className="relative z-10 text-center mb-16">
        <motion.h1
          className="font-serif text-6xl md:text-8xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-amber-200/90 drop-shadow-glow mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          真理序列
        </motion.h1>
        <motion.p
          className="text-cyan-200/80 text-lg tracking-[0.4em] font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          知识逻辑卡牌 Roguelike
        </motion.p>
      </div>

      {/* 按钮菜单 */}
      <nav className="relative z-10 flex flex-col gap-4">
        {hasSave ? (
          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(34,211,238,0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => goToMap()}
            className="px-12 py-4 font-mono text-lg tracking-widest rounded-lg
              bg-cyan-600/80 hover:bg-cyan-500/90 border border-cyan-400/50 text-cyan-100
              transition-colors"
          >
            继续游戏
          </motion.button>
        ) : (
          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(34,211,238,0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={showComingSoon}
            className="px-12 py-4 font-mono text-lg tracking-widest rounded-lg
              bg-cyan-600/80 hover:bg-cyan-500/90 border border-cyan-400/50 text-cyan-100
              transition-colors"
          >
            开启课题
          </motion.button>
        )}

        <motion.button
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          whileTap={{ scale: 0.98 }}
          onClick={showComingSoon}
          className="px-12 py-4 font-mono text-lg tracking-widest rounded-lg
            bg-slate-700/40 border border-slate-500/30 text-slate-400 cursor-pointer hover:bg-slate-700/50"
        >
          真理图鉴 · 敬请期待
        </motion.button>

        <div className="flex items-center justify-center gap-3 -ml-4">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9, duration: 0.4 }}
            className="flex items-center justify-center"
            style={{ transformOrigin: 'right center' }}
          >
            <motion.div
              animate={{ x: [0, 6, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
            >
              <Hand className="w-8 h-8 -scale-x-100" strokeWidth={2} />
            </motion.div>
          </motion.div>
          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setTestOpen(t => !t)}
            className="px-12 py-4 font-mono text-lg tracking-widest rounded-lg
              bg-amber-800/40 hover:bg-amber-700/50 border border-amber-500/40 text-amber-200
              transition-colors"
          >
            测试模式 {testOpen ? '▲' : '▼'}
          </motion.button>
        </div>
        <AnimatePresence>
          {testOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden flex flex-col items-center gap-2 mt-2"
            >
              <p className="text-amber-300/80 text-sm font-mono">选择学科 · 使用所有可连携卡牌</p>
              <div className="flex gap-2 flex-wrap justify-center">
                {TEST_SUBJECTS.map(({ key, label }) => (
                  <motion.button
                    key={label}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { startTestGame(key); setTestOpen(false) }}
                    className="px-6 py-2 font-mono text-sm rounded-lg
                      bg-amber-600/50 hover:bg-amber-500/60 border border-amber-400/50 text-amber-100
                      transition-colors"
                  >
                    {label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={showComingSoon}
          className="px-12 py-4 font-mono text-lg tracking-widest rounded-lg
            bg-slate-800/60 hover:bg-slate-700/70 border border-slate-500/40 text-slate-300
            transition-colors"
        >
          系统设置 · 敬请期待
        </motion.button>
      </nav>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg
              bg-amber-900/95 border border-amber-400/50 text-amber-200 font-mono text-lg
              shadow-[0_0_30px_rgba(251,191,36,0.3)]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
