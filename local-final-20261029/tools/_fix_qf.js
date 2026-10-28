const fs=require('fs');
const P='F:/BaoZouyxt/tools/facts/reject-codes.json';
const j=JSON.parse(fs.readFileSync(P,'utf8'));
const c=j.quickFinishTask.codes[0];
c.reasons=['default','notAccepted','insufficient'];
c.note='快速完成现在是**元宝购买**：任务不在 accepted 或元宝不足都回 2 -> openChargeList（客户端把 2 当充值入口）；1 == eRet 才是付费完成成功。';
fs.writeFileSync(P,JSON.stringify(j,null,1)+'\n');
console.log('quickFinishTask reasons = '+c.reasons.join(','));
