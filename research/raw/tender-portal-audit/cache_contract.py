"""Fail closed when cached physical tables no longer match their input/recipe."""
import ast,hashlib,json,pathlib

def contract(script,source_hashes):
 tree=ast.parse(pathlib.Path(script).read_text());builds={};macros=[]
 for node in ast.walk(tree):
  if isinstance(node,ast.Call) and isinstance(node.func,ast.Name) and node.func.id=='run' and len(node.args)>=2 and isinstance(node.args[0],ast.Constant) and str(node.args[0].value).startswith('build_') and isinstance(node.args[1],ast.Constant):builds[node.args[0].value]=node.args[1].value
  if isinstance(node,ast.Constant) and isinstance(node.value,str) and 'CREATE OR REPLACE MACRO portal_ts' in node.value:macros.append(node.value)
 recipe={'schema':'icip.tender-derivation.v1','sourceHashes':source_hashes,'buildSQL':builds,'macroSQL':sorted(macros)}
 recipe['fingerprint']=hashlib.sha256(json.dumps(recipe,sort_keys=True).encode()).hexdigest();return recipe

def guard(script,source_hashes,cache,prior_results):
 recipe=contract(script,source_hashes);path=pathlib.Path(cache)/'derivation-manifest.json'
 if path.exists():
  previous=json.loads(path.read_text())
  if previous['fingerprint']!=recipe['fingerprint']:raise RuntimeError('Cached derivation input/build/macro fingerprint differs. Use a fresh versioned cache; do not reuse parsed tables.')
 else:
  if prior_results:
   for name,sql in recipe['buildSQL'].items():
    if prior_results.get('queries',{}).get(name,{}).get('sql')!=sql:raise RuntimeError('Cannot adopt a cached table without its identical retained executed build SQL.')
  recipe['initialization']='Recorded at initial audit handoff; all four executed physical-table build SQL strings checked against retained results. Future input/build/macro changes fail closed.'
  path.write_text(json.dumps(recipe,indent=2))
 return recipe
