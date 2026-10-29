# 动作关联分析（只管排序和归型，不设闸门）

    python forge/analysis/extract_rw.py bz-rpc-server.js bz-handler-impl.js live/flow.js > rw.json
    python forge/analysis/relate.py --rw rw.json --min-edge 0.9

依赖：networkx。文件统一按 utf-8 读写，不用再设 PYTHONUTF8。
产出：
- out/relations.md：按批次排好的簇，每簇标出所属家族、可信度和共享依据
- out/relations.json：每个动作最相关的 6 个邻居

v2 改动（依据第 1 轮回执）：
- extract_rw 支持 `var H = {裸动作名: function}` 这种分派表写法，会自动补上 User. 前缀；同文件里的 helper 内联两层；字面量兜底的分段上限设为 3000 字符
- rw 权重按"有多少动作碰过这个键"做 IDF：写-写算满分，写-读打 0.6 折，读-读不计。bag、coins 这类枢纽键会自动降权
- 成对规则同时检查 KEY 和协议名（SELL_ITEM 对应 User.saleItem）
- 词干归一（ACHIEVEMENT 归到 ACHIEVE，DAYS 归到 DAY）；剔除泛字段 lv/hp/exp/endTime 等和泛词 UPGRADE/LEVEL 等
- 新增 config/relate-families.json，这是唯一需要人改的地方：
  - families：已知属于同一玩法的动作。同家族互相加边；跨家族的弱连接打 0.25 折
  - links：已知的联动。只影响批次先后，不会把两簇并成一簇
  - notes：附在动作旁边的提醒，比如"做不了结算"
- 每簇标可信度。"弱"表示主要靠名字相似，标签不能当成共享契约
