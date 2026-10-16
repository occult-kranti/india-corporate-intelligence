/** CI-only native zoom regression. Importing helpers never launches a browser.
 * Observes Three r180 scenes and native GL uploads/draws; never changes scene data,
 * camera internals, materials, draw arguments, or native draw results.
 * Exact raster fixtures use the public MapLibre camera API through a CI-only CDP
 * object handle; real product-input navigation remains a separate required path. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { inflateSync, gzipSync } from 'node:zlib';
import { readFile, mkdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { prepareCameraFixture, assertSameFixturePose } from './thread-zoom-camera-fixture.mjs';
import { inspectScreenshotPath, cropScreenshotRegion, witnessRegions, witnessPathSamples } from './thread-zoom-screenshot-sampling.mjs';

export const ATLAS_EDGE = 'legacy:relationship:9e7654ec6cc7ec18|joshi|role|coal';
export const CASE_EDGE = 'case:india-ambani:edge:1:1';
export const CROSSING_CENTER = Object.freeze([76.329121982, 21.999570445240124]);
// Chromium's recorded MouseEvent client coordinates are integer CSS pixels.
// This is only fixture navigation accuracy, never a raster/picking threshold.
export const ATLAS_CENTER_ERROR_PX = 1;
export function atlasCenterReached(delta) {
  return delta.length === 2 && delta.every(value => Number.isFinite(value) && Math.abs(value) <= ATLAS_CENTER_ERROR_PX);
}
export const REQUIRED_ZOOMS = Object.freeze([4.5, 5.9, 6, 8, 16, 17, 18, 19]);
export const BASELINE_COMMIT = '85702ec5f553415e009a37e89d7333c96c952c66';
export const LIVE_ATLAS_URL = 'https://occult-kranti.github.io/india-corporate-intelligence/spatial/';
export const PREFIX = '/india-corporate-intelligence/spatial/';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function requireAuthorizedCI(env = process.env) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'Native zoom review is restricted to GitHub Actions. No local browser was launched.');
  assert.equal(env.SPATIAL_BROWSER_REVIEW, 'github-actions', 'Native zoom review requires the authorized spatial CI workflow.');
}
export function parseMode(args) {
  if (!args.length) return 'candidate';
  if (args.length === 1 && args[0] === '--live-diagnostic') return 'live-diagnostic';
  assert.deepEqual(args, ['--baseline-diagnostic'], 'Only --baseline-diagnostic or --live-diagnostic is supported; candidate is strict by default.');
  return 'baseline-diagnostic';
}
export function mercator([lng, lat]) {
  return [(lng + 180) / 360, (180 - 180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))) / 360];
}
export function diagnosticStatus(mode, checks) {
  if (checks.some(check => check.status === 'failed')) return 'failed';
  return mode === 'candidate' ? 'passed' : checks.some(check => /failure|unsupported/.test(check.status)) ? 'diagnostic-incomplete' : 'diagnostic-only';
}
export function panDelta(center, destination, zoom) {
  const a = mercator(center), b = mercator(destination), scale = 512 * 2 ** zoom;
  return [(a[0] - b[0]) * scale, (a[1] - b[1]) * scale];
}
/** MapLibre 6.13 activates at 3 CSS px; CaseInputAdapter requires >5 px.
 * Always activate with one deliberate 12 px move before the exact correction.
 * A short correction returns along the same held drag, so it cannot be a click. */
export function dragOffsets(delta) {
  assert.ok(delta.length === 2 && delta.every(Number.isFinite), 'Invalid pointer delta');
  const distance = Math.hypot(...delta);
  assert.ok(distance > 0, 'A zero correction must not send a pointer gesture');
  return [delta.map(value => value / distance * 12), [...delta]];
}

/** Serialized read-only DOM hit testing; no overlay dismissal, style or camera changes.
 * Check the entire route, including its activation leg, against the exact input surface. */
export function findClearGesture({ selector, offsets = [] }) {
  const surface = document.querySelector(selector);
  const describe = element => element ? { tag: element.tagName, id: element.id, class: element.getAttribute('class'), label: element.getAttribute('aria-label') } : null;
  if (!surface) return { plan: null, selector, reason: 'Input surface is missing' };
  const rect = surface.getBoundingClientRect(), inset = 8;
  const bounds = { left: Math.max(0, rect.left) + inset, top: Math.max(0, rect.top) + inset,
    right: Math.min(innerWidth, rect.right) - inset, bottom: Math.min(innerHeight, rect.bottom) - inset };
  const blocked = new Map(); let attempts = 0, samples = 0;
  const hit = point => {
    samples++;
    const target = document.elementFromPoint(point.x, point.y), clear = target === surface;
    if (!clear) { const key = JSON.stringify(describe(target)); blocked.set(key, (blocked.get(key) ?? 0) + 1); }
    return clear;
  };
  const inBounds = point => point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom;
  const candidates = [[.5,.5],[.5,.6],[.7,.5],[.3,.5],[.65,.65],[.35,.65]].map(([x,y]) => ({ x: rect.x + rect.width * x, y: rect.y + rect.height * y }));
  for (let y = bounds.top; y <= bounds.bottom; y += 16)
    for (let x = bounds.left; x <= bounds.right; x += 16) candidates.push({ x, y });
  for (const start of candidates) {
    attempts++;
    const points = [start, ...offsets.map(([x,y]) => ({ x: start.x + x, y: start.y + y }))];
    if (!points.every(inBounds)) continue;
    let clear = true;
    for (let i = 0; clear && i < points.length; i++) {
      const a = points[Math.max(0, i - 1)], b = points[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
      for (let step = 0; clear && step <= steps; step++) {
        const x = a.x + (b.x - a.x) * step / steps, y = a.y + (b.y - a.y) * step / steps;
        // A small clear corridor avoids sitting directly on a label/control boundary.
        clear = [[0,0],[-3,0],[3,0],[0,-3],[0,3]].every(([dx,dy]) => hit({ x: x + dx, y: y + dy }));
      }
    }
    if (clear) return { plan: { start, points: points.slice(1) }, selector, bounds, attempts, samples,
      hitTargets: points.map(point => ({ ...point, target: describe(document.elementFromPoint(point.x, point.y)) })) };
  }
  return { plan: null, selector, bounds, attempts, samples, blockedTargets: [...blocked].map(([target,count]) => ({ target: JSON.parse(target), count })) };
}

/** Serialized diagnostic snapshot also survives a failure before the first GL checkpoint. */
export function navigationSnapshot() {
  const host = document.querySelector('.webgl-host'), inspector = document.querySelector('.evidence-inspector'), workspace = document.querySelector('[data-case-workspace]');
  const parse = text => { try { return JSON.parse(text ?? 'null'); } catch { return text; } };
  return { geographicPose: parse(host?.dataset.geographicPose), renderedEdgeIds: parse(host?.dataset.renderedEdgeIds),
    inspector: inspector ? { metadata: parse(inspector.querySelector('.retained-metadata pre')?.textContent), rect: inspector.getBoundingClientRect().toJSON() } : null,
    caseSelection: workspace?.dataset.caseSelection ?? null, caseView: workspace?.dataset.caseView ?? null,
    canvas: host?.querySelector('canvas')?.getBoundingClientRect().toJSON() ?? null,
    viewport: { width: innerWidth, height: innerHeight } };
}
export function clipSegment(a, b, width, height) {
  let lo = 0, hi = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0]], [dx, width - a[0]], [-dy, a[1]], [dy, height - a[1]]]) {
    if (!p) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) lo = Math.max(lo, t); else hi = Math.min(hi, t);
    if (lo > hi) return null;
  }
  return [[a[0] + lo * dx, a[1] + lo * dy], [a[0] + hi * dx, a[1] + hi * dy]];
}
/** Portable, serialized pixel analysis. Expected points are the original draw's projected
 * centerline in CSS coordinates, never a line fitted to the observed changed pixels.
 * A pixel footprint contributes at most one device pixel at each edge; .25 CSS px
 * is the explicit projection/sample tolerance. No candidate raster tunes this bound. */
export function analyzePathRaster(a, b, expected) {
  const encode = pixels => { let text = ''; for (let i = 0; i < pixels.length; i += 4096) text += String.fromCharCode(...pixels.subarray(i, i + 4096)); return btoa(text); };
  const quantile = (values, q) => { const sorted = [...values].sort((x,y) => x-y); return sorted.length ? sorted[Math.floor((sorted.length - 1) * q)] : 0; };
  const mask = new Uint8Array(a.width * a.height), magnitude = new Float32Array(mask.length);
  let changedPixels = 0, minX = a.width, minY = a.height, maxX = -1, maxY = -1;
  const columns = new Set(), rows = new Set();
  for (let i = 0; i < a.pixels.length; i += 4) {
    const delta = Math.max(...[0,1,2].map(c => Math.abs(a.pixels[i+c] - b.pixels[i+c])));
    magnitude[i/4] = delta; if (delta < 2) continue;
    mask[i/4] = 1; const x = i/4 % a.width, y = Math.floor(i/4/a.width); changedPixels++;
    minX = Math.min(minX,x); maxX = Math.max(maxX,x); minY = Math.min(minY,y); maxY = Math.max(maxY,y); columns.add(x); rows.add(y);
  }
  const major = maxX-minX >= maxY-minY ? {values:columns,lo:minX,hi:maxX,scale:a.sx} : {values:rows,lo:minY,hi:maxY,scale:a.sy};
  let gap = 0, maxGap = 0; for (let i=major.lo;i<=major.hi;i++) { gap=major.values.has(i)?0:gap+1;maxGap=Math.max(maxGap,gap); }
  const spanCss = changedPixels ? Math.hypot((maxX-minX+1)/a.sx,(maxY-minY+1)/a.sy) : 0;
  const result = { changedPixels, spanCss, coverage:changedPixels?major.values.size/(major.hi-major.lo+1):0,
    maxGapCss:maxGap/major.scale, meanWidthCss:spanCss?changedPixels/(a.sx*a.sy)/spanCss:0,
    changedColumns:columns.size, changedRows:rows.size, bounds:changedPixels?{minX,minY,maxX,maxY}:null,
    roi:{x:a.x,y:a.y,width:a.width,height:a.height,sx:a.sx,sy:a.sy,cssLeft:a.cssLeft,cssTop:a.cssTop},
    beforeRgbaBase64: encode(a.pixels), afterRgbaBase64: encode(b.pixels),
    sampleMethod:'native readPixels immediately before/after the exact original thread draw' };
  if (!expected?.points?.length || !Number.isFinite(expected.nominalWidthCss)) return {...result,path:{error:'Missing original projected path or source-derived width'}};
  const aaCss = 1 / Math.min(a.sx,a.sy), projectionToleranceCss = .25;
  const nominal = expected.nominalWidthCss, upper = nominal + 2*aaCss + 2*projectionToleranceCss;
  const lower = Math.max(.4, nominal * (expected.kind === 'atlas' ? Math.cos(Math.PI/5) : 1) - 2*aaCss - 2*projectionToleranceCss);
  const corridor = nominal/2 + aaCss + projectionToleranceCss, step = .5 / Math.max(a.sx,a.sy);
  const widthCss = a.width/a.sx, heightCss=a.height/a.sy, inset=corridor+1;
  const labels=new Int32Array(mask.length),componentSizes=[];
  for(let start=0;start<mask.length;start++)if(mask[start]&&!labels[start]) {
    const label=componentSizes.length+1,queue=[start];labels[start]=label;let size=0;
    for(let head=0;head<queue.length;head++){const index=queue[head],x=index%a.width,y=Math.floor(index/a.width);size++;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if((!dx&&!dy)||x+dx<0||x+dx>=a.width||y+dy<0||y+dy>=a.height)continue;const next=(y+dy)*a.width+x+dx;if(mask[next]&&!labels[next]){labels[next]=label;queue.push(next);}}}
    componentSizes.push(size);
  }
  const groups=new Map();
  const points=expected.points.map(p=>[p[0]-a.cssLeft,p[1]-a.cssTop,p[2]??null]);
  const samplePixel=(x,y)=>{const px=Math.floor(x*a.sx),py=a.height-1-Math.floor(y*a.sy);return px>=0&&px<a.width&&py>=0&&py<a.height?py*a.width+px:-1;};
  const intended = distance => { if (!expected.dash?.period) return true; let phase=((distance%expected.dash.period)+expected.dash.period)%expected.dash.period;
    return expected.dash.stops.findIndex(stop=>phase<stop)%2 === 0; };
  // Clip each original segment before sampling, so huge zoom-19 offscreen endpoints
  // cannot create millions of samples or a changed-pixel-dependent denominator.
  const clip=(p,q)=>{let lo=0,hi=1;const dx=q[0]-p[0],dy=q[1]-p[1];for(const [v,w]of[[-dx,p[0]-inset],[dx,widthCss-inset-p[0]],[-dy,p[1]-inset],[dy,heightCss-inset-p[1]]]){if(!v){if(w<0)return null;continue;}const t=w/v;if(v<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return null;}return [lo,hi];};
  const samples=[], widths=[], contrasts=[], offsets=[]; let totalLength=0, missing=0, longestMissing=0, supportedLength=0, expectedLength=0;
  for(let s=1;s<points.length;s++) {
    const p=points[s-1],q=points[s],dx=q[0]-p[0],dy=q[1]-p[1],length=Math.hypot(dx,dy),range=clip(p,q);if(!length||!range)continue;
    const [lo,hi]=range, count=Math.max(1,Math.ceil((hi-lo)*length/step)), weight=(hi-lo)*length/count; totalLength+=(hi-lo)*length;
    for(let j=0;j<count;j++) {
      const t=lo+(hi-lo)*(j+.5)/count,x=p[0]+dx*t,y=p[1]+dy*t,d=p[2]!==null&&q[2]!==null?p[2]+(q[2]-p[2])*t:0;
      if(!intended(d)){missing=0;continue;}expectedLength+=weight;
      const groupKey=expected.dash?.period?`${Math.floor(d/expected.dash.period)}:${expected.dash.stops.findIndex(stop=>((d%expected.dash.period)+expected.dash.period)%expected.dash.period<stop)}`:'solid';
      if(!groups.has(groupKey))groups.set(groupKey,{expected:0,components:new Map()});const group=groups.get(groupKey);group.expected+=weight;
      const nx=-dy/length,ny=dx/length, seen=new Set(),active=[];
      // Scan a wide perpendicular interval as well as the acceptance corridor:
      // otherwise an 80px smear is silently clipped down into a plausible width.
      const scan=Math.min(64,Math.max(16,corridor*4));
      for(let offset=-scan;offset<=scan;offset+=step){const index=samplePixel(x+nx*offset,y+ny*offset);if(index<0||seen.has(index))continue;seen.add(index);if(mask[index])active.push({offset,index});}
      const near=active.filter(v=>Math.abs(v.offset)<=corridor), has=near.length>0;
      const width=active.length?Math.max(...active.map(v=>v.offset))-Math.min(...active.map(v=>v.offset))+1/Math.max(a.sx,a.sy):0;
      const contrast=near.length?Math.max(...near.map(v=>magnitude[v.index])):0;
      if(has){for(const label of new Set(near.map(v=>labels[v.index])))group.components.set(label,(group.components.get(label)??0)+weight);supportedLength+=weight;missing=0;widths.push(width);contrasts.push(contrast);offsets.push(Math.min(...near.map(v=>Math.abs(v.offset))));}else{missing+=weight;longestMissing=Math.max(longestMissing,missing);}
      samples.push({x:x+a.cssLeft,y:y+a.cssTop,supported:has,widthCss:width,contrast,maxGapCss:missing});
    }
  }
  const connectedCoverage=groups.size?Math.min(...[...groups.values()].map(group=>Math.max(0,...group.components.values())/group.expected)):0;
  result.path={connectedCoverage,componentCount:componentSizes.length,largestComponentPixels:Math.max(0,...componentSizes),expectedArcCss:expectedLength,clippedArcCss:totalLength,coverage:expectedLength?supportedLength/expectedLength:0,maxMissingArcCss:longestMissing,
    nominalWidthCss:nominal,widthEnvelopeCss:{min:lower,max:upper},antiAliasEdgeToleranceCss:aaCss,projectionToleranceCss,
    widthCss:{p10:quantile(widths,.1),p50:quantile(widths,.5),p90:quantile(widths,.9),max:quantile(widths,1)},
    contrast255:{p10:quantile(contrasts,.1),p50:quantile(contrasts,.5),p90:quantile(contrasts,.9)},
    centerOffsetCss:{p50:quantile(offsets,.5),p90:quantile(offsets,.9)},samples};
  return result;
}

