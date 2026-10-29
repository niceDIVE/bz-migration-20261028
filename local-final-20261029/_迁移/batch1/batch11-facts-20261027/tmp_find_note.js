const fs=require('fs');
const cur=fs.readFileSync('hotfix-patch/core/bz-rpc-server.js','utf8').split('\n');
const old=fs.readFileSync('_backup/20261027-040000-pre-c10/core/bz-rpc-server.js','utf8').split('\n');
function find(arr,needle){const r=[];for(let i=0;i<arr.length;i++) if(arr[i].indexOf(needle)>=0) r.push(i);return r;}
const plain='var note = { ivch: {}, eqch: {}, eco: {} };';
const withI='var note = { ivch: {}, eqch: {}, eco: {} }, i;';
console.log('=== backup 里 '+plain+' 的行: '+find(old,plain).map(i=>i+1).join(','));
console.log('=== backup 里带 , i; 的行: '+find(old,withI).map(i=>i+1).join(','));
for(const i of find(old,plain)){
  // 往上找最近的 function 名
  let ctx='';
  for(let j=i;j>=Math.max(0,i-60);j--){ const m=old[j].match(/^\s{4}([A-Za-z_$][\w$]*): function/); if(m){ctx=m[1];break;} }
  console.log('backup L'+(i+1)+' 归属 '+(ctx||'?')+'  | 上一行: '+old[i-1].trim().slice(0,80));
}
console.log('--- 当前文件里同样的候选 ---');
for(const i of find(cur,'var note = { ivch: {}, eqch: {} };')){
  let ctx='';
  for(let j=i;j>=Math.max(0,i-60);j--){ const m=cur[j].match(/^\s{4}([A-Za-z_$][\w$]*): function/); if(m){ctx=m[1];break;} }
  console.log('cur L'+(i+1)+' 归属 '+(ctx||'?')+'  | 上一行: '+cur[i-1].trim().slice(0,80));
}
