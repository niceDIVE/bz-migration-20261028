const u = require('F:/BaoZouyxt/tools/field_usage.json');
for (const a of ['User.OutSchool','User.enterWoldBossBattle','User.checkUploadAttackDamge','User.ExChangeJetton']) {
  console.log('\n== ' + a + ' ==');
  for (const r of (u[a]||[]).slice(0, 12)) console.log('  ' + r.field + ' ← ' + r.usage.slice(0, 90));
}
