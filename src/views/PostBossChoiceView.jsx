import { motion } from 'framer-motion'
import { Swords, Home } from 'lucide-react'
import { useGame } from '../store/gameState.jsx'

export function PostBossChoiceView() {
  const { startBossBattle, goToHome } = useGame()

  return (
    <div className="min-h-screen bg-void text-white flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-transparent to-slate-900/40" />

      <div className="relative z-10 text-center mb-12">
        <h2 className="font-serif text-2xl font-bold text-amber-300 mb-2">Boss 击败</h2>
        <p className="font-mono text-amber-400/70 text-sm tracking-widest">选择下一步</p>
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row gap-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={startBossBattle}
          className="flex flex-col items-center gap-3 px-10 py-6 rounded-xl border-2
            border-amber-500/60 bg-amber-500/10 hover:border-amber-400
            hover:shadow-[0_0_24px_rgba(251,191,36,0.3)] transition-all"
        >
          <Swords className="w-10 h-10 text-amber-400" />
          <span className="font-mono text-amber-200">继续游戏</span>
          <span className="text-xs text-slate-400">再来一场 Boss 战</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={goToHome}
          className="flex flex-col items-center gap-3 px-10 py-6 rounded-xl border-2
            border-cyan-500/60 bg-cyan-500/10 hover:border-cyan-400
            hover:shadow-[0_0_24px_rgba(34,211,238,0.3)] transition-all"
        >
          <Home className="w-10 h-10 text-cyan-400" />
          <span className="font-mono text-cyan-200">主界面</span>
          <span className="text-xs text-slate-400">返回开始界面</span>
        </motion.button>
      </div>
    </div>
  )
}
