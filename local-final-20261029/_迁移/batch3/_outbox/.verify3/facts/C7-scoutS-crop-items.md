# ScoutS: 种子/作物相关 id 在 tbl_item 存在性与名称对照表

## 1. tbl_item.json 表头 cols 与前 2 行原文
- **表头 head** (52列): `["__name__","ID","Condition1","Condition2","Condition3","Condition4","Condition5","Name","Description","Type","BuyPrice","Price","Effect","EquipType","WeaponType","Limit","Property1","Data1","Property2","Data2","Property3","Data3","Property4","Data4","Property5","Data5","BuffSet","equip","equip1","equiplevel","decomposition","remain","canwash","fightcold","cd_public","wq_place","combat_type","fuse","name_add","quality","decompose","save","fightlimit","suicide","fightarray","suitname","weaponFightType","weaponFightSkin","SpecialData","DeleteDate","icon_item","box_condition"]`
- **第 1 行原文 (截断 400 字符)**: `{"ID":1,"Condition1":[],"Condition2":[],"Condition3":[],"Condition4":[],"Condition5":[],"Name":506,"Description":35000,"Type":6,"BuyPrice":0,"Price":0,"Effect":0,"EquipType":0,"WeaponType":0,"Limit":0,"Property1":0,"Data1":0,"Property2":0,"Data2":0,"Property3":0,"Data3":0,"Property4":0,"Data4":0,"Property5":0,"Data5":0,"BuffSet":[],"equip":0,"equip1":0,"equiplevel":0,"decomposition":0,"remain":1,"`
- **第 2 行原文 (截断 400 字符)**: `{"ID":2,"Condition1":[],"Condition2":[],"Condition3":[],"Condition4":[],"Condition5":[],"Name":676,"Description":0,"Type":7,"BuyPrice":0,"Price":0,"Effect":0,"EquipType":0,"WeaponType":0,"Limit":0,"Property1":0,"Data1":0,"Property2":0,"Data2":0,"Property3":0,"Data3":0,"Property4":0,"Data4":0,"Property5":0,"Data5":0,"BuffSet":[],"equip":0,"equip1":0,"equiplevel":0,"decomposition":0,"remain":1,"canw`

## 2. 对照表 (按 id 分组，总独立 id 数: 295 条；受 90 行限长展示前 40 条)
| 列名 | id | 该行 Name | 该行 Type | Effect | 缺失标记 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| seed | 4777 | 2100000 | 2 | 37 |  |
| plant | 32901 | MISSING | MISSING | MISSING | MISSING |
| matureitem | 3901 | 32901 | 2 | 37 |  |
| tenitem | 4808 | 2100031 | 2 | 37 |  |
| fiftyitem | 4837 | 2100060 | 2 | 37 |  |
| hundreditem | 4866 | 2100089 | 2 | 37 |  |
| weed | 6131 | 2101354 | 2 | 37 |  |
| disinsection | 6137 | 2101360 | 2 | 37 |  |
| follow | 6094 | 2101317 | 2 | 37 |  |
| active | 6339 | 2101562 | 2 | 28 |  |
| seed | 4778 | 2100001 | 2 | 37 |  |
| plant | 32902 | MISSING | MISSING | MISSING | MISSING |
| matureitem | 3902 | 32902 | 2 | 37 |  |
| tenitem | 4809 | 2100032 | 2 | 37 |  |
| fiftyitem | 4838 | 2100061 | 2 | 37 |  |
| hundreditem | 4867 | 2100090 | 2 | 37 |  |
| follow | 6095 | 2101318 | 2 | 37 |  |
| seed | 4779 | 2100002 | 2 | 37 |  |
| plant | 32903 | MISSING | MISSING | MISSING | MISSING |
| matureitem | 3903 | 32903 | 2 | 37 |  |
| tenitem | 4810 | 2100033 | 2 | 37 |  |
| fiftyitem | 4839 | 2100062 | 2 | 37 |  |
| hundreditem | 4868 | 2100091 | 2 | 37 |  |
| follow | 6096 | 2101319 | 2 | 37 |  |
| seed | 4780 | 2100003 | 2 | 37 |  |
| plant | 32904 | MISSING | MISSING | MISSING | MISSING |
| matureitem | 3904 | 32904 | 2 | 37 |  |
| tenitem | 4811 | 2100034 | 2 | 37 |  |
| fiftyitem | 4840 | 2100063 | 2 | 37 |  |
| hundreditem | 4869 | 2100092 | 2 | 37 |  |
| follow | 6097 | 2101320 | 2 | 37 |  |
| seed | 4781 | 2100004 | 2 | 37 |  |
| plant | 32905 | MISSING | MISSING | MISSING | MISSING |
| matureitem | 3905 | 32905 | 2 | 37 |  |
| tenitem | 4812 | 2100035 | 2 | 37 |  |
| fiftyitem | 4841 | 2100064 | 2 | 37 |  |
| hundreditem | 4870 | 2100093 | 2 | 37 |  |
| follow | 6098 | 2101321 | 2 | 37 |  |
| seed | 4782 | 2100005 | 2 | 37 |  |
| plant | 32906 | MISSING | MISSING | MISSING | MISSING |
*(超 200 行上限且受总 90 行约束，已输出前 40 条样本，总计 295 个独立 id)*

## 3. 统计：10 个列在 tbl_item 缺失数量 (各 53 行)
- `seed`: 0 / 53 缺失 (存在 53)
- `plant`: 49 / 53 缺失 (存在 4)
- `matureitem`: 0 / 53 缺失 (存在 53)
- `tenitem`: 22 / 53 缺失 (存在 31)
- `fiftyitem`: 22 / 53 缺失 (存在 31)
- `hundreditem`: 22 / 53 缺失 (存在 31)
- `weed`: 0 / 53 缺失 (存在 53)
- `disinsection`: 0 / 53 缺失 (存在 53)
- `follow`: 22 / 53 缺失 (存在 31)
- `active`: 0 / 53 缺失 (存在 53)

## 未验证段
- `plant` 列 49 处 32xxx 编号在 tbl_item 缺失，未验证是否对应其他独立实体表。
- `tenitem` / `fiftyitem` / `hundreditem` / `follow` 缺失的 22 处均为 id=0，未验证是否代表空字段。

## 范围外产出
无