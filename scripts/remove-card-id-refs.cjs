const fs = require('fs');
const path = require('path');

const combosPath = path.join(__dirname, '../src/data/combos.json');
const combos = JSON.parse(fs.readFileSync(combosPath, 'utf8'));

// 移除 factText 中的（bio_107）这种卡牌 ID 引用（全角括号）
const re = /（[a-z_0-9/]+）/g;
let changed = 0;
for (const c of combos) {
  if (c.factText) {
    const before = c.factText;
    c.factText = c.factText.replace(re, '');
    // 清理可能产生的多余空格、顿号
    c.factText = c.factText.replace(/[、，]\s*[、，]/g, '，').replace(/\s{2,}/g, ' ').trim();
    if (c.factText !== before) changed++;
  }
}

fs.writeFileSync(combosPath, JSON.stringify(combos, null, 2) + '\n', 'utf8');
console.log('Updated', changed, 'factText entries');
