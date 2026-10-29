# -*- coding: utf-8 -*-
import json, sys
sys.stdout.reconfigure(encoding="utf-8")
d = json.load(open(r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\out\relations.json", encoding="utf-8"))
where = {}
for c in d["clusters"]:
    for k in c["order"]:
        where[k] = c["id"] + "/批" + str(c["batch"])
for k in d["lone"]:
    where[k] = "LONE"
for name in ["SALE_ITEM","SELL_ITEM","SALE","BUY_ITEM","BUY_SHOP_ITEM","BUY_MARKET_ITEM","SALE_SHOP_ITEM",
             "USE_ITEM","USE_SNOW_BALL","USE_BATCH_SNOW_BALL","DOG_BATTLE_RESULT","ENTER_PVEDOG_FIGHT","FEED_DOG",
             "REQ_DOG_PARTNER_END_BATTLE","GET_DRAGON","BEGIN_DRAGON_ROLLDICE","HIDE_TASK","ACCEPT_SCHOOL_TASK",
             "FINISH_TASK","RECEIVE_ACHIEVEMENT_REWARD","RECEIVE_ACHIEVE_REWARD","UPGRADE_WIFE_LEVEL","UPGRADE_ACUPOINT",
             "USE_WIFE_PROP","MARRIAGE","MARRY","BEGIN_WEDDING","CHECK_BREAK","END_DAZUO","END_LIANGONG","END_TRAINING",
             "GET_ACHIEVE_DATA","BATCH_RESOLVE_KNACK","EQUIP_BATCH_RESOLVE"]:
    print(f"{name:28s} {where.get(name,'--不在范围内--')}")
print("---- 孤立总数", len(d["lone"]), "簇数", len(d["clusters"]))
print("---- 含 BUY/SELL/SALE 的动作及其位置")
for k in sorted(where):
    if any(w in k for w in ("BUY","SELL","SALE")):
        print("   ", k, where[k])
