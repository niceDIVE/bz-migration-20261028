# -*- coding: utf-8 -*-
import json, re, sys
sys.stdout.reconfigure(encoding="utf-8")
cfg = json.load(open(r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\config\relate-families.json", encoding="utf-8"))
d = json.load(open(r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\out\relations.json", encoding="utf-8"))
where = {}
for c in d["clusters"]:
    for k in c["order"]: where[k] = c["id"]
for k in d["lone"]: where[k] = "LONE"
rx = re.compile(cfg["families"]["战斗结算"]["match"])
rxdog = re.compile(cfg["families"]["斗狗"]["match"])
for k in sorted(where):
    if rx.search(k) and not rxdog.search(k):
        print(f"{k:32s} -> {where[k]}")
