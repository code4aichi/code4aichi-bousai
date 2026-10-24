"""Import the official Yokohama CSV with all original cells retained.
Usage: python3 scripts/import-yokohama-facilities.py SOURCE.csv
"""
import csv,json,sys,hashlib,datetime,shutil,io
from pathlib import Path
root=Path(__file__).resolve().parent.parent
source=Path(sys.argv[1]);raw=source.read_bytes()
try:content=raw.decode('utf-8-sig');encoding='utf-8-sig'
except UnicodeDecodeError:content=raw.decode('cp932');encoding='cp932'
rows=list(csv.reader(io.StringIO(content)));columns=rows[0];records=[r for r in rows[1:] if r and any(r)]
assert columns==['No','Type','Name','Ward','Address','Capacity','Latitude','Longitude','Notes']
assert all(len(r)==9 for r in records);assert len({r[0] for r in records})==len(records)
result={'source':{'name':'横浜市水道局 災害時給水所','url':'https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/suido-gesui/suido/torikumi/saigai/oukyu-kyusui.html','downloadURL':'https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/suido-gesui/suido/torikumi/saigai/oukyu-kyusui.files/opendate-saigaijikyuusuijyo.csv','license':'CC BY 4.0','licenseURL':'https://creativecommons.org/licenses/by/4.0/','sourcePageUpdatedAt':sys.argv[2] if len(sys.argv)>2 else None,'dataAsOf':None,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sha256':hashlib.sha256(raw).hexdigest(),'encoding':encoding,'note':'公式CSVの全項目を保持。CSVにない耐震給水栓等は未収録。開設状況は未確認。'},'columns':columns,'rows':records}
(root/'public/yokohama-water-facilities.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n');shutil.copyfile(source,root/'public/yokohama-water-facilities.csv')
print('Yokohama facility rows copied:',len(records))
