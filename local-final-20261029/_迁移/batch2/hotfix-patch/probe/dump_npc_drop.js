/* dump_npc_drop.js —— 只读：把 npc 表的 id → Drop/exp/HP/Attack 紧凑导出到 files/npc_compact.json
 * 用途：打怪掉落入账（npc.Drop → drop 表），这是"下线自动补齐 SpRequire 物品"的前提。
 * 限制：只投影 4 个字段，避免大输出；表本身在内存里（CFMgr.dic.npc），不触发 bundle.load。
 */
(function () {
  var out = { ok: 0 };
  try {
    var R = (typeof window.__require === 'function') ? window.__require : (typeof __require === 'function' ? __require : null);
    if (!R) { out.err = 'no-require'; return JSON.stringify(out); }
    var cfg = R('CFMgr') || R('gameconfigs/CFMgr');
    var npc = cfg && cfg.dic && cfg.dic.npc;
    if (!npc) { out.err = 'no-npc-table'; return JSON.stringify(out); }

    var ids = Object.keys(npc);
    var compact = {};
    var rows = 0;
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var r = npc[id];
      if (!r || typeof r !== 'object') continue;
      compact[id] = {
        d: r.Drop === undefined ? 0 : r.Drop,
        e: r.exp === undefined ? 0 : r.exp,
        h: r.HP === undefined ? 0 : r.HP,
        a: r.Attack === undefined ? 0 : r.Attack,
        t: r.Type === undefined ? 0 : r.Type
      };
      rows++;
    }
    var text = JSON.stringify({ npc: compact });
    var path = '/data/data/com.maple.madherogo/files/npc_compact.json';
    var okWrite = false;
    try { jsb.fileUtils.writeStringToFile(text, path); okWrite = true; } catch (e) { out.writeErr = String(e); }
    out = { ok: 1, tableKeys: ids.length, rows: rows, bytes: text.length, wrote: okWrite, path: path };
    // 附带几个样本，便于主机端核对
    out.sample = {};
    var ss = ['1001', '1003', '1201', '2001'];
    for (var s = 0; s < ss.length; s++) if (compact[ss[s]]) out.sample[ss[s]] = compact[ss[s]];
  } catch (e2) { out.ok = 0; out.err = String(e2 && e2.message || e2); }
  return JSON.stringify(out);
})()
