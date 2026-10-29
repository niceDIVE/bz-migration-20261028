# 浜ゆ帴鏂囨。 鈥斺€?銆婃毚璧拌嫳闆勫潧銆嬭繘绋嬪唴绂荤嚎鍗曟満锛堢浜岄樁娈碉細鍙淮鎶ょ殑绂荤嚎灞傦級

> 鏈€鍚庢洿鏂帮細2026-10-22 03:47
> 褰撳墠閮ㄧ讲鐗堟湰锛歚boot-2 / impl=h124aca9d / flow=fe3500480`
> 鐘舵€侊細**鍐峰惎鍔?3 绉?ready銆佽繘娓告垙 `errors=0`锛涜儗鍖呫€屾樉绀轰负绌恒€嶅凡鍒ゆ槑鏄鍒わ紙搂7.1锛夛紱閲戞潯 undefined 宸蹭慨锛埪? P1-7锛夛紱
> 鍛戒护閫氶亾娈嬬暀涓嶅啀閲嶆斁锛坆oot-2锛屄? P2-11锛夛紱杩涜繃涓诲満鏅悗娴佺▼灞備笉鍐嶆浛鐜╁鎺ㄨ繘鍓ф儏锛埪? P1-6锛夛紱
> 鎶€鑳界瓑绾у凡鏀逛负鍗曡皟銆佹綔鑳藉凡鎺ㄥ洖瀹㈡埛绔ā鍨嬶紙搂13锛夛紱**鑷涓嶅啀姹℃煋娲诲鎴风妯″瀷銆佷篃涓嶅啀鑳藉啓鐪熷瓨妗?*锛埪?4.2锛屽姞浜嗕袱鏉″洖褰掔敤渚嬶級锛?> 鐐奸噾 / 绛夌骇濂栧姳涓ゆ潯 `UNKNOWN` 宸茶ˉ鎴?handler锛埪?4.3锛?*
> 涓婁竴鐗堜氦鎺ュ凡澶囦唤锛歚_backup\HANDOVER.md.bak-20261022-011755`
> 鏈疆锛埪?4锛夊紑宸ュ墠蹇収锛歚_backup\2026-10-22-0212-pre-alchemy-handlers\HANDOVER.md.snapshot`

---

## 0. 椤圭洰杈圭晫锛堟帴鎵嬪墠蹇呰锛屾湭鍙橈級

**鍞竴鐩殑锛氳鐢ㄦ埛鏈汉鍦ㄨ嚜宸辩殑鐢佃剳涓婏紝绂荤嚎鍗曚汉娓哥帺銆婃毚璧拌嫳闆勫潧銆嬨€?*

| 浼氬仛 | 鏄庣‘涓嶅仛 |
|---|---|
| 鍦ㄦ湰鏈烘ā鎷熷櫒鍐呰繍琛?*瀹樻柟鍘熺増**瀹㈡埛绔?| 鉂?涓嶅垎鍙?APK銆佷笉鎻愪緵涓嬭浇婧愩€佷笉鍋氬畨瑁呭寘 |
| 鍦ㄥ鎴风**鑷繁鐨勫彲鍐欑洰褰?*鏀句竴涓湰鍦拌ˉ涓?| 鉂?涓嶄慨鏀?APK 鏈綋銆佷笉閲嶇銆佷笉鏀硅祫婧愪笌鍓ф儏 |
| 鐢辫ˉ涓佸湪**娓告垙杩涚▼鍐呴儴**搴旂瓟娓告垙鑷韩鐨勭綉缁滆姹?| 鉂?涓嶆灦璁惧澶栨湇鍔″櫒銆佷笉鐩戝惉鍏綉绔彛銆佷笉杩愯惀绉佹湇 |
| 鎶婂瓨妗ｅ啓杩涙湰鏈烘枃浠?| 鉂?涓嶇粫杩囥€佷笉浼€犱换浣曚粯璐?鍏呭€?璁㈠崟 |
| 鏁板€兼敼鍔ㄥ彧浣滅敤浜?*鏈満瀛樻。** | 鉂?涓嶅敭鍗栥€佷笉璁㈤槄銆佷笉鎻愪緵浠讳綍浠樿垂鏈嶅姟 |

浣跨敤鑼冨洿锛氫粎鏈汉銆佹湰浜鸿澶囥€佹湰鍦拌繍琛岋紱涓嶅叕寮€鍒嗗彂琛ヤ竵锛涗笉鎾板啓瀵瑰鏁欑▼锛涗笉鎵胯缁存姢銆?鏀粯绫诲姩浣滐紙`*Pay*` / `*Order*` / `*Recharge*`锛?*涓€寰嬩笉瀹炵幇**锛屽彧鍦ㄩ€氱敤 ACK 閲岃蛋杩囧満銆?
---

## 1. 涓€鍙ヨ瘽鐜扮姸

瀹樻柟 APK 闆舵敼鍔ㄣ€侀浂閲嶇锛岃ˉ涓佹斁鍦?`files/hotfix/`锛屾父鎴?*鍐峰惎鍔?16.6 绉掕嚜鍔ㄨ繘鍏?`gamescene`**锛?鍏ㄩ儴缃戠粶璇锋眰鍦ㄨ繘绋嬪唴琚湰鍦板簲绛斻€傚鎴风鑴氭湰宸茬敤 XXTEA 瀵嗛挜瑙ｅ嚭鏄庢枃锛?.5 MB / 149k 琛岋級銆?
**杩欎竴杞殑瀹炶川鍙樺寲锛氫粠"鎷垮緱鍒?鎺ㄥ埌浜?绌垮緱涓娿€佹尅涓嶄綇銆佹煡寰楀姩"銆?*

- **瑁呭璐︽湰**锛歚PutOnEquipment` / `UnloadingEuipment` 宸茶璐︼紙`equipments[妲絔=uid`銆乣PlayerEquip[uid]=[1,鏁伴噺]`锛夛紝
  瑁呭绫诲鍔憋紙`Type=1`锛変篃浼氳繘 `PlayerEquip` 鑰屼笉鏄儗鍖呫€?- **鍏憡寮圭獥**锛氭瘡娆＄櫥褰曢偅鍧楃┖鐧姐€屾父鎴忓叕鍛娿€嶄笉鍐嶆尅浣忕敾闈⑩€斺€攆low 閲岃嚜鍔ㄨ皟瀹㈡埛绔嚜宸辩殑 `onBack()` 鍏虫帀锛堟棩蹇?`鍏憡鈫抩nBack()`锛夈€?- **鐮旂┒鑳藉姏**锛氬鎴风 `scripts2` / `scripts3` 涓や釜 bundle 涔熺敤鍚屼竴鎶?XXTEA 瀵嗛挜瑙ｅ紑浜?  锛坄tools/scripts2.js` 8.2 涓囪銆乣tools/scripts3.js` 10 涓囪锛夛紝鍔犱笂鍘熸潵鐨?`tools/index.js`锛?  **33 涓囪瀹㈡埛绔唬鐮佸彲鏌?*銆俇I 灞傜殑闂锛堟瘮濡傝儗鍖呬负浠€涔堢┖锛変互鍚庝笉鐢ㄥ啀鐚溿€?- **鉁?鑳屽寘鈥滅┖鈥濇槸璇垽锛堟湰杞粨妗堬紝鍒啀褰?bug 鏌ワ級**锛氳处鏈?6 鏍风墿鍝?*宸茬粡**鍦ㄥ鎴风 `_itemObj` 閲?  锛堣繘绋嬪唴瀹炴祴 `Object.keys(_itemObj)` = `["3005","3006","3626","4014","4015","7027"]`锛夛紝
  鐣岄潰涔?*鐓у父鏄剧ず**锛堜功淇♀啋绉樼睄 閲?`鍚愮撼娉曠绫?脳1`銆佹秷鑰楀搧鈫掗鐗?閲?`鐧界帀璞嗚厫/缈＄繝璞嗚厫 脳1`锛屾埅鍥惧凡瀛?  `probe/shot_bag_shuxin.png`銆乣probe/shot_bag_food.png`锛夈€?  涔嬪墠閭ｄ釜 `_itemDataList.length == 0` 鏄?*杩囨护鍚庣殑鍒楄〃**锛屼笉鏄处鏈紱`ItemSystemUI.divisionItem`
  锛坰cripts2.js:36788-36811锛夊彧鎶娿€宍Type==2` 涓?Effect 钀藉湪褰撳墠瀛愰〉 `effectcategory.page` 鐧藉悕鍗曢噷銆嶇殑鐗╁搧鏀捐繘鏉ワ紝
  榛樿钀藉湪澶х被銆屾秷鑰楀搧銆嶅瓙椤点€岃嵂鍝併€嶏紝鐧藉悕鍗曟槸 `33,2,3,4,6,23,25`锛?*涓€浠堕兘涓嶅尮閰?*锛屾墍浠ョ湅鐫€绌恒€?  璇﹁ 搂7.1 鐨勭粨妗堣〃銆?
---

## 2. 鏋舵瀯锛氫笁灞?+ 宸ュ叿灞?
```
璁惧绔?/data/data/com.maple.madherogo/files/hotfix/
鈹溾攢鈹€ jsb-adapter/jsb-engine.js             寮曞灞傦紙309 KB锛屽緢灏戞敼锛涙敼鍔ㄩ渶閲嶅惎锛?鈹斺攢鈹€ live/
    鈹溾攢鈹€ handlers.js                       绛栫暐灞傦紙48 KB锛屾敼涓€娆?push+reload 鈮?0.3s锛?    鈹斺攢鈹€ flow.js                           娴佺▼灞傦紙15 KB锛屽悓涓婏級

F:\BaoZouyxt\hotfix-patch\                婧愮爜宸ョ▼
鈹溾攢鈹€ hook\bz-bootstrap.js    钖勫紩瀵硷細鍛戒护閫氶亾 / XHR 鏇挎崲 / 閿欒鎹曡幏 / JSONL 鏃ュ織 / ready 鏍囪 / reload
鈹溾攢鈹€ hook\bz-xhr.js          XHR 浼犺緭灞傦紙鍙 __BZ_HARNESS__.impl.handle 濂戠害锛?鈹溾攢鈹€ hook\bz-codec.js        绾垮崗璁紪瑙ｇ爜锛坅es-js + lz-string锛屼笌 Node crypto 瀛楄妭涓€鑷达級
鈹溾攢鈹€ core\bz-handler-impl.js 绛栫暐灞傚绾﹂€傞厤锛坔andle/selfCheck/reset/state锛?鈹溾攢鈹€ core\bz-rpc-server.js   鈽?涓氬姟锛?6 涓姩浣?handler + 褰㈢姸鍒嗗彂 + 淇″皝 + 瀛樻。璐︽湰 + 浠诲姟璐︽湰
鈹溾攢鈹€ core\bz-shapes.generated.js  鈽?褰㈢姸灞傦細338 涓姩浣滅殑搴旂瓟褰㈢姸锛坱ools/gen_shapes.js 鐢熸垚锛屽嬁鎵嬫敼锛?鈹溾攢鈹€ core\bz-tasks.generated.js   鈽?浠诲姟濂栧姳琛細682 涓换鍔＄殑"鎵€闇€鐗╁搧/搴斿彂濂栧姳"锛坱ools/gen_task_rewards.js 鐢熸垚锛?鈹溾攢鈹€ core\templates.json     鎶撳寘瑙ｅ瘑鍑虹殑鐪熷疄鍝嶅簲妯℃澘锛? 涓叧閿姩浣滐級
鈹溾攢鈹€ live\flow.js            鈽?娴佺▼灞傦細閫夊尯鈫掕繘娓告垙鈫掑缓瑙掑悜瀵尖啋鍓ф儏鈫抔amescene
鈹溾攢鈹€ build.js                鏋勫缓寮曞灞傦紙鎺㈤拡鐗?/ 鐜洖鐗堬級
鈹溾攢鈹€ build-handlers.js       鏋勫缓绛栫暐灞?+ 娴佺▼灞傦紙鍚嚜妫€璺戜竴閬嶏級
鈹溾攢鈹€ run.ps1                 鈽?瀹夸富渚ф€绘帶锛堣绗?3 鑺傦級
鈹溾攢鈹€ watch.ps1               鏃ュ織鐩戣鍣紙鍙墦 UNKNOWN / err锛?鈹溾攢鈹€ test\l0-xhr.js          XHR 涓€鑷存€ф祴璇曪紙21 椤癸級
鈹溾攢鈹€ test\l0-envelope.js     缂栬В鐮?淇″皝/褰㈢姸娴嬭瘯锛?2 椤癸級
鈹溾攢鈹€ test\selfcheck-nosave.js       鈽?鑷涓嶈鍐欑湡瀛樻。锛堟嬁鐪熷瓨妗ｅ唴瀹硅窇涓€閬嶏紝姣斿瓧鑺?sha锛涢€€鍑虹爜 0 = 瀹夊叏锛?鈹溾攢鈹€ test\selfcheck-model-push.js   鈽?鑷涓嶈鎺ㄦ椿瀹㈡埛绔ā鍨嬶紙鍋?window.__require 璁板綍鍐欏叆锛涢€€鍑虹爜 0 = 瀹夊叏锛?鈹斺攢鈹€ probe\*.js              鎺㈤拡锛堥兘瑕?*闄愭椂闄愰噺**锛岃 搂9 鍧?28锛?    鈹溾攢鈹€ dump_tables.js      浠?startres bundle 鍐嶈涓€娆￠厤缃〃锛岃惤璁惧 files/tbl_*.json
    鈹溾攢鈹€ check_bag.js        鏋佸皬 BFS锛氬鎴风鐨?`_itemObj` 閲屾湁娌℃湁涓滆タ
    鈹溾攢鈹€ bag_state.js        鐩存帴闂紑鐫€鐨?`ItemSystemUI`锛歚_itemDataList` 闀垮害
    鈹溾攢鈹€ dump_bag_ui.js      鍒楀満鏅噷鍍忚儗鍖呯殑鑺傜偣/缁勪欢鍚嶏紙鎷垮埌缁勪欢鍚?`ItemSystemUI`锛?    鈹斺攢鈹€ seed_bag.js         涓€娆℃€ф妸澶栭儴鎸佹湁鐗╃亴杩涜处鏈紙閰嶅悎 bzSeedBag锛?
    鈽?2026-10-22 鏂板锛堥兘鐢?`__require`锛屽彧璇汇€佷笉鍋?BFS锛夛細
    鈹溾攢鈹€ require_probe.js    涓€娆￠棶娓咃細CFMgr.dic 鏈夊摢浜涜〃 / item 琛ㄥ懡涓?/ RoleBaseInfo._itemObj 鐪熷疄鍐呭
    鈹溾攢鈹€ bag_tab_probe.js    璐︽湰閲屾瘡鏍风墿鍝佽鍑虹幇鍦ㄥ摢涓ぇ绫?瀛愰〉锛堝搴?effectcategory.page锛?    鈹溾攢鈹€ gold_label_probe.js 瀹氫綅銆岄噾鏉°€嶉偅涓?Label 鐨勫綊灞炵粍浠讹紙闈犺妭鐐归摼 PropertyUI鈫扜oldLabel锛?    鈹溾攢鈹€ wallet_probe.js     璇?yuanbao/gold/coins 鐜板€?+ 鎶撻〉闈笂鍚€岄噾鏉°€嶇殑 Label 鏂囨湰
    鈹斺攢鈹€ task_state_probe.js 璇?requireTaskObj/finishTaskObj/taskOrder/taskLog + 姣忎釜鍦ㄥ姙浠诲姟鐨勮〃琛?
F:\BaoZouyxt\tools\                       瀹㈡埛绔爺绌朵笌鐢熸垚宸ュ叿
鈹溾攢鈹€ index.js                瑙ｅ瘑婧愮爜 路 scripts 涓诲寘锛?.5 MB / 149,447 琛岋級
鈹溾攢鈹€ scripts2.js             瑙ｅ瘑婧愮爜 路 scripts2 鍖咃紙3.1 MB / 81,775 琛岋級鈽?鏈疆鏂板
鈹溾攢鈹€ scripts3.js             瑙ｅ瘑婧愮爜 路 scripts3 鍖咃紙3.7 MB / 100,428 琛岋級鈽?鏈疆鏂板
鈹溾攢鈹€ decrypt_bundles.js      鈽?瑙ｅ叾瀹?bundle 鐨?index.jsc锛堝悓涓€鎶?XXTEA 瀵嗛挜锛実zip 鑷姩璇嗗埆锛?鈹溾攢鈹€ action_facts_all.json   812 鍔ㄤ綔锛氭秷璐瑰嚱鏁?/ 璇锋眰鍙傛暟 / 鍝嶅簲瀛楁 / 瀛楁琛屽彿
鈹溾攢鈹€ todo_shapes.json        120 涓緟琛ュ舰鐘跺姩浣?鈹溾攢鈹€ gen_shapes.js           鈽?褰㈢姸鐢熸垚鍣紙鑰佽〃 + 鍖垮悕鐩戝惉鍣ㄨ〃 + 婧愮爜 鈫?褰㈢姸锛?鈹溾攢鈹€ extract_listeners.js    鈽?鎵尶鍚嶇洃鍚櫒锛坄MessageCenter.on(CMD, function(t,e){...})`锛夋姄鍝嶅簲瀛楁
鈹溾攢鈹€ check_shapes.js         鈽?褰㈢姸鑷煡锛堢洰鏍囧姩浣?脳 瀛楁璺緞锛岀己涓€涓?FAIL锛屽彲褰?CI锛?鈹溾攢鈹€ grep_src.js             鍦ㄦ簮鐮侀噷鎸変覆/姝ｅ垯鎵捐锛堝厤寮曞彿鍦扮嫳锛?-file 鍙寚瀹?scripts2/3锛?鈹溾攢鈹€ gen_task_rewards.js     鈽?浠庡師濮嬮厤缃〃鐢熸垚浠诲姟濂栧姳琛紙tasknew + drop + item 鈫?bz-tasks.generated.js锛?鈹溾攢鈹€ shapes.json             褰㈢姸瀹氫箟 + 閫愬瓧娈佃瘉鎹?+ 缃俊搴︼紙宓屽鐢?"note.skch" 琛ㄧず锛?鈹溾攢鈹€ shapes_report.md        浜哄彲璇绘竻鍗?鈹溾攢鈹€ action_facts_listener.json  249 涓尶鍚嶇洃鍚櫒鐨勫瓧娈垫竻鍗?鈹溾攢鈹€ cfg\                    鈽?浠庤澶囧鍑虹殑娓告垙鍘熷閰嶇疆琛紙鍙鐣欐。锛屽嬁鎵嬫敼锛?鈹?  鈹溾攢鈹€ tbl_tasknew.json    4842 涓换鍔★紙Reward=鎺夎惤琛?id / SpRequire=鎵€闇€鐗╁搧锛?鈹?  鈹溾攢鈹€ tbl_drop.json       鎺夎惤琛紙Item1..5 + probability锛?鈹?  鈹溾攢鈹€ tbl_item.json       6525 涓墿鍝侊紙Type/Name/BuyPrice/EquipType鈥︼級
鈹?  鈹斺攢鈹€ tbl_constant.json   甯搁噺琛?鈹斺攢鈹€ facts\                  瀹¤鐣欐。锛堜綆缃俊瀛楁鍘熷琛屻€佽嫤鍔涗氦浠橈級
```

**鍏抽敭璁捐锛堢浜岄樁娈电殑鏍稿績浠峰€硷級**

1. **鏈哄埗涓庣瓥鐣ュ垎绂?*锛氬紩瀵煎眰鍙仛"杞彂鍒?`__BZ_HARNESS__.impl`"锛岀瓥鐣ュ眰浠庤澶囦笂鐨?   `handlers.js` 鍔ㄦ€?`new Function` 姹傚€笺€?*鎹?impl 涓嶉渶瑕侀噸鍚繘绋?*锛屼篃涓嶅奖鍝嶅凡瀛樺湪鐨?XHR 瀹炰緥銆?2. **鍙娴嬫€?*锛氭墍鏈夊姩浣溿€佸紓甯搞€佸満鏅垏鎹€乫low 鍔ㄤ綔閮藉啓 JSONL锛坄files/bz_log.jsonl`锛夛紝
   鏂█瀵规棩蹇楀仛锛屼笉瀵规埅鍥惧仛銆?3. **澶у０澶辫触**锛氭湭瀹炵幇鍔ㄤ綔涓嶅啀闈欓粯锛屽啓 `UNKNOWN User.X p={...}`鈥斺€旇繖灏辨槸瑕嗙洊鐜囧緟鍔炴竻鍗曠殑鏉ユ簮銆?
