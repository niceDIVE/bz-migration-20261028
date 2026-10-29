# 附加取数：md 标题行号 / 包内 out\relations.* 的 __meta 与 md5 / out\relations.json 与副本 md5
import json, hashlib, os

md = r"F:\BaoZouyxt\audit-v23\relate-result-20261024\relations.md"
lines = open(md, encoding="utf-8").read().splitlines()
h = [(i + 1, l) for i, l in enumerate(lines) if l.startswith("## 第")]
print("md: '## 第' count=%d  first=line%d  last=line%d" % (len(h), h[0][0], h[-1][0]))
print("md: first line text:", h[0][1])
print("md: last  line text:", h[-1][1])
other = [(i + 1, l) for i, l in enumerate(lines) if l.startswith("## ") and not l.startswith("## 第")]
print("md: other '## ' headings:", [(n, t[:40]) for n, t in other])

def md5(p):
    return hashlib.md5(open(p, "rb").read()).hexdigest()

pairs = [
    ("out\\relations.json (bz-oracle)", r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\out\relations.json"),
    ("relations.json (result copy)", r"F:\BaoZouyxt\audit-v23\relate-result-20261024\relations.json"),
    ("out\\relations.md (bz-oracle)", r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\out\relations.md"),
    ("pack out\\relations.md", r"F:\BaoZouyxt\_incoming\relate-pack-20261024\bz-oracle\out\relations.md"),
    ("pack out\\relations.json", r"F:\BaoZouyxt\_incoming\relate-pack-20261024\bz-oracle\out\relations.json"),
]
for tag, p in pairs:
    if os.path.isfile(p):
        print("%-32s %8d B  %s  %s" % (tag, os.path.getsize(p), md5(p), p))

pk = r"F:\BaoZouyxt\_incoming\relate-pack-20261024\bz-oracle\out\relations.json"
if os.path.isfile(pk):
    j = json.load(open(pk, encoding="utf-8"))
    print("pack relations.json __meta:", json.dumps(j["__meta"], ensure_ascii=False))
