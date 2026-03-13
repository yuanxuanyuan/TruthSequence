import { GameProvider, useGame } from './store/gameState.jsx'
import { HomeView } from './views/HomeView'
import { MapView } from './views/MapView'
import { BattleView } from './views/BattleView'
import { CardChoiceView } from './views/CardChoiceView'
import { CampView } from './views/CampView'
import { EventView } from './views/EventView'
import { RelicRewardView } from './views/RelicRewardView'
import { CardUpgradeResultView } from './views/CardUpgradeResultView'
import { PostBossChoiceView } from './views/PostBossChoiceView'

function GameRouter() {
  const { currentView } = useGame()

  if (currentView === 'home') return <HomeView />
  if (currentView === 'battle') return <BattleView />
  if (currentView === 'cardChoice') return <CardChoiceView />
  if (currentView === 'camp') return <CampView />
  if (currentView === 'event') return <EventView />
  if (currentView === 'relicReward') return <RelicRewardView />
  if (currentView === 'cardUpgradeResult') return <CardUpgradeResultView />
  if (currentView === 'postBossChoice') return <PostBossChoiceView />
  return <MapView />
}

function App() {
  return (
    <div className="min-h-screen bg-void text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-cyber-dark/50 via-transparent to-cyber-dark/30" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

      <main className="relative z-10 min-h-screen">
        <GameProvider>
          <GameRouter />
        </GameProvider>
      </main>
    </div>
  )
}

export default App
