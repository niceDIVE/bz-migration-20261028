# -*- coding: utf-8 -*-
import json, sys
sys.stdout.reconfigure(encoding="utf-8")
SCOPE = {"GEN-READY","NEEDS-S2","IMPL-UNJUDGED","DONE","NO-CONTRACT"}
reg = json.load(open(r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\out\registry.json", encoding="utf-8"))["rows"]
acts = {r["action"].lower() for r in reg if r["status"] in SCOPE} | {r["action"].split(".")[-1].lower() for r in reg if r["status"] in SCOPE}
rw = json.load(open(r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\rw.json", encoding="utf-8"))
miss = [k for k in rw if k.lower() not in acts and k.split(".")[-1].lower() not in acts]
print("rw 动作", len(rw), "，其中不在 registry 范围的", len(miss), "：")
for k in miss: print("  ", k)
