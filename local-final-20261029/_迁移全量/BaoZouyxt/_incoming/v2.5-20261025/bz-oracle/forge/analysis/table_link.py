#!/usr/bin/env python3
"""table_link.py：猜「这个动作的数据可能来自哪张配置表」，反过来列出服务端还没读过的表（第 1 批算法意见问题 4、5）。

用法：python forge/analysis/table_link.py --dump tools/cfg/dump [--server bz-rpc-server.js] [--out out]
产出：out/table-links.json（relate.py --tables 读它）、out/table-links.md（人看）

做法（纯启发式，结果都是【推断】，只用来少翻表，不当真值）：
  打分 = 表名词 ∩ 动作名词 ×3 + 应答字段名 = 表列名 ×2 + 字段名的驼峰片段 = 列名片段 ×0.5
  每个动作取前 3 张、分数 ≥ 2 的表；表名词按出现在几张表名里做 IDF 降权，动作词是表名词子串也算（snow ⊂ snowman）。
  过期：表里有 endtime/end_time/endTime/closeTime 之类的列，且全部行都早于今天 → 关联动作标「可能已下线」。
  反查：--server 给了时，表名和 BZ_XXX 注入常量都对不上 → 列入「服务端看起来还没读过的表」，附最可能消费它的动作。
表文件支持三种形状：{"name","cols","data":{id:row}}（tools/cfg/dump 导出的）、[row,...]、{id:row}。
注意：有些表的数值是混淆过的对象（如 circle_task 的 {"_value":[18120],"tag":"cfMon"}），这里只看列名，不解码。
"""
import argparse, datetime, io, json, math, os, re, sys, collections

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SCOPE = {"GEN-READY", "NEEDS-S2", "IMPL-UNJUDGED", "DONE", "NO-CONTRACT"}
GENERIC = {"id", "type", "data", "list", "info", "eret", "ret", "num", "lv", "level", "name", "time", "user", "get",
           "set", "req", "new", "all", "one", "use", "obj", "arr", "the", "and", "by", "to", "of", "do", "is",
           "item", "award", "reward", "servertime", "note", "index", "idx", "count", "state", "status", "flag"}
SYN = {"school": {"sect"}, "sect": {"school"}, "rg": {"rogue"}, "rogue": {"rg"}, "mount": {"horse"}, "achievement": {"achieve"}}
END_COL = re.compile(r"(^|_)(end|close|stop|over)_?(time|date)$|endtime|enddate|closetime", re.I)


def words(s):
    out = set()
    for part in re.split(r"[_\W]+", s or ""):
        for w in re.findall(r"[A-Z]?[a-z]+|[A-Z]+(?![a-z])|\d+", part):
            w = w.lower()
            if len(w) >= 3 and not w.isdigit() and w not in GENERIC: out.add(w)
    return out


def load_table(p):
    d = json.load(io.open(p, encoding="utf-8"))
    if isinstance(d, dict) and "data" in d and isinstance(d["data"], (dict, list)):
        name = d.get("name") or os.path.splitext(os.path.basename(p))[0]
        rows = list(d["data"].values()) if isinstance(d["data"], dict) else d["data"]
        cols = d.get("cols") or sorted({k for r in rows[:50] if isinstance(r, dict) for k in r})
    else:
        name = os.path.splitext(os.path.basename(p))[0]
        rows = list(d.values()) if isinstance(d, dict) else d
        cols = sorted({k for r in rows[:50] if isinstance(r, dict) for k in r})
    return name, [str(c) for c in cols], [r for r in rows if isinstance(r, dict)]


def to_date(v):
    try:
        if isinstance(v, (int, float)) or (isinstance(v, str) and v.strip().isdigit()):
            x = float(v)
            if x > 1e12: x /= 1000
            if x > 1e9: return datetime.datetime.fromtimestamp(x, datetime.timezone.utc).date()
            if 19000101 <= x <= 21001231: return datetime.datetime.strptime(str(int(x)), "%Y%m%d").date()
        if isinstance(v, str):
            m = re.match(r"(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})", v.strip())
            if m: return datetime.date(*map(int, m.groups()))
    except Exception:
        return None
    return None


