'use strict';
// 六层裁判。每层输入一个 case（见 README「case 格式」），输出 findings：[{layer, level:'FAIL'|'WARN'|'INFO', code, msg, path?}]
const { isObj, num, diff, clone } = require('./util');

function re(s) {
  if (!s) return null;
  let flags = '';
  if (s.startsWith('(?i)')) { flags = 'i'; s = s.slice(4); }
  return new RegExp(s, flags);
}

function F(layer, level, code, msg, extra) { return Object.assign({ layer, level, code, msg }, extra || {}); }

// 中层审计 A2#2：case.meta 里的豁免开关（abolish / fullReload / l4Allow）只有在 config.metaEscapes 为该动作登记过时才生效。
// case 作者（录制、HAR、生成器回放）无法自行关闭检查；被忽略的豁免报 WARN L*.META_IGNORED。
function metaEscape(c, ctx, key, out, layer) {
  const want = c.meta && c.meta[key];
  if (!want || (Array.isArray(want) && !want.length)) return key === 'l4Allow' ? [] : false;
  const reg = ((ctx.cfg.metaEscapes || {})[c.action] || {})[key];
  if (key === 'l4Allow') {
    const ok = new Set(Array.isArray(reg) ? reg : []);
    const kept = want.filter(p => ok.has(p)), dropped = want.filter(p => !ok.has(p));
    if (dropped.length && out) out.push(F(layer, 'WARN', `${layer}.META_IGNORED`, `case.meta.l4Allow ${JSON.stringify(dropped)} 未在 config.metaEscapes["${c.action}"].l4Allow 登记，忽略`));
    return kept;
  }
  if (reg === true) return true;
  if (out) out.push(F(layer, 'WARN', `${layer}.META_IGNORED`, `case.meta.${key} 未在 config.metaEscapes["${c.action}"] 登记，忽略（豁免只能由配置授予）`));
  return false;
}

function getPath(o, p) {
  return p.split('.').reduce((v, k) => (v == null ? undefined : v[k]), o);
}
function hasPath(o, p) {
  const ks = p.split('.');
  let v = o;
  for (const k of ks) { if (!isObj(v) || !(k in v)) return false; v = v[k]; }
  return true;
}

function bagOf(save) {
  const out = {};
  for (const [k, v] of Object.entries((save && save.bag) || {})) if (v) out[String(k)] = v;
  return out;
}
function walletOf(save, cfg) {
  const out = {};
  for (const [eco, sk] of Object.entries(cfg.eco.saveMap)) if (save && num(save[sk])) out[eco] = save[sk];
  return out;
}

// ---------------- L0 异常探针 ----------------
function L0(c, ctx) {
  const out = [];
  const ex = c.exceptions || [];
  for (const e of ex) out.push(F('L0', 'FAIL', 'L0.EXCEPTION', `客户端监听器抛异常（被 MessageCenter 吞掉）：${e.msg || e}`, { path: e.event || null, stack: e.stack }));
  const allow = (ctx.cfg.toastAllow || []).map(re);
  for (const t of c.toasts || []) {
    const text = typeof t === 'string' ? t : t.text;
    if (!allow.some(r => r.test(text))) out.push(F('L0', 'WARN', 'L0.TOAST', `出现未登记的提示文案：${text}`));
  }
  // 中层审计 A2#5：探针没挂上 = L0 失明，默认判 FAIL（cfg.noProbeIs 可降级）
  if (c.probe && c.probe.mode === 'none') out.push(F('L0', ctx.cfg.noProbeIs || 'FAIL', 'L0.NO_PROBE', '设备探针未挂上监听器，异常不可见：这个用例的 PASS 不含 L0'));
  if (c.probe && c.probe.mode === 'offline-replay') out.push(F('L0', 'INFO', 'L0.NOT_RUN', '离线回放：L0（异常/提示）未参与'));
  return out;
}