export function assertPathEvidence(raster, label) {
  const p=raster?.path;
  assert.ok(p&&!p.error, `${label}: missing original-path raster analysis`);
  assert.ok(p.expectedArcCss>=16 && p.coverage>=.8 && p.maxMissingArcCss<=4,
    `${label}: expected-path support failed (arc=${p.expectedArcCss?.toFixed(2)}, coverage=${p.coverage?.toFixed(3)}, gap=${p.maxMissingArcCss?.toFixed(2)})`);
  assert.ok(p.connectedCoverage>=.8,`${label}: expected dash/solid interval is split across disconnected components`);
  assert.ok(p.widthCss.p10>=p.widthEnvelopeCss.min && p.widthCss.p90<=p.widthEnvelopeCss.max && p.widthCss.max<=p.widthEnvelopeCss.max+1,
    `${label}: local width outside source-derived envelope (p10=${p.widthCss.p10.toFixed(2)}, p90=${p.widthCss.p90.toFixed(2)}, max=${p.widthCss.max.toFixed(2)}, allowed=${p.widthEnvelopeCss.min.toFixed(2)}..${p.widthEnvelopeCss.max.toFixed(2)})`);
  // 8/255 is a declared minimum useful digital contrast (not an opacity estimate).
  // Per-path maxima avoid confusing antialiased edge pixels with the ribbon core.
  assert.ok(p.contrast255.p10>=4 && p.contrast255.p50>=8, `${label}: displayed thread contrast is below the explicit 8/255 core floor`);
}

export function assertRasterEvidence(row, label) {
  assert.ok(row?.draws?.length, `${label}: exact thread had no native draw submission`);
  const samples = row.draws.filter(draw => draw.nativePositionBufferMatched === true && draw.raster && !draw.raster.error);
  assert.ok(samples.length, `${label}: no native before/after raster sample`);
  // Preserve every original substantive raster floor. Raw pixels stay in the artifact,
  // never in thrown errors / CI logs (one failed capture can contain megabytes).
  assert.ok(samples.some(({ raster: r }) => r.changedPixels >= 8 && r.spanCss >= 16 && r.meanWidthCss >= .4 && r.coverage >= .8 && r.maxGapCss <= 4),
    `${label}: native draw did not produce a continuous readable raster strip (${samples.length} samples; inspect report raw pixels)`);
  assert.ok(row.canvas.width > 0 && row.canvas.height > 0 && row.buffer.width > 0 && row.buffer.height > 0, `${label}: missing canvas/buffer bounds`);
  assert.equal(row.contextLost, false, `${label}: native context lost`);
  const frames=(row.frames??[]).filter(frame=>frame.complete&&frame.poseKey===row.finalPoseKey);
  assert.ok(frames.length>=3, `${label}: need three complete frames at the final settled pose`);
  assert.equal(row.frames.at(-1)?.poseKey,row.finalPoseKey,`${label}: last complete frame is stale`);
  // Every sampled settled frame is checked, not the first successful draw or an
  // arbitrary first-eight cap. Zero incremental redundant overdraw is allowed only
  // when another original draw in that SAME complete frame survives visibly.
  for(const frame of frames) {
    const final=frame.finalCanvas;
    assert.ok(final&&!final.error,`${label}: final canvas unavailable at frame ${frame.token}: ${final?.error??'missing'}`);
    assert.equal(final.poseKey,row.finalPoseKey,`${label}: final canvas has stale pose`);
    assert.equal(final.meshUuid,row.meshUuid,`${label}: final canvas source mesh changed`);
    assert.equal(final.defaultFramebuffer,true,`${label}: final strip was not sampled from the default canvas`);
    const draw=row.draws.find(d=>d.drawId===final.sourceDrawId);
    assert.ok(draw?.nativePositionBufferMatched&&draw.poseKey===frame.poseKey,`${label}: final strip is not tied to an original matching-pose native draw`);
    assert.ok(Number.isSafeInteger(draw.programId)&&Number.isSafeInteger(draw.positionBufferId),`${label}: native program/position-buffer identity missing`);
    assert.equal(final.programId,draw.programId,`${label}: final native program identity changed`);
    if(row.kind==='atlas'){
      assert.equal(draw.edgeId,ATLAS_EDGE,`${label}: final source is not the exact original target edge`);
      assert.deepEqual(draw.sourceIds,ATLAS_COINCIDENT_ORIGINALS[0].sourceIds,`${label}: original target source IDs changed`);
      assert.equal(draw.material?.type,'MeshStandardMaterial',`${label}: original wool material family changed`);assert.equal(draw.material.opacity,.9,`${label}: original material opacity changed`);assert.equal(draw.nativeOpacity,Math.fround(.9),`${label}: native opacity uniform changed`);
      assert.equal(final.colorAgreementTolerance255,8,`${label}: final native contribution agreement changed`);
      assert.ok(final.contributions?.length,`${label}: missing observed original contribution chain`);
      assert.equal(final.contributions[0].drawId,draw.drawId,`${label}: contribution chain lost its original target draw`);
      for(const receipt of final.contributions) {
        const original=receipt.drawId!==null?row.draws.find(d=>d.drawId===receipt.drawId):(row.contributions??[]).find(d=>d.contributionId===receipt.contributionId);
        const fixture=ATLAS_COINCIDENT_ORIGINALS.find(f=>f.edgeId===receipt.edgeId);
        assert.ok(fixture&&original?.nativePositionBufferMatched&&original.poseKey===frame.poseKey&&original.frameToken===frame.token,`${label}: contribution is not a same-frame original source/mesh draw`);
        assert.deepEqual(receipt.sourceIds,fixture.sourceIds,`${label}: contribution source IDs changed`);
        for(const key of ['edgeId','meshUuid','programId','positionBufferId','observationOrdinal'])assert.equal(receipt[key],original[key],`${label}: native contribution ${key} identity changed`);
        assert.ok(receipt.observationOrdinal>=draw.observationOrdinal,`${label}: contribution predates the target proof`);
        assert.equal(receipt.pathMatch?.targetMeshUuid,row.meshUuid,`${label}: contribution follows another mesh path`);
        assert.equal(receipt.pathMatch?.meshUuid,receipt.meshUuid,`${label}: contribution path/mesh identity changed`);
        assert.ok(receipt.drawId!==null?frame.drawIds.includes(receipt.drawId):frame.contributionIds?.includes(receipt.contributionId),`${label}: contribution borrowed another frame`);
      }
    }
    if(row.kind==='atlas')assert.ok(frame.drawIds.includes(draw.drawId),`${label}: atlas frame reused an earlier successful draw`);
    else assert.ok(frame.composites.some(c=>c.textureId===draw.textureId&&c.defaultFramebuffer),`${label}: exact case texture was not sampled by this frame's default-canvas composite`);
    assertPathEvidence(draw.raster,`${label} original draw`);
    assertPathEvidence(final.raster,`${label} final frame ${frame.token}`);
  }
  assert.ok(row.screenshotEvidence&&!row.screenshotEvidence.error,`${label}: final displayed screenshot crossing is unavailable`);
  assertPathEvidence(row.screenshotEvidence.raster,`${label} displayed screenshot`);
}

export function assertComparableZoomEvidence(rows) {
  const comparable=rows.filter(row=>row.kind==='atlas'&&row.pose.pitch===0&&row.pose.bearing===0);
  for(let i=1;i<comparable.length;i++) {
    const a=comparable[0],b=comparable[i],x=a.frames?.at(-1)?.finalCanvas?.raster?.path,y=b.frames?.at(-1)?.finalCanvas?.raster?.path;
    assert.ok(x&&y,'Comparable zoom captures lack final path measurements');
    // The intended radius is constant in CSS. Two independently quantized pixel
    // edges plus each capture's declared projection allowance bound the deviation.
    const allowance=x.antiAliasEdgeToleranceCss+y.antiAliasEdgeToleranceCss+x.projectionToleranceCss+y.projectionToleranceCss;
    assert.ok(Math.abs(x.widthCss.p50-y.widthCss.p50)<=allowance,`Top-down z${b.pose.zoom}: median width changed beyond the two-frame pixel/projection envelope`);
    const ratio=y.contrast255.p50/x.contrast255.p50;
    b.comparableZoom={referenceZoom:a.pose.zoom,widthMedianDeviationCss:y.widthCss.p50-x.widthCss.p50,widthDeviationAllowanceCss:allowance,contrastMedianRatio:ratio,
      contrastMeaning:'Displayed local contrast; not an opacity estimate. Background and shading receipts remain separate.'};
    // No opacity inference is made from cross-zoom backgrounds/shading. Each
    // original and final strip still must meet the absolute contrast floor, and
    // final color must agree with the very same frame's native contribution.
  }
}

export const ATLAS_SOURCE_FIXTURE = Object.freeze({ id:'legacy:source:8c9d47878789e779', url:'https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1573010' });
// Existing retained edges sharing the original Karnataka–Delhi curve, in either
// direction. This closed list is source-checked independently of scene discovery.
export const ATLAS_COINCIDENT_ORIGINALS = Object.freeze([
  {edgeId:ATLAS_EDGE,from:'legacy:entity:joshi',to:'legacy:entity:coal',layer:'people',sourceIds:[ATLAS_SOURCE_FIXTURE.id],urls:[ATLAS_SOURCE_FIXTURE.url]},
  {edgeId:'legacy:relationship:88925b74a92265a2|coal|award|jsw',from:'legacy:entity:coal',to:'legacy:entity:jsw',layer:'procurement',sourceIds:['legacy:source:4377d63d6bbb7bb3'],urls:['https://pib.gov.in/PressReleasePage.aspx?PRID=1975677']},
  {edgeId:'legacy:relationship:1e16c34c899e8848|jsw|pmin|pmcares',from:'legacy:entity:jsw',to:'legacy:entity:pmcares',layer:'funding',sourceIds:['legacy:source:9ce81bf63394c088'],urls:['https://www.deccanherald.com/india/karnataka/jsw-group-donates-rs-100-cr-to-pm-cares-fund-819033.html']},
  {edgeId:'legacy:relationship:fc525907a37b031f|ongc|csr|svyasa',from:'legacy:entity:ongc',to:'legacy:entity:svyasa',layer:'funding',sourceIds:['legacy:source:2979141a17909a70'],urls:['https://www.thenewsminute.com/news/state-owned-ongc-donated-over-rs-668-crore-to-20-sangh-linked-organisations-across-10-years']},
].map(row=>Object.freeze({...row,sourceIds:Object.freeze(row.sourceIds),urls:Object.freeze(row.urls)})));

/** Compare original double-precision CatmullRom control points, never GPU clip
 * attributes or pixels. The allowance is only 64 double ULPs for reversing the
 * equivalent lerps; at zoom 19 it is <0.000004 CSS px in Mercator coordinates. */
export function matchCoincidentOriginalPath(target,candidate) {
  if(!target||!candidate||target.type!=='CatmullRomCurve3'||candidate.type!==target.type||
    candidate.closed!==target.closed||candidate.curveType!==target.curveType||candidate.tension!==target.tension||
    target.points?.length!==5||candidate.points?.length!==5)return null;
  if(![...target.points,...candidate.points].every(p=>p.length===3&&p.every(Number.isFinite)))return null;
  const tolerance=64*Number.EPSILON*Math.max(1,...target.points.flat().map(Math.abs),...candidate.points.flat().map(Math.abs));
  for(const direction of ['forward','reverse']) {
    const error=Math.max(...target.points.flatMap((p,i)=>p.map((v,c)=>Math.abs(v-candidate.points[direction==='forward'?i:4-i][c]))));
    if(error<=tolerance)return {targetEdgeId:target.edgeId,targetMeshUuid:target.meshUuid,edgeId:candidate.edgeId,meshUuid:candidate.meshUuid,
      direction,controlPoints:target.points,candidateControlPoints:candidate.points,maxControlPointError:error,roundoffTolerance:tolerance};
  }
  return null;
}

