# -*- coding: utf-8 -*-
import json, collections, io, sys
sys.stdout.reconfigure(encoding="utf-8")
reg = json.load(open(r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\out\registry.json", encoding="utf-8"))["rows"]
print("rows", len(reg))
print("status", collections.Counter(r["status"] for r in reg))
print("sample keys:", json.dumps(reg[0], ensure_ascii=False)[:500])
SC = {"GEN-READY","NEEDS-S2","IMPL-UNJUDGED","DONE","NO-CONTRACT"}
inscope=[r for r in reg if r["status"] in SC]
print("inScope", len(inscope))
print("action examples", [r["action"] for r in inscope[:10]])
print("key examples   ", [r["key"] for r in inscope[:10]])
