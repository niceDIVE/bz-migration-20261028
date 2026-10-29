const f = require('F:/BaoZouyxt/tools/action_facts3.json');
const want = ['User.BeginFish','User.EndFish','User.LookFishAward','User.BeginPlayWooks','User.EndPlayWooks','User.closedBook','User.WashMedicine','User.CheckOutSchool','User.OutSchool','User.exitSchool','User.GetSchoolRankList','User.GetSchoolReview','User.clearGeSchoolClothing'];
for (const w of want) {
  const e = f[w];
  if (!e) { console.log(w, '→ 无切片'); continue; }
  console.log('\n== ' + w + ' ==');
  console.log(' 请求参数:', e.request_params.join(',') || '(无)');
  console.log(' 响应字段:', e.response_fields.join(',') || '(无)');
  console.log(' 证据:');
  for (const ev of e.evidence.slice(0, 6)) console.log('   ' + ev);
}