// ---------------- L1 契约 ----------------
function shapeCheck(v, spec, c, ctx) {
  // 返回错误字符串或 null
  if (spec.startsWith('stringArray:')) {
    const r = new RegExp(spec.slice(12));
    if (!Array.isArray(v)) return `应为字符串数组，实为 ${Array.isArray(v) ? 'array' : typeof v}`;
    const bad = v.find(x => typeof x !== 'string' || !r.test(x));
    return bad !== undefined ? `元素 ${JSON.stringify(bad)} 不符合 ${r}` : null;
  }
  if (spec.startsWith('arrayLen:')) {
    const n = +spec.slice(9);
    return Array.isArray(v) && v.length === n ? null : `应为长度 ${n} 的数组`;
  }
  if (spec.startsWith('objectOf:')) {
    const t = spec.slice(9);
    if (!isObj(v)) return `应为对象，实为 ${Array.isArray(v) ? 'array' : typeof v}`;
    const bad = Object.entries(v).find(([, x]) => typeof x !== t);
    return bad ? `键 ${bad[0]} 的值不是 ${t}` : null;
  }
  if (spec === 'fullBag') {
    if (!isObj(v)) return '应为对象';
    const bag = bagOf(c.saveAfter || c.saveBefore);
    const got = {};
    for (const [k, x] of Object.entries(v)) if (x) got[String(k)] = typeof x === 'number' ? x : (x && x.num) || x;
    const d = diff(bag, got);
    if (Object.keys(bag).length && !Object.keys(got).length) return '回了空 itemObj，而存档背包非空 → 客户端会清空背包';
    return d.length ? `itemObj 与存档背包不一致：${d.slice(0, 3).map(x => x.path).join(', ')}` : null;
  }
  return null;
}

function L1(c, ctx) {
  const out = [];
  const { cfg, contracts, tables } = ctx;
  const r = c.resp;
  if (!isObj(r)) return [F('L1', 'FAIL', 'L1.NO_RESP', '应答体不是对象')];
  if (!num(r.eRet)) out.push(F('L1', 'FAIL', 'L1.ERET', `eRet 不是数字：${JSON.stringify(r.eRet)}`));

  // 信封（若 case 带了原始信封）
  if (c.envelope) {
    const env = c.envelope;
    if (env.p !== c.action) out.push(F('L1', 'FAIL', 'L1.ENV_P', `信封 p=${env.p} 与动作 ${c.action} 不符`));
    if (env.p && !isObj(env[env.p])) out.push(F('L1', 'FAIL', 'L1.ENV_BODY', `信封缺 ${env.p} 键`));
    if (c.transport === 'game' && env.code !== 200 && !(c.rawTransport && c.rawTransport.code === 200)) {
      out.push(F('L1', 'FAIL', 'L1.ENV_CODE', '游戏服信封缺 code:200（客户端会静默丢弃，全量 §五）'));
    }
  }

  // 付费
  const payRe = re(cfg.payActionRe);
  if (payRe && payRe.test(c.action || '')) {
    if (r.eRet !== cfg.payBlockedERet) out.push(F('L1', 'FAIL', 'L1.PAY_NOT_BLOCKED', `付费动作必须 eRet:${cfg.payBlockedERet}，实为 ${r.eRet}`));
  }

  const cid = contracts.byAction[c.action];
  const k = cid && contracts.contracts[cid];
  if (!k) {
    // 中层审计 A2#1：无契约 = L1 零字段检查，默认判 FAIL（cfg.noContractIs 可降级；HAR 取证类用 --layers 另行处理）
    out.push(F('L1', ctx.cfg.noContractIs || 'FAIL', 'L1.NO_CONTRACT', `动作 ${c.action} 没有契约（不在 M2/M1 映射里，可能是 HttpConst3 等未入表常量）：字段检查为零，不能判 PASS`));
  } else {
    if (!k.closed) out.push(F('L1', 'INFO', 'L1.OPEN_CONTRACT', `契约未闭合：${k.openReasons.join('；')}`));
    const success = r.eRet === 1;
    // 必回字段
    if (success) for (const p of k.required || []) {
      if (!hasPath(r, p)) out.push(F('L1', 'FAIL', 'L1.REQUIRED', `缺必回字段 ${p}`, { path: p }));
    }
    // 形状
    for (const [p, spec] of Object.entries(k.shapes || {})) {
      if (!hasPath(r, p)) continue;
      const err = shapeCheck(getPath(r, p), spec, c, ctx);
      if (err) out.push(F('L1', 'FAIL', 'L1.SHAPE', `${p}：${err}`, { path: p }));
    }
    // 开关字段 / 外键
    const zeroOk = new Set(k.switchZeroAllowed || []);
    for (const [fname, f] of Object.entries(k.fields)) {
      if (!(fname in r)) continue;
      const v = r[fname];
      if (f.switch && !zeroOk.has(fname) && (v === 0 || v === null || v === '' || v === false)) {
        out.push(F('L1', 'FAIL', 'L1.SWITCH_FALSY', `开关字段 ${fname}=${JSON.stringify(v)}：客户端按 hasOwnProperty 进入分支（F1 事故形态），缺省必须不发`, { path: fname, lines: f.reads.map(x => `${x.file}:${x.line}`) }));
      }
      if (f.fk && tables && tables[f.fk]) {
        if (!(String(v) in tables[f.fk])) out.push(F('L1', 'FAIL', 'L1.FK', `${fname}=${v} 在表 ${f.fk} 里不存在（客户端 getItem 得 null）`, { path: fname }));
      } else if (f.fk && tables && !tables[f.fk]) {
        out.push(F('L1', 'INFO', 'L1.FK_TABLE_MISSING', `外键表 ${f.fk} 未加载，跳过 ${fname}`));
      }
      if (f.nested && isObj(v) && tables && tables[f.nested.table]) {
        const nv = v[f.nested.path];
        if (!(String(nv) in tables[f.nested.table])) out.push(F('L1', 'FAIL', 'L1.FK', `${fname}.${f.nested.path}=${nv} 在表 ${f.nested.table} 里不存在`, { path: `${fname}.${f.nested.path}` }));
      }
    }
    // 契约外字段（客户端不读）
    const known = new Set(Object.keys(k.fields).concat(['eRet', 'note'], (k.required || []).map(x => x.split('.')[0])));
    if (k.closed) for (const key of Object.keys(r)) if (!known.has(key)) out.push(F('L1', 'INFO', 'L1.UNREAD_FIELD', `字段 ${key} 客户端不读（契约已闭合）`));
  }

  out.push(...noteCheck(c, ctx));
  return out;
}

