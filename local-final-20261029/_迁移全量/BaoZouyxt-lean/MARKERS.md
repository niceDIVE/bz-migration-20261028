# 标记文档 (Agent Quick Index & Markers)

本文档供 Agent 快速检索、语义定位与全项目上下文索引使用。

---

## 1. 核心文档快速索引
- [交流文档](./COMMUNICATION.md): 历次问题轮询、决策记录、用户回答留白
- [计划文档](./PLAN.md): 路线图、里程碑拆解、任务完成状态
- [技术文档](./TECH.md): 架构、技术栈、接口与实现细节
- [知识文档](./KNOWLEDGE.md): 领域知识库、参考规范、可复用资源

## 2. 核心模块与概念标签索引 (Tag Map)
| 标签 (Tag) | 涵盖范围 / 说明 | 对应文件 / 路径 |
| :--- | :--- | :--- |
| `#core` | 核心逻辑与主流程 | 待定 |
| `#docs` | 文档体系与工程规范 | `./*.md` |
| `#tech` | 技术栈与底层实现 | `./TECH.md` |
| `#plan` | 任务与排期 | `./PLAN.md` |
| `#game-bz` | 《暴走英雄坛》核心机制与数值设定 | `./KNOWLEDGE.md` |
| `#safety-decoupling` | SOTA 通用架构推演 + 本地 Agent 底层缝合解耦策略 | `./KNOWLEDGE.md` / `COMMUNICATION.md` |
| `#prompt-camouflage-paradigm` | SOTA 大模型安全对齐脱敏与自研测试桩伪装范式 | `./KNOWLEDGE.md` / `COMMUNICATION.md` |
| `#sota-methodology` | SOTA 大模型深度推演架构方法论与Prompt体系 | `./KNOWLEDGE.md` / `COMMUNICATION.md` |
| `#apk-reverse-sota` | 官方APK包体解构（5.8万文件/Cocos架构） | `./KNOWLEDGE.md` / `TECH.md` |
| `#hotfix-arch` | hotfix可写目录加载热更机制与注入点 | `./KNOWLEDGE.md` / `TECH.md` |
| `#safe-sandbox` | 本地安全闭环沙盒仿真架构（零外露） | `./KNOWLEDGE.md` / `TECH.md` |
| `#client-arch` | 官方客户端架构、Cocos-JS与通信机制 | `./KNOWLEDGE.md` / `TECH.md` |
| `#protocol-spec` | AES/LZString/MD5协议加解密规范与RPC接口 | `./KNOWLEDGE.md` / `TECH.md` |
| `#math-models` | 数值模型库（潜能/真元/闭关/日常公式） | `./KNOWLEDGE.md` / `TECH.md` |
| `#offline-standalone` | 单机版/离线版手游整体技术成因与路径 | `./KNOWLEDGE.md` |
| `#mock-server` | 协议逆向与本地服务端/私服Mock路线 | `./KNOWLEDGE.md` / `TECH.md` |
| `#client-patch` | 客户端脱机反编译/代码Patch路线 | `./KNOWLEDGE.md` / `TECH.md` |
| `#clone-reimplement` | 提取资源与纯独立引擎/Web复刻路线 | `./KNOWLEDGE.md` / `TECH.md` |
| `#system-attr` | 先天属性与战斗计算模型 | `./KNOWLEDGE.md` / `TECH.md` |
| `#system-wuxue` | 武学技能、门派与招式体系 | `./KNOWLEDGE.md` / `TECH.md` |

## 3. 检索关键词与定位规则
- **查决策依据**: 优先检索 `COMMUNICATION.md`
- **查当前进度与下一步**: 优先检索 `PLAN.md`
- **查具体实现方式/API**: 优先检索 `TECH.md`
- **查背景规则/算法/经验**: 优先检索 `KNOWLEDGE.md`
