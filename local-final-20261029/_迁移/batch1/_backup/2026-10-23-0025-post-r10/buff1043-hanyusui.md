# Buff 1043 与 hanyusuiTime / hyTime 取证报告

## 任务 1：setBufferCostStartTime 与 getTimeBasedBuff(1043) 调用点

### 1. setBufferCostStartTime 调用点及参数来源
在三包中，`setBufferCostStartTime` 仅在 `tools/index.js` 中定义与调用（共 6 处调用，1 处方法定义）：

- **tools/index.js:56539**
  - 行原文：`_.NonBattleBuffModel.setBufferCostStartTime(t.hyTime, t.beginTime);`
  - 第一个参数来源：`t.hyTime`（所属 switch case 7，练功更新事件中服务端下发的 `t` 对象的 `hyTime` 字段）。
- **tools/index.js:56545**
  - 行原文：`_.NonBattleBuffModel.setBufferCostStartTime(t.hyTime, t.beginTime);`
  - 第一个参数来源：`t.hyTime`（所属 switch case 8，打坐更新事件中服务端下发的 `t` 对象的 `hyTime` 字段）。
- **tools/index.js:56558**
  - 行原文：`_.NonBattleBuffModel.setBufferCostStartTime(t.hyTime, t.beginTime);`
  - 第一个参数来源：`t.hyTime`（所属 switch case 10，练功更新事件中服务端下发的 `t` 对象的 `hyTime` 字段）。
- **tools/index.js:56564**
  - 行原文：`_.NonBattleBuffModel.setBufferCostStartTime(t.hyTime, t.beginTime);`
  - 第一个参数来源：`t.hyTime`（所属 switch case 11，打坐更新事件中服务端下发的 `t` 对象的 `hyTime` 字段）。
- **tools/index.js:120522**
  - 行原文：`d.NonBattleBuffModel.setBufferCostStartTime(n.hanyusuiTime, n.beginTime);`
  - 第一个参数来源：`n.hanyusuiTime`（`HttpConst.BEGIN_LIANGONG` 响应回调中服务端下发的 `n` 对象的 `hanyusuiTime` 字段）。
- **tools/index.js:138884**
  - 行原文：`p.NonBattleBuffModel.setBufferCostStartTime(o.hyTime, o.beginTime);`
  - 第一个参数来源：`o.hyTime`（`HttpConst.START_DAZUO` 响应回调中服务端下发的 `o` 对象的 `hyTime` 字段）。

（附：定义点 **tools/index.js:89052**：`t.prototype.setBufferCostStartTime = function(t, e) {`）

### 2. getTimeBasedBuff(1043) 调用点及原文
- **tools/index.js:89029**
  - 行原文：`var o = s.default.getTimeBasedBuff(1043);`
  - 所在函数：`setBufferStartTime(t, e)`
- **tools/index.js:89040**
  - 行原文：`var e = s.default.getTimeBasedBuff(1043);`
  - 所在函数：`setBufferTotalTime(t)`
- **tools/index.js:89054**
  - 行原文：`var o = s.default.getTimeBasedBuff(1043);`
  - 所在函数：`setBufferCostStartTime(t, e)`
- **tools/scripts2.js:17546**
  - 行原文：`(r = u.default.getTimeBasedBuff(1043)).startTimestamp = 0;`
  - 所在逻辑：打坐 tick 中 buff 耗尽重置
- **tools/scripts2.js:38307**
  - 行原文：`(y = f.default.getTimeBasedBuff(1043)).startTimestamp = 0;`
  - 所在逻辑：练功 tick 中 buff 耗尽重置
- **tools/scripts2.js:58223**
  - 行原文：`(v = f.default.getTimeBasedBuff(1043)).startTimestamp = 0;`
  - 所在逻辑：门派练功 tick 中 buff 耗尽重置

---

## 任务 2：配置表 tools\cfg\dump\ 中 1043 的位置

在 `tools/cfg/dump/` 的 443 张 JSON 配置表中，共有 17 张表包含主键或字段等于 1043。
其中同一行/对象包含 `Name`、`Effect`、`DataN`、`Description` 字段的核心表为：

### 1. tools/cfg/dump/buff.json
- **键路径**：`data.1043`
- **原文**：
  ```json
  {"BuffID": 1043, "null": "", "Name": 10945, "Type": 2, "Effect": 23, "DataN": [100], "DataM": [], "diejia": 0, "ReplaceLevel": 1, "withbuff": [], "interval": 1, "round": 0, "Description": 0, "diejiaDescription": 0, "IsDebreak": 1, "IsResist": 0, "SkillLevel": 0, "TypeTag": [], "EffectDes": 0, "actnum": 0, "act": "0", "hit": 0, "effect": "0", "point": "0", "ShowEff": 0, "icon": "0", "settleAct": "", "Nact": "0", "Neffect": "0", "head": "", "skin": "", "face": "", "overlayCol": "", "scale": [100, 100], "Npoint": "0", "FullScreen": "", "SkinColour": "", "animation": "", "buffscale": [100, 100]}
  ```
