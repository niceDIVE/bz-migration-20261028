# C12〔管家/帮手〕第 13 批 · 执行记录（2026-10-27）

> 上游文档：`C12-c12-取证与策略.md`、`主审-独立探针记录.md`、`工单-第13批C12-20261027.md`。
> 拍板四项（用户 2026-10-27）：①并入 `GET_HOUSE_KEEPER` ②加 `SET_TEMPLATE_DATA`+`RECEIVE_NOTICE`（评价 3 键+奖励领取沉底）③档 A ④价格自定：helper.price 照表按元宝扣、月卡 300 元宝/30 天。

---

## 一、交付物清单

| 文件 | 性质 | 内容 |
|---|---|---|
| `tools\gen_c12_tables.js` | 新增 | 生成器：helper 8 行（price/task/reward/saveTime/act）+ **locateScenes 白名单** |
| `hotfix-patch\core\bz-c12.generated.js` | 产物 | 1,226 B：BZ_C12（口径 vipDays=30/vipPrice=300/vipType=1/dispatchMinutes=30 + locateScenes [1118,1119,1120,1147]） |
| `hotfix-patch\core\bz-rpc-server.js` | 修改（4 处插入） | 助手 `hkRead/hkEnsure/hkDataOf/hkTable/hkOwned` + **10 handler** + REJECT_CODES 10 + REJECT_ALLOW 10 |
| `hotfix-patch\build-handlers.js` / `tools\check_shape_freeze.js` | 修改 | 接入 bz-c12.generated.js（两处都接） |
| `tools\todo_shapes.json` | 修改 | +10 键 |
| `tools\facts\reject-codes.json` | 修改 | +10 条（tmp_add_reject_c12.js；buyMonthlyFee 双码 2/4、dispatch 双码 2/5） |
| `tools\golden\emission.json` | 重新冻结 | **352 动作**（342+10）；98 项 diff 由 10 条 planned 规则覆盖，后 dispatch 攤 30 项重冻 |
| `hotfix-patch\test\c12-smoke.js` | 新增 | 13 条全绿（含非法 mapId 用例） |
| `hotfix-patch\patch\live\handlers.js` | 产物 | 1,586,148 B |

**线上 ver = `he39800b9`**（原 h70337301），selfCheck **1357** 全过，pid 22577 不变。

## 二、10 个 handler 要点（档 A）

| 键 | 实现 | 回包要点 |
|---|---|---|
| `getHousekeeper` | hkEnsure 补 22 字段（undefined 才补，null 合法不覆盖）+ curTime=now | `{eRet:1, housekeeper:整段深拷贝}` |
| `buyHelper` | id 在表 → 已拥有幂等成功（不重复扣）→ 元宝够（照表价）→ helperIdArr.push | 成功带 housekeeper+note.eco.yuanbao；拒一律 4（客户端开充值框） |
| `setHelper` | hkOwned（免费或已购）→ helperId 落档 | 拒 2（6000506） |
| `callHelperId` | hkOwned → housekeeper.e = id（客户端 followId 裸读字段 23237） | 拒 2（静默） |
| `getHelperCallList` | callData 8 项映射：跟随者=3 其余=1（自定口径；UI 按 price<=0\|\|checkBought 自过滤 20107） | 拒 2（静默） |
| `dispatch` | **mapId ∈ locateScenes 校验**（真机崩点，见 §三）→ 派遣落档（taskArr/mapId/dispatchTime/dispatchEndTime=now+30min）→ 坏存量 mapId 允许覆盖（自愈通道） | 成功带 housekeeper+**note 四键含 eco.yuanbao（23125 裸读）**；忙 → 5；badMap → 2 |
| `dispatchAward` | 无派遣/未到 → 3（1530）；到点 → helper.reward 照表发放 → 清派遣态（天然防重） | 成功带 housekeeper/rewardArray/addEvil:0 |
| `buyMonthlyFee` | type=1 → 已开通未到期 2（6000402）→ 元宝够 → dueTime=now+30d | 拒 4 走 8845 兜底 |
| `setTemplateData` | autoTime≥0 → 存 template/autoTime/mapId/templateInitTime | 拒 2（6000332） |
| `receiveNotice` | 档 A 无通知内容恒 1 no-op；**eventType:0 必带**（23198 裸读）；★非 1 → 客户端 dataDestroy | — |

写路径纪律同 C11：校验走 hkRead，全过才 hkEnsure+persist；拒绝路径逐字节不动档（smoke ③④⑦⑨ 各有断言）。

## 三、真机抓到的真崩与修复（★本场最值钱）

