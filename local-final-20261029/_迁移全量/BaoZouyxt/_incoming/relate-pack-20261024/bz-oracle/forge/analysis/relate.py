#!/usr/bin/env python3
"""动作关联分析（轻量，不是闸门）。

输入：out/registry.json + out/contracts.json（已有）；可选 --rw rw.json（日后从三包/服务端抽到的
      {action: {"reads": [...], "writes": [...]}}，有就叠加，权重最高）。
输出：out/relations.json（机器用）+ out/relations.md（人看）。

关联信号（权重从高到低）：
  rw     同一存档键：一个写、另一个读或写（需 --rw）
  pair   名字成对：BUY/SALE、BEGIN/END、WEAR/TAKEOFF、ACCEPT/SUBMIT…
  field  应答里客户端读同一个字段（按 IDF 降权，eRet 这种人人都有的几乎不算）
  fk     字段指向同一张表
  token  动作名共享稀有词（MARRY、HOUSE、WEDD…，同样 IDF 降权）
分组：Louvain 社区发现（networkx），seed 固定，可重跑。
"""
import argparse, json, math, re, collections, os, sys
import networkx as nx

SCOPE = {"GEN-READY", "NEEDS-S2", "IMPL-UNJUDGED", "DONE", "NO-CONTRACT"}
GENERIC_FIELDS = {"eRet", "Ret", "ret", "error", "data", "type", "id", "code", "msg", "result"}
STOP_TOKENS = {"USER", "GET", "INFO", "DATA", "LIST", "REQ", "NEW", "THE", "OF", "BY", "TO", "ONE",
               "ALL", "AND", "NUM", "EVENT", "REWARD", "AWARD", "AWARDS", "RECEIVE", "USE", "ITEM", "C2S", "S2C", "STC", "CTS", "MSG", "SET", "DO", "ON", "UPDATE"}
PAIRS = [("BUY", "SALE"), ("BUY", "SELL"), ("BEGIN", "END"), ("START", "END"), ("START", "FINISH"),
         ("START", "STOP"), ("WEAR", "TAKEOFF"), ("WEAR", "TAKE_OFF"), ("EQUIP", "UNEQUIP"),
         ("PUT_ON", "PUT_OFF"), ("ADD", "DEL"), ("ADD", "REMOVE"), ("ACCEPT", "SUBMIT"),
         ("ACCEPT", "FINISH"), ("ACCEPT", "GIVEUP"), ("ACCEPT", "ABANDON"), ("OPEN", "CLOSE"),
         ("LOCK", "UNLOCK"), ("JOIN", "LEAVE"), ("JOIN", "QUIT"), ("ENTER", "EXIT"), ("ENTER", "LEAVE"),
         ("GET", "SET"), ("SAVE", "LOAD"), ("APPLY", "CANCEL"), ("INVITE", "AGREE"), ("PROPOSE", "AGREE"),
         ("LEARN", "FORGET"), ("UP", "DOWN"), ("IN", "OUT"), ("ON", "OFF")]
QUERY_HINT = re.compile(r"(^|_)(GET|INFO|LIST|LOAD|OPEN|QUERY|SHOW|DATA|VIEW|CHECK|REFRESH)(_|$)")
W = {"rw": 4.0, "pair": 3.0, "field": 1.0, "fk": 1.5, "token": 0.6}


PAIR_WORDS = {w for p in PAIRS for x in p for w in x.split("_")}


def tokens(key):
    return [t for t in re.split(r"[_\W]+", key.upper()) if len(t) >= 3 and t not in STOP_TOKENS and t not in PAIR_WORDS and not t.isdigit()]


