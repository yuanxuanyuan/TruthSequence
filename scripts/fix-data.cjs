const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../src/data');

function fixJson(filePath, options = {}) {
  const { idKey = 'id', dedupeByRequires = false } = options;
  let raw = fs.readFileSync(filePath, 'utf8');

  raw = raw.replace(/\]\s*\n\s*\[\s*/g, ',\n  ');  // ]\n[ -> ,\n  (merge arrays)
  raw = raw.replace(/\]\s*\n\s*\{/g, ',\n  {');   // ]\n{ -> ,\n  {
  raw = raw.replace(/\}\s*\n\s*\{/g, '},\n  {');  // }\n{ -> },\n  {
  if (!raw.trimEnd().endsWith(']')) {
    raw = raw.trimEnd() + '\n]';
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error(filePath, 'Parse error:', e.message);
    return null;
  }

  const seen = new Map();
  const seenRequires = dedupeByRequires ? new Map() : null;
  const unique = [];
  for (const item of data) {
    const id = item[idKey];
    if (seen.has(id)) {
      console.log('  Dup', idKey + ':', id, '- skipping');
      continue;
    }
    if (dedupeByRequires && item.requires) {
      const reqKey = [...item.requires].sort().join(',');
      if (seenRequires.has(reqKey)) {
        console.log('  Dup requires:', id, 'same as', seenRequires.get(reqKey), '- skipping');
        continue;
      }
      seenRequires.set(reqKey, id);
    }
    seen.set(id, item);
    unique.push(item);
  }
  return { data: unique, total: data.length };
}

// 1. Fix cards.json
console.log('=== cards.json ===');
const cardsResult = fixJson(path.join(dataDir, 'cards.json'), { idKey: 'id' });
if (cardsResult) {
  const cards = cardsResult.data;
  fs.writeFileSync(path.join(dataDir, 'cards.json'), JSON.stringify(cards, null, 2) + '\n', 'utf8');
  console.log('Total:', cardsResult.total, '-> unique:', cards.length);
}

// 2. Fix combos.json
console.log('\n=== combos.json ===');
const combosResult = fixJson(path.join(dataDir, 'combos.json'), { idKey: 'combo_id', dedupeByRequires: true });
if (combosResult) {
  const combos = combosResult.data;
  fs.writeFileSync(path.join(dataDir, 'combos.json'), JSON.stringify(combos, null, 2) + '\n', 'utf8');
  console.log('Total:', combosResult.total, '-> unique:', combos.length);
}

// 3. Find cards with no combo
const cards = JSON.parse(fs.readFileSync(path.join(dataDir, 'cards.json'), 'utf8'));
const combos = JSON.parse(fs.readFileSync(path.join(dataDir, 'combos.json'), 'utf8'));
const comboCardIds = new Set(combos.flatMap(c => c.requires || []));
const noCombo = cards.filter(c => !comboCardIds.has(c.id));

console.log('\n=== 无连携线的卡片 (共 ' + noCombo.length + ' 张) ===');
noCombo.forEach(c => console.log('  ' + c.id + ' | ' + c.name + ' | ' + (c.subject || '-')));
