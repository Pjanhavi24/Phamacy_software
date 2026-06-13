const fs = require('fs');
const CSV = 'C:/Users/admin/Downloads/medicine_dataset.csv';
const raw = fs.readFileSync(CSV, 'utf8');

// Proper CSV parse (handles quoted fields with commas).
function parseCSV(text) {
  const rows = []; let row = []; let field = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const rows = parseCSV(raw);
const header = rows.shift();
const data = rows.filter(r => r.length >= 6 && r[0].trim());
console.log('Header:', JSON.stringify(header));
console.log('Data rows:', data.length);

const types = {};
const blankPrice = data.filter(r => !r[1].trim() || isNaN(parseFloat(r[1]))).length;
for (const r of data) { const t = (r[3]||'').trim().toLowerCase(); types[t] = (types[t]||0)+1; }
console.log('Type distribution:', JSON.stringify(types, null, 0));
console.log('Rows with blank/NaN price:', blankPrice);

// company / generic coverage vs masters
const companies = new Set(JSON.parse(fs.readFileSync(__dirname+'/companies.json','utf8')).map(c=>c.name.toLowerCase()));
const generics = new Set(JSON.parse(fs.readFileSync(__dirname+'/generics.json','utf8')).map(g=>g.name.toLowerCase()));
const norm = s => (s||'').replace(/\s+/g,' ').trim();
let cMiss=0,gMiss=0; const cm=new Set(), gm=new Set();
for (const r of data){
  const c=norm(r[2]); if(!companies.has(c.toLowerCase())){cMiss++;cm.add(c);}
  const g=norm(r[5]); if(!generics.has(g.toLowerCase())){gMiss++;gm.add(g);}
}
console.log('Product rows whose company NOT in master:', cMiss, '(' + cm.size + ' distinct)');
console.log('Product rows whose generic NOT in master:', gMiss, '(' + gm.size + ' distinct)');
console.log('Sample packing values:', JSON.stringify(data.slice(0,3).map(r=>r[4])));