---

## 3. 鎿嶄綔鎵嬪唽锛坄run.ps1` 鏄敮涓€鍏ュ彛锛?
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force   # 姣忔鏂?pwsh 閮借
cd F:\BaoZouyxt\hotfix-patch

.\run.ps1 status            # pid / ready / 鐗堟湰 / 鏈€杩戞棩蹇?.\run.ps1 handlers          # 鎺?handlers.js+flow.js 鈫?reload 鈫?鏂█ pid 鏈彉锛堚増8 绉掍竴杞級
.\run.ps1 all               # 鎺ㄥ紩瀵煎眰+绛栫暐灞?鈫?閲嶅惎 鈫?绛?ready
.\run.ps1 restart           # force-stop + 鍚姩 + 杞 ready
.\run.ps1 smoke             # 鍐峰惎鍔ㄧ鍒扮锛岃緭鍑?PASS/FAIL JSON
.\run.ps1 log -Tail 40      # 鎵撳嵃鏈€杩?N 琛屾棩蹇?.\run.ps1 cmd "ver"         # 鍛戒护閫氶亾锛歷er/scene/reload/selfcheck/state/log/get:/dump:/eval:
.\run.ps1 probe .\probe\xxx.js [arg]   # 鎺ㄦ帰閽堟枃浠跺埌杩涚▼鍐呮墽琛岋紝鍥炰紶缁撴灉
```

**鏀逛竴娆″簲绛旂殑瀹屾暣寰幆锛堝綋鍓?鈮?10 绉掞級**

```powershell
# 1. 鏀?core\bz-rpc-server.js锛堟垨 live\flow.js锛?$env:BZ_PROBE='0'; node build.js      # 鏋勫缓锛堝唴閮ㄤ細璺?selfCheck锛?34 椤癸級
node test\l0-envelope.js              # 82 椤瑰洖褰?.\run.ps1 handlers                    # 鎺ㄩ€?+ 鐑噸杞斤紙涓嶅姩娓告垙杩涚▼锛?```

**鍙湁褰㈢姸琛ㄥ彉浜嗙殑鏃跺€欙紙涓嶇敤鍔ㄦ簮鐮侊級**

```powershell
node tools\extract_listeners.js       # 瀹㈡埛绔簮鐮佸彉浜嗘墠闇€瑕侀噸璺戯紙鎵尶鍚嶇洃鍚櫒锛?node tools\gen_shapes.js              # 閲嶆柊鐢熸垚 338 涓姩浣滅殑褰㈢姸锛堝嚑绉掞級
node tools\check_shapes.js            # 鑷煡锛孭ASS 鎵嶇户缁?.\run.ps1 handlers                    # 鍚屼笂锛岀儹閲嶈浇
```

**閰嶇疆琛紙浠诲姟濂栧姳/鐗╁搧锛夊彉浜嗙殑鏃跺€?*

```powershell
# 1. 浠庤澶囬噸鏂板鍑哄師濮嬮厤缃〃锛堟帰閽堜細鎶婅〃钀藉埌 files/tbl_*.json锛岀劧鍚庤剼鏈?pull 涓嬫潵锛?.\run.ps1 probe .\probe\dump_tables.js
# 2. 鐢熸垚浠诲姟濂栧姳琛?node tools\gen_task_rewards.js
# 3. 鏋勫缓 + 鎺?$env:BZ_PROBE='0'; node build-handlers.js; .\run.ps1 handlers
```

**缁存姢鍔ㄤ綔锛堝彧鑳戒粠鍛戒护閫氶亾鎵擄紝娓告垙鍗忚閲屾病鏈夛級**

鍛戒护閫氶亾鐨?`cmd` 鍙 `op:arg` 褰㈠紡锛屾墍浠ョ淮鎶ゅ姩浣滅敤 `get:` 鎵撲竴娈佃嚜瑙ｇ爜鐨?JS锛堝鍒跺嵆鐢紝鎶?`<鍔ㄤ綔>` 鎹㈡帀锛夛細

```powershell
$js = 'get:(function(){var b=__BZ_CODEC__.encode(JSON.stringify({mod:"User",do:"<鍔ㄤ綔>",p:{}}));var r=__BZ_HARNESS__.impl.handle({url:"https://bzgf.maple-game.com/900-server-166/x",body:b});return JSON.parse(__BZ_CODEC__.decode(JSON.parse(r.text).MsgData));})()'
.\run.ps1 cmd $js
```

| 鍔ㄤ綔 | 浣滅敤 |
|---|---|
| `bzBackfillRewards` | 琛ュ彂"宸插畬鎴愪絾褰撴椂娌″彂"鐨勪换鍔″鍔憋紙骞傜瓑锛屾寜 `save.rewarded` 璺抽噸锛?|
| `bzPatch` | 瀹氱偣鏀瑰瓨妗ｏ細`p:{set:{potential:99999}, del:{skills:["0"]}}`锛屼粎鐢ㄤ簬淇璇啓 |
| `bzSeedBag` | 涓€娆℃€ф妸澶栭儴鎸佹湁鐗╃亴杩涜处鏈細`p:{itemObj:{3626:1}}` |

鐪嬪瓨妗ｏ細`.\run.ps1 cmd "state"`锛堢洿鎺ユ墦鍗?`bz_offline_save.json`锛夈€?
**鎬庝箞鍒ゆ柇褰㈢姸琛ㄧ湡琚敤涓婁簡**锛氭棩蹇楅噷鍑虹幇 `SHAPED User.<鍔ㄤ綔>`锛涜繕鏄?`UNKNOWN` 灏辨槸琛ㄩ噷涔熸病鏀惰繖涓姩浣溿€?**鎬庝箞鐪嬭处鏈?*锛歚.\run.ps1 cmd "state"` 鐩存帴鎵撳嵃瀛樻。 JSON锛堝惈 `accepted` / `done` / `bag` / `playerEquip` / `equipments` / `rewarded` / `skills`锛夈€?
**璺戞帰閽堢殑涓夋潯閾佸緥锛堣鐨勬暀璁紝瑙?搂9 鍧?28/29/30锛?*

```powershell
# 1. 鎺㈤拡閲岀姝㈠叏鍥?BFS锛涘繀椤?Set 鍒ら噸 + 闄愰噺锛堣妭鐐?鈮?12000銆佹椂闂?鈮?2500ms锛岃秺灏忚秺瀹夊叏锛?# 2. probe 鎶?command reply timeout 涔嬪悗锛岀涓€浠朵簨鏄竻鎺夋畫鐣欏懡浠ゆ枃浠讹紝鍚﹀垯姣忔鍚姩閮戒細閲嶆斁
adb -s 127.0.0.1:16416 shell "rm -f /data/data/com.maple.madherogo/files/bz_cmd.txt"
# 3. 鎺㈤拡鏂囦欢鍙敤 edit/write 宸ュ叿鏀癸紝鍒敤 PowerShell Set-Content锛堜細鍐欏潖 UTF-8 涓枃娉ㄩ噴锛?```

**瀹㈡埛绔簮鐮佷笁鍖咃紙閮借兘 grep锛宍--file` 鎸囧畾锛?*

```powershell
node tools\grep_src.js "ItemSystemUI" --file tools\scripts2.js --max 5   # UI 灞?node tools\grep_src.js "getStorableItemObj" --file tools\index.js --max 3 # 妯″瀷灞?node tools\decrypt_bundles.js                                            # 鑻ユ煇鍖呮病瑙ｅ嚭鏉?```

**璁惧渚ц鐐?*

| 椤?| 鍊?|
|---|---|
| 妯℃嫙鍣?| MuMu/TapTap VM锛孷M index 1锛宎db `127.0.0.1:16416`锛岄渶 `adb root` |
| 搴旂敤鍙啓鐩綍 | `/data/data/com.maple.madherogo/files/` |
| 瀛樻。 | `.../files/bz_offline_save.json` |
| 鏃ュ織 | `.../files/bz_log.jsonl` |
| 鍛戒护閫氶亾 | 鍐?`.../files/bz_cmd.txt` 鈫?璇?`.../files/bz_res.txt` |
| 鎺㈤拡鍙傛暟 | `.../files/probe_arg.txt`锛?*蹇呴』 UTF-8**锛岃绗?9 鑺傚潙 1锛?|
| 绐楀彛涓嶅彲瑙?| `MuMuManager.exe control -v 1 show_window`锛屽啀鐢?Win32 `SetWindowPos` 鎽嗕綅缃?|

---

## 4. 瀹㈡埛绔爺绌剁粨鏋滐紙绗簩闃舵鏈€澶ф敹鑾凤級

### 4.1 鑴氭湰瑙ｅ瘑锛堜竴娆℃€цВ鍐?鍙兘鐚?鐨勯棶棰橈級

| 姝ラ | 缁撹 |
|---|---|
| 瀹氫綅 | 璁惧涓?`files/hotfix/assets/scripts/index.jsc`锛?50,592 B锛?|
| 鍔犲瘑 | XXTEA锛圕ocos Creator 2.x 鍘熺敓鍔犲瘑锛夛紝瑙ｅ瘑鍦?`.so` 閲?|
| 瀵嗛挜 | **`7ca36578-7b3a-4c`**锛堜粠 `libcocos2djs.so` 鍙墦鍗板瓧绗︿覆鏆村姏鍖归厤锛岀敤 268 B 鐨?`settings.jsc` 楠岃瘉锛?|
| 缁撴灉 | 瑙ｅ嚭 **4,512,911 B / 149,447 琛?*鏄庢枃 JS 鈫?`tools/index.js` |
| 澶嶇幇 | `tools/decrypt_main.js`锛堝惈瀵嗛挜锛? `tools/xxtea.js` |
| 澶囩敤 | `npm i cc-reverse --prefix tools\ccreverse`锛宍cc-reverse -p <build> -k 7ca36578-7b3a-4c`锛堝彲瑙ｅ寘璧勬簮锛?|

### 4.2 鍏抽敭浠ｇ爜浣嶇疆锛坄tools/index.js` 琛屽彿 = 瀹㈡埛绔?`index.jsc` 琛屽彿锛?
| 涓婚 | 浣嶇疆 | 璇存槑 |
|---|---|---|
| `loadGame` 娑堣垂绔?| **70502** | 杩涙父鎴忔椂璇荤殑瀛楁鍏ㄥ湪杩欓噷锛沗e.OnhookObj.serverTime` 鏇惧鑷村穿婧?|
| `updatePlayerData` | 111820 | `baseValueAy[绱㈠紩]` 鏄犲皠琛ㄥ氨鍦ㄨ繖娈甸噷 |
| `baseValueAy` 灏鹃儴璇箟 | 74965鈥?4970 / 111801 | `[44]=鍦烘櫙ID` `[45][46]=鍑虹敓鍧愭爣` `[47]=宸查€€闂ㄦ淳[]` `[49]=degreeLv` `[50]=career` |
| 娼滆兘 / 閾朵袱 | 74955鈥?4956 | `[34]=娼滆兘` `[35]=閾朵袱` |
| `skillMap` 鏍煎紡 | 119994 | `{ 鎶€鑳絀D: [lv, pgr, brlv] }` |
| 鍏抽棴鏂版墜寮曞 | 107269 | 鍝嶅簲閲屽甫 `closeGuide: true` 鈫?`GuideMgr.closeGuideState = true` |
| 寤鸿鍚戝閾?| 瑙?flow.js 娉ㄩ噴 | `StartDialogueUI 鈫?CreateRoleUI 鈫?BirthPlaceUI 鈫?SelectSexUI 鈫?SelectAppearanceUI 鈫?ShowTalentUI` |
| 灞炴€х偣纭潯浠?| `ShowTalentUI.enterClickBtn` | `_attributeValue[0] === 0` 鎵嶆斁琛岋紙鍓╀綑鐐瑰繀椤讳负 0锛?|
| 浜ゆ槗/鏀粯甯搁噺 | 59503 璧凤紙HttpConst锛?| 812 涓姩浣滄槧灏勮〃 |
| **杩愯鏃跺彇瀹㈡埛绔ā鍧?* | `scripts3.js:1` `window.__require` | **鏈€鏈夌敤鐨勪竴鏉?*锛歚__require('RoleBaseInfo')` / `__require('CFMgr')` 鐩存帴鎷垮埌妯″瀷涓庨厤缃〃锛岀煭鍚嶅嵆鍙紝鎵句笉鍒颁細鑷姩鍥為€€鍒颁笂涓€涓?bundle銆傛帰閽堥噷鐢ㄥ畠鏌ョ姸鎬侊紝鍒啀鐢?BFS锛堣鍧?20/33/34锛?|
| 浠诲姟鍒ゅ畾鍑芥暟 | `134085` `judgeTaskCondition`锝渀134289` `judgeTaskState`锝渀134428` `judgeItemRequire`锝渀134394` `judgeTaskFinishRequire` | `judgeItemRequire` 鎶?`"4015,1"` 鎸?`|` 鍒嗘銆佸啀鎸?`,` 鍙?id/鏁伴噺锛歚Type==1`(瑁呭) 璧?`EqUtils.getEquipOrUid`锛屽叾浣欒蛋 `RoleBaseInfo.getItemNum(id) < 鏁伴噺`銆傚悗鑰呭璐у竵 id `1` 杩斿洖 `gold`(閲戞潯)銆乣4001` 杩斿洖 `coins`(閾朵袱) |

### 4.3 鍏ㄩ噺鍔ㄤ綔娓呭崟锛?026-10-22 01:18 瀹炴祴鍙ｅ緞锛屽彲澶嶇幇锛?
```powershell
node tools\extract_all.js         # 鈫?tools/action_facts_all.json锛堝叿鍚嶅洖璋冿級
node tools\extract_listeners.js   # 鈫?tools/action_facts_listener.json锛堝尶鍚嶇洃鍚櫒锛?node tools\gen_shapes.js          # 鈫?tools/shapes.json + core/bz-shapes.generated.js
node tools\check_shapes.js        # 褰㈢姸鑷煡锛堢洰鏍囧姩浣?脳 瀛楁璺緞锛?```

| 鎸囨爣 | 鏁伴噺 |
|---|---|
| 鍔ㄤ綔鎬绘暟 | **812** |
| 鏈娴嬪埌璇昏繑鍥炲瓧娈碉紙璧伴€氱敤 ACK锛?| **499** |
| 妫€娴嬪埌浼氳杩斿洖瀛楁 | **313** |
| 鈹?鏈変汉鎵嬪啓 handler锛堟父鎴忓姩浣滐級 | **54** |
| 鈹?鍙︽湁缁存姢鍔ㄤ綔锛堜笉灞炰簬娓告垙鍗忚锛?| **3**锛歚bzSeedBag` / `bzBackfillRewards` / `bzPatch` |
| 鈹?鏈夊舰鐘舵潯鐩?| **338** |
| **闈炴敮浠樺姩浣?*锛堝幓鎺?10 涓敮浠樼被锛変粛鍦ㄨ瀛楁鐨?| **303** |
| **闈炴敮浠樺姩浣滆鐩栫巼** | **303 / 303 = 100%锛堢己鍙?0锛?* |
| 鏀粯绫?| **10**锛坄IphonePay` `h5Pay` `GetPayAward` `GetPayShowData` `PaymentCallBack` `cancelPay` `getPayAuth` `createOrderByHotVal` `completeOrderByHotVal` `ExChangeJetton`锛夆啋 **涓€寰嬪洖 `eRet:4`锛堟槑纭け璐ワ級锛屼笉浼€犱换浣曡鍗?璐у竵** |

> 娉細鏃ф枃妗ｅ啓鐨?`160 / 652 / 120` 鏄?鍙鍏峰悕鍥炶皟"鐨勬棫鍙ｅ緞锛屽凡浣滃簾銆?> 鍏抽敭鏁欒锛氬瓧娈垫娊鍙栧繀椤诲悓鏃舵壂**鍖垮悕鐩戝惉鍣?*锛屽惁鍒欎細鎶?`useItem` 杩欑璇?`note.skch` 鐨勫姩浣滆鍒ゆ垚"鍙湅 ACK"銆?
### 4.4 褰㈢姸灞傦紙鏍稿績澧為噺锛?
**闂**锛氬彧鏈夊嚑鍗佷釜鍔ㄤ綔鎵嬪啓浜?handler锛屽叾浣欒惤鍒伴€氱敤 ACK 鈥斺€?瀹㈡埛绔嬁鍒?`{eRet:1}` 鍚?璇?`e.note.skch` / `e.friendList.length` / `for (var k in e.shopObj)` 灏变細鎶涘紓甯告垨璧扮┖鍒嗘敮銆?
**鍋氭硶**锛氱収琛ㄦ壒閲忕敓鎴愶紝涓嶉潬璇曘€?
| 璇佹嵁婧愶紙浼樺厛绾т粠楂樺埌浣庯級 | 鍚箟 |
|---|---|
| `capture` | 鎶撳寘鐪熷€兼ā鏉块噷鐨勫悓鍚嶅瓧娈碉紙`templates.json`锛?|
| `handler` | 宸插疄鐜?handler 绌哄弬鏁拌窇涓€閬嶇殑鐪熷疄鍝嶅簲 |
| `manual` | 涓诲閫愭潯鐪嬫簮鐮佸悗鍐欐锛堟瘡鏉″甫琛屽彿锛?|
| `listener` | 鍖垮悕鐩戝惉鍣ㄩ噷璇诲埌鐨勫瓧娈碉紙`extract_listeners.js`锛屽甫琛屽彿涓庣被鍨嬫彁绀猴級 |
| `init-N` | 瀹㈡埛绔嚜宸卞啓鐨勫垵鍊?`this.x = [] / {} / 0`锛孨 澶勪竴鑷?|
| `usage-N` | 婧愮爜閲?N 澶勭敤娉曞悓绫诲瀷 |
| `name` / `fallback` | 鍛藉悕鍚彂 / 鏃犺瘉鎹紝瀹夊叏绌哄€煎厹搴?|

**鏀寔宓屽璺緞**锛歚note.attrch`銆乣housekeeper.helperId` 浼氳嚜鍔ㄥ睍寮€鎴愬祵濂楀璞°€?`x.length` 璁块棶浼氳繕鍘熸垚 `x` + 鏁扮粍鎻愮ず锛宍x.hasOwnProperty` 杩樺師鎴?`x` + 瀵硅薄鎻愮ず銆?
**璁拌处鑱斿姩**锛歚userGold` / `curGold` / `potential` 浠庡瓨妗ｈ处鏈锛岃处鏈病鏈夋椂鎸?`LoadGame` 鍚屾 99999锛?閬垮厤"杩涙父鎴忔樉绀?99999銆佷拱涓滆タ璇村彧鏈?20"銆?
**鍥炲綊鎶ゆ爮**锛氭瘡娆?reload 鐨勮繘绋嬪唴鑷閲岋紝338 涓姩浣滈€愪釜楠岋紙瀛樺湪 / eRet / 瀛楁榻愬叏锛? 浠诲姟 8 鏉?+ 鐗╁搧 6 鏉★紝鍏?**1093 椤?*銆?
### 4.6 褰㈢姸鏄€屽绾︺€嶏紝涓嶆槸銆屽疄鐜般€嶏紙fillShape锛?
鍏抽敭璁捐锛堟湰杞柊澧烇紝鍒啀璧板洖澶磋矾锛夛細

