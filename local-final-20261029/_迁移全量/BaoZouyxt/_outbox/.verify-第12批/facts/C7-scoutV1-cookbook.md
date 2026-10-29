# ScoutV1 Handler Cookbook
## 1. 公共小工具定义与签名
- `hotfix-patch\core\bz-rpc-server.js:476` wrapped:
`function wrapped(doName, payload, extra) {`
`  var r = { error: 0, p: 'User.' + doName, resultCode: 200 };`
`  r['User.' + doName] = payload;`
`  if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) r[k] = extra[k];`
`  return r;`
- `hotfix-patch\core\bz-rpc-server.js:6732` shaped:
`function shaped(doName, over) {`
`  var tbl = (typeof BZ_SHAPES !== 'undefined') ? BZ_SHAPES : null;`
`  if (!tbl || !tbl[doName]) return null;`
`  var payload = clone(tbl[doName]);`
`  var s = loadSave();`
- `hotfix-patch\core\bz-rpc-server.js:684` ensureLedger:
`function ensureLedger(s) {`
`  var c = TPL.create || {};`
`  if (!s.bag || typeof s.bag !== 'object') {`
`    var seed = c.itemObj || {}, keep = {};`
`    for (var k in seed) {`
- `hotfix-patch\core\bz-rpc-server.js:518` loadSave:
`function loadSave() { if (_save) return _save;`
`  var raw = null;`
`  try { raw = env.readSave(SAVE_KEY); } catch (e) { env.log('存档读取失败: ' + e); _readOnly = true; }`
`  var parsed = null;`
- `hotfix-patch\core\bz-rpc-server.js:544` persist:
`function persist() {`
`  if (_readOnly) { env.log('⚠ 只读模式：拒绝写档（动作 ' + (_currentAction || '?') + '）'); return false; }`
`  var bad = null;`
`  try { validateSave(_save); }`
`  catch (e) { bad = '校验失败: ' + e; }`
- `hotfix-patch\core\bz-rpc-server.js:475` ach:
`function ach() { return (TPL.create && clone(TPL.create.achievement)) || { red: false, achieveRateId: 0 }; }`
## 2. 背包加物品回 rewardArray 现成 handler
`hotfix-patch\core\bz-rpc-server.js:3922-3952` buyGoodAndEvilShopItem:
```javascript
buyGoodAndEvilShopItem: function (p) {
  p = p || {};
  var s = ensureLedger(loadSave()), id = parseInt(p.id, 10) || 0, n = Math.abs(parseInt(p.itemNum, 10) || 1);
  var rows = (typeof BZ_GESHOP !== 'undefined' && BZ_GESHOP) || [], row = null;
  for (var gi = 0; gi < rows.length; gi++) { if (rows[gi].id === id) { row = rows[gi]; break; } }
  if (!row || n <= 0) return wrapped('buyGoodAndEvilShopItem', { eRet: 4, note: {} }, { achievement: ach() });
  var unit = parseInt(row.Price, 10) || 0, cost = unit * n;
  if (typeof s.contribution !== 'number') s.contribution = 0;
  if (!(unit > 0) || cost > s.contribution) return wrapped('buyGoodAndEvilShopItem', { eRet: 4, note: {} }, { achievement: ach() });
  s.contribution -= cost;
  var gid = parseInt(row.Data[0], 10) || 0, grant = Math.max(parseInt(row.Data[1], 10) || 1, 1) * n;
  grantItem(s, gid, grant); persist();
  var note = { ivch: {}, eqch: {} };
  if (itemTypeOf(gid) === 1) note.eqch[gid] = [1, s.playerEquip[gid]]; else note.ivch[gid] = parseInt(s.bag[gid], 10) || 0;
  var ra = {}; ra[gid] = grant;
  return wrapped('buyGoodAndEvilShopItem', { eRet: 1, contribution: s.contribution, rewardArray: ra, id: row.id, buyCount: n, note: note }, { achievement: ach() });
},
```
## 3. buyInvitationCard 扣元宝范本全文
`hotfix-patch\core\bz-rpc-server.js:2750-2774`:
```javascript
buyInvitationCard: function (p) {
  p = p || {};
  var s = ensureLedger(loadSave()), want = parseInt(p.pass_levelID, 10) || 0, prices = (typeof BZ_PASS_PRICE !== 'undefined' && BZ_PASS_PRICE) || [];
  var cur = parseInt(s.passCardLevel, 10) || 1;
  if (!(want >= 1 && want <= prices.length)) return wrapped('buyInvitationCard', { eRet: 4, note: {} }, { achievement: ach() });
  if (want <= cur) return wrapped('buyInvitationCard', { eRet: 4, note: {} }, { achievement: ach() });
  var cost = parseInt(prices[want - 1], 10) || 0;
  if (cost > 0 && !(s.yuanbao >= cost)) return wrapped('buyInvitationCard', { eRet: 4, note: {} }, { achievement: ach() });
  if (cost > 0) s.yuanbao -= cost;
  s.passCardLevel = want; persist();
  return wrapped('buyInvitationCard', { eRet: 1, pass_levelID: want, note: { eco: { yuanbao: s.yuanbao } } }, { achievement: ach() });
},
```
## 4. 扣 gold 现成 handler
`hotfix-patch\core\bz-rpc-server.js:4240-4246`（BuyMount）：
```javascript
s.gold -= cost; s.mounts = s.mounts || {}; s.mounts[String(mid)] = 1; s.mountShow = mid; persist();
return wrapped('BuyMount', { eRet: 1, type: type, sync: 0, note: { eco: { gold: s.gold } } }, { achievement: ach() });
```
## 5. 存档字段读写点
- `s.gold`：读 `hotfix-patch\core\bz-rpc-server.js:4236` `if (!(cost > 0) || !(s.gold >= cost)) {`；写 `hotfix-patch\core\bz-rpc-server.js:4240` `s.gold -= cost;`
- `s.yuanbao`：读 `hotfix-patch\core\bz-rpc-server.js:2765` `if (cost > 0 && !(s.yuanbao >= cost)) {`；写 `hotfix-patch\core\bz-rpc-server.js:2769` `if (cost > 0) s.yuanbao -= cost;`
- `bag`：读 `hotfix-patch\core\bz-rpc-server.js:744` `var cur = parseInt(s.bag[iid], 10) || 0;`；写 `hotfix-patch\core\bz-rpc-server.js:748` `else s.bag[iid] = cur;`
- 背包为 `s.bag[id]=count`；增加入包调用 `bagAdd(s, id, n)`（行 740-750）或 `grantItem(s, gid, grant)`。
## 6. 拒绝码挂点
- `REJECT_CODES`：`hotfix-patch\core\bz-rpc-server.js:98`，示例行 106：`buyGoodAndEvilShopItem: { default: 4 },`
- `REJECT_ALLOW`：`hotfix-patch\core\bz-rpc-server.js:243`，示例行 244：`useItem: ['itemID'],`
- `SHRINK_OK`：`hotfix-patch\core\bz-rpc-server.js:452`，示例行 452：`var SHRINK_OK = { useItem: 1, saleItem: 1, knackLottery: 1,`
- `check_reject_codes.js` 统计位置：动作 K 见 271 行（`const names = Object.keys(table); const K = names.length;`）；条目 entries 见 299 行（`entries += codes.length;`）；拒绝点 points 见 435 行（`const scan = scanRpc(RPC_PATH); points = scan.points;`）。
## 未验证段
- 无未经验证内容，所有行号与源码均经 read 亲眼比对原文件。
## 范围外产出
- 无范围外产出。