def main():
    sys.stdout.reconfigure(encoding="utf-8"); sys.stderr.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--dump", required=True)
    ap.add_argument("--server")
    ap.add_argument("--out", default=os.path.join(ROOT, "out"))
    ap.add_argument("--today", help="判过期用的日期 YYYY-MM-DD，默认今天")
    a = ap.parse_args()
    today = datetime.date.fromisoformat(a.today) if a.today else datetime.date.today()
    reg = json.load(io.open(os.path.join(a.out, "registry.json"), encoding="utf-8"))["rows"]
    con = json.load(io.open(os.path.join(a.out, "contracts.json"), encoding="utf-8"))["contracts"]

    tables = {}
    for fn in sorted(os.listdir(a.dump)):
        if not fn.endswith(".json"): continue
        try: name, cols, rows = load_table(os.path.join(a.dump, fn))
        except Exception as e:
            print(f"# 跳过 {fn}：{e}", file=sys.stderr); continue
        endc = [c for c in cols if END_COL.search(c)]
        expired = False
        if endc and rows:
            ds = [to_date(r.get(c)) for r in rows for c in endc]
            ds = [d for d in ds if d and d.year >= 2015]
            expired = bool(ds) and max(ds) < today
        tables[name] = {"file": fn, "nameW": words(name), "cols": {c.lower() for c in cols},
                        "colW": {w for c in cols for w in words(c)}, "rows": len(rows), "expired": expired}
    print(f"# 读入 {len(tables)} 张表，{sum(t['expired'] for t in tables.values())} 张判为全部过期", file=sys.stderr)

    acts = {}
    for r in reg:
        if r["status"] not in SCOPE or not r.get("action"): continue
        c = con.get(r.get("contract") or "") or {}
        fields = set(c.get("fields", {}))
        nw = words(r["key"]) | words(r["action"].split(".")[-1])
        nw |= {y for w in nw for y in SYN.get(w, ())}
        acts[r["action"]] = {"key": r["key"], "nameW": nw,
                             "fields": {f.lower() for f in fields if f.lower() not in GENERIC},
                             "fieldW": {w for f in fields for w in words(f)}}
    # 表名词按「几张表含这个词」降权（task 出现在一堆表名里，就不值 3 分）；动作词是表名词的子串也算（snow ⊂ snowman、task ⊂ tasknew）
    NT = max(len(tables), 2)
    df = collections.Counter(w for T in tables.values() for w in T["nameW"])

    def name_score(aw, tw):
        s = 0.0
        for w in aw:
            hit = [t for t in tw if t == w or (len(w) >= 4 and w in t)]
            if hit: s += max(3 * (math.log((NT + 1) / (df[t] + 0.5)) / math.log(NT + 1)) * (1 if t == w else 0.8) for t in hit)
        return s
    res = {}
    for act, A in acts.items():
        sc = []
        for tn, T in tables.items():
            s = round(name_score(A["nameW"], T["nameW"]) + 2 * len(A["fields"] & T["cols"]) + 0.5 * len(A["fieldW"] & T["colW"]), 2)
            if s >= 2.0: sc.append((s, tn))
        sc.sort(key=lambda x: (-x[0], x[1]))
        if sc:
            top = [{"table": tn, "score": s, "expired": tables[tn]["expired"]} for s, tn in sc[:3]]
            # 只有表名词全被动作名覆盖（这张表确实是「它的」表）时，才把过期传给动作
            own = top[0]["expired"] and tables[top[0]["table"]]["nameW"] <= A["nameW"]
            res[act] = {"key": A["key"], "tables": top, "expired": bool(own)}

    unread = []
    if a.server:
        src = io.open(a.server, encoding="utf-8", errors="replace").read()
        # 服务端的表是构建期注入成 BZ_XXX 常量的（BZ_ROGUESHOP ≈ rogue_shop），也可能直接写表名；两样都粗对一下
        bz = {m.replace("_", "") for m in re.findall(r"BZ_([A-Z][A-Z0-9_]{2,})", src)}
        for tn, T in tables.items():
            base = os.path.splitext(T["file"])[0]
            tk = re.sub(r"[^A-Z0-9]", "", tn.upper())
            by_bz = any(b.startswith(tk) or (len(b) >= 4 and tk.startswith(b)) for b in bz)
            by_name = re.search(r"[\"'./\\]" + re.escape(tn) + r"(?:\.json)?[\"']", src) or re.search(
                r"[\"'./\\]" + re.escape(base) + r"(?:\.json)?[\"']", src)
            if not by_bz and not by_name:
                cands = sorted(((t["score"], act) for act, v in res.items() for t in v["tables"] if t["table"] == tn), reverse=True)
                unread.append({"table": tn, "rows": T["rows"], "candidates": [res[x]["key"] for _, x in cands[:5]]})
    out = {"__meta": {"tables": len(tables), "actionsLinked": len(res), "today": str(today),
                      "note": "启发式【推断】：只用来少翻表，数额仍以表里的值为准"},
           "actions": dict(sorted(res.items())), "unreadTables": unread}
    with io.open(os.path.join(a.out, "table-links.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    md = ["# 动作 ↔ 配置表（启发式【推断】）\n", f"{len(tables)} 张表，{len(res)} 个动作找到候选表。\n",
          "| 动作 | do 名 | 候选表（分数） |", "|---|---|---|"]
    for act, v in sorted(res.items(), key=lambda x: x[1]["key"]):
        md.append(f"| {v['key']} | {act} | " + "、".join(f"{t['table']}（{t['score']:g}{'，过期' if t['expired'] else ''}）" for t in v["tables"]) + " |")
    if a.server:
        md.append(f"\n## 服务端看起来还没读过的表（{len(unread)} 张；按表名和 BZ_ 常量粗对，可能误报）\n")
        for u in unread:
            md.append(f"- {u['table']}（{u['rows']} 行）→ 可能的消费动作：{'、'.join(u['candidates']) or '—'}")
    with io.open(os.path.join(a.out, "table-links.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")
    print(json.dumps(out["__meta"], ensure_ascii=False))


if __name__ == "__main__":
    main()
