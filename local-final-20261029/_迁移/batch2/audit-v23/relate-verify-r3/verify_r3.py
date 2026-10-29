# -*- coding: utf-8 -*-
"""第 3 轮动作关联分析复核 · V3/V4/V5 取数脚本。只读输入，结果打印到 stdout。"""
import io, json, re, sys, os
sys.stdout.reconfigure(encoding="utf-8")

A = r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle"
CFG = os.path.join(A, "config", "relate-families.json")
REG = os.path.join(A, "out", "registry.json")
RELSJ = os.path.join(A, "out", "relations.json")
RELSM = os.path.join(A, "out", "relations.md")
SCOPE = {"GEN-READY", "NEEDS-S2", "IMPL-UNJUDGED", "DONE", "NO-CONTRACT"}

md_lines = io.open(RELSM, encoding="utf-8").read().split("\n")
print("== V3.1 relations.md 第3行原文 ==")
print(repr(md_lines[2]))
print("== V3.2 relations.md 「## 第」行 ==")
sec = [l for l in md_lines if l.startswith("## 第")]
print("count =", len(sec))
print("first =", sec[0] if sec else None)
print("last  =", sec[-1] if sec else None)

rel = json.load(io.open(RELSJ, encoding="utf-8"))
print("== V3.3 relations.json __meta ==")
print(json.dumps(rel["__meta"], ensure_ascii=False))
clusters = rel["clusters"]
lone = rel["lone"]
sizes = sum(c["size"] for c in clusters)
print("== V3.4 实际数组 ==")
print("len(clusters) =", len(clusters), " len(lone) =", len(lone), " sum(cluster.size) =", sizes,
      " sum+lone =", sizes + len(lone))
ids = [c["id"] for c in clusters]
print("cluster ids =", ids)
batchs = [c["batch"] for c in clusters]
print("batch 序列连续1..N =", batchs == list(range(1, len(clusters) + 1)))

members = [k for c in clusters for k in c["order"]]
actual = set(members) | set(lone)
overlap = set(members) & set(lone)
print("members+lone 去重后 =", len(actual), " 簇/lone 重复键数 =", len(overlap), sorted(overlap)[:5])

reg = json.load(io.open(REG, encoding="utf-8"))["rows"]
cfg = json.load(io.open(CFG, encoding="utf-8"))
extra = set(cfg.get("includeKeys", []))
scope_keys = {r["key"] for r in reg if r["status"] in SCOPE}
U = scope_keys | extra
print("== V3.5 对照集 ==")
print("registry 总行数 =", len(reg))
sc = {}
for r in reg:
    sc[r["status"]] = sc.get(r["status"], 0) + 1
print("status 分布 =", json.dumps(sc, ensure_ascii=False, sort_keys=True))
print("scope_keys =", len(scope_keys), " includeKeys =", len(extra), " 并集 U =", len(U))
d1 = sorted(U - actual)
d2 = sorted(actual - U)
print("U - actual =", len(d1), d1[:20])
print("actual - U =", len(d2), d2[:20])
in_extra_not_scope = sorted(extra - scope_keys)
print("includeKeys - scope_keys =", len(in_extra_not_scope), in_extra_not_scope)

print("== V4.1 config 合法性 ==")
print("valid JSON = True, 顶层键 =", sorted(cfg.keys()))
print("includeKeys =", json.dumps(cfg.get("includeKeys", []), ensure_ascii=False))
fams = cfg.get("families", {})
print("families 条目数 =", len(fams), " 名称 =", list(fams.keys()))
print("links 条数 =", len(cfg.get("links", [])), " notes 条数 =", len(cfg.get("notes", {})))
print("familyWeight =", cfg.get("familyWeight"), " crossFamilyDamp =", cfg.get("crossFamilyDamp"))

fam_of = {}
for name, f in fams.items():
    rx = re.compile(f["match"])
    hits = sorted(k for k in U if rx.search(k))
    fam_of[name] = hits
where = {}
for c in clusters:
    for k in c["order"]:
        where[k] = c["id"]
print("== V4.2 逐 family 命中 KEY 的簇分布 ==")
for name, hits in fam_of.items():
    dist = {}
    un = []
    for k in hits:
        cid = where.get(k)
        if cid is None:
            un.append(k)
        else:
            dist[cid] = dist.get(cid, 0) + 1
    print(f"[{name}] match={fams[name]['match']!r} 命中总数={len(hits)} 簇分布={json.dumps(dist, ensure_ascii=False)}"
          + (f" 未入簇(孤立)={len(un)} {un[:10]}" if un else ""))

print("== V5 SYCNPLAYERITEAMDATA ==")
target = "SYCNPLAYERITEAMDATA"
cid = where.get(target)
cl = next((c for c in clusters if c["id"] == cid), None)
print("所在簇 id =", cid)
print("簇 family 标签 =", cl["family"] if cl else None)
print("簇 size/batch/confidence =", (cl["size"], cl["batch"], cl["confidence"]) if cl else None)
print("notes 里有它？", target in rel["notes"], " notes 原值 =", json.dumps(rel["notes"].get(target), ensure_ascii=False))
rrow = next((r for r in reg if r["key"] == target), None)
print("registry status 原值 =", json.dumps(rrow["status"] if rrow else None, ensure_ascii=False),
      " contract =", json.dumps(rrow.get("contract") if rrow else None, ensure_ascii=False))
print("它在 includeKeys 里？", target in extra, " 它 status∈SCOPE？", bool(rrow and rrow["status"] in SCOPE))
print("簇成员顺序中它的位置 =", cl["order"].index(target) if cl and target in cl["order"] else None)
print("meta.included =", json.dumps(rel["__meta"].get("included"), ensure_ascii=False))
print("meta.families =", json.dumps(rel["__meta"].get("families"), ensure_ascii=False))
