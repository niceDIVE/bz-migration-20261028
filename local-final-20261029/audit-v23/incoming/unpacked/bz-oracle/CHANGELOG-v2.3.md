# v2.3（2026-10-23）：吸收 R22 真服事实

依据：R22 §三.1 / §三.2（D2 真服实测 2026-10-24）。

| 事实 | 修改 | 守护 |
|---|---|---|
| 原服拒绝是信封外的裸 `{"errorCode":1}`：非法 uid、无此物品、出售已穿戴装备，三种场景都一样 | `config.rejectForms` 登记这种形态，并写明来源；客户端怎么处理它「材料未提供」。L1 新增拒绝分支：`REJECT` 信息、`REJECT_CODE`、`REJECT_MIXED`（只能有 errorCode 这一个键）、`REJECT_IN_ENVELOPE`（不许包进 code/MsgData）、`REJECT_MUTATED`（拒绝时存档不能变）、`NO_CONTRACT`（动作仍须已知）。投射器：handler 返回 `{errorCode}` 时原样裸发，夹带字段或改了存档都抛 ProjectionError。DSL：guard 支持 `reject:"errorCode"` 和 `pre:true`（在参数校验之前判断）。回放服务器对拒绝形态不套信封。har2cases 给裸拒绝打上 `meta.reject` 标记 | 第 23 步 |
| 已穿戴装备不可卖 | fixture 06 改为裸拒绝，存档不变；`rules.json` 新增守恒规则（带 source）；`rules.dsl.json` 新增 pre guard | M24（卖掉穿戴装备，信封和快照都自洽）只能靠 L5.RULE 击杀，第 23 步断言了这一点 |
| fixture 06 原来的作用是测 eqch 删除路径 | 新增 06b：卖出**未穿戴**装备 90003。售价 30 是**合成值，未取证** | M09.sell_overpay 的存活用例从 equip90001 改到 equip90003 |
| 变异库 | 新增 M24 卖穿戴装备、M25 拒绝写成 `{eRet:0}`、M26 拒绝却改了存档、M27 拒绝夹带 note、M28 拒绝被包进信封。M18 不再作用于拒绝用例（拒绝本来就没有信封，变异后和原用例等价） | 击杀 130/131，唯一存活仍是 M09 |
| 第 21 步口径 | DSL 已经能对 90001 产出裸拒绝，因此 90001 必须与录制一致；90003 卖不出（演示 DSL 只认 itemID）→ 转人工 | 第 21 步 |

**更正 v2.2 回执**：v2.2 回执把"演示生成器拒卖装备"称为 v2.1 放行的真实漏判。按 R22 的真服事实，拒卖已穿戴装备本身是对的。生成器错在两处：一是拒绝的形态不对（回的是 `eRet:0`，应为裸 `errorCode:1`），二是拒绝的理由不对（因为缺 itemID 参数而拒，不是因为装备已穿戴）。所以"回归判死"这条机制本身成立，但当时举的那个例子的定性需要改。

**仍开放**：
- M09 的售价规则：哪张表、哪一列；
- 客户端收到 `errorCode` 之后的行为（M2 里 errorCode 读点为 0）；
- stub-deny 名单；
- HttpConst3 的逐键 send/on 表。
