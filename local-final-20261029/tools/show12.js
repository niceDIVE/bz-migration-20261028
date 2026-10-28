const f=require('F:/BaoZouyxt/tools/action_facts3.json');
const u=require('F:/BaoZouyxt/tools/field_usage.json');
const pick=['FriendList','ApplyFriend','FindFriend','FindFriendByID','FriendDelete','rankList','LookOther','GetSchoolRankList','GetSchoolReview','exitSchool','clearGeSchoolClothing','sycnTask'];
for(const a of pick){
  const k='User.'+a; const e=f[k]; const us=u[k]||[];
  console.log('\n== '+k+' ==');
  console.log(' 请求:', (e&&e.request_params.join(','))||'(无)');
  console.log(' 字段:', (e&&e.response_fields.join(','))||'(无)');
  us.slice(0,4).forEach(r=>console.log('   '+r.field+' ← '+r.usage.slice(0,80)));
}
