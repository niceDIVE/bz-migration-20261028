# -*- coding: utf-8 -*-
import io, difflib, sys
a = io.open(r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\rw.json", encoding="utf-8", newline="").read()
b = io.open(r"F:\BaoZouyxt\audit-v23\relate-verify-r2\rerun_rw.json", encoding="utf-8", newline="").read()
la = a.replace("\r\n", "\n").split("\n")
lb = b.replace("\r\n", "\n").split("\n")
out = []
out.append(f"A 行数={len(la)}  复跑行数={len(lb)}")
diff = list(difflib.unified_diff(la, lb, lineterm="", n=1))
out.append(f"diff 行数(含头)={len(diff)}")
out.extend(diff[:120])
# JSON 语义比较
import json
ja = json.loads(a); jb = json.loads(b)
out.append(f"JSON 语义相同: {ja == jb}")
ka, kb = set(ja), set(jb)
out.append(f"A 键数={len(ka)} 复跑键数={len(kb)} 仅A有={sorted(ka-kb)} 仅复跑有={sorted(kb-ka)}")
vd = []
for k in sorted(ka & kb):
    if ja[k] != jb[k]:
        vd.append(k)
        out.append(f"键 {k} 值不同:\n  A   = {json.dumps(ja[k], ensure_ascii=False)}\n  复跑= {json.dumps(jb[k], ensure_ascii=False)}")
out.append(f"共同键中值不同的键数: {len(vd)}")
with io.open(r"F:\BaoZouyxt\audit-v23\relate-verify-r2\rw_diff.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
print("ok")
