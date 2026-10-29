const fs = require('fs');
const crypto = require('crypto');
const P = 'F:/BaoZouyxt/tools/facts/reject-codes.json';
const CLIENT = { 'index.js': 'F:/BaoZouyxt/tools/index.js', 'scripts2.js': 'F:/BaoZouyxt/tools/scripts2.js', 'scripts3.js': 'F:/BaoZouyxt/tools/scripts3.js' };
const cache = {};
function line(file, n) {
  if (!cache[file]) cache[file] = fs.readFileSync(CLIENT[file], 'utf8').split('\n');
  return cache[file][n - 1];
}
const sha8 = (t) => crypto.createHash('sha1').update(t, 'utf8').digest('hex').slice(0, 8);
const evOf = (spec) => {
  const m = /^(\S+?):(\d+)$/.exec(spec);
  const raw = line(m[1], parseInt(m[2], 10));
  if (raw === undefined) throw new Error('line not found ' + spec);
  return spec + '#' + sha8(raw.replace(/\r$/, '').trim());
};

const j = JSON.parse(fs.readFileSync(P, 'utf8'));
const targets = {
  rgUseItem: ['scripts3.js:73948'],
  UseSnowBall: ['index.js:122505'],
  UseBatchSnowBall: ['index.js:122514'],
  UseAllBall: ['index.js:122543'],
  getSnowAward: ['index.js:122529'],
  useItemAddition: ['index.js:56234'],
};
for (const act of Object.keys(targets)) {
  const ev = evOf(targets[act][0]);
  for (const c of j[act].codes) c.ev = ev;
  console.log(act + ' -> ' + ev);
}
fs.writeFileSync(P, JSON.stringify(j, null, 1) + '\n');
console.log('patched');
