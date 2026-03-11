const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/combos.json');
let raw = fs.readFileSync(filePath, 'utf8');

// Fix: merge orphan content after ] by replacing ]\n{ with ,\n  {
raw = raw.replace(/\]\s*\n\s*\{/g, ',\n  {');
// Fix: add missing commas between objects (}\n{ -> },\n  {)
raw = raw.replace(/\}\s*\n\s*\{/g, '},\n  {');

// If file doesn't end with ], add it
if (!raw.trimEnd().endsWith(']')) {
  raw = raw.trimEnd() + '\n]';
}

let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('Parse error:', e.message);
  process.exit(1);
}

// Deduplicate by combo_id (keep first), then by requires (keep first)
const seen = new Map();
const seenRequires = new Map();
const unique = [];
for (const c of data) {
  if (seen.has(c.combo_id)) {
    console.log('Dup id:', c.combo_id, '- skipping');
    continue;
  }
  const reqKey = [...(c.requires || [])].sort().join(',');
  if (seenRequires.has(reqKey)) {
    console.log('Dup requires:', c.combo_id, 'same as', seenRequires.get(reqKey), '- skipping');
    continue;
  }
  seen.set(c.combo_id, c);
  seenRequires.set(reqKey, c.combo_id);
  unique.push(c);
}

console.log('Total:', data.length, '-> unique:', unique.length);

fs.writeFileSync(filePath, JSON.stringify(unique, null, 2) + '\n', 'utf8');
console.log('Written:', filePath);
