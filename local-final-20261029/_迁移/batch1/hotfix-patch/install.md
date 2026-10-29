# 部署与验证（探针版）

目标：把 `patch\jsb-adapter\jsb-engine.js` 放进模拟器客户端的可写目录
`<getWritablePath()>/hotfix/jsb-adapter/jsb-engine.js`，启动游戏，从 logcat 收获探针数据。

## 0. 准备

1. 启动 TapTap 模拟器（安卓 12，VM 名"暴走英雄坛游戏软件V1.0"，已确认存在但未运行）。
2. adb（本机已有：`C:\Users\WANG\platform-tools\adb.exe`）。MuMu 引擎 VM 的 adb 端口在
   `configs\vm_config.json` → `nat.port_forward.adb.host_port`（本 VM 配置为 **16416**）：
   ```powershell
   adb connect 127.0.0.1:16416
   adb devices          # 应出现 127.0.0.1:16416
   ```
3. 包名：`com.maple.madherogo`。

## 1. 确认可写路径与 root 能力

```powershell
adb -s 127.0.0.1:16416 shell pm path com.maple.madherogo      # 确认游戏已装
adb -s 127.0.0.1:16416 shell which su                          # 探测 root
```

Cocos jsb 的 `getWritablePath()` 在 Android 原生端通常是
`/data/data/com.maple.madherogo/files/`（内部存储，无 root 不可写）。
TapTap/MuMu 模拟器设置里有 root 开关，打开后 `su` 可用。

## 2. 推送补丁（root 可用时）

```powershell
adb push F:\BaoZouyxt\hotfix-patch\patch\jsb-adapter\jsb-engine.js /data/local/tmp/bz-engine.js
adb shell su -c "mkdir -p /data/data/com.maple.madherogo/files/hotfix/jsb-adapter"
adb shell su -c "cp /data/local/tmp/bz-engine.js /data/data/com.maple.madherogo/files/hotfix/jsb-adapter/jsb-engine.js"
adb shell su -c "chown -R $(adb shell stat -c '%u' /data/data/com.maple.madherogo) /data/data/com.maple.madherogo/files/hotfix"
```

（若模拟器无 root：备选路径是 `/sdcard/Android/data/com.maple.madherogo/files/hotfix/`，
但 jsb 的 getWritablePath 是否指向 sdcard 需实测，见第 4 节验证项。）

## 3. 启动游戏并采集探针

```powershell
adb -s 127.0.0.1:16416 logcat -c
adb -s 127.0.0.1:16416 shell monkey -p com.maple.madherogo -c android.intent.category.LAUNCHER 1
adb -s 127.0.0.1:16416 logcat | Select-String 'BZ-OFFLINE'
```

### 探针成功判据（全部出现 = hotfix 生效）

- `[BZ-OFFLINE] hook v1-probe 安装完成 (PROBE_MODE=true)`
- `[BZ-OFFLINE] settings.server = ...`、`settings.jsList = ...` ← 拿到字段全集
- `[BZ-OFFLINE] XHR <method> <url> body{...}` ← 游戏真实请求形态（是否 hex、走什么域名）
- `[BZ-OFFLINE] XHR-RESP ...` ← 真实响应形态

### 无输出排查

| 现象 | 可能原因 |
|---|---|
| 完全无 BZ-OFFLINE 日志 | hotfix 路径不对 / require 未走搜索路径 / settings.js(纯 .js 名) 命中 jsc 的解析顺序不同 |
| 游戏闪退 | 补丁文件语法/兼容问题（本地已过编译校验，回看 logcat 堆栈） |
| logcat 无 console 输出 | jsb console.log 默认进 logcat tag 为 `Cocos2dxJSBHelper`/`cocos2d`，放宽过滤词重试 |

## 4. 探针回传后的决策点

1. `settings.server` / 请求 URL → 确认游戏服域名与协议路径；
2. 请求体是否 hex 密文 → 决定环回版要不要内置 AES/LZString JS 编解码；
3. `getWritablePath` 实际值 → 固化部署脚本。

## 5. 回滚

删除 hotfix 目录即 100% 恢复原版（原包未动过）：

```powershell
adb shell su -c "rm -rf /data/data/com.maple.madherogo/files/hotfix"
```
