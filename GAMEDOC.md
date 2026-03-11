# 真理序列 · 游戏功能与扩展说明

> 网页端单机卡牌 Roguelike，结合知识点卡牌与 Slay the Spire 式爬塔机制。适合上海初中史地生复习。

---

## 一、当前实现功能

### 1.1 核心玩法

| 功能 | 说明 |
|------|------|
| **真理合成台** | 将 1–4 张手牌放入合成台，点击「验证逻辑」判定是否形成有效 Combo |
| **Combo 伤害** | 2 卡约 30、3 卡约 65、4 卡约 130，按连击数指数级递增 |
| **悖论反噬** | 无效组合造成 backlashDamage（卡数 × 5） |
| **敌人行动** | 攻击（扣血）、防御（待用）、诅咒（往抽牌堆塞诅咒卡） |

### 1.2 游戏流程

```
HomeView（首页）
    │
    └── 点击「开启课题」 → startGame() → 初始化 HP、卡组、层数
    ▼
MapView（地图）
    │
    ├── 测验 → BattleView（战斗）
    │       └── 胜利 → CardChoiceView（三选一）→ 选牌加入卡组 → 返回地图
    │
    ├── 自习室 → CampView（休息）
    │       └── 休息（回血 30%）或 强化卡牌 → 返回地图
    │
    └── 随机事件 → EventView
            └── 选择分支（如扣血换高级卡）→ 返回地图
```

### 1.3 战斗机制

- 手牌 5 张，从卡组随机抽取
- 合成台最多 4 张，点击手牌 → 移入，点击合成台 → 移回
- 敌人有预设 actions 数组，每回合按序执行
- 回合结束：执行敌人意图 → 弃置手牌 → 抽 5 张新牌

### 1.4 学科与卡牌

| 学科 | 卡牌数量 | 主题 |
|------|----------|------|
| 地理 | 50 张 | 中国地形、阶梯、山脉、盆地、气候 |
| 生物 | 50 张 | 人体消化系统、血液循环 |
| 历史 | 50 张 | 中国近代史（鸦片战争→抗日战争） |
| 诅咒 | 1 张 | 胃痛（幽门螺杆菌 Boss 塞入） |

### 1.5 敌人

| 敌人 | 类型 | HP | 特色 |
|------|------|-----|------|
| 模拟卷怪 | 普通 | 50 | 攻防交替 |
| 遗忘心魔 | 普通 | 60 | 偏防御 |
| 变异的幽门螺杆菌 | Boss | 80 | 塞入胃痛诅咒 |
| 列强的铁蹄 | Boss | 100 | 高攻击（22–30） |
| 地貌巨灵 | Boss | 90 | 高护盾 + 高伤害 |

---

## 二、文件结构

```
TruthSequence/
├── index.html              # 入口 HTML，加载 Noto Serif SC、JetBrains Mono 字体
├── vite.config.js          # Vite 配置（React + Tailwind）
├── package.json
├── src/
│   ├── main.jsx            # React 入口
│   ├── index.css           # 全局样式：Tailwind、自定义主题、bg-grid、drop-shadow-glow
│   ├── App.jsx             # 根组件，GameProvider 包裹，路由背景
│   │
│   ├── data/               # 【可扩充】静态数据
│   │   ├── cards.json      # 卡牌定义
│   │   ├── combos.json     # 连击定义
│   │   └── enemies.json    # 敌人定义
│   │
│   ├── engine/             # 核心判定逻辑
│   │   └── evaluateCombo.js
│   │
│   ├── store/
│   │   └── gameState.jsx   # React Context 全局状态
│   │
│   ├── components/
│   │   └── Card.jsx        # 卡牌组件
│   │
│   └── views/              # 页面级视图
│       ├── HomeView.jsx    # 首页（开启课题、真理图鉴、系统设置）
│       ├── MapView.jsx     # 地图（测验 / 自习室 / 随机事件节点）
│       ├── BattleView.jsx  # 战斗（真理合成台、敌人意图、回合制）
│       ├── CardChoiceView.jsx  # 三选一
│       ├── CampView.jsx    # 自习室（休息 / 强化）
│       └── EventView.jsx   # 随机事件（文案 + 选项）
│
├── ARCHITECTURE.md         # 技术架构文档（较旧）
└── GAMEDOC.md              # 本文档
```

---

## 三、可扩充数据文件与字段标注

### 3.1 `src/data/cards.json`

**格式**：JSON 数组，每张卡牌一个对象。

| 字段 | 类型 | 说明 | 可扩充示例 |
|------|------|------|------------|
| `id` | string | 唯一标识，如 `geo_01`、`bio_51`、`his_01`、`curse_stomachache` | 新学科用 `phy_01`、`chem_01` 等 |
| `name` | string | 卡牌名称 | - |
| `subject` | string | 学科：`地理`、`生物`、`历史`、`诅咒` | 可加 `物理`、`化学`、`道法` |
| `type` | string | 类型标签：`地势`、`山脉`、`消化器官`、`血细胞` 等 | 用于卡面展示与 Combo 语义 |
| `desc` | string | 卡牌说明，用于图鉴或弹窗 | - |

