# W2-rogue fact table

| action | wireName | sendSite | reqKeys | recvSite | recvFields | eRet | tables | currency | notes |
|---|---|---|---|---|---|---|---|---|---|
| ROGUE_USE_ITEM | User.rgUseItem | scripts3.js:74109 | itemID, itemNum, curHp (conditional), maxhpLimit (conditional), curMp (conditional), maxmpLimit (conditional), hpfinalValue (conditional), hg (conditional) | scripts3.js:73948 | eRet, note, rewardArray, getKnackIds, equipObj, mpnum, dogid, delItemObj | 1: success, handle note.skch, rewardArray, getKnackIds, mpnum, dogid; 2: noop; 4: show text 988 with item Data3 and Data2; 5: show text 1333; 6: show text 1388; 8: show text 3430; 10: show text 3807; 11: show text 3807; 13: show text 5862; 15: show delItemObj reward and dispatch USE_NEW_ITEM_EVENT | item.json, skill.json, npc.json | NONE | Sent via NetMgr.http.sendReqWithMask in RogueRoleModel.prototype.useItemFunc. Definition at index.js:60538. |
| ROGUE_SYNC_WAIT_DATA | User.rgSycnWaitData | scripts3.js:74029 | waitTr, curHp, curMp, maxhpLimit, hpfinalValue | scripts3.js:74003 | eRet | 1: dispatch ROGUE_SYNC_END and clear this.waitPrecious = {} | NONE | NONE | Sent via NetMgr.http.sendRequest in RogueRoleModel.prototype.reqSyncWaitData. Definition at index.js:60548. |

## Additional Tasks
### A. mpnum occurrences
1. index.js:64778: in InventoryModel.prototype.init (USE_ITEM callback). Reads a.mpnum to show text 4671 and updates RoleBaseInfo.mpTrained.
2. scripts3.js:73967: in RogueRoleModel.prototype.init (ROGUE_USE_ITEM callback). Reads o.mpnum to show text 4671 and updates RogueRoleInfo.mpTrained.

### B. Rogue bag vs Normal bag
Yes, they are two separate fields/objects:
- Normal inventory bag uses `this._itemObj` on `RoleBaseInfo` (read via `RoleBaseInfo.prototype.getItemObj` at index.js:106214 and `RoleBaseInfo._itemObj`).
- Rogue inventory bag uses `this._itemObj` on `RogueRoleInfo` (read via `RogueRoleInfo.prototype.getItemObj` at scripts3.js:73300, called at scripts3.js:74112). They are managed in distinct model singletons (`RoleBaseInfo` vs `RogueRoleInfo`).

### C. rogue_item.json structure
- Top-level keys: ["name", "rows", "cols", "data"]
- Sample 'buff' value (from item id 1): "20,1,10|20,3,10|20,22,2|20,5,800"

## UNCONFIRMED
NONE
