## 配置表
- tools/cfg/dump/helper.json: 行数=8, 列名=["id","name","des","pic","ani","locate","price","size_scene","size_map","speed","saveTime","task","dialogue","reward","act","show","ability"]
  - id取值: 1, 2, 3, 4, 5, 6, 7, 8
  - 前3行原文:
    - {"id":"1","name":123401,"des":12340101,"pic":"helperIcon_1","ani":"helper_1","locate":"1147,626,618|1119,359,588|1120,853,579|1118,913,664","price":0,"size_scene":0.45,"size_map":0.35,"speed":100,"saveTime":0,"task":0,"dialogue":[123401001,123401002,123401003,123401004,123401005],"reward":[],"act":[1,2,3,4,5],"show":[],"ability":[]}
    - {"id":"2","name":123402,"des":12340201,"pic":"helperIcon_2","ani":"helper_2","locate":"1147,626,618|1119,359,588|1120,853,579|1118,913,664","price":0,"size_scene":0.52,"size_map":0.42,"speed":60,"saveTime":0,"task":0,"dialogue":[123402001,123402002,123402003,123402004,123402005],"reward":[],"act":[6,7,8,9,10,54,55,56,57,58,59,60,61,62,63,64,65,66,67],"show":[],"ability":[]}
    - {"id":"3","name":123403,"des":12340301,"pic":"helperIcon_3","ani":"helper_3","locate":"1147,626,618|1119,359,588|1120,853,579|1118,913,664","price":500,"size_scene":0.45,"size_map":0.35,"speed":100,"saveTime":0.7,"task":1003001,"dialogue":[123403001,123403002,123403003,123403004,123403005],"reward":[9400,1],"act":[11,12,13,14,15,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"show":[],"ability":[]}
- tools/cfg/dump/helperAct.json: 行数=90, 列名=["id","group","type2","act","talkname","rate","type1","text"]
  - id取值(前20个): 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
  - 前3行原文:
    - {"id":1,"group":1,"type2":"0","act":"work","talkname":1,"rate":50,"type1":[5,5],"text":[6003596]}
    - {"id":2,"group":2,"type2":"0","act":"work","talkname":2,"rate":80,"type1":[5,5],"text":[6003595]}
    - {"id":3,"group":3,"type2":"0","act":"work","talkname":1,"rate":50,"type1":[2,1],"text":[6003597]}

## create.housekeeper 存档形状
- 来源: hotfix-patch/core/templates.json:1 (create.housekeeper)
- helperId: number (1)
- dueTime: null (null)
- task: object ({})
- taskArr: array ([])
- noticeArr: array ([])
- noticeIndex: number (-1)
- template: null (null)
- dispatchTime: null (null)
- dispatchEndTime: null (null)
- autoTime: number (-1)
- evaluateType: number (1)
- type: number (-1)
- taskRtm: number (1792512000000)
- noticeRtm: null (null)
- taskNum: object ({})
- mapId: number (0)
- templateInitTime: number (0)
- templateTask: object ({})
- matureArr: array ([])
- helperIdArr: array ([])
- helperRewardArr: array ([])
- e: number (0)
- tgd: object ({})
- curTime: number (1792512000000)
- canNoticeNum: number (13)

## 面板入口
- tools/scripts2.js:30185: g.default.prefabs.load("rogue/home/RogueButlerPop", cc.Prefab, function(t, o) {
- tools/scripts2.js:30939: }) : e.load("prefabs/butlerProgressUI", cc.Prefab, function(t, e) {
- tools/scripts3.js:18087: e.load("prefabs/dialogueUI", cc.Prefab, function(t, e) {
- tools/scripts3.js:18094: e.load("prefabs/delegateCompleteUI", cc.Prefab, function(t, e) {
- tools/scripts3.js:18099: } else e.load("prefabs/butlerProgressUI", cc.Prefab, function(t, e) {
- tools/scripts3.js:23111: cc.assetManager.getBundle("delegateBundle").load("prefabs/delegateUI", cc.Prefab, function(e, i) {
- tools/scripts3.js:98555: cc.assetManager.getBundle("delegateBundle").load("prefabs/delegateButlerUI", cc.Prefab, function(t, e) {

未验证段：无
范围外产出：无