- **褰㈢姸琛ㄨ鐩栨墍鏈変細璇诲瓧娈电殑鍔ㄤ綔锛屽寘鎷凡瀹炵幇鐨勯偅 54 涓?*銆傛墜鍐?handler 涓嶇瓑浜庤眮鍏嶃€?- `dispatch` 閲屽厛璺?handler锛屽啀鐢?`fillShape(action, res)` **鍙ˉ缂恒€佷笉瑕嗙洊**锛氬鎴风瑕佺殑瀛楁涓€瀹氬湪锛宧andler 绠楀嚭鏉ョ殑鍊间竴瀹氫笉琚啿鎺夈€?- 鑷瀵规瘡涓姩浣滈兘 `dispatch` 涓€閬嶅啀楠屽瓧娈碘€斺€旀墍浠ラ偅鏉℃柇瑷€鍚屾椂鍦ㄩ獙 hand-written handler銆?- **渚嬪**锛氭墜鍐?handler 鍙互鑷繁鍐冲畾 `eRet`锛坄getCRAInfo` 鐨勬姄鍖呯湡鍊煎氨鏄?`2`锛屼笉鏄?1锛夈€?  鐢熸垚鍣ㄦ妸宸插疄鐜板姩浣滃悕鍗曞啓杩?`BZ_SHAPES.__impl`锛岃嚜妫€鎹鏀惧杩欐潯鏂█銆?- **鎵佸钩缁撴瀯鍔ㄤ綔**锛坄quicklogin` / `Create` / `CheckName` / `GetChatAddress` / `GetServerList`锛夋病鏈?`User.<鍔ㄤ綔>` 杩欎竴灞傦紝涓嶇撼鍏ュ舰鐘惰〃銆?
### 4.7 浠诲姟濂栧姳閾撅紙鏁版嵁鏉ヨ嚜娓告垙鑷繁鐨勯厤缃〃锛?
**鎬庝箞鎷垮埌鐪熸暟鎹?*锛堣繖鏉℃渶閲嶈锛屽埆鍐嶉噸澶嶆懜绱級锛?
- 閰嶇疆琛ㄥ湪璁惧 `files/hotfix/assets/startres/`锛岀储寮曟槸 `config.json` 閲岀殑 `paths: "configs/<鍚嶅瓧>,<type>"`锛?  鐪熻韩鏄?`.mbin` 浜岃繘鍒?鈫?**Cocos 鍘熺敓瑙ｆ瀽鎴愯鏁扮粍**锛屽舰濡?`_nativeAsset.data = [ [琛ㄥご...], [琛?..], ... ]`銆?- **閰嶇疆琛ㄥ姞杞藉畬灏辫閲婃斁**锛歚cc.loader._cache`锛?42 鏉℃潗璐?鐗规晥锛夊拰 `cc.assetManager`锛堟壂 1019 涓妭鐐癸級閲岄兘娌℃湁銆?- 姝ｇ‘鍋氭硶锛?*鑷繁鍐嶅悜 bundle 瑕佷竴娆?*鈥斺€擿bundle.load(['configs/item'], cc.Asset, null, cb)`锛?  鍥炶皟閲屾嬁 `asset._nativeAsset.data`銆傚伐鍏凤細`probe/dump_tables.js`锛堟妸琛ㄨ惤鍒拌澶?`files/tbl_*.json` 鍐?pull锛夈€?- 琛ㄧ殑涓婚敭瑕佺敤 **`ID` 鍒?*锛屼笉鏄 0 鍒楋紙绗?0 鍒楁槸 `__name__`锛屼袱鑰呬笉涓€瀹氱浉绛夛級銆?
**涓夊紶琛ㄦ€庝箞涓茶捣鏉?*锛?
| 琛?| 鍏抽敭鍒?| 鍚箟 |
|---|---|---|
| `tasknew` | `Reward` | **鎺夎惤琛?id**锛堜笉鏄墿鍝?id锛?054 鈫?鐗╁搧 3626脳1 + 璐у竵锛?|
| `tasknew` | `SpRequire` | 瀹屾垚浠诲姟**蹇呴』鎼哄甫**鐨勭墿鍝侊細`"鐗╁搧id,鏁伴噺"`锛屽涓敤 `\|` 鍒嗛殧锛涘彧鍐?id 琛ㄧず瀹㈡埛绔笉鏍￠獙鏁伴噺 |
| `drop` | `Item1..5` + `probability1..5` | 鎺夎惤灞曞紑锛歚[itemID, count]`锛涘彧鏀?`probability >= 100` 鐨勬潯鐩?|
| `item` | `Type` / `Name` / `BuyPrice` | `Type=1` 瑁呭 / `2` 娑堣€楀搧 / `3` 鏉愭枡鈥︼紱`Name` 鏄?*璇█琛?id**锛屼笉鏄瓧闈㈠悕瀛?|

**杩愯鏃舵€庝箞鐢?*锛坄core/bz-rpc-server.js`锛夛細

- `acceptTask(taskID)`锛氳璐?+ 鎸?`SpRequire` **琛ラ綈鎵€闇€鐗╁搧**锛坄have < want` 鎵嶈ˉ锛屽凡鍦ㄥ寘閲屽氨涓嶅姩锛夈€?  娌℃湁杩欎竴姝ワ紝瀹㈡埛绔?`judgeItemRequire` 姘歌繙涓嶉€氳繃 鈫?浠诲姟浜や笉鎺夈€傚疄娴嬶細100150 闇€瑕?`4015脳1`锛?  鑰?`4015` 姝ｆ槸鍓嶄竴涓换鍔?100140 鐨勫鍔憋紝涔嬪墠濂栧姳鏄┖鐨勶紝鎵€浠ヨ繖閾惧瓙鏂湪杩欓噷銆?- `getFinishTaskAward(taskID)`锛氭妸浠诲姟绉昏繘 `done`锛?*鍚屼竴涓换鍔″彧鍙戜竴娆?*锛坄save.rewarded` 璁板悕鍗曪級锛?  鎸?`Reward 鈫?drop 鈫?item` 灞曞紑鍚?`rewardArray = {鐗╁搧id:鏁伴噺}` 骞跺啓鍏?`bag`銆?- `bzBackfillRewards`锛堢淮鎶ゅ姩浣滐紝鍙粠鍛戒护閫氶亾鎵擄級锛氭妸 `done` 閲?褰撴椂娌″彂鍑哄幓"鐨勫鍔辫ˉ鍙戜竴娆°€?- 璐у竵绫?id锛坄1` `2` `4001` `4002` `4003`锛変笉杩涘鍔憋細瀹㈡埛绔?`setItem` 瀵硅繖浜斾釜 id 璧扮壒娈婂垎鏀紝
  鏀捐繘 `itemObj` 鏃犳晥锛岀湡瀹炴湇鍔″櫒鏄蛋 `note.eco` 鐨勶紝鎴戜滑娌℃湁閭ｄ釜鏄犲皠琛ㄣ€?
### 4.8 瑁呭绌胯劚濂戠害锛堢収鎶勫嵆鍙級

瀹㈡埛绔湁**涓ゆ湰涓嶅悓鐨勮处**锛屽埆鎼炴贩锛?
| 璐︽湰 | 缁撴瀯 | 鍚箟 |
|---|---|---|
| `PlayerEquip` | `{ uid: [type, itemID, attrs, crystalIds, weaponSkinId] }` | **鎷ユ湁鐨勮澶囧疄渚?*銆俙type==1` 琛ㄧず"鏃犻檮鍔犲睘鎬?锛屾鏃?`uid == itemID`銆乣num = data[1]`锛沗type>=2` 鏃?`itemID = data[1]`銆佸睘鎬у湪 `data[2]` |
| `equipments` | `{ 瑁呭浣? uid }` | **褰撳墠绌垮湪韬笂鐨?*锛堟Ы浣?1鈥?锛?|

- **绌?*锛氬鎴风鍏堟湰鍦版崲濂藉啀鍙?`User.PutOnEquipment`锛岃姹?`{EquipmentType, itemID, hp, hplmt, gTime, mp}`锛坕ndex.jsc:65360-65370锛夈€?  鏈嶅姟鍣ㄥ彧璐熻矗璁拌处锛歚equipments[EquipmentType] = itemID`锛屽苟纭繚 `playerEquip[uid]` 瀛樺湪锛涘簲绛斿彧瑕?`eRet:1`锛堟秷璐圭浠呮淳鍙戝埛鏂颁簨浠讹紝index.jsc:65015锛夈€?- **鍗?*锛氳姹傚彧鏈?`{hp, hplmt, mp}`锛?*涓嶅甫妲戒綅**锛夛紝搴旂瓟鎴愬姛鍚庡鎴风鑷繁娓呯┖ `<8` 鐨勬Ы锛坕ndex.jsc:92801锛夈€傛湇鍔″櫒鎶?`equipments` 閲屾Ы浣?`<8` 鐨勯」鍏ㄥ垹銆?- **涓嶈璐︾殑鍚庢灉**锛氶噸杩涙父鎴忔椂 `LoadGame` 鍥炴斁鐨勮繕鏄棫 `equipments` 鈫?瑁呭鐧界┛銆?- `Type=1` 鐨勭墿鍝侊紙瑁呭锛?*涓嶈兘杩?`itemObj`**锛氬鎴风 `judgeItemRequire` 瀵硅澶囪蛋 `EqUtils.getEquipOrUid(itemID)`锛坕ndex.jsc:44279锛夛紝
  鐪嬬殑鏄?`equipmentDic`锛堝嵆 `PlayerEquip` 瑙ｆ瀽缁撴灉锛夛紝涓嶆槸鑳屽寘鏁伴噺銆傛墍浠ュ鍔卞彂鏀捐鎸?`BZ_ITEMTYPE` 鍒嗘祦锛堣 `grantItem`锛夈€?
### 4.9 鍏憡寮圭獥鑷姩鍏抽棴锛坒low 灞傦級

- 鐜拌薄锛氭瘡娆＄櫥褰曡繘涓诲満鏅兘浼氬脊涓€鍧楃┖鐧姐€屾父鎴忓叕鍛娿€嶏紝鎸′綇鏁翠釜鐢婚潰锛屽繀椤绘墜鍔ㄧ偣 鉁曘€?- 鍏虫硶锛歚ItemSystemUI` 閭ｅ娴佺▼涔嬪锛屽叕鍛婂脊绐楃殑缁勪欢鍚嶅氨鏄?`NoticeUI`锛坄notice/NoticeUI` 棰勭疆浣擄紝`addComponent("NoticeUI")`锛夛紱
  瀹㈡埛绔嚜宸辩殑鍏抽棴鍏ュ彛鏄?`NoticeMgr.romeveNoticeUI()` 鈫?`PopUpMgr.removePopUp(noticeUI)`锛屼絾 `NoticeMgr` 涓嶅湪鍏ㄥ眬锛屽涓嶅埌銆?- 瀹炵幇锛歚live/flow.js` 鐨?`stepNotice(scene)`鈥斺€斿湪涓诲満鏅瘡 tick 鎵?`NoticeUI` / 鍚嶅瓧鍖归厤 `/^(Small)?Notice(UI|DetailUI)?$/` 鐨勮妭鐐癸紝
  **鍏堣皟缁勪欢鑷繁鐨勫叧闂柟娉?*锛坄onBack` / `onClose` / `onCloseClick` / `onClickClose` / `closeUI` / `onBackClick`锛夛紝
  閮芥病鏈夋墠 `node.destroy()`銆傚疄娴嬭蛋鐨勬槸 `onBack()`锛屽共鍑€鍏抽棴锛堟棩蹇?`[flow] 鍏憡鈫抩nBack()`锛夈€?- 鍔犺繖涓槸鍥犱负瀹冩槸**姣忔鐧诲綍閮藉彂鐢?*鐨勯樆濉烇紝涓嶅叧鎺夌帺瀹惰繘娓告垙绗竴姝ュ氨琚尅銆?
### 4.5 涓変釜"閲嶅缓鍏ュ彛"鐨勮处鏈绾︼紙鐓ф妱鍗冲彲锛屽埆鍐嶇寽锛?
瀹㈡埛绔湁涓夋潯璺緞浼氭妸鏈湴鐘舵€?*鏁翠唤鏇挎崲**鎴愭湇鍔″櫒缁欑殑锛屼换浣曚竴鏉″洖绌洪兘浼氳鐜╁鐨勮繘搴︽竻闆讹細

| 鍔ㄤ綔 | 瀹㈡埛绔涓?| 鎴戜滑瑕佸洖 |
|---|---|---|
| `User.LoadGame` | `updatePlayerData` 鈫?`setSaveAllTaskDatas` / `setSaveAllItems` / `updateEquipments`锛坕ndex.jsc:111820锛?| `finishTaskObj:["id,1"]`銆乣acceptTaskArray`銆乣acceptTaskOrder`銆乣taskLog`銆乣itemObj:{id:count}`銆乣PlayerEquip`銆乣equipments` |
| `User.sycnTask` | 鍏?`finishTaskObj={}` 鍐嶆暣浣撴浛鎹紝骞舵妸缁撴灉鍐欏洖 LocalStorage锛?33515-133519锛?| `PlayerFinishTaskObj:{id:1}`銆乣acceptTaskMap:{id:id}`銆乣acceptTaskOrder`銆乣PlayerTaskLog`銆乣taskLog` |
| `User.sycnPlayerItemData` | 鍏?`_itemObj={}`銆乣type2Items={}` 鍐嶆寜 `itemObj` 閫愭潯 `setItem`锛?4016-24018锛?| `itemObj:{id:count}`锛坈ount>0 鐨?*鍏ㄩ儴**鎸佹湁鐗╋級 |

**鏍煎紡闄烽槺**锛歚finishTaskObj` 鍦ㄤ袱涓帴鍙ｉ噷褰㈢姸涓嶅悓鈥斺€擿LoadGame` 瑕?*瀛楃涓叉暟缁?* `["101080,1"]`锛?`sycnTask` 瑕?*瀵硅薄** `{"101080":1}`銆傚悓鍚嶅瓧娈典袱濂楁牸寮忥紝鍐欓敊涓嶆姤閿欍€佸彧鏄潤榛樺け鏁堛€?
**鐗╁搧澧炲噺鍏ュ彛**锛堝凡璁拌处锛夛細`useItem` / `saleItem`锛坄saleArr`锛? `buyShopItem` / `QuickBuyItem` / `addItem`銆?缁存姢鍏ュ彛 `bzSeedBag`锛堟父鎴忓崗璁噷娌℃湁杩欎釜鍔ㄤ綔锛屽彧鑳戒粠鍛戒护閫氶亾鎵撹繘鏉ワ級鐢ㄤ簬涓€娆℃€ф妸澶栭儴鎷垮埌鐨勬寔鏈夌墿鐏岃繘璐︽湰銆?
---

## 5. 鍗忚浜嬪疄锛堝凡楠岃瘉锛屽彲鐩存帴澶嶇敤锛?
| 椤?| 鍊?|
|---|---|
| 璇锋眰 | `{mod:"User", do:"<Action>", p:{...}}` 鈫?LZString(Base64) 鈫?AES-256-CBC 鈫?Hex |
| Key / IV | `120734aa834dea925ca8d2e1bb6811c3`锛圲TF-8 = 32 B 鈫?AES-256锛? `33daee8409834c00` |
| 鍝嶅簲淇″皝 | 鍏ュ彛鏈?`:9898` 鈫?`{"MsgData":..}`锛涜处鍙?娓告垙鏈?鈫?`{"code":200,"MsgData":..}` |
| 瀹㈡埛绔疄闄呰鐨勫灞傞敭 | 杩樻湁 `errorCode`锛堣 `field_usage.json` 鐨?R1/R7锛夛紝鎴戜滑鐨?`code` 鐩墠澶熺敤 |
| 杞借嵎涓ょ褰㈡€?| 鎵佸钩锛坬uicklogin/Create/CheckName/GetChatAddress锛? 鍖呰９锛堝叾浣欙細`p` + `User.<Action>` + `achievement`锛?|
| 鏈疄鐜板姩浣?| 缁熶竴鍥?`wrapped(action,{eRet:1},{achievement})`锛屼繚璇佷笉鍗?|

**LoadGame 濂戠害锛坄index.jsc:70502` 閫愬瓧娈电‘璁わ級**

蹇呴』缁欙細`baseValueAy`锛堚墺48 椤癸級銆乣OnhookObj.serverTime`銆乣skillMap`銆乣cycleLifeRetains`銆?`serverTime`锛涘彲閫変絾寤鸿锛歚serverFormatTime`銆乣housekeeper`銆乣bonusMap`銆乣equipments`銆?`veinObj`銆乣KillsItemObj`銆?*缂?`OnhookObj` 浼氬穿銆佺己 `baseValueAy[47]` 浼氳鎷滃笀宕┿€?*

---

## 6. 瀹炴祴鏁版嵁锛堝彲澶嶇幇鐨勯獙鏀跺熀绾匡紝2026-10-22 01:18 鏇存柊锛?
| 椤?| 缁撴灉 |
|---|---|
| 鍐峰惎鍔?鈫?gamescene | `ready` 绾?3 s銆侀殢鍚?**~16 s 杩涗富鍦烘櫙**锛宍errors=0`锛? 娆?RPC 鍏ㄦ湰鍦?|
| 鏈夋。鐩磋繘 | `flowSteps=2`锛堝彧 setServer + onEnterGame锛夛紝涓嶅啀閲嶅缓瑙?|
| 鐑噸杞?| push 113 KB锛坔andlers锛? 17 KB锛坒low锛夛紝reload **0.09鈥?.42 s**锛宲id 涓嶅彉 |
| L0 娴嬭瘯 | `l0-xhr` 21 椤?+ `l0-envelope` 82 椤癸紝鍏ㄧ豢 |
| 杩涚▼鍐呰嚜妫€ | 姣忔 reload 鑷姩璺?**1100 椤?*锛?37 鍔ㄤ綔褰㈢姸 + 浠诲姟璐︽湰 8 + 浠诲姟濂栧姳 4 + 鐗╁搧 6 + 瑁呭 5 + 鍘熸湁绯诲垪 + `selfcheck:noSaveWrite`锛夛紱搂14.9 娓呮帀 1 涓彧鍓╀吉閫犲瓧娈电殑鍔ㄤ綔鍚庝粠 1103 闄嶅埌 1100 |
| 鑷瀹夊叏鎬э紙鏂板锛?| `node test\selfcheck-nosave.js` 鈫?鐪熷瓨妗ｅ瓧鑺?0 鏀瑰姩锛沗node test\selfcheck-model-push.js` 鈫?娲诲鎴风妯″瀷 0 娆℃帹閫侊紙淇墠 3 娆★級 |
| 褰㈢姸鑷煡 | `node tools\check_shapes.js` 鈫?鐩爣鍔ㄤ綔 296 / 瀛楁璺緞 593 PASS |
| 鏀粯鎷︽埅 | 杩涚▼鍐呭疄娴?`IphonePay` / `GetPayShowData` / `createOrderByHotVal` 鈫?鍏ㄩ儴 `eRet:4`锛堝け璐ワ級 |
| 瑁呭璐︽湰瀹炴祴 | 杩涚▼鍐?`PutOnEquipment{EquipmentType:1,itemID:7535}` 鈫?`equipments:{"1":7535}`锛沗UnloadingEuipment` 鈫?`equipments:{}` |
| 鍏憡鑷姩鍏抽棴 | 姣忔杩涗富鍦烘櫙鏃ュ織鍑虹幇 `[flow] 鍏憡鈫抩nBack()`锛屾埅鍥炬牳瀵圭敾闈㈡棤閬尅 |
| 璐︽湰鍥炴斁瀹炴祴 | `LoadGame` 鈫?`itemObj` 6 绉嶃€乣finishTaskObj` 10 鏉°€乣acceptTaskArray` `[100150]`銆乣equipments` `{}` |
| `LoadGame` 璐熻浇鐢熸晥璇佹嵁 | 鎶婂瓨妗?`name` 鏀规垚 `TESTNAME` 閲嶅惎 鈫?瑙掕壊闈㈡澘鍚嶅瓧纭疄鍙樻垚 TESTNAME锛堟祴瀹屽凡鏀瑰洖 `FZhou`锛?|
| 瀹㈡埛绔湡瀹炶儗鍖呯姸鎬?| 鉁?璐︽湰 6 鏍峰凡钀藉湴锛歚RoleBaseInfo._itemObj` = `{3005,3006,3626,4014,4015,7027}` 鍚?1銆乣type2Items[2]` 鏈夊€硷紱`_itemDataList` 鍙湪**褰撳墠瀛愰〉**鍛戒腑鐧藉悕鍗曟椂鎵嶉潪 0锛堣 搂7.1锛?|
| `window.__require` | 鉁?鍙敤锛坄scripts3.js:1`锛夛細`__require('RoleBaseInfo').RoleBaseInfo._itemObj` 杩涚▼鍐呯洿鎺ュ彲璇伙紝涓嶅繀鍐?BFS `window`锛堟帹缈诲潙 20锛?|
| 閲戞潯 / 閾朵袱鐨勫瓧娈甸摼 | 閲戞潯锛漙RoleBaseInfo.gold`锛堥潰鏉?`GoldLabel`锛宻cripts2.js:49725锛夛紝姝ｈ鏉ユ簮锛漙InventoryDB.setGold`锛坕ndex.jsc:64300锛夆啇 `OnhookObj.curGold`锛?11905锛夈€傞摱涓わ紳`RoleBaseInfo.coins` 鈫?`baseValueAy[35]`銆傞《灞?`curGold` 鍙湁 `createRole`(70457) 璇伙紝鑰佹。璧颁笉鍒?|