- **关联工厂**：`tools/index.js:136452` 对 `Effect === 23` 实例化 `MpTrainingBonus` 类（`DataN[0] = 100` 即增加 100% 打坐/练功速度加成）。

### 2. tools/cfg/dump/mall.json
- **键路径**：`data.2.Data[0]`
- **原文**：
  ```json
  {"ID": 2, "Type": 2, "Name": 52002, "Description": 52102, "Price": 200, "Num": 0, "Discount": 0, "Limit": 0, "Belong": 0, "icon": "shop52002", "Data": [1043, 86400], "Begintime": [], "Endtime": [], "shopbegin": [], "shopend": []}
  ```
- **关联代码**：`tools/index.js:131241` 商城购买 `Type == 2` 商品后调用 `S.NonBattleBuffModel.setBufferTotalTime(e.hanyusuiTime)`。

### 3. 其他包含键 1043 的表（非 Buff）
- `skill.json` -> `data.1043`: `{"ID": 1043, "Name": 10525, "menpai": [1], "Type": 7, "Type1": 3, "Cost": 400, ...}`
- `npc.json` -> `data.1043`: `{"NpcID": 1043, "ModelID": 1043, "NpcName": 20043, "Type": 20, ...}`
- `mount.json` -> `data.1043`: `{"id": 1043, "price": [1, 60], "icon": "zuoqi1043", "speed": 100, ...}`
- `map.json` -> `data.1043`: `{"ID": 1043, "null": "", "Type": 2, "Name": 1018, ...}`
- `achieve_list.json` -> `data.1043`: `{"id": 1043, "type": "3", "title": 9576, "des": 6012186, ...}`
- 其余包含 1043 的表：`actconfig.json`, `ActconfigNew.json`, `ai_player.json`, `bossmap.json`, `destroy_town.json`, `exchange.json`, `fightarray.json`, `map_path.json`, `npcPos.json`, `protoidmap.json`, `skill_condition.json`。

---

## 任务 3：配置表 tools\cfg\dump\ 中关键词命中

在 443 张 JSON 逐表逐键逐值扫描结果如下：

### 1. `寒玉` 命中
- **tools/cfg/dump/gift_time.json**
  - 键路径：`data.4.name`
  - 原文片段：`\u5ef6\u751f\u4fdd\u547d\u4e39*2\uff0c\u5bd2\u7389\u4e39*1`（UTF-8 字节：`\xe5\xbb\xb6\xe7\x94\x9f\xe4\xbf\x9d\xe5\x91\xbd\xe4\xb8\xb9*2\xef\xbc\x8c\xe5\xaf\x92\xe7\x8e\x89\xe4\xb8\xb9*1`）

### 2. `寒玉髓` 命中
- 配置表 tools\cfg\dump\ 内扫描结果：`not found`
  （注：语言/文本表未 dump 在 `tools/cfg/dump/` 目录，客户端运行时动态加载自 `langs/lantab_*.bin`）

### 3. `hanyu` 命中
- **tools/cfg/dump/buff.json**
  - 键路径：`data.1997.Neffect` -> 原文：`{"Neffect": "hanyu_eff"}`
  - 键路径：`data.4348.Neffect` -> 原文：`{"Neffect": "hanyu_eff"}`
- **tools/cfg/dump/feat.json**
  - 键路径：`data.188701.MoveEffect` -> 原文：`{"MoveEffect": "Qhanyu"}`
  - 键路径：`data.200201.MoveEffect` -> 原文：`{"MoveEffect": "Qhanyu"}`
- **tools/cfg/dump/level_sever.json**
  - 键路径：`cols[15]` -> 原文：`"hanyugong"`
  - 键路径：`data.1.hanyugong` ~ `data.1000.hanyugong` -> 原文：`{"hanyugong": 80}` 等

### 4. `HANYU` 命中
- 配置表 tools\cfg\dump\ 内扫描结果：`not found`

### 5. `HY` 命中
- 配置表 tools\cfg\dump\ 内扫描结果：`not found`

---

## 任务 4：hanyusuiTime 与 hyTime 全量检索及形态判定

