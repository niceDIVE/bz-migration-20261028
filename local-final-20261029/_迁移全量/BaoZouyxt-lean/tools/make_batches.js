const fs = require('fs');
const a = JSON.parse(fs.readFileSync('F:/BaoZouyxt/tools/actions.json', 'utf8'));
const groups = {
  A_task: /Task|Duty|Daily|OnHook|Sign|Welfare|Reward|Online/i,
  B_bag: /Item|Bag|Shop|Market|Sale|Buy|Use|Equip|Box|Store|Trade/i,
  C_fight: /Battle|Fight|Skill|Attr|Level|Kill|Npc|Pvp|PvP|Boss|Monster/i,
  D_world: /Map|Move|Scene|Event|Npc|Home|House|Fish|Dice|Walk|Pos/i,
  E_social: /Friend|Guild|School|Mail|Rank|Team|Chat|Marry|Master|Partner/i,
};
const out = {};
for (const [k, re] of Object.entries(groups)) {
  out[k] = a.actions.filter(x => re.test(x)).slice(0, 20);
}
for (const k of Object.keys(out)) console.log(k, out[k].length, out[k].slice(0,6).join(','));
fs.writeFileSync('F:/BaoZouyxt/tools/batches.json', JSON.stringify(out, null, 1));
