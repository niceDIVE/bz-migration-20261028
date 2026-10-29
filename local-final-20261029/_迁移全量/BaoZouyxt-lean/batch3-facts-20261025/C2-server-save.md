# Server and Save Task Facts

## Item 1: Handlers
| Keyword | Handler Name in H | File:Line | Real Implementation or ACK | Evidence |
| --- | --- | --- | --- | --- |
| acceptTask | acceptTask | hotfix-patch/core/bz-rpc-server.js:1410 | Real Implementation | calls loadSave(), modifies s.accepted, calls persist() |
| getFinishTaskAward | getFinishTaskAward | hotfix-patch/core/bz-rpc-server.js:1423 | Real Implementation | calls loadSave(), modifies s.done/s.rewarded, calls persist() |
| getTask | UNCONFIRMED | UNCONFIRMED | UNCONFIRMED | UNCONFIRMED (not found in bz-rpc-server.js) |
| schoolTask | UNCONFIRMED | UNCONFIRMED | UNCONFIRMED | UNCONFIRMED (only mentioned in comment at line 592) |
| circleTask | UNCONFIRMED | UNCONFIRMED | UNCONFIRMED | UNCONFIRMED (not found in bz-rpc-server.js) |
| delegate | UNCONFIRMED | UNCONFIRMED | UNCONFIRMED | UNCONFIRMED (not found in bz-rpc-server.js) |

## Item 2: Save File Task Fields
- s.accepted:
  - Evidence: hotfix-patch/core/bz-rpc-server.js:1414
  - Quote: if (id && s.accepted.indexOf(id) < 0) s.accepted.push(id);
  - Shape: Array of task IDs (string/number), e.g. ["100020"]
- s.done:
  - Evidence: hotfix-patch/core/bz-rpc-server.js:1429
  - Quote: if (id && !repeat && s.done.indexOf(id) < 0) s.done.push(id);
  - Shape: Array of task IDs (string/number), e.g. ["101080"]
- s.taskLog:
  - Evidence: UNCONFIRMED
  - Quote: UNCONFIRMED
  - Shape: UNCONFIRMED (not read or written on save object s; only generated dynamically as empty array in responses)
- s.finishTaskObj:
  - Evidence: UNCONFIRMED
  - Quote: UNCONFIRMED
  - Shape: UNCONFIRMED (not read or written on save object s; only constructed dynamically in taskLedger())
- s.acceptTaskArray:
  - Evidence: UNCONFIRMED
  - Quote: UNCONFIRMED
  - Shape: UNCONFIRMED (not read or written on save object s; only constructed dynamically in taskLedger())
- s.acceptTaskOrder:
  - Evidence: UNCONFIRMED
  - Quote: UNCONFIRMED
  - Shape: UNCONFIRMED (not read or written on save object s; only constructed dynamically in taskLedger())

## Item 3: LoadGame Response Task Fields
- Code Snippet:
  - Evidence: hotfix-patch/core/bz-rpc-server.js:1332-1336
  - Quote: var tl = taskLedger(); base.finishTaskObj = tl.finishArr; base.acceptTaskArray = tl.acceptArr; base.acceptTaskOrder = tl.order; if (!Array.isArray(base.taskLog)) base.taskLog = [];
- Field Mapping:
  - finishTaskObj: Set to tl.finishArr, where taskLedger() builds array of "id,1" strings from s.done (e.g. ["101080,1"]).
  - acceptTaskArray: Set to tl.acceptArr, where taskLedger() builds array of accepted task IDs not in doneSet from s.accepted.
  - acceptTaskOrder: Set to tl.order, where taskLedger() copies all IDs from s.accepted in order.
  - taskLog: Initialized to [] if base.taskLog is not an Array (defaults to empty array).

## Item 4: tasknew.json Structure
- File: tools/cfg/dump/tasknew.json
- Line count: 1
- Top-level keys: name, rows, cols, data
- cols array:
  ["TaskID","Pre-Require","Pre-Picture","Fight","ReceiveNpc","ReceiveDialog","UnfinishDialog","FinishDialog","Requiretips","Require","SpRequire","FinishNpc","Completetips","Picture","Reward","likability","Record","Type","Repeat","Chain","textdescribe","transfer","map_guide","task_begin","receive_action","finish_action","ReceiveEvent","CompletionEvent","TaskType","FriendBuff","FriendAward","track","Fake_ReceiveNpc","Fake_FinishNpc","item_npc","branchid","chapterid","roadAni","clear_task","rogue_drop"]

## Item 5: Save Validation Functions
### validateSave
- Evidence: hotfix-patch/core/bz-rpc-server.js:325-341
- Full function body:
```javascript
  function validateSave(s) {
    if (!s || typeof s !== 'object') throw new Error('NOT_OBJECT');
    var k, a;
    for (k in s.skills) {
      if (!hasOwn(s.skills, k)) continue;
      a = s.skills[k];
      if (!Array.isArray(a) || a.length !== 3) throw new Error('ABILITY_SHAPE:' + k);
      if (typeof a[0] !== 'number' || isNaN(a[0])) throw new Error('ABILITY_LV:' + k);
    }
    for (k in s.bag) {
      if (!hasOwn(s.bag, k)) continue;
      if (typeof s.bag[k] !== 'number' || s.bag[k] < 0 || isNaN(s.bag[k])) throw new Error('BAG:' + k);
    }
    if (hasOwn(s, 'rewarded') && !Array.isArray(s.rewarded)) throw new Error('REWARDED');
    if (hasOwn(s, 'done') && !Array.isArray(s.done)) throw new Error('DONE');
    return true;
  }
```

### guardSave
- Evidence: hotfix-patch/core/bz-rpc-server.js:345-359
- Full function body:
```javascript
  function guardSave(prev, next) {
    if (!prev || !next) return null;
    var k, p, n;
    for (k in prev.skills) {
      if (!hasOwn(prev.skills, k)) continue;
      p = num(prev.skills[k] && prev.skills[k][0], 0);
      n = hasOwn(next.skills, k) ? num(next.skills[k][0], 0) : 0;
      if (n < p) return '??' + k + '???? ' + p + '?' + n;
    }
    if ((next.done || []).length < (prev.done || []).length) return 'done ???? ' + (prev.done || []).length + '?' + (next.done || []).length;
    if ((next.rewarded || []).length < (prev.rewarded || []).length) return 'rewarded ???? ' + (prev.rewarded || []).length + '?' + (next.rewarded || []).length;
    var pb = sumBag(prev.bag), nb = sumBag(next.bag);
    if (pb > 0 && nb === 0 && !SHRINK_OK[_currentAction || '']) return '??? ' + pb + ' ??';
    return null;
  }
```
