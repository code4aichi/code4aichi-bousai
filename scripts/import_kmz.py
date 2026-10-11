import zipfile,io,json,re,html,sys
from xml.etree import ElementTree as ET
from pathlib import Path
src=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/mnt/data/断水マップ-20261011T043200Z-1-001.zip')
out=Path(__file__).resolve().parents[1]/'public'/'locations.json'
NS='{http://www.opengis.net/kml/2.2}'
data=[]; stats={}; failures=[]
with zipfile.ZipFile(src) as archive:
 for pathname in archive.namelist():
  if not pathname.lower().endswith('.kmz') or pathname.endswith('自治体リスト.kmz'):continue
  folder=pathname.split('/')[1]
  pref=re.sub(r'^\d+','',folder)
  try:
   with zipfile.ZipFile(io.BytesIO(archive.read(pathname))) as kmz:
    kml=next(x for x in kmz.namelist() if x.lower().endswith('.kml'))
    root=ET.fromstring(kmz.read(kml))
  except Exception as exc: failures.append([pathname,str(exc)]);continue
  cnt=0
  for p in root.iter(NS+'Placemark'):
   name=(p.findtext(NS+'name') or '').strip()
   coords=p.find('.//'+NS+'Point/'+NS+'coordinates')
   if coords is None or not coords.text or not name: continue
   try:
    lon,lat,*_=map(float,coords.text.strip().split(','))
    if not (120<=lon<=155 and 20<=lat<=47):continue
   except (ValueError,TypeError):continue
   extra={}
   ext=p.find(NS+'ExtendedData')
   if ext is not None:
    for d in ext.findall(NS+'Data'):
     v=(d.findtext(NS+'value') or '').strip();extra[d.get('name','')]=v
   def val(*keys):
    for key in keys:
     v=extra.get(key,'').strip()
     if v and v not in ('-','なし','無し','ー','―'):return v
    return ''
   links={k:val(*v) for k,v in {'official':['公式HP','公式ホームページ'], 'disaster':['災害・防災ページ','防災ページ'], 'water':['水道ページ'], 'utility':['水道事業者ページ'], 'x':['twitter','Twitter'],'disasterX':['twitter（災害・防災）'], 'facebook':['facebook','Facebook']}.items()}
   links={k:v for k,v in links.items() if re.match(r'^https?://',v,re.I)}
   data.append({'id':f'loc-{len(data)+1}', 'name':name, 'prefecture':pref,'lat':lat,'lng':lon,'address':val('住所'),'links':links})
   cnt+=1
  stats[pref]=cnt
out.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('locations',len(data),'prefectures',len(stats),'stats',stats,'failures',failures)
