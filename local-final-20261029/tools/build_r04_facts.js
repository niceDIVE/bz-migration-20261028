const fs = require('fs');
const readline = require('readline');
const path = require('path');

const files = [
  { name: 'tools/index.js', path: 'F:/BaoZouyxt/tools/index.js' },
  { name: 'tools/scripts2.js', path: 'F:/BaoZouyxt/tools/scripts2.js' },
  { name: 'tools/scripts3.js', path: 'F:/BaoZouyxt/tools/scripts3.js' }
];

async function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    queries: [],
    hitContext: [],
    itemTablePriceColumns: [],
    itemSamples: [],
    unverified: [],
    out_of_scope: []
  };

  // 1. Tbl item columns & samples
  const tblItem = JSON.parse(fs.readFileSync('F:/BaoZouyxt/tools/cfg/tbl_item.json', 'utf8'));
  let cols = tblItem.columns;
  if (!cols) {
    const firstKey = Object.keys(tblItem.table || tblItem)[0];
    const row = (tblItem.table || tblItem)[firstKey];
    cols = Object.keys(row);
  }
  const priceCols = cols.filter(c => /price|money|sell/i.test(c));
  report.itemTablePriceColumns = priceCols;

  const table = tblItem.table || tblItem;
  for (const k of Object.keys(table)) {
    const row = table[k];
    if (row.Type == 1 || row.type == 1) {
      const sampleColVals = {};
      for (const c of priceCols) {
        sampleColVals[c] = row[c];
      }
      report.itemSamples.push({ ID: row.ID || row.id || Number(k), columns: sampleColVals });
      if (report.itemSamples.length >= 3) break;
    }
  }

  // 2. Query patterns
  // Task 1: saleItem, SALE_ITEM, saleArr (and case variants)
  // Task 2: 出售, sellPrice, SellPrice, getSellPrice, sellMoney, sellData
  // Task 4: setCoins, baseValueAy[35]
  const targetPatterns = [
    // 1. saleItem, SALE_ITEM, saleArr
    'saleItem',
    'SALE_ITEM',
    'saleArr',
    'saleitem',
    'sale_item',
    'salearr',
    'SALEITEM',
    'SALEARr',
    'SALEARRAY',
    // 2. 出售界面渲染相关
    '出售',
    'sellPrice',
    'SellPrice',
    'getSellPrice',
    'sellMoney',
    'sellData',
    // 4. 铜钱链
    'setCoins',
    'baseValueAy[35]'
  ];

  for (const f of files) {
    const stream = fs.createReadStream(f.path, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let lineNum = 0;
    const history = [];

    const fileQueries = {};
    targetPatterns.forEach(p => { fileQueries[p] = []; });
    const coinsDefHits = [];

    rl.on('line', (line) => {
      lineNum++;
      history.push({ lineNum, line });
      if (history.length > 50) history.shift();

      // Check target patterns
      for (const p of targetPatterns) {
        if (line.includes(p)) {
          fileQueries[p].push(f.name + ':' + lineNum + ': ' + line);
        }
      }

      // Check coins assignment/definition
      if (/\bcoins\b\s*[:=]/.test(line) || /\b(?:var|let|const)\s+coins\b/.test(line)) {
        coinsDefHits.push(f.name + ':' + lineNum + ': ' + line);
      }

      // Check Task 3: BuyPrice and Price
      if (line.includes('BuyPrice') || line.includes('Price')) {
        let enclosing = null;
        for (let i = history.length - 2; i >= 0; i--) {
          const h = history[i];
          if (lineNum - h.lineNum > 40) break;
          if (h.line.includes('= function') || /function\s+([a-zA-Z0-9_$]+)?\s*\(/.test(h.line)) {
            enclosing = h;
            break;
          }
        }
        report.hitContext.push({
          hit: f.name + ':' + lineNum + ': ' + line,
          enclosingFunction: enclosing ? (f.name + ':' + enclosing.lineNum + ': ' + enclosing.line) : ('none (within 40 lines in ' + f.name + ')')
        });
      }
    });

    await new Promise(r => rl.on('close', r));

    for (const p of targetPatterns) {
      const hits = fileQueries[p];
      report.queries.push({
        pattern: p,
        file: f.name,
        exit: hits.length > 0 ? 0 : 1,
        hits: hits
      });
      if (hits.length === 0) {
        report.unverified.push('Pattern [' + p + '] in ' + f.name + ': 0 hits');
      }
    }

    report.queries.push({
      pattern: 'coins (assignment/definition)',
      file: f.name,
      exit: coinsDefHits.length > 0 ? 0 : 1,
      hits: coinsDefHits
    });
    if (coinsDefHits.length === 0) {
      report.unverified.push('Pattern [coins (assignment/definition)] in ' + f.name + ': 0 hits');
    }
  }

  // Ensure facts directory exists
  const targetDir = 'F:/BaoZouyxt/tools/facts';
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const outPath = 'F:/BaoZouyxt/tools/facts/r04-sale-price.json';
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log('Successfully written to', outPath);
  console.log('queries:', report.queries.length);
  console.log('hitContext:', report.hitContext.length);
  console.log('unverified:', report.unverified.length);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
