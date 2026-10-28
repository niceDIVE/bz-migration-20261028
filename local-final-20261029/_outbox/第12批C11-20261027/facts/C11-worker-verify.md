# C11 验收工人报告（2026-10-27，gemini-3.8-flash-low，工单 8 条命令）

> 工人原话回传，主审未改动；主审抽样复核（ver / md5 / diff 行 / acceptance 行）与自己的结果一致。
> 结论行：STATUS ok | verified=8/8

## gen_c11_tables.js
命令原文：cd F:\BaoZouyxt; node tools\gen_c11_tables.js
exit code: 0
关键输出：
奖励阶=22（liveness 0…565）
任务=7 行，type 分布=[1,8,3,9,4,5,9]
礼包=4 行 price=60/300/680/980
口径: endtime=now+30天, VIP=300元宝, 活跃=10 gold/点, 上限=565

## shape diff
命令原文：cd F:\BaoZouyxt; node tools\check_shape_freeze.js --diff
exit code: 0
关键输出：
diff 总数 = 0

## reject codes
命令原文：cd F:\BaoZouyxt; node tools\check_reject_codes.js
exit code: 0
关键输出：
REJECT-CODES OK 动作=103 条目=117 拒绝点=170 处 flow=1 条

## acceptance
命令原文：cd F:\BaoZouyxt; node tools\acceptance.js
exit code: 0
关键输出：
ACCEPTANCE OK 项=51 绿=51 已知红=0 cap=0

## c11-smoke
命令原文：cd F:\BaoZouyxt\hotfix-patch; node test\c11-smoke.js
exit code: 0
关键输出：
c11-smoke: 全部通过（13 条）

## c10-smoke
命令原文：cd F:\BaoZouyxt\hotfix-patch; node test\c10-smoke.js
exit code: 0
关键输出：
c10-smoke: 全部通过（18 条）

## r14-smoke
命令原文：cd F:\BaoZouyxt\hotfix-patch; node test\r14-catch-smoke.js
exit code: 0
关键输出：
[r14-catch-smoke] PASS  3/3

## device ver + md5
命令原文：Set-Location F:\BaoZouyxt\hotfix-patch; Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force; .\run.ps1 cmd "ver"; foreach ($f in @('core\bz-rpc-server.js','patch\live\handlers.js','core\bz-c11.generated.js')) { $i=Get-Item $f; "{0} {1} {2}" -f $f,$i.Length,(Get-FileHash $f -Algorithm MD5).Hash }
exit code: 0
关键输出：
{"boot":"boot-2","impl":"h70337301","flow":"ffaec47c3","rpc":0,"scene":"gamescene","implErr":null,"flowErr":null}
core\bz-rpc-server.js 433894 AB7BE4F9056728B45D57D61D4F57F0DC
patch\live\handlers.js 1564251 D51DADE441681C28F80CBFB8DE84FB9D
core\bz-c11.generated.js 4058 96341B64EF57465617A3A24EFAA32C56

## 未验证段
- 真机设备端实际 UI 渲染与点击交互表现、C11 战令跨天/跨周期刷新在长时运行下的定时器行为。
