import { motion } from 'framer-motion'
import { Swords, BookOpen, Shuffle } from 'lucide-react'
import { useGame } from '../store/gameState.jsx'
import { RelicBar } from '../components/RelicBar'

const NODE_TYPES = [
  { type: 'battle', label: '测验', icon: Swords, color: 'amber' },
  { type: 'rest', label: '自习室', icon: BookOpen, color: 'emerald' },
  { type: 'event', label: '随机事件', icon: Shuffle, color: 'violet' },
]

/** 生成一层的节点配置 (可扩展为随机生成) */
function getFloorNodes(floorIndex) {
  const types = ['battle', 'rest', 'event']
  return [
    { type: types[floorIndex % 3], id: `${floorIndex}-0` },
    { type: types[(floorIndex + 1) % 3], id: `${floorIndex}-1` },
    { type: types[(floorIndex + 2) % 3], id: `${floorIndex}-2` },
  ]
}

function MapNode({ node, onBattle, onCamp, onEvent }) {
  const config = NODE_TYPES.find(n => n.type === node.type)
  const Icon = config?.icon ?? Swords

  const colorMap = {
    amber: 'border-amber-500/60 hover:border-amber-400 hover:shadow-[0_0_24px_rgba(251,191,36,0.3)] bg-amber-500/10',
    emerald: 'border-emerald-500/60 hover:border-emerald-400 hover:shadow-[0_0_24px_rgba(52,211,153,0.3)] bg-emerald-500/10',
    violet: 'border-violet-500/60 hover:border-violet-400 hover:shadow-[0_0_24px_rgba(139,92,246,0.3)] bg-violet-500/10',
  }
  const colorClass = colorMap[config?.color] ?? colorMap.amber

  const handleClick = () => {
    if (node.type === 'battle') onBattle?.()
    else if (node.type === 'rest') onCamp?.()
    else if (node.type === 'event') onEvent?.()
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`flex flex-col items-center justify-center w-20 h-24 rounded-xl border-2 transition-all duration-200 ${colorClass}`}
    >
      <Icon className="w-8 h-8 mb-1" />
      <span className="text-xs font-mono">{config?.label}</span>
    </motion.button>
  )
}

export function MapView() {
  const { floor, playerHP, INIT_PLAYER_HP, relics, goToBattle, goToCamp, goToEvent } = useGame()
  const nodes = getFloorNodes(floor)

  return (
    <div className="min-h-screen bg-void text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/20 via-transparent to-slate-900/40" />

      {/* 顶部状态栏 */}
      <header className="relative z-10 flex justify-between items-center px-4 sm:px-8 py-4 sm:py-6 border-b border-cyan-500/20">
        <div className="flex items-center gap-6">
          <div className="font-mono text-cyan-400/80">
            <span className="text-slate-500">层数 </span>
            <span className="text-2xl font-bold text-cyan-300 tabular-nums">{floor}</span>
          </div>
          <RelicBar relicIds={relics} />
        </div>
        <div className="font-mono text-lg">
          <span className="text-slate-500">HP </span>
          <span className="font-bold text-rose-400 tabular-nums">{playerHP}</span>
          <span className="text-slate-500"> / {INIT_PLAYER_HP}</span>
        </div>
      </header>

      {/* 垂直节点路线图 */}
      <main className="relative z-10 flex-1 flex flex-col items-center py-12">
        <p className="font-mono text-cyan-400/60 text-sm tracking-[0.2em] mb-8">选择你的路径</p>

        <div className="flex flex-col items-center gap-6">
          {nodes.map((node, i) => (
            <div key={node.id} className="flex flex-col items-center">
              <MapNode node={node} onBattle={goToBattle} onCamp={goToCamp} onEvent={goToEvent} />
              {i < nodes.length - 1 && (
                <div className="w-0.5 h-12 bg-gradient-to-b from-cyan-500/40 to-cyan-500/10" />
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