// note 语义（M4），属于 L1
function noteCheck(c, ctx) {
  const out = [];
  const { cfg } = ctx;
  const note = c.resp && c.resp.note;
  const after = c.saveAfter, before = c.saveBefore;
  if (note !== undefined && !isObj(note)) return [F('L1', 'FAIL', 'L1.NOTE_TYPE', 'note 不是对象')];
  const n = note || {};
  const knownNote = new Set(cfg.noteKeys.known);
  for (const k of Object.keys(n)) if (!knownNote.has(k)) out.push(F('L1', 'FAIL', 'L1.NOTE_KEY', `note.${k} 没有客户端监听（键名即事件名，拼错静默丢弃，M4 §0）`, { path: `note.${k}` }));

  const cur = new Set(cfg.currencyItemIds.map(String));
  // ivch
  if (n.ivch !== undefined) {
    if (!isObj(n.ivch)) out.push(F('L1', 'FAIL', 'L1.IVCH_TYPE', 'note.ivch 不是对象'));
    else for (const [id, v] of Object.entries(n.ivch)) {
      if (!Number.isInteger(v) || v < 0) out.push(F('L1', 'FAIL', 'L1.IVCH_VAL', `ivch[${id}]=${v} 不是非负整数`));
      if (cur.has(String(id))) out.push(F('L1', 'FAIL', 'L1.CURRENCY_IN_BAG', `货币 ${id} 进了 ivch（货币只走 eco）`));
      if (after && after.bag) {
        const want = after.bag[id] || 0;
        if (v !== want) out.push(F('L1', 'FAIL', 'L1.IVCH_ABS', `ivch[${id}]=${v}，存档绝对值=${want}（客户端是赋值，发增量会被覆盖 → 能反复卖）`, { path: `note.ivch.${id}` }));
      }
    }
  }
  // eco
  if (n.eco !== undefined) {
    if (!isObj(n.eco)) out.push(F('L1', 'FAIL', 'L1.ECO_TYPE', 'note.eco 不是对象'));
    else for (const [k2, v] of Object.entries(n.eco)) {
      if (!cfg.eco.keys.includes(k2)) out.push(F('L1', 'FAIL', 'L1.ECO_KEY', `eco.${k2} 不是客户端认的子键（潜能是 ptt 不是 potential）`, { path: `note.eco.${k2}` }));
      else if (!num(v)) out.push(F('L1', 'FAIL', 'L1.ECO_VAL', `eco.${k2} 不是数字`));
      const sk = cfg.eco.saveMap[k2];
      if (sk && after && num(after[sk]) && v !== after[sk]) out.push(F('L1', 'FAIL', 'L1.ECO_ABS', `eco.${k2}=${v}，存档 ${sk}=${after[sk]}（必须绝对余额）`, { path: `note.eco.${k2}` }));
    }
  }
  // skch
  if (n.skch !== undefined && isObj(n.skch)) for (const [id, v] of Object.entries(n.skch)) {
    if (!Array.isArray(v) || v.length !== 3 || !v.every(Number.isInteger)) { out.push(F('L1', 'FAIL', 'L1.SKCH_SHAPE', `skch[${id}] 不是 [lv,pgr,brlv] 三整数`)); continue; }
    if (v[0] === 0 && !metaEscape(c, ctx, 'abolish', out, 'L1')) out.push(F('L1', 'FAIL', 'L1.SKCH_LV0', `skch[${id}] lv=0 → 客户端 abolishSkill 删技能（index.js:119835）`, { path: `note.skch.${id}` }));
    if (after && after.skills && after.skills[id] && v[0] > 0) {
      const d = diff(after.skills[id], v);
      if (d.length) out.push(F('L1', 'FAIL', 'L1.SKCH_ABS', `skch[${id}]=${JSON.stringify(v)} 与存档 ${JSON.stringify(after.skills[id])} 不一致`));
    }
  }
  // eqch
  if (n.eqch !== undefined && isObj(n.eqch)) for (const [uid, v] of Object.entries(n.eqch)) {
    const okDel = Array.isArray(v) && v.length >= 1 && v[0] === 0;
    const okAdd = Array.isArray(v) && v[0] === 1 && Array.isArray(v[1]) && v[1].length >= 2;
    if (!okDel && !okAdd) { out.push(F('L1', 'FAIL', 'L1.EQCH_SHAPE', `eqch[${uid}] 形态应为 [0] 或 [1,[type,num,(skin)]]，实为 ${JSON.stringify(v)}`)); continue; }
    if (after && after.playerEquip) {
      if (okDel && after.playerEquip[uid]) out.push(F('L1', 'FAIL', 'L1.EQCH_DEL', `eqch[${uid}] 发删除，但存档里还在`));
      if (okAdd && !after.playerEquip[uid]) out.push(F('L1', 'FAIL', 'L1.EQCH_ADD', `eqch[${uid}] 发新增，但存档里没有`));
    }
  }
  // attrch
  if (n.attrch !== undefined && isObj(n.attrch)) for (const [k2, v] of Object.entries(n.attrch)) {
    if (!cfg.attrch.known.includes(k2)) out.push(F('L1', cfg.attrch.unknownIs, 'L1.ATTRCH_KEY', `attrch.${k2} 不在已证键里（M4 §7.1 switch 未闭合）`));
    if (!num(v)) out.push(F('L1', 'FAIL', 'L1.ATTRCH_VAL', `attrch.${k2} 不是数字`));
    if (k2 === 'hunger' && (v < 0 || v > cfg.attrch.hungerMax)) out.push(F('L1', 'FAIL', 'L1.ATTRCH_HUNGER', `hunger=${v} 越界`));
    // persistent 键与存档对账；derived 键只查形状（处置验收 §六）
    const sk = (cfg.attrch.persistent || {})[k2];
    if (sk && after && num(after[sk]) && v !== after[sk]) out.push(F('L1', 'FAIL', 'L1.ATTRCH_ABS', `attrch.${k2}=${v}，存档 ${sk}=${after[sk]}（persistent 键必须等于存档）`, { path: `note.attrch.${k2}` }));
  }

  // 投射完备性：存档变了，note 必须告诉客户端（S3 的核心不变式）
  // 中层审计 A2#4：无存档 = 绝对值/完备性/L5 全盲，至少显式标出（--require-save 时判 FAIL）
  if (!before || !after) out.push(F('L1', ctx.requireSave ? 'FAIL' : 'WARN', 'L1.NO_SAVE', '用例不带 saveBefore/saveAfter：IVCH_ABS / ECO_ABS / NOTE_MISSING_* / L5 均未检查'));
  if (before && after && c.resp && c.resp.eRet === 1 && !metaEscape(c, ctx, 'fullReload', out, 'L1')) {
    const bb = bagOf(before), ba = bagOf(after);
    for (const id of new Set([...Object.keys(bb), ...Object.keys(ba)])) {
      if ((bb[id] || 0) !== (ba[id] || 0) && !(n.ivch && id in n.ivch) && !(n.eqch && id in n.eqch)) {
        out.push(F('L1', 'FAIL', 'L1.NOTE_MISSING_IVCH', `存档背包 ${id}: ${bb[id] || 0}→${ba[id] || 0}，但 note.ivch 没有它（客户端显示会过期）`));
      }
    }
    const wb = walletOf(before, cfg), wa = walletOf(after, cfg);
    for (const k2 of new Set([...Object.keys(wb), ...Object.keys(wa)])) {
      if (wb[k2] !== wa[k2] && !(n.eco && k2 in n.eco)) out.push(F('L1', 'FAIL', 'L1.NOTE_MISSING_ECO', `存档钱包 ${k2}: ${wb[k2]}→${wa[k2]}，但 note.eco 没有它`));
    }
    const sb = before.skills || {}, sa = after.skills || {};
    for (const id of new Set([...Object.keys(sb), ...Object.keys(sa)])) {
      if (diff(sb[id], sa[id]).length && !(n.skch && id in n.skch)) out.push(F('L1', 'FAIL', 'L1.NOTE_MISSING_SKCH', `存档技能 ${id} 变了，但 note.skch 没有它`));
    }
    for (const [k2, sk] of Object.entries(cfg.attrch.persistent || {})) {
      if (before[sk] !== after[sk] && !(n.attrch && k2 in n.attrch)) out.push(F('L1', 'FAIL', 'L1.NOTE_MISSING_ATTRCH', `存档 ${sk}: ${before[sk]}→${after[sk]}，但 note.attrch.${k2} 没有它`));
    }
    const eb = before.playerEquip || {}, ea = after.playerEquip || {};
    for (const id of new Set([...Object.keys(eb), ...Object.keys(ea)])) {
      if (diff(eb[id], ea[id]).length && !(n.eqch && id in n.eqch)) out.push(F('L1', 'FAIL', 'L1.NOTE_MISSING_EQCH', `存档装备 ${id} 变了，但 note.eqch 没有它`));
    }
  }
  return out;
}

