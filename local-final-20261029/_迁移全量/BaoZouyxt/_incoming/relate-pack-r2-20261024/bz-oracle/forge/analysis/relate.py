#!/usr/bin/env python3
"""动作关联分析（轻量，不是闸门）。v2，2026-10-24，按第 1 轮回执修改。

输入：out/registry.json、out/contracts.json；可选 --rw rw.json（由 extract_rw.py 产出）；
      config/relate-families.json（可手改的玩法知识：家族、联动、提醒）。
输出：out/relations.json（机器用）、out/relations.md（人看）。

关联信号：
  rw      存档键：写-写算满分，写-读算 0.6，读-读不算；按触碰该键的动作数做 IDF 降权（bag、coins 这类枢纽键会自动变弱）
  family  配置里声明的同一玩法
  pair    成对：BUY/SELL、BEGIN/END……，动作 KEY 和协议名（User.saleItem）两边都查，带别名
  field   客户端读同一个应答字段（IDF；lv、hp、exp 这类泛字段剔除）
  fk      字段指向同一张表
  token   动作名共享稀有词（做过词干归一：ACHIEVEMENT→ACHIEVE，DAYS→DAY）
跨家族的边乘以 crossFamilyDamp，避免两个已知玩法被一个泛字段粘在一起。
分簇：Louvain（seed=7）。批次排序：先满足 links 依赖，再看簇大小和外部连接。
"""
import argparse, json, math, re, collections, os, io
import networkx as nx

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SCOPE = {"GEN-READY", "NEEDS-S2", "IMPL-UNJUDGED", "DONE", "NO-CONTRACT"}
GENERIC_FIELDS = {"eRet", "Ret", "ret", "error", "data", "type", "id", "code", "msg", "result", "lv", "level", "hp",
                  "mp", "exp", "flag", "num", "count", "time", "serverTime", "endTime", "sTime", "state", "status",
                  "list", "info", "index", "idx", "note"}
STOP_TOKENS = {"USER", "GET", "INFO", "DATA", "LIST", "REQ", "NEW", "THE", "OF", "BY", "TO", "ONE", "ALL", "AND",
               "NUM", "EVENT", "REWARD", "AWARD", "RECEIVE", "USE", "ITEM", "C2S", "S2C", "STC", "CTS", "MSG",
               "SET", "DO", "ON", "UPDATE", "UPGRADE", "LEVEL", "RESET", "REFRESH", "CHECK", "KEY", "QUICK",
               "TIMES", "SERVER", "NPC", "LOOK", "CHOOSE", "SELECT"}
PAIRS = [("BUY", "SELL"), ("BUY", "SALE"), ("BEGIN", "END"), ("START", "END"), ("START", "FINISH"),
         ("START", "STOP"), ("BEGIN", "STOP"), ("WEAR", "TAKEOFF"), ("WEAR", "TAKE_OFF"), ("EQUIP", "UNEQUIP"),
         ("PUT_ON", "PUT_OFF"), ("ADD", "DEL"), ("ADD", "REMOVE"), ("ACCEPT", "SUBMIT"), ("ACCEPT", "FINISH"),
         ("ACCEPT", "GIVEUP"), ("ACCEPT", "ABANDON"), ("OPEN", "CLOSE"), ("LOCK", "UNLOCK"), ("JOIN", "LEAVE"),
         ("JOIN", "QUIT"), ("ENTER", "EXIT"), ("ENTER", "LEAVE"), ("GET", "SET"), ("SAVE", "LOAD"),
         ("APPLY", "CANCEL"), ("INVITE", "AGREE"), ("PROPOSE", "AGREE"), ("LEARN", "FORGET"), ("PUSH", "POP"),
         ("MARRY", "DIVORCE"), ("UP", "DOWN"), ("ON", "OFF")]