---

## 7. 鏈畬鎴愭竻鍗曪紙鎸変紭鍏堢骇锛?026-10-22 01:18 閲嶆帓锛?
### P0锛堢洿鎺ュ奖鍝?鑳戒笉鑳界帺涓嬪幓"锛?
1. ~~**鑳屽寘鐣岄潰鏄┖鐨?*~~ 鈫?**鉁?宸茬粨妗堬細涓嶆槸 bug锛屾槸榛樿瀛愰〉涓虹┖**锛?026-10-22 01:33锛?   - **浜嬪疄**锛? 鏍风墿鍝佸湪瀹㈡埛绔?`_itemObj` 閲?*閮藉湪**锛涙墦寮€鑳屽寘鐐广€屼功淇°€嶈兘鐪嬪埌 `鍚愮撼娉曠绫?脳1`锛?     鐐广€屾秷鑰楀搧鈫掗鐗┿€嶈兘鐪嬪埌 `鐧界帀璞嗚厫 / 缈＄繝璞嗚厫 脳1`锛堟埅鍥?`probe/shot_bag_shuxin.png`銆乣probe/shot_bag_food.png`锛夈€?   - **璇垽鏉ユ簮**锛歚ItemSystemUI._itemDataList` 鏄?`divisionItem()` 杩囨护鍚庣殑**娓叉煋鍒楄〃**锛屼笉鏄处鏈€?     杩囨护鏉′欢锛坰cripts2.js:36805-36811锛夛紳 `o[y].numbers > 0` **涓?* `2 == I.Type` **涓?*
     鐗╁搧 `Effect` 鍑虹幇鍦?`effectcategory.page.split("|")[瀛愰〉]` 鐨勭櫧鍚嶅崟閲屻€?     榛樿钀藉湪澶х被銆屾秷鑰楀搧銆嶅瓙椤点€岃嵂鍝併€嶏紝鐧藉悕鍗?`33,2,3,4,6,23,25` 鈫?涓€浠堕兘涓嶅尮閰?鈫?鍒楄〃涓?0锛岀湅鐫€鍍忕┖鑳屽寘銆?   - **鍏牱鐗╁搧鐨勭湡瀹炲綊灞?*锛堣繘绋嬪唴瀹炴祴锛宍probe/bag_tab_probe.js`锛夛細
     | 鐗╁搧 | Effect | 澶х被 | 瀛愰〉 |
     |---|---|---|---|
     | 3005 / 3006锛堢櫧鐜夎眴鑵?/ 缈＄繝璞嗚厫锛?| 1 | 娑堣€楀搧 | 椋熺墿锛坄1,7,12`锛?|
     | 3626锛堝悙绾虫硶绉樼睄锛?| 11 | 涔︿俊 | 绉樼睄锛坄5,11,40`锛?|
     | 4014 / 4015 | 38 | 鍏朵粬 | 绗?3 椤碉紙`38,76`锛?|
     | 7027 | 28 | 涔︿俊 | 鐗规畩锛坄21,22,27,28,46,54,62,71`锛?|
   - **鏁欒**锛氭妸銆孶I 娲剧敓鍒楄〃涓虹┖銆嶅綋鎴愩€屾暟鎹负绌恒€嶆槸杩欐鏈€澶х殑璇垽锛岀洿鎺ユ妸涓婁竴杞甫鍘绘煡
     `setSaveAllItems` / `getItem` / 閰嶇疆琛ㄥ姞杞芥椂搴忊€斺€旀柟鍚戝叏鏄櫧宸ワ紙浣嗕篃鍥犳纭浜嗛偅涓夊閮芥病闂锛夈€?     鍒ゆ柇"鏁版嵁鏈夋病鏈?鍙 `__require` 鍑烘潵鐨勬ā鍨嬪瓧娈碉紝涓嶈 UI 瀛楁锛埪? 鍧?33锛夈€?   - **鐣欎笅鐨勫彲澶嶇敤鎵嬫**锛歚probe/require_probe.js`锛堟ā鍨?璐︽湰涓€娆℃€т綋妫€锛夈€乣probe/bag_tab_probe.js`锛堢墿鍝佸綊灞炲垽瀹氾級銆?2. **浠诲姟杩涘害鐘舵€佹満**锛歚Require` 閲?鏉€ N 涓€?閲?N 涓?杩欑被璁℃暟鎴戜滑娌℃湁鐘舵€佹満锛?   瀹㈡埛绔?`judgeTaskCondition` 璇荤殑鏄畠鑷繁绠楃殑杩涘害锛屽鏁版儏鍐靛鐢紱閬囧埌鎺ㄤ笉鍔ㄧ殑浠诲姟鍐嶈ˉ銆?   - **2026-10-22 01:50 瀹炴祴锛堝厛鍒収鐫€"缂虹姸鎬佹満"鍘诲啓浠ｇ爜锛?*锛氳繘绋嬪唴 `__require('RoleBaseInfo')` 璇诲埌
     `requireTaskObj` 鍙湁 `100150`锛坄taskState=0`锛夈€乣finishTaskObj` 10 涓€乣taskOrder` 11 涓€乣taskLog` 绌猴紱
     浠诲姟闈㈡澘姝ｅ父娓叉煋鍑恒€屽拰灏忓疂瀵硅瘽锛堜富绾夸换鍔★級銆嶏紱`100150` 鐨勮〃琛屾槸 `Type=2 / Require=0 / SpRequire=4015,1 / Reward=0`锛?     鍖呴噷姝ｅソ鏈?4015脳1 鈫?**鏉′欢鏈潵灏辨弧瓒?*銆?   - **閾惧瓙娌℃柇**锛歚tasknew` 閲屽墠缃负 `100150` 鐨勫彧鏈変竴涓?锛?`100160`锛坄Pre-Require="1,100150,0|0"`, `Reward=3008`锛夈€?     宸ュ叿锛歚node tools\task_chain.js <taskID>`锛堢畻鍓嶇疆/鍚庣户/鍙揪鏁帮紱娉ㄦ剰 `Pre-Require` 鏄?`flag,taskID,param|...` 缁撴瀯涓诧紝
     涓嶆槸瑁?id 鍒楄〃锛岃В鏋愯鎸?`|` 鍒嗘鍐嶅彇绗?2 娈碉級銆?   - 缁撹锛?*褰撳墠娌℃湁"鎺ㄤ笉鍔?鐨勪换鍔¤瘉鎹?*锛岃繖鏉′繚鎸?閬囧埌鍐嶈ˉ"锛屽埆鎻愬墠閫犵姸鎬佹満銆?3. ~~瑁呭绌胯劚~~ 鈫?**宸插畬鎴?*锛坄PutOnEquipment` / `UnloadingEuipment` 璁拌处 + `PlayerEquip` / `equipments` 鍥炴斁 + 瑁呭绫诲鍔卞垎娴侊紝瑙?搂4.8锛夈€?4. ~~浠诲姟濂栧姳~~ 鈫?**宸插畬鎴?*锛坄tasknew 鈫?drop 鈫?item` 鍘熻〃閾捐矾锛沗rewardArray` 鏈夊€硷紱`rewarded` 闃查噸鍙戯級銆?5. ~~鍏憡寮圭獥~~ 鈫?**宸插畬鎴?*锛坒low 鑷姩璋?`NoticeUI.onBack()`锛岃 搂4.9锛夈€?
### P1锛堜綋楠岋級

