下游包 v2.5（只换 2 个文件：extract_shape.py、README.md；out/ 用你们自己的）

一、C05：验收通过，不用再动
  12 个新写 + 拒绝路径全过，没看到白拿钱/白拿道具或写坏存档的路径。
  自己发现并修好的 note.eco 那个 bug，处理得对。
  卡住的 5 条处理：
  1 雪球 UI 没走到：不阻塞。下次进游戏顺路走到雪人 NPC 点一下就行。
  2 useItemAddition 的物品 id（问题 A）：不用等上游，客户端自己会告诉你。
     在客户端搜 reqAddBreakRate 的调用处，往上几行一般有「背包里这个道具有几个」的判断
     （getItemNum(xxx) / bag[xxx] / ItemModel...(xxx)）或面板上显示的道具图标 id——那个数就是答案，
     把 AID=176 换掉。找不到就保留 176，眼下 eRet:5 不白给，不算漏洞。
     备注：item.json 是截断导出（6525 行只留了 3000 行），表里查不到 176 不代表它不存在。
  3 rgUseItem 不出 buff：先这样，放到肉鸽那批一起补。
  4 雪球奖励口径（问题 B）：就按现在的 consolationprize / square_ball 最高档，效果像就行，不用改。
  5 退门派保留贡献：保留。已看过 joinSchool 不发贡献，退了再进刷不出钱。

二、算法：你们第三节的判断对
  合成样例里这两个契约有 fields，你们的 contracts.json 里是空的（命名处理器 this.onGetPassCardData /
  this.bigGrowupDataCallback.bind 没展开），所以一行 trace 都没有。v2.5 修了：
  - fields 为空时自己展开回调抽字段（会抽出 passCard、growObj 等）
  - --trace 现在会打「契约字段 / 补抽 / 发送点 / 重发判定」
  - 全局兜底多追一跳传参：showInviteActionUI(this.data.passObj) → 看形参在函数里怎么用
  passObj 是 (c)：服务端确实在发，但客户端回调里没直接读，是「整包存进 this.data，别处再读 this.data.passObj」。
  这种整包转手 v2.5 也够不到，所以 approved-widening.json 里那条人工登记就是正解，留着。
  v2.4 的 unsafe 从 9 涨到 132，估计有不少误报（变量下标那条规则比较宽）。只在写兜底应答时参考，不用逐条核。

三、请回执（短）
  1 v2.5 extract_shape 的 stdout JSON
  2 跑两条 trace 贴回 [trace] 行：
     --trace User.passCardData
     --trace User.getBigGrowupData
  3 第 3 批 C02「任务主线」按 relations.md 开做（tasknew / circle_task；circle_task 数值先按客户端解码）

升级报告条件不变：存档被写坏；可白拿钱或白拿道具。
