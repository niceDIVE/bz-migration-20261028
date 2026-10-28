#!/usr/bin/env python3
"""动作关联分析（轻量，不是闸门）。v2.3，2026-10-25，按第 1 批算法意见修改（面板、do 名、可达性、数据表）。

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
    # PowerShell 的 > 会写成 UTF-16（FF FE 开头）；按 BOM 自动识别，省得再踩
    raw = open(p, "rb").read()
    for bom, enc in ((b"\xff\xfe", "utf-16"), (b"\xfe\xff", "utf-16"), (b"\xef\xbb\xbf", "utf-8-sig")):
        if raw.startswith(bom): return json.loads(raw.decode(enc))
    return json.loads(raw.decode("utf-8"))


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
    ap.add_argument("--panel", help="extract_panel.py 的输出；给了才挂「同面板」")
    ap.add_argument("--tables", help="table_link.py 的输出 out/table-links.json；给了才在 actions.tsv 里填数据源和「可能已下线」")
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

    extra = set(cfg.get("includeKeys", []))
    acts = {}
    for r in reg:
        if r["status"] not in SCOPE and r["key"] not in extra: continue
        c = con.get(r["contract"]) if r.get("contract") else None
        cf = c["fields"] if c else {}
        fields = {f for f in cf if f not in GENERIC_FIELDS and len(f) > 2}
        fks = {str(v["fk"].get("table") if isinstance(v.get("fk"), dict) else v["fk"]) for v in cf.values() if v.get("fk")}
        act = r.get("action") or ""
        fam = next((nm for nm, rx in fams if rx.search(r["key"])), None)
        rwv = rw.get(act.lower()) or rw.get(act.split(".")[-1].lower()) or {}
        acts[r["key"]] = {"action": act, "status": r["status"], "fields": fields, "fk": fks,
                          "tok": tokens(r["key"], act), "fam": fam,
                          "sites": sorted({(st["file"], st["line"]) for st in (c["sites"] if c else [])}),
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
    for kind in ("field", "fk", "token"):
        for feat in sorted(inv[kind]):
            mem = inv[kind][feat]
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
    for s in sorted(wr):
        ws = wr[s]
        base = W["rw"] * idf(len(touch[s]), m)
        for x in sorted(ws):
            for y in sorted(touch[s]):
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
    for f in sorted(fam_mem):
        mem = fam_mem[f]
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
    # pinned：已交付/已发指令的批次冻结成员，不参与 Louvain，排在最前面（改 families 不会把已发出的批次打乱）
    pinned = [(p["id"], p.get("name"), [k for k in p["keys"] if k in acts]) for p in cfg.get("pinned", [])]
    pin_set = {k for _, _, ks in pinned for k in ks}
    lone = sorted(k for k in keys if G.degree(k) == 0 and k not in pin_set)
    H = G.subgraph([k for k in keys if G.degree(k) > 0 and k not in pin_set])
    # networkx 的 Louvain 内部用 set 存节点，字符串节点的遍历顺序随 PYTHONHASHSEED 变；换成整数节点就稳定了
    idx = {k: i for i, k in enumerate(sorted(H.nodes))}
    back = {i: k for k, i in idx.items()}
    HI = nx.Graph(); HI.add_nodes_from(range(len(idx)))
    HI.add_weighted_edges_from(sorted((idx[u], idx[v], d["weight"]) for u, v, d in H.edges(data=True)))
    comms = [{back[i] for i in c} for c in nx.community.louvain_communities(HI, weight="weight", resolution=a.resolution, seed=7)] if HI.number_of_nodes() else []
    comms = sorted((sorted(c) for c in comms), key=lambda c: (-len(c), c[0]))
    pin_ids = [pid for pid, _, _ in pinned]
    free_ids = (f"C{i:02d}" for i in range(1, 1000) if f"C{i:02d}" not in pin_ids)
    named = [(pid, ks) for pid, _, ks in pinned] + [(next(free_ids), c) for c in comms]
    where = {}
    clusters = []
    for cid, mem in named:
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
        order = list(mem) if cid in pin_ids else sorted(mem, key=lambda k: (0 if acts[k]["writes"] and not QUERY_HINT.search(k) else
                                           (1 if QUERY_HINT.search(k) else 2),
                                           -sum(G[k][o]["weight"] for o in G[k] if o in ms), k))
        fam_c = collections.Counter(acts[k]["fam"] for k in mem if acts[k]["fam"])
        clusters.append({"id": cid, "size": len(mem), "label": [f for f, _ in feats.most_common(4)], "confidence": conf,
                         "family": next((nm for pid, nm, _ in pinned if pid == cid), None) or (fam_c.most_common(1)[0][0] if fam_c else None),
                         "pinned": cid in pin_ids,
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
    D.remove_nodes_from(pin_ids)
    seq = [p for p in pin_ids if p in cl_by] + list(nx.lexicographical_topological_sort(D, key=rank))
    clusters = [cl_by[c] for c in seq]
    for i, c in enumerate(clusters, 1): c["batch"] = i

    # 同面板附带：孤立动作如果和某个簇成员出自同一个客户端脚本（extract_panel.py 产出的 panel.json），
    # 就挂到那一批"顺手一起做"。只附带、不进图，不影响分簇。
    # 来由：第 1 批回执——GetMarketList / GetMountsList 不写档、所以孤立，结果 C01 做完了商店还是点不开。
    # 挂了太多动作的脚本（网络层、总注册表）不算面板，阈值 panelCap。
    panel_raw = jload(a.panel) if a.panel else {}
    if "actions" in panel_raw:  # v2 格式
        pinfo = panel_raw["actions"]
        panel_raw = {act: v.get("panels", []) for act, v in pinfo.items()}
    else:
        pinfo = {act: {"panels": v} for act, v in panel_raw.items()}
    pcap = cfg.get("panelCap", 12)
    pan = {k: set(panel_raw.get(acts[k]["action"], [])) for k in keys}
    pcount = collections.Counter(p for k in keys for p in pan[k])
    netp = sorted(p for p, c in pcount.items() if c > pcap)
    for k in keys: pan[k] = {p for p in pan[k] if pcount[p] <= pcap}
    batch_of = {m: c for c in clusters for m in c["order"]}
    for c in clusters: c["panel"], c["panelSee"] = [], []
    attached = []

    # 「必做」只给名字像拉数据的动作（KEY 或 do 名以 get/load/query/check 开头、带 Data/List/Info）。
    # v2.3 曾把「不写档」也算进来，可 rw 只覆盖 32 个动作，结果 143 个里 142 个都成了必做（第 2 批回执）。
    DO_QUERY = re.compile(r"^(get|load|query|check|req\w*(Data|List|Info)|\w*(Data|List|Info)$)")
    def is_query(k):
        return bool(QUERY_HINT.search(k)) or bool(DO_QUERY.search(acts[k]["action"].split(".")[-1]))
    # 孤立动作：和哪个簇共享面板最多就挂哪批。读货架/拉数据的标「必做」——不做面板就打不开（第 1 批回执问题 1）。
    for k in lone:
        if not pan[k]: continue
        best = None
        for c in clusters:
            share = sorted(p for m in c["order"] for p in pan[m] & pan[k])
            if share and (best is None or len(share) > best[0]): best = (len(share), c, share[0])
        if best:
            best[1]["panel"].append({"key": k, "via": best[2], "must": is_query(k)}); attached.append(k)
    # 已在别批的同面板动作：只提示，不搬家（getGrowupData 在 C67 之外这类情况）
    for c in clusters:
        mine = set(c["order"]); ps = {p for m in mine for p in pan[m]}
        see = sorted({(o, batch_of[o]["batch"], p) for p in ps for o in keys
                      if p in pan[o] and o not in mine and o in batch_of}, key=lambda x: (x[1], x[0]))
        seen = set()
        for o, b, p in see:
            if o in seen: continue
            seen.add(o); c["panelSee"].append({"key": o, "batch": b, "via": p})
    for c in clusters: c["panel"].sort(key=lambda x: (not x["must"], x["via"], x["key"]))

    # 可达性（问题 5）：客户端会发这个请求 = 可达；只有回调没有发送点 = 推送或不可达。表全部过期 = 可能已下线【推断】
    tl = jload(a.tables) if a.tables else {}
    tl_act = tl.get("actions", {})
    reach = {}
    for k in keys:
        r = next((x for x in reg if x["key"] == k), {})
        m1 = r.get("m1", {})
        if tl_act.get(acts[k]["action"], {}).get("expired"): reach[k] = "可能已下线"
        elif m1.get("send", 0) > 0 or pan[k]: reach[k] = "可达"
        elif m1.get("on", 0) > 0: reach[k] = "客户端不发"
        else: reach[k] = "未知"

    notes = {k: v for k, v in cfg.get("notes", {}).items() if k in kset}
    meta = {"inScope": n, "edges": G.number_of_edges(), "clusters": len(clusters), "lone": len(lone),
            "pairs": len(pairs), "rwActions": len(rwacts), "families": {f: len(v) for f, v in fam_mem.items()},
            "weights": W, "version": "relate v2.3", "included": sorted(extra & set(keys)), "panelAttached": len(attached), "panelMust": sum(1 for c in clusters for x in c["panel"] if x["must"]),
            "netScripts": netp[:20], "reach": dict(collections.Counter(reach.values())),
            "note": "只用于归型和排序，不是闸门；拿不准的关联标为「可能相关」【推断】"}
    res = {"__meta": meta, "clusters": clusters, "lone": lone, "pairs": sorted(pairs), "deps": dep_notes, "notes": notes,
           "neighbors": {k: sorted(({"to": o, "w": round(G[k][o]["weight"], 2),
                                     "why": [r for r, _ in why[tuple(sorted((k, o)))].most_common(3)]} for o in G[k]),
                                   key=lambda x: -x["w"])[:6] for k in keys if G.degree(k)}}
    with io.open(os.path.join(out, "relations.json"), "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)

    md = ["# 动作关联图（relate v2.3）\n",
          f"范围内 {n} 个动作｜边 {G.number_of_edges()}｜簇 {len(clusters)}｜孤立 {len(lone)}｜成对 {len(pairs)}｜"
          f"有存档读写的动作 {len(rwacts)}\n",
          "按批次顺序排列。簇内顺序就是建议的写作顺序：先写会写档的，再写查询，最后写其余的。"
          "可信度为「弱」的簇，标签只是名字相似，别当成共享契约来看。\n"]
    if dep_notes: md.append("**已知联动（影响先后）**：" + "；".join(dep_notes) + "\n")
    for c in clusters:
        fam = f"〔{c['family']}〕" if c["family"] else ""
        md.append(f"## 第{c['batch']}批 · {c['id']}{fam}{'【冻结】' if c.get('pinned') else ''}（{c['size']} 个，可信度{c['confidence']}）  共享：{'、'.join(c['label']) or '—'}")
        md.append("、".join(k + (f"⚠{notes[k]}" if k in notes else "") for k in c["order"]) + "\n")
        must = [x for x in c["panel"] if x["must"]]; extra_ = [x for x in c["panel"] if not x["must"]]
        if must:
            md.append("**同面板必做**（拉货架/拉数据，不做面板打不开）：" + "、".join(f"{x['key']}（{x['via']}）" for x in must) + "\n")
        if extra_:
            md.append("同面板顺手做：" + "、".join(f"{x['key']}（{x['via']}）" for x in extra_) + "\n")
        if c["panelSee"]:
            md.append("同面板另见（在别的批次，做本批时一起测）：" + "、".join(f"{x['key']}（第{x['batch']}批，{x['via']}）" for x in c["panelSee"][:12]) + "\n")
        bad = [k for k in c["order"] if reach[k] != "可达"]
        if bad:
            md.append("可达性存疑（可以沉底）：" + "、".join(f"{k}（{reach[k]}）" for k in bad) + "\n")
    rest = [k for k in lone if k not in set(attached)]
    md.append(f"## 孤立动作（{len(rest)} 个，另有 {len(attached)} 个已挂到各批「同面板」，直接套模板批量生成）\n" + "、".join(rest))
    with io.open(os.path.join(out, "relations.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")
    # actions.tsv（问题 6）：动作名、do 名、常量行号并列，核对一律以 do 名为准
    rows = ["KEY\tdo名\t常量定义行\t状态\t批次\t簇\t可达性\t面板\t可能的数据表"]
    batch_k = {m: (c["batch"], c["id"]) for c in clusters for m in c["order"]}
    for c in clusters:
        for x in c["panel"]: batch_k.setdefault(x["key"], (c["batch"], c["id"] + "·同面板"))
    for k in sorted(keys, key=lambda k: (batch_k.get(k, (999, ""))[0], k)):
        b, cid = batch_k.get(k, ("", "孤立"))
        act = acts[k]["action"]
        tabs = ",".join(t["table"] for t in tl_act.get(act, {}).get("tables", [])[:3])
        rows.append("\t".join(map(str, [k, act, pinfo.get(act, {}).get("constAt", ""), acts[k]["status"], b, cid,
                                         reach[k], ",".join(sorted(pan[k])), tabs])))
    with io.open(os.path.join(out, "actions.tsv"), "w", encoding="utf-8") as f:
        f.write("\n".join(rows) + "\n")
    print(json.dumps({k: meta[k] for k in ("inScope", "edges", "clusters", "lone", "pairs", "rwActions", "panelAttached",
                                           "panelMust", "reach")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
