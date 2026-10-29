# 白石杏 · 4 套剧情差分规划书（Sprite Variations）

基准图：`F:\BaoZouyxt\_卡面\Anzu_暂定_A-03_seed131657150.png`（v2 轮，seed 131657150，832×1216）
日期：2026-10-06　配置：animaQingweiStyle_v10（详见下方机制决策）

## 问 1：控制机制选哪个？

**这是本批次唯一的关键决策，且两种机制各有已知缺陷，故先用 Gate 实测再定。**

| 机制 | 优势 | 已知缺陷 |
|---|---|---|
| **img2img 垫图**（入口 B，`--ref 基准图 --denoise 0.6`） | 构图/五官/服装结构锁得住 = 「DNA 不变」 | **只挂 2 个 LoRA**（源码 `dsh_gen.py:392` 未传 extras），skin(0.7)/detail(0.6)/gloss(0.5) 三档全部丢失 → 皮肤与细节质感会与基准图不一致 |
| **txt2img 同 seed**（入口 A，`--seed 131657150`） | 5 LoRA 全挂，质感与基准图同源 | 姿势是否改得动取决于提示词权重，需实测；同理构图会随提示词漂移 |

skill 5.2 决策表把本任务归入「定版同款补图/贴脸修复」→ 指向 img2img 垫图 0.55~0.62；
但 5.2 同时又写明 **「垫图强度只决定错多错少，不决定对错」**，且本批 4 套的**姿势变化幅度很大**（手从唇边→攥领口→捧碗→扯衣角→按纽扣），0.6 的垫图有可能把姿势变化压制掉。

**故 Gate 方案**：差分 01 同时出两张 —— 一张 img2img 垫图、一张 txt2img 同 seed，逐维对比后择一定为全批机制。

## 问 2：特征权威来源是什么？

**基准图 `Anzu_暂定_A-03` + 用户本轮给出的 4 段增量 Prompt 替换项。**
做法：保留基准图 DNA 段（年龄/身高/体型/肤/发/眼/白衬衫+露单肩+锁骨）**逐字不动**，只替换【表情】与【手部动作】两个语块，再追加用户给的增量标签。

## 问 3：验收清单是什么？

系列标准（中近景 / 空白背景 / 姿势贴合且不刻板）+ 差分专属维度：

| # | 维度 | 基准 |
|---|---|---|
| 0-1 | 中近景 | `upper_body` |
| 0-2 | 空白背景 | 纯白，无浮空符号（诗织 C 轮踩过） |
| 0-3 | **DNA 一致性** | 与基准图逐项比对：发型/瞳色/衬衫结构/露单肩/锁骨/线稿粗细/光照方向 |
| 0-4 | **差分有效性** | 该张的表情与手部动作**必须能一眼区别于基准图**，不能"换汤不换药" |
| 1-6 | 六维 | 景别 / 平视 / 肢体无融合 / 服装锚点 / 空白背景 / 单人无男性非儿童无马赛克无文字 |

## 4 套差分与本批词库处置（0-B，第十一批探针）

| 差分 | 表情锚 | 手部锚 | 新增负面 |
|---|---|---|---|
| 01 受惊雏鸟 | `tears`(234941) `crying`(76183) `crying_with_eyes_open`(35821) `trembling`(76551) | `clothes_grab`(9818) `hands_on_own_chest`(15395) | `smile`(2855137) `light_smile`(73208) `happy`(91432) |
| 02 怯生生家政 | `light_blush`(65918) `looking_up`(70983) `embarrassed`(96683) | `sleeves_rolled_up`(39982) `holding_bowl`(7013) `steam`(54368) | 无新增 |
| 03 吃饱撒娇 | `happy`(91432) `closed_eyes`(700055) `smile`(2855137) `blush`(2926626) | `head_tilt`(138867) `clothes_grab`(9818) | `tears`(234941) `crying`(76183) |
| 04 情动沉沦 | `parted_lips`(489886) `biting_own_lip`(5162) `half-closed_eyes`(93882) `blush`(2926626) `happy_tears`(2859) | `partially_unbuttoned`(15410) `unbuttoned`(17458) `open_shirt`(116407) `buttons`(138462) `cleavage`(996951) | `smile`(2855137) `grin`(231208) |

**库内不存在，故一律不用（自然语言兜底）**：
`teary` / `wide_eyes` / `shivering` / `defensive` / `timid` / `fearful` / `ceramic` / `tugging` / `shirt_hem` / `shirt_buttons` / `biting_lip` / `lustful` / `bedroom_eyes` / `deep_blush` / `relieved` / `joy` / `squinting`。
其中「瞳孔放大」用 NL `wide dilated pupils` 兜底；「迷离情欲眼神」用 `half-closed_eyes` + NL `glossy lustful gaze` 兜底。

## 通用负面基线（继承 v3 轮，库内全验证）

`full_body, wide_shot, cowboy_shot, multiple_girls, 2girls, male_focus, child, loli, mosaic_censoring, censored, bar_censor, watermark, signature, artist_name, english_text, chinese_text, blurry, bad_anatomy, deformed, scenery, window, bed, on_bed, blurry_background, curly_hair, ringlets, sweatdrop, flying_sweatdrops, sweat, water_drop, spoken_question_mark, spoken_exclamation_mark, speech_bubble, motion_lines, speed_lines, floating, blush_stickers, full-face_blush, thinking`