/** Serialized pure native-pixel attribution. A later repaint is eligible only
 * after exact original ID/source, mesh/buffer, curve, pose and projection checks.
 * It must actually change that pixel: a no-op draw cannot launder an occluder.
 * Neither fitted alpha predictions nor final-minus-background guesses are used. */
export function traceAtlasContributions(source,later,final,fixtures) {
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),delta=(a,b,i)=>Math.max(...[0,1,2].map(c=>Math.abs(a[i+c]-b[i+c])));
  const validPath=p=>{
    if(!p||!['forward','reverse'].includes(p.direction)||p.controlPoints?.length!==5||p.candidateControlPoints?.length!==5||
      ![...p.controlPoints,...p.candidateControlPoints].every(point=>point.length===3&&point.every(Number.isFinite)))return false;
    const error=Math.max(...p.controlPoints.flatMap((point,i)=>point.map((v,c)=>Math.abs(v-p.candidateControlPoints[p.direction==='forward'?i:4-i][c]))));
    return same(p.controlPoints,source.pathMatch?.controlPoints)&&error===p.maxControlPointError&&error<=p.roundoffTolerance&&
      p.roundoffTolerance<=64*Number.EPSILON*Math.max(1,...p.controlPoints.flat().map(Math.abs),...p.candidateControlPoints.flat().map(Math.abs));
  };
  const valid=draw=>{
    const fixture=fixtures.find(row=>row.edgeId===draw.edgeId),p=draw.pathMatch;
    return Boolean(fixture&&same(draw.sourceIds,fixture.sourceIds)&&draw.nativePositionBufferMatched&&
      draw.meshUuid&&Number.isSafeInteger(draw.programId)&&Number.isSafeInteger(draw.positionBufferId)&&
      draw.material?.type==='MeshStandardMaterial'&&draw.material.opacity===.9&&draw.nativeOpacity===Math.fround(.9)&&
      p?.targetEdgeId===source.edgeId&&p.targetMeshUuid===source.meshUuid&&p.edgeId===draw.edgeId&&p.meshUuid===draw.meshUuid&&
      validPath(p)&&
      draw.poseKey===source.poseKey&&draw.frameToken===source.frameToken&&draw.expected?.sourceCount===fixture.sourceIds.length&&
      same(draw.expected?.projectionMatrix,source.expected?.projectionMatrix)&&draw.expected?.lift===source.expected?.lift&&
      draw._source?.before&&draw._source?.after);
  };
  if(!valid(source)||source.edgeId!==fixtures[0]?.edgeId)throw new Error('Final atlas contribution lacks the exact original target source/mesh proof');
  let targetChangedPixels=0;for(let i=0;i<source._source.before.pixels.length;i+=4)if(delta(source._source.before.pixels,source._source.after.pixels,i)>=2)targetChangedPixels++;
  if(targetChangedPixels<8)throw new Error('Coincident originals cannot replace an absent original target contribution');
  const a={...final,pixels:new Uint8Array(final.pixels.length)},b={...final,pixels:new Uint8Array(final.pixels.length)};
  const known=new Uint8Array(final.width*final.height),reference=new Uint8Array(final.pixels.length),receipts=[],rejected=[];
  const grid=region=>[region.width,region.height,region.x,region.y,region.sx,region.sy,region.cssLeft,region.cssTop];
  const records=[source,...later.filter(draw=>draw.observationOrdinal>source.observationOrdinal).sort((a,b)=>a.observationOrdinal-b.observationOrdinal)];
  for(const draw of records) {
    if(!valid(draw)){rejected.push({edgeId:draw.edgeId,observationOrdinal:draw.observationOrdinal,reason:'original identity/path/pose/projection mismatch'});continue;}
    const {before,after}=draw._source;
    if(!same(grid(before),grid(final))||!same(grid(after),grid(final)))throw new Error('Coincident original contribution changed native readback grid');
    let changedPixels=0,restartedPixels=0;
    for(let pixel=0;pixel<known.length;pixel++) {
      const i=pixel*4;if(delta(before.pixels,after.pixels,i)<2)continue;changedPixels++;
      // An intervening unknown painter cannot contribute its contrast to the
      // verified original. Restart from the later original's actual predecessor.
      if(!known[pixel]||delta(before.pixels,reference,i)>8){if(known[pixel])restartedPixels++;for(let c=0;c<3;c++)a.pixels[i+c]=before.pixels[i+c];}
      known[pixel]=1;for(let c=0;c<3;c++)reference[i+c]=after.pixels[i+c];
    }
    receipts.push({edgeId:draw.edgeId,sourceIds:draw.sourceIds,meshUuid:draw.meshUuid,programId:draw.programId,positionBufferId:draw.positionBufferId,
      observationOrdinal:draw.observationOrdinal,drawId:draw.drawId??null,contributionId:draw.contributionId??null,changedPixels,restartedPixels,pathMatch:draw.pathMatch});
  }
  let sourcePixels=0,retainedPixels=0;
  for(let pixel=0;pixel<known.length;pixel++) {
    const i=pixel*4,retained=known[pixel]&&delta(reference,final.pixels,i)<=8;
    if(known[pixel])sourcePixels++;if(retained)retainedPixels++;
    for(let c=0;c<3;c++)b.pixels[i+c]=retained?final.pixels[i+c]:a.pixels[i+c];a.pixels[i+3]=b.pixels[i+3]=255;
  }
  return {before:a,after:b,targetChangedPixels,sourcePixels,retainedPixels,contributions:receipts,rejectedContributions:rejected,colorAgreementTolerance255:8};
}

export async function loadAtlasSourceReference(root=ROOT) {
  const directory=join(root,'public/data/registry'),manifest=JSON.parse(await readFile(join(directory,'manifest.json'),'utf8'));
  const matches={};const receipts=[];
  for(const [kind,id]of [['relationships',ATLAS_EDGE],['sources',ATLAS_SOURCE_FIXTURE.id]]) {
    for(const chunk of manifest.arrays.find(group=>group.key===kind).chunks) {
      const bytes=await readFile(join(directory,chunk.file));assert.equal(sha256(bytes),chunk.sha256,'Accepted atlas reference chunk failed integrity');
      const match=JSON.parse(bytes).find(record=>record.id===id);if(match){assert.equal(matches[kind],undefined,'Duplicate original source reference');matches[kind]=match;receipts.push({file:chunk.file,sha256:chunk.sha256});}
    }
  }
  assert.deepEqual(matches.relationships?.sourceIds,[ATLAS_SOURCE_FIXTURE.id],'Pinned original atlas source IDs changed');
  assert.equal(matches.sources?.url,ATLAS_SOURCE_FIXTURE.url,'Pinned original atlas source URL changed');
  const coincidentReceipts=new Map(),records={relationships:new Map(),sources:new Map()};
  for(const kind of ['relationships','sources'])for(const chunk of manifest.arrays.find(group=>group.key===kind).chunks) {
    const bytes=await readFile(join(directory,chunk.file));assert.equal(sha256(bytes),chunk.sha256,'Coincident original reference chunk failed integrity');
    for(const record of JSON.parse(bytes))if(ATLAS_COINCIDENT_ORIGINALS.some(f=>kind==='relationships'?f.edgeId===record.id:f.sourceIds.includes(record.id))) {
      assert.equal(records[kind].has(record.id),false,'Duplicate coincident original reference');records[kind].set(record.id,record);coincidentReceipts.set(chunk.file,{file:chunk.file,sha256:chunk.sha256});
    }
  }
  for(const fixture of ATLAS_COINCIDENT_ORIGINALS) {
    const edge=records.relationships.get(fixture.edgeId);
    assert.ok(edge,'Missing retained coincident original edge');assert.equal(edge.from,fixture.from);assert.equal(edge.to,fixture.to);
    assert.equal(edge.layers[0],fixture.layer);assert.deepEqual(edge.sourceIds,fixture.sourceIds,'Coincident original source IDs changed');
    assert.deepEqual(fixture.sourceIds.map(id=>records.sources.get(id)?.url),fixture.urls,'Coincident original source URLs changed');
  }
  return {edgeId:ATLAS_EDGE,sourceId:ATLAS_SOURCE_FIXTURE.id,url:ATLAS_SOURCE_FIXTURE.url,receipts,
    coincidentOriginals:ATLAS_COINCIDENT_ORIGINALS,coincidentReceipts:[...coincidentReceipts.values()]};
}
export function assertExactSourceLinks(actual, expected, label) {
  assert.ok(expected.length,`${label}: missing accepted source expectations`);
  assert.deepEqual(actual.map(link=>link.sourceId),expected.map(link=>link.sourceId),`${label}: exact source IDs changed`);
  assert.deepEqual(actual.map(link=>link.href),expected.map(link=>link.href),`${label}: exact source URLs are missing or changed`);
  for(const link of actual){const url=new URL(link.href);assert.equal(url.protocol,'https:',`${label}: source link is not HTTPS`);assert.ok(!url.username&&!url.password,`${label}: credential-bearing source URL`);}
}
export function recordCheck(report, label, work, diagnostic = false) {
  try { work(); report.checks.push({ label, status: 'passed' }); }
  catch (error) { report.checks.push({ label, status: diagnostic === 'live' ? 'live-diagnostic-failure' : diagnostic ? 'baseline-diagnostic-failure' : 'failed', message: error.message }); }
}

/** Serialized with addInitScript. Native GL methods, rAF timestamps and the official read-only
 * Three observer are observed without changing callback arguments or draw behavior. Upload-array identity maps a real GPU buffer back to
 * the original mesh. No renderer methods, factual arrays, uniforms or matrices are patched. */
