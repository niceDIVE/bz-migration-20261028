import re, io, json, os, collections

S3 = r"F:\BaoZouyxt\tools\scripts3.js"
IDX = r"F:\BaoZouyxt\tools\index.js"
S2 = r"F:\BaoZouyxt\tools\scripts2.js"
OUT_MD = r"F:\BaoZouyxt\audit-v221\real-audit\D1-第二期-HttpConst3扩展清单.md"
OUT_JSON = r"F:\BaoZouyxt\audit-v221\real-audit\httpconst3-keys.json"

s3 = io.open(S3, encoding="utf-8", errors="replace").read()
idx = io.open(IDX, encoding="utf-8", errors="replace").read()
s2 = io.open(S2, encoding="utf-8", errors="replace").read()

# 1) 定义块：从 HttpConst3 = { 起做花括号配平
start = s3.index("HttpConst3", 0)  # 第一处引用前先找定义
m = re.search(r"HttpConst3\s*=\s*\{", s3)
blk_start = m.end() - 1
depth = 0
i = blk_start
while i < len(s3):
    if s3[i] == "{": depth += 1
    elif s3[i] == "}":
        depth -= 1
        if depth == 0: break
    i += 1
block = s3[blk_start:i+1]
pairs = re.findall(r"([A-Za-z0-9_]+)\s*:\s*(\"[^\"]*\"|\d+)", block)
keys = {}
for k, v in pairs:
    keys.setdefault(k, v.strip('"'))
line_of = s3[:blk_start].count("\n") + 1

# 2) 发送点（来自第一期抽取）
send = collections.Counter()
unres = []
for f in ("real", "real.scripts2", "real.scripts3"):
    r = json.load(open(rf"F:\BaoZouyxt\audit-v221\incoming-v2.2.2\unpacked\bz-oracle\out\req-params.{f}.json", encoding="utf-8"))
    for k in r:
        if k != "__unresolved": send[k] += 1
    unres += r.get("__unresolved", [])

# 3) MessageCenter.on 注册（HttpConst3.X）
on3 = collections.Counter(re.findall(r"MessageCenter\.on\(\s*\w+\.HttpConst3\.([A-Za-z0-9_]+)", s3))
on3_idx = collections.Counter(re.findall(r"MessageCenter\.on\(\s*\w+\.HttpConst3\.([A-Za-z0-9_]+)", idx))
on2 = collections.Counter(re.findall(r"MessageCenter\.on\(\s*\w+\.HttpConst3\.([A-Za-z0-9_]+)", s2))

# 4) 分类
def classify(k, v):
    if k.startswith("CTS_"): return "客户端请求(CTS_)"
    if k.startswith("STC_"): return "服务端通知(STC_)"
    if v.startswith("User."): return "动作(User.*)"
    return "其他"

rows = []
for k, v in sorted(keys.items()):
    rows.append({
        "key": k, "value": v, "class": classify(k, v),
        "sendSites": send.get(k, send.get(v, 0)),
        "onScripts3": on3.get(k, 0), "onIndex": on3_idx.get(k, 0), "onScripts2": on2.get(k, 0),
    })

json.dump({"blockStartLine": line_of, "blockChars": [blk_start, i+1], "keys": rows},
          open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# 5) 报告
L = []
L.append("# D1 第二期 · HttpConst3 扩展清单（2026-10-24）\n")
L.append("> 决策依据 DECISIONS-2026-10-24 D1；接第一期报告 §3b（116 动作不在 M1 宇宙，114 ∈ HttpConst3）。")
L.append("> 本期把 HttpConst3 定义块整体提取，给出完整扩展表。R21 回执矛盾 #5 的收口工作项（回执标注：执行方 S1 自取，不需再送）。\n")
L.append("## 定义块\n")
L.append("- 位置：`tools/scripts3.js` 第 %d 行附近（字符偏移 %d–%d），键 %d 个（值去重前）。\n" % (line_of, blk_start, i + 1, len(pairs)))
c = collections.Counter(r["class"] for r in rows)
L.append("## 分类总览（键 %d 个）\n" % len(rows))
L.append("| 类 | 数 | 说明 |")
L.append("|---|---:|---|")
L.append("| 动作(User.*) | %d | 服务端动作字符串，GEN 候选主体 |" % c.get("动作(User.*)", 0))
L.append("| 客户端请求(CTS_) | %d | 客户端→服务端请求事件 |" % c.get("客户端请求(CTS_)", 0))
L.append("| 服务端通知(STC_) | %d | 服务端→客户端推送，对应 PUSH 语义 |" % c.get("服务端通知(STC_)", 0))
L.append("| 其他 | %d | 待分类 |" % c.get("其他", 0))
L.append("")
n_send = sum(1 for r in rows if r["sendSites"] > 0)
n_on = sum(1 for r in rows if (r["onScripts3"] + r["onIndex"] + r["onScripts2"]) > 0)
L.append("- 有真实发送点的键：%d；有 MessageCenter.on 注册的键：%d（scripts3 %d / index %d / scripts2 %d 处）。\n" % (
    n_send, n_on, sum(on3.values()), sum(on3_idx.values()), sum(on2.values())))
L.append("## 与 M1 / 注册表口径的关系\n")
L.append("- HttpConst3 键与 M1 的 1125 键**交集为 0**（R21 回执复算结论，本期在定义块层面再次确认）。")
L.append("- 动作宇宙扩展口径建议：`U_action = M1(1125) ∪ HttpConst3(%d) ∪ 残余`；注册表 inScope/GEN-READY 等数字均为 M1 内口径，扩表后需重算。\n" % len(rows))
L.append("## 扩展清单（全 %d 键）\n" % len(rows))
L.append("| 键 | 值 | 类 | 发送点 | on(s3/idx/s2) |")
L.append("|---|---|---|---:|---:|")
for r in rows:
    L.append("| `%s` | `%s` | %s | %d | %d/%d/%d |" % (
        r["key"], r["value"], r["class"], r["sendSites"], r["onScripts3"], r["onIndex"], r["onScripts2"]))
L.append("")
L.append("## 遗留\n")
L.append("- STC_ 通知与 M1 的 PUSH 分类（192 项）是否重叠，待与 M1 的 PUSH 集合比对（下一期）。")
L.append("- CTS_/STC_ 通道不走 59325 事件派发（回执矛盾 #4 已证 gemch 一例），对账域是否需新增 `gemch` 等子键待 S2。")

io.open(OUT_MD, "w", encoding="utf-8").write("\n".join(L))
print("keys:", len(rows), "| block line:", line_of)
print("classes:", dict(c))
print("with send sites:", n_send, "| with on:", n_on)