// ---------------- L2 双路径一致 ----------------
function normSnap(s) {
  if (!s) return null;
  const o = clone(s);
  if (o.bag) for (const k of Object.keys(o.bag)) if (!o.bag[k]) delete o.bag[k];
  return o;
}
function expectedSnap(save, cfg) {
  if (!save) return null;
  return { bag: bagOf(save), wallet: walletOf(save, cfg), skills: clone(save.skills || {}), equips: clone(save.playerEquip || {}) };
}
function L2(c, ctx) {
  const out = [];
  const A = normSnap(c.snapA), B = normSnap(c.snapB);
  if (!A && !B) return [F('L2', 'INFO', 'L2.SKIPPED', 'case 未带客户端快照（需设备探针 dual 模式产出）')];
  const domains = ctx.cfg.snapshotDomains.filter(d => (A && d in A) || (B && d in B));
  if (A && B) for (const d of domains) {
    if (!(d in A) || !(d in B)) continue;
    for (const x of diff(A[d], B[d], d).slice(0, 20)) out.push(F('L2', 'FAIL', 'L2.A_NE_B', `增量路径与全量重建路径不一致 ${x.path}: A=${JSON.stringify(x.a)} B=${JSON.stringify(x.b)}`, { path: x.path }));
  }
  const E = expectedSnap(c.saveAfter, ctx.cfg);
  if (E) for (const [name, S] of [['A', A], ['B', B]]) {
    if (!S) continue;
    for (const d of Object.keys(E)) {
      if (!(d in S)) continue;
      for (const x of diff(E[d], S[d], d).slice(0, 20)) out.push(F('L2', 'FAIL', `L2.${name}_NE_SAVE`, `路径 ${name} 客户端状态与存档推导不一致 ${x.path}: 存档=${JSON.stringify(x.a)} 客户端=${JSON.stringify(x.b)}`, { path: x.path }));
    }
  }
  return out;
}

