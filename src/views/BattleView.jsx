import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Zap, X, Swords, Shield, Skull, Info } from 'lucide-react'
import { RelicBar } from '../components/RelicBar'
import { useGame } from '../store/gameState.jsx'
import cardsData from '../data/cards.json'
import combosData from '../data/combos.json'
import enemiesData from '../data/enemies.json'
import { evaluateCombo, getComboSizesForCard, comboCardIds } from '../engine/evaluateCombo'
import { Card } from '../components/Card'

const HAND_SIZE = 8
const HINTS_PER_BATTLE = 3

/** 将 factText 中的【】「」《》等标签及数字+单位高亮，提升可读性 */
function renderFactText(text) {
  if (!text || typeof text !== 'string') return null
  const parts = []
  const re = /(【[^】]+】|「[^」]+」|《[^》]+》|\d+[%℃°米毫米Mm²³\-–—]+)/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: text.slice(last, m.index), k: false })
    const raw = m[1]
    const isNum = /^\d+/.test(raw)
    parts.push({ t: raw, k: true, num: isNum })
    last = m.index + raw.length
  }
  if (last < text.length) parts.push({ t: text.slice(last), k: false })
  return parts.map((p, i) =>
    p.k ? (
      <span key={i} className={p.num ? 'text-cyan-300 font-medium' : 'text-amber-300'}>{p.t}</span>
    ) : (
      <span key={i}>{p.t}</span>
    )
  )
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 从抽牌堆抽 n 张，保证至少 80% 可组成连携；不够则洗弃牌堆 */
function drawCards(drawPile, discardPile, n) {
  const pool = [...drawPile]
  const discard = [...discardPile]
  if (pool.length === 0) return { drawn: [], drawPile: [], discardPile: discard }
  const poolSet = new Set(pool)
  const formableCombos = shuffle(combosData.filter(c => c.requires?.length && c.requires.every(id => poolSet.has(id))))
  const formableIds = new Set(formableCombos.flatMap(c => c.requires))
  const shuffledFormable = shuffle([...formableIds].filter(id => pool.includes(id)))
  const targetFormable = Math.min(Math.ceil(n * 0.8), shuffledFormable.length, pool.length)
  const formableArr = shuffledFormable
  const drawnFormable = formableArr.slice(0, targetFormable)
  const restPool = pool.filter(id => !drawnFormable.includes(id))
  const needMore = n - drawnFormable.length
  const drawnRest = needMore > 0 ? shuffle(restPool).slice(0, needMore) : []
  const drawn = shuffle([...drawnFormable, ...drawnRest])
  const drawnSet = new Set(drawn)
  const remaining = pool.filter(id => !drawnSet.has(id))
  return { drawn, drawPile: remaining, discardPile: discard }
}

function pickRandomEnemy() {
  return enemiesData[Math.floor(Math.random() * enemiesData.length)]
}

