import assert from 'node:assert/strict';
import { assertReadableGeometry } from './case-label-coverage.mjs';
const right = r => r.left + r.width, bottom = r => r.top + r.height;
const overlaps = (a,b) => a.left < right(b)+6-.5 && right(a)+6-.5 > b.left && a.top < bottom(b)+6-.5 && bottom(a)+6-.5 > b.top;
const contained = (r,w,h) => r.left >= -.75 && r.top >= -.75 && right(r) <= w+.75 && bottom(r) <= h+.75;
const sorted = values => [...new Set(values)].sort();

/** Account for every original ID/text/pin before filtering explicitly deferred
 * geometry. Caller still runs the collector's full semantic/sizing prepasses. */
export function prepareReadableCaseLabelGeometry(sample, file, options = {}) {
  if (!sample.labelPolicy) return { sample, options };
  const policy = sample.labelPolicy, prefix = `${file.id}:${options.phase ?? 'frame'}:policy`;
  assert.ok(policy.board && Math.abs(policy.board.width-sample.width)<=.25 && Math.abs(policy.board.height-sample.height)<=.25,`${prefix}: stale or missing measured board bounds`);
  const nodeLabels = sample.labels.filter(label=>label.kind==='node'), roleLabels=sample.labels.filter(label=>label.kind==='role');
  // Unconditional full semantic pass, including every hidden source plaque.
  assert.deepEqual(nodeLabels.map(label=>label.id),sample.expectedNodeIds,`${prefix}: original emitted node IDs`);
  assert.deepEqual(roleLabels.map(label=>label.id),sample.expectedRoleIds,`${prefix}: original emitted role IDs`);
  for(const labels of [nodeLabels,roleLabels])assert.equal(new Set(labels.map(label=>label.id)).size,labels.length,`${prefix}: duplicate original plaque`);
  for(const label of sample.labels){
    assert.equal(label.text,label.kind==='node'?file.nodes.find(node=>node.id===label.id)?.label:file.edges.find(edge=>edge.id===label.id)?.role,`${prefix}: original exact full text ${label.id}`);
    if(label.kind==='node')assert.ok(Math.abs(label.rect.left+label.rect.width/2-label.anchor.x)<=.75&&Math.abs(label.rect.top+label.rect.height/2-label.anchor.y)<=.75,`${prefix}: original node pin changed ${label.id}`);
    else{
      assert.ok(['anchored','displaced','unresolved'].includes(label.placement),`${prefix}: invalid original role placement metadata`);
      const leader=sample.leaders.find(item=>item.id===label.id),deferred=policy.deferredRoles.some(item=>item.id===label.id&&item.reason===label.disposition&&['outside-view','crowded'].includes(item.reason));assert.ok(leader&&(label.placement!=='displaced'||leader.visible||(deferred&&!label.visible)),`${prefix}: original displaced role leader missing`);
      assert.ok(Math.abs(leader.x1-label.anchor.x)<=.01&&Math.abs(leader.y1-label.anchor.y)<=.01,`${prefix}: original role midpoint changed`);
    }
  }
  assert.deepEqual(sample.allFrameNodeIds,file.nodes.map(node=>node.id),`${prefix}: all source node IDs`);
  assert.equal(new Set(sample.allFrameRoleIds).size,sample.allFrameRoleIds.length,`${prefix}: duplicate full frame role ID`);
  for(const id of sample.allFrameRoleIds)assert.ok(file.edges.some(edge=>edge.id===id),`${prefix}: unknown full frame role ID ${id}`);
  for(const id of sample.expectedRoleIds)assert.ok(sample.allFrameRoleIds.includes(id),`${prefix}: visible role missing from full frame`);
  const edge=file.edges.find(edge=>edge.id===sample.selection),selected=file.nodes.find(node=>node.id===sample.selection);
  const fit=Boolean(options.fit||policy.requireAll),requiredNodes=fit?file.nodes.map(node=>node.id):edge?[edge.from,edge.to]:selected?[selected.id]:[];
  const requiredRoles=[...(edge?[edge.id]:[]),...(fit?sample.allFrameRoleIds:[])];
  assert.deepEqual(sorted(policy.requiredNodeIds),sorted(requiredNodes),`${prefix}: required node policy differs`);
  assert.deepEqual(sorted(policy.requiredRoleIds),sorted(requiredRoles),`${prefix}: required role policy differs`);
  assert.equal(policy.status,'ready',`${prefix}: insufficient layout cannot count as scene coverage`);
  assert.deepEqual(policy.failures,[],`${prefix}: ready report retained failures`);
  if(fit){assert.deepEqual(policy.deferredNodes,[],`${prefix}: all-fit deferred nodes`);assert.deepEqual(policy.deferredRoles,[],`${prefix}: all-fit deferred roles`);}
  const deferredNodes=new Map(policy.deferredNodes.map(item=>[item.id,item.reason])),deferredRoles=new Map(policy.deferredRoles.map(item=>[item.id,item.reason]));
  assert.equal(deferredNodes.size,policy.deferredNodes.length,`${prefix}: duplicate deferred node`);assert.equal(deferredRoles.size,policy.deferredRoles.length,`${prefix}: duplicate deferred role`);
  for(const id of requiredNodes)assert.ok(nodeLabels.some(label=>label.id===id)&&!deferredNodes.has(id),`${prefix}: required node missing/deferred ${id}`);
  for(const id of requiredRoles)assert.ok(roleLabels.some(label=>label.id===id)&&!deferredRoles.has(id),`${prefix}: required role missing/deferred ${id}`);
  assert.deepEqual(sample.leaders.map(item=>item.id),sample.expectedRoleIds,`${prefix}: exact original leader IDs`);
  const displayed=sample.labels.filter(label=>!(label.kind==='node'?deferredNodes:deferredRoles).has(label.id));
  for(const [kind,ids,deferred,labels,reader]of [['node',sample.allFrameNodeIds,deferredNodes,nodeLabels,sample.readerNodes],['role',sample.allFrameRoleIds,deferredRoles,roleLabels,sample.readerRoles]]){
    for(const [id,reason]of deferred){
      assert.ok(ids.includes(id),`${prefix}: deferred ${kind} outside original frame ${id}`);assert.ok(['outside-view','crowded'].includes(reason),`${prefix}: invalid deferred reason`);
      const expected=kind==='node'?file.nodes.find(node=>node.id===id)?.label:`Select relation: ${file.edges.find(edge=>edge.id===id)?.role}`;
      assert.equal(reader.filter(item=>item.id===id).length,1,`${prefix}: deferred ${kind} lacks exact reader control`);
      assert.equal(reader.find(item=>item.id===id)?.text,expected,`${prefix}: deferred ${kind} reader full text`);
    }
    for(const id of ids){
      const label=labels.find(label=>label.id===id),reason=deferred.get(id);
      if(!label){assert.equal(reason,'outside-view',`${prefix}: omitted ${kind} is not accounted off-view ${id}`);continue;}
      assert.equal(label.disposition,reason??'shown',`${prefix}: disposition does not match report ${id}`);
      assert.equal(label.visible,!reason,`${prefix}: visibility does not match report ${id}`);
      if(kind==='role'&&reason)assert.equal(sample.leaders.find(item=>item.id===id)?.visible,false,`${prefix}: deferred role retains an orphan visible leader ${id}`);
      assert.notEqual(label.textOverflow,'ellipsis',`${prefix}: abbreviated deferred/full label`);assert.ok(!label.lineClamp||label.lineClamp==='none',`${prefix}: clamped deferred/full label`);
      if(reason==='outside-view')assert.ok(!contained(label.rect,sample.width,sample.height),`${prefix}: falsely classified off-view ${id}`);
      if(reason==='crowded')assert.ok(contained(label.rect,sample.width,sample.height),`${prefix}: crowding misclassifies an off-view label ${id}`);
      // Nonmandatory role placement uses bounded candidates, not only its origin.
      if(reason==='crowded'&&kind==='node')assert.ok([...displayed.map(item=>item.rect),...(sample.credits??[]).map(item=>item.rect)].some(rect=>overlaps(label.rect,rect)),`${prefix}: gratuitously deferred noncolliding node ${id}`);

    }
  }
  const count=policy.deferredNodes.length+policy.deferredRoles.length;
  if(count){
    assert.ok(sample.policyNotice?.visible,`${prefix}: deferred labels lack visible explanation`);
    assert.equal(sample.policyNotice.nodeCount,policy.deferredNodes.length,`${prefix}: deferred node count differs`);
    assert.equal(sample.policyNotice.roleCount,policy.deferredRoles.length,`${prefix}: deferred relation count differs`);
    assert.ok(sample.fitControlAvailable&&sample.readerControlAvailable,`${prefix}: missing Fit/Complete reader access`);
  }
  // Contract checks above must all finish before any collectable geometry.
  for(const label of sample.labels){
    const kind=label.kind,id=label.id,reason=(kind==='node'?deferredNodes:deferredRoles).get(id);
      if(kind==='role'&&reason&&label.placement==='displaced'){
        const leader=sample.leaders.find(item=>item.id===id);
        const onX=Math.abs(leader.x2-label.rect.left)<.75||Math.abs(leader.x2-right(label.rect))<.75,onY=Math.abs(leader.y2-label.rect.top)<.75||Math.abs(leader.y2-bottom(label.rect))<.75;
        assertReadableGeometry((onX||onY)&&leader.x2>=label.rect.left-.75&&leader.x2<=right(label.rect)+.75&&leader.y2>=label.rect.top-.75&&leader.y2<=bottom(label.rect)+.75,`${prefix}: deferred leader does not terminate at plaque boundary ${id}`);
      }
      if(kind==='node')assertReadableGeometry(label.rect.width+.75>=Math.min(label.naturalSizing.measuredNaturalWidth,96),`${prefix}: node below readable minimum ${id}`);
  }
  return { sample:{...sample,labels:displayed,expectedNodeIds:sample.expectedNodeIds.filter(id=>!deferredNodes.has(id)),expectedRoleIds:sample.expectedRoleIds.filter(id=>!deferredRoles.has(id))},options:{...options,fit} };
}
