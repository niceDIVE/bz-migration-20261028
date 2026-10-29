# hotfix 补丁包（BZ Offline Patch）

放进客户端可写目录的 `hotfix/` 即生效：**不重签 APK、不解密 jsc、游戏原包零改动**。
原理见 `../client-analysis/注入点分析.md`：`main.js:5-8` 把 hotfix 目录 unshift 到资源搜索路径最前，
同名文件优先于 APK 内的加密版本被 `require`。

## 目录结构

```
hotfix-patch\
├── core\bz-rpc-core.js      环回核心：RPC 仿真 + 本地存档（纯 JS，可单测）
├── hook\bz-offline-hook.js  前置 hook：settings dump + XHR 探针 + 环回切换
├── test\core-test.js        核心单测（7 组，node 直接跑）
├── build.js                 构建脚本：core+hook+原版jsb-engine.js → patch\
├── patch\jsb-adapter\jsb-engine.js   【产物】推到设备的补丁文件
└── install.md               模拟器部署与验证步骤
```

## 构建

```powershell
node test\core-test.js        # 7 组单测（当前全绿）
node build.js                 # 探针版（默认，透明记录，游戏行为不变）
$env:BZ_PROBE='0'; node build.js   # 环回版（探针确认后启用）
```

构建自检：`vm.compileFunction` 全文语法编译 + 原版内容完整保留在尾部。

## 两档模式

| 模式 | 行为 | 用途 |
|---|---|---|
| PROBE（当前交付） | dump `window._CCSettings`（运行时明文）+ 透明记录游戏全部 XHR 流量 | 验证 hotfix 生效；拿到 server/jsList/请求形态 |
| LOOPBACK | XMLHttpRequest 整体替换为进程内环回，`{mod,do,p}` → bz-rpc-core 本地应答，存档写 `bz_offline_save.json` | 真单机闭环 |

安全设计：hook 全部 try/catch 包裹，任何异常不阻断引擎加载；探针失败游戏照常联网运行。