export function installThreadZoomProbe({ atlasEdge, caseEdge, atlasSourceCount = 1, coincidentOriginals = [] }) {
  const scenes = [], contexts = [], renderers = [], buffers = new WeakMap(), shaderSources = new WeakMap(), programSources = new WeakMap();
  const nativeGetContext = HTMLCanvasElement.prototype.getContext;
  const state = { active: null, captures: {}, errors: [], versions: [], contexts: [], renderers: 0, inputs: [], programs: {}, frameTimestamp: null };
  const originalRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => originalRAF(timestamp => { state.frameTimestamp = timestamp; return callback(timestamp); });
  const poseKey = snap => JSON.stringify([snap?.pose, snap?.canvas, snap?.caseView, snap?.kind === 'case' ? snap?.geometry?.points : null]);
  const observer = new EventTarget();
  observer.addEventListener('register', event => state.versions.push(event.detail.revision));
  observer.addEventListener('observe', event => {
    const value = event.detail;
    if (value?.isScene) scenes.push(value);
    if (value?.isWebGLRenderer) { renderers.push(value); state.renderers = renderers.length; }
  });
  if (typeof window.__THREE_DEVTOOLS__ !== 'undefined') throw new Error('Zoom probe refuses to replace an existing Three observer');
  window.__THREE_DEVTOOLS__ = observer;
  const rect = element => element?.getBoundingClientRect().toJSON() ?? null;
  const hostPose = () => {
    try { return JSON.parse(document.querySelector('.webgl-host')?.dataset.geographicPose ?? 'null')?.pose ?? null; }
    catch { return null; }
  };
  const inputTarget = element => element instanceof Element ? { tag: element.tagName, id: element.id,
    class: element.getAttribute('class'), label: element.getAttribute('aria-label') } : null;
  // Passive capture observes real input, including a click later suppressed by MapLibre.
  // It never dispatches events, changes handlers or prevents their normal behavior.
  for (const type of ['mousedown','mousemove','mouseup','click','wheel','keydown']) window.addEventListener(type, event => {
    if (type === 'mousemove' && !event.buttons) return;
    const row = { type, time: performance.now(), trusted: event.isTrusted, x: event.clientX ?? null, y: event.clientY ?? null,
      buttons: event.buttons ?? null, key: event.key ?? null, deltaY: event.deltaY ?? null, target: inputTarget(event.target),
      hitTarget: Number.isFinite(event.clientX) ? inputTarget(document.elementFromPoint(event.clientX, event.clientY)) : null, pose: hostPose() };
    state.inputs.push(row);
    queueMicrotask(() => { row.defaultPrevented = event.defaultPrevented; });
  }, { capture: true, passive: true });
  const inside = (p, box) => p[0] >= 0 && p[0] <= box.width && p[1] >= 0 && p[1] <= box.height;
  function atlasMesh() {
    for (const scene of scenes) {
      let found; scene.traverse(object => { if (object.userData?.edgeId === atlasEdge) found = object; });
      if (found?.parent) return found;
    }
    return null;
  }
  function originalPathDescriptor(mesh) {
    const curve=mesh?.geometry.parameters?.path;
    return curve&&{edgeId:mesh.userData.edgeId,meshUuid:mesh.uuid,type:curve.type,closed:curve.closed,curveType:curve.curveType,tension:curve.tension,
      points:curve.points?.map(p=>[p.x,p.y,p.z])};
  }
  function atlasDrawMesh(actualBuffer) {
    const target=atlasMesh();if(!target||!actualBuffer)return null;
    // Only already-admitted siblings, never fabricated curves or scene changes.
    const admitted=JSON.parse(document.querySelector('.webgl-host')?.dataset.renderedEdgeIds??'[]');
    const matches=target.parent.children.filter(mesh=>coincidentOriginals.some(f=>f.edgeId===mesh.userData?.edgeId)&&admitted.includes(mesh.userData.edgeId)&&
      buffers.get(mesh.geometry?.attributes.position?.array)===actualBuffer);
    if(matches.length!==1)return null;
    const mesh=matches[0],pathMatch=window.__threadZoomMatchPath(originalPathDescriptor(target),originalPathDescriptor(mesh));
    if(!pathMatch)return null;
    return {mesh,target,pathMatch,fixture:coincidentOriginals.find(f=>f.edgeId===mesh.userData.edgeId)};
  }
  function caseMeshes() {
    const roots = scenes.filter(scene => scene.children.some(object => object.isGroup && object.children.some(mesh => mesh.geometry?.attributes.distanceAlong)));
    const root = roots.at(-1), meshes = [];
    root?.traverse(mesh => { if (mesh.renderOrder === 11 && mesh.geometry?.attributes.distanceAlong) meshes.push(mesh); });
    const ids = [...document.querySelectorAll('.ocv2-evidence [data-edge-id]')].map(element => element.dataset.edgeId);
    // At detail zoom all roles are represented in source order. Reject ambiguity.
    return { mesh: ids.length === meshes.length ? meshes[ids.indexOf(caseEdge)] : null, ids, count: meshes.length };
  }
  function atlasGeometry(mesh, canvas) {
    const pose = hostPose();
    if (!mesh || !pose) return null;
    const curve = mesh.geometry.parameters?.path;
    if (!curve) return null;
    const m = ([lng, lat]) => [(lng + 180) / 360, (180 - 180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))) / 360];
    const center = m(pose.center), size = rect(canvas), scale = 512 * 2 ** pose.zoom;
    const points = curve.getSpacedPoints(48).map(p => [(p.x - center[0]) * scale + size.width / 2, (p.y - center[1]) * scale + size.height / 2]);
    return { points, endpoints: [points[0], points.at(-1)], bothEndpointsOffscreen: !inside(points[0], size) && !inside(points.at(-1), size), topDownOnly: pose.pitch === 0 && pose.bearing === 0 };
  }
  function caseGeometry(mesh) {
    const board = rect(document.querySelector('[data-case-surface]'));
    if (!mesh || !board) return null;
    const p = mesh.geometry.attributes.position.array, count = mesh.geometry.drawRange.count / 6;
    const center = index => [((p[index] + p[index + 3]) / 2 + 1) * board.width / 2, (1 - (p[index + 1] + p[index + 4]) / 2) * board.height / 2];
    const points = Array.from({ length: count }, (_, i) => center(i * 12));
    points.push(center((count - 1) * 12 + 6));
    return { board, points, endpoints: [points[0], points.at(-1)], bothEndpointsOffscreen: !inside(points[0], board) && !inside(points.at(-1), board) };
  }
  function snapshot(kind) {
    const context = contexts.find(row => row.canvas === document.querySelector('.webgl-host canvas'));
    if (!context) return null;
    const mesh = kind === 'atlas' ? atlasMesh() : caseMeshes().mesh;
    return { kind, edgeId: kind === 'atlas' ? atlasEdge : caseEdge, canvas: rect(context.canvas), buffer: { width: context.gl.drawingBufferWidth, height: context.gl.drawingBufferHeight },
      pose: hostPose(), geometry: kind === 'atlas' ? atlasGeometry(mesh, context.canvas) : caseGeometry(mesh),
      meshObserved: Boolean(mesh), meshUuid: mesh?.uuid ?? null, meshVisibleDiagnosticOnly: mesh?.visible ?? null, contextLost: context.native.isContextLost(),
      visibleEdgeIds: kind === 'atlas' ? JSON.parse(document.querySelector('.webgl-host')?.dataset.renderedEdgeIds ?? '[]') : caseMeshes().ids,
      semanticMode: document.querySelector('.webgl-host')?.dataset.semanticMode, caseSelection: document.querySelector('[data-case-workspace]')?.dataset.caseSelection ?? null,
      caseView: document.querySelector('[data-case-workspace]')?.dataset.caseView ?? null };
  }
  function instrument(gl, canvas) {
    if (contexts.some(row => row.gl === gl)) return;
    if (!(gl instanceof WebGL2RenderingContext)) throw new Error('Native zoom probe requires real WebGL2');
    const native = {};
    for (let proto=gl;proto&&proto!==Object.prototype;proto=Object.getPrototypeOf(proto))
      for(const name of Object.getOwnPropertyNames(proto))if(!(name in native)){const descriptor=Object.getOwnPropertyDescriptor(proto,name);if(typeof descriptor?.value==='function')native[name]=descriptor.value.bind(gl);}
    const row={gl,canvas,native};contexts.push(row);
    const ids=new WeakMap();let nextId=1;const id=value=>{if(!value)return null;if(!ids.has(value))ids.set(value,nextId++);return ids.get(value);};
    const debug=native.getExtension('WEBGL_debug_renderer_info');state.contexts.push({version:native.getParameter(gl.VERSION),renderer:native.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER)});
    gl.bufferData=function(target,data,...rest){const value=native.bufferData(target,data,...rest);if(ArrayBuffer.isView(data))buffers.set(data,native.getParameter(target===gl.ARRAY_BUFFER?gl.ARRAY_BUFFER_BINDING:gl.ELEMENT_ARRAY_BUFFER_BINDING));return value;};
    gl.bufferSubData=function(target,offset,data,...rest){const value=native.bufferSubData(target,offset,data,...rest);if(ArrayBuffer.isView(data))buffers.set(data,native.getParameter(target===gl.ARRAY_BUFFER?gl.ARRAY_BUFFER_BINDING:gl.ELEMENT_ARRAY_BUFFER_BINDING));return value;};
    gl.shaderSource=function(shader,source){shaderSources.set(shader,String(source));return native.shaderSource(shader,source);};
    gl.attachShader=function(program,shader){programSources.set(program,[...(programSources.get(program)??[]),shaderSources.get(shader)??'']);return native.attachShader(program,shader);};
    let textureUnit=native.getParameter(gl.ACTIVE_TEXTURE)-gl.TEXTURE0;
    const textures=new Map([[textureUnit,native.getParameter(gl.TEXTURE_BINDING_2D)]]);
    gl.activeTexture=function(unit){const result=native.activeTexture(unit);textureUnit=unit-gl.TEXTURE0;return result;};
    gl.bindTexture=function(target,texture){const result=native.bindTexture(target,texture);if(target===gl.TEXTURE_2D)textures.set(textureUnit,texture);return result;};
    const uniform=(program,name)=>{const loc=native.getUniformLocation(program,name);if(loc===null)return null;const value=native.getUniform(program,loc);return ArrayBuffer.isView(value)?Array.from(value):value;};
    function readRegion(kind, finalCanvas=false) {
      const viewport=Array.from(native.getParameter(gl.VIEWPORT)),defaultTarget=native.getParameter(gl.DRAW_FRAMEBUFFER_BINDING)===null;
      if((finalCanvas||kind==='atlas')!==defaultTarget)throw new Error('Thread drew into the wrong native framebuffer');
      if(native.getParameter(gl.READ_FRAMEBUFFER_BINDING)!==native.getParameter(gl.DRAW_FRAMEBUFFER_BINDING))throw new Error('Probe refuses to change framebuffer bindings for readback');
      const box=kind==='atlas'?rect(canvas):rect(document.querySelector('[data-case-surface]')),canvasBox=rect(canvas);
      const sx=defaultTarget?gl.drawingBufferWidth/canvasBox.width:viewport[2]/box.width,sy=defaultTarget?gl.drawingBufferHeight/canvasBox.height:viewport[3]/box.height;
      const available=defaultTarget?[gl.drawingBufferWidth,gl.drawingBufferHeight]:viewport.slice(2);
      const width=Math.min(available[0],Math.max(1,Math.ceil(160*sx))),height=Math.min(available[1],Math.max(1,Math.ceil(128*sy)));
      const originX=defaultTarget?(box.x-canvasBox.x)*sx:viewport[0],originY=defaultTarget?gl.drawingBufferHeight-(box.y-canvasBox.y+box.height)*sy:viewport[1];
      const center=state.active?.sampleCenter??[box.width/2,box.height/2];
      if(center.length!==2||!center.every(Number.isFinite))throw new Error('Invalid preselected native witness center');
      const x=Math.round(originX+center[0]*sx-width/2),y=Math.round(originY+(box.height-center[1])*sy-height/2);
      if(x<0||y<0||x+width>available[0]+(defaultTarget?0:viewport[0])||y+height>available[1]+(defaultTarget?0:viewport[1]))throw new Error('Expected crossing ROI leaves framebuffer');
      for(const name of ['PACK_ROW_LENGTH','PACK_SKIP_PIXELS','PACK_SKIP_ROWS'])if(native.getParameter(gl[name])!==0)throw new Error(`Unexpected ${name}`);
      if(native.getParameter(gl.PIXEL_PACK_BUFFER_BINDING))throw new Error('Unexpected pixel pack buffer');
      const pixels=new Uint8Array(width*height*4);native.readPixels(x,y,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      return {pixels,width,height,x,y,sx,sy,cssLeft:(x-originX)/sx,cssTop:box.height-(y-originY+height)/sy,viewport};
    }
    const encode=pixels=>{let text='';for(let i=0;i<pixels.length;i+=4096)text+=String.fromCharCode(...pixels.subarray(i,i+4096));return btoa(text);};
    function rasterDelta(a,b,expected){return window.__threadZoomAnalyze(a,b,expected);}
    const transform=(m,p)=>[0,1,2,3].map(r=>m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]*(p[3]??1));
    function expectedPath(kind,mesh,program,region) {
      if(kind==='case') {
        const geometry=caseGeometry(mesh),d=mesh.geometry.attributes.distanceAlong.array;
        const points=geometry.points.map((p,i)=>[...p,d[Math.min(i*4,d.length-1)]]);
        const period=uniform(program,'period')??0,count=uniform(program,'count')??0,stops=Array.from({length:count},(_,i)=>uniform(program,`stops[${i}]`));
        return {kind,points,nominalWidthCss:1.5,dash:{period,stops},provenance:'original case ribbon position and distanceAlong arrays; matched native position buffer',board:geometry.board};
      }
      const curve=mesh.geometry.parameters?.path,modelView=uniform(program,'modelViewMatrix'),projection=uniform(program,'projectionMatrix'),lift=uniform(program,'uThreadLift');
      if(!curve||!modelView||!projection||!Number.isFinite(lift))throw new Error('Original atlas projection/lift receipt is unavailable');
      const parameters=mesh.geometry.parameters,radius=parameters.radius/.001,box=rect(canvas),frame=mesh.userData.threadProjection;
      // One retained source yields radius 0.85 + min(5,max(1,1)) * .25.
      // Verify the geometric parameter, rather than estimating width from pixels.
      if(Math.abs(radius-(.85+Math.min(5,Math.max(1,atlasSourceCount))*.25))>1e-10||parameters.tubularSegments!==48||parameters.radialSegments!==5)throw new Error('Original source-count tube geometry contract changed');
      const precise=Boolean(mesh.geometry.attributes.aThreadClip);
      let matrix=projection,revision=null,ringMapping='original shared TubeGeometry rings';
      if(precise) {
        if(!frame||!Object.isFrozen(frame)||!Object.isFrozen(frame.matrix)||frame.matrix.length!==16||!frame.matrix.every(Number.isFinite))throw new Error('Missing immutable original double projection receipt');
        if(!projection.every((v,i)=>v===Math.fround(frame.matrix[i]))||lift!==Math.fround(frame.lift)||uniform(program,'uThreadRadius')!==Math.fround(frame.radius))throw new Error('Original projection receipt does not match actual native uniforms');
        if(modelView.some((v,i)=>v!==(i%5===0?1:0)))throw new Error('Unexpected nonidentity original atlas model-view transform');
        matrix=frame.matrix;revision=frame.revision;ringMapping='48 original segments; two duplicate original 6-vertex rings per segment';
        for(const name of ['aThreadClip','aThreadRadial','position','normal']) {
          const attribute=mesh.geometry.attributes[name],location=native.getAttribLocation(program,name);
          if(!attribute||location<0||buffers.get(attribute.array)!==native.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING))throw new Error(`Original ${name} native buffer identity is missing`);
        }
        const center=mesh.geometry.attributes.aTubeCenter,uv=mesh.geometry.attributes.uv,index=mesh.geometry.index;
        if(center.count!==576||index.count!==1440||buffers.get(index.array)!==native.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING))throw new Error('Original segmented tube native index/vertex identity changed');
        for(let segment=0;segment<48;segment++)for(let end=0;end<2;end++) {
          const p=curve.getPointAt((segment+end)/48);
          for(let radial=0;radial<=5;radial++){const v=(segment*2+end)*6+radial;
            if(center.getX(v)!==Math.fround(p.x)||center.getY(v)!==Math.fround(p.y)||center.getZ(v)!==Math.fround(p.z)||uv.getX(v)!==Math.fround((segment+end)/48)||uv.getY(v)!==Math.fround(radial/5))throw new Error('Original segment/ring path mapping changed');}
          if(end===0)for(let side=0;side<5;side++){const a=segment*12+side,b=a+6,indices=[a,b,a+1,b,b+1,a+1];for(let j=0;j<6;j++)if(index.array[segment*30+side*6+j]!==indices[j])throw new Error('Original segment topology changed');}
        }
      }
      const original=curve.getSpacedPoints(48),project=p=>{const c=transform(matrix,transform(modelView,p));return [(c[0]/c[3]+1)*box.width/2,(1-c[1]/c[3])*box.height/2];};
      const points=original.map(p=>project([p.x,p.y,p.z*(precise?frame.lift:lift),1]));
      // Oblique/perspective projected diameter is bounded from the original tube's
      // cross-section at the actual center crossing; top-down uses source CSS size.
      let nominalWidthCss=2*radius;
      if(hostPose()?.pitch||hostPose()?.bearing) {
        const center=original[24],normal=curve.computeFrenetFrames(48,false).normals[24],binormal=curve.computeFrenetFrames(48,false).binormals[24],worldRadius=parameters.radius*(precise?frame.radius:uniform(program,'uThreadRadius'));
        const c=project([center.x,center.y,center.z*(precise?frame.lift:lift),1]);let projectedRadius=0;
        for(let side=0;side<32;side++){const angle=side/32*Math.PI*2,offset=[0,1,2].map((_,axis)=>(normal.getComponent(axis)*Math.cos(angle)+binormal.getComponent(axis)*Math.sin(angle))*worldRadius);
          const p=project([center.x+offset[0],center.y+offset[1],center.z*(precise?frame.lift:lift)+offset[2],1]);projectedRadius=Math.max(projectedRadius,Math.hypot(p[0]-c[0],p[1]-c[1]));}
        nominalWidthCss=2*projectedRadius;
      }
      return {kind,points,nominalWidthCss,sourceRadiusCss:radius,sourceCount:atlasSourceCount,radialSegments:parameters.radialSegments,
        projectionMatrix:matrix,nativeProjectionMatrix:projection,modelViewMatrix:modelView,lift:precise?frame.lift:lift,revision,ringMapping,
        provenance:precise?'original TubeGeometry.parameters.path projected independently through immutable double matrix/lift; native uniforms and all original segment/ring/index identities verified':'original TubeGeometry.parameters.path projected through observed legacy native draw uniforms'};

    }
    // The final pixel is counted only when it retains the exact original draw's
    // contribution. For the case pass, bilinear texture sampling and the shader's
    // standard linear-sRGB transfer are reproduced before comparing canvas pixels.
    function survivingContribution(source,final,convert) {
      const a={...final,pixels:new Uint8Array(final.pixels.length)},b={...final,pixels:new Uint8Array(final.pixels.length)};
      const sample=(region,x,y,c)=>{const fx=(x-region.cssLeft)*region.sx-.5,fy=region.height-(y-region.cssTop)*region.sy-.5;
        const x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0;
        const at=(px,py)=>region.pixels[(Math.max(0,Math.min(region.height-1,py))*region.width+Math.max(0,Math.min(region.width-1,px)))*4+c];
        return (at(x0,y0)*(1-tx)+at(x0+1,y0)*tx)*(1-ty)+(at(x0,y0+1)*(1-tx)+at(x0+1,y0+1)*tx)*ty;};
      const channel=v=>convert?255*(v/255<=.0031308?12.92*v/255:1.055*(v/255)**(1/2.4)-.055):v;
      let sourcePixels=0,retainedPixels=0;
      for(let y=0;y<final.height;y++)for(let x=0;x<final.width;x++) {
        const i=(y*final.width+x)*4,cx=final.cssLeft+(x+.5)/final.sx,cy=final.cssTop+(final.height-y-.5)/final.sy;
        const before=[0,1,2].map(c=>channel(sample(source.before,cx,cy,c))),after=[0,1,2].map(c=>channel(sample(source.after,cx,cy,c)));
        const changed=Math.max(...before.map((v,c)=>Math.abs(v-after[c])))>=2;
        const retained=changed&&Math.max(...after.map((v,c)=>Math.abs(v-final.pixels[i+c])))<=8;
        if(changed)sourcePixels++;if(retained)retainedPixels++;
        for(let c=0;c<3;c++){a.pixels[i+c]=before[c];b.pixels[i+c]=retained?final.pixels[i+c]:before[c];}a.pixels[i+3]=b.pixels[i+3]=255;
      }
      return {raster:rasterDelta(a,b,source.expected),sourcePixels,retainedPixels,canvasRgbaBase64:encode(final.pixels),colorAgreementTolerance255:8,
        transfer:convert?'bilinear original FBO texture; standard linear-sRGB to canvas sRGB':'same default-framebuffer original draw'};
    }
    let pending=null,lastCaseSource=null;
    function frameFor(capture) {
      const token=state.frameTimestamp??performance.now();let frame=capture.frames.at(-1);
      if(!frame||frame.token!==token){frame={token,drawIds:[],contributionIds:[],composites:[],complete:false};capture.frames.push(frame);}
      return frame;
    }
    function finish(frame,capture,kind) {
      try {
        const snap=snapshot(kind);frame.snapshot=snap;frame.poseKey=poseKey(snap);frame.complete=true;
        const sources=frame.drawIds.map(index=>capture.draws[index]).filter(draw=>draw._source);
        const usable=sources.filter(draw=>draw.raster?.changedPixels>0&&draw.poseKey===frame.poseKey);
        const sourceRecord=usable.sort((a,b)=>(b.raster.path?.coverage??0)-(a.raster.path?.coverage??0))[0]??(kind==='case'?lastCaseSource:null)??sources.at(-1);
        if(!sourceRecord){frame.finalCanvas={error:'No original native source draw for this complete frame'};return;}
        if(sourceRecord.poseKey!==frame.poseKey){frame.finalCanvas={error:'Native source draw pose does not match the complete frame'};return;}
        if(kind==='case'&&!frame.composites.some(c=>c.textureId===sourceRecord.textureId)){frame.finalCanvas={error:'Original case target texture was not composited into this default canvas frame'};return;}
        const final=readRegion(kind,true);let contribution;
        if(kind==='atlas') {
          const later=[...sources.filter(draw=>draw!==sourceRecord),...frame.contributionIds.map(index=>capture.contributions[index])];
          const traced=window.__threadZoomTraceAtlas(sourceRecord,later,final,coincidentOriginals),{before,after,...receipt}=traced;
          contribution={...receipt,raster:rasterDelta(before,after,sourceRecord.expected),canvasRgbaBase64:encode(final.pixels),
            transfer:'same-frame observed original target plus verified original coincident-path repaint; actual per-pixel before/after, no synthetic blend'};
        } else contribution=survivingContribution(sourceRecord._source,final,true);
        frame.finalCanvas={...contribution,sourceDrawId:sourceRecord.drawId,
          meshUuid:sourceRecord.meshUuid,programId:sourceRecord.programId,textureId:sourceRecord.textureId,defaultFramebuffer:true,viewport:final.viewport,poseKey:frame.poseKey};
      }catch(error){frame.finalCanvas={error:String(error)};}
    }
    for(const method of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']) {
      gl[method]=function(...args) {
        const active=state.active,capture=active&&state.captures[active.name];let before=null,record=null,frame=null,composite=null,matched=false,coincident=false;
        if(active) {
          frame=frameFor(capture);
          const observationOrdinal=capture.observationOrdinal++;
          try {
            const program=native.getParameter(gl.CURRENT_PROGRAM),sources=(programSources.get(program)??[]).join('\n');
            const position=program&&native.getAttribLocation(program,'position');
            const actualBuffer=position>=0?native.getVertexAttrib(position,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING):null;
            const atlas=active.kind==='atlas'?atlasDrawMesh(actualBuffer):null,mesh=active.kind==='atlas'?atlas?.mesh:caseMeshes().mesh;
            matched=Boolean(mesh&&actualBuffer&&buffers.get(mesh.geometry.attributes.position.array) === actualBuffer&&
              (active.kind==='atlas'?sources.includes('uThreadRadius'):sources.includes('distanceAlong')&&sources.includes('uniform float stops[8]')));
            if(matched) {
              coincident=active.kind==='atlas'&&mesh.userData.edgeId!==atlasEdge;
              const snap=snapshot(active.kind),framebuffer=native.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);
              record={...(coincident?{contributionId:capture.contributions.length}:{drawId:capture.draws.length}),role:coincident?'coincident-original':'target-original',observationOrdinal,
                edgeId:active.kind==='atlas'?mesh.userData.edgeId:caseEdge,sourceIds:atlas?.fixture.sourceIds??null,pathMatch:atlas?.pathMatch??null,
                frameToken:frame.token,method,args:[...args],nativePositionBufferMatched:true,shaderKind:active.kind,
                meshUuid:mesh.uuid,material:{type:mesh.material.type,opacity:mesh.material.opacity,color:mesh.material.color?.toArray()??null},nativeOpacity:uniform(program,'opacity'),poseKey:poseKey(snap),snapshot:snap,programId:id(program),positionBufferId:id(actualBuffer),framebufferId:id(framebuffer),viewport:Array.from(native.getParameter(gl.VIEWPORT))};
              if(!state.programs[id(program)])state.programs[id(program)]={sources:programSources.get(program)};
              if(framebuffer)record.textureId=id(native.getFramebufferAttachmentParameter(gl.DRAW_FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME));
              try{before=readRegion(active.kind);record.expected=expectedPath(active.kind,mesh,program,before);}catch(error){record.expectedError=String(error);if(!before)record.raster={error:String(error)};}
            } else if(active.kind==='case'&&native.getParameter(gl.DRAW_FRAMEBUFFER_BINDING)===null&&sources.includes('uniform sampler2D map')&&sources.includes('texture2D(map,vUv)')) {
              const unit=uniform(program,'map'),texture=textures.get(unit);
              composite={frameToken:frame.token,programId:id(program),textureId:id(texture),samplerUnit:unit,defaultFramebuffer:true,viewport:Array.from(native.getParameter(gl.VIEWPORT)),method,args:[...args]};
              if(!state.programs[id(program)])state.programs[id(program)]={sources:programSources.get(program)};
            }
          }catch(error){state.errors.push(String(error));}
        }
        // Exactly one original call, with unchanged arguments, even if observation fails.
        const result = native[method](...args);
        if(matched&&record) {
          if(before)try{const after=readRegion(active.kind);record.raster=rasterDelta(before,after,record.expected);
            Object.defineProperty(record,'_source',{value:{before,after,expected:record.expected},enumerable:false});
          }catch(error){record.raster={error:String(error)};}
          if(coincident){capture.contributions.push(record);frame.contributionIds.push(record.contributionId);}
          else{capture.draws.push(record);frame.drawIds.push(record.drawId);}
          if(active.kind==='case'&&record.raster?.changedPixels>0)lastCaseSource=record;
        }
        if(composite)frame.composites.push(composite);
        if(active) {
          pending={frame,capture,kind:active.kind};
          // Microtasks run after the complete renderer callback and its state restore.
          // Repeated callbacks sharing an rAF timestamp overwrite only that frame's
          // final readback, so later overlays/disappearance cannot leave an early pass.
          queueMicrotask(()=>{if(pending?.frame===frame){finish(frame,capture,active.kind);pending=null;}});
        }
        return result;
      };
    }
  }
  HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
    const context = Reflect.apply(nativeGetContext, this, [kind, ...args]);
    if (/^(webgl2?|experimental-webgl)$/.test(kind) && context) instrument(context, this);
    return context;
  };
  window.__threadZoomProbe = Object.freeze({
    arm(name, kind, sampleCenter=null) { state.active = { name, kind, sampleCenter }; state.captures[name] = { ...snapshot(kind), draws: [], contributions: [], observationOrdinal: 0, frames: [] }; },
    finish(name, kind) { const capture=state.captures[name], fresh=snapshot(kind); state.active=null; Object.assign(capture,fresh,{finalPoseKey:poseKey(fresh)}); return capture; },
    stop() { state.active = null; },
    progress(name,kind) {
      const current=snapshot(kind),frame=state.captures[name]?.frames.at(-1);
      return {currentPoseKey:poseKey(current),canvas:current.canvas,frame:frame?{token:frame.token,complete:frame.complete,poseKey:frame.poseKey}:null};
    },
    snapshot,
    report() { return JSON.parse(JSON.stringify({ ...state, active: null })); },
  });
}

