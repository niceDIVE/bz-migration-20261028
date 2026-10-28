# 契约取证报告：OBTAINCROP / STEAL_CROP_EVENT / CROP_CHANGE_STATE

| 键 | 线上名 | 定义行 | 发送点行 | 回调行 | 请求载荷键 |
|---|---|---|---|---|---|
| OBTAINCROP | obtainCrop | tools/index.js:59847 | tools/index.js:58159 | tools/index.js:57698 | sIdx |
| STEAL_CROP_EVENT | stealCrop | tools/index.js:59861 | tools/index.js:58218 | tools/index.js:58007 | fid, idx |
| CROP_CHANGE_STATE | changeSate | tools/index.js:59849 | tools/index.js:58126, 58129 | tools/index.js:57676 | sIdx, fid (分支1) / sIdx (分支2) |

## OBTAINCROP
- 载荷：sIdx | tools/index.js:58159 | v.NetMgr.http.sendRequest(s.HttpConst.OBTAINCROP, { sIdx: t });
- 回包读点：
  - eRet | tools/index.js:57699 | if (1 == o.eRet) { | 无
  - sIdx | tools/index.js:57700 | e.soilArr[o.sIdx] = { s: 1 }; | 无
  - exp | tools/index.js:57710 | o.hasOwnProperty("exp") && (e.plantSeedData.plantExp = o.exp); | 有（hasOwnProperty）
  - aExp | tools/index.js:57711 | o.hasOwnProperty("aExp") && (n[7] = o.aExp); | 有（hasOwnProperty）
  - rewardArray | tools/index.js:57712 | if (o.hasOwnProperty("rewardArray")) for (var a in o.rewardArray) n[a] = o.rewardArray[a]; | 有（hasOwnProperty）
- eRet 非1分支：
  - tools/index.js:57714 | } else if (3 == o.eRet) { e.soilArr[o.sIdx].m.s = 0; var s = { s: 0, landId: 0, m: {} }; s.landId = o.sIdx; s.m.s = 0; r.MessageCenter.dispatch(c.EvName.SEED_CROP_EVENT, s); }
- 未找到项：
  - scripts3.js 中检索 obtainCrop：0 命中 (pattern: `obtainCrop`)
  - scripts2.js 中检索 obtainCrop：0 命中 (pattern: `obtainCrop`)

## STEAL_CROP_EVENT
- 载荷：fid, idx | tools/index.js:58218 | v.NetMgr.http.sendRequest(s.HttpConst.STEAL_CROP_EVENT, { fid: this.curFriendId, idx: t });
- 回包读点：
  - eRet | tools/index.js:58008 | if (1 == o.eRet || 3 == o.eRet || 4 == o.eRet) { | 无
  - crop.m | tools/index.js:58014 | o.crop.hasOwnProperty("m") && (s.m = o.crop.m); | 有（crop.hasOwnProperty）
  - crop.b | tools/index.js:58015 | o.crop.hasOwnProperty("b") ? s.b = o.crop.b : delete s.b; | 有（crop.hasOwnProperty）
  - idx | tools/index.js:58016 | e.soilArr[o.idx] = s; | 无
  - exp | tools/index.js:58027 | o.hasOwnProperty("exp") && (e.plantSeedData.plantExp = o.exp); | 有（hasOwnProperty）
  - aExp | tools/index.js:58028 | o.hasOwnProperty("aExp") && (p[7] = o.aExp); | 有（hasOwnProperty）
  - rewardArray | tools/index.js:58029 | if (o.hasOwnProperty("rewardArray")) for (var h in o.rewardArray) p[h] = o.rewardArray[h]; | 有（hasOwnProperty）
- eRet 非1分支：
  - tools/index.js:58031 | } else if (2 == o.eRet) { e.soilArr[o.idx] = { s: 1 }; var u = { s: 1, landId: 0 }; u.landId = o.idx; r.MessageCenter.dispatch(c.EvName.SEED_CROP_EVENT, u); a.default.show(n.getText(3317));
  - tools/index.js:58042 | } else if (5 == o.eRet) { var f = i.getItem(7, "home_plant_details").num; a.default.show(n.getText(3176).replace(/\[1\]/, f));
  - tools/index.js:58045 | } else -1 == o.eRet && a.default.show(n.getText(3320));
- 未找到项：
  - scripts3.js 中检索 stealCrop：0 命中 (pattern: `stealCrop`)
  - scripts2.js 中检索 stealCrop：0 命中 (pattern: `stealCrop`)

## CROP_CHANGE_STATE
- 载荷：sIdx, fid (curFriendId > 0) / sIdx (else) | tools/index.js:58126, 58129 | this.curFriendId > 0 ? v.NetMgr.http.sendRequest(s.HttpConst.CROP_CHANGE_STATE, { sIdx: t, fid: this.curFriendId }, null, !1) : v.NetMgr.http.sendRequest(s.HttpConst.CROP_CHANGE_STATE, { sIdx: t }, null, !1);
- 回包读点：
  - eRet | tools/index.js:57677 | if (1 == o.eRet || 3 == o.eRet) { | 无
  - crop.m | tools/index.js:57683 | o.crop.hasOwnProperty("m") && (i.m = o.crop.m); | 有（crop.hasOwnProperty）
  - crop.b | tools/index.js:57684 | o.crop.hasOwnProperty("b") && (i.b = o.crop.b); | 有（crop.hasOwnProperty）
  - sIdx | tools/index.js:57685 | e.soilArr[o.sIdx] = i; | 无
- eRet 非1分支：
  - tools/index.js:57696 | } else -1 == o.eRet && a.default.show(n.getText(3320));
- 未找到项：
  - scripts3.js 中检索 changeSate：0 命中 (pattern: `changeSate`)
  - scripts2.js 中检索 changeSate：0 命中 (pattern: `changeSate`)

未验证段：无
范围外产出：无
