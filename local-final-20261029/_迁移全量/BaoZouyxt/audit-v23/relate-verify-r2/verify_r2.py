# -*- coding: utf-8 -*-
# 只读复核脚本：V2 / V3 / V5 + md5 计算。不修改任何 A/B 位文件，只写 relate-verify-r2 下的报告。
import json, io, re, hashlib, collections, sys

A = r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle"
B = r"F:\BaoZouyxt\audit-v23\relate-result-r2-20261024"
OUT = r"F:\BaoZouyxt\audit-v23\relate-verify-r2\counts.txt"

def md5(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

L = []
def say(s=""):
    L.append(s)

# ---------- md5（V4/V6 用） ----------
files = {
    "A rw.json": A + r"\rw.json",
    "B rw.json": B + r"\rw.json",
    "A out\\relations.md": A + r"\out\relations.md",
    "B relations.md": B + r"\relations.md",
    "B relations.默认配置-对照.md": B + r"\relations.默认配置-对照.md",
    "B relations.fam2.0-对照.md": B + r"\relations.fam2.0-对照.md",
    "A out\\relations.json": A + r"\out\relations.json",
    "B relations.json": B + r"\relations.json",
    "A config\\relate-families.json": A + r"\config\relate-families.json",
    "B relate-families.json": B + r"\relate-families.json",
    "复跑 rerun_rw.json": OUT.replace("counts.txt", "rerun_rw.json"),
}
say("== md5 表 ==")
for name, p in files.items():
    try:
        say(f"{name}\t{md5(p)}\t{p}")
    except OSError as e:
        say(f"{name}\tERROR\t{e}")

# ---------- V2 ----------
say("")
say("== V2 计数三对照 ==")
md_text = io.open(B + r"\relations.md", encoding="utf-8").read()
md_lines = md_text.splitlines()
say(f"relations.md 行数: {len(md_lines)}")
say(f"relations.md 第3行原文: {md_lines[2]!r}")
m3 = re.search(r"范围内 (\d+) 个动作｜边 (\d+)｜簇 (\d+)｜孤立 (\d+)｜成对 (\d+)｜有存档读写的动作 (\d+)", md_lines[2])
say(f"第3行解析: inScope={m3.group(1)} edges={m3.group(2)} clusters={m3.group(3)} lone={m3.group(4)} pairs={m3.group(5)} rwActions={m3.group(6)}" if m3 else "第3行解析: 未匹配到模板")

rel = json.load(io.open(B + r"\relations.json", encoding="utf-8"))
meta = rel["__meta"]
say("relations.json __meta: " + json.dumps({k: meta[k] for k in ("inScope", "edges", "clusters", "lone", "pairs", "rwActions")}, ensure_ascii=False))

say(f"md 中 '## 第' 行数: {sum(1 for x in md_lines if x.startswith('## 第'))}")
clusters = rel["clusters"]
lone = rel["lone"]
pairs = rel["pairs"]
say(f"clusters 数组长度: {len(clusters)}")
say(f"lone 数组长度: {len(lone)}")
cl_sizes = {c["id"]: len(c["order"]) for c in clusters}
say(f"各簇成员数: {json.dumps(cl_sizes, ensure_ascii=False)}")
say(f"簇 size 字段总和: {sum(c['size'] for c in clusters)}; order 长度总和: {sum(cl_sizes.values())}")
say(f"簇成员总数 + lone = {sum(cl_sizes.values()) + len(lone)} (对照 699)")
say(f"pairs 数组长度: {len(pairs)}")

union = set()
for c in clusters:
    union |= set(c["order"])
union |= set(lone)
say(f"簇成员+lone 并集大小: {len(union)}")

reg = json.load(io.open(A + r"\out\registry.json", encoding="utf-8"))
rows = reg["rows"]
say(f"registry rows 总数: {len(rows)}")
SCOPE = {"GEN-READY", "NEEDS-S2", "IMPL-UNJUDGED", "DONE", "NO-CONTRACT"}
status_counter = collections.Counter(r["status"] for r in rows)
say("registry status 分布: " + json.dumps(status_counter, ensure_ascii=False, sort_keys=True))
scope_keys = {r["key"] for r in rows if r["status"] in SCOPE}
say(f"status∈SCOPE 的 key 集合大小: {len(scope_keys)}")
only_in_union = sorted(union - scope_keys)
only_in_scope = sorted(scope_keys - union)
say(f"并集 - registrySCOPE 集合: {len(only_in_union)} 个: {only_in_union}")
say(f"registrySCOPE 集合 - 并集: {len(only_in_scope)} 个: {only_in_scope}")
dup_check = sum(len(c["order"]) for c in clusters) + len(lone)
key_lists = [k for c in clusters for k in c["order"]] + list(lone)
say(f"拼接列表元素总数: {len(key_lists)}, 去重后: {len(set(key_lists))} (差 {len(key_lists) - len(set(key_lists))} = 重复元素数)")

# ---------- V3 ----------
say("")
say("== V3 relate-families.json ==")
try:
    cfg = json.load(io.open(A + r"\config\relate-families.json", encoding="utf-8"))
    say("config\\relate-families.json: 合法 JSON = True")
except Exception as e:
    cfg = {}
    say(f"config\\relate-families.json: 合法 JSON = False ({e})")
say(f"familyWeight = {cfg.get('familyWeight')!r}")
say(f"families 条目数 = {len(cfg.get('families', {}))}")
say(f"families 键序: {list(cfg.get('families', {}).keys())}")

where = {}
for c in clusters:
    for k in c["order"]:
        where[k] = c["id"]
lone_set = set(lone)

fam_report = {}
for name, f in cfg.get("families", {}).items():
    rx = re.compile(f["match"])
    hits = [r["key"] for r in rows if rx.search(r["key"])]
    cc = collections.Counter()
    extra_lone, extra_out, extra_multi = 0, 0, []
    hitset = set(hits)
    for k in hitset:
        cid = where.get(k)
        if cid: cc[cid] += 1
        elif k in lone_set: extra_lone += 1
        else: extra_out += 1
    fam_report[name] = {
        "match": f["match"],
        "命中 registry KEY 数(按行,可能含重复key)": len(hits),
        "命中去重 KEY 数": len(hitset),
        "簇分布": dict(cc),
        "落 lone": extra_lone,
        "不在并集(范围外)": extra_out,
    }
    say(f"family[{name}] match={f['match']!r} 命中去重KEY={len(hitset)} 簇分布={json.dumps(dict(cc), ensure_ascii=False)} lone={extra_lone} 范围外={extra_out}")

# 一 family 是否集中在一个簇
multi = {n: r["簇分布"] for n, r in fam_report.items() if len(r["簇分布"]) > 1}
say(f"簇分布跨多簇的 family: {json.dumps(multi, ensure_ascii=False) if multi else '无（各自集中在一个簇）'}")

# B 位 config 与 A 位 config 是否一致（字节级）
say(f"B relate-families.json md5 = A config relate-families.json md5: {md5(B + r'\\relate-families.json') == md5(A + r'\\config\\relate-families.json')}")

# ---------- V5 ----------
say("")
say("== V5 A 位 rw.json via 统计 ==")
rw = json.load(io.open(A + r"\rw.json", encoding="utf-8"))
say(f"动作总数: {len(rw)}")
n_table = sum(1 for v in rw.values() if any("table:" in x for x in v.get("via", [])))
n_literal = sum(1 for v in rw.values() if any("literal" in x for x in v.get("via", [])))
say(f"via 含 'table:' 的动作数: {n_table}")
say(f"via 为/含 'literal' 的动作数: {n_literal}")
say(f"via 组合分布: {json.dumps({' + '.join(k) if k else '(空)': n for k, n in collections.Counter(tuple(v.get('via', [])) for v in rw.values()).items()}, ensure_ascii=False)}")
say(f"rw.json 顶层键数与动作名(前40): {sorted(rw.keys())[:40]}")

with io.open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(L))
print("done", len(L))