6. ~~**鍓ф儏鑷姩璺宠繃**~~ 鈫?**涓嶅仛锛屽苟瑕佹眰"璁╃帺瀹惰嚜宸辩湅鍓ф儏"**锛堢敤鎴?2026-10-22 02:00 鏄庣‘瑁佸畾锛夈€?   宸插姞纭棬鎺э紙`flow=fe3500480`锛夛細`onTick` 閲?`stepDialogue` / `stepStartAction` / `stepCreateRole` /
   `stepBirthPlace` / `stepSelectSex` / `stepAppearance` / `stepTalent` / `stepDiscover` 鍏ㄩ儴鍖呰繘
   `if (!S.done.game)` 鈥斺€?**涓€鏃﹁繘杩囦富鍦烘櫙锛屾祦绋嬪眰灏变笉鍐嶆浛鐜╁鐐逛换浣曞璇濇垨鍓ф儏椤?*锛?   寮曞鏈熶粛鑷姩鎺ㄨ繘锛堝惁鍒欏缓瑙掓祦绋嬩細鍗℃鍦ㄧ瓑寰呯偣鍑讳笂锛夈€?   - 涓诲満鏅噷娴佺▼灞傚彧鍓?`stepNotice`锛堝叧鍏憡锛屼笉鏄墽鎯咃級锛沗onTick` 鐨?gamescene 鍒嗘敮鍦ㄥ墽鎯呮楠や箣鍓嶅氨 `return`銆?   - 鎯宠繛鍏憡涔熶笉璁╂祦绋嬪眰纰帮細鍦ㄨ澶囦笂 `touch <鍙啓鐩綍>/bz_noauto` 鍗冲彲鏁翠綋鍋滅敤鑷姩娴佺▼锛堝垹闄よ鏂囦欢鎭㈠锛夈€?   - 璇佹嵁锛歚tools/facts/flow-autotap-audit.json`锛坒low.js 鍏ㄩ儴 11 澶勫璇濇帹杩?/ 8 澶勯攢姣?/ 20 澶勭偣鍑荤殑琛屽彿 + `onTick` 鏁存杞綍锛夈€?7. ~~**瑙掕壊闈㈡澘銆岄噾鏉★細undefined銆?*~~ 鈫?**鉁?宸蹭慨**锛坕mpl `hbb441fb3`锛夛細鏍瑰洜鏄?`OnhookObj.curGold` 缂哄け
   锛堥潰鏉?`GoldLabel` 鈫?`RoleBaseInfo.gold` 鈫?`InventoryDB.setGold(OnhookObj.curGold)`锛宨ndex.jsc:111905鈫?4300锛夈€?   `bz-rpc-server.js` 鐨?LoadGame 鐜板湪鎶?`curGold`锛堣处鏈?`s.gold` 浼樺厛锛屽惁鍒?99999锛変笌 `curJetton` 鍐欒繘 `OnhookObj`銆?   鍐峰惎鍔ㄥ疄娴嬮棬闈㈡樉绀?`閲戞潯锛?9999`锛堟埅鍥?`probe/shot_gold_fixed.png`锛夈€傞『甯︿慨鎺変簡 `getItemNum(1)` 绠楁垚 NaN 鐨勯殣鎮ｃ€?8. **绐楀彛浣撻獙**锛歚MuMuManager control -v 1 show_window` 鍚?Win32 `SetWindowPos` 鍥哄畾灏哄/浣嶇疆銆?
### P2锛堝伐绋嬪寲锛?
9. 褰㈢姸灞傜殑寮辫瘉鎹紙`listener-1` / `name` / `fallback` 鍏?200+ 鏉★級缁х画鏀讹細`tools\shapes_report.md` 鏈夐€愭潯娓呭崟銆?10. `extract_listeners.js` 鍙 `function(t, e)` 褰㈠紡锛涚澶村嚱鏁?/ `this.xxx.bind` 褰㈠紡鐨勭洃鍚櫒杩樻病瑕嗙洊銆?11. ~~`bz_cmd.txt` 鐨勫仴澹€~ 鈫?**鉁?宸插湪 `boot-2` 鏍规不**锛堣鍧?29 鐨勬柊瀵圭瓥锛夛細
    - **鍚姩鏃朵涪寮冩畫鐣?*锛歚installCommandChannel()` 鍏堣窇 `discardStaleCmd()`鈥斺€斿彂鐜板紑鏈烘椂宸插瓨鍦?`bz_cmd.txt`
      灏辨妸鍐呭鐣欐。鍒?`bz_cmd.stale.txt` 鍐嶅垹闄わ紝**缁濅笉鎵ц**銆傚彧鏈夋湰娆″惎鍔ㄤ箣鍚庡啓鍏ョ殑鍛戒护鎵嶄細琚墽琛屻€?    - **鍒犱笉鎺夌殑鍛戒护涓嶅啀閲嶆斁**锛氳疆璇㈤噷 `removeFile` 鍚庡鏌?`isFileExist`锛涜繕鍦ㄥ氨鎶婃枃浠舵竻绌哄苟**鎷掔粷鎵ц**
      锛堝惁鍒欓偅涓?700ms 瀹氭椂鍣ㄤ細鎶婂悓涓€鏉″懡浠ゆ棤闄愰噸鏀撅紝杩欐槸杩炵画 ANR 鐨勭湡姝ｆ満鐞嗭級銆?    - **楠屾敹锛堝師鏁呴殰閲嶇幇锛?*锛氬仠鏈虹姸鎬佷笅妞嶅叆 `get:1+1` 鈫?鍚姩鍚庢棩蹇楀嚭鐜?1 鏉°€屽惎鍔ㄦ椂涓㈠純娈嬬暀鍛戒护銆嶃€?      `bz_cmd.stale.txt` 閲屾槸 `get:1+1`銆乣bz_cmd.txt` 宸叉秷澶便€乣bz_res.txt` 浠嶆槸鏃у唴瀹癸紙**璇存槑涓€娆￠兘娌℃墽琛?*锛夛紱
      闅忓悗 `.\run.ps1 cmd "ver"` 姝ｅ父杩斿洖 鈫?姝ｅ父閫氶亾鏈彈褰卞搷銆?    - 鍥炴粴鐐癸細`_backup\2026-10-22-012652-pre-bagprobe\bz-bootstrap.js.pre-cmdfix`锛堥€嗗悜閲嶅缓锛屽瓧鑺傛暟 12767 涓庡師鏂囦欢涓€鑷达紝`node --check` 閫氳繃锛夈€?12. 褰掓。鏃╂湡瀹為獙浜х墿锛坄gateway/`銆乣probe\*` 涓€娆℃€ц剼鏈€乣tools\spec*` 鍒囩墖锛夈€?
---

## 8. 鍥炴粴涓庡浠?
| 瀵硅薄 | 浣嶇疆 |
|---|---|
| 琛ヤ竵婧愮爜锛堢浜岄樁娈靛墠锛?| `_backup\2026-10-21-2058-pre-P0\`锛坔ook/core/build.js/patch 浜х墿锛屽搱甯屽凡鏍稿锛?|
| 琛ヤ竵婧愮爜锛堝舰鐘跺眰鍓嶏級 | `_backup\2026-10-22-0038-pre-P0-shapes\`锛? 涓枃浠讹紝鍚綋鏃剁殑 `patch\live\handlers.js`锛?|
| 琛ヤ竵婧愮爜锛堜换鍔¤处鏈墠锛?| `_backup\2026-10-22-0044-pre-task-ledger\`锛? 涓枃浠讹級 |
| 绛栫暐灞傚崟鏂囦欢锛堝鍔遍摼鍓嶏級 | `_backup\2026-10-22-0107-bz-rpc-server.js` |
| **鑷闅旂鍓嶏紙搂14.2 鍓嶏級** | `_backup\2026-10-22-0205-pre-selfcheck-isolation\`锛歚core_bz-handler-impl.js` / `core_bz-rpc-server.js` / `patch_live_handlers.js` / `patch_live_flow.js` + 璁惧 `bz_offline_save.json`锛坢d5 `d8af398f41a4b903cbb530bb2b41066c`锛?68 B锛? `bz_log.jsonl` |
| **鐐奸噾/绛夌骇濂栧姳 handler 鍓嶏紙搂14.3 鍓嶏級** | `_backup\2026-10-22-0212-pre-alchemy-handlers\`锛歚core_bz-rpc-server.js` / `core_bz-handler-impl.js` / `patch_live_handlers.js` / `HANDOVER.md.snapshot` |
| **鎶€鑳藉崌绾х洰鏍囩瓑绾у墠锛埪?4.7 鍓嶏級** | `_backup\2026-10-22-0232-pre-skill-target\`锛歚core_bz-rpc-server.js` / `core_bz-handler-impl.js` / `patch_live_handlers.js` + 璁惧瀛樻。蹇収锛?68鈫?69 B锛宮d5 `39b5e89051204e453f90f3ce85f11a6a`锛宍lv=19 / potential=97599`锛?|
| 涓婁竴鐗堜氦鎺ユ枃妗?| `_backup\HANDOVER.md.bak-20261022-011755`锛堟洿鏃╋細`-010105`銆乣-005632`銆乣-005105`銆乣-004536`銆乣-001454`锛?|
| 鏈疆锛堣儗鍖呰鍒ゆ牳鏌ワ級鐜板満 | `_backup\2026-10-22-012652-pre-bagprobe\`锛坄bz_offline_save.json`銆乣bz_log.jsonl`銆乣probe.js`銆乣probe_res.txt`銆乣flow.js.bak`銆乣bz-rpc-server.js.bak`銆乣HANDOVER.md.snapshot`锛?|
| 娓告垙瀛樻。锛堝惈璐︽湰锛?| 璁惧 `files/bz_offline_save.json`锛沗.\run.ps1 cmd "state"` 闅忔椂鍙湅锛涙敼鍓嶅厛澶嶅埗涓€浠藉埌 `_backup\save-*` |
| 褰撳墠瀛樻。鐪熷疄鍐呭 | `name=FZhou`銆乣bag={3005,3006,3626,4014,4015,7027 鍚?1}`銆乣playerEquip={}`銆乣equipments={}`銆乣rewarded` 10 涓换鍔°€乣done` 10 涓€乣accepted` 11 涓紙鍚?100150锛?|
| 鍗歌浇琛ヤ竵锛堟仮澶嶅師鐗堬級 | `adb shell rm -rf /data/data/com.maple.madherogo/files/hotfix` |
| 鍙洖婊氱瓥鐣ュ眰 | 鎶?`handlers.js` / `flow.js` 鎹㈠洖涓婁竴鐗堝悗 `.\run.ps1 handlers`锛堟柊澶囦唤鐩綍閲屾湁褰撴椂璁惧涓婄殑閭ｄ竴浠斤級 |

---

## 9. 韪╄繃鐨勫潙锛堝惈鏈樁娈垫柊澧烇紝鍔″繀鍏堣锛?
| # | 鍧?| 鐥囩姸 | 瀵圭瓥 |
|---|---|---|---|
| 1 | 鎺㈤拡鍙傛暟鐢?ASCII 鍐欐枃浠?| 涓枃鍙傛暟鍙?`?`锛宍probe` 鎵句笉鍒拌妭鐐?| `run.ps1` 宸叉敼 UTF-8 鏃?BOM |
| 2 | 鐢?.NET API 璇诲啓鐩稿璺緞 | 鎶?鎵句笉鍒版枃浠?锛屽洜涓?.NET 鐢ㄨ繘绋?CWD 涓嶆槸 PS 浣嶇疆 | 涓€寰嬬粷瀵硅矾寰?|
| 3 | `Split-Path` 澶勭悊 POSIX 璺緞 | 鍙樻垚鍙嶆枩鏉?鈫?璁惧绔?`mkdir` 澶辫触 | 鐢?`-replace '/[^/]+$',''` |
| 4 | `adb` 瀹堟姢杩涚▼琚洖鏀?| 涓€?`device not found` | `run.ps1` 鍐呴儴姣忔璋冪敤閮介噸杩為噸璇?|
| 5 | `adb exec-out screencap` 璧?PS 绠￠亾 | PNG 琚牬鍧?| 鍏?`screencap -p /data/local/tmp/x.png` 鍐?`pull` |
| 6 | 娓告垙 HUD 鏈夊悓鍚嶉殣钘忓壇鏈?| `press.js` 鐐瑰埌 inactive 鐨勯偅浠斤紝"鐐逛簡娌″弽搴? | 鐢?*鍧愭爣鐐瑰嚮**锛坄tap.js`锛夋垨鎸?active 杩囨护 |
| 7 | 鍓ф儏灞備細鎸′綇涓€鍒囨搷浣?| 鐜╁浠ヤ负"鍗℃" | 鐐圭敾闈㈡帹杩?/ 銆岃烦杩囧墽鎯呫€?|
| 8 | 寮曞瑕?鎷滃笀"浣嗗凡鎷滆繃 | 鏃犳硶鍐嶇偣锛屾暀绋嬪崱浣?| `closeGuide:true` 鍏抽棴寮曞 |
| 9 | 鍙洖褰㈢姸涓嶈璐?| 瀛︽妧鑳藉悗"鍥炲脊" | 璐︽湰锛歚skills` + `potential` 鍐欐。骞跺湪 LoadGame 鍥炴斁 |
| 10 | 宸ュ崟婕忎簡"浜や粯鐗╄惤鐩? | 鑻﹀姏妯″瀷璺戝畬锛岀粨鏋滀涪澶?| 宸ュ崟寮哄埗 `tools/facts/batchN.json`锛屽洖浼犲彧浣滄牎楠?|
| 11 | 娌欑洅绂?spawn | `execFileSync`/`node --check` EPERM | 鐢?`require('vm').compileFunction` 浠ｆ浛 |
| 12 | PowerShell 鍐欐枃浠舵妸鍐呭鍐欐垚 `$null` | 鏂囦欢琚竻绌猴紙`run.ps1` 浜嬫晠锛?| 鍏?`Contains` 鏍￠獙鍐嶅啓锛涙敼鏂囦欢鐢?edit 宸ュ叿 |
| 13 | `sycnTask` 鍥?`PlayerFinishTaskObj: {}` | 瀹㈡埛绔妸瀹冨綋鐪熺浉锛岃繛鏈湴缂撳瓨涓€璧峰啓鎴?`{}` 鈫?宸插仛杩囩殑浠诲姟琚?NPC 閲嶆淳锛?鎺ヤ簡鍙堟帴"锛?| 鎸夎处鏈洖鏀撅紱鑷鍔?`task:sync:notEmpty` 鏂█ |
| 14 | 浠ヤ负涓や釜鎺ュ彛涓€涓牸寮?| `LoadGame` 瑕?`finishTaskObj: ["101080,1"]`锛堝瓧绗︿覆鏁扮粍锛屽鎴风鑷繁 `split(",")`锛夛紝`sycnTask` 瑕?`{ "101080": 1 }`锛堝璞★級 | 鐢?`taskLedger()` 涓€澶勪骇鍑轰袱濂楀舰鐘讹紱瑙?`bz-rpc-server.js` |
| 15 | 鐓ф姄鍖呮妱閽卞寘瀛楁 | 鎶撳埌鐨勬槸鏃у揩鐓?`userGold:20`锛屼笌杩涙父鎴忔姤鐨?99999 鐭涚浘锛屽鎴风寮?閾朵袱涓嶈冻" | 閽卞寘/娼滆兘绫诲瓧娈典竴寰嬭璐︽湰锛岃处鏈病鏈夊氨鎸?LoadGame 鍚屾鍊?|
| 16 | 鍙粰涓€琛?璇诲彇澶?鎺ㄤ笉鍑虹被鍨?| 291 涓瓧娈典綅閲?119 涓帹涓嶅嚭鏁扮粍/瀵硅薄/鏍囬噺 | 鍔犺瘉鎹簮锛氭姄鍖呯湡鍊?鈫?鐪熷疄 handler 鈫?浜哄伐鍒ゅ畾 鈫?瀹㈡埛绔垵鍊?`= [] / {}` 鈫?鍏ㄦ簮鐢ㄦ硶鎵弿 |
| 17 | 瀛楁鎶藉彇鍙鍏峰悕鍥炶皟 | `useItem` 琚鍒ゆ垚"鍙湅 ACK"锛屽疄闄呭鎴风璇?`note.skch`锛?4757锛夛紝鎴戜滑鍥?`{eRet:1}` 鈫?`a.note.hasOwnProperty` 鎶涘紓甯?| `tools/extract_listeners.js` 琛ユ壂鍖垮悕鐩戝惉鍣紝涓€娆℃寲鍑?249 涓姩浣?/ 679 瀛楁 |
| 18 | `sycnPlayerItemData` 鍥炵┖ | 瀹㈡埛绔厛 `_itemObj={}` 鍐嶆寜 `itemObj` 閲嶅缓 鈫?姣忔鍚屾鎶婅儗鍖呮竻绌?| 鍥炲叏閮ㄦ寔鏈夌墿锛堣处鏈?`bag`锛夛紱鑷鍔?`item:sync:itemObj` |
| 19 | 浠ヤ负 `finishTaskObj` 涓€绉嶆牸寮?| 瑙?4.5锛歚LoadGame` 瑕佸瓧绗︿覆鏁扮粍銆乣sycnTask` 瑕佸璞?| 鐢?`taskLedger()` 涓€澶勪骇鍑轰袱濂?|
| 20 | 鎯充粠瀹㈡埛绔鑳屽寘 | `_itemObj` 鍦ㄦā鍧楅棴鍖呴噷锛歚window` BFS 8000 鑺傜偣鎵句笉鍒帮紝`cc.js.getClassByName` 鍙湁鏋勯€犲嚱鏁?| 鏀逛负"璐︽湰鍗崇湡鐩?锛涗竴娆℃€у鍏ョ暀浜?`bzSeedBag` 缁存姢鍔ㄤ綔 |
| 21 | 鎷跨湡杩涚▼閲岀殑 handler 鍋氶獙璇?| `upgradeSkill` 绌哄弬鏁颁竴鎵擄紝`skillID` 缂虹渷鎴?0锛?*鐪熷瓨妗ｈ鍐欎簡 skills["0"] 骞舵墸浜?100 娼滆兘** | 璇曟墦鍓嶅厛 `cmd "state"` 瀛樻。蹇収锛涘凡鍔犵淮鎶ゅ姩浣?`bzPatch`锛坄{set,del}`锛夌敤浜庝慨澶嶏紱闈炲繀瑕佷笉鍦ㄧ湡杩涚▼鎵撲細鍐欐。鐨勫姩浣?|
| 22 | 褰㈢姸琛ㄧ粰鏀粯绫诲洖 `eRet:1` | 绛変簬瀵瑰鎴风璇?鍏呭€兼垚鍔?锛岃繚鍙嶉」鐩竟鐣?| `dispatch` 閲?`PAY_ACTION_RE` 涓€寰嬫嫤鎴?`eRet:4`锛堟槑纭け璐ワ級锛屽苟璁?`PAY_BLOCKED`锛涜嚜妫€鏈?`shape:<鍔ㄤ綔>:payBlocked` 鏂█ |
| 23 | 褰㈢姸琛ㄨ烦杩囧凡瀹炵幇鍔ㄤ綔 | 鎵嬪啓 handler 婕忓瓧娈碉紙`getFinishTaskAward` 灏戜簡 `clearBoxs/contribution/triggerBoxs`锛夛紝褰㈢姸淇笉鍒板畠 | 褰㈢姸=濂戠害锛氱敓鎴愬櫒瑕嗙洊鍏ㄩ儴浼氳瀛楁鐨勫姩浣滐紱`fillShape` 鍙ˉ缂轰笉瑕嗙洊锛沗BZ_SHAPES.__impl` 鏍囧嚭"eRet 鐢?handler 鑷畾"鐨勯偅浜?|
| 24 | 鎯充粠缂撳瓨閲屾崬閰嶇疆琛?| `cc.loader._cache` / `cc.assetManager` 閲岄兘娌℃湁锛堥厤缃姞杞藉畬鍗抽噴鏀撅級锛屾壂 1019 涓妭鐐逛篃鏄?0 | **鑷繁鍐嶈涓€娆?*锛歚bundle.load(['configs/item'], cc.Asset, null, cb)`锛岃 `asset._nativeAsset.data`锛涜 `probe/dump_tables.js` |
| 25 | 浠ヤ负 `Reward` 鏄墿鍝?id | 3054 涓嶅湪鐗╁搧琛ㄩ噷 鈫?灞曞紑鍑烘潵鏄┖鐨?| `Reward` 鏄?*鎺夎惤琛?id**锛沗drop.Item1..5=[id,count]`銆傚彧鏈夊皯鏁颁换鍔＄洿鎺ュ啓鐗╁搧 id锛岃鍏滃簳 |
| 26 | 琛ㄧ敤绗?0 鍒楀綋涓婚敭 | 绗?0 鍒楁槸 `__name__`锛屽拰 `ID` 涓嶄竴瀹氱浉绛?鈫?鏌ヨ〃鏌ヤ笉鍒?| 鐢?`ID`锛堟垨 `TaskID`锛夊垪浣滀富閿?|
| 27 | 浠诲姟鍗″湪"浜や笉鎺? | 浠诲姟 100150 鐨?`SpRequire` 瑕?`4015脳1`锛屾垜浠粠涓嶅彂鐗╁搧 鈫?`judgeItemRequire` 姘歌繙 false | `acceptTask` 鏃舵寜 `SpRequire` 琛ラ綈锛涙湁浜嗗鍔遍摼鍚?`4015` 鏈潵灏变細鐢?100140 鐨勫鍔卞彂鏀?|
| 28 | **鍦ㄨ窇鐫€鐨勬父鎴忛噷鍋氬叏鍥?BFS** | 鐢?`seen.indexOf(o)` 鍒ら噸鏄?O(n虏)锛屼富绾跨▼鍗℃ 鈫?**Android ANR 鈫?MuMu 寮?Application Error 鈫?寮哄埗鍋滄帀娓告垙**锛坙ogcat: `Input channel object ... Application Error`锛?| 鎺㈤拡閲屼竴寰?`Set` 鍒ら噸 + **闄愰噺**锛堣妭鐐逛笂闄?12000銆佹椂闂撮绠?2500ms锛夛紱鍐嶅皬鐨勪笂闄愶紙800 鑺傜偣锛夋渶绋?|
| 29 | **娈嬬暀鐨?`bz_cmd.txt` 浼氬湪姣忔鍚姩閲嶆斁** | 涓婁竴鏉℃帰閽堣秴鏃跺悗鍛戒护鏂囦欢娌¤娑堣垂锛屼箣鍚庢瘡娆″惎鍔ㄥ懡浠ら€氶亾鍙堟墽琛屼竴閬嶉偅娈靛崱姝讳唬鐮?鈫?杩炵画 ANR锛岀湅鐫€鍍?娓告垙鑷繁宕? | **宸叉牴娌伙紙boot-2锛?*锛氬紑鏈烘椂宸插瓨鍦ㄧ殑 `bz_cmd.txt` 涓€寰嬬暀妗ｅ埌 `bz_cmd.stale.txt` 鍚庡垹闄ゃ€?*涓嶆墽琛?*锛涜疆璇㈤噷 `removeFile` 鍚庡鏌?`isFileExist`锛屽垹涓嶆帀灏辨竻绌哄苟鎷掔粷鎵ц锛堥槻 700ms 鏃犻檺閲嶆斁锛夈€備复鏃舵墜娈典粛鏄?`adb shell rm -f files/bz_cmd.txt`銆傝 搂7 P2-11 |
| 30 | 鐢?PowerShell `Set-Content` 鏀瑰惈涓枃鐨?JS | 缂栫爜鍧忔帀銆佹敞閲婃妸涓嬩竴琛屽悆鎺?鈫?鎺㈤拡鐩存帴璇硶閿?姝诲惊鐜?| 鏀规枃浠跺彧鐢?`edit` / `write` 宸ュ叿锛汸S 鍙敤鏉ヨ窇鍛戒护 |
| 31 | 鍦ㄧ湡瀛樻。涓婂仛"鏀瑰悕"瀹為獙 | 涓轰簡楠岃瘉 LoadGame 鏄惁鐢熸晥锛屾妸 `save.name` 鏀规垚 TESTNAME | 瀹為獙瀹岀珛鍒荤敤 `bzPatch` 鏀瑰洖锛堟湰娆″凡鏀瑰洖 `FZhou`锛夛紱鍋氳繖绫诲疄楠屽墠鍏?`state` 瀛樺揩鐓?|
| 32 | 浠ヤ负瀹㈡埛绔細涓诲姩鍙戠墿鍝佸悓姝?| 鍏ㄥ鎴风**娌℃湁**浠讳綍鍦版柟鍙戦€?`User.sycnPlayerItemData`锛堝彧鏈夌洃鍚櫒 24014锛夛紝瀹冩槸鏈嶅姟鍣ㄦ帹閫佸瀷 | 鍒寚鏈涘鎴风鏉ヨ鏁版嵁锛涚幆鍥炲彧鑳藉簲绛旓紝鎵€浠ョ墿鍝佸繀椤婚潬 `LoadGame` 甯﹁繃鍘烩€斺€旇繖涔熸槸 搂7.1 鐨勯毦鐐规墍鍦?|
| 33 | **鎶?UI 娲剧敓鍒楄〃褰撴垚鏁版嵁璐︽湰** | `ItemSystemUI._itemDataList.length == 0` 琚綋鎴?鑳屽寘绌?锛屽疄闄?`_itemObj` 閲?6 鏍烽兘鍦紱鐧芥煡涓€鏁磋疆锛坄setSaveAllItems` / `getItem` / 閰嶇疆琛ㄦ椂搴忓叏鐧藉伐锛?| 鍒ゆ柇"鏁版嵁鏈夋病鏈?鍙妯″瀷瀛楁锛坄__require` 鍑烘潵鐨?`RoleBaseInfo._itemObj`锛夛紱UI 鍒楄〃鏄?*杩囨护鍚?*鐨勶紝澶╃劧鍙互涓?0銆傝 搂7.1 |
| 34 | 浠ヤ负瀹㈡埛绔ā鍨?鍦ㄩ棴鍖呴噷澶熶笉鍒?锛堝潙 20 鐨勭粨璁猴級 | BFS 鎵?`window` 8000 鑺傜偣鎵句笉鍒?`_itemObj`锛屼簬鏄斁寮冪洿璇汇€佹敼鎴?璐︽湰鍗崇湡鐩? | **`window.__require` 灏卞湪 `scripts3.js:1`**锛氱煭鍚嶆煡鏈寘銆佸け璐ュ洖閫€涓婁竴涓?bundle銆俙__require('RoleBaseInfo').RoleBaseInfo._itemObj` 涓€姝ュ埌浣嶃€傚潙 20 鍙槸鏂规硶閿欙紝涓嶆槸浜嬪疄銆傚伐鍏?`probe/require_probe.js` |
| 35 | 浠ヤ负銆岄噾鏉★細undefined銆嶆槸 `RoleBaseInfo.yuanbao` 娌＄粰 | 闈㈡澘鍗?undefined锛涚粰瀹冭祴鍊?`yuanbao` 鍚庨噸寮€闈㈡澘**浠嶇劧** undefined锛坄yuanbao` 鏈韩瀹炴祴灏辨槸 0锛?| **鏍瑰洜**锛氶潰鏉?`GoldLabel` 缁戠殑鏄?`RoleBaseInfo.gold`锛坰cripts2.js:49725锛夛紝鑰?`gold` 鐨勫敮涓€姝ｈ鏉ユ簮鏄?`InventoryDB.setGold()`锛?4300锛夆啇 `OnhookObj.curGold`锛?11905锛夛紱鎴戜滑鍙粰浜嗛《灞?`curGold`锛堥偅鍙 `createRole` 70457 璇伙級锛岃€佹。璧颁笉鍒?鈫?`gold` 鎭?undefined銆?*淇硶**锛氭妸 `curGold/curJetton` 鍐欒繘 `OnhookObj`锛坄bz-rpc-server.js` LoadGame锛夛紝鍐峰惎鍔ㄥ疄娴嬮潰鏉挎樉绀?`閲戞潯锛?9999` |

---

## 10. 濮旀淳绾緥锛堟湰闃舵宸插缓绔嬶紝缁х画鐢級

- 宸ョ▼鑻﹀姏 鈫?`gemini-3.8-flash-low`锛坄provider: cmdc-gemini`锛夛紝**鍙仛鏈烘杞綍**锛氳鍒囩墖銆佹妱琛屽彿銆佹妱瀛楁銆?- 宸ュ崟蹇呭甫锛氳寖鍥达紙缁濆璺緞娓呭崟锛夈€佽嫤鍔涚害鏉燂紙涓嶅垽鏂?涓嶆帹娴嬶級銆佷氦浠樻牸寮忥紙`琛屽彿: 鍘熸枃`锛夈€?  **浜や粯鐗╄惤鐩樿矾寰?*銆佹暟鎹孩绾裤€?- 涓诲鍙仛锛氬啓宸ュ崟銆侀獙鏀舵娊鏍凤紙姣忎唤鎶?1鈥? 鏉″洖婧愮爜鏍稿锛夈€佸垽鏂笌鍐欏叆銆?- 宸蹭骇鍑虹殑璇佹嵁閾撅細`tools/spec2/`銆乣tools/spec3/`锛堝垏鐗囷級銆乣tools/facts/batch*.json`锛堢敤娉曞彇璇侊級銆?  `tools/field_usage.json`锛堝悎骞讹級銆乣tools/action_facts_all.json`锛?12 鍔ㄤ綔鍏ㄩ噺锛夈€?- 2026-10-22 01:33 杩欎竴杞殑瀹為檯鐢ㄦ硶锛堝彲鐓ф妱锛夛細4 鍗曞叏閮?`gemini-3.8-flash-low`锛屽伐鍗曞彧缁欍€岃绗?X-Y 琛屻€侀€愬瓧鎶勩€佹爣琛屽彿銆嶏紝
  浜や粯寮哄埗钀界洏 `tools/facts/inv-w*.json` + 鍥炰紶鍚屼竴浠?JSON锛涗富瀹″彧鍋氬垽瀹氫笌鎶芥牱锛堟娊 2 鏉″洖婧愮爜鏍稿锛? 娆￠€氳繃锛夈€?  鏁堟灉锛歚index.js`+`scripts2`+`scripts3` 鍏?33 涓囪鐨勬绱㈠熀鏈病鍚冧富涓婁笅鏂囷紝
  涓斾粠 `scripts3` 閲屾寲鍑轰簡 `window.__require`锛堟帹缈诲潙 20锛変笌 `RogueRoleInfo` 绗簩鏈处銆?
