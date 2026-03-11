import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

const TOOLTIP_DELAY_MS = 300

/**
 * 塔罗牌比例卡牌 (约 7:12) · 赛博学术风玻璃拟物化 · 含详情提示框
 */
const BASIC_TYPES = ['地势', '地形区', '细胞器', '山脉', '盆地']
const isBasicNoun = (type) => BASIC_TYPES.includes(type)

const SUBJECT_STYLES = {
  历史: {
    border: 'border-yellow-600/50',
    hoverBorder: 'hover:border-yellow-400',
    shadow: 'shadow-[0_0_12px_rgba(234,179,8,0.3)]',
    hoverShadow: 'hover:shadow-[0_0_18px_rgba(234,179,8,0.4)]',
    accent: 'from-yellow-500/10 via-transparent to-transparent',
    line: 'via-yellow-400/50',
    edgeBar: 'bg-amber-500/60',
    edgeGlow: 'shadow-[2px_0_8px_rgba(234,179,8,0.25)]',
  },
  地理: {
    border: 'border-blue-600/50',
    hoverBorder: 'hover:border-blue-400',
    shadow: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]',
    hoverShadow: 'hover:shadow-[0_0_18px_rgba(59,130,246,0.4)]',
    accent: 'from-blue-500/10 via-transparent to-transparent',
    line: 'via-blue-400/50',
    edgeBar: 'bg-blue-500/60',
    edgeGlow: 'shadow-[2px_0_8px_rgba(59,130,246,0.25)]',
  },
  生物: {
    border: 'border-green-500/50',
    hoverBorder: 'hover:border-green-400',
    shadow: 'shadow-[0_0_12px_rgba(34,197,94,0.3)]',
    hoverShadow: 'hover:shadow-[0_0_18px_rgba(34,197,94,0.4)]',
    accent: 'from-green-500/10 via-transparent to-transparent',
    line: 'via-green-400/50',
    edgeBar: 'bg-emerald-500/60',
    edgeGlow: 'shadow-[2px_0_8px_rgba(34,197,94,0.25)]',
  },
  诅咒: {
    border: 'border-violet-500/40',
    hoverBorder: 'hover:border-violet-400',
    shadow: 'shadow-[0_0_15px_rgba(139,92,246,0.2)]',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]',
    accent: 'from-violet-500/8 via-transparent to-transparent',
    line: 'via-violet-400/50',
    edgeBar: 'bg-violet-400/60',
    edgeGlow: 'shadow-[2px_0_8px_rgba(139,92,246,0.2)]',
  },
}
const DEFAULT_STYLE = {
  border: 'border-cyan-500/40',
  hoverBorder: 'hover:border-cyan-400',
  shadow: 'shadow-[0_0_15px_rgba(34,211,238,0.25)]',
  hoverShadow: 'hover:shadow-[0_0_20px_rgba(34,211,238,0.35)]',
  accent: 'from-cyan-500/8 via-transparent to-transparent',
  line: 'via-cyan-400/50',
  edgeBar: 'bg-cyan-400/60',
  edgeGlow: 'shadow-[2px_0_8px_rgba(34,211,238,0.2)]',
}

function getSubjectStyle(subject) {
  return SUBJECT_STYLES[subject] ?? DEFAULT_STYLE
}

function nameSizeClass(name, isCompact) {
  if (!name) return isCompact ? 'text-[10px]' : 'text-xs'
  const len = name.length
  if (isCompact) return len >= 5 ? 'text-[9px]' : len >= 4 ? 'text-[10px]' : 'text-xs'
  return len >= 6 ? 'text-[10px]' : len >= 4 ? 'text-xs' : 'text-sm'
}

