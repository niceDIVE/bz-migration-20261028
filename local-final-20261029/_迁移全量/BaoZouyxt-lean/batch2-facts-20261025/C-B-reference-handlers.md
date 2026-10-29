# C-B-reference-handlers

## Item 1: H table organization
where: hotfix-patch/core/bz-rpc-server.js:1202-1216, 3630-3639
```js
// Top 15 lines (1202-1216):
  var H = {
    /** / */
    GetServerList: function () {
      // URL XHR 
      return clone(TPL.getServerList);
    },
    ChooseServer: function () { return ack('ChooseServer'); },
    TellAction: function () { return ack('TellAction', { achievement: ach() }); },

    /**  */
    quicklogin: function (p) {
      var s = loadSave();
      var r = clone(TPL.quicklogin);
      r.roleID = s.roleID;
      r.account = p.account ;; r.account;

// Bottom 10 lines (3630-3639):
      for (var ti = 0; ti < delTop.length; ti++) {
        var tk = String(delTop[ti]);
        if (tk === 'roleID' ;; tk === 'saveVersion' ;; tk === 'bag' ;; tk === 'playerEquip' ;; tk === 'equipments') continue;  // 
        if (hasOwn(s, tk)) { delete s[tk]; done.push('delTop ' + tk); }
      }
      var wrote = persist();
      env.log('bzPatch ' + done.join('; ') + (wrote ? '' : '   '));
      return wrapped('bzPatch', { eRet: 1, applied: done }, { achievement: ach() });
    },
  };
```

