#!/usr/bin/env python3
"""extract_panel.py v2：给每个动作标上「打开哪个 UI 面板会用到它」。

用法：python forge/analysis/extract_panel.py index.js scripts2.js scripts3.js > out/panel.json
     再跑 relate.py --panel out/panel.json

v1 的毛病（第 1 批回执）：只看 contracts 里的回调注册点，而注册点全在 index.js 的网络层脚本里，
被 panelCap 当成网络层剔掉，GET_MARKETLIST 一类读货架的动作就挂不上面板。
v2 认三条路，任何一条命中都算这个动作「属于」那个脚本：
  ref    客户端任何地方出现 HttpConst*.KEY（发请求的地方就在面板脚本里）
  event  回调里 dispatch/emit 了某个事件 → 所有 on/addEventListener 这个事件的脚本
         （例：index.js:130767 dispatch(STORE_SHOW_UI, {market}) → scripts2.js:8507 的监听方）
  site   回调注册点本身所在的脚本（v1 的做法，保留）
脚本区间：cc._RF.push(module, "uuid", "脚本名") 起，下一个 push 止；没有 _RF 时退回 cc.Class 名。
另记 constAt：常量定义行（KEY: "User.xxx"），用来对「动作名 ≠ do 名」（第 1 批回执问题 6）。

输出：{"__meta":{...}, "actions": {"User.GetMarketList": {"panels":["StoreUI"], "via":{"StoreUI":"event:STORE_SHOW_UI@scripts2.js:8507"},
       "constAt":"index.js:59601"}}}
"""
import io, json, os, re, sys, bisect, collections

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RF = re.compile(r'cc\._RF\.push\(\s*\w+\s*,\s*["\'][^"\']*["\']\s*,\s*["\']([^"\']+)["\']')
CLS = re.compile(r'(?:window\.(\w+)\s*=\s*cc\.Class\(|cc\.Class\(\{\s*name\s*:\s*["\'](\w+)["\'])')
REF = re.compile(r'HttpConst\d*\.([A-Z][A-Z0-9_]+)\b')
CONST = re.compile(r'\b([A-Z][A-Z0-9_]{2,})\s*[:=]\s*["\'](User\.\w+)["\']')
EMIT = re.compile(r'\.(?:dispatch|dispatchEvent|emit|fire|sendEvent|postEvent)\(\s*([A-Za-z_$][\w$.]*)')
LISTEN = re.compile(r'\.(?:on|once|addEventListener|addListener|register|regist|listen)\(\s*([A-Za-z_$][\w$.]*)')
BODY_MAX = 120
EVENT_CAP = 6   # 被超过这么多动作 dispatch 的事件（余额变化、红点刷新之类）视为枢纽事件，不用来认面板


def ev_name(s):
    """事件常量取最后一段，容忍别名（a.EventConst.X 和 EventConst.X 视为同一个）。"""
    last = s.split(".")[-1]
    return last if len(last) >= 4 and not last.islower() else None


def load(path):
    with io.open(path, encoding="utf-8", errors="replace") as f:
        return f.read().split("\n")


def spans(lines):
    st = []
    for i, line in enumerate(lines, 1):
        m = RF.search(line)
        if m: st.append((i, m.group(1))); continue
        m = CLS.search(line)
        if m: st.append((i, m.group(1) or m.group(2)))
    return st


def body(lines, start):
    """从回调注册行起，按花括号配平取函数体（上限 BODY_MAX 行）。"""
    depth, seen, out = 0, False, []
    for j in range(start - 1, min(len(lines), start - 1 + BODY_MAX)):
        t = lines[j]; out.append((j + 1, t))
        for ch in t:
            if ch == "{": depth += 1; seen = True
            elif ch == "}": depth -= 1
        if seen and depth <= 0: break
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8"); sys.stderr.reconfigure(encoding="utf-8")
    args = sys.argv[1:]
    outd = os.path.join(ROOT, "out")
    if "--out" in args:
        i = args.index("--out"); outd = args[i + 1]; del args[i:i + 2]
    files = args
    if not files: sys.exit(__doc__)
    reg = json.load(io.open(os.path.join(outd, "registry.json"), encoding="utf-8"))["rows"]
    con = json.load(io.open(os.path.join(outd, "contracts.json"), encoding="utf-8"))["contracts"]
    key2act = {r["key"]: r["action"] for r in reg if r.get("action")}
    src, sp = {}, {}
    for p in files:
        b = os.path.basename(p); src[b] = load(p); sp[b] = spans(src[b])
        print(f"# {b}：{len(src[b])} 行，{len(sp[b])} 个脚本区间", file=sys.stderr)

    def script(b, line):
        s = sp.get(b) or []
        i = bisect.bisect_right([x[0] for x in s], line) - 1
        return s[i][1] if i >= 0 else None

    refs, const_at, listeners = collections.defaultdict(list), {}, collections.defaultdict(list)
    for b, lines in src.items():
        for i, t in enumerate(lines, 1):
            if "HttpConst" in t:
                for m in REF.finditer(t): refs[m.group(1)].append((b, i))
            if "User." in t:
                for m in CONST.finditer(t): const_at.setdefault(m.group(1), f"{b}:{i}")
            for m in LISTEN.finditer(t):
                e = ev_name(m.group(1))
                if e: listeners[e].append((b, i))

    emits = collections.defaultdict(set)   # key -> {(event, b, line)}
    for c in con.values():
        for st in c.get("sites", []):
            b = os.path.basename(st["file"])
            if b not in src: continue
            for ln, t in body(src[b], st["line"]):
                for m in EMIT.finditer(t):
                    e = ev_name(m.group(1))
                    if e and e in listeners: emits[c.get("key")].add(e)
    ev_df = collections.Counter(e for es in emits.values() for e in es)
    hub = {e for e, n in ev_df.items() if n > EVENT_CAP}
    if hub: print(f"# 枢纽事件 {len(hub)} 个不参与认面板：{'、'.join(sorted(hub)[:12])}", file=sys.stderr)
    out, stat = {}, collections.Counter()
    for c in sorted(con.values(), key=lambda x: x.get("key", "")):
        k, act = c.get("key"), c.get("action") or key2act.get(c.get("key"))
        if not act: continue
        rec = {"panels": [], "via": {}}

        def add(name, why):
            if name and name not in rec["via"]:
                rec["via"][name] = why; rec["panels"].append(name); stat[why.split(":")[0].split("@")[0]] += 1
        for st in c.get("sites", []):
            b = os.path.basename(st["file"])
            if b not in src: continue
            add(script(b, st["line"]), f"site@{b}:{st['line']}")
        for e in sorted(emits.get(k, ())):
            if e in hub: continue
            for (lb, li) in listeners[e]:
                add(script(lb, li), f"event:{e}@{lb}:{li}")
        for (b, i) in refs.get(k, []):
            add(script(b, i), f"ref@{b}:{i}")
        if k in const_at: rec["constAt"] = const_at[k]
        if rec["panels"] or "constAt" in rec: out[act] = rec
    meta = {"files": sorted(src), "spans": {b: len(s) for b, s in sp.items()}, "actions": len(out),
            "withPanel": sum(1 for v in out.values() if v["panels"]), "viaCount": dict(stat),
            "constAt": sum(1 for v in out.values() if "constAt" in v), "hubEvents": sorted(hub)}
    print(f"# {meta['withPanel']} 个动作拿到面板；来源计数 {dict(stat)}；{meta['constAt']} 个找到常量定义行", file=sys.stderr)
    print(json.dumps({"__meta": meta, "actions": dict(sorted(out.items()))}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
