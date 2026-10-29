# C11〔周年通行证〕第 12 批 · 执行记录（2026-10-27）

> 上游文档：`C11-c11-取证与策略.md`（取证与策略草案）、`主审-独立探针记录.md`（15 节证据）、`工单-第12批C11-20261027.md`。
> 拍板四项（用户 2026-10-27）：①endtime=now+30 天 ②VIP=300 元宝 ③买活跃度扣 gold、单价主审定 10/点 ④7 个全做。

---

## 一、交付物清单

| 文件 | 性质 | 内容 |
|---|---|---|
| `tools\gen_c11_tables.js` | 新增 | 生成器：读 5 张 dump 表 → `BZ_C11`（口径集中在文件头部常量） |
| `hotfix-patch\core\bz-c11.generated.js` | 产物 | 4,058 B，md5 `96341B64EF57465617A3A24EFAA32C56`：award 22 阶（free/vip 已解析成对列表）/ task 7 / gift 4+`giftRows` 预拼 Type-11 货架 / liveSrc 5 留档 / evnet 5 沉底 |
| `hotfix-patch\core\bz-rpc-server.js` | 修改（4 处插入） | 433,894 B，md5 `AB7BE4F9056728B45D57D61D4F57F0DC`：助手 4 个（`annRead/annEnsure/annDataOf/annTable`，在 `var H = {` 之前）+ 7 handler + REJECT_CODES 7 条 + REJECT_ALLOW 7 条 |
| `hotfix-patch\build-handlers.js` | 修改 | 接入 `bz-c11.generated.js`（与 sweep 两处都接） |
| `tools\check_shape_freeze.js` | 修改 | sweep 同步接入 |
| `tools\todo_shapes.json` | 修改 | **补 5 个新键**（gift 两键原本就在） |
| `tools\facts\reject-codes.json` | 修改 | +7 条（`tmp_add_reject_c11.js` 写入，ev 的 sha8 现场自算） |
| `tools\golden\emission.json` | 重新冻结 | 342 动作（337+5）；60 项 diff 由 7 条 planned-changes 规则覆盖后归档 `planned-archive\` |
| `hotfix-patch\test\c11-smoke.js` | 新增 | 13 条，全绿 |
| `hotfix-patch\patch\live\handlers.js` | 产物 | 1,564,251 B，md5 `D51DADE441681C28F80CBFB8DE84FB9D`，**不许手改** |

**线上 ver = `h70337301`**（原 h90b31552），selfCheck **1320** 全过，flow 不变 `ffaec47c3`。

## 二、7 个 handler 的实现要点

| 键 | 实现 | 回包 |
|---|---|---|
| `getAnniversaryPassData` | 面板开关；首次建档 `s.annPass` 并落 `endT=now+30d`（过期自动续期）；`annDataOf()` 保证七字段类型 | `{eRet:1, anniversaryPassData:{n,vip,rd,vrd,td,dt,dv}, endtime}` |
| `buyAnniversaryPass` | 已 VIP → 4；元宝 < 300 → 4；成功扣款置 `vip=1` | `{eRet:1, note:{eco:{yuanbao}}}`（4 → getText 8845） |
| `receiveAnniversaryPassAward` | 行存在 → 未领 → `n >= row.liveness` 全过才发奖；`grantRewardList` 发 free/vip 轨；rd/vrd push **数字**行 id；**回显 id/vip** | `{eRet:1, id, vip, rewardArray, note}` |
| `getAnniversaryPassGift` | `BZ_C11.giftRows` 逐行 slice + `[8]=已购数` | `{eRet:1, giftDatas:{id:[11元数组]}}` |
| `buyAnniversaryPassGift` | 行存在 → `buys < limit` → 元宝足 → 发 award → 记 `giftBuys` → 扣价 | `{eRet:1, giftId, rewardArray, giftData:{id:新已购数}, note}` |
| `buyAnniversaryPassLiveness` | num 合法 → 钳到上限 565 → gold 足 → `n+=num` 扣 gold | `{eRet:1, n, td, note:{eco:{gold}}}` |
| `receiveAnniversaryPassTaskReward` | 行存在 → 未领 → `dv[tid] >= (type6?4:value)`（本批 dv 恒空 → 恒 notReached）→ 发 score → dt push | `{eRet:1, dt:[...], rewardArray, note}` |

**写路径纪律**：所有校验走 `annRead`（不写档），全过才 `annEnsure`（建/补结构）+ `persist()` —— 拒绝路径逐字节不动档（c11-smoke ④⑤⑨⑩ 各有断言）。

## 三、事故与修复（时间序）

1. **形状缺席事故**：首跑 gen_shapes 后 diff 只有 59 项、5 个新动作完全没进 diff。
   根因：gen_shapes 的动作集 = facts ∪ listeners ∪ **`tools\todo_shapes.json`**，新键不在登记表就不扫。
   修复：todo_shapes.json 补 5 键 → 342 动作、60 项 diff。
2. **r14 冒烟 TypeError**：r14 直接 `require core`，`BZ_C11` 未定义；`getAnniversaryPassData` 里裸写
   `parseInt(BZ_C11.durationDays)` → throw（catch 吞成 catchNoCode）。修复：改走 `annTable()` 守卫。
   **教训：handler 里引用生成模块一律过 `annTable()`，绝不裸引用 `BZ_C11`。**
3. **`ptt` TypeError**：`grantRewardList` 会写 `note.eco[k]`（:1059），我的两个发奖 handler 建的 note 漏 `eco:{}`，
   而 award 里 4003=潜能（CURRENCY_SLOTS 4003→{f:'potential',k:'ptt'}）→ `Cannot set properties of undefined`。
   修复：note 补 `eco:{}`。**教训：凡调 grantRewardList，note 必须三元 `{ivch:{},eqch:{},eco:{}}`。**
4. **R2a 红项**：`getAnniversaryPassData` 拒绝码给了 tier 1，但 else 兜底分支的提示不算专属分支 → 必须 tier 2。
   修复：改 tier 2（同 UseSnowBall/FindFriendByID 先例）。
5. **BOM 坑**：`Out-File -Encoding utf8` 带 BOM，planned 解析首行 `^value` 失配 → 60 项只覆盖 59 → 冻结会被拒。剥 `\uFEFF` 修复。

## 四、门禁终值

| 门 | 结果 |
|---|---|
| gen_c11_tables | exit 0（22/7/4/565，口径 30d·300·10） |
| shape diff | **0**（冻结 342 动作） |
| check_reject_codes | **OK 动作 103 / 条目 117 / 拒绝点 170** flow=1 |
| acceptance | **51/51 绿**，known-red 0，cap 0 |
| c11-smoke | **13/13** |
| c10-smoke（回归） | 18/18 |
| r14-catch-smoke（回归） | 3/3 |
| 设备 ver | impl=**h70337301**，selfCheck 1320，pid 22577 不变，implErr=null |

**验收**：工人 1 单（gemini-3.8-flash-low）按 8 条命令工单独立复跑 → **8/8 全过**，与主审结果逐项一致；主审抽样复核（md5/ver/diff 行）一致。

## 五、真机全链（probe_c11_flow.js，全部走客户端模型方法）

| 步 | 动作 | 实测 |
|---|---|---|
| ① | state（前） | 模型全默认（从未成功过 GET_DATA），gold=10,096,699 / yuanbao=50,446 |
| ② | open → GET_DATA | **endT 0→1795657132858**（now+30d 毫秒），面板开，七字段落模型，无 TypeError |
| ③ | gift → GET_GIFT_DATA | type 11 货架下发（无崩溃） |
| ④ | buyup → BUY_UP | **vip=1，元宝 50446→50146（-300）** |
| ⑤ | buylive:10 → BUY_LIVENESS | **n=10，gold -100** |
| ⑥ | claim:2:0 / claim:2:1 → RECEIVE_AWARD | **rd=[2] / vrd=[2]**，潜能 +110,000（4003→ptt 钱包） |
| ⑦ | buygift:1 → BUY_GIFT | **元宝 -60，发放 gold×60 + 9864×500 + 6658×20，已购 1/1**（回包 giftData 刷新已购数） |
| ⑧ | task:1 → FINISH_TASK | **notReached 2 拒绝留痕，存档不动** |

服务端日志逐条对应（`[impl] receiveAnniversaryPassAward 行 2 档 免费 → {"4003":10000}` 等）。
**存档变动全部是正常玩法结果**：消费 360 元宝 + 100 gold；获得 VIP 档、活跃 10、潜能 110,000、gold 60、9864×500、6658×20、礼包 1 已购 1 次。

## 六、回滚

| 对象 | 位置 |
|---|---|
| C11 前全套（core/test/handlers 产物/build-handlers/check_shape_freeze/golden 三件/reject-codes/两 docs） | `_backup\20261027-091400-pre-c11\`（66 文件，清单在包内 `_备份清单.txt`） |
| 形状基线 | `tools\golden\emission.json`（回滚 = 备份 golden + 重跑 gen_shapes/build + --freeze） |
| planned 审批留档 | `tools\golden\planned-archive\frozen-*.json`（本轮 7 条规则） |

## 七、未验证 / 移交

1. 真机 **UI 视觉**（面板楼块贴图、礼包图 `an_gift1..4`、倒计时文案 6007128）只验了"不崩 + 数据对"，没逐像素看。
2. `anniversary_pass_evnet` 5 行与 7 种任务 type 的计数来源未取证（ISSUE-11 11-2/11-3）。
3. `dv`/`td` 的真实玩法累计（活跃度来源结算）未做（ISSUE-11 11-1）。
4. 第 37 批的 `ANN_PASS_START_ROGUE/CHOOS_ROGUE` 未做（relations.md 归第 37 批；发送点 7912/7915、调用点 8153/8039 已抄）。
5. GET_GIFT_DATA 的真机验证只有"下发不崩"；礼包**点击购买**已在 ⑦ 验证。
