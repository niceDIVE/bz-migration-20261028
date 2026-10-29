const fs=require('fs');
const cur=fs.readFileSync('hotfix-patch/core/bz-rpc-server.js','utf8').split('\n');
for(const ln of [2770,3080,5396,6429]){
  console.log('=== 附近 L'+(ln+1)+' — L'+(ln+8));
  for(let i=ln;i<ln+8;i++) console.log('  L'+(i+1)+'| '+cur[i]);
}
console.log('=== 我 C10 段里的 note 声明（含 eco 的） ===');
cur.forEach((l,i)=>{ if(l.indexOf('ivch: {}, eqch: {}, eco: {}')>=0 && i>6000) console.log('  L'+(i+1)+'| '+l); });