---

## 11. 鎺ユ墜绗竴澶╂€庝箞鍋氾紙鐓у仛鍗冲彲锛?
1. `.\run.ps1 status` 鈫?纭 `scene=gamescene`銆乣errors` 鏃犮€?2. `node test\l0-envelope.js` 鈫?82 椤瑰叏缁裤€?3. 鎵撳紑妯℃嫙鍣ㄧ獥鍙ｏ紙绗?3 鑺傦級锛岃倝鐪肩‘璁ょ敾闈笌鏃ュ織涓€鑷淬€?4. 鎯虫敼浠€涔堬細鏀?`core\bz-rpc-server.js` 鈫?`node build.js` 鈫?`.\run.ps1 handlers`锛?*涓嶉噸鍚?*锛夈€?5. 鐜╁鍦ㄧ帺鏃讹細`.\watch.ps1` 鐩?`UNKNOWN` / `err`锛屽嚭鐜板氨鎸夌 4.2 鑺傛煡婧愮爜琛ュ舰鐘躲€?6. 闇€瑕佹柊鍔ㄤ綔锛歚node tools\extract_all.js` 鏌?`field_lines` 鈫?鍥?`tools/index.js` 鎶勯偅涓€琛?鈫?鍐?handler銆?
---

## 12. 缁欐帴鎵嬭€呯殑涓€鍙ヨ瘽

**鍏堢湅鏃ュ織鍐嶅姩鎵嬶紝鍏堟煡婧愮爜鍐嶇寽褰㈢姸銆?*
绗簩闃舵璇佹槑浜嗭細鎶撳寘鍜岃倝鐪艰瀵熷彧鑳芥敮鎾戝埌"鑳借繘娓告垙"锛屽線鍚庢瘡涓€姝ラ兘蹇呴』璇诲鎴风婧愮爜銆?鐜板湪婧愮爜宸茬粡瑙ｅ嚭鏉ヤ簡锛坄tools/index.js` + 瀵嗛挜锛夛紝鎶?鐚?鎹㈡垚"鏌?锛屾槸鏈€鐪佹椂闂寸殑涓€鏉¤矾銆?
---

## 13. 2026-10-22 01:57 浼氳瘽鏀跺熬浜ゆ帴锛?*涓嬩竴涓細璇濅粠杩欎竴鑺傝璧?*锛?
> 鏈細璇濇寜鐢ㄦ埛瑁佸畾鎵ц锛?*浠诲姟缁撴潫鏃朵笂涓嬫枃鑻?鈮?0%锛屽氨鑷繁鍐欎氦鎺ャ€佸紑鏂颁細璇?*銆傛湰鑺傚氨鏄繖娆′氦鐝€?
### 13.1 褰撳墠閮ㄧ讲涓庡疄娴嬬姸鎬侊紙鍏ㄩ儴杩涚▼鍐呴獙璇佽繃锛?
| 椤?| 鍊?|
|---|---|
| 鐗堟湰 | `boot-2 / impl=he7190a3a / flow=fe3500480`锛?*鏈細璇濆綋鏃?*鐨勭増鏈紱褰撳墠鐗堟湰瑙?搂14.1锛?|
| 杩愯 | `pid 24125`銆乣scene=gamescene`銆乣errors=0` |
| 瀛樻。 | `potential=98699`銆乣skills={"1":[8,0,1],"7":[2,0,1],"8":[10,0,1],"1112":1,"1262":1}`銆乣bag={3005,3006,3626,4014,4016,7027}`銆乣done/rewarded` 鍚?12 涓换鍔?|
| 瀹㈡埛绔竴鑷存€?| `__require` 鐩磋锛歚potentials=98699`銆乣SkillTable.dic` `1=8 / 7=2 / 8=10` 鈥斺€?**涓庤处鏈畬鍏ㄤ竴鑷?* |
| 鏈」鐩綍 | `_backup\2026-10-22-012652-pre-bagprobe\`锛堝瓨妗?鏃ュ織/`flow.js.bak`/`bz-rpc-server.js.bak`/`bz-bootstrap.js.pre-cmdfix`/鏂囨。蹇収锛?|

### 13.2 鏈細璇濅慨濂界殑鍥涗欢浜嬶紙閮芥湁楠屾敹璇佹嵁锛?
1. **閲戞潯 `undefined`** 鈫?`OnhookObj.curGold`锛堥潰鏉?`GoldLabel` 鈫?`RoleBaseInfo.gold` 鈫?`InventoryDB.setGold(OnhookObj.curGold)`锛夈€傝瑙?搂7 P1-7銆佸潙 35銆?2. **鍛戒护閫氶亾娈嬬暀閲嶆斁**锛坄boot-2`锛夆啋 鍚姩涓㈠純 + 鍒犱笉鎺夊氨鎷掔粷鎵ц銆傝瑙?搂7 P2-11銆佸潙 29銆?3. **鍓ф儏涓嶅啀琚嚜鍔ㄦ帹杩?*锛坄flow=fe3500480`锛夆啋 杩涜繃涓诲満鏅悗 `stepDialogue/stepStartAction/...` 鍏ㄩ儴璺宠繃銆傝瑙?搂7 P1-6銆?4. **鎶€鑳藉崌绾?*锛坄impl=he7190a3a`锛夆啋 绛夌骇鍗曡皟涓嶉檷锛堟棫浠ｇ爜鐓ф妱瀹㈡埛绔?`skillArr[1]`锛岃鏁?鍙栨秷"鏃舵妸 10 鍐欐垚 2锛夛紱骞舵妸 `potentials`/`SkillTable.setSkill` 鐢?`window.__require` 鎺ㄥ洖瀹㈡埛绔ā鍨嬶紙璇ュ姩浣滅殑搴旂瓟娑堣垂绔彧璇?`eRet`/`returnPro`锛宨ndex.jsc:119842锛夈€?
### 13.3 鏈В娓呭崟锛堟寜鎴戝垽鏂殑浼樺厛绾э級

1. ~~**鑷鍦ㄦ薄鏌撶湡瀛樻。**~~ 鈫?**鉁?宸茬粨妗堬紙搂14.2锛夛紝浣嗗師璇婃柇鍙浜嗕竴鍗婏紝璇昏繖娈佃鐪嬫洿姝ｅ悗鐨勫彛寰?*锛?   - **瀛樻。鏂囦欢鍏跺疄娌¤鍐?*锛歚selfCheck()` 閲?6 涓疄渚嬶紙`iso`/`ts`/`isrv`/`rw`/`es`/`gs`锛夊叏閮?`makeServer(memMake())`锛?     `persist()` 璧扮殑鏄唴瀛?store銆傚彲澶嶈窇璇佹槑锛歚node test\selfcheck-nosave.js` 鈥斺€?鎶婄湡瀛樻。鍐呭濉炶繘鍋?bz 鐨?store锛?     璺戝畬 `writesToSave=0`銆佸瓧鑺備笌 sha 瀹屽叏涓嶅彉銆?   - **鐪熸琚薄鏌撶殑鏄椿鐫€鐨勫鎴风妯″瀷**锛歚upgradeSkill` 缁撳熬閭ｆ `window.__require` 鎺ㄩ€佸湪鑷閲屼篃鎵ц浜嗭紝
     浜庢槸姣忔 `run.ps1 handlers` 閮戒細 `RoleBaseInfo.potentials = 99699`锛堝唴瀛樼┖妗ｇ畻鍑虹殑 99999-100脳3锛?     骞?`SkillTable.setSkill(0, 1..3)` 閫犲嚭**鍋囨妧鑳?0**銆傚璺戣瘉鏄庯細`node test\selfcheck-model-push.js`
     锛堜慨鍓?`potPushes=[99899,99799,99699]`銆乣setSkill=[[0,1],[0,2],[0,3]]`锛涗慨鍚庡叏绌猴級銆?   - 杩欎篃瑙ｉ噴浜嗕负浠€涔?搂13.1 鐨勫瓨妗ｉ噷 `potential` 涓€鐩存槸 98699銆乣skills` 閲屾病鏈?`"0"`鈥斺€斿瓨妗ｄ粠鏉ユ病琚嚜妫€鏀硅繃銆?   - 淇硶涓庡洖褰掔敤渚嬭 搂14.2銆?2. ~~**璇锋暀闈㈡澘"瀛﹀埌 12銆佸彇娑堝彉 8"**~~ 鈫?**鉁?宸茬粨妗堬紙搂14.7锛宨mpl `hee1125fd`锛?*
   - **鍘熷璇锋眰鍙傛暟宸叉嬁鍒?*锛?026-10-22 02:31 鐢ㄦ埛杩炵偣 7 娆★紝`bz_log.jsonl` 绗?177-196 琛岋級锛?     `{"skillID":1,"skillArr":[15,0,1],"NPCID":1003,"flag":0}` 鈥斺€?`skillArr = [鐩爣绛夌骇, 鍓╀綑杩涘害, 绐佺牬绛夌骇]`銆?   - **12鈫? 鐨勬満鐞?*锛氬鎴风鍙戠殑 `skillArr[0]` 鏄?*瀹冭嚜宸辩畻鐨勭洰鏍囩瓑绾?*锛坄scripts2.js:13851` `lv: o.lv + 1`锛夛紝
     鐐?鍙栨秷"鏃跺鎴风鍙戠殑浠嶆槸瀹冩湰鍦伴偅涓婕旂洰鏍囷紱鏃т唬鐮佽 `skillArr[1]`锛? pgr锛屾亽 0锛夆啋 钀藉埌 `cur+1`锛?     浜庢槸"鏃犺瀛﹀嚑绾ч兘鍙定涓€绾с€佸彇娑堜篃娑ㄤ竴绾?銆傜幇宸叉敼涓烘寜 `skillArr[0]` 璁拌处銆佺洰鏍団墹褰撳墠鍗充笉鍔ㄣ€?3. ~~**`getAlchemyData` 鎶涘紓甯?*~~ 鈫?**鉁?宸蹭慨锛埪?4.3锛宨mpl `h81668f61`锛?*锛氭敼鎴愭墜鍐?handler 鍥?   `{eRet:1, data:{state:0,type:0,id:0,price:10,num:0}, alchemyGearConfig:{}}`銆傚師鏉ヨ惤閫氱敤 ACK 鏃?   瀹㈡埛绔?`onGetAlchemyData`锛坰cripts3.js:7005-7026锛夌洿鎺ヨ `e.data.state` 鈫?`TypeError: Cannot read property 'state' of undefined`銆?   鍚岀骇闂 `getLevelBonusData` 涔熶竴骞惰ˉ浜嗭紙娑堣垂绔?scripts3.js:43812-43828锛宍LevelBonusUI.loadItems` 鍙?`for..in bonusObj`锛岀┖瀵硅薄瀹夊叏锛夈€?4. **浜や换鍔″悗 3 娆?`.includes` 寮傚父**锛歚unhandledRejectedPromise TypeError: Cannot read property 'includes' of undefined`锛岀揣璺?`getFinishTaskAward 100150`锛屽彧鍦ㄧ櫥褰曠獥鍙ｅ唴鍑虹幇 3 娆°€佷笉澶嶅彂銆俙onGetFinishTaskAward` 鍦?`index.js`/`scripts3.js` 閲屾悳涓嶅埌鍚嶅瓧锛堝尶鍚嶇洃鍚櫒锛夛紝闇€鍐嶅畾浣嶆秷璐圭偣銆?5. ~~**涓や釜 `UNKNOWN` 鍔ㄤ綔**~~ 鈫?**鉁?宸茶ˉ锛埪?4.3锛?*锛歚getAlchemyData`銆乣getLevelBonusData` 鐜板湪鏄墜鍐?handler锛?   绔笂鏃ュ織鐢?`UNKNOWN User.xxx` 鍙樻垚 `dispatch User.xxx`銆?   - 鏈疆杩樼湅鍒颁竴鏉℃柊鐨?`UNKNOWN User.recordAttributes`锛坄p={attrs:[23 涓暟],userAccount,roleID,loginFlag,inGameTime,nonce,clientVersion}`锛夛紝
     灞炲睘鎬т笂鎶?蹇冭烦绫伙紝閫氱敤 ACK 澶熺敤銆佷笉鍗¤繘搴︼紱鏆備笉瀹炵幇銆?
### 13.4 ~~涓€鏉″弽鐩磋浜嬪疄~~ 鈫?**宸叉帹缈伙紙2026-10-22 02:15锛岃瘉鎹細`tools/facts/upgrade-skill-send-path.json`锛?*

**涓婁竴鏉＄粨璁烘槸鎼滄紡浜?`scripts2`锛屼笉鏄簨瀹炪€?*鐪熷疄鍙戦€侀摼锛堜袱涓?bundle 鍚勪竴娈碉紝鎺ュ緱涓婏級锛?
| 浣嶇疆 | 浠ｇ爜 | 璇存槑 |
|---|---|---|
| `scripts2.js:13923-13928` | `sendUpgradeReq(t,e)` 鈫?`h.SkillModel.reqChangeSkillLv(t, e.lv, e.pgr, e.brlv, this.teacher, this.type)` | **璇锋暀 UI 鐨勫彂閫佸叆鍙?*锛堝敮涓€璋冪敤鐐癸級 |
| `index.js:119873-119881` | `reqChangeSkillLv = function(t,e,o,i,a,s){ var l={skillID:t, skillArr:[e, Math.floor(o), i], NPCID:a, flag:s}; NetMgr.http.sendRequest(UPGRADE_SKILL_LV, l) }` | `skillArr = [绛夌骇, 杩涘害, 绐佺牬绛夌骇]` |
| `index.js:59581` | `UPGRADE_SKILL_LV: "User.upgradeSkill"` | 鍔ㄤ綔鍚嶅父閲?|
| `index.js:119842-119845` | `MessageCenter.on(UPGRADE_SKILL_LV, function(t,e){ dispatch(SYNC_UPGRADE_RES, e.eRet); e.hasOwnProperty("returnPro") && show(...) })` | 搴旂瓟娑堣垂绔?*鍙?*璇?`eRet` / `returnPro` |

鏁欒锛堟瘮缁撹鏇村€奸挶锛夛細**鍑″垽瀹?鏌愬嚱鏁版湁娌℃湁璋冪敤鐐?锛屼笁鍖呭繀椤诲叏鎼?*锛坄index.js` / `scripts2.js` / `scripts3.js`锛夈€?涓婁竴杞彧鎼滀簡 `index.js` 灏卞啓涓?闆惰皟鐢ㄧ偣"锛屾妸鏂瑰悜甯﹀亸涓€鏁磋疆锛涙湰杞嫤鍔涳紙WO-3锛夋寜宸ュ崟涓夊寘鍏ㄦ悳锛屼竴娆℃姄鍑?`scripts2.js:13927`銆?鍙﹀ grep 鏄?*澶у皬鍐欐晱鎰?*鐨勶細鎼?`getLevelBonusData` 鎶撲笉鍒?`onGetLevelBonusData`锛堟湰杞?WO-2 灏卞湪杩欎笂闈㈡姤浜嗕竴鏉″亣"鏃犳秷璐硅€?锛夈€?
### 13.5 璁╂ā鎷熷櫒绐楀彛鍒板墠鍙帮紙鏈細璇濆疄娴嬪彲鐢紝鐓ф妱锛?
```powershell
$m='D:\taptap\Support\android_emulator\engine\nx_main\MuMuManager.exe'
& $m info -v 1            # 鍙?main_wnd / pid / adb_port锛圴M index=1锛岃櫄鎷熸満鍚嶃€屾毚璧拌嫳闆勫潧娓告垙杞欢V1.0銆嶏級
& $m control -v 1 show_window
# show_window 鍙樉绀恒€佷笉缃《锛屽繀椤诲啀琛?Win32锛?#   ShowWindow(hwnd, 9) + SetWindowPos(hwnd, 0,0,0,0,0, SWP_SHOWWINDOW|NOSIZE|NOMOVE) + SetForegroundWindow(hwnd)
# 澶嶆牳锛欼sWindowVisible / IsIconic / GetForegroundWindow == hwnd
```
`hwnd` 浠?`info -v 1` 鐨?`main_wnd` 鍗佸叚杩涘埗杞?`IntPtr`銆傚綋鍓?`main_wnd=001F110C`銆乺ect `255,39 486脳895`銆?
### 13.6 濮旀淳瀹炶返锛堟湰浼氳瘽韪╁埌鐨勫潙锛屽啓杩涘伐鍗曟ā鏉匡級

- 宸ュ崟閲屽嚒娑夊強"鏌愬嚱鏁版湁娌℃湁璋冪敤鐐?鐨勫垽瀹氾紝**蹇呴』鍐欐槑涓変釜 bundle 鍏ㄦ悳**锛坄index.js` / `scripts2.js` / `scripts3.js`锛夆€斺€旀湰浼氳瘽婕忎簡 `scripts3` 寰楀嚭杩囬敊璇粨璁恒€?- 鑻﹀姏浜や粯浠嶆槸"寮哄埗钀界洏 + 鍥炰紶鍙粰琛屽彿"锛屽洖浼?鈮?50 瀛楋紝涓诲鎶芥牱 1-2 鏉″洖婧愮爜鏍稿銆?- 鏈細璇濋噰淇＄巼锛氣墺80%銆傚伐浜哄瀹炴姤 `function not found`锛坄acceptTask` 绛夋槸鍖垮悕鐩戝惉鍣級鏄ソ琛屼负锛屽埆褰撳け璐ャ€?- 宸蹭骇璇佹嵁锛歚tools/facts/inv-w*.json`锛堣儗鍖咃級銆乣task-t1-judge.json`锛堜换鍔″垽瀹氳鍙凤級銆乣flow-autotap-audit.json`锛堝墽鎯呰嚜鍔ㄧ偣鍑诲叏娓呭崟锛夈€乣cmd-channel-full.json`锛堝紩瀵煎眰鍛戒护閫氶亾锛夈€乣includes-hunt.json`銆?
### 13.7 涓嬩竴涓細璇濈殑绗竴浠朵簨锛?*宸茶 搂14 鍙栦唬锛屽彧鐪嬩笅闈㈣繖鍑犺鐨勭粨璁?*锛?
1. ~~`run.ps1 status` 纭 gamescene~~ 鈫?浠嶇劧瑕佸仛锛岃 搂14.6銆?2. ~~璁?`potential`/`skills` 蹇収銆屽洜涓?13.3-1 杩樻病淇€崀~ 鈫?**13.3-1 宸蹭慨**锛岃繖鏉′笉鍐嶆槸姣忓ぉ蹇呭仛锛堜絾鏀瑰姩鍓嶄粛鐓?搂14.2 鐨勬柟寮忛獙锛夈€?3. ~~淇?13.3-1锛堣嚜妫€姹℃煋瀛樻。锛墌~ 鈫?鉁?宸蹭慨锛埪?4.2锛夈€?4. **浠嶅緟鍔?*锛氳鐜╁鐐逛竴娆¤鏁?鈫?浠庢棩蹇楄 `p=` 鐨勫師濮嬪弬鏁?鈫?鏀?13.3-2锛堢幇鍦ㄥ凡鐭ュ彂閫侀摼鍦?`scripts2.js:13923-13928`锛岃 搂13.4锛夈€?5. ~~淇?13.3-3锛坄getAlchemyData` 褰㈢姸锛墌~ 鈫?鉁?宸茶ˉ handler锛埪?4.3锛夈€?
---

## 14. 2026-10-22 02:22 浼氳瘽鎺ㄨ繘锛?*涓嬩竴涓細璇濅粠杩欎竴鑺傝璧?*锛?
> 鏈妭璁板綍鏈疆锛堢涓変細璇濓級鏀逛簡浠€涔堛€佹€庝箞楠岀殑銆佽繕鍓╀粈涔堛€備笂涓€鑺?搂13 鐨勭紪鍙蜂粛鐒舵湁鏁堬紝鍙槸鏈夊嚑鏉″凡缁撴銆?
### 14.1 鏈疆閮ㄧ讲

| 椤?| 鍊?|
|---|---|
| 鐗堟湰 | `boot-2 / impl=h89800974 / flow=fe3500480`锛堟湰鑺傚啓浣滄椂鏄?`h81668f61` 鈫?`hee1125fd` 鈫?`h89800974` 鈫?`h081f1ef7`锛屽悗涓夋閮芥槸鎶€鑳戒笌褰㈢姸琛紝瑙?搂14.7 / 搂14.8 / 搂14.9锛?|
| reload | 239 ms锛堥殧绂荤増 423 ms锛夛紝pid `24125` 鍏ㄧ▼鏈彉 |
| 瀛樻。 | 涓庢湰杞紑宸ユ椂**瀛楄妭瀹屽叏涓€鑷?*锛歚d8af398f41a4b903cbb530bb2b41066c`锛?68 B锛宮time `01:52:09` |
| `state` | `potential=98699`銆乣skills={"1":[8,0,1],"7":[2,0,1],"8":[10,0,1],"1112":1,"1262":1}`銆乣bag` 6 绉嶃€乣done`/`rewarded` 鍚?12 |
| 娲诲鎴风妯″瀷 | `__require('RoleBaseInfo').potentials = 98699`锛? 璐︽湰鍊硷級銆乣SkillTable` 閲?*娌℃湁** `0` 鍙锋妧鑳?|