export function BattleView() {
  const { playerHP, playerBlock, damagePlayer, addPlayerBlock, clearPlayerBlock, deck, relics, goToCardChoice, goToRelicReward, upgradedCards } = useGame()
  const [modal, setModal] = useState(null)
  const [syllabusOpen, setSyllabusOpen] = useState(false)
  const [hintRemaining, setHintRemaining] = useState(HINTS_PER_BATTLE)
  const [hintHighlightCards, setHintHighlightCards] = useState([])
  const [hintToast, setHintToast] = useState(null)
  const hintClearRef = useRef(null)
  const [rethinkUsed, setRethinkUsed] = useState(false)
  const [sacrificeSelected, setSacrificeSelected] = useState(new Set())
  const [sacrificeMode, setSacrificeMode] = useState(false)
  const battleWonRef = useRef(false)

  // 卡牌循环
  const [drawPile, setDrawPile] = useState([])
  const [hand, setHand] = useState([])
  const [discardPile, setDiscardPile] = useState([])
  const [synthesis, setSynthesis] = useState([])
  // 敌人
  const [enemy, setEnemy] = useState(null)
  const [enemyHP, setEnemyHP] = useState(0)
  const [enemyBlock, setEnemyBlock] = useState(0)
  const [enemyActionIndex, setEnemyActionIndex] = useState(0)

  const cardsById = useMemo(() => Object.fromEntries(cardsData.map(c => [c.id, c])), [])
  const hintCombos = useMemo(() => {
    const deckSet = new Set(deck)
    const relevant = combosData.filter(c => c.requires.some(id => deckSet.has(id)))
    if (relevant.length > 0) return relevant.slice(0, 12)
    return combosData.slice(0, 8)
  }, [deck])

  // 检查一组手牌里是否至少包含一套完整连携
  const ensureHandHasCombo = useCallback((initHand, fullDeck) => {
    if (!initHand || initHand.length === 0) return { hand: initHand, pile: fullDeck }
    const deckSet = new Set(fullDeck)
    const candidateCombos = shuffle(combosData.filter(c => c.requires?.length > 0 && c.requires.every(id => deckSet.has(id))))
    if (candidateCombos.length === 0) return { hand: initHand, pile: fullDeck }

    const hasFull = (handIds) => {
      const s = new Set(handIds)
      return candidateCombos.some(c => c.requires.every(id => s.has(id)))
    }
    if (hasFull(initHand)) return { hand: initHand, pile: fullDeck }

    // 尝试通过从牌堆中换牌，强行塞入一套完整连携到起手
    for (const combo of candidateCombos) {
      const required = combo.requires
      const requiredSet = new Set(required)
      const handSet = new Set(initHand)
      const missing = required.filter(id => !handSet.has(id))
      if (missing.length === 0) {
        return { hand: initHand, pile: fullDeck }
      }
      const replaceable = initHand.filter(id => !requiredSet.has(id))
      if (replaceable.length < missing.length) continue

      const newHand = [...initHand]
      const toRemove = replaceable.slice(0, missing.length)
      const missingQueue = [...missing]
      for (let i = 0; i < newHand.length && missingQueue.length > 0; i++) {
        const id = newHand[i]
        const idx = toRemove.indexOf(id)
        if (idx !== -1) {
          newHand[i] = missingQueue.shift()
          toRemove.splice(idx, 1)
        }
      }
      const newHandSet = new Set(newHand)
      const newPile = fullDeck.filter(id => !newHandSet.has(id))
      if (hasFull(newHand)) {
        return { hand: newHand, pile: newPile }
      }
    }

    return { hand: initHand, pile: fullDeck }
  }, [])

  // 在给定手牌 + 抽牌堆 + 弃牌堆的前提下，尽量保证手牌里至少有一条完整连携线
  // discardLocked：弃牌堆中不可被换回手牌的 ID 集合（如刚验证用掉的 synthesis 卡）
  const ensureHandHasComboWithPiles = useCallback((handIds, drawIds, discardIds, discardLocked = new Set()) => {
    if (!handIds || handIds.length === 0) {
      return { hand: handIds, drawPile: drawIds, discardPile: discardIds }
    }

    const fullDeck = [...handIds, ...drawIds, ...discardIds]
    const deckSet = new Set(fullDeck)
    const candidateCombos = shuffle(combosData.filter(
      c => c.requires?.length > 0 && c.requires.every(id => deckSet.has(id)),
    ))
    if (candidateCombos.length === 0) {
      return { hand: handIds, drawPile: drawIds, discardPile: discardIds }
    }

    const hasFull = (h) => {
      const s = new Set(h)
      return candidateCombos.some(c => c.requires.every(id => s.has(id)))
    }
    if (hasFull(handIds)) {
      return { hand: handIds, drawPile: drawIds, discardPile: discardIds }
    }

    for (const combo of candidateCombos) {
      const required = combo.requires
      const requiredSet = new Set(required)
      const handSet = new Set(handIds)
      const missing = required.filter(id => !handSet.has(id))
      if (missing.length === 0) {
        return { hand: handIds, drawPile: drawIds, discardPile: discardIds }
      }
      const replaceable = handIds.filter(id => !requiredSet.has(id))
      if (replaceable.length < missing.length) continue
      // 抽牌堆未用完前不抽回弃牌堆的卡；用完后才允许从弃牌堆换（且不在 discardLocked 中）
      const canPull = drawIds.length > 0
        ? (id) => drawIds.includes(id)
        : (id) => discardIds.includes(id) && !discardLocked.has(id)
      if (!missing.every(canPull)) continue

      const newHand = [...handIds]
      const outCards = []
      const missingQueue = [...missing]
      for (let i = 0; i < newHand.length && missingQueue.length > 0; i++) {
        const id = newHand[i]
        if (requiredSet.has(id)) continue
        const needed = missingQueue.shift()
        outCards.push(id)
        newHand[i] = needed
      }

      if (missingQueue.length > 0) continue

      let newDraw = [...drawIds]
      let newDiscard = [...discardIds, ...outCards]

      for (const needed of missing) {
        const dIdx = newDraw.indexOf(needed)
        if (dIdx !== -1) {
          newDraw.splice(dIdx, 1)
        } else {
          const dcIdx = newDiscard.indexOf(needed)
          if (dcIdx === -1) {
            // 兜底失败则放弃本次调整
            newDraw = drawIds
            newDiscard = discardIds
            break
          }
          newDiscard.splice(dcIdx, 1)
        }
      }

      if (!hasFull(newHand)) {
        continue
      }

      return { hand: newHand, drawPile: newDraw, discardPile: newDiscard }
    }

    return { hand: handIds, drawPile: drawIds, discardPile: discardIds }
  }, [])

  // 战斗初始化 + 首次抽牌
  useEffect(() => {
    clearPlayerBlock()
    const e = pickRandomEnemy()
    const shuffledDeck = shuffle([...deck])
    const firstDraw = drawCards(shuffledDeck, [], HAND_SIZE)
    const ensured = ensureHandHasCombo(firstDraw.drawn, shuffledDeck)
    const handToUse = ensured.hand
    const pileToUse = ensured.pile
    const remainingSet = new Set(handToUse)
    const finalDrawPile = pileToUse.filter(id => !remainingSet.has(id))
    setEnemy(e)
    setEnemyHP(e.hp)
    setEnemyBlock(0)
    setDrawPile(finalDrawPile)
    setHand(handToUse)
    setDiscardPile([])
    setSynthesis([])
    setRethinkUsed(false)
    setSacrificeSelected(new Set())
    setSacrificeMode(false)
    setHintRemaining(HINTS_PER_BATTLE)
    setHintHighlightCards([])
    setHintToast(null)
  }, [deck, clearPlayerBlock])

  useEffect(() => () => {
    if (hintClearRef.current) clearTimeout(hintClearRef.current)
  }, [])

  const useComboHint = useCallback(() => {
    if (hintRemaining <= 0) return
    const availableIds = new Set([...hand, ...synthesis].map(String))
    const highlight = []
    for (const c of combosData) {
      if (!c.requires?.length) continue
      const allAvailable = c.requires.every(id => availableIds.has(String(id)))
      if (allAvailable) {
        c.requires.forEach(id => {
          const sid = String(id)
          if (!highlight.includes(sid)) highlight.push(sid)
        })
      }
    }
    setHintHighlightCards(highlight)
    const consumed = highlight.length > 0 || Math.random() < 0.4
    if (consumed) setHintRemaining(r => r - 1)
    const remain = hintRemaining - (consumed ? 1 : 0)
    setHintToast(highlight.length > 0 ? `使用了一次提示，还剩 ${remain} 次提示` : (consumed ? `未发现可连携组合，消耗 1 次，还剩 ${remain} 次` : `未发现可连携组合，60%概率未消耗，还剩 ${remain} 次`))
    if (hintClearRef.current) clearTimeout(hintClearRef.current)
    hintClearRef.current = setTimeout(() => {
      setHintHighlightCards([])
      setHintToast(null)
      hintClearRef.current = null
    }, 2000)
  }, [hand, synthesis, hintRemaining])

  const handCards = hand.map(id => cardsById[id]).filter(Boolean)
  const synthesisCards = synthesis.map(id => cardsById[id]).filter(Boolean)

  const nextIntent = enemy && enemy.actions[enemyActionIndex % enemy.actions.length]

  const moveToSynthesis = (cardId) => {
    if (synthesis.length >= 4) return
    setSynthesis(s => {
      if (s.includes(cardId)) return s
      return [...s, cardId]
    })
    setHand(h => h.filter(id => id !== cardId))
  }

  const returnToHand = (cardId) => {
    setSynthesis(s => s.filter(id => id !== cardId))
    setHand(h => [...h, cardId])
  }

  const closeModal = () => {
    if (battleWonRef.current) {
      if (enemy?.boss) goToRelicReward()
      else goToCardChoice()
    }
    setModal(null)
  }

  const validateLogic = () => {
    if (synthesis.length === 0) return
    const result = evaluateCombo(synthesis, undefined, relics)
    const combinedDiscard = [...discardPile, ...synthesis]
    const combinedPool = shuffle([...hand, ...drawPile])
    const { drawn, drawPile: rawDp, discardPile: rawDcp } = drawCards(combinedPool, combinedDiscard, HAND_SIZE)
    drawn.filter(id => id === 'curse_celestial_dream').forEach(() => damagePlayer(2))
    const ensured = ensureHandHasComboWithPiles(drawn, rawDp, rawDcp, new Set(synthesis))
    setDrawPile(ensured.drawPile)
    setDiscardPile(ensured.discardPile)
    setHand(ensured.hand)
    setSynthesis([])
    if (result.success) {
      const dmg = result.damage ?? 0
      const afterBlock = Math.max(0, enemyBlock - dmg)
      const overflow = Math.max(0, dmg - enemyBlock)
      const newEnemyHP = Math.max(0, enemyHP - overflow)
      setEnemyBlock(afterBlock)
      setEnemyHP(newEnemyHP)
      if (result.block > 0) addPlayerBlock(result.block)
      setModal({
        type: 'success',
        factText: result.factText,
        comboName: result.comboName,
        damage: dmg,
        block: result.block ?? 0,
      })
      if (newEnemyHP <= 0) battleWonRef.current = true
    } else {
      damagePlayer(result.backlashDamage)
      setModal({ type: 'fail', message: result.message, backlashDamage: result.backlashDamage })
    }
  }

  const endTurn = () => {
    if (!enemy) return
    const intent = nextIntent
    setEnemyBlock(0)
    if (intent?.type === 'attack') damagePlayer(intent.value)
    if (intent?.type === 'defend') setEnemyBlock(b => b + intent.value)
    setEnemyActionIndex(i => i + 1)
    let currentHand = [...hand]
    let toDiscard = []
    if (intent?.type === 'discard' && intent.value > 0) {
      toDiscard = shuffle([...hand]).slice(0, Math.min(intent.value, hand.length))
      currentHand = hand.filter(id => !toDiscard.includes(id))
    }
    const combinedDiscard = [...discardPile, ...toDiscard, ...currentHand]
    let dp = drawPile
    if (intent?.type === 'curse' && comboCardIds.has(intent.value)) dp = [...drawPile, intent.value]
    const drawCount = Math.max(1, HAND_SIZE - (intent?.type === 'discard' ? (intent.value ?? 0) : 0))
    const { drawn, drawPile: rawDp, discardPile: rawDcp } = drawCards(dp, combinedDiscard, drawCount)
    drawn.filter(id => id === 'curse_celestial_dream').forEach(() => damagePlayer(2))
    const ensured = ensureHandHasComboWithPiles(drawn, rawDp, rawDcp)
    setDrawPile(ensured.drawPile)
    setDiscardPile(ensured.discardPile)
    clearPlayerBlock()
    setHand(drawn)
  }

  const handleHandCardClick = (cardId) => {
    if (sacrificeMode) {
      toggleSacrificeSelect(cardId)
    } else {
      moveToSynthesis(cardId)
    }
  }

  const toggleSacrificeSelect = (cardId) => {
    setSacrificeSelected(s => {
      const next = new Set(s)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  const sacrificeDiscard = () => {
    if (sacrificeSelected.size === 0) {
      setSacrificeMode(m => !m)
      if (!sacrificeMode) setSacrificeSelected(new Set())
      return
    }
    const toDiscard = [...sacrificeSelected]
    const discardSet = new Set(toDiscard)
    const damagePerCard = 2
    const totalDamage = damagePerCard * toDiscard.length
    damagePlayer(totalDamage)
    setSacrificeSelected(new Set())
    const combinedDiscard = [...discardPile, ...toDiscard]
    const { drawn, drawPile: rawDp, discardPile: rawDcp } = drawCards(drawPile, combinedDiscard, toDiscard.length)
    const keptHand = hand.filter(id => !discardSet.has(id))
    const baseHand = [...keptHand, ...drawn]
    const ensured = ensureHandHasComboWithPiles(baseHand, rawDp, rawDcp)
    setDrawPile(ensured.drawPile)
    setDiscardPile(ensured.discardPile)
    setHand(ensured.hand)
    setSacrificeMode(false)
  }

  const rethinkHand = () => {
    if (rethinkUsed) return
    const combinedDiscard = [...discardPile, ...hand]
    const { drawn, drawPile: rawDp, discardPile: rawDcp } = drawCards(drawPile, combinedDiscard, HAND_SIZE)
    const ensured = ensureHandHasComboWithPiles(drawn, rawDp, rawDcp)
    setDrawPile(ensured.drawPile)
    setDiscardPile(ensured.discardPile)
    setHand(ensured.hand)
    setRethinkUsed(true)
  }

  if (!enemy) return null

  return (
    <div className="min-h-screen bg-void text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/20 via-transparent to-slate-900/40" />

      {/* 顶部 HP */}
      <header className="relative z-10 flex justify-between items-center px-8 py-6 border-b border-cyan-500/20">
        <div className="flex items-center gap-4">
          <RelicBar relicIds={relics} />
          <Heart className="w-6 h-6 text-rose-400" />
          <span className="font-mono text-lg">玩家</span>
          <span className="font-mono text-2xl font-bold text-cyan-300 tabular-nums">{playerHP}</span>
          <span className="text-slate-500">/ 100</span>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSyllabusOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/30 transition-colors"
            title="玩法帮助"
          >
            <Info className="w-5 h-5 text-cyan-400" />
            <span className="font-mono text-sm text-cyan-300">玩法帮助</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={useComboHint}
            disabled={hintRemaining <= 0}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${hintRemaining > 0 ? 'bg-amber-500/20 border-amber-400/40 hover:bg-amber-500/30' : 'bg-slate-700/50 border-slate-500/30 cursor-not-allowed opacity-60'}`}
            title={hintRemaining > 0 ? `连携提示（剩余 ${hintRemaining} 次）` : '提示已用完'}
          >
            <Info className={`w-5 h-5 ${hintRemaining > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
            <span className={`font-mono text-sm ${hintRemaining > 0 ? 'text-amber-300' : 'text-slate-500'}`}>连携提示 ({hintRemaining})</span>
          </motion.button>
          {playerBlock > 0 && (
            <span className="flex items-center gap-1 text-cyan-400">
              <Shield className="w-5 h-5" />
              <span className="font-mono font-bold tabular-nums">{playerBlock}</span>
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {/* 敌人意图 */}
          {nextIntent && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
              nextIntent.type === 'attack'
                ? 'bg-rose-500/20 border border-rose-400/50'
                : nextIntent.type === 'curse'
                  ? 'bg-violet-500/20 border border-violet-400/50'
                  : nextIntent.type === 'discard'
                    ? 'bg-amber-500/20 border border-amber-400/50'
                    : 'bg-cyan-500/20 border border-cyan-400/50'
            }`}>
              {nextIntent.type === 'attack' ? (
                <Swords className="w-4 h-4 text-rose-400" />
              ) : nextIntent.type === 'curse' ? (
                <Skull className="w-4 h-4 text-violet-400" />
              ) : nextIntent.type === 'discard' ? (
                <X className="w-4 h-4 text-amber-400" />
              ) : (
                <Shield className="w-4 h-4 text-cyan-400" />
              )}
              <span className="font-mono text-sm">{nextIntent.desc ?? nextIntent.value}</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="text-3xl sm:text-4xl min-w-[2rem] text-center" title={enemy.name}>
                {enemy.avatar ? String(enemy.avatar) : <Zap className="w-8 h-8 text-amber-400 inline" />}
              </span>
              <div className="flex flex-col">
                <span className="font-mono text-lg font-bold text-amber-200">{enemy.name}</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-xl font-bold text-amber-300 tabular-nums">{enemyHP}</span>
                  <span className="text-slate-500 font-mono text-sm">/ {enemy.hp}</span>
                </div>
              </div>
            </div>
            <div className="w-32 sm:w-40 h-2 rounded-full bg-slate-700 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
                initial={false}
                animate={{ width: `${Math.max(0, (enemyHP / enemy.hp) * 100)}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            {enemyBlock > 0 && (
              <span className="flex items-center gap-1 text-cyan-400">
                <Shield className="w-5 h-5" />
                <span className="font-mono font-bold tabular-nums">{enemyBlock}</span>
              </span>
            )}
          </div>
        </div>
      </header>

      <section className="relative z-10 flex-1 flex flex-col items-center justify-center py-8">
        <p className="font-mono text-cyan-400/80 text-sm tracking-[0.3em] mb-4">真理合成台</p>
        <div className="relative p-8 rounded-xl border-2 border-dashed border-cyan-400/50 bg-slate-900/60 backdrop-blur-md
          shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_0_40px_rgba(34,211,238,0.12),inset_0_0_60px_rgba(0,0,0,0.2)]
          transition-shadow duration-300 animate-[synthesis-pulse_3s_ease-in-out_infinite]">
          <div className="absolute -top-px -left-px w-10 h-10 border-l-2 border-t-2 border-dashed border-cyan-400/50 rounded-tl" />
          <div className="absolute -top-px -right-px w-10 h-10 border-r-2 border-t-2 border-dashed border-cyan-400/50 rounded-tr" />
          <div className="absolute -bottom-px -left-px w-10 h-10 border-l-2 border-b-2 border-dashed border-cyan-400/50 rounded-bl" />
          <div className="absolute -bottom-px -right-px w-10 h-10 border-r-2 border-b-2 border-dashed border-cyan-400/50 rounded-br" />

          <div className="flex gap-4 justify-center items-center min-h-[140px] min-w-[320px]">
            <AnimatePresence mode="popLayout">
              {synthesisCards.map(card => (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className={hintHighlightCards.includes(String(card.id)) ? 'hint-card-glow rounded-lg' : ''}
                  style={hintHighlightCards.includes(String(card.id)) ? { boxShadow: '0 0 0 4px rgba(251,191,36,0.9), 0 0 40px rgba(251,191,36,0.95), 0 0 70px rgba(251,191,36,0.6)' } : undefined}
                >
                  <Card card={card} onClick={() => returnToHand(card.id)} variant="synthesis" upgraded={upgradedCards?.has?.(card.id)} comboSizes={getComboSizesForCard(card.id)} />
                </motion.div>
              ))}
              {Array.from({ length: 4 - synthesisCards.length }).map((_, i) => (
                <div
                  key={`slot-${i}`}
                  className="w-20 min-w-20 aspect-[7/12] rounded-lg border border-dashed border-cyan-500/30 bg-cyan-500/5"
                />
              ))}
            </AnimatePresence>
          </div>

          <div className="flex justify-center gap-4 mt-6 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={validateLogic}
              disabled={synthesis.length === 0}
              className="px-8 py-3 font-mono text-sm tracking-widest rounded-lg
                bg-cyan-600/80 hover:bg-cyan-500/90 disabled:bg-slate-700/50 disabled:cursor-not-allowed
                border border-cyan-400/50 text-cyan-100
                shadow-[0_0_20px_rgba(34,211,238,0.2)]
                transition-colors"
            >
              验证逻辑
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={endTurn}
              className="px-8 py-3 font-mono text-sm tracking-widest rounded-lg
                bg-amber-600/80 hover:bg-amber-500/90 border border-amber-400/50 text-amber-100
                transition-colors"
            >
              结束回合
            </motion.button>
            <motion.button
              whileHover={!rethinkUsed ? { scale: 1.02 } : {}}
              whileTap={!rethinkUsed ? { scale: 0.98 } : {}}
              onClick={rethinkHand}
              disabled={rethinkUsed}
              className={`px-8 py-3 font-mono text-sm tracking-widest rounded-lg border transition-colors
                ${rethinkUsed
                  ? 'bg-slate-700/50 border-slate-500/30 text-slate-500 cursor-not-allowed'
                  : 'bg-violet-600/80 hover:bg-violet-500/90 border-violet-400/50 text-violet-100'
                }`}
              title={rethinkUsed ? '本场战斗已使用' : '丢弃所有手牌，立刻重抽 8 张（每场限 1 次）'}
            >
              整理思绪
            </motion.button>
            <motion.button
              whileHover={{ scale: sacrificeSelected.size > 0 ? 1.02 : 1 }}
              whileTap={{ scale: 0.98 }}
              onClick={sacrificeDiscard}
              className={`px-8 py-3 font-mono text-sm tracking-widest rounded-lg border transition-colors
                ${sacrificeMode || sacrificeSelected.size > 0
                  ? 'bg-rose-600/80 hover:bg-rose-500/90 border-rose-400/50 text-rose-100'
                  : 'bg-slate-700/50 hover:bg-slate-600/60 border-slate-500/40 text-slate-300'
                }`}
              title="选择手牌献祭：每弃 1 张受到 2 点伤害，并重抽等量新牌"
            >
              {sacrificeSelected.size > 0
                ? `献祭弃牌 (${sacrificeSelected.size}张)`
                : sacrificeMode
                  ? '献祭弃牌 · 点击手牌选择'
                  : '献祭弃牌'}
            </motion.button>
          </div>
        </div>
      </section>

      {/* 连携提示 Toast */}
      <AnimatePresence>
        {hintToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-amber-900/90 border border-amber-400/50 text-amber-200 font-mono text-sm shadow-lg"
          >
            {hintToast}
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="relative z-10 border-t border-cyan-500/20 bg-slate-950/60 backdrop-blur py-6 min-h-[180px]">
        <p className="font-mono text-cyan-400/60 text-xs tracking-[0.2em] text-center mb-4">
          手牌区 · 抽牌堆 {drawPile.length} / 弃牌堆 {discardPile.length}
        </p>
        <div className="flex justify-center gap-4 px-4 overflow-visible pt-10 pb-2">
          <AnimatePresence mode="popLayout">
            {handCards.map((card, i) => (
              <motion.div
                key={`hand-${i}-${card.id}`}
                layout
                className="flex-shrink-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              >
                <div
                  className={`relative rounded-lg transition-all duration-300 ${sacrificeSelected.has(card.id) ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-slate-950' : ''} ${hintHighlightCards.includes(String(card.id)) ? 'hint-card-glow' : ''}`}
                  style={hintHighlightCards.includes(String(card.id)) ? { boxShadow: '0 0 0 4px rgba(251,191,36,0.9), 0 0 40px rgba(251,191,36,0.95), 0 0 70px rgba(251,191,36,0.6)' } : undefined}
                  onClick={() => handleHandCardClick(card.id)}
                >
                  <Card card={card} onClick={() => {}} variant="hand" upgraded={upgradedCards?.has?.(card.id)} comboSizes={getComboSizesForCard(card.id)} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </footer>

      <AnimatePresence>
        {syllabusOpen && (
          <motion.div
            key="syllabus"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
            onClick={() => setSyllabusOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="max-w-xl w-full rounded-xl border-2 border-cyan-500/50 bg-slate-900/95 p-6 shadow-2xl shadow-[0_0_40px_rgba(34,211,238,0.2)]"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-serif text-xl font-bold text-cyan-300">玩法帮助</h3>
                <button onClick={() => setSyllabusOpen(false)} className="p-1 rounded hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-slate-300 text-sm leading-relaxed space-y-4">
                <ol className="list-decimal list-inside space-y-2">
                  <li>将关联知识点拖入合成台验证。</li>
                  <li>正确则造成巨额 Combo 伤害；乱拼引发悖论反噬扣血。</li>
                  <li>若无法组合，可单卡验证或结束回合；也可使用【献祭弃牌】卖血换牌。</li>
                </ol>
                <p className="text-slate-400 text-xs pt-1">以下为与本局牌组相关的 Combo 配方示例，可作为开卷考试参考：</p>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {hintCombos.length > 0 ? (
                    hintCombos.map(c => (
                      <div key={c.combo_id} className="px-3 py-2 rounded-lg bg-slate-800/60 border border-cyan-500/20">
                        <span className="font-mono text-cyan-300">{c.name}</span>
                        <span className="text-slate-500 mx-1">·</span>
                        <span className="text-slate-400 text-xs">
                          {c.requires.map(id => cardsById[id]?.name ?? id).join(' + ')}
                        </span>
                        <span className="text-amber-400 ml-1 font-mono text-xs">
                          {c.damage != null ? `→ ${c.damage} 伤害` : c.block != null ? `→ ${c.block} 护盾` : ''}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 italic">暂无与当前牌组相关的配方，探索更多组合吧！</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSyllabusOpen(false)}
                className="mt-4 w-full py-2 rounded-lg font-mono text-sm bg-cyan-600/80 hover:bg-cyan-500 text-cyan-100 transition-colors"
              >
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              className={`max-w-lg w-full rounded-xl border-2 p-6 shadow-2xl ${
                modal.type === 'success'
                  ? 'bg-slate-900/95 border-cyan-500/50 shadow-[0_0_40px_rgba(34,211,238,0.2)]'
                  : 'bg-slate-900/95 border-rose-500/50 shadow-[0_0_40px_rgba(244,63,94,0.2)]'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className={`font-serif text-xl font-bold ${modal.type === 'success' ? 'text-cyan-300' : 'text-rose-400'}`}>
                  {modal.type === 'success' ? `✦ ${modal.comboName} 命中！` : '逻辑悖论'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {modal.type === 'success' ? (
                <>
                  <p className="text-cyan-200/90 text-base mb-3">
                    {modal.damage > 0 && <>对敌人造成 <span className="font-mono font-bold text-cyan-300">{modal.damage}</span> 点伤害</>}
                    {modal.damage > 0 && modal.block > 0 && ' · '}
                    {modal.block > 0 && <>获得 <span className="font-mono font-bold text-cyan-300">{modal.block}</span> 点护盾</>}
                    {modal.damage === 0 && modal.block === 0 && '连击命中'}
                  </p>
                  <p className="text-slate-200 text-[17px] sm:text-lg leading-loose max-h-56 overflow-y-auto">
                    {renderFactText(modal.factText)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-rose-300 text-sm mb-2">玩家受到 <span className="font-mono font-bold text-rose-400">{modal.backlashDamage}</span> 点反噬伤害</p>
                  <p className="text-slate-400 text-sm">{modal.message}</p>
                </>
              )}
              <button
                onClick={closeModal}
                className={`mt-6 w-full py-2 rounded-lg font-mono text-sm ${
                  modal.type === 'success'
                    ? 'bg-cyan-600/80 hover:bg-cyan-500 text-cyan-100'
                    : 'bg-rose-600/80 hover:bg-rose-500 text-rose-100'
                } transition-colors`}
              >
                确认
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
