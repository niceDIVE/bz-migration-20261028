#!/usr/bin/env python3
"""extract_shape.py：应答字段的「真实消费方式」和「能不能安全兜底」（第 1 批算法意见问题 2、3）。

用法：python forge/analysis/extract_shape.py index.js scripts2.js scripts3.js [--out out] > /dev/null
产出：out/shape-hints.json、out/shape-hints.md

为什么要它：contracts 判类型只看回调那一层。GetMarketList.market 在 index.js:130767 只是被
dispatch(STORE_SHOW_UI, {market: o.market}) 转手，真正 for..in 遍历它的是 scripts2.js:8508，
于是被判成 number 默认 0，货架就空了。
做法（正则启发式，结论都是【推断】）：
  1. 从 contracts 的字段读点出发；读点那行若在 dispatch/emit(事件, {...}) 里转手，就跳到所有监听该事件的地方
     （监听写成 on(EV, this.onX, this) 时再跳到 onX 的函数体），在那里看字段怎么被用。
  2. 没有转手就在读点往下 40 行看：先找 `var a = o.field` 这类别名，再看别名/字段怎么被用。
  消费方式 → kind：
     for (k in X) → container（数组或对象，禁止用 0 兜底）   X[数字] → array      X.length → array|string
     X.forEach/map/filter → array    Object.keys(X) → object    X.toString()/toFixed → scalar（缺了就崩）
  safeDefault（问题 3）：
     crashOnMissing  有 X.toString()、X[n].y、X[n][m] 这类解引用，前 3 行内没有 if (X / X && / X || 守卫
     retryOnEmpty    同一个面板脚本里，发这个请求的语句前 3 行内有 else / length / == 0 / !this. 之类判空
                     （getBigGrowupData 那种「数据空就再请求」的死循环）
     safeDefault = 两者都不是。为 false 的动作：兜底时宁可不回 eRet:1（让客户端走「未开启」），也别发半截数据。
"""
import io, json, os, re, sys, collections, bisect

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
EMIT = re.compile(r'\.(?:dispatch|dispatchEvent|emit|fire|sendEvent|postEvent)\(\s*([A-Za-z_$][\w$.]*)')
LISTEN = re.compile(r'\.(?:on|once|addEventListener|addListener|register|regist|listen)\(\s*([A-Za-z_$][\w$.]*)\s*,\s*(?:this\.(\w+)|function)?')
REF = re.compile(r'HttpConst\d*\.([A-Z][A-Z0-9_]+)\b')
RF = re.compile(r'cc\._RF\.push\(\s*\w+\s*,\s*["\'][^"\']*["\']\s*,\s*["\']([^"\']+)["\']')
WIN = 40


def ev_name(s):
    last = s.split(".")[-1]
    return last if len(last) >= 4 and not last.islower() else None


def kinds_of(expr_res, text):
    """expr_res：能指代这个字段的正则片段列表（.field、别名）。返回 [(kind, 证据)]。"""
    out = []
    for e in expr_res:
        pats = [
            (rf'for\s*\(\s*(?:var|let|const)?\s*\w+\s+in\s+(?:[\w$.]*)?{e}\s*\)', "container"),
            (rf'{e}\s*\[\s*\d+\s*\]', "array"),
            (rf'{e}\s*\.\s*length\b', "array|string"),
            (rf'{e}\s*\.\s*(?:forEach|map|filter|some|every|reduce)\s*\(', "array"),
            (rf'Object\.keys\(\s*(?:[\w$.]*)?{e}\s*\)', "object"),
            (rf'{e}\s*\.\s*(?:toString|toFixed)\s*\(', "scalar"),
        ]
        for p, k in pats:
            if re.search(p, text): out.append(k)
    return out


def crashy(expr_res, lines, i):
    t = lines[i]
    for e in expr_res:
        if re.search(rf'{e}\s*(?:\.\s*(?:toString|toFixed)\s*\(|\[\s*\d+\s*\]\s*(?:\.|\[))', t):
            guard = "\n".join(lines[max(0, i - 3):i + 1])
            if not re.search(rf'if\s*\(\s*!?\s*(?:[\w$.]*)?{e}|{e}\s*(?:&&|\|\||\?)|null\s*!=\s*(?:[\w$.]*)?{e}', guard):
                return True
    return False


