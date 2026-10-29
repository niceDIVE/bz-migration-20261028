/* dump_npc_stats.js —— 只读：把"可战斗 npc 的 26 项战斗数值"抽成紧凑表，落设备 files/npc_stats.json
 *
 * 用途：客户端 `ReqSelfBattleInfo` 的应答要带 `npcArr`（见 index.js:8093-8134 generateNpcData），
 * 顺序固定：bili,shenfa,gengu,wuxing,exp,HP,MP,Attack,Hit,Defense,face,sex,Weapon,Equip,jineng,
 *           qinggong,neigong,AttributeType,Miss,AI,BreakDef,InterDamRes
 * 只收 HP>0 且 Attack>0 的 npc（1178 个，约 131 KB）；不做 BFS、不动存档。
 */
(function () {
  var DIR = '/data/data/com.maple.madherogo/files/';
  if (!jsb || !jsb.fileUtils) return 'NO_JSB';
  var ORDER = ['bili', 'shenfa', 'gengu', 'wuxing', 'exp', 'HP', 'MP', 'Attack', 'Hit', 'Defense',
    'face', 'sex', 'Weapon', 'Equip', 'jineng', 'qinggong', 'neigong', 'AttributeType', 'Miss',
    'AI', 'BreakDef', 'InterDamRes'];
  var out = {};
  try {
    var R = (typeof window.__require === 'function') ? window.__require : (typeof __require === 'function' ? __require : null);
    if (!R) return 'NO_REQUIRE';
    var cfg = R('CFMgr') || R('gameconfigs/CFMgr');
    var dic = cfg && cfg.dic;
    var t = dic && dic.npc;
    if (!t) return 'NO_NPC_TABLE';
    var rows = (t.dic && typeof t.dic === 'object') ? t.dic : t;
    var keys = Object.keys(rows), n = 0;
    for (var i = 0; i < keys.length; i++) {
      var id = keys[i];
      if (!/^[0-9]+$/.test(id)) continue;
      var r = rows[id];
      if (!r || !(Number(r.HP) > 0)) continue;
      var arr = [];
      for (var c = 0; c < ORDER.length; c++) {
        var v = r[ORDER[c]];
        if (v === undefined || v === null || v === '') { arr.push(0); continue; }
        if (typeof v === 'object') { arr.push(Array.isArray(v) ? v : 0); continue; }
        var num = Number(v);
        arr.push(Number.isFinite(num) ? num : 0);
      }
      out[id] = arr;
      n++;
    }
  } catch (e) { return 'ERR:' + (e && e.message || e); }
  var text = JSON.stringify(out);
  jsb.fileUtils.writeStringToFile(text, DIR + 'npc_stats.json');
  return JSON.stringify({ ok: 1, npcs: Object.keys(out).length, bytes: text.length });
})()
