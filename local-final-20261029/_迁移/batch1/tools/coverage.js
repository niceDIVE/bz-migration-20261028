const fs=require('fs');
const f=require('F:/BaoZouyxt/tools/action_facts3.json');
const src=fs.readFileSync('F:/BaoZouyxt/hotfix-patch/core/bz-rpc-server.js','utf8');
const impl=new Set([...src.matchAll(/^\s{4}([A-Za-z0-9_]+): function/gm)].map(m=>'User.'+m[1]));
const need=Object.keys(f).filter(k=>f[k].response_fields.some(x=>x!=='hasOwnProperty'));
const done=need.filter(k=>impl.has(k));
console.log('需要写形状:',need.length,'| 已实现:',done.length,'| 待办:',need.length-done.length);
console.log('已实现:',done.map(x=>x.replace('User.','')).join(', '));
