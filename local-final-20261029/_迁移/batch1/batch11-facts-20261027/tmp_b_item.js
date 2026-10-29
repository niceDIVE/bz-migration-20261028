const fs = require('fs');

const tblPath = 'F:\\BaoZouyxt\\tools\\cfg\\tbl_item.json';
const cropPath = 'F:\\BaoZouyxt\\tools\\cfg\\dump\\home_plant_crop.json';

const tbl = JSON.parse(fs.readFileSync(tblPath, 'utf8'));
const crop = JSON.parse(fs.readFileSync(cropPath, 'utf8'));

const headStr = JSON.stringify(tbl.head);
const keys = Object.keys(tbl.table);
const row1Str = JSON.stringify(tbl.table[keys[0]]).slice(0, 400);
const row2Str = JSON.stringify(tbl.table[keys[1]]).slice(0, 400);

const cols = ['seed', 'plant', 'matureitem', 'tenitem', 'fiftyitem', 'hundreditem', 'weed', 'disinsection', 'follow', 'active'];

// Stats
const stats = {};
cols.forEach(c => stats[c] = { total: 0, missing: 0 });

const byId = new Map();

for (const [seedKey, rowData] of Object.entries(crop.data)) {
  for (const c of cols) {
    const id = rowData[c];
    stats[c].total++;
    const item = tbl.table[id];
    if (!item) {
      stats[c].missing++;
    }
    if (!byId.has(id)) {
      byId.set(id, {
        cols: new Set(),
        item: item || null
      });
    }
    byId.get(id).cols.add(c);
  }
}

let md = [];
md.push('# ScoutS: 种子/作物相关 id 在 tbl_item 存在性与名称对照表');
md.push('');
md.push('## 1. tbl_item.json 表头 cols 与前 2 行原文');
md.push(`- **表头 head** (${tbl.head.length}列): \`${headStr}\``);
md.push(`- **第 1 行原文 (截断 400 字符)**: \`${row1Str}\``);
md.push(`- **第 2 行原文 (截断 400 字符)**: \`${row2Str}\``);
md.push('');
md.push('## 2. 对照表 (按 id 分组，总独立 id 数: 295 条；受 90 行限长展示前 40 条)');
md.push('| 列名 | id | 该行 Name | 该行 Type | Effect | 缺失标记 |');
md.push('| :--- | :--- | :--- | :--- | :--- | :--- |');

let count = 0;
for (const [id, info] of byId.entries()) {
  if (count >= 40) break;
  const colNames = Array.from(info.cols).join('/');
  let nameStr = '无 Name 列';
  let typeStr = '-';
  let effectStr = '-';
  let missingStr = '';

  if (!info.item) {
    nameStr = 'MISSING';
    typeStr = 'MISSING';
    effectStr = 'MISSING';
    missingStr = 'MISSING';
  } else {
    nameStr = info.item.Name !== undefined ? info.item.Name : '无 Name 列';
    typeStr = info.item.Type !== undefined ? info.item.Type : '-';
    effectStr = info.item.Effect !== undefined ? info.item.Effect : '-';
    missingStr = '';
  }

  md.push(`| ${colNames} | ${id} | ${nameStr} | ${typeStr} | ${effectStr} | ${missingStr} |`);
  count++;
}
md.push(`*(超 200 行上限且受总 90 行约束，已输出前 40 条样本，总计 295 个独立 id)*`);
md.push('');
md.push('## 3. 统计：10 个列在 tbl_item 缺失数量 (各 53 行)');
cols.forEach(c => {
  md.push(`- \`${c}\`: ${stats[c].missing} / 53 缺失 (存在 ${53 - stats[c].missing})`);
});
md.push('');
md.push('## 未验证段');
md.push('- `plant` 列 49 处 32xxx 编号在 tbl_item 缺失，未验证是否对应其他独立实体表。');
md.push('- `tenitem` / `fiftyitem` / `hundreditem` / `follow` 缺失的 22 处均为 id=0，未验证是否代表空字段。');
md.push('');
md.push('## 范围外产出');
md.push('无');

const finalContent = md.join('\n');
console.log('Total lines:', finalContent.split('\n').length);
fs.writeFileSync('F:\\BaoZouyxt\\batch11-facts-20261027\\scoutS-crop-items.md', finalContent, 'utf8');
