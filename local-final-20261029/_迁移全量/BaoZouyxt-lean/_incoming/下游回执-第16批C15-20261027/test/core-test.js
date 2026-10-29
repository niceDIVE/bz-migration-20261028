'use strict';
/**
 * bz-rpc-core 单测：内存环境模拟 jsb 存档，验证业务语义与 gateway 版一致
 * 运行：node test/core-test.js
 */

const assert = require('assert');
const { createBzCore } = require('../core/bz-rpc-core.js');

function makeEnv() {
  const store = new Map();
  const logs = [];
  return {
    env: {
      readSave: (k) => (store.has(k) ? store.get(k) : null),
      writeSave: (k, t) => store.set(k, t),
      log: (m) => logs.push(m),
      now: () => 1000000,
    },
    store, logs,
  };
}

async function main() {
  // T1 quicklogin：默认角色
  { const { env } = makeEnv(); const core = createBzCore(env);
    const r = core.dispatch('User', 'quicklogin', { roleID: 1 });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.role.roleID, 1);
    assert.strictEqual(r.role.silver, 1000);
    console.log('[T1] quicklogin 默认角色 OK');
  }

  // T2 存档持久化：写读回一致
  { const { env, store } = makeEnv(); const core = createBzCore(env);
    core.dispatch('User', 'quicklogin', {});
    core.dispatch('User', 'saveRole', { roleID: 1, role: { silver: 8888, name: '测试侠' } });
    const core2 = createBzCore(env); // 新实例读同一存档
    const role = core2.getRole(1);
    assert.strictEqual(role.silver, 8888);
    assert.strictEqual(role.name, '测试侠');
    assert.ok(store.size > 0, '存档应已写入');
    console.log('[T2] 存档持久化 OK');
  }

  // T3 防回拨
  { const { env } = makeEnv(); const core = createBzCore(env);
    core.dispatch('User', 'dazuo', { inGameTime: 3600 });
    core.dispatch('User', 'saveRole', { roleID: 1, role: { inGameTime: 100 } });
    assert.strictEqual(core.getRole(1).inGameTime, 3600, '回拨应被拦截');
    console.log('[T3] 时间回拨拦截 OK');
  }

  // T4 打坐结算
  { const { env } = makeEnv(); const core = createBzCore(env);
    core.dispatch('User', 'quicklogin', {});
    const r = core.dispatch('User', 'dazuo', { inGameTime: 3600 });
    assert.ok(r.potentialGain > 0);
    assert.strictEqual(r.potential, r.potentialGain);
    console.log('[T4] dazuo 结算 OK (gain=' + r.potentialGain + ')');
  }

  // T5 killNpc + 未实现接口 ACK
  { const { env } = makeEnv(); const core = createBzCore(env);
    core.dispatch('User', 'quicklogin', {});
    const k = core.dispatch('User', 'killNpc', { npcId: 101, evilDelta: 2 });
    assert.strictEqual(k.ok, true);
    assert.strictEqual(k.reputation.evil, 2);
    const u = core.dispatch('User', 'futureRpc', { x: 1 });
    assert.strictEqual(u.unimplemented, 'User.futureRpc');
    assert.strictEqual(u.ok, true, '未实现接口仍应回 ACK 防卡死');
    console.log('[T5] killNpc / 未实现 ACK OK');
  }

  // T6 GM 补丁 + 事件封顶
  { const { env } = makeEnv(); const core = createBzCore(env);
    core.gmPatch(1, { silver: 999999, potential: 42, attrs: { CON: 50 } });
    const role = core.getRole(1);
    assert.strictEqual(role.silver, 999999);
    assert.strictEqual(role.attrs.CON, 50);
    for (let i = 0; i < 300; i++) core.dispatch('User', 'futureRpc' + i, {});
    const s = core.loadSave();
    assert.ok(s.events.length <= 200, '事件日志应封顶 200');
    console.log('[T6] GM 补丁 / 事件封顶 OK (events=' + s.events.length + ')');
  }

  // T7 核心异常不外抛
  { const { env } = makeEnv(); const core = createBzCore(env);
    const r = core.dispatch('User', 'saveRole', null); // p 缺失不炸
    assert.ok(r !== undefined);
    console.log('[T7] 异常防御 OK');
  }

  console.log('\nCORE TESTS PASSED ✅');
}

main().catch((e) => { console.error('CORE TESTS FAILED ❌\n', e); process.exit(1); });
