# EndMeditation / EndTraining 发送点、应答与 hyTime / hanyusuiTime 取证报告

## 任务 1：EndMeditation (END_DAZUO) 发送点与回调

### 1. 发送请求的代码
文件位置：`tools/index.js:138954-138963`
```javascript
t.prototype.end = function() {
    var t = {};
    y.SkillUtils.getMaxNGBonus(t);
    var e = m.playerInfo.entity, o = {
        skillID: t.skillID,
        hglmt: e.hunger.limit,
        speed: e.hungerConsumingSpeed.finalValue
    };
    u.NetMgr.http.sendRequest(s.HttpConst.END_DAZUO, o);
};
```
- Request 字段名与取值：
  - `skillID`: `t.skillID`
  - `hglmt`: `e.hunger.limit`
  - `speed`: `e.hungerConsumingSpeed.finalValue`

### 2. 应答回调整个函数体
文件位置：`tools/index.js:138888-138895`
```javascript
r.MessageCenter.on(s.HttpConst.END_DAZUO, function(e, o) {
    t.startTimestamp = 0;
    h.RoleOtherInfo.gengudanTime = o.genguTime;
    p.NonBattleBuffModel.setBufferTotalTime(o.hanyusuiTime);
    o.note.hasOwnProperty("attrch") && o.note.attrch.hasOwnProperty("mpTrained") && (d.RoleBaseInfo.mpTrained = o.note.attrch.mpTrained);
    c.FishingModel.setAutoStartHung(o);
    r.MessageCenter.dispatch(l.EvName.END_NG_TRAINING);
}, this);
```

### 3. 是否带有时间/时长字段判定
- 结束请求的 request 里**没有**带上"开始时间"或"已过时长"或"本次时长"这类字段。
- 实际发送的字段仅有：`skillID`、`hglmt`、`speed`。

---

## 任务 2：EndTraining (END_LIANGONG) 发送点与回调

### 1. 发送请求的代码
文件位置：`tools/index.js:120772-120781`
```javascript
e.prototype.end = function(t) {
    var e = T.playerInfo.entity;
    b.CrossServiceModel.needLocalUrlAndPort(function() {
        _.NetMgr.http.sendRequest(c.HttpConst.END_LIANGONG, {
            hglmt: e.hunger.limit,
            speed: e.hungerConsumingSpeed.finalValue,
            auto: t
        });
    });
};
```
- Request 字段名与取值：
  - `hglmt`: `e.hunger.limit`
  - `speed`: `e.hungerConsumingSpeed.finalValue`
  - `auto`: `t`

### 2. 应答回调整个函数体
文件位置：`tools/index.js:120574-120601`
```javascript
s.MessageCenter.on(c.HttpConst.END_LIANGONG, function(t, o) {
    e.isLiangType = 0;
    e.skill2Upgrade = 0;
    e.lgObj = {};
    u.RoleOtherInfo.gengudanTime = o.genguTime;
    d.NonBattleBuffModel.setBufferTotalTime(o.hanyusuiTime);
    h.FishingModel.setAutoStartHung(o);
    o.hasOwnProperty("isSchoolAward") && (B.SchoolSquareModel.isSchoolAward = o.isSchoolAward);
    o.hasOwnProperty("isCollective") && (B.SchoolSquareModel.isCollective = o.isCollective);
    if (0 != e.endTipStr.length) {
        if (o.hasOwnProperty("skillArr") && o.skillArr.length) {
            cc.log("=========修炼队列开启下一个练功==========");
            e.skillQueue = o.skillArr;
            e.start(o.skillArr[0], B.SchoolSquareModel.isCollective);
        } else {
            e.skillQueue = [];
            if (o.hasOwnProperty("skillid")) {
                cc.log("=======关闭练功=2========");
                s.MessageCenter.dispatch(p.EvName.END_SKILL_TRAINING_CLOSR, o.skillid);
            }
        }
        s.MessageCenter.dispatch(p.EvName.SELECT_QUEUE_SKILL);
    } else {
        B.SchoolSquareModel.isCollective = 0;
        cc.log("=======关闭练功=1========");
        s.MessageCenter.dispatch(p.EvName.END_SKILL_TRAINING, !0);
    }
}, this);
```

