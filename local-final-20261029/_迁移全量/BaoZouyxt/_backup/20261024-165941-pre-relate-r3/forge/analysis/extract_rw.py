#!/usr/bin/env python3
"""从服务端源码粗抽「动作 → 存档键读/写」，喂给 relate.py --rw。

v2（2026-10-24，按第 1 轮回执改）：
  1) 分派表形态：找 `var H = {`（或任何一级成员大多是 function 的对象字面量），花括号配平取一级键切段；
     裸键名自动补 `User.` 前缀（服务端运行时拼 'User.' + action）。
  2) helper 内联：handler 里调用的同文件顶层函数（function f(){} / var f = function(){}），
     其中的 s.* 访问也算进来，默认深度 2。写档藏在 helper 里的不再漏掉。
  3) 字面量形态（'User.xxx'）保留为兜底，但段长封顶 3000 字符，不再吞别人的代码。
  4) 全程 utf-8 读写，Windows 不用再设 PYTHONUTF8。
用法：python extract_rw.py bz-rpc-server.js [更多文件...] > rw.json
"""
import re, sys, json, collections, io

ACC = re.compile(r"\b(?:s|save|sv)\.([A-Za-z_$][\w$]*)((?:\[[^\]]*\])*)\s*(\+\+|--|[+\-*/]?=(?!=)|\.(?:push|splice|pop|shift|unshift)\()?")
PROTO = re.compile(r"""['"]((?:[A-Z][A-Za-z]+)\.[A-Za-z_][A-Za-z0-9_]*)['"]""")
MEMBER = re.compile(r"""^\s*['"]?([A-Za-z_$][\w$]*)['"]?\s*:\s*function\b""")
FUNC_DECL = re.compile(r"\bfunction\s+([A-Za-z_$][\w$]*)\s*\(|\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*function\b")
CALL = re.compile(r"\b([A-Za-z_$][\w$]*)\s*\(")
SKIP_CALLS = {"if", "for", "while", "switch", "return", "function", "catch", "typeof", "clone", "ack"}


def match_brace(src, i):
    """src[i] == '{'，返回配对 '}' 的下标；跳过字符串和注释。"""
    depth, n, q = 0, len(src), None
    while i < n:
        c = src[i]
        if q:
            if c == "\\": i += 2; continue
            if c == q: q = None
        elif c in "'\"`": q = c
        elif c == "/" and src[i + 1:i + 2] == "/":
            j = src.find("\n", i); i = n if j < 0 else j; continue
        elif c == "/" and src[i + 1:i + 2] == "*":
            j = src.find("*/", i + 2); i = n if j < 0 else j + 2; continue
        elif c == "{": depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0: return i
        i += 1
    return n - 1


KEYFN = re.compile(r"""['"]?([A-Za-z_$][\w$]*)['"]?\s*:\s*function\b[^{]*\{""")


def top_members(src, lb, rb):
    """对象字面量 src[lb..rb] 的一级 function 成员 → {name: body}；跳过字符串、注释和嵌套块。"""
    out, i, q = {}, lb + 1, None
    while i < rb:
        c = src[i]
        if c in "'\"`" or c.isalpha() or c in "_$":
            m = KEYFN.match(src, i)
            if m:
                b = m.end() - 1
                e = match_brace(src, b)
                out[m.group(1)] = src[b:e + 1]
                i = e + 1
                continue
            if c in "'\"`":  # 跳过字符串值
                j = i + 1
                while j < rb and src[j] != c:
                    j += 2 if src[j] == "\\" else 1
                i = j + 1
                continue
            m2 = re.compile(r"[\w$]+").match(src, i)
            i = m2.end()
            continue
        if c == "/" and src[i + 1:i + 2] == "/":
            j = src.find("\n", i); i = rb if j < 0 else j; continue
        if c == "/" and src[i + 1:i + 2] == "*":
            j = src.find("*/", i + 2); i = rb if j < 0 else j + 2; continue
        if c in "{[(":
            close = {"{": "}", "[": "]", "(": ")"}[c]
            if c == "{":
                i = match_brace(src, i) + 1
            else:
                d = 0
                while i < rb:
                    if src[i] == c: d += 1
                    elif src[i] == close:
                        d -= 1
                        if d == 0: break
                    i += 1
                i += 1
            continue
        i += 1
    return out


def dispatch_tables(src):
    tabs = []
    for m in re.finditer(r"\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*\{", src):
        lb = m.end() - 1
        rb = match_brace(src, lb)
        mem = top_members(src, lb, rb)
        if len(mem) >= 5:
            tabs.append((m.group(1), mem))
    return tabs


def helpers(src):
    hs = {}
    for m in FUNC_DECL.finditer(src):
        name = m.group(1) or m.group(2)
        b = src.find("{", m.end())
        if b < 0: continue
        hs.setdefault(name, src[b:match_brace(src, b) + 1])
    return hs


def access(seg, hs, depth, seen):
    r, w = set(), set()
    for a in ACC.finditer(seg):
        (w if a.group(3) else r).add(a.group(1))
    if depth > 0:
        for c in set(CALL.findall(seg)):
            if c in hs and c not in seen and c not in SKIP_CALLS:
                seen.add(c)
                r2, w2 = access(hs[c], hs, depth - 1, seen)
                r |= r2; w |= w2
    return r, w


def main(paths, depth=2):
    out = collections.defaultdict(lambda: {"reads": set(), "writes": set(), "via": set()})
    ntab = 0
    for path in paths:
        src = io.open(path, encoding="utf-8", errors="replace").read()
        hs = helpers(src)
        tabs = dispatch_tables(src)
        ntab += sum(len(m) for _, m in tabs)
        for tname, mem in tabs:
            for k, body in mem.items():
                act = k if "." in k else "User." + k
                r, w = access(body, hs, depth, set())
                out[act]["reads"] |= r; out[act]["writes"] |= w; out[act]["via"].add(f"table:{tname}")
        if not tabs:  # 兜底：字面量形态
            hits = list(PROTO.finditer(src))
            for i, m in enumerate(hits):
                end = min(hits[i + 1].start() if i + 1 < len(hits) else len(src), m.end() + 3000)
                r, w = access(src[m.end():end], hs, depth, set())
                out[m.group(1)]["reads"] |= r; out[m.group(1)]["writes"] |= w; out[m.group(1)]["via"].add("literal")
    res = {k: {"reads": sorted(v["reads"] - v["writes"]), "writes": sorted(v["writes"]), "via": sorted(v["via"])}
           for k, v in sorted(out.items()) if v["reads"] or v["writes"]}
    sys.stdout.reconfigure(encoding="utf-8")
    json.dump(res, sys.stdout, ensure_ascii=False, indent=1)
    total = len(out)
    sys.stderr.write(f"\n# {len(res)} 个动作抽到存档读写（共扫到 {total} 个 handler，分派表成员 {ntab}）\n")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--depth=")]
    d = next((int(a.split("=")[1]) for a in sys.argv[1:] if a.startswith("--depth=")), 2)
    main(args, d)
