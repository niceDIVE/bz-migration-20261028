# V5: 按 extract_rw.py 第 12 行 PROTO 正则 + 第 19-20 行分段规则，对 bz-rpc-server.js 复算
import re

path = r"F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js"
src = open(path, encoding="utf-8", errors="replace").read()

PROTO = re.compile(r"""['"]((?:User|Game|Battle|Home|Shop|Task|Item|Mail|Guild|School|Rogue|[A-Z][A-Za-z]+)\.[A-Za-z_][A-Za-z0-9_]*)['"]""")
print("file:", path)
print("chars:", len(src), " lines:", src.count("\n") + 1)

hits = list(PROTO.finditer(src))
print("PROTO hits:", len(hits))
acts = []
for i, m in enumerate(hits):
    seg = src[m.end(): hits[i + 1].start() if i + 1 < len(hits) else min(len(src), m.end() + 20000)]
    line = src.count("\n", 0, m.start()) + 1
    acts.append(m.group(1))
    print("  [%d] %-32s start=%7d (line %5d) end=%7d  seg_len=%6d  is_last=%s"
          % (i + 1, m.group(1), m.start(), line, m.end(), len(seg), i + 1 == len(hits)))
print("distinct actions:", len(set(acts)), sorted(set(acts)))
for a in sorted(set(acts)):
    print("  count %-32s = %d" % (a, acts.count(a)))
for i, m in enumerate(hits):
    if m.group(1) == "User.CheckBattleResult":
        seg = src[m.end(): hits[i + 1].start() if i + 1 < len(hits) else min(len(src), m.end() + 20000)]
        print("User.CheckBattleResult: hit #%d, m.end()=%d, next hit start=%d, seg_len=%d"
              % (i + 1, m.end(), hits[i + 1].start() if i + 1 < len(hits) else -1, len(seg)))