### 3. 是否带有时间/时长字段判定
- 结束请求的 request 里**没有**带上"开始时间"或"已过时长"或"本次时长"这类字段。
- 实际发送的字段仅有：`hglmt`、`speed`、`auto`。

---

## 任务 3：hyTime 与 hanyusuiTime 的含义来源

### (a) 三包 grep 逐条记录（按动作归属分组，至多 20 条）

#### 1. 打坐 (Meditation / RecoverMP) 相关
- `tools/index.js:138871`: `this.hyTime = 0;`
- `tools/index.js:138876`: `this.hyTime = 0;`
- `tools/index.js:138883`: `t.hyTime = 1e3 * o.hyTime;`
- `tools/index.js:138884`: `p.NonBattleBuffModel.setBufferCostStartTime(o.hyTime, o.beginTime);`
- `tools/index.js:138891`: `p.NonBattleBuffModel.setBufferTotalTime(o.hanyusuiTime);`
- `tools/index.js:138899`: `p.NonBattleBuffModel.tbbByID.hasOwnProperty(1043) && (t.hyTime = p.NonBattleBuffModel.tbbByID[1043].duration);`
- `tools/index.js:138905`: `p.NonBattleBuffModel.setBufferTotalTime(e.hanyusuiTime);`

#### 2. 练功 (Skill Upgrade / Training) 相关
- `tools/index.js:120478`: `this.hyTime = 0;`
- `tools/index.js:120496`: `this.hyTime = 0;`
- `tools/index.js:120521`: `e.hyTime = 1e3 * n.hanyusuiTime;`
- `tools/index.js:120522`: `d.NonBattleBuffModel.setBufferCostStartTime(n.hanyusuiTime, n.beginTime);`
- `tools/index.js:120579`: `d.NonBattleBuffModel.setBufferTotalTime(o.hanyusuiTime);`
- `tools/index.js:121281`: `var e = [], o = this.hyTime, i = 0;`
- `tools/index.js:121299`: `var e = [], o = this.hyTime, i = 0;`
- `tools/index.js:121587`: `this.hyTime = 0;`

#### 3. 登录重连/初始同步 (Login / Role Info) 相关
- `tools/index.js:56538`: `M.SkillUpgradeModel.hyTime = 1e3 * t.hyTime;`
- `tools/index.js:56539`: `_.NonBattleBuffModel.setBufferCostStartTime(t.hyTime, t.beginTime);`
- `tools/index.js:56544`: `E.TrainingMpModel.hyTime = 1e3 * t.hyTime;`
- `tools/index.js:56545`: `_.NonBattleBuffModel.setBufferCostStartTime(t.hyTime, t.beginTime);`
- `tools/index.js:64820`: `M.NonBattleBuffModel.setBufferTotalTime(a.hanyusuiTime);`
- `tools/index.js:70572`: `M.NonBattleBuffModel.setBufferTotalTime(e.hanyusuiTime);`

### (b) 配置表 dump 检索结果
- 在 `tools/cfg/dump/` 的所有 442 张 JSON 文件中检索 `hyTime` 与 `hanyusuiTime`：
  - 检索结果：**not found**。
  - 两个字段名均未在任何静态配置表中出现，纯属服务端下发的动态运行时协议字段（代表寒玉髓/Buff 1043 的有效时长或剩余时间）。

