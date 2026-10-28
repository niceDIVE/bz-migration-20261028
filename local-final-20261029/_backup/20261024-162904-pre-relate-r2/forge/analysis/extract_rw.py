#!/usr/bin/env python3
"""从服务端源码（如 bz-rpc-server.js）粗抽「动作 → 存档键读/写」，喂给 relate.py --rw。

做法（启发式，够排序用，不求精确）：
  找到形如 'User.xxx' / "Mod.method" 的协议名字面量，把它到下一个协议名之间的代码当作该动作的处理段，
  在段里抓 s.KEY / save.KEY：后跟 = / += / -= / ++ / .push( / .splice( / [..] = 记为写，其余记为读。
用法：python3 extract_rw.py bz-rpc-server.js [更多文件...] > rw.json
      python3 relate.py --rw rw.json
"""
import re, sys, json, collections

PROTO = re.compile(r"""['"]((?:User|Game|Battle|Home|Shop|Task|Item|Mail|Guild|School|Rogue|[A-Z][A-Za-z]+)\.[A-Za-z_][A-Za-z0-9_]*)['"]""")
ACC = re.compile(r"\b(?:s|save)\.([A-Za-z_$][\w$]*)((?:\[[^\]]*\])*)\s*(\+\+|--|[+\-*/]?=(?!=)|\.(?:push|splice|pop|shift|unshift)\()?")

out = collections.defaultdict(lambda: {"reads": set(), "writes": set()})
for path in sys.argv[1:]:
    src = open(path, encoding="utf-8", errors="replace").read()
    hits = list(PROTO.finditer(src))
    for i, m in enumerate(hits):
        seg = src[m.end(): hits[i + 1].start() if i + 1 < len(hits) else min(len(src), m.end() + 20000)]
        for a in ACC.finditer(seg):
            (out[m.group(1)]["writes"] if a.group(3) else out[m.group(1)]["reads"]).add(a.group(1))
res = {k: {"reads": sorted(v["reads"] - v["writes"]), "writes": sorted(v["writes"])}
       for k, v in out.items() if v["reads"] or v["writes"]}
json.dump(res, sys.stdout, ensure_ascii=False, indent=1)
print(f"\n# {len(res)} 个动作抽到存档读写", file=sys.stderr)
