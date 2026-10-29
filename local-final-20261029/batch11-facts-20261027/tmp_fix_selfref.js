const fs=require('fs');
// 1) 执行记录：把"自指哈希"改成不写死（包内文档无法记录自身哈希）
const p='batch11-facts-20261027/C10-c10-执行记录.md';
let t=fs.readFileSync(p,'utf8');
t=t.replace('- `_incoming\\下游回执-第11批C10-20261027.zip`：649,433 B，md5 `DB59771DFA7C25E4D9E183DA1EE11F77`，sha256 `5CA995AD…2B10`，73 条目。',
 '- `_incoming\\下游回执-第11批C10-20261027.zip`（74 条目）。⚠ **包内文档不记录本包自身的哈希** —— 最终指纹写在包外的 `HANDOVER-SESSION-2026-10-27-C.md` §0 与 `docs\\EXECUTION.md` 轮 22 追加 2 里。');
t=t.replace('**18/18**。\n- ⚠ 要发的就这一个文件。','**18/18**。\n- ⚠ 要发的就这一个文件。');
fs.writeFileSync(p,t,'utf8');
console.log('执行记录 已改自指哈希');
// 2) 00-转发说明：条目数/体积
const q='_outbox/第11批C10-20261027/00-转发说明.txt';
let s=fs.readFileSync(q,'utf8');
s=s.replace('包里有什么（71 个条目 / 约 2.3 MB）','包里有什么（74 个条目 / 约 2.4 MB）');
s=s.replace('facts\\C1–C11','facts\\C1–C12');
fs.writeFileSync(q,s,'utf8');
console.log('转发说明 已更新条目数');
