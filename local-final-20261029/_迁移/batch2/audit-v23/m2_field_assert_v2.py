# -*- coding: utf-8 -*-
# R22 回执 ⓪.4：M2 字段级断言 v2（按真实格式解析）
import re, io, os, json

TOOLS = r"F:\BaoZouyxt\tools"
M2 = r"F:\BaoZouyxt\audit-v23\incoming\unpacked\r21\M2-客户端读点索引.md"
OUT = r"F:\BaoZouyxt\audit-v23\R22执行-M2字段断言.md"

m2 = io.open(M2, encoding="utf-8").read()
src_cache = {}
def src_lines(fname):
    if fname not in src_cache:
        src_cache[fname] = io.open(os.path.join(TOOLS, fname), encoding="utf-8", errors="replace").read().split("\n")
    return src_cache[fname]

total = hit = 0
misses = []
blocks = re.split(r"\n### ", m2)
for b in blocks[1:]:
    head = b.split("\n", 1)[0]
    fm = re.search(r"\[tools/([\w.]+)\.js:(\d+)\]", head)
    if not fm:
        continue
    fname = fm.group(1)
    name = head.split("[")[0].strip()
    rest = b[len(head):]
    # 找字段表
    for tbl in re.finditer(r"\|\s*字段\s*\|\s*行号\s*\|.*\n((?:\|.*\n)+)", rest):
        for row in tbl.group(1).split("\n"):
            cells = [c.strip() for c in row.strip().strip("|").split("|")]
            if len(cells) < 2 or cells[0] in ("字段", "") or set(cells[0]) <= set("-: "):
                continue
            field = cells[0].strip("`")
            lm = re.match(r"(\d+)(?:-(\d+))?", cells[1])
            if not lm:
                continue
            a = int(lm.group(1)); bnum = int(lm.group(2)) if lm.group(2) else a
            lines = src_lines(fname + ".js")
            ok = False
            for ln in range(a, min(bnum, len(lines)) + 1):
                text = lines[ln - 1]
                if ("." + field) in text or ('["' + field + '"]') in text or ("['" + field + "']") in text or ('("' + field + '")') in text or ("('" + field + "')") in text:
                    ok = True
                    break
            total += 1
            if ok:
                hit += 1
            else:
                misses.append((name[:40], field, fname, a, bnum))

L = []
L.append("# R22 回执执行 · M2 字段级断言（2026-10-24）\n")
L.append("断言（回执 ⓪.4）：∀(line, field) ∈ M2: 源码第 line 行 ⊇ (\".\"+field | \"[\\\"\"+field+\"\\\"]\")。\n")
L.append("- 断言样本总数：%d" % total)
L.append("- 命中：%d" % hit)
L.append("- 命中率：%.2f%%" % (100.0 * hit / total if total else 0))
L.append("- 未命中 %d 条（低于 100%% 的部分，逐条列出）：\n" % len(misses))
for m in misses:
    L.append("  - `%s` 字段 `%s` @ %s.js:%s" % (m[0], m[1], m[2], m[3] if m[3] == m[4] else "%d-%d" % (m[3], m[4])))
L.append("\n结论：M2 的准确性收窄为——行号锚点 2336/2336 有效（第一期）+ 字段名引用断言 %.2f%%（%d/%d）。未命中条目需人工归因（可能是：字段经由别名变量读取、多行链式取值、或 M2 归因错误）。" % (100.0 * hit / total if total else 0, hit, total))

io.open(OUT, "w", encoding="utf-8").write("\n".join(L))
print("total=%d hit=%d rate=%.2f%% misses=%d" % (total, hit, 100.0 * hit / total if total else 0, len(misses)))
json.dump({"total": total, "hit": hit, "misses": misses}, open(r"F:\BaoZouyxt\audit-v23\m2-field-assert.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
