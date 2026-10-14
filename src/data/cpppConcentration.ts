import type { Concentration, ConcentrationRow, Portal } from './cppp';

/**
 * concentration.json, normalised — reached only through `loadConcentration()`.
 *
 * Why this module exists: the file is the largest the section loads, and the spec loads
 * it after the section has mounted, behind a named placeholder. Mapping its raw key
 * names here keeps them out of every other chunk, so the page's own code never depends
 * on this file's presence to render, and the acceptance suite can hold back exactly the
 * one chunk that carries them. The eager glob bundles the JSON into this module's chunk;
 * with research/raw/cppp/ absent it is empty and CONCENTRATION is null.
 */

interface RawRow {
  portal: Portal;
  buyer: string;
  awards: number;
  valueSumInr: number;
  markedAwards: number;
  unmarkedAwards: number;
  unmarkedShareOfAwardsPct: number;
  distinctMarkedWinners: number;
  hhiMarkedValue: number | null;
  hhiMarkedCount: number | null;
  topMarkedWinnerSharePct: number | null;
  topMarkedWinnerShareOfCountPct: number | null;
  topMarkedWinners: { name: string; awards: number; valueInr: number }[] | null;
}

interface RawFile {
  family: string;
  hhiDefinition: string;
  namingRule: string;
  innocentReading: string;
  byBuyer: RawRow[];
}

const found = Object.values(
  import.meta.glob('../../research/raw/cppp/concentration.json', { eager: true, import: 'default' }),
)[0] as RawFile | undefined;

const row = (r: RawRow): ConcentrationRow => ({
  portal: r.portal,
  buyer: r.buyer,
  awards: r.awards,
  valueSumInr: r.valueSumInr,
  markedAwards: r.markedAwards,
  unmarkedAwards: r.unmarkedAwards,
  unmarkedShareOfAwardsPct: r.unmarkedShareOfAwardsPct,
  distinctMarkedWinners: r.distinctMarkedWinners,
  hhiValue: r.hhiMarkedValue,
  hhiCount: r.hhiMarkedCount,
  topShareOfValuePct: r.topMarkedWinnerSharePct,
  topShareOfCountPct: r.topMarkedWinnerShareOfCountPct,
  // Names pass through untouched: the page never splits, joins or composes one.
  winners: r.topMarkedWinners ?? [],
});

export const CONCENTRATION: Concentration | null = found
  ? {
      family: found.family,
      hhiDefinition: found.hhiDefinition,
      namingRule: found.namingRule,
      innocentReading: found.innocentReading,
      rows: found.byBuyer.map(row),
    }
  : null;
