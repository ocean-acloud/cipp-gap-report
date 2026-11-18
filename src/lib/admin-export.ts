/**
 * Runs on the CIPP tab as a superadmin (DevTools console), not on this site.
 * Read-only: it only GETs /api/me and /api/ListCustomRole, collects every
 * Category.Object.Read/ReadWrite string it finds, and downloads a one-column CSV.
 * Unverified: the exact response shapes. It scans the whole JSON, so shape does not matter.
 */
export const ADMIN_EXPORT = String.raw`(async()=>{var re=/^[A-Za-z0-9_]+\.[A-Za-z0-9_]+\.(Read|ReadWrite)$/i,found={},ok=[],bad=[];function walk(o){if(Array.isArray(o))o.forEach(walk);else if(o&&typeof o==='object')Object.keys(o).forEach(function(k){walk(o[k])});else if(typeof o==='string'){var t=o.trim();if(re.test(t)){var b=t.replace(/\.(ReadWrite|Read)$/i,'');if(!found[b.toLowerCase()])found[b.toLowerCase()]=b}else if(/^[\[{]/.test(t)){try{walk(JSON.parse(t))}catch(e){}}}}var urls=['/api/me','/api/ListCustomRole'];for(var i=0;i<urls.length;i++){try{var r=await fetch(urls[i],{credentials:'include'});if(r.ok){walk(await r.json());ok.push(urls[i])}else bad.push(urls[i]+' ('+r.status+')')}catch(e){bad.push(urls[i])}}var list=Object.keys(found).map(function(k){return found[k]}).sort();if(!list.length){alert('No permissions found. Failed: '+bad.join(', '));return}var csv='Permission\r\n'+list.join('\r\n')+'\r\n';var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='cipp-admin-catalog.csv';document.body.appendChild(a);a.click();a.remove();alert('Exported '+list.length+' permissions from '+ok.join(', ')+(bad.length?'. Failed: '+bad.join(', '):'')+'. A full catalog has about 54.')})();`

export function adminMessage(pageUrl: string): string {
  return [
    "Hi, could you export the CIPP permission list for me? It is read-only and takes about a minute.",
    "",
    "1. Log in to CIPP with your superadmin account and stay on that tab.",
    "2. Press F12, open the Console tab. If Edge blocks pasting, type: allow pasting",
    "3. Paste the snippet below and press Enter. It downloads cipp-admin-catalog.csv.",
    "4. Send me the CSV (it contains permission names only, no tenant or user data).",
    "",
    "Snippet:",
    ADMIN_EXPORT,
    "",
    "Report page: " + pageUrl,
  ].join("\n")
}
