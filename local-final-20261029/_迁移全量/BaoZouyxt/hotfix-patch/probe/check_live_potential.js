/* check_live_potential.js —— 只读探针：看活客户端的潜能/技能表，验证自检没污染
 * 不用 BFS、不写任何东西；结果是一行 JSON 字符串。
 * 期望：potentials == 账本 potential（98699 之类），hasSkill0 == false
 */
(function () {
  var out = {};
  try {
    var R = window.__require;
    out.hasRequire = (typeof R === 'function');
    var B = R('RoleBaseInfo'); B = B && (B.RoleBaseInfo || B);
    out.potentials = B ? B.potentials : null;
    out.gold = B ? B.gold : null;
    out.coins = B ? B.coins : null;
    var ST = R('SkillTable'); ST = ST && (ST.SkillTable || ST);
    var d = ST && ST.dic;
    if (d) {
      out.hasSkill0 = Object.prototype.hasOwnProperty.call(d, '0');
      out.skill0 = d['0'] || null;
      out.skill1 = d['1'] || null;
      out.skill7 = d['7'] || null;
      out.skill8 = d['8'] || null;
    } else {
      out.dic = 'missing';
    }
    var H = window.__BZ_HARNESS__;
    out.impl = (H && H.impl && H.impl.version) || null;
  } catch (e) { out.err = String(e); }
  return JSON.stringify(out);
})()
