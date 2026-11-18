/**
 * Runs on the CIPP tab (bookmarklet or DevTools console), not on this site.
 * Reads the signed-in user's own /api/me response and copies the permission list.
 */
export const GRAB = String.raw`(async()=>{try{var r=await fetch('/api/me',{credentials:'include'});var j=await r.json();var f=[];(function w(o){if(Array.isArray(o))o.forEach(w);else if(o&&typeof o==='object')Object.values(o).forEach(w);else if(typeof o==='string'&&/^[A-Za-z]+\.[A-Za-z]+\.(Read|ReadWrite)$/i.test(o))f.push(o)})(j);var u=[...new Set(f)];var out=JSON.stringify({json:u});if(!u.length){prompt('No permissions found in /api/me response. Copy it manually:',JSON.stringify(j).slice(0,2000));return}try{if(typeof copy==='function'){copy(out);console.log('Copied '+u.length+' permissions')}else{await navigator.clipboard.writeText(out);alert('Copied '+u.length+' permissions. Paste them into the report.')}}catch(e){prompt('Copy this ('+u.length+' permissions):',out)}}catch(e){alert('Could not read /api/me: '+e.message+'. Use TanStack authmecipp instead.')}})();`

export const BOOKMARKLET = "javascript:" + encodeURIComponent(GRAB)