// ---------------- L4 抓包对照 ----------------
function L4(c, ctx) {
  const t = c.template && ctx.templates && ctx.templates[c.template];
  if (!c.template) return [];
  if (!t) return [F('L4', 'WARN', 'L4.NO_TEMPLATE', `模板 ${c.template} 不存在`)];
  const vol = re(ctx.cfg.volatileKeyRe), idr = re(ctx.cfg.idKeyRe);
  const out = [];
  const allow = new Set(metaEscape(c, ctx, 'l4Allow', out, 'L4'));
  const ignore = p => {
    const last = p.split('.').pop().replace(/\[\d+\]$/, '');
    return allow.has(p.replace(/^\$\./, '')) || (vol && vol.test(last)) || (idr && idr.test(last));
  };
  for (const x of diff(t, c.resp, '$', [], ignore).slice(0, 50)) {
    out.push(F('L4', 'FAIL', 'L4.DIFF', `与原服样本不一致 ${x.path} (${x.kind}): 样本=${JSON.stringify(x.a)} 我方=${JSON.stringify(x.b)}`, { path: x.path }));
  }
  // 易变字段至少类型一致
  (function walk(a, b, p) {
    if (!isObj(a) || !isObj(b)) return;
    for (const k of Object.keys(a)) {
      if (vol && vol.test(k) && k in b && typeof a[k] !== typeof b[k]) out.push(F('L4', 'FAIL', 'L4.VOLATILE_TYPE', `${p}.${k} 类型 ${typeof a[k]}→${typeof b[k]}`));
      walk(a[k], b[k], `${p}.${k}`);
    }
  })(t, c.resp, '$');
  return out;
}

