"""Create clean deterministic-membership archive after final review (not source truth certification)."""
import pathlib,json,hashlib,zipfile,datetime
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'global-evidence-workbench-2026-10-14.zip'
EXCLUDE={'node_modules','__pycache__','.git','.pytest_cache','.cache','ui-round4'}
files=[p for p in sorted(ROOT.rglob('*')) if p.is_file() and not any(x in EXCLUDE for x in p.relative_to(ROOT).parts) and not ('raw' in p.relative_to(ROOT).parts and p.name!='acquisition.json') and p.name!='DELIVERY_MANIFEST.json' and p.suffix not in {'.pyc','.zip'}]
for p in files:
 if p.name.startswith('.env') or p.suffix.lower() in {'.pem','.key'}:raise RuntimeError('Private configuration candidate; inspect before delivery: '+str(p))
manifest={'created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Artifact byte hashes, not evidence-source truth or original-source hash certification.','files':[{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
m=ROOT/'DELIVERY_MANIFEST.json';m.write_text(json.dumps(manifest,indent=2)+'\n')
with zipfile.ZipFile(OUT,'w',compression=zipfile.ZIP_DEFLATED) as z:
 for p in files+[m]:z.write(p,'global-evidence-workbench/'+str(p.relative_to(ROOT)))
with zipfile.ZipFile(OUT) as z:
 assert z.testzip() is None
 for x in manifest['files']:
  assert hashlib.sha256(z.read('global-evidence-workbench/'+x['path'])).hexdigest()==x['sha256']
print(json.dumps({'path':str(OUT),'bytes':OUT.stat().st_size,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'members':len(files)+1}))
