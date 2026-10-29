# V3: 并集检查 —— relations.json 的 簇order + lone  vs  registry.json 的 inScope 键集
import json

js = r"F:\BaoZouyxt\audit-v23\relate-result-20261024\relations.json"
reg = r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\out\registry.json"

SCOPE = {"GEN-READY", "NEEDS-S2", "IMPL-UNJUDGED", "DONE", "NO-CONTRACT"}

j = json.load(open(js, encoding="utf-8"))
order = [k for c in j["clusters"] for k in c["order"]]
lone = list(j["lone"])
a = set(order) | set(lone)

r = json.load(open(reg, encoding="utf-8"))
rows = r["rows"]
print("registry rows total:", len(rows))
from collections import Counter
print("status counter:", dict(Counter(x["status"] for x in rows)))
b = {x["key"] for x in rows if x["status"] in SCOPE}

print("A = |簇order ∪ lone| =", len(a), " (order %d + lone %d, raw %d)" % (len(set(order)), len(set(lone)), len(order) + len(lone)))
print("B = |registry keys with status in SCOPE| =", len(b))
print("A == B ?", a == b)
onlyA = sorted(a - b)
onlyB = sorted(b - a)
print("A-B count:", len(onlyA), "sample:", onlyA[:10])
print("B-A count:", len(onlyB), "sample:", onlyB[:10])

# 同一集合但重复 key 检查
print("order dupes:", len(order) - len(set(order)))
print("lone dupes:", len(lone) - len(set(lone)))
print("overlap order∩lone:", len(set(order) & set(lone)), sorted(set(order) & set(lone))[:10])

# registry 里 inScope 行的 action 字段样例（只报数，不判断）
print("registry keys with status in SCOPE, distinct:", len(b))