def main():
    sys.stdout.reconfigure(encoding="utf-8"); sys.stderr.reconfigure(encoding="utf-8")
    args = sys.argv[1:]
    outd = os.path.join(ROOT, "out")
    if "--out" in args:
        i = args.index("--out"); outd = args[i + 1]; del args[i:i + 2]
    if not args: sys.exit(__doc__)
    con = json.load(io.open(os.path.join(outd, "contracts.json"), encoding="utf-8"))["contracts"]
    src = {os.path.basename(p): io.open(p, encoding="utf-8", errors="replace").read().split("\n") for p in args}
    listeners, funcs, refs, spans, fdefs = collections.defaultdict(list), {}, collections.defaultdict(list), {}, {}
    for b, L in src.items():
        spans[b] = [(i, m.group(1)) for i, t in enumerate(L, 1) for m in [RF.search(t)] if m]
        for i, t in enumerate(L, 1):
            for m in LISTEN.finditer(t):
                e = ev_name(m.group(1))
                if e: listeners[e].append((b, i, m.group(2)))
            m = re.search(r'^\s*(\w+)\s*:\s*function\s*\(|^\s*(\w+)\s*\([^)]*\)\s*\{\s*$', t)
            if m:
                funcs.setdefault((b, m.group(1) or m.group(2)), []).append(i)
                fdefs.setdefault(b, []).append((i, m.group(1) or m.group(2)))
            for m in REF.finditer(t): refs[m.group(1)].append((b, i))

    def script(b, line):
        s = spans.get(b) or []
        j = bisect.bisect_right([x[0] for x in s], line) - 1
        return s[j][1] if j >= 0 else None

    def window(b, start, n=WIN):
        L = src[b]; return start - 1, L[start - 1:start - 1 + n]

    res, stat = {}, collections.Counter()
    for c in con.values():
        act = c.get("action"); k = c.get("key")
        if not act: continue
        fhints = {}
        for fname, fv in (c.get("fields") or {}).items():
            if fname in ("eRet", "Ret", "ret"): continue
            fe = [rf'\.{re.escape(fname)}\b', rf'\[\s*["\']{re.escape(fname)}["\']\s*\]']
            kinds, where, crash = [], [], False
            for rd in fv.get("reads", []):
                b = os.path.basename(rd["file"])
                if b not in src: continue
                line = src[b][rd["line"] - 1]
                spots = []
                m = EMIT.search(line)
                if m and ev_name(m.group(1)):
                    # 转手：dispatch(EV, {newName: o.field}) → 监听方用 newName
                    mm = re.search(rf'(\w+)\s*:\s*[\w$.]*\.{re.escape(fname)}\b', line)
                    alias = mm.group(1) if mm else fname
                    for (lb, li, fn) in listeners.get(ev_name(m.group(1)), []):
                        start = li
                        if fn and (lb, fn) in funcs:
                            cand = [x for x in funcs[(lb, fn)] if script(lb, x) == script(lb, li)]
                            start = (cand or funcs[(lb, fn)])[0]
                        spots.append((lb, start, [rf'\.{re.escape(alias)}\b', rf'\[\s*["\']{re.escape(alias)}["\']\s*\]']))
                else:
                    spots.append((b, rd["line"], fe))
                for (sb, st, exprs) in spots:
                    off, W = window(sb, st)
                    txt = "\n".join(W)
                    al = set()
                    for e in exprs:
                        for mm in re.finditer(rf'(?:var|let|const)?\s*(\w+)\s*=\s*[\w$.]*{e}\s*[;,\n)]', txt):
                            al.add(rf'\b{re.escape(mm.group(1))}\b')
                    ex = exprs + sorted(al)
                    ks = kinds_of(ex, txt)
                    if ks:
                        kinds += ks; where.append(f"{sb}:{st}")
                    for j in range(len(W)):
                        if crashy(ex, src[sb], off + j): crash = True; where.append(f"{sb}:{off + j + 1}⚠"); break
            if kinds or crash:
                kk = sorted(set(kinds))
                final = "container" if "container" in kk else (kk[0] if len(kk) == 1 else "|".join(kk))
                fhints[fname] = {"kind": final, "consumedAt": sorted(set(where))[:4], "crashOnMissing": crash,
                                 "zeroIsWrong": final in ("container", "array", "object", "array|string") or "container" in kk}
                stat[final] += 1
        retry = []
        GUARD = r'\belse\b|\.length\b|==\s*0|0\s*==|!this\.|null\s*==|==\s*null'
        for (b, i) in refs.get(k, []):
            if not re.search(r'\b(?:send|request|req\w*|post|http\w*)\s*\(', src[b][i - 1], re.I): continue
            if re.search(GUARD, "\n".join(src[b][max(0, i - 4):i])):
                retry.append(f"{b}:{i}"); continue
            # 发送写在小函数里（reqBigGrowUpData），判空在调用方：else 1 == t && reqBigGrowUpData()
            fl = fdefs.get(b, [])
            j = bisect.bisect_right([x[0] for x in fl], i) - 1
            if j < 0: continue
            fname_ = fl[j][1]
            for ci, t in enumerate(src[b], 1):
                if ci == fl[j][0] or not re.search(rf'\b{re.escape(fname_)}\s*\(', t): continue
                if script(b, ci) != script(b, i): continue
                if re.search(GUARD, "\n".join(src[b][max(0, ci - 4):ci])):
                    retry.append(f"{b}:{ci}→{i}"); break
        crash_any = any(h["crashOnMissing"] for h in fhints.values())
        if fhints or retry:
            res[act] = {"key": k, "fields": fhints, "retryOnEmpty": retry[:3],
                        "safeDefault": not crash_any and not retry}
    meta = {"actions": len(res), "kinds": dict(stat), "unsafe": sum(1 for v in res.values() if not v["safeDefault"]),
            "zeroIsWrong": sum(1 for v in res.values() for h in v["fields"].values() if h["zeroIsWrong"]),
            "note": "正则启发式【推断】；consumedAt 是复核用的落点"}
    with io.open(os.path.join(outd, "shape-hints.json"), "w", encoding="utf-8") as f:
        json.dump({"__meta": meta, "actions": dict(sorted(res.items()))}, f, ensure_ascii=False, indent=1)
    md = ["# 应答字段消费方式（启发式【推断】）\n",
          f"{meta['actions']} 个动作有线索；{meta['zeroIsWrong']} 个字段不能用 0 兜底；{meta['unsafe']} 个动作不能安全兜底。\n",
          "## 不能安全兜底的动作（兜底时别回 eRet:1，或者把字段给全）\n",
          "| 动作 | do 名 | 原因 |", "|---|---|---|"]
    for act, v in sorted(res.items(), key=lambda x: x[1]["key"]):
        if v["safeDefault"]: continue
        why = [f"{f} 缺了会崩（{','.join(h['consumedAt'])}）" for f, h in v["fields"].items() if h["crashOnMissing"]]
        if v["retryOnEmpty"]: why.append("数据空会重发请求（" + ",".join(v["retryOnEmpty"]) + "）")
        md.append(f"| {v['key']} | {act} | {'；'.join(why)} |")
    md += ["\n## 不能用 0 兜底的字段\n", "| 动作 | 字段 | 实际形状 | 消费点 |", "|---|---|---|---|"]
    for act, v in sorted(res.items(), key=lambda x: x[1]["key"]):
        for f, h in sorted(v["fields"].items()):
            if h["zeroIsWrong"]: md.append(f"| {v['key']} | {f} | {h['kind']} | {','.join(h['consumedAt'])} |")
    with io.open(os.path.join(outd, "shape-hints.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")
    print(json.dumps(meta, ensure_ascii=False))


if __name__ == "__main__":
    main()
