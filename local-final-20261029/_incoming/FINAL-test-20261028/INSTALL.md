# 本机安装说明（FINAL，ver=hf5d89bf7）

1. 备份 live 目录到 `_backup\<日期>-pre-FINAL\`。
2. 把交付包里 products/handlers.js 与 products/flow.js 拷到 live 目录，替换同名文件。
3. `cd F:\BaoZouyxt\hotfix-patch; .\run.ps1 handlers`（pid 不变即热载成功）。
4. `.\run.ps1 cmd "ver"`，显示 impl= 应等于 hf5d89bf7。
5. 10 分钟试玩清单：签到首领 → 同日再领应拒绝；骰子买 19 → 卖回 9；肉鸽商店买 → 卖回半价；装备仓库 push → pop 往返；种树首种 → 同日再种应拒绝；成就面板读取；商店货架读取；退出重进，存档无丢失。
6. 回滚：把 `_backup\<日期>-pre-FINAL\` 里的 handlers.js 与 flow.js 拷回，再跑一次 `.\run.ps1 handlers`。

需用户从本机补交的文件清单：无。
