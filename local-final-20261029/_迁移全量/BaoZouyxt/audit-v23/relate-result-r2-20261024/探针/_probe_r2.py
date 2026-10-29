# -*- coding: utf-8 -*-
import json, sys
sys.stdout.reconfigure(encoding="utf-8")
def where(p):
    d = json.load(open(p, encoding="utf-8"))
    w = {}
    for c in d["clusters"]:
        for k in c["order"]: w[k] = c["id"] + "(" + str(c.get("family") or "-") + ")"
    for k in d["lone"]: w[k] = "LONE"
    return w, d["__meta"]
a, ma = where(r"F:\BaoZouyxt\audit-v23\relate-result-r2-20261024\relations.默认配置-对照.json")
b, mb = where(r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\out\relations.json")
for k in ["USE_ITEM","GET_ACHIEVE_DATA","USER_LOADGAME","USER_CREATE","QUICK_LOGIN","ROGUE_ACCEPT_TASK","ROGUE_FINISHTASK_REWARD","BUY_SHOP_ITEM","SELL_ITEM","BACKTOLOGIN"]:
    print(f"{k:26s} 默认:{a.get(k,'-'):18s} 改后:{b.get(k,'-')}")
print("meta 默认:", {k: ma[k] for k in ("edges","clusters","lone")})
print("meta 改后:", {k: mb[k] for k in ("edges","clusters","lone")})
print("改后 families:", mb.get("families"))
