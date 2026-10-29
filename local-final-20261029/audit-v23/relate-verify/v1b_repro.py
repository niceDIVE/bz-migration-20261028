# V1 附加：复算 extract_rw.py 的 stdout/stderr（只读输入，输出重定向到 relate-verify 目录）
import hashlib, os, subprocess, sys

inputs = [
    r"F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js",
    r"F:\BaoZouyxt\hotfix-patch\core\bz-handler-impl.js",
    r"F:\BaoZouyxt\hotfix-patch\live\flow.js",
]
for p in inputs:
    if os.path.isfile(p):
        h = hashlib.md5(open(p, "rb").read()).hexdigest()
        print("input %s  %d B  %s" % (h, os.path.getsize(p), p))
    else:
        print("input MISSING %s" % p)

script = r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\forge\analysis\extract_rw.py"
work = r"F:\BaoZouyxt\audit-v23\relate-verify"
out_json = os.path.join(work, "v1_repro_rw.json")
err_txt = os.path.join(work, "v1_repro_stderr.txt")

env = dict(os.environ)
env["PYTHONUTF8"] = "1"
with open(out_json, "wb") as fo, open(err_txt, "wb") as fe:
    r = subprocess.run([sys.executable, script] + inputs, stdout=fo, stderr=fe, cwd=work, env=env)
print("exit code:", r.returncode)
print("stderr bytes:", os.path.getsize(err_txt), "repr:", repr(open(err_txt, "rb").read()))
h_new = hashlib.md5(open(out_json, "rb").read()).hexdigest()
print("repro rw.json md5:", h_new, os.path.getsize(out_json), "B")
print("same as artifact rw.json:", h_new == "221af07f04eb061a2e63467a3a088617")