async function until(check, message, timeout = 20000) {
  const end = Date.now() + timeout;
  do { if (await check()) return; await delay(60); } while (Date.now() < end);
  throw new Error(message);
}
async function pose(page) {
  return page.locator('.webgl-host').evaluate(element => JSON.parse(element.dataset.geographicPose).pose);
}
const navigationReports = new WeakMap(), cameraFixtures = new WeakMap();
async function fixtureAtlas(page, zoom, label, extra={}) {
  const expected={center:[...CROSSING_CENTER],zoom:zoom===6?6.0001:zoom,pitch:0,bearing:0,...extra};
  const before=await page.evaluate(navigationSnapshot);
  await cameraFixtures.get(page).set(expected,label);
  await until(async()=>{try{assertSameFixturePose(await pose(page),expected);return true;}catch{return false;}},`Fixture pose was not rendered: ${label}`);
  const after=await page.evaluate(navigationSnapshot);
  assert.deepEqual(after.inspector,before.inspector,'Camera setup changed the source reader');
  assert.deepEqual(after.caseSelection,before.caseSelection,'Camera setup changed case selection');
}

async function gesturePlan(page, selector, offsets, label) {
  const receipt = { label, offsets, before: await page.evaluate(navigationSnapshot) };
  navigationReports.get(page)?.push(receipt);
  receipt.hitTest = await page.evaluate(findClearGesture, { selector, offsets });
  assert.ok(receipt.hitTest.plan, `No unobstructed ${selector} gesture path: ${JSON.stringify(receipt.hitTest)}`);
  return receipt;
}
async function clearMapPoint(page) {
  const receipt = await gesturePlan(page, '.webgl-host canvas', [], 'atlas wheel target');
  return receipt.hitTest.plan.start;
}
async function dragSurface(page, selector, delta, label) {
  const receipt = await gesturePlan(page, selector, dragOffsets(delta), label), { start, points } = receipt.hitTest.plan;
  await page.mouse.move(start.x, start.y);
  let pressed = false;
  try {
    await page.mouse.down(); pressed = true;
    // One first move crosses both real handlers' activation thresholds. Splitting it
    // into tiny steps would discard pre-activation motion in CaseInputAdapter.
    await page.mouse.move(points[0].x, points[0].y);
    await delay(40);
    await page.mouse.move(points[1].x, points[1].y, { steps: Math.max(1, Math.ceil(Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) / 16)) });
    // MapLibre's inertia buffer expires after 160 ms; allow a rendered frame first.
    await delay(240);
    receipt.releaseHit = await page.evaluate(({ selector, point }) => {
      const hit = document.elementFromPoint(point.x, point.y);
      return { point, clear: hit === document.querySelector(selector), target: hit ? { tag: hit.tagName, id: hit.id, class: hit.getAttribute('class'), label: hit.getAttribute('aria-label') } : null };
    }, { selector, point: points[1] });
    assert.equal(receipt.releaseHit.clear, true, 'Pointer release is obstructed; preserve the target diagnostics');
  } finally {
    if (pressed) await page.mouse.up();
    await delay(80);
    receipt.after = await page.evaluate(navigationSnapshot);
  }
  assert.equal(Boolean(receipt.after.inspector), Boolean(receipt.before.inspector), 'A navigation drag changed atlas reader visibility; do not silently close it');
  assert.deepEqual(receipt.after.inspector?.metadata ?? null, receipt.before.inspector?.metadata ?? null, 'A navigation drag opened or changed the atlas reader; do not silently close it');
  assert.equal(receipt.after.caseSelection, receipt.before.caseSelection, 'A navigation drag selected a case object');
  assert.equal(receipt.after.caseView, receipt.before.caseView, 'A navigation drag changed the case view');
}
async function setAtlasZoom(page, requested) {
  const target = requested === 6 ? 6.0001 : requested;
  for (let iteration = 0; iteration < 55; iteration++) {
    const current = (await pose(page)).zoom, difference = target - current;
    if (Math.abs(difference) < .00025 && (requested !== 6 || current >= 6)) return;
    if (Math.abs(difference) > .52) {
      await page.getByRole('button', { name: difference > 0 ? 'Zoom in' : 'Zoom out', exact: true }).click();
    } else {
      // Small trackpad deltas unambiguously use MapLibre 6.13's 1/100 rate.
      const delta = -Math.sign(difference) * Math.min(3.8, -100 * Math.log(2 / (2 ** Math.abs(difference)) - 1));
      const point = await clearMapPoint(page); await page.mouse.move(point.x, point.y); await page.mouse.wheel(0, delta);
    }
    await until(async () => Math.abs((await pose(page)).zoom - current) > .00001, `Camera did not respond while moving to zoom ${requested}`, 5000);
    await delay(70);
  }
  throw new Error(`Could not reach zoom ${requested}: ${JSON.stringify(await pose(page))}`);
}
async function centerAtlas(page, destination = CROSSING_CENTER) {
  for (let iteration = 0; iteration < 25; iteration++) {
    const p = await pose(page), delta = panDelta(p.center, destination, p.zoom);
    if (atlasCenterReached(delta)) {
      navigationReports.get(page)?.push({ label: 'atlas center reached', pose: p, destination, errorCssPixels: delta, maxAxisErrorCssPixels: ATLAS_CENTER_ERROR_PX });
      return;
    }
    const scale = Math.min(1, 90 / Math.max(...delta.map(Math.abs)));
    await dragSurface(page, '.webgl-host canvas', delta.map(value => value * scale), `atlas center correction ${iteration}`);
  }
  throw new Error(`Could not center the original crossing: ${JSON.stringify(await pose(page))}`);
}
/** Chromium screenshots are lossless, noninterlaced 8-bit RGB/RGBA PNGs. Decode
 * only that explicit contract, with built-in zlib, without a new runtime package. */
