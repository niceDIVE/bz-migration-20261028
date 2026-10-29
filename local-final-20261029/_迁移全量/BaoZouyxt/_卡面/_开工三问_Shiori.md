# 开工三问 · 神崎 诗织 (Shiori) 卡面 v1

日期：2026-10-06　入口：A（txt2img `--qingwei`）　配置：animaQingweiStyle_v10 + 固定 5 LoRA（全挂）
系列标准（用户定）：中近景 / 空白背景 / 姿势贴合角色且切忌刻板 / 不固定 seed

## 问 1：控制机制选哪个？

**答：纯 txt2img。** 同 Anzu：单人卡面，景别+背景+姿势全由提示词决定，无"要与参考图一致"的需求；img2img 只挂 2 LoRA（源码 `dsh_gen.py:392`），与本配置不符。

## 问 2：特征权威来源是什么？

**答：用户本轮贴出的 Shiori 英文提示词原文 + 中文人设核心**（无卡文文件）。
抽取锚点：18 岁 / 150cm / 紧致饱满·细腰·自然丰满胸（人设补：C-蜜桃胸）/ 浅金微卷双马尾过肩 / 柔松散侧刘海 / 琥珀金猫眼·长睫毛 / 微嘟嘴 / 带皱深蓝水手服 + 松红领巾 + 深色实用马甲 / 金属账本抱胸 + 指间钥匙 / 高傲别扭。

## 问 3：验收清单是什么？

系列标准 + 六维：

| # | 维度 | 判定标准 |
|---|---|---|
| 0-1 | 中近景 | `upper_body` 取景；不得出现全身/七分身 |
| 0-2 | 空白背景 | 纯白素背景，无场景/家具/浮空符号/汗滴 |
| 0-3 | **姿势贴合且不刻板** | 诗织 = **双臂把金属账本抱在胸前当盾、下巴微抬、视线斜切、指间挂钥匙**；**禁止**叉腰、抱胸、标准看镜头微笑等通用 pose |
| 1-6 | 六维 | 景别 / 机位平视 / 肢体自然无融合 / 服装四锚（水手服领+红领巾+深色马甲+账本）/ 空白背景 / 单人无男性非儿童无马赛克无文字 |

## 本角色专属处置

**刻板姿势封杀**：原提示词写的是 `one hand on her hip and slightly turning her face away`（叉腰+别脸）—— 这是 tsundere 的模板姿势，与用户「切忌刻板」冲突。已改为抱账本防御姿势，并把 `crossed_arms`(84247)、`hands_on_own_hips`(30549) 两个规范 pose 词放入负面封杀。

**库内缺口（按 5.3 自然语言兜底）**：
- `amber_eyes` / `cat_eyes` / `golden_eyes` **库内均不存在** → 改用 `yellow_eyes`(687402) + `tsurime`(吊梢眼 40440) + `slit_pupils`(竖瞳 65914) 三词组合塑造猫眼，颜色由自然语言 "amber-gold" 兜底
- `light_blonde_hair` 不存在 → `blonde_hair`(1528937) + 自然语言 "light golden-blonde"
- `utility_vest` 不存在 → `vest`(213254) + `black_vest`(42276) + 自然语言 "loose dark utility work vest"
- `ledger` / `holding_keys` / `keys` 不存在 → `clipboard`(8862) + `holding_clipboard`(3798) + `key`(15468) + 自然语言 "inventory clipboard / ring of keys"

**框架裁掉的设计元素**：黑丝连裤袜、百褶裙在中近景取景下不入画，故不入正向词（避免把模型拉回全身构图）。

## 词库校验记录（0-B 强制）

第七批只读探针 `_lex_probe7.py` + 第六批 `_lex_probe6.py`（离线 sqlite，未写库）。全部入词标签与负面词均在库内验证；库内不存在的 `amber_eyes`/`cat_eyes`/`golden_eyes`/`light_blonde_hair`/`utility_vest`/`ledger`/`holding_keys`/`glare_lines` 一律未使用。

---

# v2 追加（用户授权调整外观使其更符合性格）

针对 v1 两个问题：①两版姿势都落在「双臂交叉抱胸」（自然语言描述与负面 crossed_arms 自相矛盾，NL 获胜）；②神态偏「恼怒」，离「高傲高岭之花」不够。

## 外观设计调整（服务于性格）

| 项 | v1 | v2 | 理由 |
|---|---|---|---|
| 眼神 | 恼怒瞪视 glare | half-closed_eyes(93882) 半闭 + aised_eyebrows(34384) 挑眉 + smug(21953) 得意 | 居高临下的垂目远比瞪视更像高岭之花 |
| 视线 | looking_to_the_side 别脸 | looking_at_viewer(3293425) 直视观众 | 原词「别脸」是回避型；高傲角色应当迎上视线再俯视你 |
| 脸型 | 未指定 | 自然语言 refined elegant features + defined jawline + straight nose | 压住过幼的圆脸，往 18 岁成人的清冷骨相走 |
| 身段 | 未指定 | curvy(43939) + 
arrow_waist + medium_breasts | 落实「紧致饱满」 |
| 双马尾 | 蓬松卷 | 加 hair_ribbon(601154)，NL 改 neat softly wavy，dark ribbons 束发 | 蓬松乱翘偏幼态；齐整微卷才像原学生会长 |
| 配件 | 无 | lanyard(8959) + id_card(16677) 工牌 | **身份落差的可视化**：从学生会长到避难所仓储管理员 |
| 姿势 | 双臂抱账本于胸前 | **不对称结构**：一手垂在身侧拎账本+钥匙，另一手 djusting_hair(20648) 撩头发 | 彻底避开双臂交叉；撩发是优雅而非防备的手势 |

## 姿势封杀加固

负面新增 hugging_object(24721) —— 防「抱」这个动作从 tag 层再次回归；crossed_arms / hands_on_own_hips 继续保留。
正向句子结构上把两只手写成**明确分离**的动作（一手垂在身侧 / 另一手抬起撩发），不再出现「双臂向胸前收拢」这类会被 NL 直接执行的描述。

## 未采用的库内词（有意）

mature_female(33635) 可增强成人感，但会与 150cm + 水手服的少女设定打架，故不用，改用脸型自然语言 + curvy 承担。