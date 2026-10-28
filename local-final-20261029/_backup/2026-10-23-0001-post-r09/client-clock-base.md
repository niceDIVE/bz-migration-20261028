# client-clock-base 审计报告

## 任务 1：`getSTimestamp` 的定义

### 1.1 TimeMgr 上的主定义
- **文件与行号**：`tools\index.js:136545-136547`
- **逐字代码**：
```javascript
t.prototype.getSTimestamp = function() {
return 0 == this.sserverT || 0 == this.startTime ? Date.now() : this.sserverT + Date.now() - this.startTime;
};
```

### 1.2 附：武林大会模型（WuLinAssemblyModel）上的同名定义
- **文件与行号**：`tools\scripts3.js:96269-96271`
- **逐字代码**：
```javascript
t.prototype.getSTimestamp = function() {
return 0 == this.sserverT || 0 == this.startTime ? L.TimeMgr.getSTimestamp() : this.sserverT + Date.now() - this.startTime;
};
```

### 1.3 是否是用 `sserverT` 加上"本地经过时间"计算？
逐字源码：
```javascript
this.sserverT + Date.now() - this.startTime
```
其中 `Date.now() - this.startTime` 即为本地经过时间，因此当 `0 != this.sserverT && 0 != this.startTime` 时，正是用 `sserverT` 加上"本地经过时间"进行计算。

---

## 任务 2：`sserverT` 的全部出现处

在三包（`tools\index.js`、`tools\scripts2.js`、`tools\scripts3.js`）中共出现 17 处。
- **赋值处**：13 处
- **读取处**：4 处

### 2.1 tools\index.js（共 12 处）
1. `tools\index.js:24661` | 赋值 | `h.TimeMgr.sserverT = e.serverTime;`
2. `tools\index.js:70477` | 赋值 | `k.TimeMgr.sserverT = e.serverTime;`
3. `tools\index.js:70506` | 赋值 | `k.TimeMgr.sserverT = this.idleData.serverTime;`
4. `tools\index.js:90077` | 赋值 | `c.TimeMgr.sserverT = e.sTime;`
5. `tools\index.js:102102` | 赋值 | `r.TimeMgr.sserverT = e.sTime;`
6. `tools\index.js:102119` | 赋值 | `r.TimeMgr.sserverT = e.sTime;`
7. `tools\index.js:102134` | 赋值 | `r.TimeMgr.sserverT = e.sTime;`
8. `tools\index.js:113618` | 赋值 | `M.TimeMgr.sserverT = e.currentServerTime;`
9. `tools\index.js:120519` | 赋值 | `E.TimeMgr.sserverT = n.beginTime;`
10. `tools\index.js:136530` | 赋值 | `this.sserverT = 0;`
11. `tools\index.js:136536` | 读取 | `var t = this._dateST > 0 ? this._dateST : 0 != this.sserverT ? this.sserverT : new Date().getTime();`
12. `tools\index.js:136546` | 读取 | `return 0 == this.sserverT || 0 == this.startTime ? Date.now() : this.sserverT + Date.now() - this.startTime;`

### 2.2 tools\scripts2.js（共 0 处）
- `not found`

### 2.3 tools\scripts3.js（共 5 处）
1. `tools\scripts3.js:23609` | 赋值 | `s.TimeMgr.sserverT = t.housekeeper.dispatchTime;`
2. `tools\scripts3.js:58502` | 赋值 | `R.TimeMgr.sserverT = e.serverTime;`
3. `tools\scripts3.js:95770` | 赋值 | `this.sserverT = 0;`
4. `tools\scripts3.js:96270` | 读取 | `return 0 == this.sserverT || 0 == this.startTime ? L.TimeMgr.getSTimestamp() : this.sserverT + Date.now() - this.startTime;`
5. `tools\scripts3.js:96273` | 赋值 | `this.sserverT = 1e3 * t;`

---

## 任务 3：`startTime`（TimeMgr 上的那个）的定义与赋值点

### 3.1 定义
- **文件与行号**：`tools\index.js:136529`
- **逐字代码**：
```javascript
this.startTime = 0;
```

### 3.2 TimeMgr.startTime 的赋值点（共 10 处）
1. `tools\index.js:24662` | `h.TimeMgr.startTime = Date.now();`
2. `tools\index.js:70479` | `k.TimeMgr.startTime = Date.now();`
3. `tools\index.js:70508` | `k.TimeMgr.startTime = Date.now();`
4. `tools\index.js:102103` | `r.TimeMgr.startTime = Date.now();`
5. `tools\index.js:102120` | `r.TimeMgr.startTime = Date.now();`
6. `tools\index.js:102135` | `r.TimeMgr.startTime = Date.now();`
7. `tools\index.js:113619` | `M.TimeMgr.startTime = Date.now();`
8. `tools\index.js:120520` | `E.TimeMgr.startTime = Date.now();`
9. `tools\scripts3.js:23610` | `s.TimeMgr.startTime = Date.now() - 0;`
10. `tools\scripts3.js:58503` | `R.TimeMgr.startTime = Date.now();`

### 3.3 与 `sserverT` 的关系
`sserverT` 保存服务端下发的时间戳基准值（真实时间/基准时间戳），`startTime` 记录同步该时间戳瞬间的本地基准时刻 `Date.now()`；计算公式 `sserverT + Date.now() - this.startTime` 中，`(Date.now() - this.startTime)` 为本地消逝的偏移量。

---

## 任务 4：`sserverT = 0` 时的公式推导

根据 `tools\index.js:136546` 的逐字源码：
```javascript
return 0 == this.sserverT || 0 == this.startTime ? Date.now() : this.sserverT + Date.now() - this.startTime;
```

当 `this.sserverT = 0` 时：
1. 条件 `0 == this.sserverT` 评估为 `true`；
2. 逻辑或表达式 `0 == this.sserverT || 0 == this.startTime` 短路为 `true`；
3. 三元运算符选取首个分支返回：`Date.now()`。

**结论**：`sserverT = 0` 时，直接返回客户端本地当前时间戳 `Date.now()`。