export function Card({ card, onClick, disabled, variant = 'hand', upgraded, comboSizes = [] }) {
  const isCompact = variant === 'synthesis'
  const showGlow = upgraded && isBasicNoun(card?.type)
  const hasMultiCombo = comboSizes.length > 1
  const style = getSubjectStyle(card?.subject)

  const [showTooltip, setShowTooltip] = useState(false)
  const delayRef = useRef(null)
  const cardRef = useRef(null)

  const typeLabel = useMemo(() => {
    const t = card?.type ?? ''
    if (!t || t.length <= 1) return t
    let seed = 0
    for (let i = 0; i < (card?.id ?? '').length; i++) seed += (card.id.charCodeAt(i) ?? 0)
    const idx = Math.abs(seed) % t.length
    return t[idx]
  }, [card?.type, card?.id])

  const hideTooltip = useCallback(() => {
    if (delayRef.current) {
      clearTimeout(delayRef.current)
      delayRef.current = null
    }
    setShowTooltip(false)
  }, [])

  const startTooltipDelay = useCallback(() => {
    if (disabled) return
    if (delayRef.current) return
    delayRef.current = setTimeout(() => {
      delayRef.current = null
      setShowTooltip(true)
    }, TOOLTIP_DELAY_MS)
  }, [disabled])

  useEffect(() => {
    return () => {
      if (delayRef.current) clearTimeout(delayRef.current)
    }
  }, [])

  const baseClass = `
    relative overflow-hidden rounded-lg border cursor-pointer select-none
    bg-slate-900/60 backdrop-blur-md
    ${style.border} ${style.hoverBorder} ${style.shadow} ${style.hoverShadow}
    transition-all duration-200
    ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
    ${isCompact ? 'w-14 min-w-14 sm:w-20 sm:min-w-20' : 'w-16 min-w-16 sm:w-24 sm:min-w-24'}
    ${showGlow ? 'ring-2 ring-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : ''}
  `
  const aspectClass = 'aspect-[7/12]'

  const tooltipRect = showTooltip && cardRef.current ? cardRef.current.getBoundingClientRect() : null
  const TOOLTIP_W = 296
  const TOOLTIP_HALF = TOOLTIP_W / 2
  const MARGIN = 12
  const RIGHT_BUFFER = 280
  const tooltipStyle = tooltipRect && typeof window !== 'undefined'
    ? (() => {
        const cardCenter = tooltipRect.left + tooltipRect.width / 2
        const cardRight = tooltipRect.right
        const winW = window.innerWidth
        let left = cardCenter
        let transform = 'translate(-50%, -100%)'
        if (cardRight > winW - RIGHT_BUFFER || cardCenter + TOOLTIP_HALF > winW - MARGIN) {
          left = Math.max(MARGIN, cardRight - TOOLTIP_W)
          transform = 'translate(0, -100%)'
        } else if (cardCenter - TOOLTIP_HALF < MARGIN) {
          left = MARGIN
          transform = 'translate(0, -100%)'
        } else {
          left = Math.min(Math.max(cardCenter, MARGIN + TOOLTIP_HALF), winW - MARGIN - TOOLTIP_HALF)
        }
        return {
          left,
          top: tooltipRect.top - 8,
          transform,
        }
      })()
    : { left: -9999, top: 0, transform: 'translate(-50%, -100%)' }

  return (
    <>
      <motion.div
        ref={cardRef}
        layout
        whileHover={!disabled && { scale: 1.03, y: -2 }}
        whileTap={!disabled && { scale: 0.98 }}
        className={`${baseClass} ${aspectClass}`}
        onClick={disabled ? undefined : onClick}
        onMouseEnter={startTooltipDelay}
        onMouseLeave={hideTooltip}
        onPointerDown={startTooltipDelay}
        onPointerUp={hideTooltip}
        onPointerLeave={hideTooltip}
        onPointerCancel={hideTooltip}
      >
        <div className={`absolute inset-0 bg-gradient-to-b ${style.accent}`} />
        {/* 学科底框色条：左侧色带 */}
        <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg ${style.edgeBar} ${style.edgeGlow}`} />
        <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${style.line} to-transparent`} />
        {/* 多连携卡片：角标装饰，不改变底色 */}
        {hasMultiCombo && (
          <>
            <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400/70 rounded-tr opacity-90" />
            <div className="absolute bottom-0.5 left-0.5 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400/70 rounded-bl opacity-90" />
          </>
        )}
        <div className="relative p-2 h-full flex flex-col">
          {comboSizes.length > 0 && (
            <span className={`absolute top-1 right-1.5 text-[13px] font-mono tabular-nums flex flex-col items-end gap-0 [&>*:not(:first-child)]:-mt-[5px] ${hasMultiCombo ? 'font-semibold' : ''}`}>
              {comboSizes.filter(n => n !== 2).map(n => (
                <span
                  key={n}
                  className="text-amber-400"
                  style={hasMultiCombo ? { textShadow: '0 0 6px rgba(251,191,36,0.6)' } : undefined}
                >
                  1/{n}
                </span>
              ))}
              {comboSizes.includes(2) && (
                <span
                  className="text-cyan-400"
                  style={hasMultiCombo ? { textShadow: '0 0 6px rgba(34,211,238,0.7)' } : undefined}
                >
                  1/2
                </span>
              )}
            </span>
          )}
          <span className="text-[10px] text-cyan-400/90 font-mono leading-tight shrink-0 text-fragment">{typeLabel}</span>
          {card.desc && (
            <div className="flex-1 min-h-0 flex items-center -ml-[10px] -mr-[20px] -mt-[30px] -mb-[30px] px-2">
              <p className="w-full text-[11px] text-slate-500 leading-snug line-clamp-3 overflow-hidden text-left">
                {card.desc[0] ? (
                  <>
                    <span className="text-[13px] font-bold text-amber-400 inline-block align-baseline">{card.desc[0]}</span>
                    {card.desc.slice(1)}
                  </>
                ) : (
                  card.desc
                )}
              </p>
            </div>
          )}
          <span
            className={`font-serif font-bold text-slate-100 mt-auto break-words leading-tight ${nameSizeClass(card?.name ?? '', isCompact)}`}
          >
            {card.name}
          </span>
        </div>
      </motion.div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showTooltip && card && (
              <motion.div
                key="card-tooltip"
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="fixed z-[9999] pointer-events-none"
                style={tooltipStyle}
              >
                <div
                  className="w-[296px] min-w-[260px] max-w-[min(296px,92vw)] rounded-lg border border-cyan-500/50 bg-slate-900/95 backdrop-blur-md
                    shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_0_20px_rgba(34,211,238,0.15)]
                    p-4 text-base"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
                  <p className="text-sm text-cyan-400/90 font-mono mb-1.5">{card.type}</p>
                  <p className="font-serif font-bold text-slate-100 text-lg mb-2 leading-tight break-words">
                    {card.name}
                  </p>
                  <p className="text-slate-300 text-[15px] sm:text-base leading-relaxed break-words">
                    {card.desc || '暂无详细说明'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}
