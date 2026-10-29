# 开工三问 · 白石 杏 (Anzu) 卡面 v1

日期：2026-10-06　入口：A（txt2img `--qingwei`）　配置：animaQingweiStyle_v10 + 固定 5 LoRA（全挂）

## 问 1：控制机制选哪个？

**答：纯 txt2img（噪声起点，denoise 1.0）。**

理由一句话：这是单角色单人卡面，景别（中近景）、背景（空白）、姿势全部要由提示词全权决定，没有任何"要和参考图一样"的需求；而 img2img 会压制提示词、且源码 `dsh_gen.py:392` 下 img2img 只挂 2 个 LoRA（skill 1.5），与本配置 5 个不符。

## 问 2：特征权威来源是什么？

**答：用户本轮贴出的 Anzu 英文提示词原文**（工作区无卡文文件，已 grep `白石|Anzu` 零匹配；用户明确「这是游戏资产，游戏有自己的设定」）。

已逐字落盘 → `anzu_v1_prompt.txt` 的构建依据段。不凭记忆、不看参考图（本任务无参考图）。

抽取锚点：18 岁 / 147cm / petite 纤细 / pale skin / 墨黑微卷短发及颈 / 灰紫下垂大眼 / 退烧脸红 / 男士白棉衬衫 oversized / 滑落单肩露锁骨 / 袖长盖手 / 下摆及大腿中段 / 怯生生抓衣领 / 视线略上扬。

## 问 3：验收清单是什么？

用户本轮的**系列统一标准**（对后续所有人物卡面同样生效）+ 六维补全：

| # | 维度 | 判定标准 |
|---|---|---|
| 0-1 | **中近景** | `upper_body` 取景，胸/腰以上；**不得**出现全身或七分身 |
| 0-2 | **空白背景** | 纯白/素色平背景，无场景、无家具、无窗户、无杂物 |
| 0-3 | **姿势贴合角色且不刻板** | 杏 = 怯生生/含肩/一手抓衣领/一手缩进过袖/仰视略偏；**不得**出现叉腰、抱胸、标准"看镜头微笑"等通用 pose |
| 1 | 景别 | 中近景（见 0-1） |
| 2 | 机位透视 | 与角色眼睛大致平视或极轻俯，不歪斜 |
| 3 | 姿势 | 见 0-3，且肢体自然、无融合 |
| 4 | 服装锚点 | 白衬衫 + 露单肩 + 锁骨 + 过袖盖手，四锚齐全 |
| 5 | 背景 | 空白（见 0-2） |
| 6 | 防漂移 | 单人 / 无男性入画 / 非儿童体型 / 无马赛克 / 无文字水印签名 |

## 词库校验记录（0-B 强制）

三批只读探针（`_lex_probe.py` / `_lex_probe2.py` / `_lex_probe3.py`，离线 sqlite 兜底，未写库）：

- 景别：`upper_body` 766459（上半身）＞ `portrait` 81138 ＞ `close-up` 46231；`cowboy_shot` 552420 = 七分身，**用于负面封顶**
- 背景：`simple_background` 1805467 / `white_background` 1484091；`blank_background`、`empty_background` **库内不存在**，故不用自造词
- **关键纠偏**：原提示词 `drooping grey-purple doe eyes` 不是规范标签 → 库内规范词为 **`tareme`**（垂眼 36497）+ `grey_eyes` 180282 + `purple_eyes` 802605
- 服装：`white_shirt` 836409 / `collared_shirt` 443589 / `dress_shirt` 123393 / `oversized_clothes` 12506
- 露肩：`off_shoulder` 239265 / `single_bare_shoulder` 18594 / `collarbone` 784052
- 袖：`long_sleeves` 1555934 / `sleeves_past_fingers` 47337（＝"袖子盖住手"，精确对应原词）
- 姿势：`clothes_grab` 9818 / `hand_on_own_chest` 61581 / `hand_up` 346906 / `looking_up` 70983 / `shy` 9321 / `blush` 2926626
- 体型：`petite` 18648（147cm）
- 负面词全部库内验证：`full_body` 798431 / `wide_shot` 15843 / `cowboy_shot` 552420 / `multiple_girls` / `2girls` / `male_focus` 701251 / `child` 54713 / `loli` 146550 / `mosaic_censoring` / `censored` / `bar_censor` / `watermark` / `signature` / `artist_name` / `english_text` / `chinese_text` / `blurry` / `bad_anatomy` / `deformed` / `scenery` / `window` / `bed` / `on_bed`
- 库内**不存在**故弃用：`toddler` / `detailed_background` / `furniture` / `clutter` / `extra_limbs` / `extra_digits` / `long_neck` / `lowres` / `jpeg_artifacts`

## 偏离定版声明

无。`--anima-x` 未写 = 默认 `all`（5 个 LoRA 全挂），与 1.2 一致。
