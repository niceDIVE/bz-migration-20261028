# scoutT-ufo-tables: UFO夹娃娃配置表狩猎报告

## 文件名狩猎
检索目录：`tools/cfg/dump/`（共 444 个 json 文件）
检索式：`(?i)(ufo|catch|claw|doll|machine|coin)` 匹配文件名
命中文件（仅 1 个）：
- `tools/cfg/dump/skill_Trick_Lotterymachine.json`
  - 行数：1 行（3 条记录）
  - 列名：`["id","switch","subject","opentime","closetime","one_shot","ten_shot","free_day","trick_item","item_ten_shot","probability","trick_probability","coin_item","shop","npc","Floor_time","Floors_quality","information","name","pic","type"]`
  - 前2条数据原文（来自 [skill_Trick_Lotterymachine.json:1](tools/cfg/dump/skill_Trick_Lotterymachine.json#L1)）：
    `"1":{"id":1,"switch":1,"subject":"GraspUI_bg1","opentime":1563811200000,"closetime":4092566400000,"one_shot":[9191,1],"ten_shot":[9191,10],"free_day":1,"trick_item":9191,"item_ten_shot":10,"probability":"1,640|2,200|3,100|4,40|5,20","trick_probability":1,"coin_item":[],"shop":1,"npc":1002,"Floor_time":10,"Floors_quality":3,"information":6000499,"name":6013124,"pic":"B_ell","type":1}`
    `"2":{"id":2,"switch":1,"subject":"GraspUI_bg1","opentime":1790697600000,"closetime":1792339199000,"one_shot":[9191,1],"ten_shot":[9191,10],"free_day":1,"trick_item":9191,"item_ten_shot":10,"probability":"1,640|2,200|3,100|4,40|5,20","trick_probability":1,"coin_item":[],"shop":1,"npc":1002,"Floor_time":10,"Floors_quality":3,"information":6000499,"name":6013125,"pic":"B_ell_2","type":2}`
结论：444 张配置表中，仅命中 `skill_Trick_Lotterymachine.json`（疑似绝招抽奖/扭蛋机，非 UFO 夹娃娃）。未找到含 ufo/catch/claw/doll/coin 的文件名。

## 内容狩猎
检索目录：`tools/cfg/dump/`
检索式：`(?i)ufo` 全目录内容 grep
命中情况：未找到（0 命中）。
检索式：`(?i)catcher` 全目录内容 grep
命中情况：未找到（0 命中）。
结论：`tools/cfg/dump/` 目录下全部 444 张表中均无包含 `ufo` 或 `catcher` 内容的条目。

## 常量表与候选
1. 常量表检索：
- 目标文件：`tools/cfg/dump/constant.json`
- 检索式：`(?i)(ufo|catcher)` grep
- 命中情况：未找到（0 命中）。
- 检索式：`6025[0-5]|60249` 全目录 grep（协议号反查），在配置表目录无相关配置条目命中。

2. 名字含 task/active 的配置表清单（来自 `tools/cfg/dump/`，共 39 张）：
- `AdScet_task.json`
- `AutoDailyTask.json`
- `Friend_task.json`
- `active.json`
- `active_inform.json`
- `active_order.json`
- `active_signup.json`
- `active_store.json`
- `activetime.json`
- `anniversary_jigsaw_task.json`
- `anniversary_pass_task.json`
- `beachtreasure_task.json`
- `bookmark_task.json`
- `brew_task.json`
- `castlejumpingfun_task.json`
- `circle_task.json`
- `daily_active_tips.json`
- `digcell_task.json`
- `entrust_task.json`
- `koicarp_active.json`
- `koicarp_active_box.json`
- `koicarp_active_task.json`
- `lottery_active_reward.json`
- `moonstep_active.json`
- `moonstep_active_cycle.json`
- `moonstep_active_task.json`
- `mysterywish_task.json`
- `nianshou_task.json`
- `nianshou_task_level.json`
- `planting_active.json`
- `prepare_task.json`
- `springsword_task.json`
- `stagetreasure_task.json`
- `task_remain.json`
- `tasknew.json`
- `tasktime.json`
- `torch_task.json`
- `training_task.json`
- `wulintreasure_task.json`
结论：常量表无 UFO/catcher 记录；含 task/active 的配置表均为其他活动专属表或通用日常表，无 UFO 专属表。

## 未验证段
1. 客户端代码中通过网络下发的动态活动配置（如服务端直接下发 awards/tasks 结构体而非读本地 dump 表）未验证。
2. 关联模型（`tools/index.js:87585` 中的 `t.DollModel.getUFOCatcherData()`）所涉及的其他本地持久化数据或活动名映射未验证。

## 范围外产出
- 在 `tools/index.js:87585` 顺带发现调用链入口 `t.DollModel.getUFOCatcherData()`。
