const fs = require('fs');
const path = require('path');

const CSV = process.argv[2] || 'C:/Users/admin/Downloads/generics (1).csv';
const raw = fs.readFileSync(CSV, 'utf8');
const lines = raw.split(/\r?\n/);
lines.shift(); // header "generic_name"

// Single-column CSV: a value may be wrapped in quotes when it contains commas.
function parseField(line) {
  let v = line.trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/""/g, '"');
  return v.replace(/\s+/g, ' ').trim();
}

const seen = new Set();
const names = [];
for (const line of lines) {
  if (!line.trim()) continue;
  const name = parseField(line);
  if (!name) continue;
  const key = name.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  names.push(name);
}

// Incremental numeric code in file order.
const out = names.map((name, i) => ({ name, code: i + 1 }));
fs.writeFileSync(path.join(__dirname, 'generics.json'), JSON.stringify(out, null, 0));

console.log('Total unique generic groups:', out.length);
console.log('Codes:', out[0].code, '..', out[out.length - 1].code);
console.log('\nFirst 12:');
out.slice(0, 12).forEach(o => console.log('  ' + String(o.code).padEnd(5) + o.name));
console.log('\nLast 3:');
out.slice(-3).forEach(o => console.log('  ' + String(o.code).padEnd(5) + o.name));
