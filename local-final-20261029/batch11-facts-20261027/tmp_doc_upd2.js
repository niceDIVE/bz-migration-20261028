const fs=require('fs');
const p='batch11-facts-20261027/C10-c10-执行记录.md';
let t=fs.readFileSync(p,'utf8');
t=t.replace('| build ver | **h69467eef**（selfCheck **1299** 全过） |','| build ver | **h90b31552**（selfCheck **1300** 全过） |');
t=t.replace('| acceptance | **50/50**，已知红 0，cap 0 |','| acceptance | **50/50**，已知红 0，cap 0（c10-smoke 由 15 条增到 **18 条**） |');
t=t.replace('| reject-codes | 动作 **94** / 条目 **108** / 拒绝点 **145** 处（flow 1 条） |','| reject-codes | 动作 **96** / 条目 **110** / 拒绝点 **149** 处（flow 1 条） |');
t=t.replace('| c10-smoke | **15/15** |','| c10-smoke | **18/18** |');
t=t.replace('| 收获/事件 | **按状态取产物；事件本批不随机刷** |','| 商店 | **补家园种子商店**（`getBackShop` + `BuyHomeCrop`） | 平价（买价 = 表里 `item.Price`：100/1000）＋不限购；货架 35 行（53 种里只有 35 个在 `tbl_item` 有行） |\n| 收获/事件 | **按状态取产物；事件本批不随机刷** |');
const block = [
'## 五之二、回执包（2026-10-27 交付）',
'- `_incoming\\下游回执-第11批C10-20261027.zip`：649,433 B，md5 `DB59771DFA7C25E4D9E183DA1EE11F77`，sha256 `5CA995AD…2B10`，73 条目。',
'- 结构同 C08/C09：`00-转发说明` + `01-receipt-batch11-c10` + `02-manifest` + 根 `bz-rpc-server.js` + `core\\`（含 `bz-c10.generated.js`）+ `facts\\C1–C11` + `test\\`（全量）+ `tools\\gen_c10_tables.js`。',
'- 解包自验：`core\\bz-rpc-server.js` md5 `7FDDAEE8…` == 部署版；解包目录内 `node test\\c10-smoke.js` **18/18**。',
'- ⚠ 要发的就这一个文件。',
'',
'## 六、未验证 / 风险（诚实清单）'
].join('\n');
t=t.replace('## 六、未验证 / 风险（诚实清单）', block);
t=t.replace('1. **真机播种→收获闭环未做**（缺种子来源，见 §4.3）。','1. ~~真机播种→收获闭环未做~~ → **已打通**（见 §4.3）。');
fs.writeFileSync(p,t,'utf8');
console.log('ok');
