import {AREA_SOURCE,JMA_OFFICES} from './jma-offices.mjs';
const aliases={'北海道':'北海道','東京':'東京都','京都':'京都府','大阪':'大阪府'};
export const prefName=p=>aliases[p]||(/[都道府県]$/.test(p)?p:p+'県');
const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]/g,'').replace(/ヶ/g,'ケ');
export function buildRegionMatches(places, area){
 const lookup=new Map();
 for(const [code,unit] of Object.entries(area.class20s||{})){
  const parent15=area.class15s?.[unit.parent],parent10=area.class10s?.[parent15?.parent];
  const officeCode=parent10?.parent,office=area.offices?.[officeCode];
  const verifiedOffice=JMA_OFFICES.find(x=>x.code===officeCode);
  if(!office||!verifiedOffice)continue;
  const key=verifiedOffice.prefecture+'|'+norm(unit.name);
  const candidates=lookup.get(key)||[];
  candidates.push({areaCode:code,areaName:unit.name,officeCode,officeName:office.name});lookup.set(key,candidates);
 }
 return new Map(places.map(p=>{
  const candidates=lookup.get(prefName(p.prefecture)+'|'+norm(p.name))||[];
  const status=candidates.length===1?'matched':candidates.length>1?'ambiguous':'unmatched';
  return [p.id,{locationId:p.id,status,method:'prefecture-and-area-name',sourceURL:AREA_SOURCE,
   reason:status==='matched'?'都道府県・区域名が一意に一致':status==='ambiguous'?'同じ都道府県・名称に複数の発表区域':'都道府県・区域名の一致なし',
   ...(status==='matched'?candidates[0]:{}),candidates}];
 }));
}