### (c) 客户端运算逻辑与证据行
- 运算类型：
  1. **单位转换（乘 1000 换算为毫秒）**：
     - `tools/index.js:138883`: `t.hyTime = 1e3 * o.hyTime;`
     - `tools/index.js:120521`: `e.hyTime = 1e3 * n.hanyusuiTime;`
     - `tools/index.js:89042`: `e.duration = 1e3 * t;`
     - `tools/index.js:89056`: `o.duration = 1e3 * t;`
  2. **分段积分运算与扣减（比较、加速倍率乘法、扣减剩余时长）**：
     - 打坐结算/渲染帧推进：
       - `tools/scripts2.js:17537`: `if (this.hyTime2Use > 0 && i > this.hyTime2Use) {`
       - `tools/scripts2.js:17550`: `this.n += n * this.hyTime2Use * .001;`
       - `tools/scripts2.js:17551`: `this.n += s * (i - this.hyTime2Use) * .001;`
       - `tools/scripts2.js:17552`: `this.hyTime2Use = 0;`
       - `tools/scripts2.js:17555`: `this.hyTime2Use > 0 && (this.hyTime2Use -= 1e3 * o);`
     - 练功结算/渲染帧推进：
       - `tools/scripts2.js:38298`: `if (this.hyTime2Use > 0 && l > this.hyTime2Use) {`
       - `tools/scripts2.js:38311`: `this.n += v * this.hyTime2Use * .001;`
       - `tools/scripts2.js:38312`: `this.n += h * (l - this.hyTime2Use) * .001;`
       - `tools/scripts2.js:38313`: `this.hyTime2Use = 0;`
       - `tools/scripts2.js:38316`: `this.hyTime2Use > 0 && (this.hyTime2Use -= 1e3 * i);`

---

## 任务 4：setBufferCostStartTime(a, b) 定义及读写引用

### 1. 逐字抄出函数定义
文件位置：`tools/index.js:89052-89065`
```javascript
t.prototype.setBufferCostStartTime = function(t, e) {
    if (!(t <= 0)) {
        var o = s.default.getTimeBasedBuff(1043);
        o.startTimestamp = e;
        o.duration = 1e3 * t;
        if (this._tbbByID.hasOwnProperty(o.id)) {
            this._tbbByID[o.id].duration = o.duration;
            this._tbbByID[o.id].startTimestamp = o.startTimestamp;
        } else {
            o.apply();
            this._tbbByID[o.id] = o;
        }
    }
};
```

### 2. 两个参数的存储与后续读取
- 第一个参数 `t`（时长秒数）：
  - 存储为：`1e3 * t`，赋值给 Buff 对象 `o.duration`（或更新到 `this._tbbByID[1043].duration`）。
- 第二个参数 `e`（开始时间戳毫秒数）：
  - 存储为：赋值给 Buff 对象 `o.startTimestamp`（或更新到 `this._tbbByID[1043].startTimestamp`）。
- 后续怎么被读：
  - 通过 `NonBattleBuffModel.tbbByID[1043]` 或 `NonBattleBuffModel.getStatus(1043)` 读取。
  - 读取证据行：
    - `tools/index.js:88993`: `if (o.startTimestamp > 0) { o.update(t); ... }`（定时驱动更新）
    - `tools/index.js:89004-89005`: `o.startTimestamp = this._tbbByID[e].startTimestamp; o.duration = this._tbbByID[e].duration;`（本地加密存储 save）
    - `tools/index.js:138899`: `p.NonBattleBuffModel.tbbByID.hasOwnProperty(1043) && (t.hyTime = p.NonBattleBuffModel.tbbByID[1043].duration);`
    - `tools/scripts2.js:47303`: `var e = p.NonBattleBuffModel.tbbByID[1043].duration, o = p.NonBattleBuffModel.tbbByID[1043].startTimestamp, i = (e - (l.TimeMgr.getSTimestamp() - o)) / 1e3;`
    - `tools/scripts2.js:17539`: `if (r = h.NonBattleBuffModel.getStatus(1043)) { ... }`（判断 buff 是否生效以取对应速度）