### 1. hanyusuiTime 全量出现（共 9 处）
- **tools/index.js:64819**: `} else if (a.hasOwnProperty("hanyusuiTime")) {`
- **tools/index.js:64820**: `M.NonBattleBuffModel.setBufferTotalTime(a.hanyusuiTime);`
- **tools/index.js:70572**: `M.NonBattleBuffModel.setBufferTotalTime(e.hanyusuiTime);`
- **tools/index.js:120521**: `e.hyTime = 1e3 * n.hanyusuiTime;`
- **tools/index.js:120522**: `d.NonBattleBuffModel.setBufferCostStartTime(n.hanyusuiTime, n.beginTime);`
- **tools/index.js:120579**: `d.NonBattleBuffModel.setBufferTotalTime(o.hanyusuiTime);`
- **tools/index.js:131242**: `S.NonBattleBuffModel.setBufferTotalTime(e.hanyusuiTime);`
- **tools/index.js:138891**: `p.NonBattleBuffModel.setBufferTotalTime(o.hanyusuiTime);`
- **tools/index.js:138905**: `p.NonBattleBuffModel.setBufferTotalTime(e.hanyusuiTime);`
- `tools/scripts2.js`: `not found`
- `tools/scripts3.js`: `not found`

### 2. hyTime 全量出现
- **tools/index.js**:
  - Line 56538: `M.SkillUpgradeModel.hyTime = 1e3 * t.hyTime;`
  - Line 56539: `_.NonBattleBuffModel.setBufferCostStartTime(t.hyTime, t.beginTime);`
  - Line 56544: `E.TrainingMpModel.hyTime = 1e3 * t.hyTime;`
  - Line 56545: `_.NonBattleBuffModel.setBufferCostStartTime(t.hyTime, t.beginTime);`
  - Line 56557: `M.SkillUpgradeModel.hyTime = 1e3 * t.hyTime;`
  - Line 56558: `_.NonBattleBuffModel.setBufferCostStartTime(t.hyTime, t.beginTime);`
  - Line 56563: `E.TrainingMpModel.hyTime = 1e3 * t.hyTime;`
  - Line 56564: `_.NonBattleBuffModel.setBufferCostStartTime(t.hyTime, t.beginTime);`
  - Line 120478: `this.hyTime = 0;`
  - Line 120496: `this.hyTime = 0;`
  - Line 120521: `e.hyTime = 1e3 * n.hanyusuiTime;`
  - Line 121281: `var e = [], o = this.hyTime, i = 0;`
  - Line 121299: `var e = [], o = this.hyTime, i = 0;`
  - Line 121587: `this.hyTime = 0;`
  - Line 138871: `this.hyTime = 0;`
  - Line 138876: `this.hyTime = 0;`
  - Line 138883: `t.hyTime = 1e3 * o.hyTime;`
  - Line 138884: `p.NonBattleBuffModel.setBufferCostStartTime(o.hyTime, o.beginTime);`
  - Line 138899: `p.NonBattleBuffModel.tbbByID.hasOwnProperty(1043) && (t.hyTime = p.NonBattleBuffModel.tbbByID[1043].duration);`
- **tools/scripts2.js**:
  - Line 17481: `this.hyTime2Use = g.TrainingMpModel.hyTime;`
  - Line 17500: `this.hyTime2Use = g.TrainingMpModel.hyTime;`
  - Line 38139: `this.hyTime2Use = m.SkillUpgradeModel.hyTime;`
  - Line 38166: `this.hyTime2Use = m.SkillUpgradeModel.hyTime;`
  - Line 53163: `this.hyTime2Use = g.TrainingMpModel.hyTime;`
  - Line 58088: `this.hyTime2Use = m.SkillUpgradeModel.hyTime;`
  - Line 58117: `this.hyTime2Use = m.SkillUpgradeModel.hyTime;`
  - Line 64625: `this.hyTime2Use = u.TrainingMpModel.hyTime;`
- `tools/scripts3.js`: `not found`

### 3. 字段运算形态与判定
被当成**某个 buff 的剩余时间**使用。

**代码客观运算形态证据**：
1. **直接同步给 buff 1043 的 duration**：
   `tools/index.js:89042`: `e.duration = 1e3 * t;`（传入的 `t` 直接来自 `hanyusuiTime`）
   `tools/index.js:89056`: `o.duration = 1e3 * t;`（传入的 `t` 直接来自 `hyTime` / `hanyusuiTime`）
   `tools/index.js:138899`: `p.NonBattleBuffModel.tbbByID.hasOwnProperty(1043) && (t.hyTime = p.NonBattleBuffModel.tbbByID[1043].duration);`
2. **在打坐/练功 tick 中作为加速 buff 剩余时间扣减与分段计算**：
   在 `tools/scripts2.js:17537-17555` 中：
   - 比较：`if (this.hyTime2Use > 0 && i > this.hyTime2Use)`（比较经过时间与剩余加速时间）
   - 分段：`this.n += n * this.hyTime2Use * .001;`（加速段速度 × 剩余时长）加上 `this.n += s * (i - this.hyTime2Use) * .001;`（无加速段速度 × 耗尽后时长）
   - 扣减：`this.hyTime2Use > 0 && (this.hyTime2Use -= 1e3 * o);`
   - 耗尽时销毁 buff：`(r = u.default.getTimeBasedBuff(1043)).startTimestamp = 0; r.duration = 0;`
