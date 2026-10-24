"""Copy the official row values without editing names, addresses or numbers.
Usage: python3 scripts/import-nagoya-facilities.py SOURCE.xlsx
"""
import sys,json,hashlib,datetime,shutil
from pathlib import Path
import openpyxl
root=Path(__file__).resolve().parent.parent
source=Path(sys.argv[1])
workbook=openpyxl.load_workbook(source,read_only=True,data_only=True)
rows=list(workbook['emergency'].values)
columns=list(rows[0]);records=[list(r) for r in rows[1:] if r[0] is not None]
assert columns==['ID','施設名','施設名フリガナ','施設種別','区・町名','住所','緯度','経度']
assert len({r[0] for r in records})==len(records)
output={'source':{'name':'名古屋市上下水道局 応急給水施設オープンデータ','url':'https://www.water.city.nagoya.jp/category/10200bousai/1527.html','downloadURL':'https://www.water.city.nagoya.jp/file/39066.xlsx','license':'CC BY-ND 4.0','licenseURL':'https://creativecommons.org/licenses/by-nd/4.0/','sourcePageUpdatedAt':sys.argv[2] if len(sys.argv)>2 else None,'dataAsOf':None,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'note':'元の名称・住所・数値等は変更せず、各項目を転載。登録データであり開設状況は未確認。'},'columns':columns,'rows':records}
(root/'public/nagoya-water-facilities.json').write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n')
shutil.copyfile(source,root/'public/nagoya-water-facilities.xlsx')
print(f'Original rows copied: {len(records)}')
