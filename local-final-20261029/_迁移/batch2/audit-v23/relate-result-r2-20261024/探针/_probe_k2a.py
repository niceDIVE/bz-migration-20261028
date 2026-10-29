# -*- coding: utf-8 -*-
import json, sys
sys.stdout.reconfigure(encoding="utf-8")
reg = json.load(open(r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\out\registry.json", encoding="utf-8"))["rows"]
m = {r["key"]: r for r in reg}
for k in ["END_DAZUO","END_LIANGONG","START_DAZUO","BEGIN_LIANGONG","CHANGEPLACE","SALE_ITEM","SELL_ITEM","USE_ITEM"]:
    r = m.get(k)
    print(f"{k:16s} -> {r['action'] if r else '不存在'}")
