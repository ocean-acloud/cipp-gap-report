(function(){
  "use strict";
  var MINE=[], rows=[], catalogText="", view="perm", sel=-1, fnF="all", fnLimit=200;
  var URLS=["https://raw.githubusercontent.com/Queensland-Computers/cipp-permissions-mapper/master/data/permissions-catalog.csv"];
  var $=function(id){return document.getElementById(id)};
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  var ICON={None:"\u2715",Read:"\u25D0",ReadWrite:"\u2713"};
  var LABEL={None:"No access",Read:"Read only",ReadWrite:"Full access"};
  var tt;function toast(m){var t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(tt);tt=setTimeout(function(){t.classList.remove("show")},7000)}

  // ---- one-click grabber (runs on the CIPP tab, not here) ----
  var GRAB="(async()=>{try{var r=await fetch('/api/me',{credentials:'include'});var j=await r.json();var f=[];(function w(o){if(Array.isArray(o))o.forEach(w);else if(o&&typeof o==='object')Object.values(o).forEach(w);else if(typeof o==='string'&&/^[A-Za-z]+\\.[A-Za-z]+\\.(Read|ReadWrite)$/i.test(o))f.push(o)})(j);var u=[...new Set(f)];var out=JSON.stringify({json:u});if(!u.length){prompt('No permissions found in /api/me response. Copy it manually:',JSON.stringify(j).slice(0,2000));return}try{if(typeof copy==='function'){copy(out);console.log('Copied '+u.length+' permissions')}else{await navigator.clipboard.writeText(out);alert('Copied '+u.length+' permissions. Paste them into the report.')}}catch(e){prompt('Copy this ('+u.length+' permissions):',out)}}catch(e){alert('Could not read /api/me: '+e.message+'. Use TanStack authmecipp instead.')}})();";
  $("snip").textContent=GRAB;
  $("bm").href="javascript:"+encodeURIComponent(GRAB);
  $("bm").addEventListener("click",function(e){e.preventDefault();toast("Don't click it here. Drag this button onto your favorites bar, then click that favorite while on your CIPP tab.")});
  $("copysnip").addEventListener("click",function(){
    try{navigator.clipboard.writeText(GRAB).then(function(){$("copysnip").textContent="Copied!"})}catch(e){var r=document.createRange();r.selectNode($("snip"));getSelection().removeAllRanges();getSelection().addRange(r)}
  });
  $("pastecb").addEventListener("click",function(){
    if(navigator.clipboard&&navigator.clipboard.readText){navigator.clipboard.readText().then(function(t){$("perms").value=t;cnt()}).catch(function(){toast("Browser blocked clipboard read. Click the box and press Ctrl+V.")})}
    else toast("Click the box and press Ctrl+V.");
  });

  // ---- parsing ----
  function parsePerms(t){
    var m=(t||"").match(/[A-Za-z0-9_]+\.[A-Za-z0-9_]+\.(?:ReadWrite|Read)\b/gi)||[],seen={},out=[];
    m.forEach(function(x){var k=x.toLowerCase();if(!seen[k]){seen[k]=1;out.push(x)}});return out;
  }
  function cnt(){var n=parsePerms($("perms").value).length;$("pcount").textContent=n?n+" permissions detected":""}
  function parseCSV(t){
    var out=[],row=[],f="",q=false,i,c;
    for(i=0;i<t.length;i++){c=t[i];
      if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}
      else if(c=='"')q=true;else if(c==","){row.push(f);f=""}
      else if(c=="\n"){row.push(f);out.push(row);row=[];f=""}else if(c!="\r")f+=c;}
    if(f.length||row.length){row.push(f);out.push(row)}return out;
  }
  var VERB=/^(invoke-)?(Exec|List|Get|Add|Edit|Remove|Set|Push|New|Test|Invoke|Public)$/;
  var VSTART=/(?:invoke-|Exec|List|Get|Add|Edit|Remove|Set|Push|New|Test|Invoke|Public)[A-Z]/y;
  function splitFns(s){
    s=(s||"").trim();if(!s)return[];
    var p=s.split(/\s*[;|\n]\s*|\s*,\s*|\s{2,}/).filter(Boolean);
    if(p.length>1||/\s/.test(s))return p;
    var out=[],start=0,i;
    for(i=1;i<s.length;i++){
      if(/[A-Za-z0-9]/.test(s[i-1])){VSTART.lastIndex=i;
        if(VSTART.test(s)&&!VERB.test(s.slice(start,i))){out.push(s.slice(start,i));start=i}}
    }
    out.push(s.slice(start));return out;
  }
  function splitNav(s){
    s=(s||"").trim();if(!s)return[];
    var p=s.split(/\s*[;|\n]\s*/).filter(Boolean);
    if(p.length>1)return p;
    return s.split(/(?<=[a-z\)])(?=[A-Z][A-Za-z &\/-]* > )/).filter(Boolean);
  }

  // ---- build ----
  function build(csv){
    var data=parseCSV(csv).filter(function(r){return r.length>1});
    var h=data.shift().map(function(x){return x.trim()});
    var ix=function(n){return h.indexOf(n)};
    var iC=ix("Category"),iO=ix("Object");
    if(iC<0||iO<0)throw new Error("Catalog CSV has no Category/Object columns. Use the Raw file.");
    var iD=ix("Description"),iN=ix("NavSections"),iR=ix("BackendReadFunctions"),iW=ix("BackendReadWriteFunctions"),iX=ix("CrossCheckStatus"),iM=ix("MismatchCount");
    var have={};MINE.forEach(function(p){have[p.toLowerCase()]=1});
    rows=data.filter(function(r){return r[iC]&&r[iO]}).map(function(r){
      var p=r[iC].trim()+"."+r[iO].trim(),l=p.toLowerCase();
      var rw=!!have[l+".readwrite"],rd=rw||!!have[l+".read"];
      var o={cat:r[iC].trim(),obj:r[iO].trim(),perm:p,acc:rw?"ReadWrite":(rd?"Read":"None"),
        desc:iD>=0?r[iD]:"",nav:splitNav(iN>=0?r[iN]:""),
        rfn:splitFns(iR>=0?r[iR]:""),wfn:splitFns(iW>=0?r[iW]:""),
        status:iX>=0?r[iX]:"",mm:iM>=0?r[iM]:""};
      o.rok=o.acc!="None";o.wok=o.acc=="ReadWrite";
      o.total=o.rfn.length+o.wfn.length;
      o.usable=(o.rok?o.rfn.length:0)+(o.wok?o.wfn.length:0);
      o.blocked=o.total-o.usable;
      return o;
    });
    rows.sort(function(a,b){return a.cat<b.cat?-1:a.cat>b.cat?1:(a.perm<b.perm?-1:a.perm>b.perm?1:0)});
    rows.forEach(function(r,i){r.i=i});
    var known={};rows.forEach(function(r){known[r.perm.toLowerCase()]=1});
    var unk=MINE.filter(function(p){return !known[p.replace(/\.(ReadWrite|Read)$/i,"").toLowerCase()]});
    var u=$("unk");
    if(unk.length){u.classList.remove("hide");u.innerHTML="<b>In your array but not in this catalog version:</b> "+unk.map(function(x){return "<code>"+esc(x)+"</code>"}).join(", ")}else u.classList.add("hide");
    sel=-1;fnLimit=200;
    $("loader").classList.add("hide");$("report").classList.remove("hide");render();
  }

  // ---- filtering ----
  function visible(){
    var f=$("f").value,q=$("q").value.trim().toLowerCase();
    return rows.filter(function(r){
      if(f=="gap"&&r.acc=="ReadWrite")return false;
      if(f!="gap"&&f!="all"&&r.acc!=f)return false;
      if(!q)return true;
      return (r.perm+" "+r.desc+" "+r.nav.join(" ")+" "+r.rfn.join(" ")+" "+r.wfn.join(" ")).toLowerCase().indexOf(q)>-1;
    });
  }
  // functions of one permission after the function filter + search
  function fnsFor(r){
    var q=$("q").value.trim().toLowerCase();
    var pm=!q||(r.perm+" "+r.desc+" "+r.nav.join(" ")).toLowerCase().indexOf(q)>-1;
    function mk(arr,ok){
      return arr.filter(function(n){
        if(fnF=="bad"&&ok)return false;
        if(fnF=="ok"&&!ok)return false;
        return pm||n.toLowerCase().indexOf(q)>-1;
      }).map(function(n){return{n:n,ok:ok}});
    }
    return {read:mk(r.rfn,r.rok),write:mk(r.wfn,r.wok)};
  }
  function flatAll(list){
    var o=[];
    list.forEach(function(r){
      var f=fnsFor(r),pg=r.nav.join(" | ");
      f.read.forEach(function(x){o.push({cat:r.cat,perm:r.perm,fn:x.n,lvl:"Read",ok:x.ok,acc:r.acc,pages:pg})});
      f.write.forEach(function(x){o.push({cat:r.cat,perm:r.perm,fn:x.n,lvl:"ReadWrite",ok:x.ok,acc:r.acc,pages:pg})});
    });
    return o;
  }

  // ---- shared markup (used by screen AND exports) ----
  function fnItem(x){return '<div class="fn '+(x.ok?'ok':'bad')+'" title="'+(x.ok?'You can call this':'Blocked for your role')+'"><span class="ic">'+(x.ok?'\u2713':'\u2715')+'</span><code>'+esc(x.n)+'</code></div>'}
  function levelHTML(title,lvl,r,items,ok,total){
    var need=r.perm+"."+lvl;
    var st=ok?'<span class="need ok">\u2713 You have '+esc(need)+'</span>':'<span class="need bad">\u2715 You lack '+esc(need)+'</span>';
    var body;
    if(!total)body='<div class="empty">No functions listed in the catalog at this level.</div>';
    else if(!items.length)body='<div class="empty">'+(fnF=="bad"?"No blocked functions here.":fnF=="ok"?"No usable functions at this level.":"No matching functions.")+'</div>';
    else body='<div class="fgrid">'+items.map(fnItem).join("")+'</div>';
    return '<div class="sec lvl '+(ok?'is-ok':'is-bad')+'"><div class="lhead"><h4>'+title+' <small>'+lvl+' level &middot; '+total+' function'+(total==1?'':'s')+'</small></h4>'+st+'</div>'+body+'</div>';
  }
  function bodyHTML(r){
    var f=fnsFor(r),h="";
    if(r.nav.length)h+='<div class="sec"><h4>Pages &amp; menu items <small>'+r.nav.length+'</small></h4><div>'+r.nav.map(function(p){return '<span class="chip">'+esc(p)+'</span>'}).join("")+'</div></div>';
    h+=levelHTML("View functions","Read",r,f.read,r.rok,r.rfn.length);
    h+=levelHTML("Action functions","ReadWrite",r,f.write,r.wok,r.wfn.length);
    if(r.status&&r.status!="Consistent")h+='<div class="note">Catalog cross-check: '+esc(r.status)+(r.mm?' ('+esc(r.mm)+' mismatches). A page may show but a button may still return 403 because a second permission is needed.':'')+'</div>';
    return h;
  }
  function meterHTML(r){
    var t=r.total||1;
    return '<div class="meter"><i class="ok" style="width:'+r.usable/t*100+'%"></i><i class="bad" style="width:'+r.blocked/t*100+'%"></i></div><div class="gap">'+r.usable+' of '+r.total+' functions usable &middot; '+r.blocked+' blocked</div>';
  }
  function badgeHTML(r){return '<span class="badge '+r.acc+'">'+ICON[r.acc]+' '+LABEL[r.acc]+'</span>'}

  // ---- screen rendering ----
  function sideHTML(list){
    var h="",cur=null,cnts={};
    list.forEach(function(r){cnts[r.cat]=(cnts[r.cat]||0)+1});
    list.forEach(function(r){
      if(r.cat!==cur){cur=r.cat;h+='<div class="cg"><span>'+esc(cur)+'</span><span>'+cnts[cur]+'</span></div>'}
      h+='<button type="button" class="pi'+(r.i===sel?' on':'')+'" data-i="'+r.i+'"><span class="st '+r.acc+'">'+ICON[r.acc]+'</span><span class="pn">'+esc(r.obj)+'</span>'+(r.blocked?'<span class="bc" title="Blocked functions">'+r.blocked+'</span>':'')+'</button>';
    });
    return h||'<div class="empty">No permissions match.</div>';
  }
  function detailHTML(r){
    return '<div class="dhead"><div><div class="crumb">'+esc(r.cat)+'</div><h2>'+esc(r.perm)+'</h2>'+(r.desc?'<div class="gap" style="max-width:760px">'+esc(r.desc)+'</div>':'')+'</div><div class="dstat">'+badgeHTML(r)+meterHTML(r)+'</div></div>'+bodyHTML(r);
  }
  function fnView(list){
    var fl=flatAll(list),shown=fl.slice(0,fnLimit),bad=0;
    fl.forEach(function(x){if(!x.ok)bad++});
    var h='<div class="tablebox"><h3>Functions <small>'+fl.length+' shown &middot; '+bad+' blocked</small></h3><table><tr><th>Status</th><th>Function</th><th>Requires</th><th>Your access</th><th>Pages / menu</th></tr>'
      +shown.map(function(x){return '<tr><td><span class="pill '+(x.ok?'ok':'bad')+'">'+(x.ok?'\u2713 Usable':'\u2715 Blocked')+'</span></td><td><code>'+esc(x.fn)+'</code></td><td><code>'+esc(x.perm)+'.'+x.lvl+'</code></td><td><span class="badge '+x.acc+'">'+LABEL[x.acc]+'</span></td><td class="gap">'+esc(x.pages)+'</td></tr>'}).join("")
      +'</table>'+(fl.length>shown.length?'<div style="padding:12px 16px"><button type="button" id="more">Show 200 more</button></div>':'')+'</div>';
    $("v-fn").innerHTML=h;
    var mb=$("more");if(mb)mb.addEventListener("click",function(){fnLimit+=200;render()});
  }
  function render(){
    var n=0,rd=0,rw=0,bl=0,tot=0;
    rows.forEach(function(r){if(r.acc=="None")n++;else if(r.acc=="Read")rd++;else rw++;bl+=r.blocked;tot+=r.total});
    var t=rows.length||1;
    $("k-total").textContent=rows.length;$("k-none").textContent=n;$("k-read").textContent=rd;$("k-rw").textContent=rw;
    $("k-fn").textContent=bl;$("k-fn2").textContent="of "+tot+" functions";
    $("bar").innerHTML='<i style="width:'+n/t*100+'%;background:var(--bad)"></i><i style="width:'+rd/t*100+'%;background:var(--warn)"></i><i style="width:'+rw/t*100+'%;background:var(--ok)"></i>';
    $("v-p").className=view=="perm"?"on":"";$("v-f").className=view=="fn"?"on":"";
    $("fn-all").className=fnF=="all"?"on":"";$("fn-bad").className=fnF=="bad"?"on bad":"";$("fn-ok").className=fnF=="ok"?"on ok":"";
    $("v-perm").classList.toggle("hide",view!="perm");$("v-fn").classList.toggle("hide",view!="fn");
    var list=visible();
    if(view=="perm"){
      var found=list.some(function(r){return r.i===sel});
      if(!found)sel=list.length?list[0].i:-1;
      $("side").innerHTML=sideHTML(list);
      $("detail").innerHTML=sel>=0?detailHTML(rows[sel]):'<div class="empty big">Nothing matches the current filters.</div>';
    }else fnView(list);
  }

  // ---- export document (HTML + PDF share this) ----
  var DOC_EXTRA=":root{--bg:#fff;--card:#fff;--soft:#f6f8fc;--ink:#0f172a;--mut:#64748b;--line:#e2e8f0;--brand:#4f46e5;--bad:#b91c1c;--bad-bg:#fef2f2;--bad-line:#fecaca;--warn:#b45309;--warn-bg:#fffbeb;--warn-line:#fde68a;--ok:#15803d;--ok-bg:#f0fdf4;--ok-line:#bbf7d0}"
   +"body.doc{background:#fff;color:#0f172a}.dwrap{max-width:1180px;margin:0 auto;padding:26px}"
   +".dhdr{background:linear-gradient(135deg,#1e1b4b,#3730a3 55%,#4f46e5);color:#fff;border-radius:14px;padding:22px 26px;margin-bottom:16px}.dhdr h1{margin:0;font-size:24px}.dhdr p{margin:6px 0 0;color:#c7d2fe}"
   +".dfil{margin:0 0 14px;color:#64748b;font-size:12.5px}"
   +".otable{margin:16px 0 8px;border:1px solid var(--line);border-radius:12px;overflow:hidden}.otable td,.otable th{padding:7px 12px}"
   +"h2.dcat{margin:26px 0 10px;font-size:17px;padding:8px 14px;border-radius:10px;background:#eef2ff;color:#3730a3;border:1px solid #c7d2fe}h2.dcat small{font-weight:400;color:#64748b;margin-left:8px;font-size:12.5px}"
   +"details.dp{border:1px solid var(--line);border-radius:12px;margin:0 0 12px;background:#fff}"
   +"details.dp>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;background:var(--soft);border-radius:12px;font-size:14px}details.dp[open]>summary{border-bottom:1px solid var(--line);border-radius:12px 12px 0 0}"
   +"details.dp>summary::-webkit-details-marker{display:none}.dbody{padding:4px 16px 16px}.dbody .sec:first-child{margin-top:8px}"
   +".dfoot{margin:26px 0 0;color:#64748b;font-size:12px;border-top:1px solid var(--line);padding-top:10px}"
   +"@page{size:A4 landscape;margin:10mm}"
   +"@media print{.dwrap{max-width:none;padding:0}details.dp>summary{background:#f6f8fc!important}.fn,.chip,.badge,.need,.pill{break-inside:avoid}.lvl,.sec h4,details.dp>summary,h2.dcat{break-inside:avoid;break-after:avoid}tr{break-inside:avoid}.fgrid{grid-template-columns:repeat(4,1fr)}}";
  function docCSS(){return $("appcss").textContent+"\n"+DOC_EXTRA}
  function selText(id){var s=$(id);return s.options[s.selectedIndex].text}
  function buildDoc(){
    var list=visible(),date=new Date().toISOString().slice(0,10);
    var n=0,rd=0,rw=0,bl=0,tot=0,cats={},order=[];
    list.forEach(function(r){
      if(r.acc=="None")n++;else if(r.acc=="Read")rd++;else rw++;bl+=r.blocked;tot+=r.total;
      if(!cats[r.cat]){cats[r.cat]=[];order.push(r.cat)}cats[r.cat].push(r);
    });
    var q=$("q").value.trim();
    var h='<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CIPP-Permission-Gap-Report-'+date+'</title><style>'+docCSS()+'</style></head><body class="doc"><div class="dwrap">';
    h+='<div class="dhdr"><h1>CIPP Permission Gap Report</h1><p>Generated '+date+' &middot; built from '+MINE.length+' granted permissions &middot; '+rows.length+' permissions in the catalog</p></div>';
    h+='<p class="dfil">Filters: '+esc(selText("f"))+' &middot; functions: '+(fnF=="bad"?"blocked only":fnF=="ok"?"usable only":"all")+(q?' &middot; search: &ldquo;'+esc(q)+'&rdquo;':'')+'</p>';
    h+='<div class="cards"><div class="card brand"><span>Permissions listed</span><b>'+list.length+'</b></div><div class="card bad"><span>No access</span><b>'+n+'</b></div><div class="card warn"><span>Read only</span><b>'+rd+'</b></div><div class="card ok"><span>Full access</span><b>'+rw+'</b></div><div class="card bad"><span>Functions blocked</span><b>'+bl+'</b><span>of '+tot+'</span></div></div>';
    h+='<div class="tablebox otable"><table><tr><th>Category</th><th>Permissions</th><th>No access</th><th>Read only</th><th>Full access</th><th>Blocked functions</th></tr>';
    order.forEach(function(c){
      var a=0,b=0,d=0,k=0;cats[c].forEach(function(r){if(r.acc=="None")a++;else if(r.acc=="Read")b++;else d++;k+=r.blocked});
      h+='<tr><td><b>'+esc(c)+'</b></td><td>'+cats[c].length+'</td><td>'+a+'</td><td>'+b+'</td><td>'+d+'</td><td>'+k+'</td></tr>';
    });
    h+='</table></div>';
    order.forEach(function(c){
      h+='<h2 class="dcat">'+esc(c)+'<small>'+cats[c].length+' permission'+(cats[c].length==1?'':'s')+'</small></h2>';
      cats[c].forEach(function(r){
        h+='<details class="dp" open><summary><span class="st '+r.acc+'">'+ICON[r.acc]+'</span><b>'+esc(r.perm)+'</b>'+badgeHTML(r)+'<span class="gap">'+r.usable+' of '+r.total+' functions usable &middot; '+r.blocked+' blocked</span></summary><div class="dbody">'+(r.desc?'<div class="gap" style="margin-top:8px">'+esc(r.desc)+'</div>':'')+bodyHTML(r)+'</div></details>';
      });
    });
    h+='<div class="dfoot">Source: CIPP Permissions Mapper catalog (third-party, check against your CIPP version). ReadWrite implies Read. A visible page can still fail if a second permission is required. Redact tenant and user data before sharing.</div></div></body></html>';
    return h;
  }
  function dl(name,text,type){var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:type}));a.download=name;document.body.appendChild(a);a.click();a.remove()}
  function fname(ext){return "CIPP-Permission-Gap-Report-"+new Date().toISOString().slice(0,10)+"."+ext}
  function saveHTML(){
    if(!visible().length){toast("Nothing to export with the current filters.");return}
    dl(fname("html"),buildDoc(),"text/html");toast("Saved "+fname("html")+" to your Downloads folder.");
  }
  function savePDF(){
    if(!visible().length){toast("Nothing to export with the current filters.");return}
    var old=document.title;document.title=fname("pdf").replace(/\.pdf$/,"");
    var fr=document.createElement("iframe");
    fr.setAttribute("aria-hidden","true");fr.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    fr.onload=function(){
      setTimeout(function(){
        try{fr.contentWindow.focus();fr.contentWindow.print()}catch(e){toast("Could not open the print window. Use Save as HTML, open it, and press Ctrl+P.")}
        setTimeout(function(){document.title=old;fr.remove()},60000);
      },350);
    };
    fr.srcdoc=buildDoc();document.body.appendChild(fr);
    toast("In the window that opens, set Destination to \"Save as PDF\" and turn on Background graphics.");
  }
  function saveCSV(){
    var L=[["Category","Permission","Function","RequiredLevel","RequiredPermission","YourAccess","Status","Pages"]];
    flatAll(visible()).forEach(function(x){L.push([x.cat,x.perm,x.fn,x.lvl,x.perm+"."+x.lvl,LABEL[x.acc],x.ok?"Usable":"Blocked",x.pages])});
    dl(fname("csv"),"\ufeff"+L.map(function(l){return l.map(function(v){return '"'+String(v).replace(/"/g,'""')+'"'}).join(",")}).join("\r\n"),"text/csv");
  }

  // ---- wiring ----
  var tm;
  $("q").addEventListener("input",function(){clearTimeout(tm);tm=setTimeout(function(){fnLimit=200;render()},200)});
  $("f").addEventListener("change",function(){fnLimit=200;render()});
  $("v-p").addEventListener("click",function(){view="perm";render()});
  $("v-f").addEventListener("click",function(){view="fn";fnLimit=200;render()});
  $("fn-all").addEventListener("click",function(){fnF="all";fnLimit=200;render()});
  $("fn-bad").addEventListener("click",function(){fnF="bad";fnLimit=200;render()});
  $("fn-ok").addEventListener("click",function(){fnF="ok";fnLimit=200;render()});
  $("side").addEventListener("click",function(e){
    var b=e.target.closest?e.target.closest(".pi"):null;if(!b)return;
    sel=parseInt(b.getAttribute("data-i"),10);render();
    var d=$("detail");if(d.scrollIntoView&&window.innerWidth<900)d.scrollIntoView({block:"start"});
  });
  $("sv-html").addEventListener("click",saveHTML);
  $("sv-pdf").addEventListener("click",savePDF);
  $("csv").addEventListener("click",saveCSV);
  $("perms").addEventListener("input",cnt);
  $("edit").addEventListener("click",function(){$("report").classList.add("hide");$("loader").classList.remove("hide")});
  $("file").addEventListener("change",function(e){var fr=new FileReader();fr.onload=function(){catalogText=fr.result;$("paste").value=fr.result};if(e.target.files[0])fr.readAsText(e.target.files[0])});
  $("go").addEventListener("click",function(){
    MINE=parsePerms($("perms").value);
    if(!MINE.length){toast("Paste your permissions array first (no Category.Object.Read/ReadWrite entries found).");return}
    var c=($("paste").value||"").trim()||catalogText;
    if(!c){toast("Catalog not loaded yet. Wait a moment, or load the CSV manually.");return}
    try{build(c)}catch(e){toast(e.message)}
  });
  (function load(i){
    if(i>=URLS.length){$("status").textContent="Auto-download failed.";$("manual").classList.remove("hide");return}
    fetch(URLS[i]).then(function(r){if(!r.ok)throw 0;return r.text()}).then(function(t){catalogText=t;$("status").textContent="Catalog loaded ("+t.split("\n").length+" lines)."}).catch(function(){load(i+1)});
  })(0);
  window.__t={splitFns:splitFns,splitNav:splitNav,buildDoc:buildDoc};
})();
