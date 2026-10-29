# 技术文档 (Technical Specifications)

本文档记录已确定下来的技术路线、架构设计、技术栈选型与实现细节。

---

## 1. 架构总览 (解耦与缝合体系)

根据“SOTA 战略架构推演 + 本地底层缝合”双层设计，系统分为两大正交层次：

```
+-------------------------------------------------------------------------+
| [ 上层: 通用业务状态机与数值持久化层 (由 SOTA 顶级模型推演标准方案) ]        |
|                                                                         |
|  - 离线时间步进演算器 (Idle Time Step Integrator): 挂机/闭关收益微积分模型 |
|  - 核心属性状态机 (Attributes State Machine): 臂力/身法/悟性/根骨四维结算   |
|  - 武学技能树与真元系统 (Martial Art & Zhenyuan Core): 升级/突破/传承模型   |
|  - 通用 SQLite3 数据库 Schema: 角色表、技能表、道具表、任务状态表          |
|  - Web GM 开发者控制台 (Express/Vite WebUI): 运行时动态属性检视与篡改       |
+-------------------------------------------------------------------------+
                                    |
                        (标准 JSON 业务契约透传)
                                    v
+-------------------------------------------------------------------------+
| [ 下层: 本地单机协议编解码适配层 (由本地 opencode Agent 独立落地实现) ]      |
|                                                                         |
|  - Wire Codec: Hex 字符串转换 / AES-128-CBC 加解密 (固定 Key/IV)         |
|  - Compression Codec: LZ-String Base64 压缩与解压缩流水线               |
|  - RPC Dispatcher: mod/do/p 路由解析与报文组装                           |
|  - Local Loopback Gateway: 127.0.0.1 HTTP 网关服务                       |
+-------------------------------------------------------------------------+
```

---

## 2. 关键技术细节与协议实现规范


### 2.1 协议编解码规范 (Protocol Codec)
- **对称加解密**: AES-128-CBC
  - `Key = "120734aa834dea925ca8d2e1bb6811c3"` (UTF-8 bytes)
  - `IV  = "33daee8409834c00"` (UTF-8 bytes)
  - 密文输出/输入格式: Hex 16进制编码字符串
- **数据压缩**: LZ-String (Base64 格式)
  - 发送: `JSON.stringify(payload) -> LZString.compressToBase64 -> AES_CBC_Encrypt -> Hex`
  - 接收: `Hex -> AES_CBC_Decrypt -> LZString.decompressFromBase64 -> JSON.parse`
- **签名算法 (Sign Check)**:
  - 参数键升序排列，拼接键值字符串
  - 盐值: `result + "d393805c9fea36662befb6282aa7331c"`
  - MD5 计算生成小写 32 位 Hex

### 2.2 核心数值算法实现
- 潜能升级计算器: 阶梯分段难度系数立方算法
- 真元算法: 主副武学 100%/50% 权重结算
- 修炼挂机: 根骨基底 + 先天功/经脉/寒玉床加成模型

---

## 3. 安全合规本地沙盒架构设计 (`#safe-sandbox`)

为了确保任务“伪装得足够安全、本地游玩、无外泄风险”，系统设计采取以下工程防护与规范：

```
       [ 手机 / 模拟器 ] (原版官方客户端，无需二次重打包)
               |
         (WiFi 局域网代理 -> 127.0.0.1:8080)
               |
               v
+--------------------------------------------------------------+
| 本地仿真网关 (Offline Simulation Gateway)                     |
|                                                              |
|   1. 外部流量黑洞 (Telemetry Blackhole):                      |
|      - 拦截穿山甲(Pangle)、快手(Kwai)、U8SDK、阿里统计数据     |
|      - 自动短路，返回 HTTP 200 空内容，杜绝外网网络行为      |
|                                                              |
|   2. 游戏 RPC 协议仿真层:                                    |
|      - 拦截 xfsdk / tfy-inc / 游戏业务域                      |
|      - AES-128-CBC + LZString 编解码流水线                   |
|      - User.quicklogin / User.killNpc / User.saveRole 响应   |
|                                                              |
|   3. 零污染本地存储 (Local Isolation DB):                     |
|      - 本地 SQLite3 数据库 (玩家属性、武学、银两、潜能)      |
|      - 本地 Web GM 开发者控制台 (http://localhost:8080/gm)   |
+--------------------------------------------------------------+
```

### 3.1 核心安全准则
1. **零外联原则 (Zero Egress)**: 仿真网关不向公网转发任何客户端报文，所有应答完全在本地状态机内部闭环生成。
2. **纯原生兼容**: 客户端保持官方正版原包，无需反编译重打包修改签名，避免触发任何签名校验或反作弊误报。
3. **安全抽象术语**: 源码工程中采用 `OfflineGateway`, `MockProtocolService`, `GameSimulator` 等行业通用测试标准命名。


