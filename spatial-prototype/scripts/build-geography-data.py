"""Extract reproducible display geography without touching investigation evidence."""
import json, hashlib, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
world_path=Path('/tmp/ne_50m_admin_0_countries.geojson')
world=json.loads(world_path.read_text())
state_path=Path('/workspace/shared/investigation-board-redesign/app/src/components/investigation/assets/india-current36-wgs84.json')
states=json.loads(state_path.read_text())
out=ROOT/'src/assets/geography';out.mkdir(parents=True,exist_ok=True)
features=[]
for f in world['features']:
 p=f['properties']
 features.append({'type':'Feature','id':p['ADM0_A3'],'properties':{'name':p['ADMIN'],'iso2':p['ISO_A2'],'iso3':p['ADM0_A3']},'bbox':f['bbox'],'geometry':f['geometry']})
world_out={'type':'FeatureCollection','features':features}
(out/'world-countries-50m.json').write_text(json.dumps(world_out,separators=(',',':'))+'\n')
tn=next(f for f in states['features'] if f['id']=='TN')
(out/'tamil-nadu-wgs84.json').write_text(json.dumps({'type':'FeatureCollection','features':[tn],'provenance':states['provenance']},separators=(',',':'))+'\n')

def polygons(g): return [g['coordinates']] if g['type']=='Polygon' else g['coordinates']
def ring_center(points):
 cross=[a[0]*b[1]-b[0]*a[1] for a,b in zip(points,points[1:]+points[:1])]
 a=sum(cross)/2
 if abs(a)<1e-12:return 0,0,0
 return sum((p[0]+q[0])*c for p,q,c in zip(points,points[1:]+points[:1],cross))/(6*a),sum((p[1]+q[1])*c for p,q,c in zip(points,points[1:]+points[:1],cross))/(6*a),abs(a)
def distance(a,b):
 dlat=math.radians(b[1]-a[1]);dlng=math.radians(b[0]-a[0]);p=math.sin(dlat/2)**2+math.cos(math.radians(a[1]))*math.cos(math.radians(b[1]))*math.sin(dlng/2)**2
 return 6371*2*math.atan2(math.sqrt(p),math.sqrt(max(0,1-p)))
def area(f,precision,code,source):
 total=x=y=0
 for poly in polygons(f['geometry']):
  for i,ring in enumerate(poly):
   cx,cy,weight=ring_center(ring);weight*=1 if i==0 else -1;total+=weight;x+=cx*weight;y+=cy*weight
 center=[round(x/total,6),round(y/total,6)]
 coords=[p for poly in polygons(f['geometry']) for ring in poly for p in ring]
 return {'code':code,'name':f['properties'].get('name',f['properties'].get('ADMIN')),'precision':precision,'lng':center[0],'lat':center[1],'bounds':f['bbox'],'uncertaintyKm':math.ceil(max(distance(center,p) for p in coords)),'geometrySourceId':source,'centerMethod':'Area-weighted polygon centroid in longitude/latitude; display representative only, not a verified site or address.'}
areas=[area(f,'country',f['properties']['iso2'],'natural-earth-50m-countries') for f in features if f['properties']['iso2'] in ['IN','BD','ES']]
areas.append(area(tn,'state','IN-TN','lgd-bharatmaps-tamil-nadu'))
(out/'evidence-area-anchors.json').write_text(json.dumps(areas,indent=2)+'\n')
metadata={'sources':[{'id':'natural-earth-50m-countries','title':'Natural Earth 1:50m Admin 0 Countries','url':'https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/','dataUrl':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson','license':'Public domain','licenseUrl':'https://www.naturalearthdata.com/about/terms-of-use/','retrievedAt':'2026-10-15','sha256':hashlib.sha256(world_path.read_bytes()).hexdigest(),'featureCount':len(features),'transformation':'Geometry coordinates preserved exactly; unused statistical/name properties removed. No boundary simplification or artificial islands.','limitations':['Generalized 1:50 million cartographic geometry, not surveyed site boundaries.','Natural Earth uses de facto territorial boundaries; display does not adjudicate disputed sovereignty.','Mercator rendering must clamp polar latitude and avoid wrapping copies when displaying one continuous world.']},{'id':'lgd-bharatmaps-tamil-nadu','title':'Tamil Nadu retained WGS84 administrative geometry',**states['provenance'],'sha256':hashlib.sha256(state_path.read_bytes()).hexdigest(),'extraction':'Only the original TN feature retained, unchanged. Original dataset provenance preserved.'}]}
metadata['artifactSha256']={name:hashlib.sha256((out/name).read_bytes()).hexdigest() for name in ['world-countries-50m.json','tamil-nadu-wgs84.json','evidence-area-anchors.json']}
(out/'geography-sources.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps(areas,indent=2))