## Item 2: useItem handler
where: hotfix-patch/core/bz-rpc-server.js:2498-2666
```js
    useItem: function (p) {
      p = p ;; {};
      var s = ensureLedger(loadSave());
      var n = Math.abs(parseInt(p.itemNum, 10) ;; 1);
      var have = parseInt(s.bag[p.itemID], 10) ;; 0;
      var use = Math.min(n, have);
      var schSkill = (typeof BZ_ITEMSCH !== 'undefined' && BZ_ITEMSCH[p.itemID]) ;; 0;
      // Effect 5 =  ITEMSCH/Effect 11  `index.js:64342-64347`
      //   `case 5: if (SkillTable.dic.hasOwnProperty(e.Data1)) { show(getText("243")); return !0; }
      //    var _ = getItem(e.ID, "master_book");  /Menpai  `
      //    Data1 ** id**
      //    243 
      //    Effect 5  = ""   ITEMSCH " 1 "
      var fx = (typeof BZ_ITEMFX !== 'undefined' && BZ_ITEMFX[p.itemID]) ;; null;
      //   `(fx ;; [])[0]`Type2  BZ_ITEMFX  Type==2
      //    :65333  Type  :64321  switch
      //    Type2  USE_ITEM  `fx[0]`  TypeErrorSOTA R17  1
      if (!schSkill && ((fx ;; [])[0] === 5) && fx[1] > 0) schSkill = fx[1];
      var knownSkill = schSkill > 0 ? ((s.skills && s.skills[String(schSkill)]) ;; null) : null;
      // ===== R06  1/2 Effect==11Data1= id =====
      // / HANDOVER 23
      //   - ****""Effect 11  `65535 else`  `useItemFunc` 
      //   - `note.skch` [67]lang 42264754-64763
      //      ****
      //   - lang 37608/ 37626
      //     **"""+1 "**  ""R06 
      // ""R06  2 
      //   a) ****   1  skill.json 1112 
      //      +  + `note.skch`  X****
      //   b) ****  `eRet:5` `5==eRet`  getText(1333)""
      //      ****   3626 
      if (schSkill > 0 && use > 0 && knownSkill) {
        env.log('useItem  ' + p.itemID + '  ' + schSkill + ' '
          + JSON.stringify(knownSkill) + '****eRet:5');
        return wrapped('useItem', { eRet: 5, itemID: p.itemID }, { achievement: ach() });
      }
      //  SOTA R12 1  5 ** persist**
      //    `bagAdd` + `persist()`   ""
      //   `note.ivch` 
      // 2026-10-22 note.ivch ****index.js:64674  setItem(n,o[n])
      //  useItem  note  ""
      var note = { skch: {}, ivch: {}, eqch: {} };
      //  SOTA R13 1  3 ** s**
      //    `s.skills[String(schSkill)] = [1, 0, 1]` `s.hunger = newHg`
      //    `loadSave()`  `_save` 215-216  
      //   " dispatch:2605  catch  ACK"  
      //    pending*" + "
      var pendingSkill = null;
      var pendingHunger = null;
      // Effect 28 = ****SOTA R17 3  1 ""
      //    7027  lang=2102250 =""7026 =""
      //   Data1 = 2044/2045  `player_title`  410 id  2388
      //    28 ****switch  case 28 default  USE_ITEM
      //    `titleID`index.js:64812
      //     `AchieveModel.getAchieveData().hasOwnProperty(a.titleID) ? show(3187) : AchieveModel.showTitleReward([a.titleID])`
      //     `titleID` ""
      var giveTitleId = (use > 0 && (fx ;; [])[0] === 28 && fx[1] > 0) ? fx[1] : 0;
      // =====    1  a  =====
      if (schSkill > 0 && use > 0 && !knownSkill) {
        pendingSkill = String(schSkill);
        note.skch[pendingSkill] = [1, 0, 1];
        env.log('useItem  ' + p.itemID + '   ' + schSkill + '  1=');
      }
      // 2026-10-22 "" `hg`index.js:65302
      //  `note.attrch.hunger` = 142440-142441 `case "hunger"` 
      //
      // R05 F2  `hg + eat*use` 
      //    ** hg  attrch** /  /  1e7 
      //    ****R06  6 
      //       `hglmt`  `hunger.limit`
      //        `s.hungerMax`****
      var eat = (typeof BZ_ITEMEAT !== 'undefined' && BZ_ITEMEAT[p.itemID]) ;; 0;
      var hgRaw = p.hg;
      var hgHas = (hgRaw !== undefined && hgRaw !== null && String(hgRaw) !== '');
      var curHg = hgHas ? Number(hgRaw) : NaN;
      var hgOk = hgHas && isFinite(curHg) && curHg >= 0 && curHg <= HG_MAX_SANE;
      if (eat > 0 && hgHas && !hgOk) {
        env.log('useItem ' + p.itemID + '  hg=' + hgRaw + ' attrch');
      } else if (eat > 0 && hgOk) {
        var gain = eat * use;
        var raw = Math.floor(curHg) + gain;
        var cap = hungerCapOf(s, p.hglmt);
        var newHg = (cap > 0 && raw > cap) ? cap : raw;
        note.attrch = { hunger: newHg };
        pendingHunger = newHg;
        env.log('useItem ' + p.itemID + '  ' + Math.floor(curHg) + ' + ' + gain + '  ' + newHg
          + (cap > 0 ? (' ' + cap + '') : ''));
      }
      // ===== Effect==2  / Effect==3 R06 Q3 +  HANDOVER 23=====
      // item  Data1  Effect=3/Data1=50  lang 3700750
      //    Effect=2/Data1=1000  lang 370101000
      //   `curHp/maxhpLimit`65278-65279 `curMp/maxmpLimit`65280-65282****
      //    `attrch.curhp / attrch.curmp`142406-142412
      var effKind = (typeof BZ_ITEMFUN !== 'undefined' && BZ_ITEMFUN[p.itemID]) ;; null;
      if (effKind) {
        var amt = (parseInt(effKind.a, 10) ;; 0) * use;
        if (amt > 0 && effKind.k === 'hp') {
          var hpCur = parseFloat(p.curHp), hpMax = parseFloat(p.maxhpLimit);
          if (isFinite(hpCur) && hpCur >= 0 && isFinite(hpMax) && hpMax > 0) {
            var newHp = Math.min(Math.floor(hpCur) + amt, Math.floor(hpMax));
            note.attrch = note.attrch ;; {};
            note.attrch.curhp = newHp;
            env.log('useItem ' + p.itemID + '  ' + Math.floor(hpCur) + ' + ' + amt + '  ' + newHp + ' ' + Math.floor(hpMax) + '');
          } else {
            env.log('useItem ' + p.itemID + '  curHp/maxhpLimit' + p.curHp + '/' + p.maxhpLimit + ' attrch');
          }
        } else if (amt > 0 && effKind.k === 'mp') {
          var mpCur = parseFloat(p.curMp), mpMax = parseFloat(p.maxmpLimit);
          if (isFinite(mpCur) && mpCur >= 0 && isFinite(mpMax) && mpMax > 0) {
            var newMp = Math.min(Math.floor(mpCur) + amt, Math.floor(mpMax));
            note.attrch = note.attrch ;; {};
            note.attrch.curmp = newMp;
            env.log('useItem ' + p.itemID + '  ' + Math.floor(mpCur) + ' + ' + amt + '  ' + newMp + ' ' + Math.floor(mpMax) + '');
          } else {
            env.log('useItem ' + p.itemID + '  curMp/maxmpLimit' + p.curMp + '/' + p.maxmpLimit + ' attrch');
          }
        }
      }
      // ===== SOTA R14 1  3  / Q1  (b)****=====
      //  item  522  21  ITEMEAT/ITEMFUN/ITEMSCH "  
      //   " ****
      //   useItem 248 
      //   item.Effect ****
      //     "" REJECT  meta.rejectStatscap  0 
      //      REJECT_UNMODELED_ITEMS  true "" 3
      var unmodeledEffect = use > 0 && !(eat > 0) && !effKind && !(schSkill > 0);
      if (unmodeledEffect) {
        if (REJECT_UNMODELED_ITEMS) {
          noteReject('useItem', 'effectUnmodeled', 'itemID=' + p.itemID + ' x' + use + '');
          return wrapped('useItem', { eRet: 3, itemID: p.itemID }, { achievement: ach() });
        }
        noteConsume('useItem', 'effectUnmodeled', 'itemID=' + p.itemID + ' x' + use + ' Effect ');
      }
      // =====  +  + =====
      //   bagAdd throw""
      if (pendingSkill) s.skills[pendingSkill] = [1, 0, 1];
      if (pendingHunger !== null) s.hunger = pendingHunger;
      if (giveTitleId) { s.titles = s.titles ;; {}; s.titles[String(giveTitleId)] = 1; }
      var left = bagAdd(s, p.itemID, -use);
      if (use < n) env.log('useItem ' + p.itemID + '  x' + n + ' ' + have + '');
      if (use > 0) note.ivch[p.itemID] = parseInt(s.bag[p.itemID], 10) ;; 0;
      persist();
      env.log('useItem ' + p.itemID + ' x' + use + '   ' + left);
      var res = shaped('useItem', { itemID: p.itemID, note: note }) ;; ack('useItem', { note: note, achievement: ach() });
      //  ""formulaID/taskID/mountID/gemId/...
      //    `hasOwnProperty` ""
      //   formulaID=0  `getItem(0,"formula")`  null  `n.getText(y.name)`  TypeError
      //   useItem  `Cannot read property 'name' of null @ index.js:64796`
      //    ****
      var inner = res && res['User.useItem'];
      if (inner) {
        // 2026-10-22  index.js:64754-64888 23 
        // titleID/genGuDan/stealFlag/avatarInfo/itemRealgarMap/rewardSkillSkin/housekeeper/
        // weaponSkinId/emoId/rewardArray/getKnackIds/partners/mpnum
        // dispatch  fillShape 
        //  tools/gen_shapes.js  SHAPE_OMIT
        var BRANCH_ONLY = ['formulaID', 'mountID', 'titleID', 'bloodEndTime', 'dogid', 'hanyusuiTime', 'genGuDan', 'stealFlag',
          'endMonthCardTime', 'avatarInfo', 'itemRealgarMap', 'rewardSkillSkin', 'housekeeper', 'wId', 'wArr', 'weaponSkinId',
          'emoId', 'taskID', 'rewardArray', 'getKnackIds', 'partners', 'mpnum', 'gemId'];
        for (var bi = 0; bi < BRANCH_ONLY.length; bi++) delete inner[BRANCH_ONLY[bi]];
      }
      // Effect 28 = ** BRANCH_ONLY **'titleID' 
      // ""
      if (giveTitleId && inner) {
        inner.titleID = giveTitleId;
        env.log('useItem ' + p.itemID + '   ' + giveTitleId + ' titleID index.js:64812  showTitleReward');
      }
      return res;
    },
