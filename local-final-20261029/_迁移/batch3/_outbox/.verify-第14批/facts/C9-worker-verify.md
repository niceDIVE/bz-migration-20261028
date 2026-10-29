# C13 验收工人报告（2026-10-27，gemini-3.8-flash-low，工单 9 条命令）

> 工人原话回传，主审未改动；主审抽样复核（ver/md5/diff/acceptance 行）与自己的结果一致。
> 结论行：STATUS ok | verified=9/9

## 1. gen_c13_tables.js
cd F:\BaoZouyxt; node tools\gen_c13_tables.js
exit code: 0
难度=5（reward: 30/30/60/150/300）
口径: 买刷新=100元宝/次 限3 抓中=8143×reward 爪={"0":8117,"1":8119,"2":8120}

## 2. shape diff
cd F:\BaoZouyxt; node tools\check_shape_freeze.js --diff
exit code: 0
diff 总数 = 0

## 3. reject codes
cd F:\BaoZouyxt; node tools\check_reject_codes.js
exit code: 0
REJECT-CODES OK 动作=117 条目=134 拒绝点=202 处 flow=1 条

## 4. acceptance
cd F:\BaoZouyxt; node tools\acceptance.js
exit code: 0
ACCEPTANCE OK 项=53 绿=53 已知红=0 cap=0

## 5. c13-smoke
cd F:\BaoZouyxt\hotfix-patch; node test\c13-smoke.js
exit code: 0
c13-smoke: 全部通过（9 条）

## 6. c12-smoke
cd F:\BaoZouyxt\hotfix-patch; node test\c12-smoke.js
exit code: 0
c12-smoke: 全部通过（14 条）

## 7. c11-smoke
cd F:\BaoZouyxt\hotfix-patch; node test\c11-smoke.js
exit code: 0
c11-smoke: 全部通过（14 条）

## 8. c10-smoke
cd F:\BaoZouyxt\hotfix-patch; node test\c10-smoke.js
exit code: 0
c10-smoke: 全部通过（18 条）

## 9. device ver + md5
{"boot":"boot-2","impl":"h3b555bcf","flow":"ffaec47c3","rpc":0,"scene":"gamescene","implErr":null,"flowErr":null}
core\bz-rpc-server.js 467066 774D44953D9A8FB60FAD10C08CD03DD3
patch\live\handlers.js 1600285 C3DAD3C66D95C9F99109DE8936E40AB5
core\bz-c13.generated.js 728 F212042FBEE1725E03D4B5D11224C65E

## 未验证段
- 真机实际 UI 交互渲染与动画、真机网络弱网断线重连、C13 客户端实际操作抓娃娃全流程。
