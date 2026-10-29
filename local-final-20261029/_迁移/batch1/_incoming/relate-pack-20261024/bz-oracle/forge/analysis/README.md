# 动作关联分析（只用来排序和归型，不设闸门）

    python3 forge/analysis/relate.py                    # 只用客户端读点 + 动作名
    python3 forge/analysis/extract_rw.py bz-rpc-server.js > rw.json
    python3 forge/analysis/relate.py --rw rw.json       # 叠加服务端存档读写，关联会准很多

依赖：pip install networkx
产出：out/relations.md（按批次排好的簇，簇内是建议的写作顺序）；out/relations.json（每个动作最相关的 6 个邻居和关联原因）。

信号：存档读写 > 成对动作名 > 客户端读到的同一字段（按 IDF 降权）> 同一张表 > 动作名里的稀有词。
分簇用 Louvain，seed 固定，可以重复跑。--resolution 调大，簇切得更细。
拿不准的关联也照样保留，只是标成"可能相关"，不会拦住实现。
