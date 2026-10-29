# C-A-server-conventions

## Item 1: wrapped function
where: hotfix-patch\core\bz-rpc-server.js:353-358
```js
  function wrapped(doName, payload, extra) {
    var r = { error: 0, p: 'User.' + doName, resultCode: 200 };
    r['User.' + doName] = payload;
    if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) r[k] = extra[k];
    return r;
  }
```
Finding: Outer envelope sets error: 0, p: 'User.' + doName, resultCode: 200; doName key is assigned as r['User.' + doName] = payload; extra keys (such as achievement) are copied via if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) r[k] = extra[k]. In handlers, achievement is passed in extra e.g. wrapped(..., ..., { achievement: ach() }).

## Item 2: note fields (note.eco / note.ivch / note.eqch)
where: hotfix-patch\core\bz-rpc-server.js:1379-1383, 2210-2211, 2218, 2638, 832, 2228
```js
// note.eco example 1 (hotfix-patch\core\bz-rpc-server.js:1379-1383)
      base.note.eco = {
        coins: (typeof s.coins === 'number') ? s.coins : 99999,
        gold: (typeof s.gold === 'number') ? s.gold : 99999,
        yuanbao: (typeof s.yuanbao === 'number') ? s.yuanbao : 0,
      };

// note.eco example 2 (hotfix-patch\core\bz-rpc-server.js:2210-2211)
        s.gold = ((typeof s.gold === 'number') ? s.gold : 0) - wantGold;
        note.eco.gold = s.gold;

// note.ivch example 1 (hotfix-patch\core\bz-rpc-server.js:2218)
        note.ivch[kid] = left > 0 ? left : 0;

// note.ivch example 2 (hotfix-patch\core\bz-rpc-server.js:2638)
      if (use > 0) note.ivch[p.itemID] = parseInt(s.bag[p.itemID], 10) || 0;

// note.eqch example 1 (hotfix-patch\core\bz-rpc-server.js:832)
      if (itemTypeOf(iid) === 1) note.eqch[iid] = [1, s.playerEquip[iid]];

// note.eqch example 2 (hotfix-patch\core\bz-rpc-server.js:2228)
        note.eqch[gr.id] = [1, clone(s.playerEquip[gr.id])];
```
Finding: eco is absolute value (new balance, consumed by client ECONOMY_CHNG as direct assignment; potential uses key 'ptt'). ivch keys are item IDs (string or number), and values are absolute remaining counts (parseInt(s.bag[id], 10) || 0; 0 means deleted/exhausted; client setItem directly assigns count). eqch keys are equipment item IDs, and values are tuple [1, equipObjectOrCount].

## Item 3: grantRewardList
where: hotfix-patch\core\bz-rpc-server.js:818-836, 1194, 3274
```js
// Full function body (hotfix-patch\core\bz-rpc-server.js:818-836)
  function grantRewardList(s, list, note, ra) {
    for (var i = 0; i < list.length; i++) {
      var pair = list[i];
      if (!pair || pair.length !== 2) continue;
      var iid = parseInt(pair[0], 10) || 0;
      var ic = parseInt(pair[1], 10) || 0;
      if (!(iid > 0) || !(ic > 0)) continue;
      ra[iid] = (parseInt(ra[iid], 10) || 0) + ic;
      if (isCurrencyItem(iid)) {
        var eco = grantCurrency(s, iid, ic);
        if (eco) { for (var k in eco) if (eco.hasOwnProperty(k)) note.eco[k] = eco[k]; }
        continue;
      }
      grantItem(s, iid, ic);
      if (itemTypeOf(iid) === 1) note.eqch[iid] = [1, s.playerEquip[iid]];
      else note.ivch[iid] = parseInt(s.bag[iid], 10) || 0;
    }
    return ra;
  }

// Call example 1 (hotfix-patch\core\bz-rpc-server.js:1194)
    var ra = grantRewardList(s, list, note, {});

// Call example 2 (hotfix-patch\core\bz-rpc-server.js:3274)
          grantRewardList(s, [[gid, gn]], payload.note, {});
```
Finding: grantRewardList iterates through pair list [[itemId, count], ...], records into ra, delegates currency items to grantCurrency and writes into note.eco, and delegates other items to grantItem and writes absolute values into note.eqch or note.ivch.

