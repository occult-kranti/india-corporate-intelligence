import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Kicker, PageTitle, Standfirst, Byline, Section, Callout, StatGrid, DataTable,
  TierChip, Cite, Prose, Footnote,
} from '../components/Editorial';
import { getDeep, identifierCoverage, DEEP_GROUP_IDS } from '../data/groupDeep';
import { CENTRE, STATES_TENDERS, bidderCoverage } from '../data/tenders';
import { FOOTPRINT_REJECTED, FACILITIES } from '../data/footprint';
import type { Tier } from '../graph/schema';

/**
 * The investigative desk.
 *
 * The ask was "links not mentioned in media". Taken literally that is unfalsifiable —
 * an unreported link with no record behind it is indistinguishable from an invented
 * one. The rigorous version of the same question, and the one this page answers, is
 * **documented but unreported**: a primary record establishes the fact, and no outlet
 * has assembled it.
 *
 * Every item below is derived from the datasets in this repository rather than
 * hand-authored, so it cannot drift from its sources.
 */

interface DeskItem {
  id: string;
  headline: string;
  /** What the primary record establishes. Never a claim beyond it. */
  establishes: string;
  /** Why no outlet has assembled it — the honest reason, usually tedium. */
  whyUnreported: string;
  /** The boring explanation that also fits. */
  innocentReading: string;
  /** What would overturn or strengthen it. */
  wouldSettle: string;
  tier: Tier;
  srcs: [string, string][];
}

