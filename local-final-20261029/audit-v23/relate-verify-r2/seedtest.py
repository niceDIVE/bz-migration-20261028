# -*- coding: utf-8 -*-
import subprocess, sys, os, hashlib
EXE = sys.executable
SCRIPT = r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\forge\analysis\extract_rw.py"
SRCS = [r"F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js",
        r"F:\BaoZouyxt\hotfix-patch\core\bz-handler-impl.js",
        r"F:\BaoZouyxt\hotfix-patch\live\flow.js"]
def md5f(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for c in iter(lambda: f.read(65536), b""): h.update(c)
    return h.hexdigest()
res = []
for seed in ("0", "1"):
    for i in (1, 2):
        outp = rf"F:\BaoZouyxt\audit-v23\relate-verify-r2\seed{seed}_run{i}_rw.json"
        errp = rf"F:\BaoZouyxt\audit-v23\relate-verify-r2\seed{seed}_run{i}_rw.err.txt"
        env = dict(os.environ); env["PYTHONHASHSEED"] = seed
        with open(outp, "wb") as fo, open(errp, "wb") as fe:
            rc = subprocess.call([EXE, SCRIPT] + SRCS, stdout=fo, stderr=fe, env=env)
        res.append(f"seed={seed} run={i} rc={rc} md5={md5f(outp)}")
with open(r"F:\BaoZouyxt\audit-v23\relate-verify-r2\seedtest.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(res))
print("ok")
