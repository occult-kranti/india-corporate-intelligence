#!/usr/bin/env python3
"""Rebuild the scoped current-36 map. Optional build dependencies: shapely==2.1.2, py7zr==1.0.0.
Usage: python scripts/investigation/build-map.py [path/to/LGD_States.geojsonl.7z]
The application needs neither Python nor a geospatial runtime dependency.
"""
import hashlib, json, math, pathlib, sys, tempfile, urllib.request
from shapely.geometry import shape
from shapely.ops import transform, polylabel
import py7zr
ROOT=pathlib.Path(__file__).resolve().parents[2]
URL='https://github.com/ramSeraph/indian_admin_boundaries/releases/download/states/LGD_States.geojsonl.7z'
SHA='1b8a2f0bd908c10dc1229d2a7c5bcd3d433bb3fa013865163b21f4f61780e911'
# Explicit LGD identities, never legacy-code or name inference.
ROSTER={35:('AN','Andaman and Nicobar Islands'),28:('AP','Andhra Pradesh'),12:('AR','Arunachal Pradesh'),18:('AS','Assam'),10:('BR','Bihar'),4:('CH','Chandigarh'),22:('CG','Chhattisgarh'),38:('DN','Dadra and Nagar Haveli and Daman and Diu'),7:('DL','Delhi'),30:('GA','Goa'),24:('GJ','Gujarat'),6:('HR','Haryana'),2:('HP','Himachal Pradesh'),1:('JK','Jammu and Kashmir'),20:('JH','Jharkhand'),29:('KA','Karnataka'),32:('KL','Kerala'),37:('LA','Ladakh'),31:('LD','Lakshadweep'),23:('MP','Madhya Pradesh'),27:('MH','Maharashtra'),14:('MN','Manipur'),17:('ML','Meghalaya'),15:('MZ','Mizoram'),13:('NL','Nagaland'),21:('OD','Odisha'),34:('PY','Puducherry'),3:('PB','Punjab'),8:('RJ','Rajasthan'),11:('SK','Sikkim'),33:('TN','Tamil Nadu'),36:('TS','Telangana'),16:('TR','Tripura'),9:('UP','Uttar Pradesh'),5:('UK','Uttarakhand'),19:('WB','West Bengal')}
p1,p2,origin,central=map(math.radians,[12,35,24,80])
n=math.log(math.cos(p1)/math.cos(p2))/math.log(math.tan(math.pi/4+p2/2)/math.tan(math.pi/4+p1/2))
f=math.cos(p1)*math.tan(math.pi/4+p1/2)**n/n
r0=f/math.tan(math.pi/4+origin/2)**n
def project(lon,lat,z=None):
 r=f/math.tan(math.pi/4+math.radians(lat)/2)**n
 return r*math.sin(n*(math.radians(lon)-central)),r0-r*math.cos(n*(math.radians(lon)-central))
archive=pathlib.Path(sys.argv[1]).read_bytes() if len(sys.argv)>1 else urllib.request.urlopen(URL,timeout=90).read()
assert hashlib.sha256(archive).hexdigest()==SHA,'Source changed: review before updating the pinned digest'
with tempfile.TemporaryDirectory() as tmp:
 p=pathlib.Path(tmp); (p/'states.7z').write_bytes(archive)
 with py7zr.SevenZipFile(p/'states.7z') as z:z.extractall(p)
 rows=[json.loads(x) for x in (p/'LGD_States.geojsonl').read_text().splitlines()]
 assert len(rows)==36
 assert {x['properties']['State_LGD'] for x in rows}==set(ROSTER)
 geoms=[transform(project,shape(x['geometry'])) for x in rows]
 bounds=[g.bounds for g in geoms];minx=min(b[0] for b in bounds); miny=min(b[1] for b in bounds); maxx=max(b[2] for b in bounds);maxy=max(b[3] for b in bounds)
 scale=min(560/(maxx-minx),640/(maxy-miny));ox=(640-(maxx-minx)*scale)/2;oy=30
 def pixel(x,y,z=None):return ox+(x-minx)*scale,oy+(maxy-y)*scale
 def path(poly):
  return ''.join('M'+'L'.join(f'{x:.2f},{y:.2f}' for x,y,*_ in ring.coords)+'Z' for ring in [poly.exterior,*poly.interiors])
 features=[]
 for row,g in zip(rows,geoms):
  g=transform(pixel,g).simplify(.18,preserve_topology=True)
  parts=list(g.geoms) if hasattr(g,'geoms') else [g]
  largest=max(parts,key=lambda p:p.area); anchor=polylabel(largest,tolerance=.05)
  code,name=ROSTER[row['properties']['State_LGD']]
  features.append({'code':code,'name':name,'lgdCode':row['properties']['State_LGD'],'path':''.join(path(p) for p in parts),'x':round(anchor.x,2),'y':round(anchor.y,2),'clearance':round(anchor.distance(largest.boundary),2),'parts':len(parts)})
 features.sort(key=lambda f:f['name'])
 data={'viewBox':[0,0,640,720],'states':features,'provenance':{'source':'LGD / BharatMaps, via ramSeraph and DataMeet','sourceUrl':URL,'upstreamGovernmentService':'https://mapservice.gov.in/gismapservice/rest/services/BharatMapService/Admin_Boundary_GramPanchayat/MapServer/0','license':'CC0-1.0','licenseUrl':'https://github.com/ramSeraph/indianopenmaps/blob/main/DATA_LICENSE.md','sourceSha256':SHA,'retrievedAt':'2026-10-06','boundaryVintage':'Upstream snapshot date not established; 36-unit post-2020 administrative roster verified.','projection':'Lambert conformal conic, parallels 12°N/35°N, origin 24°N, central meridian 80°E.','transformation':'Projected to 640×720 SVG; topology-preserving per-feature simplification at 0.18 SVG units; coordinates rounded to 0.01; all polygon components retained; labels at largest-part pole of inaccessibility.','boundaryScope':'Preserves upstream LGD/BharatMaps boundary claims, including disputed areas. Illustrative administrative coverage; not a survey or adjudication of territorial status. No historical record is reassigned using this geometry.'}}
 target=ROOT/'src/components/investigation/assets/india-current36.json';target.write_text(json.dumps(data,separators=(',',':'))+'\n')
 print(json.dumps({'path':str(target),'bytes':target.stat().st_size,'states':len(features),'parts':sum(x['parts'] for x in features),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}))
