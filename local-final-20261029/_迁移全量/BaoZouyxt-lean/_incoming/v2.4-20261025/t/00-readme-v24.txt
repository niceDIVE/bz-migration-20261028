下游包 v2.4（只换 3 个文件，out/ 用你们自己的，不要覆盖）
覆盖：bz-oracle/forge/analysis/extract_shape.py、relate.py、README.md

一、C05 范围拍板：24 个，不是 26 个
  主体 15 个：照旧。
  新写 4 个：CHECK_ON_HOOK、ROGUE_SYNC_WAIT_DATA、GET_SNOW_REWARD、SNOWACTIVE
    （SNOWACTIVE=enterSnow 是进雪球面板拉数据，名字不像查询，算法 v2.4 漏了，人工补进来）
  只冒烟 5 个（当前版服务端已有 handler）：CHECK_OUT_SCHOOL、EXIT_SCHOOL、LEVEAL_SCHOOL、
    CLEAR_SXHOOL_CD、USER_GETCHATADDRESS —— 跟 QUIT_SCHOOL 退门派一起点一遍。
  这批不做：RECORD_PHONE（绑手机，无玩法）、BUY_NPC_FEEL（花钱，放它自己的批）、
    SWAP_SKILL_PROGRESS（技能，归后面的批）。冒烟时如果哪个面板因为它们卡住，再顺手补。
  原因：v2.3 把「不写档」也当成必做，可 rw 只覆盖 32 个动作，于是同面板的几乎全成了必做（142/143）。
  v2.4 改成只认名字像拉数据的，全局必做从 142 降到 58。

二、算法 v2.4 修的三处漏报（合成样例按你们给的形态复现后三处全认出）
  1 market：dispatch 跨行写 + 监听方法是 t.prototype.onShow = function + this.listData 在另一个方法里 for..in
     → 现在标「container，不能 0 兜底」。
  2 passObj：Model 存一手，UI 用 var arr = Model.passObj; arr[t][1]
     → 字段名够特别时全局按 .passObj 扫 + 一跳别名，arr[t] 变量下标算崩 → 标「缺了会崩」。
  3 getBigGrowupData：调用方在 scripts2.js 的 changePage
     → 重发判定的调用方改成跨文件找（函数名 ≥8 字符才跨文件，防误配）。
  另：for..in 遍历不再算崩（0 只是零次迭代）。

三、请回执（很短就行）
  1 extract_shape 重跑的 stdout 那行 JSON
  2 shape-hints.md 里 GetMarketList.market、passCardData.passObj、getBigGrowupData 三行在不在
  3 若还缺，跑一下：python forge/analysis/extract_shape.py --trace User.GetMarketList.market <三包>
     把 stderr 的 [trace] 行贴回来
  4 C05 的 24 个做完的结果（照旧：冒烟 + 存档 diff）

升级报告条件不变：存档被写坏；可白拿钱或白拿道具。
