const fs=require('fs');
for(const [tag,p] of [['backup','_backup/20261027-040000-pre-c10/core/bz-rpc-server.js'],['current','hotfix-patch/core/bz-rpc-server.js']]){
  const t=fs.readFileSync(p,'utf8');
  const decl=(t.match(/var note = \{ ivch: \{\}, eqch: \{\}/g)||[]).length;
  const useEco=(t.match(/note\.eco\./g)||[]).length;
  const ecoEmpty=(t.match(/eco: \{\}/g)||[]).length;
  console.log(tag+': note声明='+decl+'  note.eco.使用='+useEco+'  eco:{}(空)='+ecoEmpty);
}
