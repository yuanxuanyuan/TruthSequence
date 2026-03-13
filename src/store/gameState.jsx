import { createContext, useCallback, useContext, useState } from 'react'
import cardsData from '../data/cards.json'
import combosData from '../data/combos.json'
import { comboCardIds } from '../engine/evaluateCombo'

export const INIT_PLAYER_HP = 100
export const INIT_ENEMY_HP = 200

const GameContext = createContext(null)

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickRandomCards(pool, n, excludeIds = []) {
  const available = pool.filter(c => !excludeIds.includes(c.id))
  return shuffle(available).slice(0, n).map(c => c.id)
}

export function GameProvider({ children }) {
  const [playerCombat, setPlayerCombat] = useState({ hp: INIT_PLAYER_HP, block: 0 })
  const playerHP = playerCombat.hp
  const playerBlock = playerCombat.block
  const [deck, setDeck] = useState([])
  const [floor, setFloor] = useState(0)
  const [currentView, setCurrentView] = useState('home')

  /** 对玩家造成伤害，优先扣 block，剩余扣 HP（单次 state 更新，避免 Strict Mode 双倍伤害） */
  const damagePlayer = useCallback((amount) => {
    if (amount <= 0) return
    setPlayerCombat(prev => {
      const afterBlock = Math.max(0, prev.block - amount)
      const overflow = Math.max(0, amount - prev.block)
      const afterHP = Math.max(0, prev.hp - overflow)
      return { hp: afterHP, block: afterBlock }
    })
  }, [])

  const addPlayerBlock = useCallback((amount) => {
    setPlayerCombat(prev => ({ ...prev, block: prev.block + amount }))
  }, [])

  const clearPlayerBlock = useCallback(() => {
    setPlayerCombat(prev => ({ ...prev, block: 0 }))
  }, [])

  const healPlayer = useCallback((amount) => {
    setPlayerCombat(prev => ({ ...prev, hp: Math.min(INIT_PLAYER_HP, prev.hp + amount) }))
  }, [])

  const [relics, setRelics] = useState([])
  const [upgradedCards, setUpgradedCards] = useState(new Set())
  const [cardBonuses, setCardBonuses] = useState({}) // { cardId: number } 每张卡的伤害加成，默认 0
  const [lastUpgradedCards, setLastUpgradedCards] = useState([]) // [{ cardId, addedBonus, totalBonus }] BOSS 战结算用

  const levelUpRandomCards = useCallback(() => {
    const count = 20 + Math.floor(Math.random() * 11) // 20-30
    setDeck(d => {
      const unique = [...new Set(d)]
      const toLevel = shuffle(unique).slice(0, Math.min(count, unique.length))
      const adds = {}
      toLevel.forEach(cardId => {
        adds[cardId] = 2 + Math.floor(Math.random() * 4)
      })
      setCardBonuses(prev => {
        const next = { ...prev }
        const result = []
        Object.entries(adds).forEach(([id, add]) => {
          const oldBonus = prev[id] ?? 0
          next[id] = oldBonus + add
          result.push({ cardId: id, addedBonus: add, totalBonus: oldBonus + add })
        })
        setLastUpgradedCards(result)
        return next
      })
      return d
    })
  }, [])

  const goToCardUpgradeResult = useCallback(() => setCurrentView('cardUpgradeResult'), [])
  const finishCardUpgradeResult = useCallback(() => {
    setCurrentView('postBossChoice')
  }, [])

  const [forceBossBattle, setForceBossBattle] = useState(false)
  const startBossBattle = useCallback(() => {
    setForceBossBattle(true)
    setCurrentView('battle')
  }, [])
  const clearForceBossBattle = useCallback(() => setForceBossBattle(false), [])

  const addCardToDeck = useCallback((cardId) => {
    if (!comboCardIds.has(cardId)) return
    setDeck(d => [...d, cardId])
  }, [])

  const removeCardFromDeck = useCallback((cardId) => {
    setDeck(d => {
      const idx = d.indexOf(cardId)
      if (idx === -1) return d
      return [...d.slice(0, idx), ...d.slice(idx + 1)]
    })
  }, [])

  const removeRandomCardFromDeck = useCallback(() => {
    setDeck(d => {
      if (d.length <= 0) return d
      const idx = Math.floor(Math.random() * d.length)
      return [...d.slice(0, idx), ...d.slice(idx + 1)]
    })
  }, [])

  const goToBattle = useCallback(() => setCurrentView('battle'), [])
  const goToHome = useCallback(() => setCurrentView('home'), [])
  const goToMap = useCallback(() => setCurrentView('map'), [])
  const goToCardChoice = useCallback(() => setCurrentView('cardChoice'), [])
  const goToCamp = useCallback(() => setCurrentView('camp'), [])
  const goToEvent = useCallback(() => setCurrentView('event'), [])
  const goToRelicReward = useCallback(() => setCurrentView('relicReward'), [])

  const upgradeCard = useCallback((cardId) => {
    setUpgradedCards(s => new Set([...s, cardId]))
  }, [])

  const addAdvancedCard = useCallback(() => {
    const available = cardsData.filter(c => comboCardIds.has(c.id))
    if (available.length === 0) return
    const picked = available[Math.floor(Math.random() * available.length)]
    setDeck(d => [...d, picked.id])
    setUpgradedCards(s => new Set([...s, picked.id]))
  }, [])

  const addRelic = useCallback((relicId) => {
    setRelics(r => (r.includes(relicId) ? r : [...r, relicId]))
  }, [])

  const startGame = useCallback(() => {
    setPlayerCombat({ hp: 100, block: 0 })
    const comboPool = cardsData.filter(c => comboCardIds.has(c.id))
    const twoCardCombos = combosData.filter(c => c.requires?.length === 2)
    const deckIds = new Set()
    if (twoCardCombos.length > 0 && comboPool.length > 0) {
      const shuffled = shuffle([...twoCardCombos])
      for (let i = 0; i < 4 && deckIds.size < 8; i++) {
        const combo = shuffled[i]
        const valid = combo.requires.filter(id => comboPool.some(c => c.id === id))
        if (valid.length === combo.requires.length) {
          combo.requires.forEach(id => deckIds.add(id))
        }
      }
    }
    const remain = 10 - deckIds.size
    if (remain > 0) {
      const rest = comboPool.filter(c => !deckIds.has(c.id))
      shuffle(rest).slice(0, remain).forEach(c => deckIds.add(c.id))
    }
    setDeck(shuffle([...deckIds]))
    setFloor(0)
    setRelics([])
    setUpgradedCards(new Set())
    setCardBonuses({})
    setCurrentView('map')
  }, [])

  const startTestGame = useCallback((subject) => {
    setPlayerCombat({ hp: 100, block: 0 })
    const validSubjects = subject === '' ? ['地理', '生物', '历史'] : [subject]
    const comboPool = cardsData.filter(c => comboCardIds.has(c.id) && validSubjects.includes(c.subject))
    const deckIds = comboPool.length > 0 ? comboPool.map(c => c.id) : []
    setDeck(shuffle(deckIds))
    setFloor(0)
    setRelics([])
    setUpgradedCards(new Set())
    setCardBonuses({})
    setCurrentView('battle')
  }, [])

  const finishCardChoice = useCallback((cardId) => {
    addCardToDeck(cardId)
    setFloor(f => f + 1)
    setCurrentView('map')
  }, [addCardToDeck])

  const finishCamp = useCallback(() => {
    setFloor(f => f + 1)
    setCurrentView('map')
  }, [])

  const finishEvent = useCallback(() => {
    setFloor(f => f + 1)
    setCurrentView('map')
  }, [])

  const finishRelicReward = useCallback((relicId) => {
    if (relicId) addRelic(relicId)
    setFloor(f => f + 1)
    setCurrentView('map')
  }, [addRelic])

  const value = {
    playerHP,
    playerBlock,
    deck,
    setDeck,
    floor,
    setFloor,
    currentView,
    setCurrentView,
    damagePlayer,
    addPlayerBlock,
    clearPlayerBlock,
    addCardToDeck,
    removeCardFromDeck,
    removeRandomCardFromDeck,
    goToBattle,
    goToHome,
    goToMap,
    goToCardChoice,
    goToCamp,
    goToEvent,
    goToRelicReward,
    relics,
    addRelic,
    finishCardChoice,
    finishCamp,
    finishEvent,
    finishRelicReward,
    healPlayer,
    upgradeCard,
    addAdvancedCard,
    upgradedCards,
    cardBonuses,
    levelUpRandomCards,
    lastUpgradedCards,
    goToCardUpgradeResult,
    finishCardUpgradeResult,
    forceBossBattle,
    startBossBattle,
    clearForceBossBattle,
    startGame,
    startTestGame,
    INIT_PLAYER_HP,
    INIT_ENEMY_HP,
    cardsData,
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
