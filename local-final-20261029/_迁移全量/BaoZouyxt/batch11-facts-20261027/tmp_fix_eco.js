const fs=require('fs');
const p='hotfix-patch/core/bz-rpc-server.js';
const lines=fs.readFileSync(p,'utf8').split('\n');
function fixAt(ln, expectSub, repl){
  const i=ln-1;
  if(lines[i].indexOf(expectSub)<0){ console.error('L'+ln+' 不符合预期: '+lines[i]); process.exit(1); }
  lines[i]=repl; console.log('fixed L'+ln+' -> '+repl.trim());
}
// 1) 还原被我误删的三个非 C10 handler
fixAt(2776,'var note = { ivch: {}, eqch: {} };','      var note = { ivch: {}, eqch: {}, eco: {} };');
fixAt(3084,'var note = { ivch: {}, eqch: {} };','      var note = { ivch: {}, eqch: {}, eco: {} };');
fixAt(5400,'var note = { ivch: {}, eqch: {} };','      var note = { ivch: {}, eqch: {}, eco: {} };');
// 2) C10 两个内联声明去掉 eco（本批不改货币）
fixAt(6358,'ivch: {}, eqch: {}, eco: {}','      var crops = {}, note = { ivch: {}, eqch: {} }, i;');
fixAt(6551,'ivch: {}, eqch: {}, eco: {}','      var lands = [], rewardArray = {}, aExp = 0, note = { ivch: {}, eqch: {} }, i;');
fs.writeFileSync(p, lines.join('\n'),'utf8');
console.log('写入完成');
// 复核：非 C10 段不应再有缺 eco 的裸 note 声明
lines.forEach((l,i)=>{ const t=l.trim(); if(/^var note = \{ ivch: \{\}, eqch: \{\} \};$/.test(t)) console.log('⚠ 仍缺 eco: L'+(i+1)+'| '+t); });
