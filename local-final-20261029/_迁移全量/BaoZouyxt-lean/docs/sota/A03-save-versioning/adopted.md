# A03 · 存档版本演进 —— 采纳台账

> 答复原文：本批由用户转发（外部模型输出，2026-10-22 03:0x）。本文件是**唯一有资格改变代码**的记录。
> 判定口径：只收「能落成断言/能翻译成 ES5」的部分；不采信的写明原因。

## 一、采信（要落地的）

| # | 采信内容 | 落地方式 | 映射到 |
|---|---|---|---|
| 1 | `saveVersion` 整数 + 顺序纯函数迁移；「读时补默认值」只允许出现在单个迁移步骤内部 | 重写 `loadSave()`：先 `detectVersion` → 跑 `STEPS` → `validateLatest` → 失败只读 | `core/bz-rpc-server.js:35-46` |
| 2 | `saveVersion > LATEST` → 拒绝加载且**禁止写回** | `persist()` 加守卫：`_save.saveVersion > LATEST` 时直接 return + 记 err | 同上 |
| 3 | 原子写：同目录 `.tmp` → rename；**我们没有 fsync**，所以必须配「写后回读校验」 | `bz.writeFile` 换成 `writeTmp + renameFile + 读回比对` | `hook/bz-bootstrap.js:51`（`bz.writeFile`） |
| 4 | checksum 封套 + tmp 提升（进程死在 rename 前时用 tmp 恢复） | 存档外层包 `{v, len, crc, payload}`；**crc 算在实际写出的字节上**（不要重新 stringify） | 同上 |
| 5 | 轮转备份 3 份 + 迁移前 1 份 + 会话 3 份 | 落地成 `save.bak.1..3` / `save.pre-v{N}.json` / `save.session.1..3` | 新增，写在 `bz-bootstrap` 的 fs 层 |
| 6 | **写前语义守卫**：关键集合异常缩水且没有对应操作标记 → 拒写并留 `save.rejected.json` | 拦「背包从 >0 变 0」「`done` 数量减少」「技能等级下降」；这三条正好是我们踩过的事故 | 同上 |
| 7 | CI 五条断言（金样 / 幂等 / 不丢数据 / 快照-增量同构 / 版本守卫） | 直接翻成 `test/save-migrate.js`（新增文件） | `test/` |

## 二、修正（它不知道我们的环境）

| # | 它说的 | 我们的实情 | 改法 |
|---|---|---|---|
| 1 | 骨架用 `structuredClone` / `??` / `Object.values` | 我们是 ES5（`new Function` 求值，Cocos 2.x JSB） | 全部手写 ES5：`JSON.parse(JSON.stringify(x))` 深拷贝、`typeof x === 'undefined'` 判空、`for..in` |
| 2 | 第 3 节要求 `fsync(fd)` + 目录 fsync | **端上实测**（`probe/fs_api_probe.js`）：`jsb.fileUtils` 只有 `writeStringToFile / getStringFromFile / isFileExist / removeFile / renameFile / getFileSize / createDirectory`，**无 fsync、无 stat** | 用「tmp → rename → 读回比对 crc」代替 fsync 保证；失败场景①（rename 先于落盘）由 crc 检出 + 轮转备份恢复。备选方案：它给的 A/B 双槽（不依赖 rename） |
| 3 | checksum 在 `payload` 上算 | 键序不稳定 | crc 必须算在**实际写出的字节串**上；读回时对原始串再算一次，不重新序列化 |
| 4 | 形态指纹：`Object.values(abilities).some(Array.isArray)` ⇒ v3 | **实测我们存档是混形**：`{"1":[40,0,1],"7":[5,6,1],"1112":1,"1262":1}` | 新档一律写 `saveVersion`；旧档指纹只用「字段存在性」（`rewarded` 存在 ⇒ v4，`playerEquip` ⇒ v3，`equipments` ⇒ v2，否则 v1），且迁移函数必须容忍混形 |

