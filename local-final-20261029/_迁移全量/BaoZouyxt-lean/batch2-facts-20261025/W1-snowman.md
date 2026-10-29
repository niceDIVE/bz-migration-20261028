# W1-snowman fact table

| action | wireName | sendSite | reqKeys | recvSite | recvFields | eRet | tables | currency | notes |
|---|---|---|---|---|---|---|---|---|---|
| USE_SNOW_BALL | User.UseSnowBall | F:\BaoZouyxt\tools\index.js:122569 | roleID,type | F:\BaoZouyxt\tools\index.js:122505 | eRet,hp | eRet==1: setSnowManHp(o.hp), dispatch SNOW_REWRAD_EVENT; else: activeState=2, Alert show text 1093 | NONE | NONE | Called inside SnowManModel.reqAddSnowHp(t) at index.js:122564 |
| USE_BATCH_SNOW_BALL | User.UseBatchSnowBall | F:\BaoZouyxt\tools\index.js:122577 | roleID,type,batchType | F:\BaoZouyxt\tools\index.js:122514 | eRet,hp | eRet==1: setSnowManHp(o.hp), dispatch SNOW_REWRAD_EVENT; eRet==4: Alert show text 6126, dispatch REFRESH_ACTIVE_UI; else: activeState=2, Alert show text 1093, dispatch REFRESH_ACTIVE_UI. Always setBeastState(o.eRet) and dispatch REFRESH_BEAST_STATE | NONE | NONE | Called inside SnowManModel.reqAddBatchSnowHp(t, e) at index.js:122571 |
| USE_ALL_BALL | User.UseAllBall | F:\BaoZouyxt\tools\index.js:122627 | NONE | F:\BaoZouyxt\tools\index.js:122543 | eRet,hp,rewardArray | eRet==1: setFirecrackerHP(o.hp), if not null rewardArray call addShowRewardUI1(o.rewardArray, 0, {}), dispatch REFRESH_FIRECRACK_EVENT; else: Alert show text 1093 | NONE | NONE | Called inside SnowManModel.reqThrowFirecracker() at index.js:122626; invoked by StackFirecrackerUI.onStackCallBack at scripts3.js:86438 |
| GET_SNOW_REWARD | User.getSnowAward | F:\BaoZouyxt\tools\index.js:122584 | roleID | F:\BaoZouyxt\tools\index.js:122529 | eRet,rewardArray | eRet==1: iterate rewardArray items, addShowRewardUI1(o.rewardArray, 0, {}); eRet==4: Alert text 1098; eRet==3: Alert text 6148; eRet==0: Alert text 1093; eRet==2: Alert text 6177. If activeType==2: setBeastState(3==eRet?1:0) and dispatch REFRESH_BEAST_STATE. Always dispatch REMOVE_SNOWBOX_EVENT | NONE | NONE | Called inside SnowManModel.reqSnowReward(t) at index.js:122579; invoked by SnowTreasureBox.reaction at scripts3.js:31550. Also sent without args at index.js:122497 |
| SNOWACTIVE | User.enterSnow | F:\BaoZouyxt\tools\index.js:122561 | roleID | F:\BaoZouyxt\tools\index.js:122462 | eRet,hp,boxnum,sTime | eRet==0: activeType==0 ? Alert text 4061 : Alert text 1093; eRet==2: activeType==2 ? openSocketNet, setBeastState(2), setSnowManHp(hp), boxNum=boxnum : Alert text 1098; eRet==1: activeType==0 -> setSnowManHp(hp), dispatch REFRESH_SNOW_EVENT; activeType==1 -> setFirecrackerHP(hp), dispatch REFRESH_FIRECRACK_EVENT, popup StackFirecrackerUI or Alert text 3126; activeType==2 -> openSocketNet, setSnowManHp(hp), setBeastState(1); eRet==3: activeType==0 -> setSnowManHp(hp), boxNum=boxnum, if boxNum==0 Alert text 1094 else dispatch SNOW_BALL_PO_EVENT; activeType==1 -> setFirecrackerHP(hp), boxNum=boxnum, if boxNum==0 Alert text 1094 else send GET_SNOW_REWARD; activeType==2 -> openSocketNet, setBeastState(3), setSnowManHp(hp), boxNum=boxnum | NONE | NONE | Called inside SnowManModel.reqSnowActive(t) at index.js:122554; invoked by SnowManNpc.reaction at scripts3.js:83596, Firecracker.reaction at scripts3.js:31646, index.js:87518 |

