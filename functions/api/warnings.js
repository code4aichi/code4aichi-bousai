// Cloudflare Pages Function. JMA 2026 (r8) warning JSON endpoint.
// This endpoint forwards public facts; it does NOT infer disaster occurrence.
export async function onRequestGet({request}) {
  const u=new URL(request.url);
  const office=u.searchParams.get('office')||'';
  if(!/^\d{6}$/.test(office))return Response.json({ok:false,error:'Invalid office code'},{status:400});
  const src=`https://www.jma.go.jp/bosai/warning/data/r8/${office}.json`;
  try{
    const response=await fetch(src,{headers:{'Accept':'application/json'},cf:{cacheTtl:120,cacheEverything:true}});
    if(!response.ok)return Response.json({ok:false,error:'JMA upstream error',source:src},{status:502});
    const data=await response.json();
    if(!Array.isArray(data))throw new Error('Unexpected JMA response shape');
    const current=data[0];if(!current||typeof current!=='object')throw new Error('Missing latest warning report');
    const byCode=new Map();
    // Current JMA r8 shape: warning.class10Items[].kinds[]; areas can be broken down by class levels.
    const warning=current.warning||{};
    const groups=['class10Items','class15Items','class20Items','class00Items'];
    let seen=false;
    for(const g of groups){if(!Array.isArray(warning[g]))continue;seen=true;for(const area of warning[g]){
      for(const kind of area.kinds||[]){const status=String(kind.status||'');if(status.includes('解除')||status.includes('なし'))continue;
        const code=String(kind.code||'');if(!code)continue;
        if(!byCode.has(code))byCode.set(code,{code,name:String(kind.name||warningName(code)),status,areaCount:0});byCode.get(code).areaCount++;
      }
    }}
    if(!seen)throw new Error('Warning format not recognized');
    return Response.json({ok:true,office,source:src,reportDatetime:current.reportDatetime||current.controlDatetime||null,items:[...byCode.values()]},{headers:{'Cache-Control':'public, max-age=120'}});
  }catch(e){return Response.json({ok:false,error:'JMA fetch/parse failed',source:src},{status:502})}
}
function warningName(code){return `気象警報・注意報（コード ${code}）`}
