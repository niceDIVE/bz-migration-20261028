# V1: rw.json 动作条数 + stderr 原文
import json, hashlib, os

p1 = r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\rw.json"
p2 = r"F:\BaoZouyxt\audit-v23\relate-result-20261024\rw.json"
err = r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\rw.err.txt"

for p in (p1, p2):
    b = open(p, "rb").read()
    print("file:", p)
    print("  bytes:", len(b), "md5:", hashlib.md5(b).hexdigest())
    d = json.loads(b.decode("utf-8"))
    print("  top-level action count:", len(d))
    print("  keys:", list(d.keys()))

b = open(err, "rb").read()
print("rw.err.txt bytes:", len(b))
print("rw.err.txt repr:", repr(b))
print("rw.err.txt text (decoded):", b.decode("utf-8"))
