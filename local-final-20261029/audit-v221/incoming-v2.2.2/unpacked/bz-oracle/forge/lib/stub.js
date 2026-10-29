'use strict';
// 兜底 handler：没有真实现的动作按契约生成"中性应答"，并记录命中次数（= 被动录制的优先级来源）。
// 原则：开关字段（switch:true）一律不发；不写存档；不发 note；付费动作回 payBlockedERet。
// 字段取值策略：
//   minimal   只回 {eRet:1}（最安全；客户端若直接 .length / for-in 读缺失字段会在 L0 暴露）
//   heuristic 非开关的 plain 字段按名字猜类型【推断】：List/Arr/Ids/s 结尾 → []；Obj/Info/Dic/Map/Data 结尾 → {}；其余不发
// 中层审计 A3/S5：付费名单单一来源 = config/oracle.config.json 的 payActionRe（裁判与兜底共用，不再各自维护）
const path = require('path');
function cfgPayRe() {
  try {
    const cfg = require(path.resolve(__dirname, '../../config/oracle.config.json'));
    let s = cfg.payActionRe, f = '';
    if (s.startsWith('(?i)')) { f = 'i'; s = s.slice(4); }
    return { re: new RegExp(s, f), eRet: cfg.payBlockedERet };
  } catch (e) { throw new Error('兜底需要 config/oracle.config.json 的 payActionRe：' + e.message); }
}
const PAY = cfgPayRe();
const PAY_RE_DEFAULT = PAY.re;
// 人工登记的禁兜底动作/字段（S3 后续推送依赖、S4 无 required 但回空即崩，如 parseEq 链 M4:69）
function denyList() { try { return require(path.resolve(__dirname, '../../config/stub-deny.json')); } catch (e) { return { actions: {}, fieldRe: null }; } }

function guessNeutral(name) {
  if (/(List|Arr|Ary|Ay|Ids|Array)$/.test(name) || /[a-z]s$/.test(name)) return [];
  if (/(Obj|Info|Dic|Map|Data|Dict)$/.test(name)) return {};
  return undefined;
}

function stubBody(action, contracts, opt = {}) {
  const payRe = opt.payRe || PAY_RE_DEFAULT;
  if (payRe.test(action)) return { body: { eRet: opt.payBlockedERet ?? PAY.eRet ?? 4 }, why: 'pay' };
  const deny = opt.deny || denyList();
  if (deny.actions && deny.actions[action]) return { body: { eRet: 1 }, why: 'denied', guessed: [], unsafe: true, deniedWhy: deny.actions[action] };
  const fieldDeny = deny.fieldRe ? new RegExp(deny.fieldRe) : null;
  const cid = contracts.byAction[action];
  const k = cid && contracts.contracts[cid];
  const body = { eRet: 1 };
  const guessed = [];
  if (k && opt.policy === 'heuristic') {
    for (const [f, spec] of Object.entries(k.fields)) {
      // 中层审计 A3#1：真值测试读（if (o.x) / o.x && …）缺席=假、空容器=真，发了会翻转分支 → 不发
      if (spec.switch || spec.truthy || !spec.plain || spec.fk || spec.nested) continue;
      if (fieldDeny && fieldDeny.test(f)) continue;
      const v = guessNeutral(f);
      if (v !== undefined) { body[f] = v; guessed.push(f); }
    }
  }
  // 有必回字段/形状约束的动作（如 LoadGame、sycnPlayerItemData 的全量 itemObj）不能兜底：回空 = 清空客户端状态
  const unsafe = !!(k && ((k.required && k.required.length) || (k.shapes && Object.keys(k.shapes).length)));
  return { body, why: k ? (k.closed ? 'closed-contract' : 'open-contract') : 'no-contract', guessed, unsafe };
}

// 运行时：makeFallback(contracts, {onHit}) → handler(req, save) 返回 {resp, saveAfter, stub:true}
function makeFallback(contracts, opt = {}) {
  const hits = opt.hits || {};
  return function (req, save) {
    const action = `${req.mod}.${req.do}`;
    hits[action] = (hits[action] || 0) + 1;
    if (opt.onHit) opt.onHit(action, hits[action]);
    const { body, unsafe } = stubBody(action, contracts, opt);
    // 中层审计 A1-C8：运行时也标出不安全兜底（之前只在生成 stubs.json 时拦）
    return { resp: body, saveAfter: save, stub: true, unsafeStub: !!unsafe };
  };
}
module.exports = { stubBody, makeFallback, guessNeutral };
