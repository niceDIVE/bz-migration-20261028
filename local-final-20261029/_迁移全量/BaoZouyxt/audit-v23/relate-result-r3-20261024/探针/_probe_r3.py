# -*- coding: utf-8 -*-
import json, re, sys, collections
sys.stdout.reconfigure(encoding="utf-8")
cfg = json.load(open(r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\config\relate-families.json", encoding="utf-8"))
d = json.load(open(r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\out\relations.json", encoding="utf-8"))
where = {}
for c in d["clusters"]:
    for k in c["order"]: where[k] = c["id"] + "(" + str(c.get("family") or "-") + ")"
for k in d["lone"]: where[k] = "LONE"
print("== SYCNPLAYERITEAMDATA 去向 ==")
print("  ", where.get("SYCNPLAYERITEAMDATA"))
print("== notes 里带提醒的成员 ==")
print("  ", d.get("notes"))
print("== 各 family 簇分布 ==")
for name, f in cfg["families"].items():
    rx = re.compile(f["match"])
    mem = [k for k in where if rx.search(k)]
    cnt = collections.Counter(where[k].split("(")[0] for k in mem)
    flag = "" if len(cnt) == 1 else "  <-- 跨簇"
    print(f"  {name}: {len(mem)} -> {dict(cnt)}{flag}")
print("== includeKeys 段 ==")
print("  ", cfg.get("includeKeys"))
