# 取证说明（引用约定）

- 取证范围：`F:\BaoZouyxt\tools\cfg\dump\` 共 **444** 个 json（`Get-ChildItem -File | Measure-Object` = 444；本报告只挑与 trick/lottery/random/gift/drop/color 相关者）。
- 关键事实：dump 下所有表文件都是**单行压缩 JSON**（实测 `skill_Trick.json`、`skill_Trick_Lotterymachine.json`、`lottery.json` 等 13 个文件 `lines=1`），因此**行号恒为 `:1`**，本报告用「文件名:1 + 表内键」定位，例：`skill_Trick_Lotterymachine.json:1 [id=1]`。
- dump 表的统一结构：`{"name":..,"rows":..,"cols":[列名..],"data":{行键:行对象}}`，`rows` 为声明行数（实测与 `Object.keys(data).length` 一致）。
- 客户端代码位置与实测行数：`tools\index.js` = 149447 行 / 4506239 字节；`tools\scripts2.js` = 81775 行；`tools\scripts3.js` = 100428 行；`tools\main.js` = 25273 行。**任务要求的 `optionalDatas` / `upSkillRateData` 在 `tools\index.js` 中 0 命中，全 `tools\` 目录唯一命中在 `tools\scripts3.js:90010`(upSkillRateData) 与 `tools\scripts3.js:90012`(optionalDatas)**（见 E 节）。

---

# A 表清单与列

## A.1 `skill_Trick_Lotterymachine.json`（摸奖机主表）
- 行数 **3**（`skill_Trick_Lotterymachine.json:1`，`rows=3`，data 键 `1`/`2`/`3`）。
- 列名 21 个（`skill_Trick_Lotterymachine.json:1 cols`）：`id, switch, subject, opentime, closetime, one_shot, ten_shot, free_day, trick_item, item_ten_shot, probability, trick_probability, coin_item, shop, npc, Floor_time, Floors_quality, information, name, pic, type`。
- 逐列取值事实（全部 3 行）：
  - `id` = 1/2/3（池 id，客户端按 `lotteryId` 取行，`scripts3.js:90340` `getItem(e,"skill_Trick_Lotterymachine")`）。
  - `switch` = 1/1/1。
  - `subject` = "GraspUI_bg1"（3 行同值，`scripts3.js:90341` 用 `i.pic` 拼图而非 `subject`）。
  - `opentime` = 1563811200000 / 1790697600000 / 1790697600000；`closetime` = 4092566400000 / 1792339199000 / 1792339199000（13 位毫秒时间戳量级）。
  - `one_shot` = `[9191,1]`（3 行同值）；`ten_shot` = `[9191,10]`（3 行同值）→ 形状 `[物品id, 数量]`。
  - `free_day` = 1（3 行同值）。
  - `trick_item` = 9191（3 行同值）；`item_ten_shot` = 10（3 行同值）。
  - `probability` = `"1,640|2,200|3,100|4,40|5,20"`（3 行同值）→ 5 组「序号,权重」，权重和 1000。
  - `trick_probability` = 1（3 行同值）。
  - `coin_item` = `[]`（3 行全空）。
  - `shop` = 1；`npc` = 1002（3 行同值）。
  - `Floor_time` = 10；`Floors_quality` = 3（3 行同值）。
  - `information` = 6000499；`name` = 6013124 / 6013125 / 6013125；`pic` = "B_ell" / "B_ell_2" / "B_ell_3"。
  - `type` = 1 / 2 / 3（`scripts3.js:90366` 用 `type>1` 判定限时池；`scripts3.js:90410`/`90537` 用 `type==3` 判定可选技能池）。
- 三行原始片段（`skill_Trick_Lotterymachine.json:1`，压缩原文）：
```
"1":{"id":1,"switch":1,"subject":"GraspUI_bg1","opentime":1563811200000,"closetime":4092566400000,"one_shot":[9191,1],"ten_shot":[9191,10],"free_day":1,"trick_item":9191,"item_ten_shot":10,"probability":"1,640|2,200|3,100|4,40|5,20","trick_probability":1,"coin_item":[],"shop":1,"npc":1002,"Floor_time":10,"Floors_quality":3,"information":6000499,"name":6013124,"pic":"B_ell","type":1}
"2":{"id":2,"switch":1,"subject":"GraspUI_bg1","opentime":1790697600000,"closetime":1792339199000,"one_shot":[9191,1],"ten_shot":[9191,10],"free_day":1,"trick_item":9191,"item_ten_shot":10,"probability":"1,640|2,200|3,100|4,40|5,20","trick_probability":1,"coin_item":[],"shop":1,"npc":1002,"Floor_time":10,"Floors_quality":3,"information":6000499,"name":6013125,"pic":"B_ell_2","type":2}
"3":{"id":3,"switch":1,"subject":"GraspUI_bg1","opentime":1790697600000,"closetime":1792339199000,"one_shot":[9191,1],"ten_shot":[9191,10],"free_day":1,"trick_item":9191,"item_ten_shot":10,"probability":"1,640|2,200|3,100|4,40|5,20","trick_probability":1,"coin_item":[],"shop":1,"npc":1002,"Floor_time":10,"Floors_quality":3,"information":6000499,"name":6013125,"pic":"B_ell_3","type":3}
```

## A.2 `skill_Trick.json`（trick/秘籍条目表，638 KB，2511 行）
- 行数 **2511**（`skill_Trick.json:1`，`rows=2511`，data 键 = ID，范围 `10001`~`12526`）。
- 列名 14 个（`skill_Trick.json:1 cols`）：`ID, nameID, Trick_quality, Trick_use_quality, Trick_skill_id, Trick_skill_des, Trick_des_group, Trick_use_skill, item_quantity, type, skill, parameterN, parameterM, add`。
- 逐列取值事实（全表统计，`skill_Trick.json:1`）：
  - `Trick_quality` 分布：0=896、1=313、2=315、3=319、4=325、5=343（客户端用它取颜色，`scripts3.js:91128` `getItem(t.Trick_quality,"trick_color").color`）。
  - `Trick_use_quality` 分布：0=1332、1=259、2=460、3=460；客户端以 `Trick_use_quality <= 技能品质` 判定可装备（`scripts3.js:73715`、`73729`）。
  - `Trick_des_group`：231 个不同值 = `0`(1361 行) + `100001`~`100230`(每值 5 行)；与 `trick_group.group` 同 id 空间（见 A.4）。
  - `Trick_use_skill`：`[]` 1361 行，其余为单元素数组（如 `[1000]`、`[1003]`，各 25 行）→ 关联的技能 id。
  - `item_quantity`：0=1361 行，其余为 5/10/20/25/50/100/125/200/250/500/1000（同组内品质越高数值越大，例：组 100001 为 `5,25,50,125,250`）。
  - `type`：多值，最多为 3=426、0=343、4=271、9=222、7=159、77=81、53=78、73=71、33=70、5=58、75=58、40=52、34=33、68=31（同组内 5 行 type 相同，例组 100002 全为 31、组 100005 全为 30）。
  - `skill`：`[]` 286 行，其余单元素数组（`[1325]`=41 行、`[1492]`=41 行…）。
  - `parameterN` / `parameterM`：`[]` 575 / 684 行；`parameterM` 出现 `[10,0]`、`[-1,0]`、`[20,0]` 等双元素形态；客户端把它们当属性增减数组（`scripts3.js:73753-73754` `e.push(-n.parameterN[r])` / `e.push(n.parameterM[r])`，另见 `index.js:2751` `this.get("parameterN")`、`index.js:23247-23248`）。
  - `add`：`[]` 1915 行，其余为技能/spell id 数组（如 `[10644]`、`[12506,12507,12508]`）；客户端 `index.js:127526-127535` 读 `getItem(t,"skill_Trick").add` 并逐个 `createSpell(i[a])` 追加。
  - `Trick_skill_id`：客户端当作被动技能 id 挂载（`index.js:126074` `attachPassiveSkill(this.cfg.Trick_skill_id, ...)`）。
  - `nameID` / `Trick_skill_des`：语言 id（`9246`/`9715` 等），**dump 内无 id→文本表**（见「未能验证」）。
- 四条原始片段（`skill_Trick.json:1`）：
```
"10001":{"ID":10001,"nameID":9246,"Trick_quality":1,"Trick_use_quality":1,"Trick_skill_id":1803,"Trick_skill_des":9715,"Trick_des_group":100001,"Trick_use_skill":[1000],"item_quantity":5,"type":0,"skill":[],"parameterN":[],"parameterM":[],"add":[]}
"10006":{"ID":10006,"nameID":9251,"Trick_quality":1,"Trick_use_quality":2,"Trick_skill_id":0,"Trick_skill_des":9720,"Trick_des_group":100002,"Trick_use_skill":[1000],"item_quantity":10,"type":31,"skill":[1035],"parameterN":[10],"parameterM":[],"add":[]}
"10021":{"ID":10021,"nameID":9266,"Trick_quality":1,"Trick_use_quality":3,"Trick_skill_id":0,"Trick_skill_des":9735,"Trick_des_group":100005,"Trick_use_skill":[1000],"item_quantity":20,"type":30,"skill":[1038],"parameterN":[103601],"parameterM":[],"add":[10026]}
"10016":{"ID":10016,"nameID":9261,"Trick_quality":1,"Trick_use_quality":2,"Trick_skill_id":1883,"Trick_skill_des":9730,"Trick_des_group":100004,"Trick_use_skill":[1000],"item_quantity":10,"type":3,"skill":[1000],"parameterN":[9],"parameterM":[20,0],"add":[]}
```

## A.3 `skill_Trick_Drop.json`（trick 抽取权重表）
- 行数 **230**（`skill_Trick_Drop.json:1`，`rows=230`，data 键 `1`~`230`）。
- 列名 5 个（`skill_Trick_Drop.json:1 cols`）：`id, groupID, drop_group, drop_probability, skillid`。
- 逐列取值事实：
  - `groupID` = **全部 1**（230 行同值）→ 表内无「哪个摸奖池」的区分列。
  - `skillid` 共 **46** 个不同值（1000,1003,1005,1008,1010,1011,1083,1085,1088,1091,1095,1096,1097,1100,1102,1103,1104,1105,1107,1230,1232,1233,1236,1239,1262,1265,1267,1268,1269,1270,1322,1325,1341,1402,1409,1423,1424,1482,1489,1492,1618,1902,1913…），每技能 5 行。
  - `drop_group` = **100001~100230 连续 230 个**，与 `trick_group.group` 一一对应。
  - `drop_probability`：每技能 5 行之和恒为 **1000**（例 skill 1000 → 400/200/100/200/100；skill 1003 → 400/100/200/200/100；skill 1010 → 400/200/200/100/100）。
  - `id` 与行序一致（1..230）。
- 三行原始片段（`skill_Trick_Drop.json:1`）：
```
"1":{"id":1,"groupID":1,"drop_group":100001,"drop_probability":400,"skillid":1000}
"2":{"id":2,"groupID":1,"drop_group":100002,"drop_probability":200,"skillid":1000}
"3":{"id":3,"groupID":1,"drop_group":100003,"drop_probability":100,"skillid":1000}
```

## A.4 `trick_group.json`
- 行数 **230**（`trick_group.json:1`，`rows=230`，data 键 = `100001`~`100230`）。
- 列名 2 个：`group, icon`；`icon` 仅 3 个值：`Trick_Bamboo`(75)、`Trick_Reel`(70)、`Trick_Slate`(85)。
- 样例：`"100001":{"group":100001,"icon":"Trick_Bamboo"}` / `"100002":{"group":100002,"icon":"Trick_Bamboo"}` / `"100003":{"group":100003,"icon":"Trick_Bamboo"}`（`trick_group.json:1`）。
- 客户端用途：`getItem(Trick_des_group,"trick_group").icon`（`scripts3.js:2719`、`3458`、`4946`、`19379`）。

## A.5 `skill_trick_color.json` 与 `trick_color.json`（同构、内容不同）
- `skill_trick_color.json:1`：`rows=6`，cols = `quality, color`；`trick_color.json:1`：`rows=6`，cols = `quality, color`。
- 全量原文：`trick_color` = `{0:000000, 1:009f47, 2:3c78b8, 3:b8258d, 4:f76b00, 5:d81720}`；`skill_trick_color` = `{0:000000, 1:009f47, 2:3c78b8, 3:f76b00, 4:b51688, 5:d81720}` → **quality 3/4 两行颜色互换**（其余相同）。
- 客户端读 `skill_trick_color` 1 处（`index.js:103791` `getItem(o.Trick_quality,"skill_trick_color")`）、读 `trick_color` 4 处（`scripts3.js:81253`、`scripts3.js:89556`、`scripts3.js:91128`、`scripts3.js:91194`）。

## A.6 `lottery.json`
- 行数 **26**（`lottery.json:1`，`rows=26`，data 键 `1`~`26`）。cols = `id, type, weight, award`。
- `type`：0（id 1~23）、1（id 24~26）；`weight`：10（type=0 全部）、5（type=1 全部）；`award` 全为 `[物品id, 数量]` 双元素。
- 三行原始片段（`lottery.json:1`）：
```
"1":{"id":1,"type":0,"weight":10,"award":[7390,1]}
"2":{"id":2,"type":0,"weight":10,"award":[4806,1]}
"26":{"id":26,"type":1,"weight":5,"award":[9191,1]}
```

## A.7 `goldlottery.json`
- 行数 **3**（`goldlottery.json:1`，`rows=3`）。cols = `id, cost, reward, probability, time, special`。
- 全量原文：
```
"1":{"id":1,"cost":0,"reward":10,"probability":"5,35|6,30|7,14|8,11|9,10","time":[1,1],"special":[]}
"2":{"id":2,"cost":60,"reward":30,"probability":"5,35|6,30|7,14|8,11|9,10","time":[2,1],"special":[2,5,7]}
"3":{"id":3,"cost":300,"reward":150,"probability":"5,35|6,30|7,14|8,11|9,10","time":[2,1],"special":[2,5,7]}
```

## A.8 `training_lottery.json`
- 行数 **5**（`training_lottery.json:1`，`rows=5`）。cols = `id, time, consume, frame`。
- 全量原文：
```
"1":{"id":1,"time":1,"consume":"10862,1","frame":"1"}
"2":{"id":2,"time":2,"consume":"10862,1","frame":"1"}
"3":{"id":3,"time":3,"consume":"10862,1","frame":"2"}
"4":{"id":4,"time":4,"consume":"10862,1","frame":"2"}
"5":{"id":5,"time":5,"consume":"10862,1","frame":"2"}
```
- `training_lottery` 在 `index.js` / `scripts2.js` / `scripts3.js` 中 grep **0 命中**（无任何客户端读取点）。

## A.9 `skill_random.json`
- 行数 **8**（`skill_random.json:1`，`rows=8`）。cols = `Menpai, Skill1, Weapon1, BigSkill1, Skill2, Weapon2, BigSkill2, Skill3, Weapon3, BigSkill3, Common`。
- 样例：`"1":{"Menpai":1,"Skill1":1003,"Weapon1":0,"BigSkill1":[1042,1045],"Skill2":1004,"Weapon2":1014,"BigSkill2":[1043,1045],"Skill3":0,"Weapon3":0,"BigSkill3":[],"Common":[1,1027,1019]}`（`skill_random.json:1`）。
- 客户端用途：按门派随机取一套技能（`index.js:73980-73982`、`74089-74091`、`74270-74272`：`getItem(m,"skill_random")` 后判 `Skill3==0`）。

## A.10 `skill_radom.json`（拼写为 radom）
- 行数 **7**（`skill_radom.json:1`，`rows=7`，data 键 `0`~`6`）。cols = `ID, Name`；`Name` 是**字符串数组**（技能 id 的字符串形式）。
- 样例（`skill_radom.json:1`，摘录首尾）：`"0":{"ID":0,"Name":["1019","1020","1021","1022","1023","1024","1025","1026","1027","1028","1029","1030","1031","1032","1033","1034","1090","1108","1109","1111","1112","1113","1114","1116","1118","1119","1120","1122","1124","1125","1175","1019","1027","1028","1029","1030","1916","1917","1907","1908","1110","1117","2478","2418","2938"]}`（45 元素，含重复值如 `1019`）；`"1":{"ID":1,"Name":["1001","1004","1014","1095","1096","1097","1098","1099","1231","1232","1265","1341","1409","1482","1001"]}`（15 元素）。
- 客户端用途：`getItem(0,"skill_radom")` 与 `getItem(t.WeaponType,"skill_radom")`（`scripts3.js:61051`）。

## A.11 `optional_gift.json`
- 行数 **4**（`optional_gift.json:1`，`rows=4`，data 键 `1001`~`1004`）。cols = `id, recharge_id, recharge_ios, t_recharge_ios, award, reward1, reward2, reward3, reward4, name, en_recharge, en_recharge_ios`。
- 全量原文（4 行）：
```
"1001":{"id":1001,"recharge_id":"6_2gold","recharge_ios":"6_2gold","t_recharge_ios":"6_1package","award":[1,60],"reward1":[67433,1],"reward2":[],"reward3":[],"reward4":[],"name":4478,"en_recharge":"6_1package_en","en_recharge_ios":"6_1package_en"}
"1002":{"id":1002,"recharge_id":"25_1gold","recharge_ios":"25_1gold","t_recharge_ios":"25_1package","award":[1,275],"reward1":[67434,1],"reward2":[67435,1],"reward3":[],"reward4":[],"name":4479,"en_recharge":"25_1package_en","en_recharge_ios":"25_1package_en"}
"1003":{"id":1003,"recharge_id":"68_1gold","recharge_ios":"68_1gold","t_recharge_ios":"68_1package","award":[1,816],"reward1":[67436,1],"reward2":[67437,1],"reward3":[],"reward4":[],"name":4480,"en_recharge":"68_1package_en","en_recharge_ios":"68_1package_en"}
"1004":{"id":1004,"recharge_id":"98_1gold","recharge_ios":"98_1gold","t_recharge_ios":"98_1package","award":[1,1225],"reward1":[67438,1],"reward2":[67439,1],"reward3":[],"reward4":[],"name":4481,"en_recharge":"98_1package_en","en_recharge_ios":"98_1package_en"}
```
- 客户端读取点唯一：`getTable("optional_gift")` 在充值商店的「可选礼包」列表中（`scripts2.js:47958` `var e = r.getTable("optional_gift");`，同函数 `scripts2.js:47967` 用 `t.giftObj[o].s` 过滤），**与摸奖 UI 无调用关系**（摸奖 UI 的读取点见 F 节）。

## A.12 `yuanbao_optional_gift.json`
- 行数 **5**（`yuanbao_optional_gift.json:1`，`rows=5`，data 键 `1005`~`1009`）。cols = `id, award, reward1, reward2, reward3, reward4, name, yuanbao_price, picture`。
- 全量原文：
```
"1005":{"id":1005,"award":[1,68],"reward1":[67440,1],"reward2":[],"reward3":[],"reward4":[],"name":4478,"yuanbao_price":68,"picture":"Yuanbao68"}
"1006":{"id":1006,"award":[1,288],"reward1":[67441,1],"reward2":[67442,1],"reward3":[],"reward4":[],"name":4479,"yuanbao_price":288,"picture":"Yuanbao288"}
"1007":{"id":1007,"award":[1,688],"reward1":[67449,1],"reward2":[67444,1],"reward3":[],"reward4":[],"name":4480,"yuanbao_price":688,"picture":"Yuanbao688"}
"1008":{"id":1008,"award":[1,988],"reward1":[67445,1],"reward2":[67446,1],"reward3":[],"reward4":[],"name":4481,"yuanbao_price":988,"picture":"Yuanbao988"}
"1009":{"id":1009,"award":[1,1288],"reward1":[67447,1],"reward2":[67448,1],"reward3":[],"reward4":[],"name":6014750,"yuanbao_price":1288,"picture":"Yuanbao1288"}
```
- 客户端用途：`getItem(this.configid,"yuanbao_optional_gift")`（`scripts3.js:54406`）、`getTable("yuanbao_optional_gift")`（`scripts3.js:54812`）。

## A.13 `tbl_item.json`（物品表，位于 `tools\cfg\`，非 dump）
- 行数 **6525**（`tbl_item.json`，`rows=6525`，`idCol=1`，`tag="item"`），`head` **52** 列。
- 与价格/类型相关列名（`tbl_item.json head`）：`ID, Name, Description, Type, BuyPrice, Price, Effect, EquipType, WeaponType, Limit, quality, icon_item, box_condition`（其余为 `Condition1-5`、`Property1-5`/`Data1-5`、`BuffSet`、`equip/equip1/equiplevel`、`decomposition/remain/canwash/fightcold/cd_public/wq_place`、`combat_type/fuse/name_add/decompose/save/fightlimit/suicide/fightarray/suitname/weaponFightType/weaponFightSkin/SpecialData/DeleteDate`）。
- `Type` 分布（真实行 6525）：Type=2 → 5539 行；Type=1 → 885 行；Type=21 → 33；Type=25 → 32；Type=19 → 18；其余各 1~2 行。
- 券 id `9191` 原文（`tbl_item.json` 键 `9191`）：`{"ID":9191,"Name":2104414,"Type":2,"BuyPrice":0,"Price":100,"Effect":36,"Limit":1,"quality":0,"icon_item":"shop2104414","suicide":0,...}`。
- `BuyPrice>0` 的行共 **1101** 行（如 1001→300、1003→1200、1006→2400）。
- ⚠ `dump\item.json` 是同表**截断副本**：`rows=6525, kept=3000, truncated=true`（`item.json:1`）→ 物品核查一律用 `tools\cfg\tbl_item.json`。

---

# B 消耗

- `skill_Trick_Lotterymachine.json:1 [id=1..3] .one_shot` = `[9191,1]`、`.ten_shot` = `[9191,10]` → 单抽 1 张、十连 10 张，物品 9191；**形状 = [物品id, 数量]**。
- `skill_Trick_Lotterymachine.json:1 [id=1..3] .trick_item` = `9191`、`.item_ten_shot` = `10` → 与 `one_shot`/`ten_shot` 的元素逐位相同（9191 / 10）。
- `skill_Trick_Lotterymachine.json:1 [id=1..3] .free_day` = `1`（列名含 day/free，值恒 1；单位「每日免费次数」为**推断，表内无单位声明 → 不明**）。
- `skill_Trick_Lotterymachine.json:1 [id=1..3] .coin_item` = `[]` → 列名含 coin，但 3 行全空，**内容不明**。
- `tbl_item.json 键 9191`：`Type=2, BuyPrice=0, Price=100, Effect=36, Limit=1, quality=0` → `Price=100` 的**单位不明**（`BuyPrice=0`）。
- 客户端显示层不读表里的 `one_shot/ten_shot`，改读服务器下发的 `onePrice/tenPrice`：`scripts3.js:90404` `getTicketNum() < g.TrickLotteryModel.lotteryData.onePrice[1]`、`scripts3.js:90565` `var e = g.TrickLotteryModel.lotteryData.onePrice[1]`、`scripts3.js:90573` `lotteryData.tenPrice[1]` → 线上扣费数量由**接口返回的 `onePrice[1]`/`tenPrice[1]`** 决定，表只是同值来源之一。
- 券 id 由服务器字段给出：`scripts3.js:90193-90195` `getTicketId(){ return this.lotteryData.trick_item; }`、`scripts3.js:90383-90385` `getTicketNum(){ return RoleBaseInfo.getItemNum(TrickLotteryModel.getTicketId()); }`。
- `goldlottery.json:1 [id=1/2/3] .cost` = `0 / 60 / 300`；客户端与**元宝**比较：`scripts3.js:34248` `p.RoleBaseInfo.yuanbao < e.cost ? f.StoreModel.openChargeYuanbaoUI()` → 单位 = 元宝（此表属「金币摸奖」，非 C09）。
- `training_lottery.json:1 [id=1..5] .consume` = `"10862,1"` → 字符串「物品id,数量」；`tbl_item.json 键 10862` = `{"Type":2,"BuyPrice":0,"Price":0,"icon_item":"item10862"}`。
- `yuanbao_optional_gift.json:1 [id=1005..1009] .yuanbao_price` = `68/288/688/988/1288`，与同行 `award` 的第二个元素**逐一相等**（`award=[1,68]`、`[1,288]`…）→ `award` 指向物品 `1`；「`yuanbao_price` 是扣 68 元宝还是标价 68 元宝」**表内无声明 → 方向不明**（`picture` 值为 `Yuanbao68` 等，与价格同名）。
- `optional_gift.json:1 [id=1001..1004] .recharge_id` = `"6_2gold" / "25_1gold" / "68_1gold" / "98_1gold"`（字符串档位，形如「金额_档名」，**单位不明**），`award` = `[1,60] / [1,275] / [1,816] / [1,1225]`。
- `skill_Trick.json:1 .item_quantity` = `0`（1361 行）或 `5/25/50/125/250/500/1000` 等（列表见 A.2）→ 列名含 quantity，同组内随 `Trick_quality` 递增（组 100001：品质 1~5 = 5,25,50,125,250）。
- `skill_Trick_Drop.json:1 .drop_probability` = `100/200/400`，每 `skillid` 的 5 行和 = 1000 → 千分比形态，**单位表内未声明 → 不明**。
- `lottery.json:1 .weight` = `10`（id 1~23）/ `5`（id 24~26）；该表 UI（`scripts2.js:38660-38690`）只读 `award`/`type`/`id`，**`weight` 无客户端读取点 → 单位不明**。
- 列名扫描（444 表全量，正则 `optional|rate|price|cost|consume|need|gold|yuanbao|coin|money|num|award|reward|free|times|cd`）：摸奖相关表命中的只有 `skill_Trick_Lotterymachine.json` 的 `free_day`/`coin_item`、`goldlottery.json` 的 `cost`/`reward`、`training_lottery.json` 的 `consume`、`yuanbao_optional_gift.json` 的 `award`/`reward1-4`/`yuanbao_price`、`optional_gift.json` 的 `award`/`reward1-4`、`lottery.json` 的 `award` —— 即**摸奖主表没有 gold/yuanbao/money/price/cost 命名的列**。

---

# C 奖励

- `skill_Trick_Lotterymachine.json:1 cols` = `id,switch,subject,opentime,closetime,one_shot,ten_shot,free_day,trick_item,item_ten_shot,probability,trick_probability,coin_item,shop,npc,Floor_time,Floors_quality,information,name,pic,type` → **本表无 award/reward/drop/item 命名的产物列**（`trick_item` 是消耗用的券，见 B 节）。
- `skill_Trick_Drop.json:1 .drop_group` = `100001`~`100230`；该 id 命中的是 **`trick_group.group`**（`trick_group.json:1` 键 `100001`~`100230`）和 **`skill_Trick.Trick_des_group`**（`skill_Trick.json:1`，231 个不同值含 0）。
- `drop.json`（`tools\cfg\dump\drop.json:1`，`rows=587`，`cols=ID,Item1,probability1,Item2,probability2,Item3,probability3,Item4,probability4,Item5,probability5,DropType`，键前 10 个实测为 `0,1,2,3,4,5,6,7,1200,3001`）**不含 100001** → `drop_group` **不是** drop 表的分组引用。
- `skill_Trick_Drop.json:1` 与 `skill_Trick.json:1` 的连接方式（数据面）：同一 `drop_group` 在 `skill_Trick` 里恰好 5 行、`Trick_quality` = 1~5，例：group `100001` → ID `10001..10005`，`item_quantity` = `5,25,50,125,250`，`type` 全 0。
- `skill_Trick.json:1` 的产物标识是 `ID`（10001~12526），客户端按此 id 取行：`scripts3.js:90107` `getTable("skill_Trick")`、`index.js:103791` `getItem(t[e],"skill_Trick")`。
- `lottery.json:1 .award`：`[7390,1]`、`[4806,1]`、`[4776,1]` … `[6658,40]`、`[1,200]`、`[9901,5]`、`[9191,1]`；客户端把它拆成物品 id 与数量：`scripts2.js:38671-38673` `r.itemId = n[i].award[0]; r.type = n[i].type; r.num = n[i].award[1];`，并用物品表取图：`scripts2.js:38680-38683` `a.getItem(r.itemId,"item")` → `"shop"+c.Name`。
- `tbl_item.json 键 7390` = `{"Name":2102613,"Type":2,"BuyPrice":0,"Price":0,"quality":3,"icon_item":"shop2102613"}`；键 `4806` = `{"Name":2100029,"Type":2,"Price":100,"quality":0}`；键 `4776` = `{"Name":33776,"Type":2,"Price":0,"quality":0,"Limit":0,"remain":0}`。
- `lottery.json:1 [id=26]` = `{"id":26,"type":1,"weight":5,"award":[9191,1]}` → 该表里出现的 **9191 与摸奖券同一个物品 id**（`tbl_item.json 键 9191` Type=2）。
- `goldlottery.json:1 .reward` = `10 / 30 / 150`，客户端直接当数量展示：`scripts3.js:34206` `this.rNumLabel.string = h.reward + "";`；同表 `probability` = `"5,35|6,30|7,14|8,11|9,10"`（5 组「键,权重」，键为 5~9、权重和 100；**客户端 0 读取点，键的含义/单位不明**），实际抽取比例由服务器回包 `e.ratio` 给出（`scripts3.js:34298-34301` `showAnim(e.ratio,...)` … `getText(6018294).replace(/\[1\]/, e.ratio)`）。
- `optional_gift.json:1 .award` = `[1,60]/[1,275]/[1,816]/[1,1225]`、`.reward1..4` = `[67433,1]`、`[67434,1]+[67435,1]`、`[67436,1]+[67437,1]`、`[67438,1]+[67439,1]`（后两格 `[]`）。
- `yuanbao_optional_gift.json:1 .reward1..4` = `[67440,1]`；`[67441,1]+[67442,1]`；`[67449,1]+[67444,1]`；`[67445,1]+[67446,1]`；`[67447,1]+[67448,1]`。
- 物品 `1` 的性质：`tbl_item.json 键 1` = `{"Name":506,"Type":6,"BuyPrice":0,"Price":0,"icon_item":"precious1"}`，全表仅此 1 行 `Type=6`；它与 `yuanbao_price` 数值逐一相等（A.12），且被 `lottery.json [id=22/23]` 当奖品（`[1,200]`/`[1,100]`）。
- `67433`、`67434`、`67440`、`67441`、`67444`、`67449` 等在 `tbl_item.json` **全部缺失**（`tbl_item.json` 中 id 落在 67000~67999 区间的行数 = **0**）→ 这些 reward 引用指向**本目录外的表**，未能解析。
- `skill_Trick.json:1 .Trick_des_group` 还给 `trick_group.icon` 提供键：`scripts3.js:2719` `getItem(v.Trick_des_group,"trick_group")`，`scripts3.js:4946` 取 `.icon`。

---

# D 次数与限次

- 免费次数：`skill_Trick_Lotterymachine.json:1 [id=1..3] .free_day` = `1`（列名唯一含 day/free 的摸奖列）。
- 免费态由服务器字段驱动，不由表驱动：`scripts3.js:90056` `this.isFree = t.isFree;`、`scripts3.js:90087` `this.isFree = e.isFree;`、`scripts3.js:90380-90382` `isHasFree(){ return 1 == TrickLotteryModel.isFree; }`。
- 剩余次数同样来自服务器：`scripts3.js:90055` `this.remainTimes = t.t;`、`scripts3.js:90086` `this.remainTimes = e.t;`（模型默认值 `scripts3.js:89986` `this.remainTimes = 10;`）。
- 界面上的「次数」文案用 `remainTimes` 渲染：`scripts3.js:90583-90587` `getText(6000424).replace(/\[1\]/, g.TrickLotteryModel.remainTimes.toString())`。
- 单抽/十连的**次数**取决于请求参数而不是表：`scripts3.js:90077-90082` `reqLottery(t,e){ sendRequest(KNACK_LOTTERY, {lotteryId, lotteryType: t, skillId: e}) }`，`scripts3.js:90403-90407` 单抽传 `1`、十连传 `2`（不是 10）。
- 开放窗口：`skill_Trick_Lotterymachine.json:1 [id=2/3]` `opentime=1790697600000`、`closetime=1792339199000`（毫秒量级；`[id=1]` `closetime=4092566400000`，量级相当于「永久」）。
- 开关：`skill_Trick_Lotterymachine.json:1 [id=1..3] .switch` = `1/1/1`。
- 池类型（决定是否限时）：`skill_Trick_Lotterymachine.json:1 .type` = `1/2/3`；客户端 `scripts3.js:90346` `setPool(this.btnPermanentPool, 1)` 固定把 1 号当常驻池、`scripts3.js:90366` `if (getItem(t[e],"skill_Trick_Lotterymachine").type > 1)` 把 `type>1` 挂到限时池列表。
- 层数/层质：`skill_Trick_Lotterymachine.json:1 .Floor_time` = `10`、`.Floors_quality` = `3`；客户端只读 `Floors_quality` 选一段文案（`scripts3.js:90586` `[6000433..6000437][t.Floors_quality - 1]`），**`Floor_time` 无客户端读取点**。
- 冷却（可选技能槽，非抽奖冷却）：`scripts3.js:90002-90020` 由 `User.optionalSkillUp` 回包更新 `optionalTimeMap`；`scripts3.js:90166-90170` `checkSkillSwitchable` 用 `TimeMgr.getSTimestamp()` 与 `optionalTimeMap[t]` 比大小；`scripts3.js:90062` `this.optionalCd = t.order;`、`scripts3.js:91006` `t >= 999 && (o = p.getText(6016218))`。
- 摸奖表内**没有** VIP 次数/冷却/每日上限列（21 列全列见 A.1；`coin_item` 为空、`trick_probability=1` 无读取点）。
- 其它表的次数列（非摸奖，仅作对照）：`goldlottery.json:1 .time` = `[1,1]`（id=1）/ `[2,1]`（id=2、3）；客户端把 `time[1]` 当上限、`time[0]` 当文案选择器：`scripts3.js:34207-34208` `var d = h.time, u = d[1] - (this.lData && this.lData[this._curId] ? this.lData[this._curId] : 0); this.desLabel.string = c.getText(1 == d[0] ? 6018291 : 6018292).replace(/\[1\]/, u).replace(/\[2\]/, d[1]);`；已用次数来自服务器 `goldLotteryData`（`scripts3.js:34283` `this.lData = e.goldLotteryData;`、`scripts3.js:34285` `if (!this.lData[i] || this.lData[i] < o[i].time[1])`）。
- `training_lottery.json:1 .time` = `1..5`（与 `id` 同值；**语义不明**，全项目无客户端引用）。

---

# E `optionalDatas` / `upSkillRateData`

- 两个字段在 `tools\index.js` 中 **0 命中**；全 `tools\` 目录唯一命中在 `tools\scripts3.js`：`scripts3.js:90010` `var s = o.upSkillRateData;`、`scripts3.js:90012` `var r = o.optionalDatas;`。
- 它们属于接口 `User.optionalSkillUp` 的**响应体**：`scripts3.js:39497` `OPTIONAL_SKILL_UP: "User.optionalSkillUp"`；订阅处 `scripts3.js:90008` `i.MessageCenter.on(f.HttpConst3.OPTIONAL_SKILL_UP, function(e, o) {`。
- 请求体形状（说明 `optionalDatas` 的下标来源）：`scripts3.js:90098-90105` `reqOptionalSkillUp(t,e){ var o = { lotteryId: this.lotteryId, upId: t + 1, skillId: e }; sendRequest(OPTIONAL_SKILL_UP, o) }` → 客户端 `upId` **从 1 开始**，故回包数组下标 = `upId - 1`。
- 原始代码（`scripts3.js:90008-90020`，逐字）：
```
90008: i.MessageCenter.on(f.HttpConst3.OPTIONAL_SKILL_UP, function(e, o) {
90009: if (1 == o.eRet) {
90010: var s = o.upSkillRateData;
90011: for (var n in s) t.lotteryData[n] = s[n];
90012: var r = o.optionalDatas;
90013: for (var n in t.optionalTimeMap) delete t.optionalTimeMap[n];
90014: for (var a = 0; a < r.length; a++) if (r[a] && r[a].length > 0) {
90015: t.upSkills[a] = r[a][0];
90016: t.optionalTimeMap[r[a][0]] = r[a][1];
90017: } else t.upSkills[a] = 0;
90018: i.MessageCenter.dispatch(y.EvName3.SKILL_UP_EVT);
90019: }
90020: }, this);
```
- `optionalDatas` 是**数组**：`scripts3.js:90014` 用 `r.length` 与 `a<r.length` 遍历；元素可能是空数组（`scripts3.js:90017` `else t.upSkills[a] = 0;`）。
- `optionalDatas` 每个元素是**至少 2 个元素的数组**：`scripts3.js:90015` `t.upSkills[a] = r[a][0];`（下标 0 = 技能 id）、`scripts3.js:90016` `t.optionalTimeMap[r[a][0]] = r[a][1];`（下标 1 = 该技能的到期/冷却时间）。
- 下标 1 是**毫秒时间戳**：`scripts3.js:90160-90162` `var i = this.optionalTimeMap[o]; e = i > 0 && v.TimeMgr.getSTimestamp() > i;`、`scripts3.js:90168` `v.TimeMgr.getSTimestamp() < this.optionalTimeMap[t] && (e = !1)`。
- 下标空间与 `skillArr`/`upSkills` 相同（0 基、按槽位）：`scripts3.js:90059` `this.upSkills = t.skillArr;`（GET 回包给初值），`scripts3.js:90015` 用同一数组按下标覆写；消费端 `scripts3.js:90401` `return g.TrickLotteryModel.upSkills[this.index];`、`scripts3.js:90597` `for (var e = !0, o = g.TrickLotteryModel.upSkills, i = 0; i < o.length; i++) o[i] > 0 && (e = !1);`。
- `upSkillRateData` 是**对象**（一级键 = 技能 id 字符串）：`scripts3.js:90011` `for (var n in s) t.lotteryData[n] = s[n];` → 合并进 `lotteryData`；读取处 `scripts3.js:91042-91043` `getTrickGroups(){ return l.TrickLotteryModel.lotteryData[this.skillId.toString()]; }`。
- `upSkillRateData` 的**二级键 = trick 组 id，二级值 = 比率**：读取方是同文件模块 **`TrickRateUI`**（`scripts3.js:90930` `cc._RF.push(e, "9a9a1kjgnlOzYX6LOaPWgX0", "TrickRateUI");`，由 `scripts3.js:91012` `openAchievementUI([ "TrickRateUI", this.skillId ])` 打开），逐字：
```
91053: e.prototype.loadItems = function() {
91054: var t = this.getTrickGroups(), e = c.getItem(this.skillId, "skill");
91055: for (var o in t) {
91056: var i = cc.instantiate(this.item);
91057: i.getChildByName("skill").getComponent(cc.Label).string = p.getText(e.Name);
91058: i.getChildByName("trick").getComponent(cc.Label).string = this.getGroupDes(o);
91059: i.getChildByName("rate").getComponent(cc.Label).string = (100 * t[o]).toString() + "%";
91060: this.content.addChild(i);
91061: }
```
  - `for (var o in t)` 的 `o` 直接喂给 `getGroupDes(o)`（`scripts3.js:91058`），而 `getGroupDes` 是拿它去匹配 trick 组：`scripts3.js:91045-91052` `var e = c.getTable("skill_Trick"); for (var o in e) { var i = e[o]; if (i.Trick_des_group == t) return p.getText(i.nameID).split("-")[0]; }` → **二级键必须是 `skill_Trick.Trick_des_group` 的取值域（100001~100230）**，不可能是 0 基下标。
  - `(100 * t[o])` 显示为百分比 → **二级值 = 比率（0~1 之间的小数）**。
- 因此形状结论（仅就代码读取方式）：
  - `optionalDatas` = 数组，长度 = 可选槽位数；元素 `[skillId, endTimestampMs]` 或 `[]`（`scripts3.js:90014-90017`）。
  - `upSkillRateData` = 对象 `{ [skillId字符串]: { [trick组id(100001~100230)]: rate(0~1小数) } }`（`scripts3.js:90011` + `91043` + `91058-91059`）。
- 两个字段在 444 张 dump 表中**没有同名/近名列**（全表 cols 扫描，正则含 `optional|rate`；仅有 `optional_gift.json`、`yuanbao_optional_gift.json` 的 `reward*` 命中，与 rate 无关）→ 是协议字段，不是配置表列。
- `action_facts_all.json` 中 `User.getKnackLottery` / `User.knackLottery` / `User.getKnackLotteryHistory` 三项的 `request_params`/`response_fields` 全为 `[]`、`occurrences=0`；该文件里**没有** `User.optionalSkillUp` 条目。

---

# F 入口

- `tools\index.js` 中 grep `KNACK_LOTTERY` → 3 处，全在 HttpConst 常量表：`index.js:60411` `GET_KNACK_LOTTERY: "User.getKnackLottery",`、`index.js:60412` `KNACK_LOTTERY: "User.knackLottery",`、`index.js:60413` `GET_KNACK_LOTTERY_HISTORY: "User.getKnackLotteryHistory",`。
- `tools\index.js` 中 grep `LOTTERYMACHINE` → **0 处**；grep `skill_Trick_Lotterymachine` → **0 处**；实测 `Lotterymachine` 全量分布：`index.js`=0、`scripts2.js`=0、`main.js`=0、**`scripts3.js`=8**（`90340`、`90355`、`90366`、`90410`、`90537`、`90549`、`90582`、`90979`）。
- `index.js` 里唯一的摸奖模型触点：`index.js:70537-70540`（`70537: e.hasOwnProperty("skillGrasp") && e.skillGrasp.hasOwnProperty("achievementReward") && Promise.resolve().then(function() {` / `70538: return t("../../scripts3/model3/TrickLotteryModel");` / `70540: t.TrickLotteryModel.receivedRewards = e.skillGrasp.achievementReward;`）——登录数据注入 trick 成就奖励状态。
- UI 类：`scripts3.js:90218` `TrickLotteryUI: [ function(t, e, o) {`、`scripts3.js:90220` `cc._RF.push(e, "e01ce2kHDVHvIQvsfSlXrDj", "TrickLotteryUI");`、`scripts3.js:90646` `o.TrickLotteryUI = R;`。
- 预制体声明：`scripts3.js:90287-90290` `e.prefabMap = { bd: "skillGrasp", prefab: "prefabs/TrickLottery/TrickLotteryUI" };`。
- 实际装载点（谁把它拉起来）：`scripts2.js:8763-8769`（**ChargeShopUI** 的 `onShowLotteryData`）
```
8763: o.prototype.onShowLotteryData = function() {
8764: var t = this;
8765: cc.assetManager.getBundle("skillGrasp").load("prefabs/TrickLottery/TrickLotteryUI", cc.Prefab, function(e, o) {
8766: var i = cc.instantiate(o);
8767: t.childNode.addChild(i);
8768: });
8769: };
```
- 装载触发事件：`scripts2.js:8388` `l.MessageCenter.on(I.EvName.GET_DEFAULT_TRICK_LOTTERY_DATA, this.onShowLotteryData, this);`；所属模块 `scripts2.js:8176` `cc._RF.push(e, "c2a6aHZk/ZIwZzGj/c69Etx", "ChargeShopUI");`。
- 商店入口函数：`index.js:131068` `openTrickLotteryShop(){ this.reqStoreList({ type: 9, back: 1 }); }`（`index.js:131069-131072`）。
- `openTrickLotteryShop` 的调用点（2 处）：`scripts3.js:16334` `case 4: d.StoreModel.openTrickLotteryShop(); break;`（`scripts3.js:16327-16332` 所在方法读 `getItem(this.data.id,"nianshou_task")` 的 `task_type[0]`）；`scripts3.js:92576` `if (this.type == this.lotteryType) { y.StoreModel.openTrickLotteryShop(); return; }`（WarmUp 活动任务按钮，`scripts3.js:92565` `onClick`）。
- 模型初始化与三个接口注册：`scripts3.js:90004-90007` `MessageCenter.on(GET_KNACK_LOTTERY/KNACK_LOTTERY/GET_KNACK_LOTTERY_HISTORY/RECEIVE_ACHIEVEMENT_REWARD, ...)`。
- 拉数据：`scripts3.js:90043-90050` `reqData(t){ ... sendRequest(GET_KNACK_LOTTERY, this.isDefaultLottery ? {} : { lotteryId: t }) }`；切池：`scripts3.js:90071-90076` `changeLotteryMachine`。
- 抽奖请求：`scripts3.js:90077-90083` `reqLottery(t,e){ sendRequest(KNACK_LOTTERY, { lotteryId: this.lotteryId, lotteryType: t, skillId: e }) }`；回包开奖 UI：`scripts3.js:90084-90097`（`load("prefabs/TrickLottery/TrickRewardUI")` + `setData(e)`）。
- 按钮绑定：`scripts3.js:90326` `this.addButtonListen(this.btnGetOne, this, this.onClickGetOne);`、`scripts3.js:90327` `this.addButtonListen(this.btnGetTen, this, this.onClickGetTen);`；点击处理 `scripts3.js:90403-90407`。
- 可选技能池弹窗：`scripts3.js:90184-90191` `openOptionalTrickPool` → `prefabs/TrickLottery/OptionalTrickPoolUI` + `s.setUpId(t)`；触发 `scripts3.js:90410`（`type==3`）。

---

# 未能验证

- **无文本表**：`tools\cfg\dump\languageList.json:1` 仅 3 行（`{"1":{"id":1,"type":"zh","des":9042},...}`），全 dump 无 id→文本映射表 → `nameID`/`information`/`name`/`Name` 等语言 id（例 `skill_Trick.json:1 [10001].nameID=9246`、`tbl_item.json 键 9191 .Name=2104414`）**无法解析成中文名**。
- 物品 9191（摸奖券）的**名称与用途文本**未知（只能给 `Type=2/Price=100/Effect=36/Limit=1`）。
- `optional_gift.json`/`yuanbao_optional_gift.json` 的 `reward1..4`（`67433`~`67449`）在 `tbl_item.json` 中不存在（67000~67999 无行），也未在 `gift_permanent.json`/`limitgift.json`/`mall.json`/`servergift.json`/`productconfig.json` 的键中出现 → `reward` 指向的表不在本目录。
- **抽到具体哪一条 trick 的抽样过程无表可查**：`skill_Trick_Lotterymachine.probability`（品质权重 `1,640|2,200|3,100|4,40|5,20`）客户端 0 读取点；`skill_Trick_Drop.drop_probability`（每技能和 1000）客户端只在 `scripts3.js:90133-90138` 被用来「枚举 groupID==1 的技能集合」，**权重列本身 0 读取点**；两者是否分别为「品质权重/变体权重」仅由数据形状（权重和 1000、键域 1~5 与 `Trick_quality` 相同）支持，**无代码证据**。
- `skill_Trick_Drop.groupID` 全为 1 → **无法从表得知 id=2/3 的限时池分别使用哪些技能/组**。
- `skill_Trick_Lotterymachine.coin_item`（3 行全 `[]`）与 `trick_probability`（=1）**含义不明**（无读取点、无非空样例）。
- 表列 vs 线上值可能不一致，无法从客户端证伪：客户端只用服务器字段 `onePrice/tenPrice/trick_item/isFree/t/skillArr/eTime/optionalEndTimeMap/order/nextSkillArr/poolDateId/isRewardState`（`scripts3.js:90051-90062`、`90193-90195`、`90404`、`90565`、`90573`、`91026`），**完全不读** `one_shot`/`ten_shot`/`free_day`/`probability`/`item_ten_shot`/`Floor_time`/`switch`/`shop`/`npc`/`subject`（`scripts3.js` 中这些表内列名的读取点仅 90340-90366、90410、90549、90582 处出现的 `pic/name/type/information/Floors_quality`）。
- `skill.ID1..ID10`（带 `Unlock{1..10}level`/`Probability{1..10}`）与 trick 组**不是同一 id 空间**：`skill.json:1 [1000]` 的 `ID1..ID10=100001..100010` 恰好与 trick 组重合，但 `skill.json:1 [1003]` 为 `100301..100308`、`[1005]` 为 `100501..100506`、`[1010]` 为 `101001..101008`（= `ID*100+n`）；该 id 域指向的表**未在 dump 中找到**，故 `skill.json` 的 `Probability1..10`（14/13/12/11/11/10/9/8/7/5）与摸奖关系**未验证**。
- `training_lottery.json` 全项目 0 引用（`index.js`/`scripts2.js`/`scripts3.js` 均无 `training_lottery`）→ `time`/`consume`/`frame` 语义**无客户端证据**。
- `lottery.json` 的 `weight` 语义未验证：`scripts2.js:38660-38690` 只消费 `award`(`[0]`→itemId、`[1]`→num) 与 `type`/`id`，**`weight` 在该段无读取点**；`type` 在 `scripts2.js:38715-38747` `showGard` 里当「未解锁格」判定用（`38726: if (this.celllock > 0) if (e.type > 0) { …lockSprite.active = !0 }`），故 `type` 的 0/1 与「重量/权重」无关，`weight` 的真实语义**不明**。
- `action_facts_all.json` 的摸奖三条目为空（见 E 节末），无接口级字段证据可交叉验证。
- `dump\item.json` 为截断副本（`rows=6525, kept=3000, truncated=true`），若只看它会漏掉 9191 之后的大量物品。

---

# 范围外发现

- `fuben.json:1` 列含 `ChallengeTimes, BuyTimes, VIPTimes, Price`（副本的次数/VIP 次数样例，本批摸奖表无对应列）——若后续要找「VIP 次数」类字段，形态在此表。
- `skill_quality.json` 被客户端用于 trick 成就奖励：`scripts3.js:90114-90120` `getItem("skill_quality")` 后读 `[t][3].collection_reward` / `.show_reward`。
- `skill.json:1` 有 74 列，含 `Type/Type1/Cost/CD/InitialCD/newCD/op_quality/ed_quality`，其中 `Cost` 与摸奖无关（技能耗蓝类字段，未在本批取证）。
- `skill_Trick.json:1` 的分组是 46 个技能 × 5 个变体 = 230 组；`trick_group.icon` 只有 3 种图（Bamboo/Reel/Slate），即**图标不区分具体技能**。
- `dump` 下 444 个文件全部单行压缩；对任意表做「行号定位」都只能得到 `:1`，可靠定位需要「表内键」。
- `index.js` 里 `TrickLotteryModel` 只出现 3 次（`index.js:70538`/`70540`/`71024`），真正的模型与 UI 全在 `scripts3.js`；`scripts2.js` 的 `ChargeShopUI` 把 UI 挂在自己的 `childNode` 下（`scripts2.js:8767` `t.childNode.addChild(i);`），即摸奖界面被加载为**充值商店的子节点**，不是独立 `PopUpMgr` 弹窗。
- `lottery.json` 的客户端宿主是「格子解锁/领取」界面而非摸奖机：`scripts2.js:38693` `this.curCount = RoleBaseInfo.getItemNum(7818);`、`38694` `this.celllock = this.data.cellLock;`、`38695` `this.cells = this.data.cells;`、`38753` `unLockGard`，且每行按 `gifts/Node1..26`（`scripts2.js:38667-38668`）铺 26 个格子；与摸奖的唯一连接点是 `lottery.json:1 [id=26].award=[9191,1]`（9191 = 摸奖券）。
- `index.js:124662` 存在按 `weight` 加权的抽取写法（`t.multiplier += a.weight * i[0] / o[0] * .01;`），可作「表内 weight 列在别处如何被消费」的形态参照（与摸奖无关）。

---

**总判断：按现有表「半能」算出一次摸奖的扣费与产物。**
- 能算出的：扣费物品与数量（`skill_Trick_Lotterymachine.json:1 .one_shot=[9191,1]` / `.ten_shot=[9191,10]`，券 id 9191 在 `tbl_item.json` 中 `Type=2/Price=100`）；产物候选池（46 技能 × 5 变体 = 230 组 `skill_Trick_Drop.drop_group`，落到 `skill_Trick.json` 的 `Trick_quality` 1~5 与 `item_quantity`）。
- 缺的东西（4 项）：① 品质权重与变体权重「哪一个对应哪一列」的代码/表内声明（`probability` 与 `drop_probability` 均无读取点、无单位说明）；② 抽奖池 ↔ 技能集合的映射（`skill_Trick_Drop.groupID` 恒为 1，id=2/3 限时池无表可查）；③ 免费/每日次数与重置规则（表内只有 `free_day=1`，实际 `t`/`isFree` 由服务器下发，`action_facts_all.json` 三条目为空）；④ 券 9191 与奖励 `67433`~`67449` 的名称/归属表（`tbl_item.json` 中 67000~67999 为 0 行；dump 无文本表，语言 id 无法解析）。
