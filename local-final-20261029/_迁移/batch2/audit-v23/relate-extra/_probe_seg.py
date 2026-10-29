# -*- coding: utf-8 -*-
import re, sys
sys.stdout.reconfigure(encoding="utf-8")
PROTO = re.compile(r"""['"]((?:User|Game|Battle|Home|Shop|Task|Item|Mail|Guild|School|Rogue|[A-Z][A-Za-z]+)\.[A-Za-z_][A-Za-z0-9_]*)['"]""")
src = open(r"F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js", encoding="utf-8", errors="replace").read()
hits = list(PROTO.finditer(src))
print("字面量命中 %d 处，文件 %d 字符" % (len(hits), len(src)))
for i, m in enumerate(hits):
    end = hits[i+1].start() if i+1 < len(hits) else min(len(src), m.end()+20000)
    seg = src[m.end():end]
    print("  %-28s 行%d  段长=%6d 字符 %s" % (m.group(1), src.count("\n",0,m.start())+1, len(seg),
          "（末位 → 固定 20000 字窗口）" if i+1>=len(hits) else ""))
