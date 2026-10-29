const fs = require('fs');
const path = require('path');

const dumpDir = 'F:\\BaoZouyxt\\tools\\cfg\\dump';
const targetFiles = [
  'home_plant_adventure.json',
  'home_plant_crop.json',
  'home_plant_cropevent.json',
  'home_plant_details.json',
  'home_plant_exp.json',
  'home_plant_follow.json',
  'home_plant_sale.json',
  'home_plant_show.json',
  'planting_active.json',
  'plantmodel.json'
];

console.log('=== Step 2 & 3 & 4 ===');
for (const f of targetFiles) {
  const p = path.join(dumpDir, f);
  const content = fs.readFileSync(p, 'utf8');
  const parsed = JSON.parse(content);
  
  const declaredRows = parsed.rows;
  const cols = parsed.cols || [];
  const dataKeys = parsed.data ? Object.keys(parsed.data) : [];
  
  console.log(`\n### File: ${f}`);
  console.log(`- TableName: ${parsed.name}`);
  console.log(`- DeclaredRows: ${declaredRows}, ActualKeysCount: ${dataKeys.length}`);
  console.log(`- Columns (${cols.length}): ${JSON.stringify(cols)}`);
  
  // matched keys
  const targetKeys = ['sIdx', 'aExp', 'crop', 'seed', 'exp', 'event'];
  const matched = [];
  targetKeys.forEach(tk => {
    const idx = cols.indexOf(tk);
    if (idx !== -1) {
      matched.push(`${tk} (第 ${idx + 1} 列)`);
    }
  });
  console.log(`- MatchedFields (sIdx/aExp/crop/seed/exp/event): ${matched.length > 0 ? matched.join(', ') : '无'}`);

  console.log(`- Sample Rows (first 3):`);
  for (let i = 0; i < Math.min(3, dataKeys.length); i++) {
    const k = dataKeys[i];
    const rowStr = JSON.stringify(parsed.data[k]);
    if (rowStr.length > 400) {
      console.log(`  Row ${i + 1} [Key: ${k}] (截断前400字符，原长${rowStr.length}): ${rowStr.substring(0, 400)}`);
    } else {
      console.log(`  Row ${i + 1} [Key: ${k}] (完整${rowStr.length}字符): ${rowStr}`);
    }
  }
}

// Step 7 详情
console.log('\n=== Step 7 Details ===');
const fCrop = path.join(dumpDir, 'home_plant_crop.json');
const cCrop = JSON.parse(fs.readFileSync(fCrop, 'utf8'));
const kCrop1 = Object.keys(cCrop.data)[0];
const rCrop1 = JSON.stringify(cCrop.data[kCrop1]);
console.log('home_plant_crop.json cols:', JSON.stringify(cCrop.cols));
console.log('home_plant_crop.json row 1 (len ' + rCrop1.length + '):', rCrop1.length > 3000 ? rCrop1.substring(0, 3000) + '...[截断]' : rCrop1);

const fEvent = path.join(dumpDir, 'home_plant_cropevent.json');
const cEvent = JSON.parse(fs.readFileSync(fEvent, 'utf8'));
const kEvent1 = Object.keys(cEvent.data)[0];
const rEvent1 = JSON.stringify(cEvent.data[kEvent1]);
console.log('home_plant_cropevent.json cols:', JSON.stringify(cEvent.cols));
console.log('home_plant_cropevent.json row 1 (len ' + rEvent1.length + '):', rEvent1.length > 3000 ? rEvent1.substring(0, 3000) + '...[截断]' : rEvent1);
