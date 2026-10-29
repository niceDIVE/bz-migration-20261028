# -*- coding: utf-8 -*-
import json, io, hashlib
def md5(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for c in iter(lambda: f.read(65536), b""): h.update(c)
    return h.hexdigest()
out = []
for p in [r"F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js",
          r"F:\BaoZouyxt\hotfix-patch\core\bz-handler-impl.js",
          r"F:\BaoZouyxt\hotfix-patch\live\flow.js",
          r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\forge\analysis\extract_rw.py"]:
    out.append(f"{p}\t{md5(p)}\t{__import__('os').path.getmtime(p)}")
a = json.load(io.open(r"F:\BaoZouyxt\audit-v23\relate-verify-r2\rerun_depth3_rw.json", encoding="utf-8"))
b = json.load(io.open(r"F:\BaoZouyxt\audit-v23\relate-verify-r2\rerun_depth3_check_rw.json", encoding="utf-8"))
out.append(f"键集相同: {set(a)==set(b)}")
nd = 0
for k in sorted(set(a) & set(b)):
    if a[k] != b[k]:
        nd += 1
        out.append(f"[{k}]\n  run1 reads={a[k]['reads']} writes={a[k]['writes']}\n  run2 reads={b[k]['reads']} writes={b[k]['writes']}")
out.append(f"值不同键数: {nd}")
with io.open(r"F:\BaoZouyxt\audit-v23\relate-verify-r2\depth3_diff.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
print("ok")
