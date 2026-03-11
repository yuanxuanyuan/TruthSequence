import { Compass, Microscope, Clock } from 'lucide-react'
import relicsData from '../data/relics.json'

const ICON_MAP = { Compass, Microscope, Clock }

export function RelicBar({ relicIds = [] }) {
  if (relicIds.length === 0) return null

  const relics = relicIds.map(id => relicsData.find(r => r.id === id)).filter(Boolean)

  return (
    <div className="flex items-center gap-2" title="遗物">
      {relics.map(relic => {
        const Icon = ICON_MAP[relic.icon] ?? Compass
        return (
          <div
            key={relic.id}
            className="group relative flex items-center justify-center w-8 h-8 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:border-amber-400/60 transition-colors cursor-help"
            title={`${relic.name}: ${relic.desc}`}
          >
            <Icon className="w-4 h-4 text-amber-400" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs bg-slate-800 border border-amber-500/40 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              <span className="font-bold text-amber-200">{relic.name}</span>
              <span className="text-slate-400 ml-1">·</span>
              <span className="text-slate-300">{relic.desc}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