**示例**：
```json
{"id": "geo_01", "name": "第一级阶梯", "subject": "地理", "type": "地势", "desc": "青藏高原为主，海拔4000米以上"}
{"id": "curse_stomachache", "name": "胃痛", "subject": "诅咒", "type": "诅咒卡", "desc": "幽门螺杆菌感染导致"}
```

**扩充提示**：新增卡牌后需在 `combos.json` 中编写 `requires` 组合，否则无法形成连击。

---

### 3.2 `src/data/combos.json`

**格式**：JSON 数组，每个 Combo 一个对象。

| 字段 | 类型 | 说明 | 可扩充提示 |
|------|------|------|------------|
| `combo_id` | string | 唯一标识 | 建议 `geo_combo_xx`、`bio_combo_xx`、`his_combo_xx` |
| `name` | string | 连击名称 | - |
| `requires` | string[] | 所需卡牌 ID 数组，**无序匹配** | 顺序无关，`["a","b"]` 与 `["b","a"]` 等价 |
| `damage` | number | 伤害值 | 2 卡 ~30，3 卡 ~65，4 卡 ~130 |
| `factText` | string | 知识点科普文本 | 建议加【中考要点】前缀 |

**示例**：
```json
{"combo_id": "geo_combo_01", "name": "第一阶梯主体", "requires": ["geo_01", "geo_05"], "damage": 32, "factText": "【中考要点】第一级阶梯以青藏高原为主体..."}
{"combo_id": "bio_combo_16", "name": "消化与循环", "requires": ["bio_53", "bio_60", "bio_64", "bio_72"], "damage": 130, "factText": "【中考要点】小肠是消化和吸收的主要场所..."}
```

**扩充提示**：`requires` 中的 id 必须在 `cards.json` 中存在；`factText` 建议严格符合教材表述。

---

### 3.3 `src/data/enemies.json`

**格式**：JSON 数组，每个敌人一个对象。

| 字段 | 类型 | 说明 | 可扩充提示 |
|------|------|------|------------|
| `id` | string | 唯一标识 | - |
| `name` | string | 显示名称 | - |
| `hp` | number | 初始血量 | Boss 建议 80–100 |
| `boss` | boolean | 可选，是否 Boss | 可做 UI 区分 |
| `subject` | string | 可选，学科 | 用于主题化 Boss |
| `actions` | array | 回合行动数组，**循环执行** | 见下表 |

**action 对象**：

| type | 说明 | value | 其他 |
|------|------|-------|------|
| `attack` | 对玩家造成伤害 | 伤害值 | - |
| `defend` | 防御（当前仅展示，未实现减伤） | 护盾值 | - |
| `curse` | 往抽牌堆塞诅咒卡 | 诅咒卡 id，如 `curse_stomachache` | `desc` 可选，用于意图展示 |

**示例**：
```json
{"id": "mutant_helicobacter", "name": "变异的幽门螺杆菌", "hp": 80, "boss": true, "subject": "生物", "actions": [{"type": "curse", "value": "curse_stomachache", "desc": "塞入胃痛诅咒"}, {"type": "attack", "value": 8}]}
{"id": "iron_hooves", "name": "列强的铁蹄", "hp": 100, "boss": true, "subject": "历史", "actions": [{"type": "attack", "value": 28}, {"type": "attack", "value": 22}]}
```

**扩充提示**：`curse` 的 `value` 必须在 `cards.json` 中存在；新增 `type` 需在 `BattleView.jsx` 中实现逻辑。

---

### 3.4 其他可配置位置

| 位置 | 说明 |
|------|------|
| `src/store/gameState.jsx` | `INIT_PLAYER_HP`、`startGame` 中初始卡组数量 |
| `src/views/BattleView.jsx` | `HAND_SIZE`（手牌数）、敌人选取逻辑 `pickRandomEnemy` |
| `src/views/CardChoiceView.jsx` | `PICK_COUNT`（三选一数量） |
| `src/views/EventView.jsx` | 事件数据 `TEST_EVENT` 为占位，可改为从 JSON 读取 |
| `src/views/MapView.jsx` | `NODE_TYPES`、`getFloorNodes` 控制节点类型与生成规则 |
| `src/index.css` | `@theme` 中 `--color-void`、`--shadow-glow` 等主题变量 |

---

## 四、技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| Vite | 7 | 构建工具 |
| Tailwind CSS | 4 | 样式 |
| Framer Motion | 12 | 动画 |
| Lucide React | 0.577 | 图标 |

---

## 五、运行与构建

```bash
npm run dev -- --port 5273
npm run build
npm run preview
```
