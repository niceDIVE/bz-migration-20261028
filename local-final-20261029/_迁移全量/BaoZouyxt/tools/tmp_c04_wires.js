'use strict';
const fs = require('fs');
const lines = fs.readFileSync('F:/BaoZouyxt/tools/index.js', 'utf8').split('\n');
const keys = ['BIRTHCHILD','EXILE_CHILD','BEGIN_WEDDING','MAKE_LOVE','MARRY_AWARD','RESET_CHILD_FOSTER','ADOPTCHILD','ADD_CHILD_FOSTER','DIVORCENPC','MARRY_NPC_EVENT','CHILD_WASH_EVENT','GIVE_CHILD_NAME','UPGRADE_WIFE_LEVEL','USE_WIFE_PROP','CHOOSE_GIRL_EVENT','PROPOSE_NPC','WHORING_GIRL_EVENT','INVITE_NPC_GETLIKE','CHOOSE_SEX','INVITE_NPC_OPTION','WHORING_EVENT'];
for (const k of keys) {
  const re = new RegExp('\\b' + k + '\\s*:\\s*"([^"]+)"');
  let found = '(HttpConst 未定义)';
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (m) { found = (i + 1) + ': ' + m[1]; break; }
  }
  console.log(k.padEnd(22), found);
}
