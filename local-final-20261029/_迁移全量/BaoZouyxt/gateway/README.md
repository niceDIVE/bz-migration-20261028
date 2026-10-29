# OfflineSimulationGateway（离线仿真网关测试桩）

《暴走英雄坛》本地闭环沙盒 · 阶段二/三/四核心工程。只监听 `127.0.0.1`，零外联。

## 运行

```powershell
npm install          # 仅 lz-string 一个依赖（官方参考实现，保证字节级兼容）
npm test             # 6 组自测：编解码往返/坏文拒绝/签名/请求解析/存档/端到端
npm start            # 起网关，默认 http://127.0.0.1:8080
```

- GM 控制台：`http://127.0.0.1:8080/gm`（检视角色 + 一键改等级/银两/潜能）
- 存档：`data/sandbox.db`（Node 24 内置 `node:sqlite`，无原生编译）

## 模块

| 文件 | 职责 |
|---|---|
| `src/codec.js` | 线协议编解码：JSON ↔ LZString(Base64) ↔ AES-CBC ↔ Hex；MD5 签名 |
| `src/gateway.js` | HTTP 网关：RPC 分发、遥测黑洞、GM 路由 |
| `src/rpc.js` | `User.quicklogin / saveRole / killNpc / getDaily / dazuo` 仿真 |
| `src/store.js` | SQLite 存档（关键字段列 + 全量 JSON 快照双轨） |

## 待真机对撞的两个歧义（对撞前不要视为定稿）

1. **AES 密钥长度**：Key 按 UTF-8 是 32 字节 → 实际 `aes-256-cbc`（自测日志可证），
   与文档"AES-128"标注矛盾。若真机握手失败，改 `codec.js` 构造参数
   `{ keyEncoding: 'hex' }`（Key 先 hex 解码 16 字节 → AES-128-CBC）。
2. **MD5 签名拼接**：当前按"参数键升序 → 拼值 → 加盐 → MD5"字面实现；
   也有"键值交错拼接"一种读法，对撞失败时改 `codec.sign()`。

## 客户端接入路径（下一步，阶段二收尾）

真机/模拟器 WiFi 代理指向 `127.0.0.1:8080`（或 DNS 重定向游戏域名到本机），
观察首包是否被 `tryParseRpc` 识别；未识别的报文形态会进黑洞日志，据此补解析分支。
