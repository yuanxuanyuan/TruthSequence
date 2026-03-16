import { createContext, useCallback, useContext, useState, useEffect } from 'react'
import cardsData from '../data/cards.json'
import combosData from '../data/combos.json'
import { comboCardIds } from '../engine/evaluateCombo'

export const INIT_PLAYER_HP = 100
export const INIT_ENEMY_HP = 200

const SAVE_KEY = 'truth_sequence_save'

const GameContext = createContext(null)

/** 从 localStorage 读取存档，无效则返回 null */
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.deck)) return null
    return data
  } catch {
    return null
  }
}

/** 写入存档 */
function saveToStorage(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch (_) {}
}

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

function getInitialState() {
  const save = loadSave()
  if (!save) {
    return {
      playerCombat: { hp: INIT_PLAYER_HP, block: 0 },
      deck: [],
      floor: 0,
      currentView: 'home',
      relics: [],
      upgradedCards: new Set(),
      cardBonuses: {},
      backpackItems: {},
    }
  }
  return {
    playerCombat: save.playerCombat && typeof save.playerCombat.hp === 'number'
      ? { hp: save.playerCombat.hp, block: save.playerCombat.block ?? 0 }
      : { hp: INIT_PLAYER_HP, block: 0 },
    deck: Array.isArray(save.deck) ? save.deck : [],
    floor: typeof save.floor === 'number' ? save.floor : 0,
    currentView: typeof save.currentView === 'string' ? save.currentView : 'home',
    relics: Array.isArray(save.relics) ? save.relics : [],
    upgradedCards: new Set(Array.isArray(save.upgradedCards) ? save.upgradedCards : []),
    cardBonuses: typeof save.cardBonuses === 'object' && save.cardBonuses ? save.cardBonuses : {},
    backpackItems: typeof save.backpackItems === 'object' && save.backpackItems ? save.backpackItems : {},
  }
}

export function GameProvider({ children }) {
  const [playerCombat, setPlayerCombat] = useState(() => getInitialState().playerCombat)
  const playerHP = playerCombat.hp
  const playerBlock = playerCombat.block
  const [deck, setDeck] = useState(() => getInitialState().deck)
  const [floor, setFloor] = useState(() => getInitialState().floor)
  const [currentView, setCurrentView] = useState(() => getInitialState().currentView)

  const [relics, setRelics] = useState(() => getInitialState().relics)
  const [upgradedCards, setUpgradedCards] = useState(() => getInitialState().upgradedCards)
  const [cardBonuses, setCardBonuses] = useState(() => getInitialState().cardBonuses)
  const [backpackItems, setBackpackItems] = useState(() => getInitialState().backpackItems)
  const [bossHintBonus, setBossHintBonus] = useState(0)
  const [bossChainMode, setBossChainMode] = useState(false)
  const [bossChainAttackStart, setBossChainAttackStart] = useState(0)
  const [bossChainBlockStart, setBossChainBlockStart] = useState(0)
  const [bossChainWave, setBossChainWave] = useState(0)

  /** 持久化：有进行中的游戏时写入 localStorage */
  useEffect(() => {
    if (deck.length === 0) return
    saveToStorage({
      playerCombat: { hp: playerCombat.hp, block: playerCombat.block },
      deck,
      floor,
      currentView,
      relics,
      upgradedCards: [...upgradedCards],
      cardBonuses,
      backpackItems,
    })
  }, [deck, floor, currentView, playerCombat.hp, playerCombat.block, relics, upgradedCards, cardBonuses, backpackItems])

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

  const [lastUpgradedCards, setLastUpgradedCards] = useState([]) // [{ cardId, addedBonus, totalBonus }] BOSS 战结算用

  const levelUpRandomCards = useCallback(() => {
    const count = 50
    setDeck(d => {
      const unique = [...new Set(d)]
      const toLevel = shuffle(unique).slice(0, Math.min(count, unique.length))
      const adds = {}
      toLevel.forEach(cardId => {
        adds[cardId] = 3 + Math.floor(Math.random() * 6) // 3-8
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
    setBossChainMode(true)
    setBossChainWave(w => (w > 0 ? w + 1 : 1))
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

  /** 背包道具：击败 BOSS 获得。id 如 'scroll_upgrade_50'，count 为数量 */
  const addBackpackItem = useCallback((id, count = 1) => {
    if (!id || count < 1) return
    setBackpackItems(prev => ({ ...prev, [id]: (prev[id] ?? 0) + count }))
  }, [])

  /** 使用背包道具，成功返回 true 并扣 1 个，没有则返回 false */
  const useBackpackItem = useCallback((id) => {
    if (!id) return false
    let used = false
    setBackpackItems(prev => {
      const n = prev[id] ?? 0
      if (n <= 0) return prev
      used = true
      const next = { ...prev }
      if (next[id] === 1) delete next[id]
      else next[id] = next[id] - 1
      return next
    })
    return used
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
    setBossHintBonus(0)
    setBossChainMode(false)
    setBossChainAttackStart(0)
    setBossChainBlockStart(0)
    setBossChainWave(0)
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
    setBossHintBonus(0)
    setBossChainMode(false)
    setBossChainAttackStart(0)
    setBossChainBlockStart(0)
    setBossChainWave(0)
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
    backpackItems,
    addBackpackItem,
    useBackpackItem,
    bossHintBonus,
    setBossHintBonus,
    bossChainMode,
    bossChainAttackStart,
    setBossChainAttackStart,
    bossChainBlockStart,
    setBossChainBlockStart,
    bossChainWave,
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
