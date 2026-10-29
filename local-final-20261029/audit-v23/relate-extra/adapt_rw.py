# -*- coding: utf-8 -*-
"""补充版抽取器（非本包原件，主审侧为了验证 rw 信号的增益而写，不影响包内原件）。

与包内 extract_rw.py 的唯一差别：不用 `'User.xxx'` 字符串字面量分段，
而是解析 `var H = { action名: function (p) {...} }` 这张分派表本身，
用花括号/字符串/注释配平取出每个 handler 的代码段，再套用同一套 s.KEY / save.KEY 规则。

用法：python adapt_rw.py <bz-rpc-server.js> [...] > rw.v2.json
"""
import json
import re
import sys
import collections

ACC = re.compile(
    r"\b(?:s|save)\.([A-Za-z_$][\w$]*)((?:\[[^\]]*\])*)\s*"
    r"(\+\+|--|[+\-*/]?=(?!=)|\.(?:push|splice|pop|shift|unshift)\()?")
KEY_RE = re.compile(r"[ \t]{2,6}([A-Za-z_$][\w$]*)\s*:\s*(?:async\s+)?function\b")


def scan(src, start_idx, on_key=None, want_end=False):
    """从 start_idx 处的 '{' 做配平扫描；on_key(pos,name) 在深度 0 的换行后遇到 key 时回调。
    want_end=True 时返回 (body_start, body_end)。"""
    n = len(src)
    depth = 0
    i = start_idx
    quote = None
    body_start = None
    while i < n:
        c = src[i]
        if quote:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in "'\"`":
            quote = c
        elif c == "/" and i + 1 < n and src[i + 1] == "/":
            j = src.find("\n", i)
            i = n if j < 0 else j
            continue
        elif c == "/" and i + 1 < n and src[i + 1] == "*":
            j = src.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        elif c == "{":
            depth += 1
            if depth == 1:
                body_start = i + 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return (body_start, i) if want_end else i
        elif c == "\n" and depth == 1 and on_key:
            m = KEY_RE.match(src, i + 1)
            if m:
                on_key(i + 1, m.group(1))
        i += 1
    raise SystemExit("花括号没配平：%s" % start_idx)


def handlers(src):
    m = re.search(r"\bvar\s+H\s*=\s*\{", src)
    if not m:
        raise SystemExit("找不到 var H = {")
    starts = []
    bs, be = scan(src, m.end() - 1, on_key=lambda p, n: starts.append((p, n)), want_end=True)
    body = src[bs:be]
    out = []
    for idx, (off, name) in enumerate(starts):
        end = starts[idx + 1][0] - bs if idx + 1 < len(starts) else len(body)
        out.append((name, body[off - bs:end]))
    return out


def main():
    res = collections.defaultdict(lambda: {"reads": set(), "writes": set()})
    total = 0
    for path in sys.argv[1:]:
        src = open(path, encoding="utf-8", errors="replace").read()
        hs = handlers(src)
        print("# %s -> %d 个 handler" % (path, len(hs)), file=sys.stderr)
        total += len(hs)
        for name, seg in hs:
            act = "User." + name
            for a in ACC.finditer(seg):
                (res[act]["writes"] if a.group(3) else res[act]["reads"]).add(a.group(1))
    out = {k: {"reads": sorted(v["reads"] - v["writes"]), "writes": sorted(v["writes"])}
           for k, v in res.items() if v["reads"] or v["writes"]}
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
    print("\n# %d 个动作抽到存档读写（候选 handler %d 个）" % (len(out), total), file=sys.stderr)


if __name__ == "__main__":
    main()
