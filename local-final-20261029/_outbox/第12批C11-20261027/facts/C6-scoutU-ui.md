# 周年通行证面板与入口侦察报告

## Q1 面板与入口
- 面板打开点（scripts3.js:7831-7835）：
  `Line 7831: r.default.prefabs.load("activeUI/anniversary/AnniversaryMainUI", cc.Prefab, function(t, e) {`
  `Line 7832: var o = cc.instantiate(e);`
  `Line 7833: o.addComponent("AnniversaryMainUI");`
  `Line 7834: s.PopUpMgr.addPopUp(o);`
- 触发来源（scripts3.js:7819）：
  `Line 7819: i.MessageCenter.on(a.HttpConst.ANN_PASS_GET_DATA, function(e, o) {`
- 发送请求（scripts3.js:7893-7895）：
  `Line 7893: t.prototype.reqGetAnnPassData = function() {`
  `Line 7894: c.NetMgr.http.sendRequest(a.HttpConst.ANN_PASS_GET_DATA);`
  `Line 7895: };`
- 上层调用按钮（scripts2.js:29878-29879, 30996-31003）：
  `Line 29878: this.anniBtn = this.getPathByNode("UINode/upperContainer/leftAll/leftNormal/AnniButton");`
  `Line 29879: this.addButtonListen(this.anniBtn, this, this.onClickAnniBtn);`
  `Line 30996: o.prototype.onClickAnniBtn = function() {`
  `Line 30997: h.MessageCenter.dispatch(f.EvName.STOP_PLAYER);`
  `Line 30998: Promise.resolve().then(function() {`
  `Line 30999: return t("../../../scripts3/model3/AnniversaryModel");`
  `Line 31000: }).then(function(t) {`
  `Line 31001: t.AnniversaryModel.reqGetAnnPassData();`
  `Line 31002: });`
  `Line 31003: };`
- 结论：面板由 scripts3.js:7831 加载并打开，入口在 scripts2.js:29878 的 AnniButton 按钮（点击后调用 scripts2.js:31001 的 t.AnniversaryModel.reqGetAnnPassData()）。

## Q2 BUY_LIVENESS 入口
- scripts3.js 第 7858-7870 行附近模型响应与方法定义：
  `Line 7858: i.MessageCenter.on(a.HttpConst.ANN_PASS_BUY_LIVENESS, function(e, o) {`
  `Line 7906: t.prototype.reqBuyAnnPassLiveness = function(t) {`
  `Line 7907: c.NetMgr.http.sendRequest(a.HttpConst.ANN_PASS_BUY_LIVENESS, {`
  `Line 7908: num: t`
  `Line 7909: });`
  `Line 7910: };`
- 方法名：reqBuyAnnPassLiveness
- 全文 grep 检索命中点：
  - scripts2.js: 0 命中
  - scripts3.js: 共 2 处命中（行 7906 定义，行 18448 调用）
  `Line 18448: h.AnniversaryModel.reqBuyAnnPassLiveness(t.itemNum);`
- 调用点上下文（scripts3.js:18348, 18432-18451 属于 BuyItemUI29 弹窗购买确认）：
  `Line 18348: cc._RF.push(e, "71d8a7xuZNHkIiRZXcOJZdl", "BuyItemUI29");`
  `Line 18432: e.prototype.onBuyClick = function() {`
  `Line 18448: h.AnniversaryModel.reqBuyAnnPassLiveness(t.itemNum);`
- 弹窗触发点（scripts3.js:7437-7438, 7762-7764）：
  `Line 7437: e.prototype.onClickBuyBtn = function() {`
  `Line 7438: g.default.addBuyItemUI({}, 29);`
  `Line 7762: e.prototype.onClickBuyBtn = function() {`
  `Line 7763: v.AnniversaryModel.liveness >= this._maxNum ? a.default.show(h.getText(6016349)) : I.default.addBuyItemUI({}, 29);`
- 结论：非 0 命中，UI 入口存在于 scripts3.js:18448（BuyItemUI29 弹窗购买按钮，由 AnniversaryMainUI:7763 与 AnniversaryBuildingUI:7438 点击购买按钮弹出）。

## Q3 第37批两键
- ANN_PASS_START_ROGUE（scripts3.js:7865, 7912）：
  `Line 7865: i.MessageCenter.on(a.HttpConst.ANN_PASS_START_ROGUE, function(t, e) {`
  `Line 7912: c.NetMgr.http.sendRequest(a.HttpConst.ANN_PASS_START_ROGUE);`
  调用点（scripts3.js:8153，AnniversaryTaskUI 内）：
  `Line 8153: (6 == o.type ? i >= 4 : i >= o.value) ? l.AnniversaryModel.reqFinishTask(e) : 6 == o.type && (i > 0 ? d.RogueModel.historyEnter() : l.AnniversaryModel.reqStartAnnRogue());`
- ANN_PASS_CHOOS_ROGUE（scripts3.js:7872, 7915）：
  `Line 7872: i.MessageCenter.on(a.HttpConst.ANN_PASS_CHOOS_ROGUE, function(t, e) {`
  `Line 7915: c.NetMgr.http.sendRequest(a.HttpConst.ANN_PASS_CHOOS_ROGUE, {`
  调用点（scripts3.js:8039，AnniversaryRogueUI 内）：
  `Line 8039: if (this._curIdx == e) p.AnniversaryModel.reqChooseAnnRogue(e); else {`
- 结论：ANN_PASS_START_ROGUE 发送点在 scripts3.js:7912（调用点 scripts3.js:8153）；ANN_PASS_CHOOS_ROGUE 发送点在 scripts3.js:7915（调用点 scripts3.js:8039）。

## 未验证段
- scripts3.js 中 anniversary_pass 相关的具体配表（如 anniversary_pass_award, anniversary_pass_task, anniversary_pass_liveness）具体字段配置未在此任务展开。
- 运行时客户端与服务端的实际发包与回包状态未做动态拦截验证。

## 范围外产出
- 无（仅创建本侦察报告文件，未动用任何非只读指令与多余文件）。
