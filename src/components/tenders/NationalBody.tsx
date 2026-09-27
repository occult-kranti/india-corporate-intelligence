import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { loadConcentration, loadCore, type Concentration as Conc, type CpppCore } from '../../data/cppp';
import { usePatch } from '../energy/hooks';
import BandsTypes from './BandsTypes';
import Concentration from './Concentration';
import Families from './Families';
import { Gaps, ProvenanceFooter } from './GapsProvenance';
import { HeadBottom, HeadChip, Strip, Verification } from './Head';
import { parseNationalParams } from './params';
import Quality from './Quality';
import Rates from './Rates';
import RedFlags from './RedFlags';
import Sample from './Sample';
import States from './States';
import Timing from './Timing';
import { MONO_NOTE } from './ui';

/**
 * The national section's body, in the spec's order: head, quality, families, rates,
 * states, bands and types, timing, red flags, concentration, sample, gaps, provenance.
 *
 * The data are compiled-in chunks loaded with `import()`. The first screen's files load
 * together; concentration.json, the largest, loads after the section has mounted,
 * behind a placeholder that names it (U16). A file that is absent from the build prints
 * its absence where its subsection would be; nothing is estimated in its place.
 */

const Missing = ({ file, id, title }: { file: string; id: string; title: string }) => (
  <section id={id} className="pt-10">
    <h3 className="heading-editorial font-semibold text-xl border-b border-border pb-2 mb-4">{title}</h3>
    <p data-nodata className={MONO_NOTE}>
      {file} is not present in this build; nothing is estimated in its place.
    </p>
  </section>
);

export default function NationalBody({ hideSearch }: { hideSearch: string }) {
  const [core, setCore] = useState<CpppCore | null>(null);
  const [conc, setConc] = useState<{ ready: boolean; data: Conc | null }>({ ready: false, data: null });
  const [params, patch] = usePatch();
  const np = parseNationalParams(params);
  const loc = useLocation();
  const scrolled = useRef(false);

  useEffect(() => {
    let live = true;
    loadCore().then((c) => live && setCore(c));
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!core) return;
    let live = true;
    loadConcentration().then((d) => live && setConc({ ready: true, data: d }));
    return () => {
      live = false;
    };
  }, [core]);

  // A link that names a subsection (…#cppp-sample) lands on it once everything above it
  // has rendered, so late data cannot push the target out of view afterwards.
  useEffect(() => {
    if (scrolled.current || !core || !conc.ready) return;
    scrolled.current = true;
    const id = loc.hash.slice(1);
    if (id.startsWith('cppp-')) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, [core, conc.ready, loc.hash]);

  if (!core) {
    return (
      <p data-pending className="font-mono text-[11px] text-text-muted py-6">
        The CPPP section is loading.
      </p>
    );
  }
  const p = core.provenance?.provenance ?? core.quality?.provenance ?? null;
  if (!p) {
    return (
      <p data-nodata className="text-[15px] text-text-secondary py-4">
        provenance.json is not present in this build, so no figure below could carry its source; nothing is shown.
      </p>
    );
  }
  const common = { core, p, params };
  return (
    <div>
      <HeadChip />
      <Strip core={core} p={p} />
      <Verification core={core} />
      <HeadBottom core={core} p={p} hideSearch={hideSearch} />
      {core.quality ? <Quality {...common} /> : <Missing file="quality.json" id="cppp-quality" title="Dataset quality, before any rate" />}
      <Families core={core} conc={conc.data} p={p} params={params} />
      {core.rates ? <Rates {...common} /> : <Missing file="rates.json" id="cppp-rates" title="Rates by portal and AOC year" />}
      {core.rates ? <States {...common} patch={patch} /> : <Missing file="rates.json" id="cppp-states" title="States on the state portal" />}
      {core.rates ? <BandsTypes {...common} /> : <Missing file="rates.json" id="cppp-bands" title="Value bands and tender types" />}
      {core.timing ? <Timing {...common} /> : <Missing file="timing.json" id="cppp-timing" title="Timing" />}
      {core.redflags ? (
        <RedFlags {...common} np={np} patch={patch} />
      ) : (
        <Missing file="redflags.json" id="cppp-redflags" title="Red flags over their families" />
      )}
      <Concentration {...common} conc={conc.data} ready={conc.ready} np={np} patch={patch} />
      {core.sample ? <Sample {...common} /> : <Missing file="sample-verification.json" id="cppp-sample" title="Verification sample" />}
      <Gaps core={core} p={p} />
      <ProvenanceFooter {...common} />
    </div>
  );
}

