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

  // T5 upgradeSkill：skch 增量
  { const { env } = makeEnv(); const s = createBzServer(env);
    const r = s.dispatch('User', 'upgradeSkill', { skillID: 1262 });
    assert.deepStrictEqual(r['User.upgradeSkill'].note.skch['1262'], [1, 0, 0]);
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
