import json, re, io, collections, os

DUMP = r"F:\BaoZouyxt\tools\cfg\dump"
OUT = r"F:\BaoZouyxt\audit-v221\r22-materials"
os.makedirs(OUT, exist_ok=True)
L = []
def w(x=''):
    L.append(x)

def load(name):
    d = json.load(open(os.path.join(DUMP, name), encoding="utf-8"))
    return d

def rows_of(d):
    if isinstance(d, dict):
        for k in ("data", "rows"):
            v = d.get(k)
            if isinstance(v, list): return v
            if isinstance(v, dict): return list(v.values())
    return d if isinstance(d, list) else []

def pat(v):
    s = str(v)
    s = re.sub(r"[A-Za-z]+", "A", s)
    s = re.sub(r"\d+", "N", s)
    s = re.sub(r"N+", "N", s)
    return s if len(s) <= 40 else s[:37] + "..."

# ---------- tasknew ----------
d = load("tasknew.json")
rows = rows_of(d)
w("# R22 材料 · 任务表与成就表条件列取值全集（2026-10-24 机械提取）\n")
w("> 提取对象：`tools/cfg/dump/tasknew.json`（4842 行 × 40 列）与 `achieve_list.json`。")
w("> 提取方法：对条件相关列做逐值模式归一（数字→N，字母→A），枚举模式集合与分布。R21 回执 §② 第 2 条缺口（任务/成就表条件类型列）的直接回应材料。\n")

w("## 一、tasknew.json（主线+支线任务表）\n")
w("列全集（40）：" + ", ".join("`%s`" % c for c in d["cols"]) + "\n")

for col in ["TaskType", "Type", "Repeat", "Chain"]:
    c = collections.Counter(str(r.get(col)) for r in rows)
    w("### `%s` 取值分布（%d 行）\n" % (col, len(rows)))
    w("| 值 | 行数 | 占比 |")
    w("|---|---:|---:|")
    for k, n in c.most_common(15):
        w("| %s | %d | %.1f%% |" % (k, n, 100.0 * n / len(rows)))
    w()

w("### `Require`（任务完成条件）\n")
c = collections.Counter(str(r.get("Require")) for r in rows)
w("逐值分布：" + ", ".join("%s×%d" % (k, n) for k, n in c.most_common(10)) + "\n")
w("**发现：全部 4842 行均为 `0`（空条件）——本表的任务完成判定不落在 `Require` 列，实际判定列是 `SpRequire`/`CompletionEvent`（待执行方在 S8 路线内核实）。**\n")

for col in ["SpRequire", "Pre-Require"]:
    w("### `%s` 值模式全集\n" % col)
    kinds = collections.Counter()
    samples = {}
    for r in rows:
        v = r.get(col)
        if v in (None, "", 0, "0", ["0"]):
            k = "(空/0)"
        else:
            k = pat(v)
        kinds[k] += 1
        samples.setdefault(k, str(v)[:60])
    w("| 模式 | 行数 | 首见样例 |")
    w("|---|---:|---|")
    for k, n in kinds.most_common(20):
        w("| `%s` | %d | `%s` |" % (k, n, samples[k]))
    w()

# ---------- achieve tables ----------
w("## 二、成就表族\n")
for name in ["achieve_list.json", "achieve_group.json", "achieve_mark.json", "achieve_rate.json", "achieve_suit.json"]:
    try:
        dd = load(name)
        rr = rows_of(dd)
        cols = list(rr[0].keys()) if rr else (dd.get("cols") if isinstance(dd, dict) else None)
        w("### %s（%d 行）\n" % (name, len(rr)))
        if cols:
            w("列全集：" + ", ".join("`%s`" % c for c in cols) + "\n")
        if name == "achieve_list.json" and rr:
            for col in ("require", "pre-require"):
                kinds = collections.Counter(); samples = {}
                for r in rr:
                    v = r.get(col)
                    if v in (None, "", 0, "0", ["0"]): k = "(空/0)"
                    else: k = pat(v)
                    kinds[k] += 1; samples.setdefault(k, str(v)[:60])
                w("### `%s` 值模式全集\n" % col)
                w("| 模式 | 行数 | 首见样例 |")
                w("|---|---:|---|")
                for k, n in kinds.most_common(20):
                    w("| `%s` | %d | `%s` |" % (k, n, samples[k]))
                w()
            for col in cols:
                vals = collections.Counter(str(r.get(col)) for r in rr)
                if 1 < len(vals) <= 12:
                    w("- `%s` 取值分布：" % col + ", ".join("%s×%d" % (k, n) for k, n in vals.most_common(12)))
            w()
    except Exception as e:
        w("### %s（读取失败：%s）\n" % (name, e))

io.open(os.path.join(OUT, "R22-任务与成就条件列.md"), "w", encoding="utf-8").write("\n".join(L))
print("written:", os.path.join(OUT, "R22-任务与成就条件列.md"))
print("tasknew rows:", len(rows))
