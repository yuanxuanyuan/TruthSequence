import combosData from '../data/combos.json'
import cardsData from '../data/cards.json'

const cardsById = Object.fromEntries(cardsData.map(c => [c.id, c]))

/**
 * 获取某张卡参与的所有连携规模（2 张、3 张、4 张）
 * @param {string} cardId - 卡牌 ID
 * @param {Array<{ requires: string[] }>} [combos] - 连携数据
 * @returns {number[]} 例如 [2, 3, 4] 表示该卡存在于 2 张、3 张和 4 张卡的连携中
 */
/** 所有参与连携的卡牌 ID 集合 */
export const comboCardIds = new Set(combosData.flatMap(c => c.requires || []))

export function getComboSizesForCard(cardId, combos = combosData) {
  const sizes = new Set()
  for (const c of combos) {
    if (c.requires?.includes(cardId) && c.requires.length >= 2 && c.requires.length <= 4) {
      sizes.add(c.requires.length)
    }
  }
  return [...sizes].sort((a, b) => a - b)
}

function isAllGeo(cardIds) {
  return cardIds.every(id => cardsById[id]?.subject === '地理')
}

/**
 * 验证合成台上的卡牌是否形成有效连击（无序匹配），并应用遗物倍率
 * @param {string[]} selectedCardIds - 玩家放到合成台上的卡牌 ID 数组
 * @param {Array<{ requires: string[], damage?: number, block?: number, name: string, factText: string }>} [combos] - 连击数据
 * @param {string[]} [relicIds] - 玩家遗物 ID 数组
 * @returns {{ success: boolean, damage?: number, block?: number, comboName?: string, factText?: string, backlashDamage?: number, message?: string }}
 */
export function evaluateCombo(selectedCardIds, combos = combosData, relicIds = []) {
  const selected = [...selectedCardIds].sort()
  const selectedKey = selected.join(',')
  const relics = new Set(relicIds ?? [])

  for (const combo of combos) {
    const required = [...combo.requires].sort()
    const requiredKey = required.join(',')
    if (selectedKey === requiredKey) {
      let damage = combo.damage ?? 0
      if (relics.has('zhenghe_compass') && isAllGeo(selected)) {
        damage = Math.floor(damage * 1.3)
      }
      if (relics.has('microscope') && selected.length === 2) {
        damage = damage * 2
      }
      return {
        success: true,
        damage,
        block: combo.block ?? 0,
        comboName: combo.name,
        factText: combo.factText,
      }
    }
  }

  // 保底机制：单卡打出造成微弱物理伤害（2-5 点），不触发悖论反噬
  if (selectedCardIds.length === 1) {
    const singleDamage = 2 + Math.floor(Math.random() * 4)
    const card = cardsById[selectedCardIds[0]]
    return {
      success: true,
      damage: singleDamage,
      block: 0,
      comboName: card?.name ?? '单卡',
      factText: '单卡物理打击，造成微弱伤害，未触发知识点联动。',
    }
  }

  let backlashDamage = selectedCardIds.length * 5
  if (relics.has('broken_watch')) {
    backlashDamage = Math.floor(backlashDamage / 2)
  }
  return {
    success: false,
    backlashDamage,
    message: '逻辑悖论！',
  }
}

// ========== 测试用例（仅 Node 环境运行，避免影响浏览器） ==========
if (typeof window === 'undefined') {
  const combos = combosData
  const r1 = evaluateCombo(['geo_01', 'geo_05'], combos)
  console.assert(r1.success === true && r1.damage === 32, '第一阶梯主体')
  const r2 = evaluateCombo(['geo_24', 'geo_36'], combos)
  console.assert(r2.success === true && r2.damage === 28, '西北干旱盆地')
  const r3 = evaluateCombo(['geo_01'], combos)
  console.assert(r3.success === true && r3.damage >= 2 && r3.damage <= 5, '单卡保底 2-5 伤害')
  const r4 = evaluateCombo(['bio_70', 'bio_101'], combos)
  console.assert(r4.success === true && r4.block === 25 && r4.damage === 0, '免疫屏障')
}
