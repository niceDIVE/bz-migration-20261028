# scoutP2-crop-event 契约取证

## 汇总表
| 键 | 线上名 | 定义行 | 发送点行 | 回调行 | 请求载荷键 |
|---|---|---|---|---|---|
| EXPEDITE_CROP | expediteCrop | tools/index.js:59852 | tools/index.js:58144 | tools/index.js:57825 | sIdx, num |
| CLEAN_DEAD_CROP | cleanDeadCrop | tools/index.js:59851 | tools/index.js:58139 | tools/index.js:57811 | sIdx |
| DISPOSS_HOME_EVENT | dispossHomeEvent | tools/index.js:59860 | tools/index.js:58215 | tools/index.js:57979 | fid (可选), idx |

## EXPEDITE_CROP
### 载荷
- 键清单：`sIdx`, `num`
- 行号：tools/index.js:58144-58147
- 原文：
```js
v.NetMgr.http.sendRequest(s.HttpConst.EXPEDITE_CROP, {
sIdx: t,
num: 1
});
```
### 回包读点
- `eRet` | tools/index.js:57826 | `if (1 == o.eRet) {` | 无
- `crop` | tools/index.js:57832 | `o.crop.hasOwnProperty("m") && (i.m = o.crop.m);` | 有（外层 1 == o.eRet，但读 crop 前无 o.crop 守卫）
- `crop.m` | tools/index.js:57832 | `o.crop.hasOwnProperty("m") && (i.m = o.crop.m);` | 有（hasOwnProperty）
- `crop.b` | tools/index.js:57833 | `o.crop.hasOwnProperty("b") && (i.b = o.crop.b);` | 有（hasOwnProperty）
- `sIdx` | tools/index.js:57834 | `e.soilArr[o.sIdx] = i;` | 无
### eRet 非1分支
- tools/index.js:57845: `} else 2 == o.eRet ? a.default.show(n.getText(1455)) : 3 == o.eRet ? a.default.show(n.getText(1455)) : -1 == o.eRet ? a.default.show(n.getText(3320)) : 6 == o.eRet && a.default.show(n.getText(3248));`
### 未找到项
- scripts2.js 中检索 `EXPEDITE_CROP|expediteCrop`：0 命中
- scripts3.js 中检索 `EXPEDITE_CROP|expediteCrop`：0 命中

## CLEAN_DEAD_CROP
### 载荷
- 键清单：`sIdx`
- 行号：tools/index.js:58139-58141
- 原文：
```js
v.NetMgr.http.sendRequest(s.HttpConst.CLEAN_DEAD_CROP, {
sIdx: t
});
```
### 回包读点
- `eRet` | tools/index.js:57812 | `if (1 == o.eRet) {` | 无
- `sIdx` | tools/index.js:57813 | `e.soilArr[o.sIdx] = {` | 无
### eRet 非1分支
- 回调无 else 分支
### 未找到项
- scripts2.js 中检索 `CLEAN_DEAD_CROP|cleanDeadCrop`：0 命中
- scripts3.js 中检索 `CLEAN_DEAD_CROP|cleanDeadCrop`：0 命中

## DISPOSS_HOME_EVENT
### 载荷
- 键清单：`fid`（当 `curFriendId > 0` 时存在，否则 `delete e.fid`）、`idx`
- 行号：tools/index.js:58210-58215
- 原文：
```js
var e = {
fid: 0,
idx: t
};
this.curFriendId > 0 ? e.fid = this.curFriendId : delete e.fid;
v.NetMgr.http.sendRequest(s.HttpConst.DISPOSS_HOME_EVENT, e);
```
### 回包读点
- `crop` | tools/index.js:57980 | `if (o.hasOwnProperty("crop")) {` | 有（hasOwnProperty）
- `crop.m` | tools/index.js:57986 | `o.crop.hasOwnProperty("m") && (i.m = o.crop.m);` | 有（hasOwnProperty）
- `crop.b` | tools/index.js:57987 | `o.crop.hasOwnProperty("b") && (i.b = o.crop.b);` | 有（hasOwnProperty）
- `idx` | tools/index.js:57988 | `e.soilArr[o.idx] = i;` | 无
- `exp` | tools/index.js:58000 | `o.hasOwnProperty("exp") && o.exp > 0 && (e.plantSeedData.plantExp = o.exp);` | 有（hasOwnProperty）
- `aExp` | tools/index.js:58001 | `o.hasOwnProperty("aExp") && (l[7] = o.aExp);` | 有（hasOwnProperty）
- `rewardArray` | tools/index.js:58002 | `if (o.hasOwnProperty("rewardArray")) for (var p in o.rewardArray) l[p] = o.rewardArray[p];` | 有（hasOwnProperty）
- `flag` | tools/index.js:58003 | `I.MadUtilsTS.isNullObj(l) ? 0 == o.flag && a.default.show(n.getText(3268)) : m.default.addShowRewardUI1(l, 0);` | 无
- `eRet` | tools/index.js:58005 | `2 == o.eRet ? a.default.show(n.getText(3268)) : 3 == o.eRet ? a.default.show(n.getText(3317)) : -1 == o.eRet && a.default.show(n.getText(3320));` | 无
### eRet 非1分支
- tools/index.js:58005: `2 == o.eRet ? a.default.show(n.getText(3268)) : 3 == o.eRet ? a.default.show(n.getText(3317)) : -1 == o.eRet && a.default.show(n.getText(3320));`
### 未找到项
- scripts2.js 中检索 `DISPOSS_HOME_EVENT|dispossHomeEvent`：0 命中
- scripts3.js 中检索 `DISPOSS_HOME_EVENT|dispossHomeEvent`：0 命中

未验证段：无
范围外产出：无