PAIR_WORDS = {w for p in PAIRS for x in p for w in x.split("_")}
QUERY_HINT = re.compile(r"(^|_)(GET|INFO|LIST|LOAD|OPEN|QUERY|SHOW|DATA|VIEW|CHECK|LOOK)(_|$)")
W = {"rw": 4.0, "family": 2.0, "pair": 3.0, "field": 1.0, "fk": 1.5, "token": 0.6, "link": 0.5}


def jload(p):
    return json.load(io.open(p, encoding="utf-8"))


def stem(t):
    for suf in ("MENT", "ING"):
        if t.endswith(suf) and len(t) - len(suf) >= 4: return t[:-len(suf)]
    if t.endswith("S") and not t.endswith("SS") and len(t) >= 5: return t[:-1]
    return t


def camel_words(action):
    name = (action or "").split(".")[-1]
    return [w.upper() for w in re.findall(r"[A-Z]?[a-z]+|[A-Z]+(?![a-z])|\d+", name)]


def tokens(key, action):
    raw = re.split(r"[_\W]+", key.upper()) + camel_words(action)
    return {stem(t) for t in raw if len(t) >= 3 and not t.isdigit() and t not in STOP_TOKENS and t not in PAIR_WORDS}


def idf(df, n):
    return math.log((n + 1) / (df + 0.5)) / math.log(n + 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "out"))
    ap.add_argument("--rw")
    ap.add_argument("--config", default=os.path.join(ROOT, "config", "relate-families.json"))
    ap.add_argument("--resolution", type=float, default=1.0)
    ap.add_argument("--min-edge", type=float, default=0.25)
    a = ap.parse_args()
    out = os.path.abspath(a.out)
    reg = jload(os.path.join(out, "registry.json"))["rows"]
    con = jload(os.path.join(out, "contracts.json"))["contracts"]
    cfg = jload(a.config) if os.path.exists(a.config) else {}
    rw_raw = jload(a.rw) if a.rw else {}
    rw = {k.lower(): v for k, v in rw_raw.items()}
    rw.update({k.split(".")[-1].lower(): v for k, v in rw_raw.items()})
    W["family"] = cfg.get("familyWeight", W["family"])
    damp = cfg.get("crossFamilyDamp", 0.25)
    fams = [(name, re.compile(f["match"])) for name, f in cfg.get("families", {}).items()]

    acts = {}
    for r in reg:
        if r["status"] not in SCOPE: continue
        c = con.get(r["contract"]) if r.get("contract") else None
        cf = c["fields"] if c else {}
        fields = {f for f in cf if f not in GENERIC_FIELDS and len(f) > 2}
        fks = {str(v["fk"].get("table") if isinstance(v.get("fk"), dict) else v["fk"]) for v in cf.values() if v.get("fk")}
        act = r.get("action") or ""
        fam = next((nm for nm, rx in fams if rx.search(r["key"])), None)
        rwv = rw.get(act.lower()) or rw.get(act.split(".")[-1].lower()) or {}
        acts[r["key"]] = {"action": act, "status": r["status"], "fields": fields, "fk": fks,
                          "tok": tokens(r["key"], act), "fam": fam,
                          "reads": set(rwv.get("reads", [])), "writes": set(rwv.get("writes", []))}
    keys = sorted(acts)
    n = len(keys)
    G = nx.Graph(); G.add_nodes_from(keys)
    why = collections.defaultdict(collections.Counter)

    def bump(x, y, w, reason):
        if x == y or w <= 0: return
        e = tuple(sorted((x, y)))
        G.add_edge(*e, weight=G.get_edge_data(*e, {"weight": 0})["weight"] + w)
        why[e][reason] += w

    # field / fk / token
    inv = {k: collections.defaultdict(set) for k in ("field", "fk", "token")}
    for k in keys:
        for f in acts[k]["fields"]: inv["field"][f].add(k)
        for f in acts[k]["fk"]: inv["fk"][f].add(k)
        for t in acts[k]["tok"]: inv["token"][t].add(k)
    for kind, idx in inv.items():
        for feat, mem in idx.items():
            if len(mem) < 2 or len(mem) > max(12, n // 15): continue
            w = W[kind] * idf(len(mem), n)
            ms = sorted(mem)
            for i in range(len(ms)):
                for j in range(i + 1, len(ms)): bump(ms[i], ms[j], w, f"{kind}:{feat}")

    # rw：IDF 以「有 rw 的动作数」为分母
    rwacts = [k for k in keys if acts[k]["reads"] or acts[k]["writes"]]
    m = max(len(rwacts), 2)
    touch = collections.defaultdict(set); wr = collections.defaultdict(set)
    for k in rwacts:
        for s in acts[k]["writes"]: wr[s].add(k); touch[s].add(k)
        for s in acts[k]["reads"]: touch[s].add(k)
    for s, ws in wr.items():
        base = W["rw"] * idf(len(touch[s]), m)
        for x in ws:
            for y in touch[s]:
                if x < y or y not in ws:
                    bump(x, y, base * (1.0 if y in ws else 0.6), f"rw:{s}")

    # pair：KEY 和协议名两边查
    pairs = set(); kset = set(keys)
    by_act = collections.defaultdict(list)
    for k in keys: by_act["_".join(camel_words(acts[k]["action"]))].append(k)
    for k in keys:
        aname = "_".join(camel_words(acts[k]["action"]))
        for x, y in PAIRS:
            for src_name, lookup in ((k, lambda o: [o] if o in kset else []), (aname, lambda o: by_act.get(o, []))):
                pat = re.compile(rf"(^|_){x}(_|$)")
                if pat.search(src_name):
                    other = pat.sub(lambda mm: mm.group(1) + y + mm.group(2), src_name, count=1)
                    for o in lookup(other):
                        if o != k and tuple(sorted((k, o))) not in pairs:
                            pairs.add(tuple(sorted((k, o)))); bump(k, o, W["pair"], f"pair:{x}/{y}")

    # family
    fam_mem = collections.defaultdict(list)
    for k in keys:
        if acts[k]["fam"]: fam_mem[acts[k]["fam"]].append(k)
    for f, mem in fam_mem.items():
        for i in range(len(mem)):
            for j in range(i + 1, len(mem)): bump(mem[i], mem[j], W["family"], f"family:{f}")

    # 跨家族削弱
    for u, v, d in list(G.edges(data=True)):
        fu, fv = acts[u]["fam"], acts[v]["fam"]
        if fu and fv and fu != fv: d["weight"] *= damp

    # links：轻边 + 依赖
    deps = []
    for x, y, why_s in cfg.get("links", []):
        if x in kset and y in kset:
            bump(x, y, W["link"], "link"); deps.append((x, y, why_s))

    G.remove_edges_from([(u, v) for u, v, d in G.edges(data=True) if d["weight"] < a.min_edge])
    lone = sorted(k for k in keys if G.degree(k) == 0)
    H = G.subgraph([k for k in keys if G.degree(k) > 0])
    comms = nx.community.louvain_communities(H, weight="weight", resolution=a.resolution, seed=7) if H.number_of_nodes() else []
    comms = sorted((sorted(c) for c in comms), key=lambda c: (-len(c), c[0]))
    where = {}
    clusters = []
    for i, mem in enumerate(comms, 1):
        cid = f"C{i:02d}"
        for k in mem: where[k] = cid
        feats = collections.Counter(); kinds = collections.Counter()
        ms = set(mem)
        for x in mem:
            for y in G[x]:
                if y in ms and x < y:
                    for r, w in why[(x, y)].items():
                        feats[r] += w; kinds[r.split(":")[0]] += w
        tot = sum(kinds.values()) or 1
        conf = "强" if (kinds["rw"] + kinds["pair"] + kinds["family"] + kinds["fk"]) / tot >= 0.5 else (
            "中" if kinds["field"] / tot >= 0.3 else "弱（主要靠名字相似）")
        order = sorted(mem, key=lambda k: (0 if acts[k]["writes"] and not QUERY_HINT.search(k) else
                                           (1 if QUERY_HINT.search(k) else 2),
                                           -sum(G[k][o]["weight"] for o in G[k] if o in ms), k))
        fam_c = collections.Counter(acts[k]["fam"] for k in mem if acts[k]["fam"])
        clusters.append({"id": cid, "size": len(mem), "label": [f for f, _ in feats.most_common(4)], "confidence": conf,
                         "family": fam_c.most_common(1)[0][0] if fam_c else None,
                         "status": dict(collections.Counter(acts[k]["status"] for k in mem)), "order": order,
                         "external": round(sum(G[k][o]["weight"] for k in mem for o in G[k] if o not in ms), 2)})

    # 批次：先按依赖拓扑（被依赖的簇在前），同层按大小+外部连接
    cl_by = {c["id"]: c for c in clusters}
    D = nx.DiGraph(); D.add_nodes_from(cl_by)
    dep_notes = []
    for x, y, s in deps:
        cx, cy = where.get(x), where.get(y)
        if cx and cy and cx != cy:
            D.add_edge(cy, cx); dep_notes.append(f"{cx}（{x}）在 {cy}（{y}）之后：{s}")
        else:
            dep_notes.append(f"{x} → {y}：{s}（同簇或有一方孤立）")
    if not nx.is_directed_acyclic_graph(D): D = nx.DiGraph(); D.add_nodes_from(cl_by)
    rank = lambda cid: (-cl_by[cid]["size"] - cl_by[cid]["external"], cid)
    seq = list(nx.lexicographical_topological_sort(D, key=rank))
    clusters = [cl_by[c] for c in seq]
    for i, c in enumerate(clusters, 1): c["batch"] = i

    notes = {k: v for k, v in cfg.get("notes", {}).items() if k in kset}
    meta = {"inScope": n, "edges": G.number_of_edges(), "clusters": len(clusters), "lone": len(lone),
            "pairs": len(pairs), "rwActions": len(rwacts), "families": {f: len(v) for f, v in fam_mem.items()},
            "weights": W, "version": "relate v2",
            "note": "只用于归型和排序，不是闸门；拿不准的关联标为「可能相关」【推断】"}
    res = {"__meta": meta, "clusters": clusters, "lone": lone, "pairs": sorted(pairs), "deps": dep_notes, "notes": notes,
           "neighbors": {k: sorted(({"to": o, "w": round(G[k][o]["weight"], 2),
                                     "why": [r for r, _ in why[tuple(sorted((k, o)))].most_common(3)]} for o in G[k]),
                                   key=lambda x: -x["w"])[:6] for k in keys if G.degree(k)}}
    with io.open(os.path.join(out, "relations.json"), "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)

    md = ["# 动作关联图（relate v2）\n",
          f"范围内 {n} 个动作｜边 {G.number_of_edges()}｜簇 {len(clusters)}｜孤立 {len(lone)}｜成对 {len(pairs)}｜"
          f"有存档读写的动作 {len(rwacts)}\n",
          "按批次顺序排列。簇内顺序就是建议的写作顺序：先写会写档的，再写查询，最后写其余的。"
          "可信度为「弱」的簇，标签只是名字相似，别当成共享契约来看。\n"]
    if dep_notes: md.append("**已知联动（影响先后）**：" + "；".join(dep_notes) + "\n")
    for c in clusters:
        fam = f"〔{c['family']}〕" if c["family"] else ""
        md.append(f"## 第{c['batch']}批 · {c['id']}{fam}（{c['size']} 个，可信度{c['confidence']}）  共享：{'、'.join(c['label']) or '—'}")
        md.append("、".join(k + (f"⚠{notes[k]}" if k in notes else "") for k in c["order"]) + "\n")
    md.append(f"## 孤立动作（{len(lone)} 个，直接套模板批量生成）\n" + "、".join(lone))
    with io.open(os.path.join(out, "relations.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")
    print(json.dumps({k: meta[k] for k in ("inScope", "edges", "clusters", "lone", "pairs", "rwActions")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