export function decodeScreenshotPng(bytes) {
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  let width,height,channels;const chunks=[];
  for(let offset=8;offset<bytes.length;){const size=bytes.readUInt32BE(offset),type=bytes.subarray(offset+4,offset+8).toString();assert.ok(offset+12+size<=bytes.length,'Truncated PNG');const data=bytes.subarray(offset+8,offset+8+size);
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert.ok([2,6].includes(data[9]));assert.equal(data[12],0);channels=data[9]===6?4:3;}
    if(type==='IDAT')chunks.push(data);offset+=12+size;if(type==='IEND')break;}
  assert.ok(width>0&&height>0&&channels);const raw=inflateSync(Buffer.concat(chunks)),stride=width*channels;
  assert.equal(raw.length,(stride+1)*height);const scan=Buffer.alloc(stride*height),pixels=Buffer.alloc(width*height*4);
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];assert.ok(filter<=4,'Unsupported PNG filter');for(let x=0;x<stride;x++){const left=x>=channels?scan[y*stride+x-channels]:0,up=y?scan[(y-1)*stride+x]:0,prior=y&&x>=channels?scan[(y-1)*stride+x-channels]:0;
      const prediction=[0,left,up,Math.floor((left+up)/2),paeth(left,up,prior)][filter];scan[y*stride+x]=(raw[y*(stride+1)+x+1]+prediction)&255;}
    for(let x=0;x<width;x++){for(let c=0;c<3;c++)pixels[(y*width+x)*4+c]=scan[y*stride+x*channels+c];pixels[(y*width+x)*4+3]=channels===4?scan[y*stride+x*channels+3]:255;}}
  return {width,height,pixels};
}
async function verifyScreenshotCrossing(row,output,page) {
  const last=row.frames?.at(-1),final=last?.finalCanvas,source=row.draws.find(draw=>draw.drawId===final?.sourceDrawId);
  if(!final?.raster?.roi||!source?.expected){row.screenshotEvidence={error:'No final native source to compare with screenshot'};return;}
  try {
    const png=decodeScreenshotPng(await readFile(join(output,row.screenshot.filename))),roi=final.raster.roi,box=row.kind==='case'?row.geometry.board:row.canvas;
    const before=Buffer.from(final.raster.beforeRgbaBase64,'base64'),after=Buffer.from(final.raster.afterRgbaBase64,'base64'),canvas=Buffer.from(final.canvasRgbaBase64,'base64');
    const screenshot=Buffer.alloc(before.length),retained=Buffer.from(before),scale=png.width/row.screenshot.viewport.width;
    for(let y=0;y<roi.height;y++)for(let x=0;x<roi.width;x++) {
      const i=(y*roi.width+x)*4,sx=Math.floor((box.x+roi.cssLeft+(x+.5)/roi.sx)*scale),sy=Math.floor((box.y+roi.cssTop+(roi.height-y-.5)/roi.sy)*scale);
      if(sx<0||sy<0||sx>=png.width||sy>=png.height)continue;const j=(sy*png.width+sx)*4;png.pixels.copy(screenshot,i,j,j+4);
      if(Math.max(...[0,1,2].map(c=>Math.abs(after[i+c]-before[i+c])))>=2&&Math.max(...[0,1,2].map(c=>Math.abs(screenshot[i+c]-canvas[i+c])))<=8)screenshot.copy(retained,i,i,i+4);
    }
    const a={...roi,pixels:before},b={...roi,pixels:retained};
    const fullRaster=analyzePathRaster(a,b,source.expected);
    const sampling=await page.evaluate(inspectScreenshotPath,{points:fullRaster.path.samples.map(({x,y})=>({x,y})),box,kind:row.kind,roi,nominalWidthCss:source.expected.nominalWidthCss});
    row.screenshotEvidence={fullRaster,sampling};
    const croppedBefore=cropScreenshotRegion(a,sampling.selected),croppedAfter=cropScreenshotRegion(b,sampling.selected);
    row.screenshotEvidence={raster:analyzePathRaster(croppedBefore,croppedAfter,source.expected),fullRaster,sampling,screenshotRgbaBase64:screenshot.toString('base64'),frameToken:last.token,sourceDrawId:source.drawId,
      method:'Lossless screenshot ROI agrees with exact final default-canvas native contribution at the same CSS crossing',colorAgreementTolerance255:8};
  }catch(error){row.screenshotEvidence={...row.screenshotEvidence,error:String(error)};}
}

async function screenshot(page, directory, name, requireCanvas = true) {
  const filename = `${name}.png`; await page.screenshot({ path: join(directory, filename), fullPage: true });
  const png = await readFile(join(directory, filename));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Screenshot is not a native PNG');
  const pixels = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
  const canvas = await page.locator('.webgl-host canvas').count() ? await page.locator('.webgl-host canvas').boundingBox() : null;
  if (requireCanvas) assert.ok(canvas && canvas.x >= 0 && canvas.y >= 0 && canvas.x + canvas.width <= pixels.width + 1 && canvas.y + canvas.height <= pixels.height + 1, 'Screenshot must include the real canvas bounds');
  return { filename, viewport: page.viewportSize(), canvas, pixels, bytes: png.length };
}
export function hasFreshSettledFrame(progress,afterToken,viewport) {
  const frame=progress?.frame;
  return Number.isFinite(frame?.token)&&frame.token>afterToken&&frame.complete===true&&
    frame.poseKey===progress.currentPoseKey&&progress.canvas?.width===viewport.width&&progress.canvas?.height===viewport.height;
}
async function captureAtlas(page, output, name, orient = true) {
  await page.evaluate(name => window.__threadZoomProbe.arm(name, 'atlas'), name);
  const readiness=[];
  async function resizeAndObserve(viewport) {
    const before=await page.evaluate(name=>window.__threadZoomProbe.progress(name,'atlas'),name),afterToken=before.frame?.token??-1;
    await page.setViewportSize(viewport);
    let after;
    await until(async()=>{after=await page.evaluate(name=>window.__threadZoomProbe.progress(name,'atlas'),name);return hasFreshSettledFrame(after,afterToken,viewport);},`No fresh complete frame after resize for ${name}`,8000);
    readiness.push({requestedViewport:viewport,before,after,selectionBasis:'Frame completion, exact current pose, viewport and fresh native frame token only; no pixel result'});
  }
  // Three separate normal host redraws establish subsequent settled frames. The
  // original target camera is never assigned or injected by the observer.
  for(let check=0;check<3;check++) {
    if (orient) await page.getByRole('button', { name: 'Top-down orientation', exact: true }).click();
    else {
      const viewport = page.viewportSize();
      // Resize events may coalesce: observe the complete intermediate frame before
      // restoring the final viewport, then require its own fresh complete frame.
      await resizeAndObserve({ ...viewport, width: viewport.width + 1 });
      await resizeAndObserve(viewport);
    }
    await delay(160);
  }
  const image = await screenshot(page, output, name);
  const capture = await page.evaluate(name => window.__threadZoomProbe.finish(name, 'atlas'), name);
  const row={ ...capture, screenshot: image, captureReadiness:readiness };await verifyScreenshotCrossing(row,output,page);return row;
}
async function inspectAtlasClick(page, point) {
  assert.equal(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y) === document.querySelector('.webgl-host canvas'), point), true, 'Crossing click must hit the real map canvas, never a DOM label');
  await page.mouse.click(point.x, point.y);
  await page.getByRole('complementary', { name: 'Evidence reading panel' }).waitFor({ state: 'visible', timeout: 5000 });
  const panel=page.locator('.evidence-inspector'),object=JSON.parse(await panel.locator('.retained-metadata pre').textContent());
  assert.equal(object.id, ATLAS_EDGE, 'Crossing click selected a different original object');
  assert.deepEqual(object.sourceIds,[ATLAS_SOURCE_FIXTURE.id],'Selected original edge source IDs changed');
  const ids=[...new Set([...object.sourceIds,...object.geography.flatMap(g=>g.sourceIds)])];
  assert.deepEqual(ids,[ATLAS_SOURCE_FIXTURE.id],'Selected original source trail changed');
  const cards=panel.locator('section').filter({has:page.getByRole('heading',{name:'Source trail',exact:true})}).locator('.source-card');
  assert.equal(await cards.count(),ids.length,'Selected source trail is incomplete');
  const links=await cards.locator(':scope > a').evaluateAll(elements=>elements.map(a=>({href:a.getAttribute('href'),text:a.textContent,rel:a.getAttribute('rel')})));
  const actual=links.map((link,i)=>({...link,sourceId:ids[i]}));
  assertExactSourceLinks(actual,[{sourceId:ATLAS_SOURCE_FIXTURE.id,href:ATLAS_SOURCE_FIXTURE.url}],'Selected atlas source trail');
  await page.getByRole('button', { name: 'Close reading panel', exact: true }).click();
  return { id: object.id, sourceIds: object.sourceIds, sourceLinks:actual };
}
async function runAtlas(page, output, report) {
  const diagnostic = report.mode === 'baseline-diagnostic';
  await page.getByRole('button', { name: 'Top-down orientation', exact: true }).click();
  await fixtureAtlas(page,4.5,'initial overview fixture');
  let areaIds, selectedAreaIds, selected = false;
  for (const zoom of REQUIRED_ZOOMS) {
    await fixtureAtlas(page,zoom,`exact zoom ${zoom}`);
    const label = `atlas-z${String(zoom).replace('.', '_')}`, row = await captureAtlas(page, output, label);
    report.atlas.push(row);
    recordCheck(report, `${label}: native thread raster`, () => assertRasterEvidence(row, label), diagnostic);
    recordCheck(report, `${label}: pose and original admission`, () => {
      assert.ok(Math.abs(row.pose.zoom - zoom) < .002, 'Camera did not reach the requested threshold');
      if (zoom === 6) assert.ok(row.pose.zoom >= 6, 'The zoom-6 boundary must be tested on its hidden side');
      assert.equal(row.pose.pitch, 0); assert.equal(row.pose.bearing, 0);
      assert.ok(row.visibleEdgeIds.includes(ATLAS_EDGE)); assert.ok(row.visibleEdgeIds.length <= 60);
      assert.ok(row.geometry.points.slice(1).some((p, i) => clipSegment(row.geometry.points[i], p, row.canvas.width, row.canvas.height)), 'Original centerline does not cross the viewport');
      if (!areaIds) areaIds = row.visibleEdgeIds;
      if (selected) {
        if (selectedAreaIds) assert.deepEqual(row.visibleEdgeIds, selectedAreaIds, 'Zoom changed representative IDs within the same selected state');
        else selectedAreaIds = row.visibleEdgeIds;
        assert.equal(row.visibleEdgeIds[0], ATLAS_EDGE, 'The exact selected original must remain first');
      } else assert.deepEqual(row.visibleEdgeIds, areaIds, 'Zoom changed representative IDs within the unselected fixture state');
      if (zoom >= 5.9) assert.equal(row.geometry?.bothEndpointsOffscreen, true, 'Crossing fixture did not put both endpoints offscreen');
      assert.ok(row.screenshot.bytes > 1000, 'Missing screenshot evidence');
    });
    await writeRasterReport(report,output,'report.partial.json');
    if ([5.9, 6, 8, 19].includes(zoom)) {
      const box = row.canvas;
      try { report.clicks.push({ zoom, ...await inspectAtlasClick(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }) }); selected = true; report.checks.push({ label: `${label}: exact crossing click`, status: 'passed' }); }
      catch (error) { report.checks.push({ label: `${label}: exact crossing click`, status: diagnostic === 'live' ? 'live-diagnostic-failure' : diagnostic ? 'baseline-diagnostic-failure' : 'failed', message: error.message }); const close = page.getByRole('button', { name: 'Close reading panel', exact: true }); if (await close.count()) await close.click(); }
    }
  }
  // Normal world-mode caps and detail reentry remain separate admission policies.
  await fixtureAtlas(page,2.5,'world cap fixture');
  const world = await page.evaluate(() => window.__threadZoomProbe.snapshot('atlas'));
  recordCheck(report, 'atlas zoom-out retains world admission cap', () => { assert.equal(world.semanticMode, 'world'); assert.ok(world.visibleEdgeIds.length <= 24); });
  await fixtureAtlas(page,5.9,'detail reentry fixture');
  const reentry = await captureAtlas(page, output, 'atlas-reentry-z5_9'); report.atlas.push(reentry);
  recordCheck(report, 'atlas reentry native raster and exact original IDs', () => { assertRasterEvidence(reentry, 'reentry'); assert.deepEqual(reentry.visibleEdgeIds, selected ? selectedAreaIds : areaIds); }, diagnostic);
  // Pan the retained crossing away and back without using an endpoint-in-view gate.
  await dragSurface(page, '.webgl-host canvas', [70, 35], 'atlas deliberate pan away');
  // One real inverse drag, not a subpixel corrective loop.
  await dragSurface(page, '.webgl-host canvas', [-70, -35], 'atlas deliberate pan return');
  const pan = await captureAtlas(page, output, 'atlas-pan-return'); report.atlas.push(pan);
  recordCheck(report, 'atlas pan-return raster and both offscreen endpoints', () => { assertRasterEvidence(pan, 'pan-return'); assert.equal(pan.geometry.bothEndpointsOffscreen, true); }, diagnostic);
  await fixtureAtlas(page,8,'oblique starting fixture');
  await page.getByRole('button', { name: 'Rotate right', exact: true }).click(); await delay(150);
  const oblique = await captureAtlas(page, output, 'atlas-oblique-z8', false); report.atlas.push(oblique);
  recordCheck(report, 'atlas oblique nonzero-bearing native raster', () => { assertRasterEvidence(oblique, 'oblique'); assert.ok(oblique.pose.pitch >= 35 && Math.abs(oblique.pose.bearing) >= 20); }, diagnostic);
  await page.getByRole('button', { name: 'Top-down orientation', exact: true }).click();
  await fixtureAtlas(page,5.9,'handoff starting fixture');
  await writeRasterReport(report,output,'report.partial.json');
}

