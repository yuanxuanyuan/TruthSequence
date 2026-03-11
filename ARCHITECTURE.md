# 真理序列 · 游戏架构文档

> 网页端单机卡牌 Roguelike 游戏，结合知识点卡牌与 Slay the Spire 式爬塔机制。

---

## 一、技术栈

| 技术 | 用途 |
|------|------|
| React 19 | UI 框架 |
| Vite 7 | 构建工具 |
| Tailwind CSS v4 | 样式 |
| Framer Motion | 卡牌与界面动画 |
| Lucide React | 图标 |

---

## 二、目录结构

```
TruthSequence/
├── index.html              # 入口 HTML
├── vite.config.js          # Vite 配置（React + Tailwind）
├── package.json
├── src/
│   ├── main.jsx            # React 入口，挂载 App
│   ├── index.css           # 全局样式（Tailwind + 自定义主题）
│   ├── App.jsx             # 根组件，路由与背景
│   │
│   ├── data/               # 静态数据（JSON）
│   │   ├── cards.json      # 卡牌定义
│   │   └── combos.json     # 连击定义
│   │
│   ├── engine/             # 核心判定逻辑（纯 JS）
│   │   └── evaluateCombo.js
│   │
│   ├── store/              # 全局状态
│   │   └── gameState.jsx   # React Context
│   │
│   ├── components/         # 基础 UI 组件
│   │   └── Card.jsx
│   │
│   └── views/              # 页面级视图
│       ├── MapView.jsx
│       ├── BattleView.jsx
│       └── CardChoiceView.jsx
│
└── ARCHITECTURE.md         # 本文档
```

---

## 三、数据层

### 3.1 `src/data/cards.json`

卡牌定义，每张卡牌包含：

| 字段 | 说明 |
|------|------|
| id | 唯一标识（如 `geo_01`） |
| name | 卡牌名称（如「第一级阶梯」） |
| subject | 学科（如「地理」） |
| type | 类型（如「地势」「山脉」「盆地」） |
| desc | 简述说明 |

当前为 50 张中国地形与气候卡牌。

### 3.2 `src/data/combos.json`

连击定义，每个连击包含：

| 字段 | 说明 |
|------|------|
| combo_id | 唯一标识 |
| name | 连击名称 |
| requires | 所需卡牌 ID 数组（如 `["geo_01","geo_05"]`） |
| damage | 伤害值 |
| factText | 知识点科普文本（中考复习用） |

当前为 20 个地理连击，匹配方式为**无序**（顺序不限）。

---

## 四、核心逻辑

### 4.1 `src/engine/evaluateCombo.js`

**纯净验证函数**，无副作用：

```js
evaluateCombo(selectedCardIds, combos?)
```

- **输入**：合成台上卡牌 ID 数组
- **输出**：
  - 匹配成功：`{ success: true, damage, comboName, factText }`
  - 匹配失败：`{ success: false, backlashDamage, message: '逻辑悖论！' }`

`backlashDamage = selectedCardIds.length * 5`。

---

## 五、全局状态

### 5.1 `src/store/gameState.jsx`

使用 **React Context** 管理游戏状态：

| 状态 | 说明 |
|------|------|
| playerHP | 玩家血量（初始 100） |
| deck | 当前卡组（卡牌 ID 数组） |
| floor | 当前层数 |
| currentView | 当前视图：`'map'` \| `'battle'` \| `'cardChoice'` |

**主要方法**：

| 方法 | 说明 |
|------|------|
| damagePlayer(amount) | 玩家扣血 |
| addCardToDeck(cardId) | 卡牌加入卡组 |
| goToBattle() | 进入战斗 |
| goToMap() | 返回地图 |
| goToCardChoice() | 进入选牌 |
| finishCardChoice(cardId) | 选牌完成，层数 +1，返回地图 |

---

## 六、视图与流程

### 6.1 路由流程

```
MapView（地图）
    │
    ├── 点击【测验】节点
    ▼
BattleView（战斗）
    │
    ├── 敌人 HP = 0
    ▼
CardChoiceView（三选一）
    │
    └── 选择一张 → 加入卡组，层数 +1 → 返回 MapView
```

### 6.2 `MapView.jsx`

- **功能**：Slay the Spire 式垂直节点路线图
- **节点类型**：测验（战斗）、自习室（休息）、随机事件
- **当前实现**：仅测验可点击，进入 BattleView
- **展示**：层数、玩家 HP

### 6.3 `BattleView.jsx`

- **功能**：真理合成台战斗
- **布局**：
  - 顶部：玩家 HP、敌人 HP
  - 中间：真理合成台（最多 4 张卡）、验证逻辑按钮
  - 底部：手牌区（5 张）
- **交互**：手牌 → 合成台；合成台 → 退回手牌
- **验证逻辑**：调用 `evaluateCombo`，成功则敌人扣血并弹窗显示 factText，失败则玩家扣血
- **胜利**：敌人 HP = 0 后确认弹窗，跳转 CardChoiceView

### 6.4 `CardChoiceView.jsx`

- **功能**：战斗胜利后三选一
- **逻辑**：从总卡池随机抽 3 张，选 1 张加入卡组
- **结束**：调用 `finishCardChoice`，层数 +1，返回 MapView

---

## 七、组件

### 7.1 `Card.jsx`

- **用途**：通用卡牌展示
- **比例**：塔罗牌比例 `aspect-[7/12]`
- **变体**：`variant="hand"`（手牌）、`variant="synthesis"`（合成台，略小）
- **Props**：`card`、`onClick`、`disabled`、`variant`

---

## 八、运行与构建

```bash
# 开发（端口 5273）
npm run dev -- --port 5273

# 构建
npm run build

# 预览构建产物
npm run preview
```

---

## 九、扩展建议

- **自习室**：休息 / 强化，恢复 HP 或升级卡牌
- **随机事件**：事件文案与分支选项
- **抽牌逻辑**：当前手牌从 deck 随机抽，可改为抽牌堆 + 弃牌堆
- **敌人 AI**：敌人回合与技能
- **多学科卡池**：按学科或主题切换 cards / combos
