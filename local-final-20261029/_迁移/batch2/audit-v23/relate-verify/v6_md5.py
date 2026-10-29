# V6: md5 三组比对
import hashlib, os

A = r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\forge\analysis"
B = r"F:\BaoZouyxt\_incoming\relate-pack-20261024\bz-oracle\forge\analysis"
C1 = r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\out\relations.md"
C2 = r"F:\BaoZouyxt\audit-v23\relate-result-20261024\relations.md"

def md5(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

print("=== a) %s ===" % A)
if os.path.isdir(A):
    print("dir listing:", sorted(os.listdir(A)))
else:
    print("MISSING DIR")
print("=== b) %s ===" % B)
if os.path.isdir(B):
    print("dir listing:", sorted(os.listdir(B)))
else:
    print("MISSING DIR")

print("\n-- per-file --")
for name in ("README.md", "extract_rw.py", "relate.py"):
    pa = os.path.join(A, name)
    pb = os.path.join(B, name)
    for tag, p in (("a", pa), ("b", pb)):
        if os.path.isfile(p):
            print("%s %-14s %s  %8d B  %s" % (tag, name, md5(p), os.path.getsize(p), p))
        else:
            print("%s %-14s MISSING  %s" % (tag, name, p))
    if os.path.isfile(pa) and os.path.isfile(pb):
        print("   -> %s identical: %s" % (name, md5(pa) == md5(pb)))
    print()

print("-- c) relations.md --")
for tag, p in (("a", C1), ("b", C2)):
    print("%s %s  %8d B  %s" % (tag, md5(p), os.path.getsize(p), p))
print("   -> identical:", md5(C1) == md5(C2))
