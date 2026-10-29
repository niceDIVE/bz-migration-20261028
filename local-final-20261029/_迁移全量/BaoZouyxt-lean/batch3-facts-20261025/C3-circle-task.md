# Fact Report: circle_task.json cfMon Decoding

## 1. circle_task.json Structure and Raw Data

- File: F:\BaoZouyxt\tools\cfg\dump\circle_task.json
- Line count in file: 1 line (compact JSON)
- Total task rows defined in data: 21 rows (keys "1" through "21", matching rows field: 21)
- cols array verbatim:
  ["_Money","_Exp","_Potential","low_limit","limit","TalkNpc","FightNpc","Item"]
- Full raw data row for key "1" verbatim:
  "1":{"_Money":{"offset":17995,"xo":4905227751754626000,"chsm":[-1246169987],"_actIntv":[125],"_value":[18120],"tag":"cfMon"},"_Exp":{"offset":12835,"xo":1369918941207669000,"chsm":[-708630222],"_actIntv":[50],"_value":[12885],"tag":"cfExp"},"_Potential":{"offset":18752,"xo":9644370588755618000,"chsm":[-788469710],"_actIntv":[50],"_value":[18802],"tag":"cdPtt"},"low_limit":1,"limit":30,"TalkNpc":[1002,1004,1005,1026,1038,310002,310007,1006,1028,1040,1082,1007,1009,1014,1030,1039,1041,1045,310009],"FightNpc":[1004,310002,310007,1006,1028,1040,1007,1009,1014,1030,1039,1041,1045,310009],"Item":[1002,1104,1201,1204,1301,1401,2004,2103,2202,2301,2402,2503]}

## 2. Client Reads cfMon

Searched "cfMon" in:
- F:\BaoZouyxt\tools\index.js
- F:\BaoZouyxt\tools\scripts2.js
- F:\BaoZouyxt\tools\scripts3.js

Occurrences:
- F:\BaoZouyxt\tools\index.js:25152: this._Money = new n("cfMon");
- F:\BaoZouyxt\tools\scripts2.js: 0 matches
- F:\BaoZouyxt\tools\scripts3.js: 0 matches

Context and decoding flow:
- F:\BaoZouyxt\tools\index.js:21648-21656 (CFMgr table loader):
  When loading table "circle_task", each row instance is created as new o() (CircleTaskVO), then table properties are copied via m[f[y]] = g[y].
  Because g[y] is the object {"offset":17995,"xo":...,"chsm":...,"_actIntv":...,"_value":[18120],"tag":"cfMon"}, assigning m["_Money"] replaces this._Money with the raw object from JSON.
- F:\BaoZouyxt\tools\index.js:25157-25160 (CircleTaskVO getter):
  key: "Money", get: function() { return this._Money.value; }
- F:\BaoZouyxt\tools\index.js:73908-73915 (MadNumber value getter):
  get: function() {
  if (!this._value) return 0;
  if (isNaN(this._value[0])) return 0;
  this.chsm[0], this.xo;
  var t = this._value[0] - this.offset;
  Math.floor(t);
  return t;
  }
Therefore, cfMon is converted to number via this._value[0] - this.offset.
Example with row 1: 18120 - 17995 = 125.

## 3. Other Obfuscation Tags Using MadNumber

Client initializes MadNumber instances with various tag strings. Examples from F:\BaoZouyxt\tools\index.js:
- tag "cfExp": F:\BaoZouyxt\tools\index.js:25153: this._Exp = new n("cfExp");
- tag "cdPtt": F:\BaoZouyxt\tools\index.js:25154: this._Potential = new n("cdPtt");
- tag "skcost": F:\BaoZouyxt\tools\index.js:22332: this._cost = new n("skcost");
- tag "skcd": F:\BaoZouyxt\tools\index.js:22333: this._cd = new n("skcd");
- tag "cbfrd": F:\BaoZouyxt\tools\index.js:22683: this._rd = new n("cbfrd");
- tag "cfprice": F:\BaoZouyxt\tools\index.js:26000: this._Price = new n("cfprice");
- tag "cfbprice": F:\BaoZouyxt\tools\index.js:26001: this._BuyPrice = new n("cfbprice");
- tag "cidata1": F:\BaoZouyxt\tools\index.js:26002: this._data1 = new n("cidata1");
- tag "ciel": F:\BaoZouyxt\tools\index.js:26007: this._eqlv = new n("ciel");
- tag "cst": F:\BaoZouyxt\tools\index.js:26112: this._data = new n("cst");
- tag "cfQu": F:\BaoZouyxt\tools\index.js:32290: this._quantity = new n("cfQu");
- tag "dmgpct": F:\BaoZouyxt\tools\index.js:49401: this._dmgpct = new n("dmgpct");
- tag "ftdmg": F:\BaoZouyxt\tools\index.js:49402: this._dmg = new n("ftdmg");
- tag "cfskmon": F:\BaoZouyxt\tools\index.js:68533: this._SkillMoney = new n("cfskmon");
- tag "cfskPtt": F:\BaoZouyxt\tools\index.js:68534: this._SkillPotential = new n("cfskPtt");
- tag "reaAtk": F:\BaoZouyxt\tools\index.js:100891: this._atk = new n("reaAtk");

In all cases, MadNumber stores internal obfuscated array at ._value and decodes via ._value[0] - .offset.

## 4. GET_CIRCLE_TASK_LIST and CIRCLE_TASK_TASK Response Handlers

Searched in F:\BaoZouyxt\tools\index.js, F:\BaoZouyxt\tools\scripts2.js, F:\BaoZouyxt\tools\scripts3.js.

- F:\BaoZouyxt\tools\index.js:43487-43496: GET_CIRCLE_TASK_LIST callback:
  Reads:
  - o.eRet (F:\BaoZouyxt\tools\index.js:43488)
  - o.cNum (F:\BaoZouyxt\tools\index.js:43489) -> assigned to t.entrustNum
  - o.taskArr (F:\BaoZouyxt\tools\index.js:43493) -> passed to showHangTaskUI(o.taskArr)

- F:\BaoZouyxt\tools\index.js:43533-43540: CIRCLE_TASK_TASK callback:
  Reads:
  - o.eRet (F:\BaoZouyxt\tools\index.js:43534)
  - o.rewardObj (F:\BaoZouyxt\tools\index.js:43538) -> passed to u.default.addShowRewardUI1(o.rewardObj, 0)
  Also reads instance property t.curTarget (F:\BaoZouyxt\tools\index.js:43536).

## 5. Value Decoding Formula

- Verbatim code line:
  F:\BaoZouyxt\tools\index.js:73912: var t = this._value[0] - this.offset;
- Formula:
  decoded_value = obj._value[0] - obj.offset
