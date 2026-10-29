# -*- coding: utf-8 -*-
import json, re, sys, collections
sys.stdout.reconfigure(encoding="utf-8")
cfg = json.load(open(r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\config\relate-families.json", encoding="utf-8"))
d = json.load(open(r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\out\relations.json", encoding="utf-8"))
where = {}
for c in d["clusters"]:
    for k in c["order"]: where[k] = c["id"]
for k in d["lone"]: where[k] = "LONE"
famof = {}
for name, f in cfg["families"].items():
    rx = re.compile(f["match"])
    famof[name] = [k for k in where if rx.search(k)]
print("== 各 family 的簇分布（应集中在一个簇）==")
for name, mem in famof.items():
    cnt = collections.Counter(where[k] for k in mem)
    print(f"  {name}: {len(mem)} 个 -> {dict(cnt)}")
print("\n== C01 / C05 成员 ==")
for c in d["clusters"]:
    if c["id"] in ("C01","C05"):
        print(f"  {c['id']} 批{c['batch']} 〔{c.get('family')}〕可信度{c['confidence']}（{c['size']} 个）")
        print("   " + "、".join(c["order"]))