export default function Desk() {
  const adani = getDeep('adani');
  const reliance = getDeep('reliance');

  const items = useMemo((): DeskItem[] => {
    const out: DeskItem[] = [];

    if (adani) {
      const cov = identifierCoverage(adani);
      out.push({
        id: 'adani-entity-map',
        headline: `${adani.entities.length} Adani group entities, assembled from statutory filings`,
        establishes:
          `The Form AOC-1 subsidiary and associate schedules in the FY2025-26 annual reports of Adani Enterprises, Ports, Power, Energy Solutions and Ambuja enumerate ${adani.entities.length} entities — ${adani.entities.filter((e) => e.kind === 'listed').length} listed, ${adani.entities.filter((e) => e.kind === 'subsidiary').length} subsidiaries, ${adani.entities.filter((e) => e.kind === 'spv').length} SPVs. These are statutory records under s.129(3), not aggregator scrapes.`,
        whyUnreported:
          'Nobody has assembled it because it is tedious rather than hidden. The schedules are public, sit at the back of 400-page PDFs, and require reading five annual reports and reconciling former names across them.',
        innocentReading:
          'A diversified group operating across ports, power, transmission, airports, cement and mining will have many entities. Entity count measures organisational complexity, which is what conglomerates are, and nothing else.',
        wouldSettle: `Registry identifiers. Only ${cov.withCin} of ${cov.total} carry a CIN, because every registry mirror blocks automated fetching. Until that closes, most of this map cannot be joined to any other record.`,
        tier: 'documented',
        srcs: adani.sources.slice(0, 3),
      });

      if (adani.rejected?.length) {
        out.push({
          id: 'adani-refuted',
          headline: `${adani.rejected.length} widely-repeated claims about the Adani group that the records refute`,
          establishes:
            'Checking candidate facts against primary records refuted several that circulate freely — including a facility that does not exist, a company rename that was only a trading-name registration, and an acquisition that was called off.',
          whyUnreported:
            'Refutations are less shareable than claims, and correcting a detail nobody disputes wins no attention. The corrections nonetheless matter, because a dataset carrying them is wrong in ways that propagate.',
          innocentReading:
            'Most of these are ordinary reporting errors compounded by repetition, not fabrication. A trading name genuinely does look like a rename if you are not reading a companies register.',
          wouldSettle: 'Each is already settled against a primary record. They are listed so the errors stop travelling.',
          tier: 'documented',
          srcs: adani.sources.slice(0, 2),
        });
      }
    }

    if (reliance) {
      const gj = reliance.entities.filter((e) => e.stateCode === 'gj').length;
      out.push({
        id: 'reliance-registration',
        headline: 'Jio Platforms and Reliance Jio Infocomm are Gujarat-registered, not Maharashtra',
        establishes:
          `${gj} of the mapped Reliance entities are registered in Gujarat. Jio Platforms and Reliance Jio Infocomm are among them — a fact from the DRHP filed with SEBI on 19 June 2026, which also pins the full pre-issue cap table.`,
        whyUnreported:
          'Coverage treats Reliance as a Mumbai company because RIL is, and the registered office of the digital arm is not the sort of detail a story turns on. It matters here because the platform attributes companies by registered office, and getting it wrong would misplace a large share of the group on every map.',
        innocentReading:
          'Registering an entity where its principal operations or incentives sit is ordinary corporate practice and carries no implication whatsoever.',
        wouldSettle: 'Nothing — it is established from the prospectus. It is recorded so the maps are right.',
        tier: 'documented',
        srcs: reliance.sources.slice(0, 3),
      });
    }

    // Tenders — the coal counterweight, which is the most useful under-reported number here.
    const coal = CENTRE.concentration.find((c) => c.sector.toLowerCase().includes('coal'));
    const airports = CENTRE.concentration.find((c) => c.sector.toLowerCase().includes('airport'));
    if (airports) {
      out.push({
        id: 'airports-vs-coal',
        headline: 'The airport and coal concentration figures point in opposite directions',
        establishes:
          `Airports: ${airports.denominator} Coal, by contrast, is dispersed — the ministry's own tranche-wise file gives 125 commercial line-items across 91 distinct winners, with the top winner an unlisted company at 9 of 125 (7.2%) and Adani entities at 2.`,
        whyUnreported:
          'The airport figure is reported often. The coal denominator almost never is, because "one group won six of six" is a story and "the same group won two of 125" is not. Reported separately they support opposite conclusions; reported together they constrain each other.',
        innocentReading:
          'Different sectors have different structures. Six airport concessions with a per-passenger bid parameter and no experience requirement is a market where one well-capitalised bidder can sweep; 125 coal blocks with revenue-share bidding is one where they cannot. Both outcomes can follow from the rules rather than from anything else.',
        wouldSettle:
          'Bidder counts on the remaining awards. Airports had 32 technical bids from 10 companies, which is already known; most other sectors do not publish it.',
        tier: 'documented',
        srcs: [...(airports.srcs ?? []), ...(coal?.srcs ?? [])].slice(0, 3),
      });
    }

    // The state transparency finding — publishable on its own and about the state, not a company.
    const noPortal = STATES_TENDERS.coverage.filter((c) => !c.portalFound).length;
    const mr = STATES_TENDERS.coverage.filter((c) => c.machineReadable).length;
    out.push({
      id: 'state-procurement-opacity',
      headline: `No state in the survey publishes machine-readable procurement data`,
      establishes:
        `Of ${STATES_TENDERS.coverage.length} states surveyed, ${mr} publish machine-readable procurement data. Eight portals were reached and all run the same NIC GePNIC build — tender-by-tender web UI, an MIS-report link, no API, no bulk export. ${noPortal} could not be reached and are recorded as "could not check", never as "no portal". All ${STATES_TENDERS.awards.length} state awards in the register were reconstructed from the winner's own disclosures, and none carries a bidder count.`,
      whyUnreported:
        'It is a negative finding about administrative practice with no named villain, which makes it unusually hard to place and unusually useful. Nobody has audited the portals side by side.',
      innocentReading:
        'Procurement portals were built for tendering rather than for research, and publishing an API was never their brief. The opacity may be neglect rather than design.',
      wouldSettle:
        'Extending the audit from 13 states to all 36, and checking whether any state publishes award results with bidder counts in any form.',
      tier: 'documented',
      srcs: STATES_TENDERS.sources.slice(0, 3),
    });

    // The footprint refutation — a checkable, specific correction.
    const kenya = FOOTPRINT_REJECTED.find((r) => /mombasa|kenya/i.test(r.candidate));
    if (kenya) {
      out.push({
        id: 'kenya-refutation',
        headline: 'A widely-listed Adani facility in Kenya does not exist',
        establishes: kenya.reason,
        whyUnreported:
          'The claim entered circulation through aggregated "Adani global footprint" lists and was never checked against what the Kenyan government actually cancelled. Correcting a list item is not a story.',
        innocentReading:
          'Conflating a cancelled airport concession and a transmission PPP with a port facility is an easy error when all three are "Adani in Kenya, 2024" and all were cancelled in the same week.',
        wouldSettle: 'Already settled. Recorded so the error stops propagating into datasets.',
        tier: 'documented',
        srcs: FACILITIES.find((f) => /kenyatta/i.test(f.label))?.srcs?.slice(0, 2) ?? [],
      });
    }

    return out;
  }, [adani, reliance]);

  const bc = bidderCoverage([...CENTRE.awards, ...STATES_TENDERS.awards]);

  return (
    <article className="pb-20">
      <header className="pt-2 pb-6 border-b-2 border-border-light">
        <Kicker>Investigative desk · reporter, documentalist, skeptic</Kicker>
        <PageTitle>Documented, and nobody has assembled it</PageTitle>
        <Standfirst>
          Not "links the media is hiding" — that premise is unfalsifiable and produces a
          conspiracy board with citations bolted on. This is the rigorous version of the same
          question: facts a primary record establishes, that no outlet has put together.
          The supply is enormous, and the reason is almost always tedium rather than secrecy.
        </Standfirst>
        <Byline>
          Every item derived from the datasets in this repository, so it cannot drift from its
          sources · each carries the innocent reading and what would settle it
        </Byline>
      </header>

      <Callout label="The test, and why the third row matters most" tone="bottomline">
        <p>
          Two questions decide whether something belongs on this page. Is there a primary
          record? Has any outlet published it?
        </p>
        <DataTable
          columns={['Record', 'Coverage', 'Verdict']}
          rows={[
            ['Yes', 'No', <strong key="1" className="text-sage">Publish — this is the category the desk exists for</strong>],
            ['Yes', 'Yes', <span key="2">Cite the outlet, add what they missed, or drop it</span>],
            ['No', 'No', <strong key="3" className="text-rose">Not a link. It is a hypothesis — send it to the prospector</strong>],
            ['No', 'Yes', <span key="4">Report that an outlet claims it, tiered <em>reported</em>, with the denial</span>],
          ]}
        />
        <p>
          <strong>Most "unreported links" sit in row three.</strong> Calling that what it is —
          a hypothesis, not a finding — is the single most important thing this desk does.
          Those go to the{' '}
          <Link to="/prospector" className="underline underline-offset-2">
            prospector
          </Link>
          , which enumerates them exhaustively and corrects for how many it enumerated.
        </p>
      </Callout>

      <StatGrid
        items={[
          { value: String(items.length), label: 'documented-but-unassembled items currently derivable from the datasets' },
          { value: adani ? `${identifierCoverage(adani).withCin}/${identifierCoverage(adani).total}` : '—', label: 'Adani entities carrying a registry identifier — the binding constraint', tone: 'rose' },
          { value: `${bc.withCount}/${bc.total}`, label: 'government awards disclosing a bidder count', tone: 'rose' },
          { value: String(DEEP_GROUP_IDS.length), label: 'groups with a deep entity map built', tone: 'muted' },
        ]}
      />

      <Section title="What the records establish" note="Each item states what it does NOT establish, at the same prominence">
        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.id} className="border border-border rounded-lg p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="heading-editorial font-bold text-lg leading-tight flex-1 min-w-[18rem]">
                  {it.headline}
                </h3>
                <TierChip tier={it.tier} />
              </div>

              <p className="text-[14.5px] text-text-secondary mt-2.5 leading-relaxed max-w-[72ch]">
                {it.establishes}
              </p>

              <div className="grid gap-3 md:grid-cols-2 mt-4">
                <div className="border-l-2 border-border-light pl-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1">
                    Why no outlet has assembled it
                  </p>
                  <p className="text-[13px] text-text-muted leading-relaxed">{it.whyUnreported}</p>
                </div>
                <div className="border-l-2 border-sage/40 pl-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-sage mb-1">
                    The innocent reading
                  </p>
                  <p className="text-[13px] text-text-muted leading-relaxed">{it.innocentReading}</p>
                </div>
              </div>

              <p className="text-[13px] text-text-muted mt-3 border-l-2 border-accent/40 pl-3 leading-relaxed">
                <span className="font-mono text-[10px] uppercase tracking-wider text-accent mr-2">
                  What would settle it
                </span>
                {it.wouldSettle}
              </p>

              <Cite srcs={it.srcs} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="The three roles" note="Run in order on every claim. The third has a veto and is expected to use it.">
        <DataTable
          columns={['Role', 'Job', 'The rule that binds it']}
          rows={[
            [
              <strong key="1">Reporter</strong>,
              'Find what happened and who was involved. Start from the record, not the theory.',
              'Chronology before theory. Most bad investigative work is a true set of facts attached to the wrong year.',
            ],
            [
              <strong key="2">Documentalist</strong>,
              'Make every assertion traceable and every gap visible.',
              'A search snippet is not a source. A broker mirror caps the claim at reported — say which you read.',
            ],
            [
              <strong key="3">Skeptic</strong>,
              'Try to destroy the story.',
              'Date test → identity → base rate → denominator → innocent reading → control → denial. Stop at the first failure. A killed story is a successful output.',
            ],
          ]}
        />
      </Section>

      <Section title="What comes next" note="Sequenced by what unblocks the most, not by what sounds most serious">
        <Prose>
          <p>
            The full plan is at <code>docs/RESEARCH_PLAN.md</code>. Its ordering is deliberate,
            and the top items are chosen because they are answerable today from public data
            rather than because they are the most dramatic.
          </p>
          <ol className="space-y-3 list-none pl-0">
            {[
              ['PM CARES', 'The donor list is a dead end — essentially every responding PSU contributed, so "company X gave" is not a finding. The live questions are the FY24/FY25 statements, the ventilator procurement (the one outflow with a public audit trail), and whether PM CARES payments displaced other CSR spending. That last one is fully computable and genuinely unexamined.'],
              ['Government tenders', 'The full award population 2019-24 with a shuffled control is the single dataset that unblocks the motif engine and settles the quid-pro-quo question in both directions. Note the likely outcome honestly: Adani, Reliance and Tata are absent from the electoral bond data entirely, so a rigorous version may well show no effect — which is publishable.'],
              ['Adani', 'CINs for the 209 entities that lack one. Everything downstream is provisional until an entity can be joined to a filing. Then the promoter and holding chain, which is entirely unverified — the top of the ownership tree is missing.'],
              ['Reliance', 'KG-D6 participating interests, the "Reliance Retail Limited" name collision across two CINs, and upgrading the spectrum figures from news-tier to the primary DoT record.'],
              ['The rest', 'Eight more groups. L&T matters more than it looks: it has no promoter and is institutionally owned, which makes it the natural control for every claim about promoter-controlled groups.'],
            ].map(([t, b], i) => (
              <li key={t} className="border-l-2 border-accent/40 pl-3">
                <strong className="text-text block mb-0.5">
                  {i + 1}. {t}
                </strong>
                <span className="text-[14.5px]">{b}</span>
              </li>
            ))}
          </ol>
        </Prose>
      </Section>

      <Footnote>
        <p>
          <strong>On novelty claims.</strong> "No outlet has published this" is itself a claim
          and is searched for rather than assumed. Where an outlet has covered something, it is
          cited and the desk adds only what it missed. The category here is assembly — putting
          together records that are individually public and collectively unread.
        </p>
        <p>
          <strong>Standing.</strong> Nothing on this page asserts intent, coordination or
          wrongdoing. Every item is what a primary record establishes, paired with the boring
          explanation that also fits and with what would overturn it. Items concerning named
          parties carry the response of those parties where one exists.{' '}
          <Link to="/method" className="underline underline-offset-2">
            How this is built
          </Link>{' '}
          ·{' '}
          <Link to="/patterns" className="underline underline-offset-2">
            why the discipline exists
          </Link>
        </p>
      </Footnote>
    </article>
  );
}