## Item 4: isCurrencyItem and CURRENCY_SLOTS
where: hotfix-patch\core\bz-rpc-server.js:791-792, 805-810
```js
// isCurrencyItem definition (hotfix-patch\core\bz-rpc-server.js:791-792)
  var CURRENCY_IDS = { 1: 1, 2: 1, 4001: 1, 4002: 1, 4003: 1 };
  function isCurrencyItem(id) { return !!CURRENCY_IDS[parseInt(id, 10) || 0]; }

// CURRENCY_SLOTS definition (hotfix-patch\core\bz-rpc-server.js:805-810)
  var CURRENCY_SLOTS = {
    1: { f: 'gold', k: 'gold' },
    4001: { f: 'coins', k: 'coins' },
    4003: { f: 'potential', k: 'ptt' },
    8888: { f: 'yuanbao', k: 'yuanbao' }
  };
```
Finding: isCurrencyItem returns boolean indicating if integer id is in CURRENCY_IDS (1, 2, 4001, 4002, 4003). CURRENCY_SLOTS maps currency item IDs to save property field f and note.eco key k (1: gold/gold; 4001: coins/coins; 4003: potential/ptt; 8888: yuanbao/yuanbao).

## Item 5: ach()
where: hotfix-patch\core\bz-rpc-server.js:352
```js
  function ach() { return (TPL.create && clone(TPL.create.achievement)) || { red: false, achieveRateId: 0 }; }
```
Finding: ach() returns a cloned achievement template object from TPL.create.achievement if available, or fallback default object { red: false, achieveRateId: 0 }.

## Item 6: persist()
where: hotfix-patch\core\bz-rpc-server.js:421-460
```js
  function persist() {
    if (_readOnly) { env.log('⚠ 只读模式：拒绝写档（动作 ' + (_currentAction || '?') + '）'); return false; }
    var bad = null;
    try { validateSave(_save); }
    catch (e) { bad = '校验失败: ' + e; }
    if (!bad) bad = guardSave(_lastGood, _save);
    if (bad) {
      var canRollback = _lastGood != null;
      if (canRollback) _save = cloneJson(_lastGood);
      env.log('⚠ 写前守卫拒绝（动作 ' + (_currentAction || '?') + '）: ' + bad + (canRollback ? ' → 内存已回滚到上次落盘快照' : ' → 无可回滚快照'));
      return false;
    }
    if (!env.sandbox) {
      _save.meta = _save.meta || {};
      _save.meta.actionStats = cloneJson(_actionStats) || {};
      _save.meta.rejectStats = cloneJson(_rejectStats) || {};
      _save.meta.consumeStats = cloneJson(_consumeStats) || {};
    }
    if (_hungerMax > 0) _save.hungerMax = _hungerMax;
    var text;
    try { text = JSON.stringify(_save); } catch (e2) { env.log('存档序列化失败: ' + e2); return false; }
    try { env.writeSave(SAVE_KEY, text); } catch (e3) { env.log('存档写入失败: ' + e3); return false; }
    try {
      var back = env.readSave(SAVE_KEY);
      if (back !== text) {
        env.log('⚠ 写后回读不一致（回读 ' + (back == null ? 'null' : String(back).length) + ' B / 写入 ' + text.length + ' B），本档可能不可靠');
        return false;
      }
    } catch (e4) { env.log('写后回读失败: ' + e4); }
    _lastGood = cloneJson(_save);
    return true;
  }
```
Finding: When it writes to disk: Called whenever save state modifications (currency, bag items, equipment, quest progress, skills, etc.) need to be persisted to disk. It validates schema with validateSave(_save), checks shrinkage with guardSave(_lastGood, _save), attaches meta stats (_actionStats, _rejectStats, _consumeStats), serializes to JSON string, writes via env.writeSave(SAVE_KEY, text), and verifies write with env.readSave(SAVE_KEY). Whether handlers must invoke it themselves: YES. Handlers that modify save data MUST explicitly call persist() before returning response (as seen across all mutating handlers like useItem, buyShopItem, QuickBuyItem, etc.; dispatch does NOT automatically call persist()).

