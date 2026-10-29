# -*- coding: utf-8 -*-
# R22 回执 ⓪.3 / ⓪.4 执行：HttpConst3 逐键表 + M2 字段级断言
import re, io, json, collections, os

TOOLS = r"F:\BaoZouyxt\tools"
M2 = r"F:\BaoZouyxt\audit-v23\incoming\unpacked\r21\M2-客户端读点索引.md"
OUT = r"F:\BaoZouyxt\audit-v23\R22执行-逐键表与M2字段断言.md"
KEYS = json.load(open(r"F:\BaoZouyxt\audit-v221\real-audit\httpconst3-keys.json", encoding="utf-8"))["keys"]

s3 = io.open(os.path.join(TOOLS, "scripts3.js"), encoding="utf-8", errors="replace").read()
idx = io.open(os.path.join(TOOLS, "index.js"), encoding="utf-8", errors="replace").read()
s2 = io.open(os.path.join(TOOLS, "scripts2.js"), encoding="utf-8", errors="replace").read()

L = []
def w(x=''):
    L.append(x)

# ---------- A. HttpConst3 逐键表 ----------
w("# R22 回执执行 · HttpConst3 逐键表 + M2 字段级断言（2026-10-24）\n")
w("## 一、HttpConst3 逐键 (key, value, send?, on?, 通道)\n")
w("回执判定断言：|on|=128，且 {k | on(k)=0} ⊇ STC_*。不满足则 R21 #5 与 R22 至少一处计数有错。\n")

send = collections.Counter()
for f in ("real", "real.scripts2", "real.scripts3"):
    r = json.load(open(rf"F:\BaoZouyxt\audit-v221\incoming-v2.2.2\unpacked\bz-oracle\out\req-params.{f}.json", encoding="utf-8"))
    for k in r:
        if k != "__unresolved":
            send[k] += 1

# on 注册：MessageCenter.on(...HttpConst3.KEY)
on_mc = collections.defaultdict(int)
for name, src in (("scripts3", s3), ("index", idx), ("scripts2", s2)):
    for m in re.finditer(r"MessageCenter\.on\(\s*[\w$.]+\.?HttpConst3\.([A-Za-z0-9_]+)", src):
        on_mc[m.group(1)] += 1

# 其它通道：HttpConst3.KEY 在非 MessageCenter.on 上下文中的出现（粗口径：出现次数减去 on 次数）
total_ref = collections.defaultdict(int)
for name, src in (("scripts3", s3), ("index", idx), ("scripts2", s2)):
    for m in re.finditer(r"HttpConst3\.([A-Za-z0-9_]+)", src):
        total_ref[m.group(1)] += 1

rows = []
for r in KEYS:
    k = r["key"]
    on_n = on_mc.get(k, 0)
    other = total_ref.get(k, 0) - on_n  # 非 on 引用次数
    rows.append({"key": k, "value": r["value"], "cls": r["class"],
                 "send": send.get(k, send.get(r["value"], 0)),
                 "on": on_n, "otherRefs": max(other, 0)})

n_on = sum(1 for r in rows if r["on"] > 0)
stc = [r for r in rows if r["cls"] == "服务端通知(STC_)"]
stc_no_on = [r for r in stc if r["on"] == 0]
stc_with_on = [r for r in stc if r["on"] > 0]
w("| 键 | 值 | 类 | send点 | on注册 | 非on引用 |")
w("|---|---|---|---:|---:|---:|")
for r in sorted(rows, key=lambda x: (x["cls"], x["key"])):
    w("| `%s` | `%s` | %s | %d | %d | %d |" % (r["key"], r["value"], r["cls"], r["send"], r["on"], r["otherRefs"]))
w()
w("### 断言校验\n")
w("- |on|（有 MessageCenter.on 注册的键数）= **%d**（回执期望 128）" % n_on)
w("- STC_ 共 %d 键：其中 on=0 的 %d 个；**on>0 的 STC_：** %s" % (
    len(stc), len(stc_no_on),
    ", ".join("`%s`(on=%d)" % (r["key"], r["on"]) for r in stc_with_on) or "无"))
no_on_all = [r["key"] for r in rows if r["on"] == 0]
w("- 全部 on=0 的键（%d 个）：%s" % (len(no_on_all), ", ".join("`%s`" % k for k in no_on_all) or "无"))
w("- 结论：断言%s满足。" % ("**部分**" if (n_on != 128 or stc_with_on) else ""))
w("- 非 on 引用（otherRefs>0 且 on=0）的键，是其它派发通道的候选（回执 ⓪.3-(a) 的验证线索）。\n")

# ---------- B. M2 字段级断言 ----------
w("## 二、M2 字段级断言\n")
w("断言：∀(line, field) ∈ M2: 源码第 line 行 ⊇ (\".\" + field | \"[\\\"\" + field + \"\\\"]\")。低于 100% 的条目单列。\n")

m2 = io.open(M2, encoding="utf-8").read()
src_cache = {}
def src_lines(f):
    if f not in src_cache:
        src_cache[f] = io.open(os.path.join(TOOLS, f + ".js"), encoding="utf-8", errors="replace").read().split("\n")
    return src_cache[f]

total = hit = 0
misses = []
# M2 表格行：| 字段 | 开关 | 真值读 | 外键表 | 读取位置 |
# 读取位置形如 index.js:70346-70348 或 index.js:100258
for block in re.finditer(r"### (\S+)\n((?:\|.*\n)+)", m2):
    action = block.group(1)
    for row in block.group(2).split("\n"):
        cells = [c.strip() for c in row.strip().strip("|").split("|")]
        if len(cells) < 5 or cells[0] in ("字段", "---") or set(cells[0]) <= set("-: "):
            continue
        field = cells[0]
        locs = re.findall(r"(index|scripts2|scripts3)\.js:(\d+)(?:-(\d+))?", cells[4])
        for f, a, b in locs:
            a = int(a); b = int(b) if b else a
            lines = src_lines(f)
            ok = False
            for ln in range(a, b + 1):
                if ln < 1 or ln > len(lines): continue
                text = lines[ln - 1]
                if ("." + field) in text or ('["' + field + '"]') in text or ("['" + field + "']") in text:
                    ok = True
                    break
            total += 1
            if ok: hit += 1
            else: misses.append((action, field, "%s.js:%d%s" % (f, a, "-" + str(b) if b != a else "")))

w("- 断言样本总数：%d；命中：%d；命中率：**%.1f%%**" % (total, hit, 100.0 * hit / total if total else 0))
w("- 低于 100%%，未命中 %d 条，逐条列出：\n" % len(misses))
for m in misses[:60]:
    w("  - `%s` 字段 `%s` @ `%s`" % m)
if len(misses) > 60: w("  - …（其余 %d 条见 JSON）" % (len(misses) - 60))
w()

json.dump({"httpconst3": rows, "m2_field_assert": {"total": total, "hit": hit, "misses": misses}},
          open(r"F:\BaoZouyxt\audit-v23\r22-exec-keytable-m2assert.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
io.open(OUT, "w", encoding="utf-8").write("\n".join(L))
print("A: keys=%d |on|=%d stc=%d stc_no_on=%d stc_with_on=%s" % (len(rows), n_on, len(stc), len(stc_no_on), [r['key'] for r in stc_with_on]))
print("B: total=%d hit=%d rate=%.1f%% misses=%d" % (total, hit, 100.0 * hit / total if total else 0, len(misses)))