## 三、替它补的三个「材料未提供」（我们的事实）

| 它缺的 | 我们的答案 | 依据 |
|---|---|---|
| `m2to3` 的 `progress` / `tier` 初值 | `progress = 0`，`tier = 1` | 现有代码就是 `[max(1,lv), 0, 1]` 补的；`LoadGame` 回放同一口径 |
| `m3to4` 的 `rewarded` 该空着还是回填 `done` | **空着**，不回填 | 回填 = 宣称「老档都发过」，永久丢奖励；空着可由维护动作 `bzBackfillRewards`（幂等，按 `save.rewarded` 跳重）补偿 |
| 现网形态数量 | 只有 v1–v4 四种，且当前档 = v4 + `skills` 混形 | 我们的 4 份历史快照：`_backup\2026-10-22-012652-pre-bagprobe\`、`-0205-pre-selfcheck-isolation\`、`-0232-pre-skill-target\`、`-0250-pre-pgr-persist\` |

## 四、不采信 / 暂不做

| 内容 | 原因 |
|---|---|
| 「只有一个物理文件」时才用的「把备份塞进同一个文件」 | 我们的可写目录是自己的，多文件没有限制，没必要牺牲冗余度 |
| 它建议的 `NewerSaveError` 抛异常→只读模式 | 概念收，但我们的 UI 没有「只读模式」，落地成：**拒绝写回 + 日志 err + 面板仍可玩（内存态）**，下次启动重新加载 |
| `validateLatest` 里做「引用完整性」全量校验 | 收窄：只校验我们真的会用到的那几条（`skills` 值形态、`bag` 值是正整数、`playerEquip` 的 uid 引用）。全量校验成本高且我们没有 schema |

## 五、实施状态（2026-10-22 03:20，impl `h931ee70c`）

已落地（方案 A：只热重载，不动游戏进程）：

| 落地项 | 位置 | 验收 |
|---|---|---|
| `migrateSave()`：永远从 v1 跑起、每步可重入、技能逐值归一（裸数字 → `[lv,0,1]`） | `core/bz-rpc-server.js` | `test/save-migrate.js` 39 项全过 |
| `validateSave()`：技能三元组 / 背包正整数 / `rewarded`·`done` 是数组 | 同上 | 同上 |
| 只读模式：解析失败、`saveVersion > LATEST`、迁移或校验失败 → 一个字节都不写 | 同上 | 新档 99 / 截断档两条断言 |
| `persist()`：写前校验 → 缩水守卫 → 写 → **写后回读比对** | 同上 | `guard:*` 5 条断言 |
| `_currentAction` 贯穿 dispatch（守卫的 who 依据，`useItem`/`saleItem` 豁免背包清空） | 同上 | 同上 |
| 真档端上验证 | 设备 | `1262:1 → 1262:[1,0,1]`、新增 `"saveVersion":4`，其余字段（potential/bag/done/accepted/rewarded）零变化 |

延后（需要重启游戏，等用户点头）：

| 延后项 | 原因 |
|---|---|
| 存档 A/B 双槽 + 头部 `{gen,len,crc}` | 落在引导层（`hook/bz-bootstrap.js`），改完必须 `run.ps1 all`（会 force-stop 游戏）。当前用「单文件 + 写后回读」代替，够用但不抗断电 |

工人取证（本轮）：

- `tools/facts/save-fixtures.json`（WO-A）：4 份历史快照的形态演进 = 快照 1 全是裸数字，快照 2–4 是混形态（`1/7/8` 数组、`1112/1262` 裸数字）→ 证实「形态指纹必误判」，也因此证实「永远从 v1 跑起」是正确设计。
- `tools/facts/shape-weak-evidence.json`（WO-B，进行中）：255 个弱证据字段清单。
- `tools/facts/save-write-paths.json`（WO-C，进行中）：全部改存档赋值点，用于校验守卫覆盖面。