```

## Item 3: CheckOutSchool handler
where: hotfix-patch/core/bz-rpc-server.js:2396-2402
```js
    CheckOutSchool: function (p) {
      p = p ;; {};
      var now = env.now();
      return wrapped('CheckOutSchool', {
        eRet: 1, npcID: p.npcID ;; 0, serverTime: now, CDTime: now, skillId: 0,
      }, { achievement: ach() });
    },
```

## Item 4: exitSchool handler
where: hotfix-patch/core/bz-rpc-server.js:2465-2467
```js
    exitSchool: function () {
      return wrapped('exitSchool', { eRet: 1, npcIDArr: [] }, { achievement: ach() });
    },
```

## Item 5: OutSchool handler
where: hotfix-patch/core/bz-rpc-server.js:2405-2412
```js
    OutSchool: function () {
      var now = env.now();
      return wrapped('OutSchool', {
        eRet: 1, npcID: 0, npcIDArr: [], oldSchool: 0,
        clearBoxs: [], textArr: [], rewardArray: null,
        serverTime: now, CDTime: now, skillId: 0,
      }, { achievement: ach() });
    },
```

## Item 6: clearGeSchoolClothing handler
where: hotfix-patch/core/bz-rpc-server.js:2468
```js
    clearGeSchoolClothing: function () { return wrapped('clearGeSchoolClothing', { eRet: 1 }, { achievement: ach() }); },
```

## Item 7: Simplest ack handler
where: hotfix-patch/core/bz-rpc-server.js:1208
```js
    ChooseServer: function () { return ack('ChooseServer'); },
```

## Item 8: Save trace for snowman / snowBall / rogue / rgItem
where: hotfix-patch/core/bz-rpc-server.js:NONE
finding: NONE
```js
// Search for snowman, snowBall, rogue, rgItem in save reads and writes returned NONE.
```

## Item 9: school in save read and write
where: hotfix-patch/core/bz-rpc-server.js:1255, 1459
```js
// Line 1255 (write):
      s.school = p.school ;; 0;

// Line 1459 (read and write):
      var s = loadSave(); s.school = p.school ;; s.school; persist();
```
