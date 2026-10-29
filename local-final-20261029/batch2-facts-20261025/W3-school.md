# W3-school fact table

| action | wireName | sendSite | reqKeys | recvSite | recvFields | eRet | tables | currency | notes |
|---|---|---|---|---|---|---|---|---|---|
| QUIT_SCHOOL | User.quitSchool | index.js:114050 | NONE | index.js:113585 | NONE | NONE (empty callback function body: t.prototype.onQuitSchool = function() {}) | sect_level.json | NONE | Sent via NetMgr.http.sendRequest in SchoolModel.prototype.reqQuitSchool at index.js:114049. Callback is empty at index.js:113712. |
| BUY_NPC_FEEL | User.BuyNpcFeel | index.js:77984 | npcid | index.js:77837 | eRet | 1: setNcpIntimacy(this.npcId; 10); 2: Alert show text 1100 | NONE | NONE | Sent via NetMgr.http.sendRequest in MasterModel.prototype.addNpcIntimacy at index.js:77982. Callback is buyFellCallBack at index.js:77935. |
| CLEAR_SXHOOL_CD | User.clearGeSchoolClothing | index.js:77881 | school | index.js:77840 | eRet | 1: Alert show text 6001029 with button 6001032; 5: Alert show text 9223 | NONE | NONE | Sent via NetMgr.http.sendRequest in MasterModel.prototype.joinSchoolCallBack at index.js:77881. Callback is onClearCDSchool at index.js:77847. |
| LEVEAL_SCHOOL | User.OutSchool | index.js:78011 | npcID | index.js:77838 | eRet, clearBoxs, npcID, textArr, rewardArray, oldSchool, npcIDArr, isSeniorSchool, CDTime, serverTime, skillId | 1: remove clearBoxs; play OutSchoolPic or GoodEvilCareerUI; update outSchoolAy; remove npcIDArr from RoleBaseInfo.masters; clear goodEvilCamp if isSeniorSchool; checkTaskIsClear; 5: outSchoolCondition; 6: compute CD countdown and show outSchoolCondition; 7: Alert show text 6372 | NONE | NONE | Sent via NetMgr.http.sendRequest in MasterModel.prototype.checkChuMasterState at index.js:78011. Callback is levealSchoolCallBack at index.js:77894. |
| CHECK_OUT_SCHOOL | User.CheckOutSchool | index.js:78018 | roleID, npcID | index.js:77839 | npcID, eRet, CDTime, serverTime, skillId | 6: compute CD countdown and show outSchoolCondition; else: verify finishTaskObj/requireTaskObj and checkOutSchool conditions; open TaskFrameWork or PlayCartoonUI or show outSchoolCondition | NONE | NONE | Sent via NetMgr.http.sendRequest in MasterModel.prototype.checkChuMasterState at index.js:78018. Callback is onCheckOutSchool at index.js:78020. |
| EXIT_SCHOOL | User.exitSchool | index.js:77978 | npcID, taskArr | index.js:77836 | npcIDArr | removes npcIDArr entries from RoleBaseInfo.masters; shows text 836 (plus 947 if deleteTask.length > 0); deletes deleteTask entries via deleteErrorTask | NONE | NONE | Sent via NetMgr.http.sendRequest in MasterModel.prototype.betrayMasterMsg at index.js:77978. Callback is exitSchoolCallBack at index.js:77889. |

## Additional Tasks
### A. QUIT_SCHOOL onQuitSchool Dialog Confirmation Text
- In SchoolModel (index.js:113712), onQuitSchool is an empty stub function: 	.prototype.onQuitSchool = function() {};.
- It does not show any popup dialog or confirmation prompt.
- However, in MasterModel.prototype.betrayMasterMsg (index.js:77963, which sends EXIT_SCHOOL), a confirmation dialog is prompted before exit: p.RoleOtherInfo.isUntie ? n.default.show(l.getText(6372)) : n.default.show(l.getText(6114), [{flag: 0, name: l.getText('332')}, {flag: 1, name: l.getText('333')}], ...) where text ID 6114 represents the confirmation text to betray/quit the master (pinyin: 'que ding yao tui chu men pai ma').
- Also in SchoolSquareModel.prototype.reqQuitSchoolSquare (index.js:114451), it prompts p.default.show(i.getText(7596), [{flag: 0, name: i.getText('579')}, {flag: 1, name: i.getText('580')}], ...) before sending QUIT_SCHOOL_SQUARE.

### B. Local Fields Cleared by QUIT_SCHOOL Callback
- QUIT_SCHOOL receiving callback 	.prototype.onQuitSchool = function() {}; at index.js:113712 is an empty function.
- It clears NO local fields on receipt (NONE).
- Contrast with EXIT_SCHOOL callback exitSchoolCallBack at index.js:77889 which removes e.npcIDArr from RoleBaseInfo.masters and deletes tasks from RoleBaseInfo.finishTaskObj via deleteErrorTask.
- Contrast with LEVEAL_SCHOOL callback levealSchoolCallBack at index.js:77894 which removes o.npcIDArr from RoleBaseInfo.masters, clears RoleBaseInfo.goodEvilCamp = 0, RoleBaseInfo.goodEvilPrestige = 0, RoleBaseInfo.goodEvilContribution = 0 (if isSeniorSchool), and calls checkTaskIsClear.

### C. Storage and Client Read Sites for School Contribution and Sect Skill
- School Contribution:
  Stored in: SchoolModel.prototype.schoolTaskData.schoolContribution (a dictionary mapping schoolId to an array [contribution, popularity, roleSchoolLevel]).
  Read sites: index.js:113645, index.js:113661, index.js:113674, scripts2.js:44646, scripts2.js:44942, scripts2.js:58789.
  Good/Evil School Contribution is stored in RoleBaseInfo.goodEvilContribution (defined at index.js:106005, reset at index.js:77919, read at index.js:133412).
- Sect Skill (School Skills):
  All skills are stored globally in SkillTable.dic (mapping skillId to {lv, pgr, brlv}, initialized at index.js:119994).
  Sect affiliation for a skill is stored in the skill configuration table under skill.menpai (read e.g. at index.js:114221 via ar s = n.getItem(l[a].id, 'skill'); this.isInArray(s.menpai, this.othenSchool)).
  Read sites: index.js:114199, index.js:114221, scripts2.js:50080 (ar e = p.SkillTable.dic), scripts2.js:14014, scripts3.js:5228.

### D. sect_level.json and sect_seat.json Inspection
- F:\\BaoZouyxt\\tools\\cfg\\dump\\sect_level.json:
  Top-level keys: cols, data, name, rows
  Line count: 1 (single-line JSON containing 9 data rows)
- F:\\BaoZouyxt\\tools\\cfg\\dump\\sect_seat.json:
  Top-level keys: cols, data, name, rows
  Line count: 1 (single-line JSON containing 80 data rows)

## UNCONFIRMED
NONE