> 鈿?鐪嬬増鏈埆鍙湅 `.\run.ps1 status`锛歚bz_ready.json` 鍙湪**鍚姩 / 鍦烘櫙鍒囨崲**鏃跺埛鏂帮紝鐑噸杞戒笉浼氭敼瀹冿紝
> 鎵€浠?reload 涔嬪悗 `status` 浠嶆樉绀哄紑鏈烘椂閭ｄ釜 `impl`锛堟湰杞氨涓€鐩存槸 `he7190a3a`锛屽疄闄呭凡鍦ㄨ窇 `h81668f61`锛夈€?> 姝ｇ‘鍒ゆ嵁锛歚.\run.ps1 handlers` 杩斿洖鐨?`reload: {...}`锛屾垨鏃ュ織琛岄噷鐨?`"impl"` 瀛楁銆?
### 14.2 淇細鑷姹℃煋锛?3.3-1 鐨勭湡姝ｆ紡鐐癸級

**缁撹鍏堣锛氬瓨妗ｆ枃浠朵粠鏉ユ病琚嚜妫€鍐欒繃锛涜鍐欑殑鏄椿鐫€鐨勫鎴风妯″瀷銆?*锛堝師 搂13.3-1 鐨勮瘖鏂彧瀵逛簡涓€鍗婏紝宸插湪鍘熷鏇存锛?
涓夊鏀瑰姩锛堝叏閮ㄥ湪 `hotfix-patch/`锛夛細

| 鏂囦欢 | 鏀瑰姩 | 涓轰粈涔?|
|---|---|---|
| `core/bz-handler-impl.js` | `makeServer(store)` 澶氫紶涓€涓?`sandbox: !!store` | 闅旂瀹炰緥锛堣嚜妫€锛夊繀椤昏兘鑷垜璇嗗埆锛屽惁鍒?handler 閲?鎺ㄧ粰娲诲鎴风"鐨勫壇浣滅敤鎷︿笉浣?|
| `core/bz-rpc-server.js` | `upgradeSkill` 缁撳熬鐨?`window.__require` 鎺ㄩ€佹暣娈靛寘杩?`if (!env.sandbox)` | 鑷鐢ㄥ唴瀛樼┖妗ｈ窇 `upgradeSkill`锛岀畻鍑?`99999-100脳n` 骞?`setSkill(0,lv)`锛屾妸鍋囧€煎啓杩涙椿瀹㈡埛绔?|
| `core/bz-handler-impl.js` | `selfCheck()` 寮€澶?`diskBefore = diskRead()`銆佺粨灏炬瘮瀵癸紱鏈夊彉鍖栧氨**鍥炲啓鍘熷瀛楄妭**骞舵妸 `selfcheck:noSaveWrite` 鍒?FAIL锛屽悓鏃舵墦涓€琛?`鈿?鑷鍐欏埌浜嗙湡瀛樻。锛屽凡杩樺師` | 鎶ゆ爮锛氬皢鏉ヤ换浣?handler 鐩存帴钀界洏閮戒細琚綋鍦烘姄浣忓苟杩樺師锛屼笉鍐嶉潤榛?|

鏂板涓ゆ潯**鍙璺?*鍥炲綊鐢ㄤ緥锛堥兘涓嶇敤璁惧銆佷笉鐢ㄥ惎鍔ㄦ父鎴忥級锛?
```powershell
cd F:\BaoZouyxt\hotfix-patch
node test\selfcheck-nosave.js        # 閫€鍑虹爜 0 = 鑷娌″啓鐪熷瓨妗ｏ紙鎶婄湡瀛樻。鍐呭濉炶繘鍋?store锛屾瘮瀛楄妭+sha锛?node test\selfcheck-model-push.js    # 閫€鍑虹爜 0 = 鑷娌℃帹娲诲鎴风妯″瀷锛堝亣 window.__require 璁板綍 setter / setSkill锛?```

- 淇墠锛歚selfcheck-model-push.js` 閫€鍑?1锛屾墦鍗?`potPushes=[99899,99799,99699]`銆乣setSkill=[[0,1],[0,2],[0,3]]`锛?*杩欏氨鏄師鏁呴殰閲嶇幇**锛夈€?- 淇悗锛氫袱鏉￠兘閫€鍑?0锛沗l0-envelope` 82 椤?PASS锛涜嚜妫€ 1103 椤癸紙1102 + 鏂板 `selfcheck:noSaveWrite`锛浡?4.9 娓呮帀涓€涓姩浣滃悗鐜颁负 1100锛夈€?- 绔笂澶嶉獙锛歳eload 鍓嶅悗瀛樻。 md5 涓€瀛椾笉鍔紱`probe/check_live_potential.js` 璇诲埌鐨?`potentials` 鍓嶅悗閮芥槸 98699銆乣hasSkill0=false`銆?
### 14.3 淇細涓ゆ潯 `UNKNOWN` 鈫?鎵嬪啓 handler锛?3.3-3 / 13.3-5锛?
閮藉湪 `core/bz-rpc-server.js` 鐨?`CheckBattleResult` 涔嬪悗锛?*娌℃湁鎵嬫敼鐢熸垚鐗?*锛坄bz-shapes.generated.js` 淇濇寔鐢?`tools/gen_shapes.js` 浜у嚭鐨勭姸鎬侊級锛?
| 鍔ㄤ綔 | 搴旂瓟 | 渚濇嵁 |
|---|---|---|
| `getAlchemyData` | `{eRet:1, data:{state:0,type:0,id:0,price:10,num:0}, alchemyGearConfig:{}}` | scripts3.js:7005-7026锛氬彧璇?`e.data.state`銆乣e.alchemyGearConfig`锛坄for..in`锛夈€佸彲閫?`e.activityData`锛坄hasOwnProperty` 鍒ゅ畾锛?|
| `getLevelBonusData` | `{eRet:1, bonusObj:{}, endTime:0}` | scripts3.js:43812-43828 + `LevelBonusUI.loadItems`(43919-43926) 鍙?`for..in bonusObj`锛沗update()` 鐢?`endTime` 绠楀€掕鏃讹紝0 瀹夊叏 |

绔笂楠岃瘉锛堝懡浠ら€氶亾鐩存墦 `impl.handle`锛?*涓嶄細**瑙﹀彂浠讳綍 UI锛夛細

```
dispatch User.getAlchemyData    鈫?{"error":0,"resultCode":200,"User.getAlchemyData":{...},"achievement":{...}}
dispatch User.getLevelBonusData 鈫?{"error":0,"resultCode":200,"User.getLevelBonusData":{...},"achievement":{...}}
```

娉ㄦ剰锛氳繖涓ゆ潯鍙繚璇?涓嶅啀鎶涘紓甯搞€侀潰鏉胯兘寮€"锛?*涓嶆彁渚涚湡瀹炲唴瀹?*锛堢绾挎病鏈夌偧閲?绛夌骇濂栧姳鐨勮繍钀ユ暟鎹級銆?`User.recordAttributes`锛堟湰杞柊瑙佺殑 UNKNOWN锛変粛璧伴€氱敤 ACK锛屽睘涓婃姤绫伙紝涓嶅崱杩涘害銆?
### 14.4 鏈疆鎺ㄧ炕浜?搂13.4 鐨勭粨璁?
`reqChangeSkillLv` **涓嶆槸闆惰皟鐢ㄧ偣**锛歚scripts2.js:13923-13928`锛堣鏁?UI 鐨?`sendUpgradeReq`锛夊氨鏄彂閫佸叆鍙ｏ紝
`skillArr = [绛夌骇, 鈱婅繘搴︹寢, 绐佺牬绛夌骇]`锛坄index.js:119876`锛夈€傚畬鏁磋〃鏍艰 搂13.4銆?鎴愬洜锛氫笂涓€杞彧鎼滀簡 `index.js`锛涙湰杞嫤鍔涙寜宸ュ崟涓夊寘鍏ㄦ悳锛屼竴娆″懡涓€?*鏁欒宸插啓杩?搂13.4 鏈銆?*

### 14.5 鏈疆濮旀淳涓庨獙鏀讹紙鍙収鎶勭殑鍋氭硶锛?
涓変釜鍙鑻﹀姏锛坄gemini-3.8-flash-low`锛屽苟琛岋紝鍚?~2 鍒嗛挓锛夛紝浜や粯鍏ㄩ儴钀界洏骞跺洖浼犲悓涓€浠?JSON锛?
| 鍗?| 浜や粯 | 楠屾敹缁撹 |
|---|---|---|
| WO-1 鑷瑙︾闈?| `tools/facts/selfcheck-touch-surface.json`锛?7 鏉★級 | **鍙敤**锛氫笌涓诲鍒ゅ畾涓€鑷粹€斺€旇兘钀界洏鐨勫彧鏈?`persist()`/`reset()` 缁戝畾鐨?`server`锛岃嚜妫€ 6 涓疄渚嬪叏璧板唴瀛樻。銆傦紙琛屽彿鏄敼鍓嶅揩鐓э紝鏀瑰悗 `bz-handler-impl.js` 椤虹Щ +3銆乣bz-rpc-server.js` 椤虹Щ +3/+21锛?|
| WO-2 鐐奸噾/绛夌骇濂栧姳瀛楁 | `tools/facts/shape-alchemy-levelbonus.json`锛?09 鏉★紝JSON 鍚堟硶锛?| **閮ㄥ垎涓嶅彲淇?*锛歚unverified` 閲?涓夊寘鏃?`getLevelBonusData` 娑堣垂鑰?鏄?*閿欑殑**鈥斺€攇rep 澶у皬鍐欐晱鎰燂紝婕忎簡 `onGetLevelBonusData`锛坰cripts3.js:43794锛夈€備富瀹¤ˉ鏌ュ嚭 43812-43828 鐨勫瓧娈靛苟鎹鍐?handler |
| WO-3 鎶€鑳藉崌绾у彂閫佽矾寰?| `tools/facts/upgrade-skill-send-path.json`锛?2 鏉★級 | **鏉＄洰鍙敤銆佸懡浠ゅ潡涓嶅彲淇?*锛氬伐浜虹敤 PowerShell `Select-String` 鎶撶殑 `out` 鏄?GBK 涔辩爜涓旀湁涓€澶勫紩鍙疯鍚烇紝鏂囦欢**涓嶆槸鍚堟硶 JSON**锛坄ConvertFrom-Json` 鎶?13131 浣嶇疆锛夈€傚叧閿潯鐩富瀹″洖婧愮爜鏍稿閫氳繃锛坰cripts2.js:13927锛?|

涓夋潯缁欎笅涓€杞殑纭鐭╋細

1. 宸ュ崟閲?鏌愬嚱鏁版湁鏃犺皟鐢ㄧ偣"绫诲垽瀹氾細**蹇呴』鍐欐槑涓夊寘鍏ㄦ悳 + 澶у皬鍐?*锛坄onXxx` / `xxx` 閮借锛夛紝鍚﹀垯鍑鸿揣鏄敊鐨勩€?2. 璁╁伐浜烘姤 grep 鍛戒腑鏃讹紝**瑕佹眰缁?`node tools\grep_src.js` 鐨勫師濮嬭緭鍑?*锛屼笉瑕佽宸ヤ汉鑷繁鐢?`Select-String` 鎷煎瓧绗︿覆鈥斺€旂紪鐮佷細鎶?JSON 鍐欏潖銆?3. 宸ヤ汉鎶?鏌愬鏃?X"鏃讹紝涓诲鑷冲皯鎹竴涓ā寮忥紙鍚ぇ鍐?甯﹀墠缂€锛夊鎼滀竴娆″啀閲囦俊銆?
### 14.6 涓嬩竴涓細璇濈殑绗竴浠朵簨锛堢収鍋氾級

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
cd F:\BaoZouyxt\hotfix-patch
.\run.ps1 status                                  # 鏈熸湜 impl=h81668f61銆乻cene=gamescene
.\run.ps1 cmd "state"                             # 璁?potential / skills 蹇収
node test\l0-envelope.js                          # 82 椤?node test\selfcheck-nosave.js; node test\selfcheck-model-push.js   # 涓ゆ潯閮借閫€鍑?0
```

鐒跺悗鎸変紭鍏堢骇锛?
1. ~~**绛夌帺瀹剁偣涓€娆°€岃鏁欍€?*~~ 鈫?**鉁?宸叉敹鍒帮紙搂14.7锛?*锛氬師濮嬪弬鏁?`{"skillID":1,"skillArr":[15,0,1],"NPCID":1003,"flag":0}`锛?   **`skillArr[0]` 鏄洰鏍囩瓑绾?*锛堜笉鏄?`[1]`锛宍[1]` 鏄繘搴?pgr锛夛紝宸叉寜姝ゆ敼瀹屽苟绔笂楠岃繃銆?   鐜板湪鍐嶇偣璇锋暀锛氱洰鏍?> 褰撳墠灏辩湡娑ㄥ埌鐩爣锛屽彇娑堬紙鐩爣 鈮?褰撳墠锛変笉娑ㄤ篃涓嶆墸娼滆兘銆?2. **`includes` 寮傚父**锛埪?3.3-4锛変粛鏈畾浣嶏細鐧诲綍绐楀彛鍐?3 娆°€乣Cannot read property 'includes' of undefined`锛岀揣璺?`getFinishTaskAward`銆?   宸叉湁鐣欐。 `tools/facts/includes-hunt.json`锛屼笅涓€姝ユ槸鎵?`onGetFinishTaskAward` 鐨勫尶鍚嶇洃鍚櫒锛堜笁鍖呭叏鎼滐紝娉ㄦ剰澶у皬鍐欙級銆?3. 褰㈢姸寮辫瘉鎹紙`listener-1`/`name`/`fallback` 200+ 鏉★級缁х画鏀讹紝瑙?`tools\shapes_report.md`銆?
### 14.7 鎶€鑳藉崌绾с€岀洰鏍囩瓑绾?/ 鍙栨秷涓嶆定绾с€嶇浜屾淇锛坕mpl `hee1125fd`锛?3.3-2 缁撴锛?
**鐢ㄦ埛鍘熻瘽**锛氥€岀幇鍦ㄨ矊浼煎彧鑳藉涓€绾э紝鎴戞寚鐨勫氨鏄棤璁哄鍑犵骇鍙栨秷閮芥槸鍔犱竴绾с€傘€嶁啋 绔笂鏃ュ織涓€娆″潗瀹烇紙7 娆¤繛鐐癸紝`bz_log.jsonl:177-196`锛夛細

| 鐐瑰嚮 | 瀹㈡埛绔彂鐨?`skillArr` | 璐︽湰鏃у€?| 鏃т唬鐮佺粨鏋?| 搴旇鏄?|
|---|---|---|---|---|
| 1 | `[15,0,1]` | 12 | 13 | 15 |
| 2锛堝彇娑堬級 | `[15,0,1]` | 13 | 14 | 涓嶅姩 |
| 3 | `[17,0,1]` | 14 | 15 | 17 |
| 6 | `[20,0,1]` | 17 | 18 | 20 |
| 7锛堝彇娑堬級 | `[19,0,1]` | 18 | 19 | 涓嶅姩 |

**涓や釜鍙犲姞鐨勯敊**锛?
1. **璇婚敊涓嬫爣**锛歚skillArr[0]` 鎵嶆槸鐩爣绛夌骇锛坄scripts2.js:13846-13854` `LearnSkill` 鍙?`lv: o.lv + 1, pgr: o.pgr - c, brlv`锛?   `13923-13928` `sendUpgradeReq` 鍘熸牱閫忎紶锛沗index.js:119876` 缁勮鎴?`skillArr: [lv, Math.floor(pgr), brlv]`锛夈€?   鏃т唬鐮佽 `[1]`锛坧gr锛屽疄娴嬫亽 0锛夆啋 姣忔閮借惤鍒?`cur+1`銆?2. **鏃犳潯浠惰嚦灏?+1**锛歚Math.max(curLv + 1, reqLv)` 璁?鍙栨秷"涔熸定绾э紱涓旀瘡娆″浐瀹氭墸 100 娼滆兘銆乣note.skch` 鎶?`pgr` 纭啓 0
   锛堝鎴风杩涘害鏉℃瘡娆℃竻闆?鈫?瀹冩€昏繘"淇偧涓?鍐嶉潬鍙栨秷鎻愪氦锛屾伓鎬у惊鐜級銆?
