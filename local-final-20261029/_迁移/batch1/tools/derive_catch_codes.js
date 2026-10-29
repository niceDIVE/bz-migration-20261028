'use strict';
/**
 * derive_catch_codes.js —— 从 `tools\facts\reject-codes.json` **推导**每个动作的 catchCode。
 *
 * 为什么需要这个文件（SOTA R15 §1 第 1 条 / 反例 1）：
 *   `dispatch` 的 catch 原来一律回 `eRet:4`，但 4 在不同动作的回调里语义完全不同 ——
 *   `ExChangeJetton` 的 4 是支付拦截、`useItem` 的 4 会解引用 `item.Data2` 弹"需消耗[1]个[2]"、
 *   有的动作 4 是"弹出选择框"。回错码 = 让客户端走进一个它以为存在的分支（空界面 / TypeError）。
 *   所以 catchCode 必须**按动作推导**：取一个该动作的客户端回调里**根本没出现过**的码，
 *   这样所有 `X == eRet` 比较都为假 → 客户端安静地什么都不做。
 *
 * 规则：catchCode ∉ success ∪ handled ∪ codes[].code（codes 含 reject/flow/capture/intercept）。
 *   候选池刻意避开 1/2/4/5 这些常见语义词，从冷门码里取第一个可用的；
 *   池子被占满 → 抛错（强迫人去看这个动作，而不是随便挑一个）。
 *
 * 用途：build-handlers.js 用它注入产物（`var BZ_CATCH_CODES = {...}`）；
 *      测试用同一份实现定义全局 BZ_CATCH_CODES，保证"测的和线上跑的是同一个推导"。
 */
const POOL = [0, 3, 7, 9, 12, 14, 17, 19, 21];

function deriveCatchCodes(table) {
  const out = {};
  for (const act of Object.keys(table || {}).sort()) {
    const entry = table[act] || {};
    const forbidden = new Set([1]);
    (entry.success || []).forEach((x) => { if (typeof x === 'number') forbidden.add(x); });
    (entry.handled || []).forEach((x) => { if (typeof x === 'number') forbidden.add(x); });
    (entry.codes || []).forEach((c) => forbidden.add(c.code));
    const derived = POOL.find((x) => !forbidden.has(x));
    if (derived === undefined) {
      throw new Error('拒绝码表 ' + act + ' 推导不出 catchCode（码空间被占满，必须人工复核）');
    }
    out[act] = derived;
  }
  return out;
}

module.exports = { deriveCatchCodes, POOL };
