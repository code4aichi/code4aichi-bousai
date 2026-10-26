import {RADAR_TIMES,selectRadarFrame} from '../public/radar-model.mjs';
export async function radarData(fetcher=fetch,now=Date.now()){
 const r=await fetcher(RADAR_TIMES,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'},cf:{cacheTtl:60,cacheEverything:true}});
 if(!r.ok)throw Error('Radar metadata unavailable');
 const frame=selectRadarFrame(await r.json(),now);
 return {ok:true,source:'気象庁 高解像度降水ナウキャスト（実況）',sourceURL:'https://www.jma.go.jp/bosai/nowc/',retrievedAt:new Date(now).toISOString(),frame};
}