async function runInputAtlas(page,output,report) {
  // Fixture positioning is separate from these genuine product input paths.
  // Wheel events cross both the old cutoff and the current maximum zoom.
  report.realInputZoom=[];
  for(const [start,target,name] of [[5.99,6,'atlas-real-wheel-cutoff'],[18.99,19,'atlas-real-wheel-maximum']]) {
    await fixtureAtlas(page,start,`${name}: starting pose`);
    const before=await pose(page),point=await clearMapPoint(page);
    await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,-3.8);
    await until(async()=>{const actual=await pose(page);return target===19?actual.zoom===19:actual.zoom>target;},`${name}: genuine wheel did not cross target`);
    await delay(180);
    const row=await captureAtlas(page,output,name);report.atlas.push(row);
    report.realInputZoom.push({name,before,after:row.pose,point,deltaY:-3.8,fixtureRequestsDuringInput:0});
    recordCheck(report,`${name}: real input and native raster`,()=>{assertRasterEvidence(row,name);assert.ok(row.pose.zoom>before.zoom);assert.equal(row.geometry.bothEndpointsOffscreen,true);},report.mode==='baseline-diagnostic');
    try {const selected=await inspectAtlasClick(page,{x:row.canvas.x+row.canvas.width/2,y:row.canvas.y+row.canvas.height/2});
      report.clicks.push({zoom:row.pose.zoom,inputPath:name,...selected});
      report.checks.push({label:`${name}: exact original input click`,status:'passed'});
    } catch(error) {report.checks.push({label:`${name}: exact original input click`,status:report.mode==='baseline-diagnostic'?'baseline-diagnostic-failure':'failed',message:error.message});const close=page.getByRole('button',{name:'Close reading panel',exact:true});if(await close.count())await close.click();}
  }
  await fixtureAtlas(page,5.9,'real input completion pose');
}

async function runNarrowAtlas(page, output, report) {
  await page.setViewportSize({ width: 390, height: 844 }); await delay(150);
  for (const zoom of [5.9, 6, 19]) {
    await fixtureAtlas(page,zoom,`narrow exact zoom ${zoom}`);
    const row = await captureAtlas(page, output, `atlas-narrow-z${String(zoom).replace('.', '_')}`); report.atlas.push(row);
    recordCheck(report, `narrow z${zoom}: exact crossing raster`, () => { assertRasterEvidence(row, `narrow z${zoom}`); assert.equal(row.geometry.bothEndpointsOffscreen, true); assert.ok(Math.abs(row.pose.zoom - zoom) < .002); }, report.mode === 'baseline-diagnostic');
  }
  await page.setViewportSize({ width: 800, height: 500 }); await delay(150);
  await fixtureAtlas(page,5.9,'restore desktop fixture');
}
async function runLive(page, output, report) {
  report.live = { url: LIVE_ATLAS_URL, observedAt: new Date().toISOString(), runtimeCommit: 'not inferred from a concurrent deployment', diagnosticOnly: true };
  const dataset = await page.locator('.webgl-host').evaluate(element => ({ ...element.dataset }));
  report.live.initialDataset = dataset;
  if (!dataset.geographicPose) {
    report.checks.push({ label: 'public live precise camera observation', status: 'live-diagnostic-unsupported', message: 'This live release does not expose the full-precision geographic pose. Rounded center/zoom attributes are retained as diagnostics only; no exact crossing/threshold or native visibility claim is made.' });
    report.screenshots.push(await screenshot(page, output, 'live-pose-unsupported'));
    return;
  }
  await page.getByRole('button', { name: 'Top-down orientation', exact: true }).click();
  // Start the long world-to-city pan at the same ordinary overview zoom as
  // candidate/baseline, rather than exhausting a city-scale 25-drag bound.
  await setAtlasZoom(page, 4.5); await centerAtlas(page);
  for (const zoom of [5.9, 8]) {
    await setAtlasZoom(page, zoom); await centerAtlas(page);
    const row = await captureAtlas(page, output, `public-live-z${String(zoom).replace('.', '_')}`); report.atlas.push(row);
    try { assertRasterEvidence(row, `public live z${zoom}`); report.checks.push({ label: `public live z${zoom}: native observation`, status: 'live-diagnostic-observed' }); }
    catch (error) { report.checks.push({ label: `public live z${zoom}: native observation`, status: 'live-diagnostic-failure', message: error.message }); }
    await writeRasterReport(report,output,'report.partial.json');
  }
}

async function inspectCaseSources(page,file,openDialog=false) {
  const edge=file.edges.find(row=>row.id===CASE_EDGE),claim=file.claims.find(row=>row.claimId===edge.claimId);
  assert.deepEqual(claim.sourceIds,['source:india-ambani:ambani:s1'],'Pinned Ambani source mapping changed');
  const expected=claim.sourceIds.map(sourceId=>({sourceId,href:file.sources.find(source=>source.id===sourceId).url}));
  assert.equal(expected[0].href,'https://www.ril.com/sites/default/files/2025-04/SHP31032025.pdf');
  const article=page.locator(`[data-reader-scroll="workspace-evidence"] article[data-claim-id=${JSON.stringify(claim.claimId)}]`);
  assert.equal(await article.count(),1,'Exact selected-claim reader is missing');
  const hrefs=await article.locator(':scope > .ocd-evidence-content > .ocd-sources > li > a').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
  const actual=hrefs.map((href,i)=>({sourceId:claim.sourceIds[i],href}));
  assertExactSourceLinks(actual,expected,'Exact selected case claim source links');
  assert.ok((await article.textContent()).includes(`Claim reference: ${claim.claimId}`),'Selected reader claim identity changed');
  let dialogLinks=null;
  if(openDialog) {
    await page.locator('[data-case-workspace]').getByRole('button',{name:`Inspect selected claim ${claim.number}: ${claim.proposedLabel}`,exact:true}).click();
    const dialog=page.locator('[data-case-source-dialog]');await dialog.waitFor({state:'visible'});
    const content=dialog.locator('[data-reader-scroll="case-evidence"] > .ocd-evidence-content');
    assert.ok((await content.textContent()).includes(`Claim reference: ${claim.claimId}`),'Selected source dialog opened another claim');
    const urls=await content.locator(':scope > .ocd-sources > li > a').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
    dialogLinks=urls.map((href,i)=>({sourceId:claim.sourceIds[i],href}));assertExactSourceLinks(dialogLinks,expected,'Exact selected claim source dialog');
    await dialog.getByRole('button',{name:'Close sources',exact:true}).click();
  }
  return {edgeId:edge.id,claimId:claim.claimId,sourceLinks:actual,dialogLinks};
}

async function runCase(page, output, report) {
  const { caseWorkspace, caseSurface, openCaseWorkspace, chooseCase, showCaseScene } = await import('./case-workspace-browser.mjs');
  const transport = JSON.parse(await readFile(join(ROOT, 'src/case-data/reviewed-transport.json'), 'utf8'));
  // Use the pinned accepted adapter through the existing expectation helper, not a hand-built case.
  const { loadCaseExpectation } = await import('./case-workspace-browser.mjs');
  const temporary = join(output, 'case-reference'); await mkdir(temporary, { recursive: true });
  const expected = await loadCaseExpectation(ROOT, temporary), file = expected.catalog.cases.find(file => file.id === 'case:india-ambani');
  assert.ok(file?.edges.some(edge => edge.id === CASE_EDGE));
  report.caseReference = { ...expected.reference, transportBytes: JSON.stringify(transport).length };
  const before = await pose(page);
  await openCaseWorkspace(page, until); await chooseCase(page, file, until); await showCaseScene(page, until, report, 'zoom regression');
  const surface = caseSurface(page);
  await surface.focus(); await surface.press('Home'); await delay(150);
  const initial = await page.evaluate(() => window.__threadZoomProbe.snapshot('case'));
  assert.ok(initial.geometry, 'No original case geometry at the normal fit pose');
  assert.equal(initial.caseSelection, '', 'Case crossing fixture must start without a selected object');
  assert.deepEqual(initial.visibleEdgeIds, file.edges.slice(0, 4).map(edge => edge.id), 'Case draw/source order changed');
  // Verify the identity mapping against the accepted source layout at its known Home pose.
  const { build } = await import('esbuild');
  const modelPath = join(temporary, 'accepted-layout.mjs');
  await build({ entryPoints: [join(ROOT, 'src/case-scene/layout.ts')], outfile: modelPath, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const layout = await import(pathToFileURL(modelPath).href);
  const model = layout.createCaseSceneModel(file), thread = model.threads.find(thread => thread.record.id === CASE_EDGE);
  const b = model.bounds, board = initial.geometry.board, center = [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
  const scale = board.height / (2 * Math.max((b.maxY - b.minY) / 2, (b.maxX - b.minX) / (2 * board.width / board.height)));
  initial.geometry.points.forEach((point, i) => { const p = layout.cubicPoint(thread, i / 24); assert.ok(Math.hypot(point[0] - ((p[0] - center[0]) * scale + board.width / 2), point[1] - (board.height / 2 - (p[1] - center[1]) * scale)) < .08, `Case mesh is not the accepted original edge at sample ${i}`); });
  report.caseInitial = initial;
  await caseWorkspace(page).getByRole('button', { name: 'Pan/zoom off', exact: true }).click();
  // The original unselected edge remains eligible; selected endpoint readability is a separate policy.
  await surface.focus();
  for (let i = 0; i < 12; i++) { await surface.press('+'); await delay(30); }
  await until(async () => Boolean((await page.evaluate(() => window.__threadZoomProbe.snapshot('case')))?.geometry), 'Case original edge geometry was not observed');
  // Center the middle retained segment using its actual read-only screen geometry.
  for (let i = 0; i < 16; i++) {
    const row = await page.evaluate(() => window.__threadZoomProbe.snapshot('case')), g = row.geometry, mid = g.points[Math.floor(g.points.length / 2)];
    const dx = g.board.width / 2 - mid[0], dy = g.board.height / 2 - mid[1];
    if (Math.hypot(dx, dy) < 1) break;
    const scale = Math.min(1, 80 / Math.max(Math.abs(dx), Math.abs(dy)));
    await dragSurface(page, '[data-case-surface]', [dx * scale, dy * scale], `case center correction ${i}`);
  }
  const witnessSnapshot=await page.evaluate(()=>window.__threadZoomProbe.snapshot('case'));
  const witnessCandidates=witnessRegions(witnessSnapshot.geometry.points,witnessSnapshot.geometry.board.width,witnessSnapshot.geometry.board.height);
  const witnessReceipt={basis:'Original case polyline and DOM only, selected before native capture',edgeId:CASE_EDGE,geometry:witnessSnapshot.geometry,candidates:[],chosen:null,clickPoint:null};
  for(const region of witnessCandidates){
    const observation=await page.evaluate(inspectScreenshotPath,{points:witnessPathSamples(witnessSnapshot.geometry.points,region),box:witnessSnapshot.geometry.board,kind:'case',roi:region,nominalWidthCss:1.5});
    witnessReceipt.candidates.push({region,observation});
    if(observation.selected?.arcCss>=64){witnessReceipt.chosen=region;witnessReceipt.clickPoint=observation.selected.witnessPoint;break;}
  }
  report.caseWitness=witnessReceipt;assert.ok(witnessReceipt.chosen,'No clear same-original case witness; do not hide the role plaque');
  await page.evaluate(center => window.__threadZoomProbe.arm('case-max-zoom', 'case',center),witnessReceipt.chosen.center);
  await surface.focus();
  for(let check=0;check<3;check++){await surface.press('+');await delay(160);}
  const row = await page.evaluate(() => window.__threadZoomProbe.finish('case-max-zoom','case'));
  row.screenshot = await screenshot(page, output, 'case-max-zoom'); await verifyScreenshotCrossing(row,output,page); report.case.push(row);
  recordCheck(report, 'case max-zoom native exact-edge raster and crossing', () => {
    const nativeROI=row.frames.at(-1)?.finalCanvas?.raster?.roi;assert.ok(nativeROI,'Case native witness ROI missing');
    assert.ok(Math.abs(nativeROI.cssLeft+nativeROI.width/nativeROI.sx/2-witnessReceipt.chosen.center[0])<=.5/nativeROI.sx&&Math.abs(nativeROI.cssTop+nativeROI.height/nativeROI.sy/2-witnessReceipt.chosen.center[1])<=.5/nativeROI.sy,'Case native readback differs from independently chosen witness');
    assertRasterEvidence(row, 'case max zoom'); assert.equal(row.edgeId, CASE_EDGE); assert.equal(row.meshUuid, initial.meshUuid, 'Original case GPU geometry identity changed');
    const length = points => points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]), 0);
    const currentBoard = row.geometry.board;
    const currentBaseScale = currentBoard.height / (2 * Math.max((b.maxY - b.minY) / 2, (b.maxX - b.minX) / (2 * currentBoard.width / currentBoard.height)));
    row.observedZoomRatio = length(row.geometry.points) / length(initial.geometry.points) * scale / currentBaseScale;
    assert.ok(Math.abs(row.observedZoomRatio - 4) < .002, 'Native case geometry did not reach max zoom 4'); assert.equal(row.geometry.bothEndpointsOffscreen, true);
    assert.ok(row.visibleEdgeIds.includes(CASE_EDGE)); assert.ok(row.visibleEdgeIds.length <= 12);
    assert.ok(row.draws.every(draw => draw.viewport[2] <= 1024 && draw.viewport[3] <= 1024 && draw.viewport[2] * draw.viewport[3] <= 786432));
  });
  const g = row.geometry, fixedWitness = witnessReceipt.clickPoint;
  assert.ok(fixedWitness&&Number.isFinite(fixedWitness.x)&&Number.isFinite(fixedWitness.y),'Case click lacks a preselected DOM-clear original-path witness');
  const clickPoint={x:g.board.x+fixedWitness.x,y:g.board.y+fixedWitness.y};
  assert.equal(await page.evaluate(point=>document.elementFromPoint(point.x,point.y)===document.querySelector('[data-case-surface]'),clickPoint),true,'Case crossing click must hit the real case input surface');
  const displayed=row.frames.at(-1)?.finalCanvas?.raster?.path?.samples??[];
  assert.ok(displayed.some(p=>p.supported&&Math.hypot(p.x-fixedWitness.x,p.y-fixedWitness.y)<=2),'Preselected case click is not supported by the measured native crossing');
  const screenshotDisplayed=row.screenshotEvidence?.raster?.path?.samples??[];
  assert.ok(screenshotDisplayed.some(p=>p.supported&&Math.hypot(p.x-fixedWitness.x,p.y-fixedWitness.y)<=2),'Preselected case click is not visibly supported by the final screenshot');
  await page.mouse.click(clickPoint.x,clickPoint.y);
  await until(async () => await caseWorkspace(page).getAttribute('data-case-selection') === CASE_EDGE, 'Case crossing click did not select the exact original ID');
  const selected = caseWorkspace(page).locator(`[data-edge-id=${JSON.stringify(CASE_EDGE)}]`);
  assert.equal(await selected.getByRole('button').first().getAttribute('aria-pressed'), 'true');
  const sourceAccess=await inspectCaseSources(page,file,true);
  report.clicks.push({ kind: 'case', id: CASE_EDGE, sourceAccess: true, ...sourceAccess, resultView: await caseWorkspace(page).getAttribute('data-case-view'),inputTarget:'exact data-case-surface',measuredVisiblePoint:clickPoint });
  // Explicit readable fallback has its own result; it cannot satisfy a native ribbon check.
  if (await caseWorkspace(page).getAttribute('data-case-view') === 'scene') {
    await surface.focus();
    for (let i = 0; i < 12 && await surface.count(); i++) { await surface.press('+'); await delay(80); }
  }
  await until(async () => await caseWorkspace(page).getAttribute('data-case-view') === 'list', 'Selected offscreen endpoints did not enter the explicit readable fallback', 8000);
  report.caseFallback = { continuityEvidence: 'Native case ribbon continuity was observed before this deliberate reader transition; the reader is not a rendering pass.', mode: 'list', notice: await caseWorkspace(page).locator('[data-case-auto-fallback-notice]').textContent(), selection: await caseWorkspace(page).getAttribute('data-case-selection') };
  assert.ok(report.caseFallback.notice?.trim()); assert.equal(report.caseFallback.selection, CASE_EDGE);
  report.caseFallback.sourceAccess=await inspectCaseSources(page,file);
  await caseWorkspace(page).getByRole('button', { name: 'Close workspace', exact: true }).click();
  await until(async () => await caseWorkspace(page).count() === 0, 'Case did not close');
  const after = await pose(page); assert.deepEqual(after, before, 'Case camera leaked into atlas pose');
  const restored = await captureAtlas(page, output, 'atlas-after-case'); report.atlas.push(restored);
  recordCheck(report, 'atlas raster after case handoff', () => assertRasterEvidence(restored, 'after case'), report.mode === 'baseline-diagnostic');
}

