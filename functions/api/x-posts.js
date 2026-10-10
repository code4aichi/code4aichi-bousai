// Optional: set X_BEARER_TOKEN as a Cloudflare Pages secret. Never put it in browser code.
const allowed=/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー\s]{1,18}$/u;
export async function onRequestGet({request,env}) {
 const token=env.X_BEARER_TOKEN;
 const url=new URL(request.url);
 if(url.searchParams.has('status'))return Response.json({enabled:!!token});
 if(!token)return Response.json({enabled:false,posts:[],message:'X_BEARER_TOKEN not configured'});
 const pref=url.searchParams.get('pref')||'';
 if(!allowed.test(pref))return Response.json({enabled:true,error:'Invalid region'},{status:400});
 const query=`"${pref}" (災害 OR 避難 OR 大雨 OR 地震) -is:retweet lang:ja`;
 try{
  const api='https://api.x.com/2/tweets/search/recent?'+new URLSearchParams({query,max_results:'10','tweet.fields':'created_at'});
  const r=await fetch(api,{headers:{Authorization:`Bearer ${token}`},cf:{cacheTtl:120,cacheEverything:true}});
  if(!r.ok)return Response.json({enabled:true,error:'X API unavailable'},{status:502});
  const data=await r.json();
  return Response.json({enabled:true,posts:(data.data||[]).map(({id,text,created_at})=>({id,text,created_at}))},{headers:{'Cache-Control':'public,max-age=120'}});
 }catch(e){return Response.json({enabled:true,error:'X API unavailable'},{status:502})}
}
