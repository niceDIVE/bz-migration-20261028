# C12 验收工人报告（2026-10-27，gemini-3.8-flash-low，工单 9 条命令）

> 工人原话回传，主审未改动；主审抽样复核（ver/md5/diff/acceptance 行）与自己的结果一致。
> 结论行：STATUS ok | verified=9/9

## [gen_c12_tables.js]
cd F:\BaoZouyxt; node tools\gen_c12_tables.js
exit code: 0
管家=8 行（price: 0/0/500/1000/99999999/99999999/99999999/2000）
口径: 月卡=300元宝/30天(只认type=1), 派遣=30分钟, 奖励=helper.reward照表

## [shape diff]
cd F:\BaoZouyxt; node tools\check_shape_freeze.js --diff
exit code: 0
diff 总数 = 0

## [reject codes]
cd F:\BaoZouyxt; node tools\check_reject_codes.js
exit code: 0
REJECT-CODES OK 动作=113 条目=129 拒绝点=190 处 flow=1 条

## [acceptance]
cd F:\BaoZouyxt; node tools\acceptance.js
exit code: 0
ACCEPTANCE OK 项=52 绿=52 已知红=0 cap=0

## [c12-smoke]
cd F:\BaoZouyxt\hotfix-patch; node test\c12-smoke.js
exit code: 0
c12-smoke: 全部通过（13 条）

## [c11-smoke]
cd F:\BaoZouyxt\hotfix-patch; node test\c11-smoke.js
exit code: 0
c11-smoke: 全部通过（13 条）

## [c10-smoke]
cd F:\BaoZouyxt\hotfix-patch; node test\c10-smoke.js
exit code: 0
c10-smoke: 全部通过（18 条）

## [r14-smoke]
cd F:\BaoZouyxt\hotfix-patch; node test\r14-catch-smoke.js
exit code: 0
[r14-catch-smoke] PASS  3/3

## [device ver + md5]
{"boot":"boot-2","impl":"he39800b9","flow":"ffaec47c3","rpc":0,"scene":"gamescene","implErr":null,"flowErr":null}
core\bz-rpc-server.js 453934 623CE6D5B1BFC574F6085018584F4629
patch\live\handlers.js 1586148 77E6AE56A10B592DBD4B78E0C0933656
core\bz-c12.generated.js 1226 F7DEFBA54C8BDD3DC157AD2B5C7A9C45

## 未验证段
- 真机运行时交互表现、网络断连重连恢复、长周期挂机产出与跨日结算逻辑。
