"""Inspect generated assets; do not modify their pixels."""
import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent
catalog=json.loads((root/'catalog.json').read_text())
results=[]
for item in catalog:
 p=root/(item['id']+'.png')
 if not p.exists():
  results.append({'id':item['id'],'status':'missing'});continue
 with Image.open(p) as im:
  alpha=im.getchannel('A') if 'A' in im.getbands() else None
  results.append({'id':item['id'],'status':'ok' if alpha and alpha.getextrema()[0]==0 and alpha.getextrema()[1]>0 else 'needs-alpha-review','size':list(im.size),'mode':im.mode,'alpha_range':list(alpha.getextrema()) if alpha else None,'alpha_bounds':list(alpha.getbbox()) if alpha else None})
(root/'qa.json').write_text(json.dumps(results,indent=2))
print(json.dumps({'expected':len(catalog),'present':sum(x['status']!='missing' for x in results),'transparent':sum(x['status']=='ok' for x in results),'attention':[x['id'] for x in results if x['status']!='ok']}))