def idf(df, n):
    return math.log((n + 1) / (df + 0.5))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "..", "out"))
    ap.add_argument("--rw", help="可选：{action:{reads:[],writes:[]}}")
    ap.add_argument("--resolution", type=float, default=1.0)
    ap.add_argument("--min-edge", type=float, default=0.9, help="低于此权重的边丢弃，免得全连成一团")
    a = ap.parse_args()
    out = os.path.abspath(a.out)
    reg = json.load(open(os.path.join(out, "registry.json")))["rows"]
    con = json.load(open(os.path.join(out, "contracts.json")))["contracts"]
    rw = json.load(open(a.rw)) if a.rw else {}

    acts = {}
    for r in reg:
        if r["status"] not in SCOPE:
            continue
        c = con.get(r["contract"]) if r.get("contract") else None
        fields = set(c["fields"]) - GENERIC_FIELDS if c else set()
        fks = {v["fk"]["table"] if isinstance(v.get("fk"), dict) else v["fk"]
               for v in (c["fields"].values() if c else []) if v.get("fk")}
        acts[r["key"]] = {"action": r["action"], "status": r["status"], "fields": fields,
                          "fk": {str(x) for x in fks}, "tok": set(tokens(r["key"])),
                          "rw": rw.get(r["action"]) or rw.get(r["key"]) or {}}
    keys = sorted(acts)
    n = len(keys)

    # 倒排索引 + IDF
    inv = {k: collections.defaultdict(set) for k in ("field", "fk", "token")}
    for k in keys:
        for f in acts[k]["fields"]: inv["field"][f].add(k)
        for f in acts[k]["fk"]: inv["fk"][f].add(k)
        for t in acts[k]["tok"]: inv["token"][t].add(k)
    G = nx.Graph()
    G.add_nodes_from(keys)
    why = collections.defaultdict(list)

    def bump(x, y, w, reason):
        if x == y: return
        e = tuple(sorted((x, y)))
        G.add_edge(*e, weight=G.get_edge_data(*e, {"weight": 0})["weight"] + w)
        why[e].append(reason)

    for kind in ("field", "fk", "token"):
        for feat, mem in inv[kind].items():
            if len(mem) < 2 or len(mem) > max(12, n // 15):  # 太普遍的特征只是噪声
                continue
            w = W[kind] * idf(len(mem), n) / math.log(n)
            ms = sorted(mem)
            for i in range(len(ms)):
                for j in range(i + 1, len(ms)):
                    bump(ms[i], ms[j], w, f"{kind}:{feat}")

    pairs = []
    kset = set(keys)
    for k in keys:
        for x, y in PAIRS:
            pat = re.compile(rf"(^|_){x}(_|$)")
            if pat.search(k):
                other = pat.sub(lambda m: m.group(1) + y + m.group(2), k, count=1)
                if other in kset:
                    pairs.append((k, other)); bump(k, other, W["pair"], f"pair:{x}/{y}")

    if rw:
        wr = collections.defaultdict(set); rd = collections.defaultdict(set)
        for k in keys:
            for s in acts[k]["rw"].get("writes", []): wr[s].add(k)
            for s in acts[k]["rw"].get("reads", []): rd[s].add(k)
        for s, ws in wr.items():
            for x in ws:
                for y in ws | rd.get(s, set()):
                    bump(x, y, W["rw"], f"rw:{s}")

    # 剪弱边
    weak = [(u, v) for u, v, d in G.edges(data=True) if d["weight"] < a.min_edge]
    G.remove_edges_from(weak)
    lone = sorted(k for k in keys if G.degree(k) == 0)
    H = G.subgraph([k for k in keys if G.degree(k) > 0])
    comms = nx.community.louvain_communities(H, weight="weight", resolution=a.resolution, seed=7) if H.number_of_nodes() else []
    comms = sorted((sorted(c) for c in comms), key=len, reverse=True)

    clusters = []
    for i, mem in enumerate(comms, 1):
        feats = collections.Counter()
        for x in mem:
            for y in mem:
                if x < y and G.has_edge(x, y):
                    for r in set(why[(x, y)]): feats[r] += 1
        label = [f for f, _ in feats.most_common(4)]
        # 建议顺序：查询类先（建立状态视图），然后按簇内连接度从高到低（被依赖最多的先做）
        order = sorted(mem, key=lambda k: (0 if QUERY_HINT.search(k) else 1,
                                           -sum(G[k][o]["weight"] for o in G[k] if o in mem), k))
        st = collections.Counter(acts[k]["status"] for k in mem)
        clusters.append({"id": f"C{i:02d}", "size": len(mem), "label": label, "status": dict(st),
                         "order": order, "external": round(sum(G[k][o]["weight"] for k in mem for o in G[k] if o not in mem), 2)})

    # 批次排序：簇越大、对外连接越多越先做；孤立动作最后批量套模板
    clusters.sort(key=lambda c: (-c["size"] - c["external"]))
    for i, c in enumerate(clusters, 1): c["batch"] = i

    res = {"__meta": {"inScope": n, "edges": G.number_of_edges(), "clusters": len(clusters), "lone": len(lone),
                      "pairs": len(pairs), "rwUsed": bool(rw), "weights": W,
                      "note": "只用于归型和排序，不是闸门；无法确定的标为可能相关【推断】"},
           "clusters": clusters, "lone": lone, "pairs": pairs,
           "neighbors": {k: sorted(({"to": o, "w": round(G[k][o]["weight"], 2),
                                     "why": sorted(set(why[tuple(sorted((k, o)))]))[:4]} for o in G[k]),
                                   key=lambda x: -x["w"])[:6] for k in keys if G.degree(k)}}
    json.dump(res, open(os.path.join(out, "relations.json"), "w"), ensure_ascii=False, indent=1)

    md = [f"# 动作关联图\n", f"范围内动作 {n} 个｜关联边 {G.number_of_edges()}｜簇 {len(clusters)}｜孤立 {len(lone)}｜成对 {len(pairs)}｜"
          f"存档读写信号：{'有' if rw else '无（等三包/服务端读写表）'}\n",
          "按批次顺序排列。簇内顺序 = 建议写作顺序（查询类先，连接最多的先）。\n"]
    for c in clusters:
        md.append(f"## 第{c['batch']}批 · {c['id']}（{c['size']} 个）  共享：{'、'.join(c['label']) or '—'}")
        md.append("、".join(c["order"]) + "\n")
    md.append(f"## 孤立动作（{len(lone)} 个，直接套模板批量生成）\n" + "、".join(lone))
    open(os.path.join(out, "relations.md"), "w").write("\n".join(md) + "\n")
    print(json.dumps(res["__meta"], ensure_ascii=False))


if __name__ == "__main__":
    main()