/** Raw readbacks are losslessly retained once per SHA-256, outside verbose JSON.
 * This removes repeated base64 from partial/final/observer copies without discarding
 * any frame, pixel or receipt. Each reference carries both raw and gzip sizes. */
export async function writeRasterReport(report,output,filename='report.json') {
  const directory=join(output,'pixels');await mkdir(directory,{recursive:true});
  const receipts=new Map((report.rawRasterArtifacts?.files??[]).map(row=>[row.sha256,row]));
  async function visit(value) {
    if(!value||typeof value!=='object')return;
    for(const [key,child]of Object.entries(value)) {
      if(key.endsWith('RgbaBase64')&&typeof child==='string') {
        const bytes=Buffer.from(child,'base64'),hash=sha256(bytes);let receipt=receipts.get(hash);
        if(!receipt){const compressed=gzipSync(bytes),file=`pixels/${hash}.rgba.gz`;await writeFile(join(output,file),compressed);receipt={file,encoding:'gzip',layout:'RGBA unsigned bytes; bottom-up native rows unless screenshot receipt says otherwise',sha256:hash,bytes:bytes.length,compressedBytes:compressed.length};receipts.set(hash,receipt);}
        value[key.slice(0,-6)]={...receipt};delete value[key];
      }else if(key!=='rawRasterArtifacts')await visit(child);
    }
  }
  await visit(report);
  report.rawRasterArtifacts={method:'Lossless content-addressed native/screenshot RGBA; no sampling or evidence loss',files:[...receipts.values()],uniqueFiles:receipts.size,
    bytes:[...receipts.values()].reduce((sum,row)=>sum+row.bytes,0),compressedBytes:[...receipts.values()].reduce((sum,row)=>sum+row.compressedBytes,0)};
  await writeFile(join(output,filename),`${JSON.stringify(report,null,2)}\n`);
}

async function startServer(dist) {
  const canonicalRoot = await realpath(dist);
  const outside = target => { const r = relative(canonicalRoot, target); return r === '..' || r.startsWith(`..${sep}`) || isAbsolute(r); };
  const server = createServer(async (request, response) => {
    try {
      assert.ok(['GET','HEAD'].includes(request.method));
      const path = decodeURIComponent((request.url ?? '').split('?')[0]);
      assert.ok(path.startsWith(PREFIX) && !path.includes('\\') && !path.includes('\0') && !path.split('/').some(p => p === '..' || p === '.'));
      const file = await realpath(resolve(canonicalRoot, path.slice(PREFIX.length) || 'index.html'));
      assert.equal(outside(file), false); const body = await readFile(file);
      response.writeHead(200, { 'Content-Type': ({ '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2' })[extname(file)] ?? 'application/octet-stream', 'Cache-Control':'no-store' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch { response.writeHead(404); response.end('Not found in isolated preview'); }
  });
  await new Promise((resolveReady, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolveReady); });
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
export async function main(args = process.argv.slice(2), env = process.env) {
  requireAuthorizedCI(env); const mode = parseMode(args);
  if (mode === 'baseline-diagnostic') assert.equal(env.SPATIAL_HEAD_SHA, BASELINE_COMMIT, 'Baseline diagnostics must serve the exact frozen baseline checkout');
  // Guard precedes even importing Playwright, and cannot be bypassed by a CLI flag.
  const { chromium } = await import('playwright');
  const output = join(ROOT, 'thread-zoom-review', mode); await mkdir(output, { recursive: true });
  const report = { mode, baselineCommit: BASELINE_COMMIT, headCommit: mode === 'live-diagnostic' ? null : env.SPATIAL_HEAD_SHA ?? env.GITHUB_SHA ?? null, harnessCommit: env.SPATIAL_HARNESS_SHA ?? env.GITHUB_SHA ?? null,
    startedAt: new Date().toISOString(), renderer: 'Chromium / ANGLE SwiftShader, native WebGL calls and software rasterization; not consumer-device FPS',
    checks: [], atlas: [], case: [], clicks: [], errors: [], screenshots: [], scriptAssets: [], sourceHashes: {}, navigation: [] };
  if (mode !== 'live-diagnostic') for (const file of ['src/registry.json', 'src/semanticZoom.ts', 'src/case-data/reviewed-transport.json', 'src/threadGeometry.ts', 'src/scene.ts']) report.sourceHashes[file] = sha256(await readFile(join(ROOT, file)));
  let browser, server, page, cameraFixture; const assetReads = [];
  try {
    if(mode!=='live-diagnostic')report.atlasSourceReference=await loadAtlasSourceReference();
    const serving = mode === 'live-diagnostic' ? { origin: new URL(LIVE_ATLAS_URL).origin } : await startServer(join(ROOT, 'dist')); server = serving.server;
    browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
    report.browserVersion = browser.version();
    const context = await browser.newContext({ viewport: { width: 800, height: 500 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await context.addInitScript({ content: `window.__threadZoomAnalyze = ${analyzePathRaster.toString()}; window.__threadZoomMatchPath = ${matchCoincidentOriginalPath.toString()}; window.__threadZoomTraceAtlas = ${traceAtlasContributions.toString()}; (${installThreadZoomProbe.toString()})(${JSON.stringify({atlasEdge:ATLAS_EDGE,caseEdge:CASE_EDGE,coincidentOriginals:ATLAS_COINCIDENT_ORIGINALS})});` });
    page = await context.newPage(); navigationReports.set(page, report.navigation); page.setDefaultTimeout(15000); page.on('pageerror', error => report.errors.push(error.message));
    page.on('response', response => {
      if (!response.url().startsWith(`${serving.origin}${PREFIX}`) || !/\.js(?:\?|$)/.test(response.url())) return;
      const asset = { url: response.url(), status: response.status(), sha256: null }; report.scriptAssets.push(asset);
      assetReads.push(response.body().then(bytes => { asset.sha256 = sha256(bytes); asset.bytes = bytes.length; }).catch(error => { asset.error = String(error); }));
    });
    if(mode!=='live-diagnostic'){report.cameraFixture={};cameraFixture=await prepareCameraFixture(context,page,join(ROOT,'dist'),serving.origin,PREFIX,report.cameraFixture);cameraFixtures.set(page,cameraFixture);}
    await page.goto(mode === 'live-diagnostic' ? LIVE_ATLAS_URL : `${serving.origin}${PREFIX}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await until(async () => await page.locator('.webgl-host').getAttribute('data-renderer') === 'maplibre-three-mercator' &&
      (mode === 'live-diagnostic' || Boolean(await page.locator('.webgl-host').getAttribute('data-geographic-pose'))), 'Default factual atlas did not render', 60000);
    if(cameraFixture)await cameraFixture.ready();
    if (mode === 'live-diagnostic') await runLive(page, output, report);
    else {
    await runAtlas(page, output, report);
    await runInputAtlas(page, output, report);
    await runNarrowAtlas(page, output, report);
    recordCheck(report,'comparable top-down zoom local width and contrast',()=>assertComparableZoomEvidence(report.atlas),mode==='baseline-diagnostic');
    // Nongeographic case gets a comfortably readable independent viewport.
    await page.setViewportSize({ width: 1440, height: 1000 }); await delay(200);
    await runCase(page, output, report);
    }
    report.observer = await page.evaluate(() => window.__threadZoomProbe.report());
    recordCheck(report, 'one real shared renderer and native context', () => { assert.equal(report.observer.renderers, 1); assert.equal(report.observer.contexts.length, 1); assert.deepEqual(report.observer.errors, []); assert.deepEqual(report.errors, []); }, mode === 'live-diagnostic' ? 'live' : false);
  } catch (error) { report.checks.push({ label: 'native scenario execution', status: mode === 'live-diagnostic' ? 'live-diagnostic-failure' : 'failed', message: error.stack ?? String(error) }); }
  finally {
    if (page && !page.isClosed()) {
      try { report.observer = await page.evaluate(() => window.__threadZoomProbe?.report() ?? null); } catch (error) { report.errors.push(`Observer persistence: ${error}`); }
      if (report.checks.some(check => /failed|failure|unsupported/.test(check.status))) {
        try { report.failureNavigation = await page.evaluate(navigationSnapshot); } catch (error) { report.errors.push(`Failure navigation persistence: ${error}`); }
        try { report.screenshots.push(await screenshot(page, output, 'failure-state', false)); } catch (error) { report.errors.push(`Failure screenshot: ${error}`); }
      }
    }
    await Promise.allSettled(assetReads);
    if(cameraFixture){await cameraFixture.close();recordCheck(report,'camera fixture uses unchanged served asset bytes',()=>assert.ok(report.scriptAssets.some(asset=>asset.url===report.cameraFixture.asset&&asset.sha256===report.cameraFixture.assetSha256),'Camera fixture source differs from served bytes'));}
    if (browser) await browser.close().catch(error => report.errors.push(`Browser cleanup: ${error}`)); if (server) await new Promise(resolveClosed => server.close(resolveClosed));
    for (const [file, hash] of Object.entries(report.sourceHashes)) assert.equal(sha256(await readFile(join(ROOT, file))), hash, `${file}: browser review mutated source`);
    report.finishedAt = new Date().toISOString(); report.status = diagnosticStatus(mode, report.checks);
    await writeRasterReport(report,output);
    await writeFile(join(output, 'summary.md'), `# Thread zoom native review\n\nStatus: ${report.status}\n\n${report.renderer}\n\n${report.checks.map(c => `- ${c.status}: ${c.label}${c.message ? `: ${c.message.split('\n')[0]}` : ''}`).join('\n')}\n\nScreenshots, per-draw readback references and content-addressed lossless pixels/ files are retained with report.json. Baseline diagnostic failures never count as candidate passes. Existing full gates remain mandatory.\n`);
  }
  assert.equal(report.status === 'failed', false, `Native thread zoom review failed; inspect ${output}/report.json`);
  return report;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
