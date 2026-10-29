(function(){
  try{
    var pn=cc.director.getScene().getChildByName("persistentnode");
    var st=null; for(var i=0;i<pn.children.length;i++) if(pn.children[i].name==="ShowTalentUI") st=pn.children[i];
    if(!st) return "no panel";
    var comp=null, cs=st._components||[];
    for(var k=0;k<cs.length;k++){ var nm=""; try{nm=cs[k].__classname__||(cs[k].constructor&&cs[k].constructor.name)||""}catch(e){}
      if(nm==="ShowTalentUI") comp=cs[k]; }
    if(!comp) return "no comp";
    var out=["attrs="+JSON.stringify(comp._attributeValue)];
    try{ var r=comp.enterClickBtn(); out.push("enterClickBtn -> "+String(r)); }catch(e){ out.push("enterClickBtn ERR "+(e&&e.stack?e.stack:e).toString().slice(0,300)); }
    return out.join("\n");
  }catch(e){ return "ERR "+(e&&e.stack?e.stack:e); }
})()
