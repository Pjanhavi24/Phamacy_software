const fs = require('fs');
const path = require('path');

const CSV = process.argv[2] || 'C:/Users/admin/Downloads/companies (1).csv';
const raw = fs.readFileSync(CSV, 'utf8');
const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
const header = lines.shift(); // "manufacturer"

// Dedupe exact names, preserve first-seen order.
const seen = new Set();
const names = [];
for (const n of lines) {
  const name = n.replace(/\s+/g, ' ').trim();
  if (!name || seen.has(name.toLowerCase())) continue;
  seen.add(name.toLowerCase());
  names.push(name);
}

// Words that don't help identify a company → dropped before building a code.
const STOP = new Set(['LTD','PVT','PRIVATE','LIMITED','INC','LLP','CO','AND','THE','OF',
  'INDIA','INDIAN','PHARMACEUTICALS','PHARMACEUTICAL','PHARMA','HEALTHCARE','HEALTH',
  'LABORATORIES','LABORATORY','LABS','LAB','LIFESCIENCES','LIFESCIENCE','LIFE','SCIENCES',
  'SCIENCE','BIOTECH','REMEDIES','FORMULATIONS','FORMULATION','INDUSTRIES','PRODUCTS',
  'DRUGS','CHEMICALS','CHEMICAL','MEDICARE','BIO','OVERSEAS','GLOBAL','CARE','GENERICS','I']);

function baseCode(name) {
  const clean = name.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(' ').filter(Boolean);
  let sig = words.filter(w => !STOP.has(w));
  if (sig.length === 0) sig = words;
  let code;
  if (sig.length >= 3) code = sig.slice(0, 4).map(w => w[0]).join('');
  else if (sig.length === 2) code = (sig[0].slice(0, 2) + sig[1].slice(0, 2));
  else code = sig[0].slice(0, 4);
  code = code.replace(/[^A-Z0-9]/g, '');
  if (code.length < 3) code = (sig.join('') + 'XX').slice(0, 4);
  return code.slice(0, 5) || 'XX';
}

const used = new Set();
function unique(base) {
  if (base.length >= 3 && !used.has(base)) { used.add(base); return base; }
  // Append a base36 suffix, shrinking the prefix so the code stays ≤ 5 chars.
  for (let i = 1; i < 1000000; i++) {
    const suffix = i.toString(36).toUpperCase();
    const prefix = base.slice(0, Math.max(1, 5 - suffix.length));
    const cand = (prefix + suffix).slice(0, 5);
    if (!used.has(cand)) { used.add(cand); return cand; }
  }
  return base; // unreachable
}

const out = names.map(name => ({ name, code: unique(baseCode(name)) }));
fs.writeFileSync(path.join(__dirname, 'companies.json'), JSON.stringify(out, null, 0));

// Report
const find = (s) => out.find(o => o.name.toLowerCase().includes(s));
console.log('Total unique companies:', out.length);
console.log('Unique codes:', new Set(out.map(o => o.code)).size);
console.log('Code length 3:', out.filter(o=>o.code.length===3).length, ' 4:', out.filter(o=>o.code.length===4).length, ' 5:', out.filter(o=>o.code.length===5).length);
console.log('\nSamples:');
['glaxo smith','abbott','cipla','sun pharma','dr reddy','mankind','torrent','lupin','pfizer','alkem','zydus cadila','intas','glenmark','biocon','emcure'].forEach(s=>{const f=find(s);if(f)console.log('  '+f.code.padEnd(6)+f.name);});
console.log('\nFirst 15:');
out.slice(0,15).forEach(o=>console.log('  '+o.code.padEnd(6)+o.name));
