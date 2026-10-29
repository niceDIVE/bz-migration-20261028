# 缺口 #2（catchCode）的真实规模：63，不是 87

> 触发原因：R19 之后我第一次派"发送点分类"时把判据写错了——把 `sendRequest(..., function(){})` 的**内联回调**当成"客户端会读应答"的唯一标志。
> 本客户端绝大多数应答是在模型 init 里注册的：`MessageCenter.on(a.HttpConst.XXX, function(o,a){...})`
> （实测注册数 `index.js` 579 / `scripts2.js` 46 / `scripts3.js` 293 = **918 处**），内联回调只是少数分支。
> 按错判据会得出"只有 20 个动作读应答"的假结论 → 已作废，重派后得到下表。

## 三个口径的区别（别再混用）

| 口径 | 数字 | 出处 / 说明 |
|---|---|---|
| 客户端全部动作常量 | 1125（`index.js:59491-60615` 枚举块） | 其中 711 有发送点**且**有应答处理器，33 只发不收，192 只注册不发送，189 纯常量 |
| 我方 `H` 里的 handler | **87** | `core/bz-rpc-server.js` 的 `var H = {...}`；其中 4 个是维护命令（`bzSeedBag`/`bzBackfillRewards`/`bzGrantCur`/`bzPatch`）、1 个是别名（`getFriendPartner`）⇒ 协议动作 **82** |
| 其中**客户端会读应答**（有 `MessageCenter.on`） | **79** | 没有 on() 的只有 3 个：`ChooseServer` / `TellAction` / `specialCycleLife` |
| 现有 catchCode | **16** | `tools/facts/reject-codes.json` 条目数 |
| **真实缺口** | **63** | 79 − 16 |

⇒ 缺口 #2 = **63 个动作**（不是我上一轮转述的"87 个动作"，也不是 D1 那版错的"711/87"）。

## 比"补 63 条"更要紧的事

`tools/derive_catch_codes.js:25-29` 的推导内核是"从码池里挑第一个没被排除的"：

```js
const forbidden = new Set([1]);                    // 1 = 成功
(entry.success || []).forEach(x => forbidden.add(x));
(entry.handled || []).forEach(x => forbidden.add(x));   // ← 抽漏一处 = 少一个码
(entry.codes  || []).forEach(c => forbidden.add(c.code));
const derived = POOL.find(x => !forbidden.has(x));      // ← 于是挑出一个错的
```

而 `handled` 抽取有三类已知盲区，各有真实实例：

| 盲区 | 实例 |
|---|---|
| 假值判断 | `scripts3.js:13284` `e.eRet && c.default.prefabs.load("shopUI/AutoSaveAlertUI", ...)` |
| 不等号/大小比较 | `scripts3.js:50852` `if (1 != e.eRet) {` ；`index.js:54232` `0 != e.eRet && ...` |
| 末尾 else 兜底 | `index.js:54374 if (1 == e.eRet) {...} else {...}` ；`scripts3.js:23171-23178` |

结论：**先扩 `handled` 抽取，再补 63 条**。顺序反了的话，推导会用不完整的 `forbidden` 集合给出"自信但错误"的 catchCode——这比不填更糟（`_catchCount++` 之后要回推导出的 `catchCode`，回错了就是给客户端一个错误分支）。

## 复算方式

- handler 全集：`grep '^    \w*: function (' core/bz-rpc-server.js`
- 应答处理器：三个包里 `MessageCenter.on(\s*[\w$]+\.HttpConst\.<名字>\b`
- 发送点：`sendRequest(\s*[\w$]+\.HttpConst\.<名字>\b` 或 `sendReqWithMask(...)`
- 明细表：`$out\r18\handler-map.txt`（87 行 × handler/枚举名/on/send）
