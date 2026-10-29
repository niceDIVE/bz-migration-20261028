'use strict';
/** 真协议服务器单测：形状对齐实测报文 */
const assert = require('assert');
const { createBzServer } = require('../core/bz-rpc-server.js');

const TPL = require('../core/templates.json');
function makeEnv() {
  const store = new Map(); const logs = [];
  return {
    env: {
      readSave: (k) => (store.has(k) ? store.get(k) : null),
      writeSave: (k, t) => store.set(k, t),
      log: (m) => logs.push(m),
      now: () => 1792612412000,   // 全仓唯一固定时钟（见 HANDOVER §6.3）
      templates: TPL,
    },
    store, logs,
  };
}

async function main() {
  // T1 GetServerList：单机区服
  { const { env } = makeEnv(); const s = createBzServer(env);
    const r = s.dispatch('User', 'GetServerList', {});
    assert.strictEqual(r.error, 0); assert.strictEqual(r.resultCode, 200);
    assert.ok(r.serverObj && r.serverObj[1], 'T1 serverObj 应有单机区');
    console.log('[T1] GetServerList OK');
  }

  // T2 quicklogin：扁平结构 + roleID 稳定
  { const { env } = makeEnv(); const s = createBzServer(env);
    const r = s.dispatch('User', 'quicklogin', { account: '9900012358565' });
    assert.strictEqual(r.eRet, 1);
    assert.strictEqual(typeof r.roleID, 'number');
    assert.strictEqual(r.account, '9900012358565');
    const r2 = createBzServer(env).dispatch('User', 'quicklogin', {});
    assert.strictEqual(r2.roleID, r.roleID, 'T2 roleID 应持久一致');
    console.log('[T2] quicklogin OK (roleID=' + r.roleID + ')');
  }

  // T3 Create：名字/属性入档
  { const { env } = makeEnv(); const s = createBzServer(env);
    const ay = ['9900012358565', '测试侠', 0, 0, 282, 301, 318, 40, 20, 10, 10];
    const r = s.dispatch('User', 'Create', { baseValueAy: ay });
    assert.strictEqual(r.eRet, 1);
    assert.strictEqual(r.baseValueAy[1], '测试侠');
    const s2 = createBzServer(env).loadSave();
    assert.strictEqual(s2.name, '测试侠');
    console.log('[T3] Create OK (name=' + s2.name + ')');
  }

  // T4 acceptTask：包裹形状 + 任务入档
  { const { env } = makeEnv(); const s = createBzServer(env);
    const r = s.dispatch('User', 'acceptTask', { taskID: 101080 });
    assert.strictEqual(r.error, 0);
    assert.strictEqual(r.p, 'User.acceptTask');
    assert.strictEqual(r['User.acceptTask'].taskID, 101080);
    assert.ok(s.loadSave().accepted.indexOf(101080) >= 0);
    console.log('[T4] acceptTask OK');
  }

  // T5 upgradeSkill：缺 skillArr 的无效请求不许写技能（旧标题"skch 增量"已随契约作废）
  { const { env } = makeEnv(); const s = createBzServer(env);
    const r = s.dispatch('User', 'upgradeSkill', { skillID: 1262 });
    // 原断言（已过时）：assert.deepStrictEqual(r['User.upgradeSkill'].note.skch['1262'], [1, 0, 0])
    //   旧契约以为"只发 skillID"也会建技能；现契约：note.skch 只在**真正写技能**时才带键，
    //   形状是 [lv,pgr,brlv]，brlv 归一为 1（A03 迁移口径 [lv,0,1]）——[1,0,0] 的 brlv=0 已不合法。
    //   本请求缺 skillArr → 走无效分支（bz-rpc-server.js:1143-1146）：eRet:1、note.skch={}、不写档、不扣潜能。
    //   相关：useItem"已学会"回 eRet:5 且不带 note（bz-rpc-server.js:1891-1893）；客户端 5 分支只弹提示不读 note（index.js:64754-64910，64757 仅 eRet==1 才读 note.skch，64906 只 show(getText(1333))）。
    assert.strictEqual(r['User.upgradeSkill'].eRet, 1, 'T5 无效请求仍回 eRet:1');
    assert.deepStrictEqual(r['User.upgradeSkill'].note.skch, {}, 'T5 没真正写技能时 note.skch 必须为空（不带 1262 键）');
    assert.strictEqual(s.loadSave().skills['1262'], undefined, 'T5 无效请求不许把技能 1262 写进账本');
    assert.strictEqual(env.readSave(s._internal.SAVE_KEY), null, 'T5 无效请求一个字节都不许落盘（不写 = 不扣）');
    console.log('[T5] upgradeSkill OK');
  }

  // T6 未知动作：同构 ACK
  { const { env } = makeEnv(); const s = createBzServer(env);
    const r = s.dispatch('User', 'neverSeenAction', { x: 1 });
    assert.strictEqual(r['User.neverSeenAction'].eRet, 1);
    assert.strictEqual(r.resultCode, 200);
    console.log('[T6] 未知动作 ACK OK');
  }

  // T7 模板不被污染（连续调用同一动作，taskID 正确替换）
  { const { env } = makeEnv(); const s = createBzServer(env);
    s.dispatch('User', 'getFinishTaskAward', { taskID: 111 });
    const r2 = s.dispatch('User', 'getFinishTaskAward', { taskID: 222 });
    assert.strictEqual(r2['User.getFinishTaskAward'].taskID, 222, '模板应克隆而非引用');
    console.log('[T7] 模板克隆 OK');
  }

  console.log('\nSERVER TESTS PASSED ✅');
}

main().catch((e) => { console.error('SERVER TESTS FAILED ❌\n', e); process.exit(1); });
