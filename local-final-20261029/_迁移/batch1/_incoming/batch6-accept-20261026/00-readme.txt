第6批 C04 验收：通过（本包没有代码，只有这一页）

  advDone 改成按 eventID 记账、每天清零，这条有价值：原来按 adventureID 接线，线上一次也匹配不到。
  marryAward 礼金不发、13 个锁死动作返回"条件不满足"，同意。
  39 项形状差异已经审批入库，同意。

  针对第五节两个问题的拍板：

  1 adoptChild / 子女系统
    原服已停服，抓包永远拿不到，以后别再要抓包。
    允许深挖 MarryModel.childData 的全部读点，限时半天：
    · 能推出 childObj 的形状（客户端读到的每个键都有出处）→ 解锁 adoptChild，改为扣元宝，价格定 500。
      先扣钱再写 childObj，元宝不够回 eRet 2。birthChild、giveChildName 顺带一起接。
      洗练、培养、性别这些继续锁着。
    · 半天内推不出来 → 保持锁死，不用再来问。

  2 makeLove 数值效果
    按"能对上已有字段才落地"处理：
    · experience 列 → s.exp（加法）
    · hunger/full 列 → 只有在客户端确实读 s.hunger 时才接，语义照客户端
    · feeling、happiness、judge、*_lover 列 → 没有对应字段，只显示
    makeLove 现在不花钱，为了防止刷经验，每天限 5 次（复用 todayKey），超过回 eRet 2。

  下一步：按 relations.md 的顺序开第 7 批。
  升级报告的条件不变：存档写坏，或者能白拿钱/道具。
