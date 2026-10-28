# scoutP3-crop-onekey

| 键 | 线上名 | 定义行 | 发送点行 | 回调行 | 请求载荷键 |
|---|---|---|---|---|---|
| ONE_KEY_OBTAIN_CROP | onKeyObtainCrop | tools/index.js:60409 | tools/index.js:58178 | tools/index.js:57726 | matureArr |
| ONE_KEY_DISPOSS_HOME_EVENT | onKeyDispossHomeEvent | tools/index.js:60410 | tools/index.js:58181 | tools/index.js:57758 | 无 (空对象 `{}`) |
| BATCH_SEED_CROP | batchSeedCrop | tools/index.js:59848 | tools/index.js:58111, 58121 | tools/index.js:57654 | seedCrops |

### ONE_KEY_OBTAIN_CROP
- 载荷：键 `matureArr` | tools/index.js:58175-58178 | 原文：`var e = {\n matureArr: t\n };\n v.NetMgr.http.sendRequest(s.HttpConst.ONE_KEY_OBTAIN_CROP, e);`
- 回包读点：
  - `eRet` | tools/index.js:57727 | `if (1 == i.eRet) {` | 无
  - `matureArr` | tools/index.js:57728 | `i.hasOwnProperty("matureArr") && Promise.resolve().then(function() {` | 有 (`hasOwnProperty`)
  - `matureArr` | tools/index.js:57731 | `t.DelegateModel.matureArr = i.matureArr;` | 有 (受上行守卫保护)
  - `obtainLands` | tools/index.js:57735 | `if (i.obtainLands.length <= 0) {` | 无
  - `obtainLands` | tools/index.js:57739 | `for (var l = 0; l < i.obtainLands.length; l++) {` | 无
  - `obtainLands` | tools/index.js:57740 | `e.soilArr[i.obtainLands[l]] = {` | 无
  - `obtainLands` | tools/index.js:57747 | `p.landId = i.obtainLands[l];` | 无
  - `exp` | tools/index.js:57752 | `i.hasOwnProperty("exp") && (e.plantSeedData.plantExp = i.exp);` | 有 (`hasOwnProperty`)
  - `aExp` | tools/index.js:57753 | `i.hasOwnProperty("aExp") && i.aExp > 0 && (h[7] = i.aExp);` | 有 (`hasOwnProperty`)
  - `rewardArray` | tools/index.js:57754 | `if (i.hasOwnProperty("rewardArray")) for (var u in i.rewardArray) h[u] = i.rewardArray[u];` | 有 (`hasOwnProperty`)
- eRet 非1分支：tools/index.js:57756 原文：`} else 2 == i.eRet ? a.default.show(n.getText(6000449)) : i.eRet;`
- 未找到项：
  - scripts3.js 中检索 `onKeyObtainCrop`：0 命中 (grep `onKeyObtainCrop` 结果 0)
  - scripts2.js 中检索 `onKeyObtainCrop`：0 命中 (grep `onKeyObtainCrop` 结果 0)

### ONE_KEY_DISPOSS_HOME_EVENT
- 载荷：无键（空对象 `{}`）| tools/index.js:58181 | 原文：`v.NetMgr.http.sendRequest(s.HttpConst.ONE_KEY_DISPOSS_HOME_EVENT, {});`
- 回包读点：
  - `eRet` | tools/index.js:57759 | `if (1 == o.eRet) {` | 无
  - `cropMap` | tools/index.js:57760 | `var i = !1, s = [], l = o.cropMap;` | 无
  - `exp` | tools/index.js:57796 | `o.hasOwnProperty("exp") && o.exp > 0 && (e.plantSeedData.plantExp = o.exp);` | 有 (`hasOwnProperty`)
  - `aExp` | tools/index.js:57797 | `o.hasOwnProperty("aExp") && o.aExp > 0 && (f[7] = o.aExp);` | 有 (`hasOwnProperty`)
  - `rewardArray` | tools/index.js:57798 | `if (o.hasOwnProperty("rewardArray")) for (var d in o.rewardArray) f[d] = o.rewardArray[d];` | 有 (`hasOwnProperty`)
  - `flag` | tools/index.js:57799 | `I.MadUtilsTS.isNullObj(f) ? 0 != o.flag || i ? i && a.default.show(n.getText(3171)) : a.default.show(n.getText(3268)) : m.default.addShowRewardUI1(f, 0);` | 无
- eRet 非1分支：回调无 else 分支
- 未找到项：
  - scripts3.js 中检索 `onKeyDispossHomeEvent`：0 命中 (grep `onKeyDispossHomeEvent` 结果 0)
  - scripts2.js 中检索 `onKeyDispossHomeEvent`：0 命中 (grep `onKeyDispossHomeEvent` 结果 0)

### BATCH_SEED_CROP
- 载荷：键 `seedCrops` | tools/index.js:58111-58113 及 58121-58123 | 原文点1：`v.NetMgr.http.sendRequest(s.HttpConst.BATCH_SEED_CROP, {\n seedCrops: o\n });`；原文点2：`v.NetMgr.http.sendRequest(s.HttpConst.BATCH_SEED_CROP, {\n seedCrops: o\n });`
- 回包读点：
  - `eRet` | tools/index.js:57655 | `if (1 == o.eRet) {` | 无
  - `crops` | tools/index.js:57657 | `for (var n in o.crops) {` | 无
  - `crops` | tools/index.js:57658 | `var a = parseInt(n), s = o.crops[n], l = {` | 无
  - `recentSeeds` | tools/index.js:57672 | `e.recentSs = o.recentSeeds;` | 无
- eRet 非1分支：回调无 else 分支
- 未找到项：
  - scripts3.js 中检索 `batchSeedCrop`：0 命中 (grep `batchSeedCrop` 结果 0)
  - scripts2.js 中检索 `batchSeedCrop`：0 命中 (grep `batchSeedCrop` 结果 0)

未验证段：无
范围外产出：无
