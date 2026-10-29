# V4: 在 bz-rpc-server.js 里找 "var H = {"，从该 { 起做花括号/字符串/注释配平，
#     只统计深度为 1、形如 ^\s{2,6}([A-Za-z_$][\w$]*)\s*:\s*(?:async\s+)?function 的键
import re, sys

path = r"F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js"
src = open(path, encoding="utf-8", errors="replace").read()
print("file:", path)
print("chars:", len(src))

i = src.find("var H = {")
print('find("var H = {"):', i, " line:", src.count("\n", 0, i) + 1)
if i < 0:
    sys.exit(1)
brace = src.index("{", i)
print("opening brace index:", brace, " line:", src.count("\n", 0, brace) + 1)

n = len(src)
depth_at = [0] * n        # 处理该字符前的深度（相对 H 的 { 内部为 1）
iscode = bytearray(n)     # 1 = 代码字符（非注释/非字符串）
depth = 0
j = brace
prev_sig = ""
end = -1
while j < n:
    c = src[j]
    depth_at[j] = depth
    if c == "/" and j + 1 < n and src[j + 1] == "/":
        k = src.find("\n", j)
        k = n if k < 0 else k
        for t in range(j, k):
            depth_at[t] = depth
        j = k
        continue
    if c == "/" and j + 1 < n and src[j + 1] == "*":
        k = src.find("*/", j + 2)
        k = n if k < 0 else k + 2
        for t in range(j, k):
            depth_at[t] = depth
        j = k
        continue
    if c in "'\"":
        q = c
        iscode[j] = 1
        j += 1
        while j < n:
            depth_at[j] = depth
            if src[j] == "\\":
                j += 2
                continue
            if src[j] == q:
                j += 1
                break
            j += 1
        prev_sig = "str"
        continue
    if c == "`":
        iscode[j] = 1
        j += 1
        while j < n:
            depth_at[j] = depth
            if src[j] == "\\":
                j += 2
                continue
            if src[j] == "`":
                j += 1
                break
            j += 1
        prev_sig = "str"
        continue
    if c == "/" and prev_sig not in ("ident", ")", "]"):
        j += 1
        in_class = False
        while j < n:
            depth_at[j] = depth
            ch = src[j]
            if ch == "\\":
                j += 2
                continue
            if ch == "[":
                in_class = True
            elif ch == "]":
                in_class = False
            elif ch == "/" and not in_class:
                j += 1
                break
            elif ch == "\n":
                break
            j += 1
        while j < n and src[j].isalpha():
            j += 1
        prev_sig = "regex"
        continue
    if c == "{":
        depth += 1
        iscode[j] = 1
    elif c == "}":
        depth -= 1
        iscode[j] = 1
        j += 1
        if depth == 0:
            end = j - 1
            break
        prev_sig = "}"
        continue
    else:
        iscode[j] = 1
        if not c.isspace():
            prev_sig = "ident" if (c.isalnum() or c in "_$") else c
    j += 1

print("matching '}' index:", end, " line:", src.count("\n", 0, end) + 1, " span chars:", end - brace + 1)
print("body lines:", src.count("\n", brace, end))

body = src[brace + 1:end]
KEY = re.compile(r"^\s{2,6}([A-Za-z_$][\w$]*)\s*:\s*(?:async\s+)?function", re.M)
keys = []
skipped = 0
for m in KEY.finditer(body):
    pos = brace + 1 + m.start(1)
    if depth_at[pos] == 1 and iscode[pos]:
        keys.append((m.group(1), src.count("\n", 0, pos) + 1))
    else:
        skipped += 1
print("depth-1 function keys:", len(keys))
print("regex matches rejected by depth/code check:", skipped)
print("first 5 keys:", [k for k, _ in keys[:5]])
print("first 5 keys with line:", keys[:5])
print("last 3 keys with line:", keys[-3:])
print("all keys:", [k for k, _ in keys])
