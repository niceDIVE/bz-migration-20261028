const fs = require('fs');
const P = 'F:/BaoZouyxt/tools/facts/reject-codes.json';
const j = JSON.parse(fs.readFileSync(P, 'utf8'));

function add(name, success, codes, defaultCode) {
  j[name] = {
    success: success,
    handled: success.slice(),
    promptOnly: [],
    defaultCode: defaultCode,
    codes: codes.map((c) => ({
      code: c.code,
      role: 'reject',
      reasons: c.reasons,
      tier: 2,
      tierWhy: '客户端对该码没有专属分支（静默或走通用 alert）→ tier 2 静默，避免弹错文案',
      ev: c.ev,
      note: c.note || '',
    })),
  };
}

add('rgUseItem', [1], [
  { code: 2, reasons: ['default', 'badItem'], ev: 'scripts3.js:73948',
    note: 'itemID 非法 → 2 走客户端 noop 分支（scripts3.js:73952）' },
  { code: 4, reasons: ['noStock'], ev: 'scripts3.js:73948',
    note: '肉鸽背包无此道具 → 4 → getText(988)，客户端会读 item.Data2/Data3' },
], 2);

add('UseSnowBall', [1], [
  { code: 0, reasons: ['default', 'noBall'], ev: 'index.js:122505',
    note: '雪球不足 → 非 1 落 else → getText(1093)' },
], 0);

add('UseBatchSnowBall', [1], [
  { code: 4, reasons: ['default', 'noBall'], ev: 'index.js:122514',
    note: '批量雪球不足 → 4 → getText(6126)「雪球不足」，且客户端总会 setBeastState(eRet)' },
], 4);

add('UseAllBall', [1], [
  { code: 0, reasons: ['default', 'noBall'], ev: 'index.js:122543',
    note: '摔炮时雪球不足 → 非 1 → getText(1093)' },
], 0);

add('getSnowAward', [1], [
  { code: 4, reasons: ['default', 'noBox'], ev: 'index.js:122529',
    note: '无雪球盒子 → 4 → getText(1098)' },
], 4);

add('useItemAddition', [1], [
  { code: 5, reasons: ['default', 'noItem'], ev: 'index.js:56234',
    note: '对应道具不足 → 5 客户端无分支（静默），绝不"不扣东西直接给加成"' },
], 5);

fs.writeFileSync(P, JSON.stringify(j, null, 1) + '\n');
console.log('actions now = ' + Object.keys(j).length + '  added = 6');