## ADDITIONAL TASKS
- Task A (Remaining Snowball Count):
  Field: RoleBaseInfo.getItemNum(item_id) or activetime item config.
  In F:\BaoZouyxt\tools\scripts3.js:55401-55403, judgeSnowBallNum reads:
  RoleBaseInfo.getItemNum(parseInt(o[0])), RoleBaseInfo.getItemNum(parseInt(o[1])), RoleBaseInfo.getItemNum(parseInt(o[2])) where o is this.activeData.item loaded via CFMgr.getItem(3, "activetime").
  In F:\BaoZouyxt\tools\index.js:122633, getFirecrackerItems reads:
  RoleBaseInfo.getItemNum(e[o]) where e = CFMgr.getItem(2, "activetime").item.
  No dedicated snowball field exists on RoleBaseInfo or server response; it is read via RoleBaseInfo.getItemNum(itemId).

- Task B (HP / Blood Volume):
  Field: hp (received from server response object o.hp) and local property currentSnowHp.
  Locations:
  F:\BaoZouyxt\tools\index.js:122467: t.setSnowManHp(o.hp)
  F:\BaoZouyxt\tools\index.js:122470: t.setSnowManHp(o.hp)
  F:\BaoZouyxt\tools\index.js:122473: t.setFirecrackerHP(o.hp)
  F:\BaoZouyxt\tools\index.js:122484: t.setSnowManHp(o.hp)
  F:\BaoZouyxt\tools\index.js:122488: t.setSnowManHp(o.hp)
  F:\BaoZouyxt\tools\index.js:122495: t.setFirecrackerHP(o.hp)
  F:\BaoZouyxt\tools\index.js:122500: t.setSnowManHp(o.hp)
  F:\BaoZouyxt\tools\index.js:122507: t.setSnowManHp(o.hp)
  F:\BaoZouyxt\tools\index.js:122516: t.setSnowManHp(o.hp)
  F:\BaoZouyxt\tools\index.js:122544: t.setFirecrackerHP(o.hp)
  F:\BaoZouyxt\tools\index.js:122591: setSnowManHp = function(t) { this.currentSnowHp = t; }
  F:\BaoZouyxt\tools\index.js:122630: setFirecrackerHP = function(t) { this.firecrackerHp = t; }

- Task C (UseAllBall rewardArray Handling):
  In USE_ALL_BALL callback (F:\BaoZouyxt\tools\index.js:122543-122548):
  Does the callback require rewardArray? Yes, it checks if it is null:
  "f.MadUtilsTS.isNullObj(o.rewardArray) || s.default.addShowRewardUI1(o.rewardArray, 0, {});"
  Note: It does not iterate or index elements by u[0]/u[1] directly inside USE_ALL_BALL callback; instead it passes o.rewardArray directly to s.default.addShowRewardUI1.
  (In contrast, GET_SNOW_REWARD at index.js:122530-122535 iterates as:
  "var l = o.rewardArray; for (var c in l) { var h = i.getItem(c, "item"); n.getText(h.Name), l[c]; } s.default.addShowRewardUI1(o.rewardArray, 0, {});")

- Task D (Config Dump Inspection):
  snowman.json:
  Top-level keys: name, rows, cols, data
  Field with value matching "4001,10|4003,5": consolationprize (example from ID 1: "consolationprize":"4001,10|4003,5")
  square_ball.json:
  Top-level keys: name, rows, cols, data
  Field with value matching "4001,10|4003,5": NONE (cols: id, level, size, rewardnum, rewarditem)

## UNCONFIRMED
- None
