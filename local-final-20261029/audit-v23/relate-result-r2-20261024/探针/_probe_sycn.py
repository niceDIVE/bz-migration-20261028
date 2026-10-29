# -*- coding: utf-8 -*-
import json, sys
sys.stdout.reconfigure(encoding="utf-8")
reg = json.load(open(r"F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\out\registry.json", encoding="utf-8"))["rows"]
for r in reg:
    if r["action"].lower() in ("user.sycnplayeritemdata","user.sycntask","user.loadgame"):
        print(r["key"], r["action"], r["status"])