// ---------------- L5 经济守恒（单 case） ----------------
function evalExpr(expr, scope) {
  // 仅供开发者写的 rules.json 使用；不处理外部输入
  // eslint-disable-next-line no-new-func
  return Function(...Object.keys(scope), `"use strict"; return (${expr});`)(...Object.values(scope));
}
function L5(c, ctx) {
  const out = [];
  const { cfg, rules, tables } = ctx;
  const b = c.saveBefore, a = c.saveAfter;
  if (!b || !a) return out;
  for (const k of cfg.paidCurrencyKeys) {
    const sk = cfg.eco.saveMap[k] || k;
    if (num(a[sk]) && num(b[sk]) && a[sk] > b[sk]) out.push(F('L5', 'FAIL', 'L5.PAID_CURRENCY_UP', `付费货币 ${sk} 增加 ${b[sk]}→${a[sk]}（不得伪造）`));
  }
  for (const [sk] of Object.entries(cfg.eco.saveMap).map(([, v]) => [v])) {
    if (num(a[sk]) && a[sk] < 0) out.push(F('L5', 'FAIL', 'L5.NEGATIVE', `钱包 ${sk} 为负：${a[sk]}`));
  }
  for (const [id, v] of Object.entries(a.bag || {})) if (v < 0) out.push(F('L5', 'FAIL', 'L5.NEGATIVE', `背包 ${id} 为负：${v}`));
  for (const id of cfg.currencyItemIds) if ((a.bag || {})[id]) out.push(F('L5', 'FAIL', 'L5.CURRENCY_IN_BAG', `货币 ${id} 进了存档背包`));

  const payRe = re(cfg.payActionRe);
  if (payRe && payRe.test(c.action || '')) {
    const d = diff(b, a).filter(x => !/\.meta\b|lastSave|savedAt/.test(x.path));
    if (d.length) out.push(F('L5', 'FAIL', 'L5.PAY_WROTE_SAVE', `付费动作改了存档：${d.slice(0, 3).map(x => x.path).join(', ')}`));
  }

  // rules.json：按动作声明的守恒式
  for (const rule of (rules && rules.actions && rules.actions[c.action]) || []) {
    if (rule.when && !evalExpr(rule.when, { p: c.req && c.req.p || {}, resp: c.resp, T: tables || {}, before: b, after: a })) continue;
    const scope = { p: (c.req && c.req.p) || {}, resp: c.resp, T: tables || {}, before: b, after: a,
      d: k => (num(a[k]) ? a[k] : 0) - (num(b[k]) ? b[k] : 0),
      dbag: id => ((a.bag || {})[id] || 0) - ((b.bag || {})[id] || 0) };
    let ok;
    try { ok = evalExpr(rule.assert, scope); } catch (e) { out.push(F('L5', 'FAIL', 'L5.RULE_ERROR', `规则 ${rule.name} 求值出错：${e.message}`)); continue; }
    if (!ok) out.push(F('L5', 'FAIL', 'L5.RULE', `守恒式不成立：${rule.name}（${rule.assert}）`));
  }
  return out;
}