**鏀规硶**锛坄core/bz-rpc-server.js`锛屽彧鍔ㄨ繖涓€涓姩浣?+ 鎶戒簡涓€涓?helper锛夛細

- `upgradeSkill`锛歚reqLv = arr[0]`锛沗lv = max(curLv, reqLv)`锛?*`lv <= curLv` 瑙嗕负鍙栨秷/閲嶅 鈫?绛夌骇涓庢綔鑳介兘涓嶅姩**锛屽彧鍥?`eRet:1`锛?  `skills[id] = [lv, reqPgr, reqBrlv]`锛堝洖鏄惧鎴风杩涘害锛屼笉鍐嶆竻闆讹級锛涙綔鑳芥寜 `100 脳 (lv - curLv)` 鎵ｏ紱`note.skch[id]` 鍚屽舰鍥炴樉銆?- 鏂板 `pushSkillToClient(id, lv, pot)`锛坄createBzServer` 鍐咃級锛氭妸鏉冨▉绛夌骇/娼滆兘鎺ㄥ洖 `window.__require` 鐨?`SkillTable` / `RoleBaseInfo`锛?  **`env.sandbox` 鏃剁洿鎺ヨ繑鍥?*锛堣繖灏辨槸 搂14.2 閭ｆ潯淇鐨勮惤鐐癸紝鍒妸瀹冨啀鍐欏洖鍐呰仈锛夈€?
**鍥炲綊鐢ㄤ緥**锛堣緭鍏ュ氨鏄綘閭?7 娆＄偣鍑婚噷鐨勭湡瀹炲弬鏁帮紝璺戝湪鍐呭瓨瀛樻。涓婏紝涓嶇璁惧鐪熸。锛夛細

```powershell
node test\upgrade-skill-target.js     # 17 椤癸細璺崇骇 / 鍙栨秷涓嶅姩 / pgr路brlv 鍥炴樉 / 鎸夌骇鎵ｆ綔鑳?/ 绌哄弬鏁颁笉閫?skills["0"]
```

**绔笂楠屾敹**锛堜笉鑺变綘鐨勬綔鑳斤紝鍙獙"鍙栨秷"杩欐潯璺級锛氭墦 `{skillID:1, skillArr:[19,0,1]}`锛堣处鏈濂?19锛夆啋

```
[impl] upgradeSkill 1 鏃犲彉鍖栵紙鐩爣 19 鈮?褰撳墠 19锛夋綔鑳?97599
瀛樻。 md5 鍓嶅悗閮芥槸 39b5e89051204e453f90f3ce85f11a6a锛?69 B锛屼竴鍒嗘湭鎵ｏ級
```

**椤哄甫瀹氫笅涓€鏉″伐绋嬪垽鎹紙鍥炵瓟"鑷繁鍐欐槸涓嶆槸姣旇瘯渚垮疁"锛?*锛?鍑″鎴风婧愮爜閲岃兘鎸囧埌**鍙戦€佺鎴栨秷璐圭**鐨勶紙鏈緥锛歚scripts2.js:13846` 鍙戙€乣index.js:119842` 鏀讹級锛?*鐩存帴鍐欙紝涓嶉潬璇?*鈥斺€?璇曞彧鑳介獙璇?鐪嬭捣鏉ュ"锛岄獙涓嶄簡鍙栨秷/璺ㄧ骇/鍥炴樉杩欎簺杈圭晫锛岃繕浼氬啓浣犵殑鐪熷瓨妗ｃ€?鍙湁"涓夊寘閮芥悳涓嶅埌銆佷粎鍑姄鍖?鐨勫姩浣滐紝鎵嶇敤璇曠殑鍔炴硶閫艰繎銆?
### 14.8 鎶€鑳借繘搴︼紙闈㈡澘閭ｄ釜 `(80%)`锛変笉淇濆瓨 鈫?宸蹭慨锛坕mpl `h89800974`锛?
**鐢ㄦ埛鎶ョ殑鐜拌薄**锛氭妧鑳借鏄剧ず `Lv2(80%)`锛岀偣銆屽彇娑堛€嶅悗鍥為€€涓€绾с€?*缁冨埌 80% 鐨勮繘搴︿笉淇濆瓨**銆?
**鏍瑰洜锛堢涓婃棩蹇楋紝`skillArr[1]` 灏辨槸杩涘害锛?*锛?
```
upgradeSkill 7 鏃犲彉鍖栵紙鐩爣 2 鈮?褰撳墠 2锛?p={"skillID":7,"skillArr":[2,6,1],...}     鈫?杩涘害 6 = 80%
upgradeSkill 7 Lv2鈫?锛堢洰鏍?5锛?3 绾э級pgr=0 ...
upgradeSkill 7 鏃犲彉鍖栵紙鐩爣 5 鈮?褰撳墠 5锛?p={...,"skillArr":[5,6,1],...}             鈫?杩涘害 6 鍙堣涓㈡帀
```

`skillArr = [鐩爣绛夌骇, 杩涘害 pgr, 绐佺牬绛夌骇]`銆偮?4.7 鐨勩€屽彇娑堝垎鏀€嶅彧鍋氬埌"绛夌骇涓嶅姩"锛?*浠€涔堥兘娌″啓妗?* 鈫?`skills[7]` 杩樻槸 `[5,0,1]`锛岄噸杩涙父鎴?`LoadGame` 鍥炴斁 `skillMap`锛坄bz-rpc-server.js:264-271` 鍘熸牱鍥炴斁锛夊氨鎶?80% 鎶瑰钩浜嗐€?
**鏀规硶**锛?
- 鍙栨秷/閲嶅鍒嗘敮锛堢洰鏍?鈮?褰撳墠锛夛細**绛夌骇涓庢綔鑳戒笉鍔紝浣嗘妸 `pgr`/`brlv` 鍐欒繘璐︽湰骞?`persist()`**锛?  `note.skch[id] = [lv, pgr, brlv]` 鍥炴樉锛堝鎴风 `index.js:119831-119834` 灏辨槸 `setSkill` / `setUpgrdPgr` / `setBrLv`锛夈€?- `pushSkillToClient(id, lv, pot, pgr, brlv)` 澧炲姞杩涘害/绐佺牬绛夌骇鎺ㄩ€?鈥斺€?鍏夋帹绛夌骇浼氳闈㈡澘鐨?`(xx%)` 鍜岃处鏈劚鑺傘€?- **鏂板鏃犳晥璇锋眰瀹堝崼**锛氱己 `skillArr` 鎴?`skillID` 涓?0 鈫?鐩存帴 ACK銆佺粷涓嶈惤璐︺€?  锛堣繖鏄湰杞嚜宸辨墦鑷繁涓€娆★細鍙栨秷鍒嗘敮鏃犳潯浠跺啓妗ｆ椂锛岃嚜妫€鐨勭┖鍙傛暟璇锋眰绔嬪埢閫犲嚭鍋囩殑 `skills["0"]`锛岃鍥炲綊鐢ㄤ緥 `empty:noSkill0` 褰撳満鎶撲綇銆傦級
- 椤哄甫纭銆屼竴娆¤烦澶氱骇銆嶆槸鐪熺殑鍦ㄧ敤锛氬悓涓€娈垫棩蹇楅噷瀹㈡埛绔彂杩?`[26,0,1]`(+3)銆乣[33,0,1]`(+7)銆乣[40,0,1]`(+7)锛岃处鏈収鍗曞叏鏀讹紙娼滆兘 100/绾э級銆?
**鍥炲綊鐢ㄤ緥鎵╁厖鍒?22 椤?*锛坄node test\upgrade-skill-target.js`锛夛紝鏂板涓ゆ潯涓撴不杩欐鐨勯棶棰橈細

| 鐢ㄤ緥 | 鏂█ |
|---|---|
| `pgr:cancelPgr` / `pgr:cancelSkch` | 璐︽湰 5 + 璇锋眰 `[5,6,1]` 鈫?绛夌骇浠?5銆?*杩涘害瀛樻垚 6**銆乣note.skch=[5,6,1]` |
| `pgr:loadgame` | 绱ф帴鐫€ `LoadGame` 鈫?`skillMap['7']` 蹇呴』鍘熸牱鏄?`[5,6,1]`锛堥噸杩涙父鎴忎笉涓㈣繘搴︼級 |
| `empty:noSkill0` | 绌哄弬鏁拌姹備笉寰楀啓鍑?`skills["0"]` |

**绔笂楠屾敹**锛歚{skillID:7, skillArr:[5,6,1]}` 鈫?搴旂瓟 `note.skch:{"7":[5,6,1]}`锛宍state` 閲?`skills.7 = [5,6,1]`锛?娼滆兘 95199 鏈姩锛堝彇娑堜笉鎵ｉ挶锛夛紱reload 157 ms銆乸id 24125 鏈彉銆?
### 14.9 褰㈢姸琛ㄨ瘉鎹璁★細娓呮帀 13 涓?浼€犲瓧娈?锛坕mpl `h081f1ef7`锛?
**鎬庝箞鍙戠幇鐨?*锛氱粰 255 涓急璇佹嵁瀛楁鍋氱‘瀹氭€ф壂鎻忔椂锛屽彂鐜?`BeginList.addComponent` 杩欑被瀛楁鍚嶆湰韬氨鏄釜 **UI 鏂规硶**锛?瀹冪殑"璇佹嵁琛?鏄?`var i = o.addComponent("OnhookQueueBgUI")` 鈥斺€?鐢熸垚鍣ㄦ妸鏂规硶璋冪敤褰撴垚浜嗗簲绛斿瓧娈点€?
**鍋氭硶**锛堜袱涓剼鏈紝閮藉彲閲嶈窇锛屼互鍚庢瘡娆℃敼褰㈢姸琛ㄩ兘搴旇窇锛夛細

```powershell
node tools\scan_weak_fields.js        # 255 涓急璇佹嵁瀛楁鍦ㄤ笁涓?bundle 閲岀殑鍚屽悕灞炴€ц闂紙纭畾鎬э紝涓€娆℃壂鍏ㄩ噺锛?node tools\audit_shapes_evidence.js   # 閫愬瓧娈垫牳瀵?evid 閲岀殑 "bundle:line" 鈥斺€?璇佹嵁琛岄噷鍒板簳鏈夋病鏈夎繖涓瓧娈?```

瀹¤鍒ゅ畾鍥涚被锛歚bogus:no-access`锛堣瘉鎹涓嶅惈璇ュ瓧娈碉級/ `bogus:method-call`锛堟槸鏂规硶璋冪敤锛屽 `o.addComponent(`锛?
`suspect`锛堟湁璁块棶涓旈潪璋冪敤锛? `unknown`锛坈apture/handler/name/fallback锛屾湰鏉ュ氨娌℃湁琛屽彿锛夈€?
**鏀逛簡涓ゅ婧愬ご锛堜笉鏄墜鏀圭敓鎴愮墿锛?*锛?
| 鏂囦欢 | 鏀瑰姩 |
|---|---|
| `tools/extract_listeners.js` | 鎹曡幏鍒扮殑璺緞鑻ョ揣璺?`(`锛屽垽涓烘柟娉曡皟鐢細鍗曟锛坄addComponent`锛夋暣鏉′涪寮冿紱澶氭锛坄dataArr.pop`锛?*淇濈暀鐖跺瓧娈?* `dataArr`锛堝畠鎵嶆槸鐪熸暟缁勫瓧娈碉級 |
| `tools/gen_shapes.js` | `MANUAL` 琛ㄩ噷 4 鏉?evid 鎸囬敊浜嗚锛歚activityShows` 鈫?`index.js:57455`锛坄e.hasOwnProperty("activityShows")`锛夈€乣newAcc` 鈫?`scripts3.js:95797`銆乣FashionTimeMap` 鈫?`index.js:75623`锛坄e.FashionTimeMap`锛夈€?*杩?4 鏉″瓧娈垫湰韬槸鐪熺殑锛岄敊鐨勬槸寮曠敤** |

**缁撴灉**锛坄node tools\audit_shapes_evidence.js` 澶嶈窇锛夛細

| 椤?| 鏀瑰墠 | 鏀瑰悗 |
|---|---|---|
| 纭鎶?| 10 method-call + 4 manual 鎸囬敊 | **0** |
| 鍔ㄤ綔鏁?| 338 | 337锛坄onBatchBreakByGold` 鍙墿浼€犲瓧娈碉紝鏁翠綋鍓旈櫎锛涘畠鐨?`eRet` 鐢遍€氱敤 ACK 瑕嗙洊锛岃涓轰笉鍙橈級 |
| 瀛楁鎬绘暟 | 1105 | **1092锛?13锛?* |
| 杩涚▼鍐呰嚜妫€ | 1103 | **1100**锛堝皯 1 涓姩浣?脳 3 鏉℃柇瑷€锛?|

绔笂锛歚impl=h124aca9d`銆乺eload 205 ms銆乸id 24125 鏈彉銆?*瀛樻。 md5 涓€瀛楁湭鍔?*锛坄96c21eda鈥锛夛紱
鎶介獙 `User.onBatchBreakByGold` 鈫?`{"eRet":1}` + 鏃ュ織 `UNKNOWN`锛堜笉鍐嶆敞鍏?`addComponent/setLabelTitle` 杩欑被鍋囧瓧娈碉級銆?
**鏁欒锛堝啓杩涜鐭╋級**锛歚manual` 涔熶細閿欙紝涓旈敊浜嗘洿闅惧彂鐜扳€斺€旀墍浠ヤ汉宸ュ垽瀹氬悓鏍峰繀椤昏繃 `audit_shapes_evidence.js`銆?鍙﹀鎴戣嚜宸辩涓€鐗堝璁℃妸 `o.hasOwnProperty("skillid")` 璇垽鎴?璇佹嵁琛屼笉鍚瀛楁"锛屾姤浜?20 鏉¤浼わ紱
鍔犱笂 `hasOwnProperty(` / `'x' in o` 涓ょ褰㈡€佸悗闄嶅埌 4 鏉°€?*鍒ゅ畾鍣ㄤ篃瑕佽嚜璇併€?*

### 14.10 A04/B01 鍥炴墽钀藉湴锛氬畧鍗洖婊?+ 缁存姢澶囦唤 + 璇锋眰鍙栬瘉锛坕mpl `h124aca9d`锛?
澶栭儴鍥炴墽瑙?`docs/sota/reply-B01-A04.txt`锛岄噰绾冲彴璐﹁ `docs/sota/B01-A04/adopted.md`銆傚畠鎸戝嚭鎴戜滑 6 涓湡闂锛屾湰杞厛鍋氬叾涓?*涓嶄緷璧栦簨浠跺眰**鐨勪笁浠讹細

| 鏀瑰姩 | 浣嶇疆 | 涓轰粈涔?|
|---|---|---|
| **瀹堝崼鎷掔粷鏃跺洖婊氬唴瀛?*锛坄_save = clone(_lastGood)`锛?| `core/bz-rpc-server.js` 鐨?`persist()` | 鍘熸潵鍙嫆鍐欍€佸唴瀛樹粛鏄剰鐨勶細鍧忓€肩户缁鎶曞皠鎴愬簲绛?鈫?瀹㈡埛绔竻绌烘湰鍦?鈫?瀹㈡埛绔悗缁姩浣滄妸绌哄啓瀹炪€?*杩欐鏄簨鏁?A 鐨勬満鐞?*锛圓04-7 绗?5 鏉★級 |
| **缁存姢鍔ㄤ綔鍐欏墠澶囦唤**锛歚bzPatch / bzSeedBag / bzBackfillRewards` 鍐欏墠鍏堣惤涓€浠?`<save>.pre-maint.json`锛堟粴鍔ㄤ竴鏍硷級 | 鍚屼笂 + `bz-handler-impl.js` 鏂板 `env.writeAux` | 浜嬫晠 D 灏辨槸缁存姢鍔ㄤ綔鐩存帴鏀规。涓旀病澶囦唤 |
| **璇锋眰鍙傛暟鍙栬瘉鏃ュ織**锛歚ReqSelfBattleInfo / CheckBattleResult / acceptTask / getFinishTaskAward / killNpc / collect / obtainCrop` 鎵?`REQ <鍔ㄤ綔> p={...}` | `dispatch()` | B01 鐨勫叏閮ㄥ缓妯″墠鎻愭槸"鎴樻枟缁撶畻璇锋眰甯︿粈涔?锛岃€屾垜浠師鏉ュ彧鎵?`dispatch User.X`锛岀湅涓嶅埌鍙傛暟 |

鍥炲綊锛歚test\save-migrate.js` 浠?39 鈫?**43 椤?*锛堟柊澧烇細鎷掔粷鍚庣鐩樹笉鍙樸€佸唴瀛樺洖婊氥€佺淮鎶ゅ墠澶囦唤琚皟鐢ㄣ€佺淮鎶よˉ涓佺収甯哥敓鏁堬級锛沗l0-envelope` 82 椤广€佽嚜妫€ 1100 椤瑰叏杩囥€?
绔笂楠屾敹锛坄impl=h124aca9d`锛宺eload 196 ms锛宲id 24125 鏈彉锛屽瓨妗?md5 `96c21eda鈥 濮嬬粓鏈姩锛夛細

```
bzPatch{set:{}}           鈫?鐢熸垚 bz_offline_save.json.pre-maint.json锛?56 B锛?bzPatch 鎶€鑳?鈫?           鈫?鈿?鍐欏墠瀹堝崼鎷掔粷锛堝姩浣?bzPatch锛? 鎶€鑳?绛夌骇涓嬮檷 40鈫? 鈫?鍐呭瓨宸插洖婊氬埌涓婃钀界洏蹇収
CheckBattleResult{...}    鈫?REQ CheckBattleResult p={"win":1,"npcID":1003}
```

椤哄甫淇簡涓€涓細璇浜虹殑鏃ュ織锛歚bzPatch` 琚畧鍗嫆缁濆悗浠嶆墦鍗?`bzPatch set skills`锛岀幇鍦ㄤ細杩藉姞 `鈫?鍐欐。琚畧鍗嫆缁濓紙瑙佷笂涓€琛屽師鍥狅級锛屼粎鍐呭瓨鐢熸晥`銆?
**寮辫瘉鎹瓧娈垫牳鏌ワ紙鏈疆宸ヤ汉鎴愭灉锛屽凡鍥哄寲锛?*锛氫袱鐗囧伐浜哄叡 255 涓瓧娈碉紝涓庣‘瀹氭€ф壂鎻?**255/255 涓€鑷?*锛屽悎骞跺瓨 `tools/facts/weak-verified-all.json`銆?浣嗚鐪嬫竻杩欎釜"涓€鑷?鐨勫惈涔夛細瀹冨彧璇佹槑**瀛楁鍚嶅湪 bundle 閲屼綔涓哄睘鎬ц闂瓨鍦?*锛屼笉璇佹槑"鏄湪搴旂瓟涓婁笅鏂囬噷璇?鈥斺€?渚嬪 `BuyMount.sync` 鐨勫懡涓鏄?`i.sync`锛堝彟涓€涓璞★級銆傝繖灞傝闈?MODE 琛?+ 鍙樺紓娴嬭瘯锛圓01-2 绫诲埆 1銆丄01-4锛夋墠鑳藉畾銆?
**涓嬩竴姝ワ紙澶ф敼锛岄渶鍗曠嫭鎺堟潈锛?*锛氫簨浠剁洰褰曪紙action 鈫?Event[] 鈫?瀛楁鏁堟灉锛変笌瀹堟亽瀹堝崼 鈫?v5 杩佺Щ寮曞叆 `taskProg` 鈫?鎸?(Type, Require flag) 鍒嗘《瀹炵幇浠诲姟杩涘害銆?**鍏堢瓑鐜╁鎵撲竴鍦烘€?*锛岀湅 `REQ CheckBattleResult` 鐨勭湡瀹炲弬鏁帮紙杩欎竴姝ュ喅瀹氬嚮鏉€绫讳换鍔¤兘涓嶈兘鍋氾級銆?