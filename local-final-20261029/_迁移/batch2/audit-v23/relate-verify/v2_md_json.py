# V2: relations.md 中 "## 第" 行数；relations.json 的 clusters/lone/__meta
import json

md = r"F:\BaoZouyxt\audit-v23\relate-result-20261024\relations.md"
js = r"F:\BaoZouyxt\audit-v23\relate-result-20261024\relations.json"

lines = open(md, encoding="utf-8").read().splitlines()
hits = [l for l in lines if l.startswith("## 第")]
print("relations.md total lines:", len(lines))
print('lines starting with "## 第":', len(hits))
print("first:", hits[0])
print("last :", hits[-1])

j = json.load(open(js, encoding="utf-8"))
m = j["__meta"]
print("clusters array len:", len(j["clusters"]))
print("lone array len:", len(j["lone"]))
for k in ("inScope", "edges", "clusters", "lone", "pairs", "rwUsed"):
    print("__meta.%s = %r" % (k, m.get(k)))
print("top-level keys:", list(j.keys()))
print("cluster size sum:", sum(c["size"] for c in j["clusters"]))
print("cluster order len sum:", sum(len(c["order"]) for c in j["clusters"]))
print("lone[0]:", repr(j["lone"][0]))
print("batch ids in md vs clusters count check:", len(hits) - len(j["clusters"]))
