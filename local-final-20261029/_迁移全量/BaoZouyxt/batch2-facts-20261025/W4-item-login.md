# W4-item-login fact table

| action | wireName | sendSite | reqKeys | recvSite | recvFields | eRet | tables | currency | notes |
|---|---|---|---|---|---|---|---|---|---|
| USE_ITEM_ADDITION | User.useItemAddition | index.js:56851 | count | index.js:56234 | eRet, itemAddition | eRet==1: adds itemAddition to this.itemBreakAdditionNum and dispatches REFRESH_BREAK_RATE_EVENT | item.json | NONE | Callback writes to this.itemBreakAdditionNum; UI scripts2.js:636 checks item count via RoleBaseInfo.getItemNum |
| BACKTOLOGIN | User.BackToLogin | index.js:70630 | account | index.js:70349 | NONE | NONE (empty handler function() {}) | NONE | NONE | Empty callback registered at index.js:70349; send payload contains account from RoleBaseInfo.userAccount |
| ACCOUNT_LOG_OFF | User.accountLogOff | index.js:117390 | NONE | index.js:117200 | eRet | eRet==1: MessageCenter.cleanup(); cc.game.restart(); SoundMgr.stopMusic(); SoundMgr.stopEffects(); | NONE | NONE | Callback cleans up MessageCenter and calls cc.game.restart(); does not clear individual local fields |
| CHECK_ON_HOOK | User.CheckOnHook | index.js:70937 | NONE | index.js:70362 | eRet, OnhookObj | eRet==1: sets this.idleData = o.OnhookObj and calls this.onHookScene(true) | NONE | NONE | Sent with empty object; receives OnhookObj |
| RECORD_PHONE | User.recordPhone | index.js:70932 | phone | index.js:70356 | eRet | eRet==1: localStorage huaweiPhone+roleID=1, show text 8951; eRet==2: text 8956; eRet==3: text 8957; eRet==4: text 8953 | NONE | NONE | Huawei phone recording endpoint |
| USER_GETCHATADDRESS | User.GetChatAddress | index.js:70564 | roleID | index.js:70350 | eRet, Luck, hanyusuiTime, ChatServerPort, domain, ChatServerIP, bloodEndTime, AnnouncementDomain, AnnouncementServerPort, AnnouncementIP | eRet==1: sets luckNum, entity.luck, hanyusuiTime buffer, configures Net chat/announcement socket URL and port, optionally sets bloodEndTime, calls enterGame() | NONE | NONE | Recv handler delegates to chatServerSuccess at index.js:70570 |

## Additional Closed Tasks
- Task A (USE_ITEM_ADDITION): In callback addBreakRate (index.js:56856), assigned field is: this.itemBreakAdditionNum (verbatim line: `this.itemBreakAdditionNum += e.itemAddition;`).
- Task B (ACCOUNT_LOG_OFF): onLogOffEvt (index.js:117207) only calls methods: MessageCenter.cleanup(), cc.game.restart(), SoundMgr.stopMusic(), SoundMgr.stopEffects(). It does not clear any local fields directly.
- Task C (ACCOUNT_LOG_OFF clear line): There is no local archive/account clearing line; restart line is `cc.game.restart();` at index.js:117209.
- Task D (Config tables): role_level.json does not exist (UNCONFIRMED); item.json exists in tools/cfg/dump/item.json.

## UNCONFIRMED
- role_level.json: F:\\BaoZouyxt\\tools\\cfg\\dump\\role_level.json does not exist