1. **`createRoute3` 每帧崩**：真机派遣成功（mapId=1008，客户端当前场景）后，`DelegateMgr.startDelegate → createRoute3`
   **每帧**抛 `Cannot read property '0' of null`（index.jsc:22681）——管家的路线配置只存在于
   `helper.locate` 列出的 4 个场景（1147/1119/1120/1118），1008 查不到 → null[0]。
   **修复**：生成器提炼 `locateScenes` 白名单 → dispatch 校验 mapId，不合法回 2（6000371）；
   另设**自愈通道**：存量派遣态 mapId 不合法时允许覆盖重派（award 有 30 分钟时间闸，否则崩无法解除）。
   真机复验：`dispatch:1147` 覆盖成功 → **崩溃循环停止**（5 秒无新 err）。
2. **构建期拒绝码漂移**：`buyMonthlyFee.badType` core=2 / JSON=4 → 双向比对红。对齐为双码（2=badType/alreadyActive tier 1；4=default/insufficient tier 2）。
3. **planned 脚本漏 META**：tmp_planned_c12.js 忘写 setTemplateData → 规则没落盘 → 冻结被拒（C10 冻结前校验按设计工作了）。

## 四、门禁终值

| 门 | 结果 |
|---|---|
| gen_c12_tables | exit 0（8 管家，price 0/0/500/1000/99999999×3/2000） |
| shape diff | **0**（352 动作冻结） |
| check_reject_codes | **OK 动作 113 / 条目 129 / 拒绝点 190** flow=1 |
| acceptance | **52/52 绿**（c12-smoke 13 条收编） |
| c12-smoke | **13/13** |
| c10/c11/r14 回归 | 18/18、13/13、3/3 |
| 设备 ver | impl=**he39800b9**，selfCheck 1357，pid 22577 不变，implErr=null |

**验收**：工人 1 单 9 条命令独立复跑（结果见 `verify-c12-worker.md`）+ 主审抽样复核。

## 五、真机全链（probe_c12_flow.js）

| 步 | 动作 | 实测 |
|---|---|---|
| ① | state（前） | helperId=1 / helperIdArr=[] / dueTime=null（create 模板即默认），yuanbao=50,086 |
| ② | open → getHousekeeper | 面板数据下发，模型无变化（本就默认态），无 TypeError |
| ③④ | buy:3 | **-500 元宝 → helperIdArr=[3]** |
| ⑤⑥ | set:3 → call:3 | **helperId=3 → followId=3**（housekeeper.e 落模型） |
| ⑦ | dispatch（mapId=1008） | 服务端成功 → **客户端 createRoute3 每帧崩（真机崩溃，见 §三.1）** |
| ⑧ | 部署修复版 → dispatch:1008 | 正确拒绝 2（校验生效） |
| ⑨ | dispatch:1147（自愈通道） | **覆盖成功 → 崩溃循环停止**（日志 5 秒无 err） |
| ⑩⑪ | vip → 月卡 | **dueTime=now+30d，-300 元宝** |
| ⑫⑬ | tpl → notice | 落档 / no-op（noticeId=0） |

**存档变动全部是正常玩法结果**：消费 800 元宝（买管家 500 + 月卡 300）；获得 3 号管家（拥有+跟随）、月卡 30 天、派遣进行中（1147 场景，约 30 分钟后可领 helper.reward=[9400,1]）。

## 六、回滚

| 对象 | 位置 |
|---|---|
| C12 前全套（core/test/handlers/build/check_shape_freeze/**todo_shapes**/golden 三件/reject-codes/两 docs） | `_backup\20261027-102337-pre-c12\`（69 文件 3,690,579 B） |
| 形状基线 | `tools\golden\emission.json`（352 动作） |
| planned 留档 | `tools\golden\planned-archive\frozen-*.json`（本轮 10+1 条规则） |

## 七、未验证 / 移交（→ ISSUE-12）

1. 评价 3 键（GET/PUSH_EVALUATE_DATA）与 RECEIVE_HELPER_REWARD 沉底——二级面板按钮点了走静默兜底（真机未点验）。
2. `callData` 状态语义（2/3 的确切含义）是自定口径（3=跟随，1=可呼叫），原版语义未取证。
3. 档 B（真实派遣任务系统：任务生成/tgd/taskNum/matureArr）未做；`createAutoDispatchTime` 内部逻辑未读。
4. `helper.task`（1003001 等任务表 id）与 `RECEIVE_HELPER_REWARD` 的奖励链未取证。
5. 管家按钮的入口可达性（哪个场景 UI、有无前置）未验；delegateUI 的视觉表现未逐像素看。
6. 月卡 `{type}` 是否还有别的值（type=2?）未取证——只认 1，其它回 2。