## Item 7: REJECT_CODES and related rejection helpers
where: hotfix-patch\core\bz-rpc-server.js:98-103, 65, 194-203
```js
// 5 sample rows of REJECT_CODES table (hotfix-patch\core\bz-rpc-server.js:98-103)
  var REJECT_CODES = {
    useItem: { default: 5, recipeLearned: 5, effectUnmodeled: 3 },
    BeginTraining: { default: 4, notLearned: 4 },
    BuyFashion: { default: 4 },
    buyShopItem: { default: 4 },
    buySpecialShopItem: { default: 4 },

// narrowReject signature and body (hotfix-patch\core\bz-rpc-server.js:194-203)
  function narrowReject(action, res) {
    var inner = res && res['User.' + action];
    if (!inner || typeof inner !== 'object' || Array.isArray(inner)) return res;
    if (inner.eRet === 1 || inner.eRet === undefined || inner.eRet === null) return res;
    if (!hasOwn(REJECT_CODES, action)) return res;
    var allow = ['eRet'].concat(REJECT_ALLOW[action] || []);
    var keys = Object.keys(inner);
    for (var i = 0; i < keys.length; i++) if (allow.indexOf(keys[i]) < 0) delete inner[keys[i]];
    return res;
  }

// noteReject signature and body (hotfix-patch\core\bz-rpc-server.js:65-70)
  function noteReject(action, reason, info) {
    env.log('⚠ REJECT ' + action + ' reason=' + reason + (info ? (' ' + info) : ''));
    if (env.sandbox) return;
    var k = action + ':' + reason;
    _rejectStats[k] = (_rejectStats[k] || 0) + 1;
  }
```
Finding: REJECT_CODES table maps action name to an object containing reject reason keys and their corresponding eRet error code numbers. Adding a new action rejection requires modifying: 1) tools\facts\reject-codes.json (the authoritative source defining catchCode / handled / reasons); 2) REJECT_CODES table in hotfix-patch\core\bz-rpc-server.js (runtime copy verified by build-handlers.js bidirectional assertion); 3) REJECT_ALLOW table in hotfix-patch\core\bz-rpc-server.js if the rejection response needs to preserve extra fields beyond eRet; 4) verification tests (tools\check_reject_codes.js and test\r13-reject-codes.js). narrowReject signature is function narrowReject(action, res) and noteReject signature is function noteReject(action, reason, info).

## Item 8: Standard pattern for deducting bag items
where: hotfix-patch\core\bz-rpc-server.js:617-627, 2636-2638, 3458-3464
```js
// Standard helper definition (hotfix-patch\core\bz-rpc-server.js:617-627)
  function bagAdd(s, id, n) {
    var iid = parseInt(id, 10);
    var d = parseInt(n, 10);
    if (!(iid > 0) || !d) return 0;
    var cur = parseInt(s.bag[iid], 10) || 0;
    cur += d;
    if (cur < 0) cur = 0;
    if (cur === 0) delete s.bag[iid];
    else s.bag[iid] = cur;
    return cur;
  }

// Real deduction example (hotfix-patch\core\bz-rpc-server.js:2636-2638 in useItem)
      var left = bagAdd(s, p.itemID, -use);
      if (use < n) env.log('useItem ' + p.itemID + ' 截断：请求 x' + n + '，真实库存只有 ' + have + '（叠加量不可消耗）');
      if (use > 0) note.ivch[p.itemID] = parseInt(s.bag[p.itemID], 10) || 0;
```
Finding: Existing code deducts bag items using helper function bagAdd(s, id, -count), which parses id and delta, decrements quantity, deletes key from s.bag when reaching 0, and updates note.ivch[id] with the new absolute balance parseInt(s.bag[id], 10) || 0.

## Item 9: Save object s field access examples
where: hotfix-patch\core\bz-rpc-server.js:2502, 2782, 2835, 1872, 1587, 1255
```js
// s.bag (line 2502):
      var have = parseInt(s.bag[p.itemID], 10) || 0;

// s.coins (line 2782):
      s.coins -= cost;

// s.gold (line 2835):
      s.gold -= cost;

// s.yuanbao (line 1872):
      if (cost > 0) s.yuanbao -= cost;

// s.potential (line 1587):
      s.potential = Math.max(0, pot - 100 * gained);

// s.school (line 1255):
      s.school = p.school || 0;
```
Finding: 1 line real access examples for s.bag, s.coins, s.gold, s.yuanbao, s.potential, and s.school.

