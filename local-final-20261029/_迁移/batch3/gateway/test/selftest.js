'use strict';
/**
 * 自测：编解码往返 / 签名 / 存档 / 端到端闭环（含黑洞行为）
 * 运行：npm test
 */

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { ProtocolCodec } = require('../src/codec');
const { SandboxStorage } = require('../src/store');
const { RpcDispatcher } = require('../src/rpc');
const { createGateway, tryParseRpc } = require('../src/gateway');

function tmpDb() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gwtest-')), 'test.db');
}

async function main() {
  const codec = new ProtocolCodec();
  console.log(`[cfg] algorithm=${codec.algorithm} (key ${codec.keyBuf.length}B, iv ${codec.ivBuf.length}B)`);

  // T1 编解码往返（含中文/嵌套/大对象）
  const sample = JSON.stringify({
    mod: 'User', do: 'saveRole', p: { roleID: 1, name: '少侠·測試', silver: 12345,
    skills: [{ id: 101, lv: 20 }], flag: '🎉emoji' },
  });
  const hex = codec.encode(sample);
  assert.match(hex, /^[0-9a-f]+$/, '密文应为小写 hex');
  assert.strictEqual(codec.decode(hex), sample, 'T1 编解码往返失败');
  console.log('[T1] codec roundtrip OK,', hex.length, 'hex chars');

  // T2 解不开的输入必须抛错（网关据此走黑洞）
  assert.throws(() => codec.decode('deadbeef'.repeat(8)), 'T2 坏密文应抛错');
  console.log('[T2] bad ciphertext rejected OK');

  // T3 签名确定性
  const s1 = codec.sign({ b: 2, a: 1 });
  const s2 = codec.sign({ a: 1, b: 2 });
  assert.strictEqual(s1, s2, 'T3 签名应与键序无关');
  assert.match(s1, /^[0-9a-f]{32}$/, 'T3 签名应为 32 位小写 hex');
  console.log('[T3] sign deterministic OK:', s1);

  // T3b tryParseRpc：hex 直传 / JSON 直传 / JSON+hex 字段 / 垃圾
  const asHex = codec.encode(sample);
  assert.deepStrictEqual(tryParseRpc(codec, asHex).do, 'saveRole', 'T3b hex 直传');
  assert.deepStrictEqual(tryParseRpc(codec, sample).do, 'saveRole', 'T3b JSON 直传');
  assert.deepStrictEqual(
    tryParseRpc(codec, JSON.stringify({ MsgData: asHex, other: 1 })).do, 'saveRole', 'T3b JSON+hex 字段');
  assert.strictEqual(tryParseRpc(codec, 'hello telemetry ping'), null, 'T3b 垃圾应返回 null');
  console.log('[T3b] request parsing OK');

  // T4 存档：默认角色 / 保存 / GM 补丁
  const storage = new SandboxStorage(tmpDb());
  const role = storage.getRole(1);
  assert.strictEqual(role.roleID, 1);
  role.silver = 8888;
  storage.saveRole(1, role);
  assert.strictEqual(storage.getRole(1).silver, 8888, 'T4 存档读回应一致');
  storage.gmPatch(1, { silver: 999999, potential: 42 });
  assert.strictEqual(storage.getRole(1).silver, 999999, 'T4 GM 改银两');
  console.log('[T4] storage OK');

  // T5 RPC：打坐时间步进 + 回拨防御
  const dispatcher = new RpcDispatcher(storage);
  const r1 = dispatcher.dispatch('User', 'dazuo', { roleID: 1, inGameTime: 3600 });
  assert.ok(r1.potentialGain > 0, 'T5 打坐应产出潜能');
  dispatcher.dispatch('User', 'saveRole', { roleID: 1, role: { inGameTime: 100 } }); // 试图回拨
  assert.strictEqual(storage.getRole(1).inGameTime, 3600, 'T5 时间回拨应被拦');
  const un = dispatcher.dispatch('User', 'futureRpc', {});
  assert.strictEqual(un.unimplemented, 'User.futureRpc', 'T5 未实现接口应回 ACK');
  console.log('[T5] rpc dispatcher OK (gain=%d, potential=%d)', r1.potentialGain, r1.potential);

  // T6 端到端：起网关 → 发加密请求 → 解密应答；垃圾请求走黑洞
  const gw = createGateway({
    port: 0,
    storage,
    log: () => {},
  });
  await new Promise((res) => gw.server.listen(0, '127.0.0.1', res));
  const base = `http://127.0.0.1:${gw.server.address().port}`;

  const loginHex = codec.encode(JSON.stringify({ mod: 'User', do: 'quicklogin', p: { roleID: 1 } }));
  const resp1 = await fetch(base + '/', { method: 'POST', body: loginHex });
  const env1 = await resp1.json();
  assert.strictEqual(env1.code, 200, 'T6 响应 code 应为 200');
  const inner1 = JSON.parse(codec.decode(env1.MsgData));
  assert.strictEqual(inner1.role.roleID, 1, 'T6 quicklogin 应返回角色');
  assert.strictEqual(inner1.role.silver, 999999, 'T6 角色数据与存档一致');

  const resp2 = await fetch(base + '/some/telemetry/sdk', { method: 'POST', body: 'hello ad sdk ping' });
  const body2 = await resp2.text();
  assert.strictEqual(resp2.status, 200, 'T6 黑洞应 200');
  assert.strictEqual(body2, '', 'T6 黑洞应空应答');

  const resp3 = await fetch(base + '/gm');
  const html = await resp3.text();
  assert.ok(html.includes('GM 开发者控制台'), 'T6 GM 页面可达');
  console.log('[T6] end-to-end OK (rpc/blackhole/gm) at', base);

  gw.server.close();
  storage.close();
  console.log('\nALL TESTS PASSED ✅');
}

main().catch((e) => {
  console.error('SELFTEST FAILED ❌\n', e);
  process.exit(1);
});