// L5 跨 case：闭环净收益（同一 scenario 内）
function L5loops(cases, ctx) {
  const out = [];
  const groups = {};
  for (const c of cases) if (c.scenario) (groups[c.scenario] = groups[c.scenario] || []).push(c);
  for (const [sc, list] of Object.entries(groups)) {
    list.sort((x, y) => (x.seq || 0) - (y.seq || 0));
    const first = list[0].saveBefore, last = list[list.length - 1].saveAfter;
    if (!first || !last) continue;
    const bagSame = !diff(bagOf(first), bagOf(last)).length;
    if (!bagSame) continue; // 只判物品净变化为 0 的闭环
    const gains = Object.values(ctx.cfg.eco.saveMap).filter(k => num(last[k]) && num(first[k]) && last[k] > first[k]).map(k => `${k} +${last[k] - first[k]}`);
    if (gains.length) out.push(F('L5', 'FAIL', 'L5.LOOP_PROFIT', `闭环 ${sc} 物品净变化为 0，但资源净增：${gains.join(', ')}（可刷）`, { scenario: sc }));
  }
  return out;
}

// ---------------- L3 分支覆盖（跨 case） ----------------
function L3(cases, ctx, { require: req } = {}) {
  const out = [];
  const seen = {}; // action -> field -> {present, absent}
  for (const c of cases) {
    if (!c.resp || c.resp.eRet !== 1) continue;
    const cid = ctx.contracts.byAction[c.action];
    const k = cid && ctx.contracts.contracts[cid];
    if (!k) continue;
    const s = seen[c.action] = seen[c.action] || {};
    for (const [fname, f] of Object.entries(k.fields)) {
      if (!f.switch) continue;
      const e = s[fname] = s[fname] || { present: 0, absent: 0 };
      if (fname in c.resp) e.present++; else e.absent++;
    }
    // 设备插桩产出的真实分支命中（若有）
    for (const br of c.branches || []) {
      const e = s['@' + br] = s['@' + br] || { present: 0, absent: 0, hit: 0 };
      e.hit++;
    }
  }
  const report = {};
  for (const [act, fs] of Object.entries(seen)) {
    const sw = Object.entries(fs).filter(([k]) => !k.startsWith('@'));
    const both = sw.filter(([, e]) => e.present && e.absent).length;
    report[act] = { switches: sw.length, bothSides: both, onlyAbsent: sw.filter(([, e]) => !e.present).map(([k]) => k) };
    if (req && sw.length && both < sw.length) out.push(F('L3', 'FAIL', 'L3.UNCOVERED', `${act}：${sw.length} 个开关字段只覆盖了 ${both} 个的两侧；从未出现：${report[act].onlyAbsent.slice(0, 8).join(', ')}`));
  }
  return { findings: out, report };
}

module.exports = { L0, L1, L2, L3, L4, L5, L5loops, noteCheck, expectedSnap, bagOf, walletOf, re };
