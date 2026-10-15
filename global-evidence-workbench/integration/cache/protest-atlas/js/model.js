// Pure selectors and status, search, filter, sort and snapshot helpers (WP2).
// DOM-free; safe to import in Node. Every time-dependent function takes `now`.
import {observationBand, datasetState, updateStamps, announcementState, daysUntil, BAND_HEADINGS, toTime, absoluteLabel, relativeLabel, isoDay} from '../freshness.js';
import {withinWindow} from '../explore.js';
import {matchesHistory} from '../history.js';

export const HOUR = 3_600_000;
const DAY = 86_400_000;
export const PAGE_SIZE = 12;
export const STATUS_LABELS = {ongoing: 'Reported ongoing', planned: 'Planned', ended: 'Ended / suspended', 'needs-review': 'Needs review · current status unknown', unknown: 'Current status not established'};

// Frozen export from app.js 3.1, now through absoluteLabel ("Sep" under every ICU version).
export function dateLabel(value) { if (!value) return 'Not established'; const time = new Date(value).getTime(); if (!Number.isFinite(time)) return 'Not established'; return absoluteLabel(isoDay(time)); }
export function getDisplayStatus(event, now = Date.now()) {
  const start = Date.parse(event.start_date);
  if (Number.isFinite(start) && start > now) return 'planned';
  if (event.status === 'ongoing') { const observed = Date.parse(event.last_observed_at); return Number.isFinite(observed) && observed <= now && now - observed < 72 * HOUR ? 'ongoing' : 'needs-review'; }
  if (event.status === 'planned' && Number.isFinite(start) && start + 72 * HOUR < now) return 'needs-review';
  return ['planned','ended','unknown'].includes(event.status) ? event.status : 'unknown';
}

const validDay = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const statusDay = value => absoluteLabel(isoDay(Date.parse(value)));   // "30 Sep 2026", the UTC day

/** E5, shared by the list, the notice and the filter sheet's error state (C-37). */
export const E5 = 'Published records could not be loaded, so coverage is unknown at the moment, not zero.';

/** E4 by emptyBandNotice result (§6.4). */
export const E4 = Object.freeze({
  fresh: 'No episode in this snapshot has evidence dated within the last 72 hours. That is a gap in this dataset, not a sign that no protests happened.',
  week: 'No episode in this snapshot has evidence dated in the last 7 days. That is a gap in this dataset, not a sign that no protests happened.',
});

/** Reported mode without contexts beside loaded records: city and outcome filters pause (MAJOR 12). */
export const contextsPaused = state => state?.mode !== 'example'
  && (Boolean(state?.load?.errors?.contexts) || (Boolean(state?.data?.events) && !state?.data?.contexts));

/**
 * Status label (ST1–ST5). With an event, the dated forms:
 * "Reported ongoing · evidence dated 2 Oct 2026" and "Ended / suspended 30 Sep 2026".
 */
export function statusLabel(status, event = null) {
  const base = STATUS_LABELS[status] ?? STATUS_LABELS.unknown;
  if (!event) return base;
  if (status === 'ongoing' && validDay(event.last_observed_at)) return `${base} · evidence dated ${statusDay(event.last_observed_at)}`;
  if (status === 'ended' && validDay(event.end_date)) return `${base} ${statusDay(event.end_date)}`;
  return base;
}

/** NFD, strip combining marks, lower case (en). "São Paulo" → "sao paulo". */
export function foldText(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('en');
}

const textOf = value => {
  if (value == null) return [];
  if (typeof value === 'string' || typeof value === 'number') return [String(value)];
  if (Array.isArray(value)) return value.flatMap(textOf);
  if (typeof value === 'object') return Object.entries(value).filter(([key]) => key !== 'source_ids').flatMap(([, v]) => textOf(v));
  return [];
};

const searchCache = new WeakMap(), NON_WORD = /[^\p{L}\p{N}]+/gu;
/**
 * Folded search text: title, summary, country, region, location, issues, positions (actor, claim, target),
 * state response (action, attribution) and the intensity texts (turnout qualifier, disruption, violence).
 */
export function searchableText(event) {
  if (!event || typeof event !== 'object') return '';
  if (searchCache.has(event)) return searchCache.get(event);
  const intensity = event.intensity ?? {};
  const turnout = intensity.turnout;
  const parts = [
    event.title, event.summary, ...countrySearchTerms(event.country, event.country_name), event.region, event.location?.label,
    ...(event.issues ?? []),
    ...(event.positions ?? []).flatMap(p => [p?.actor, p?.claim, p?.target]),
    ...(event.state_response ?? []).flatMap(r => [r?.action, r?.attribution]),
    ...(turnout && typeof turnout === 'object' ? [turnout.qualifier] : textOf(turnout)),
    ...textOf(intensity.disruption), ...textOf(intensity.violence),
  ];
  const text = ` ${foldText(parts.filter(v => v != null && v !== '').join(' ')).replace(NON_WORD, ' ')}`;
  searchCache.set(event, text);
  return text;
}

/** Folded word tokens (at most 8); each must start a word of the record (AND): "usa" is not in "Jerusalem". */
export function queryTokens(query) {
  return foldText(query).split(NON_WORD).filter(Boolean).slice(0, 8);
}

const contextIndexCache = new WeakMap();
/** Map<event_id, context record>, memoised per contexts object. */
export function indexContexts(contexts) {
  if (!contexts || typeof contexts !== 'object') return new Map();
  if (contextIndexCache.has(contexts)) return contextIndexCache.get(contexts);
  const index = new Map((contexts.records ?? []).filter(r => r && r.event_id).map(r => [r.event_id, r]));
  contextIndexCache.set(contexts, index);
  return index;
}

const namerCache = new WeakMap();
/**
 * Common English short names for formal ISO 3166 directory names, reviewed from Unicode CLDR display names.
 * Display only: public/countries.json keeps the ISO name, which stays visible where precision matters
 * (country brief, directory). Disputed or politically marked names keep their ISO form (e.g. Falkland
 * Islands (Malvinas), Hong Kong, Macao, Holy See); CLDR's "&" and "Congo - Kinshasa" styles are not used.
 */
export const COUNTRY_SHORT_NAMES = Object.freeze({
  BN: 'Brunei', BO: 'Bolivia', CD: 'DR Congo', CG: 'Republic of the Congo', FM: 'Micronesia',
  GB: 'United Kingdom', IR: 'Iran', KP: 'North Korea', KR: 'South Korea', LA: 'Laos', MD: 'Moldova',
  MF: 'Saint Martin', NL: 'Netherlands', PS: 'Palestine', RU: 'Russia', SX: 'Sint Maarten', SY: 'Syria',
  TW: 'Taiwan', TZ: 'Tanzania', US: 'United States', VE: 'Venezuela', VG: 'British Virgin Islands',
  VI: 'US Virgin Islands', VN: 'Vietnam',
});

/** Extra search terms people commonly type. Search only; never displayed. */
export const COUNTRY_ALIASES = Object.freeze({
  AE: ['UAE'], BA: ['Bosnia'], CD: ['DRC', 'Congo-Kinshasa', 'Zaire'], CG: ['Congo-Brazzaville'],
  CI: ['Ivory Coast', "Cote d'Ivoire"], CV: ['Cape Verde'], CZ: ['Czech Republic'], FK: ['Falklands', 'Malvinas'],
  GB: ['UK', 'Britain', 'Great Britain'],
  KP: ['DPRK'], KR: ['Korea'], MK: ['Macedonia'], MM: ['Burma'], NL: ['Holland'],
  PS: ['Palestinian territories', 'Gaza', 'West Bank'], SZ: ['Swaziland'], TL: ['East Timor'],
  TR: ['Turkey', 'Turkiye'], US: ['USA', 'US', 'America'], VA: ['Vatican'],
});

export function displayCountryName(code, isoName) {
  return COUNTRY_SHORT_NAMES[code] || isoName || code || '';
}

/** Every name a reader might search for: ISO name, short display name and aliases. */
export function countrySearchTerms(code, isoName) {
  return [...new Set([isoName, COUNTRY_SHORT_NAMES[code], ...(COUNTRY_ALIASES[code] ?? [])].filter(Boolean))];
}

/**
 * code → display name (short common name, else the countries.json name; memoised per directory), else the code itself.
 * Without a directory (countries.json failed, so data.countries is []) every record shows its code, as the
 * countries-error notice says (C-37); short names are never mixed in.
 */
const codeOnly = code => code;
export function countryNamer(countries) {
  if (!Array.isArray(countries) || !countries.length) return codeOnly;
  if (!namerCache.has(countries)) {
    const names = new Map(countries.map(c => [c?.code, c?.name]));
    namerCache.set(countries, code => displayCountryName(code, names.get(code)) || code);
  }
  return namerCache.get(countries);
}

/** One event against the 9 filters. ignoreCountry also ignores city (map keeps world context). */
export function eventMatches(event, filters, {context = null, now = Date.now(), ignoreCountry = false} = {}) {
  const f = filters ?? {};
  if (f.query) {
    const text = searchableText(event);
    if (!queryTokens(f.query).every(token => text.includes(` ${token}`))) return false;
  }
  if (!ignoreCountry && f.country && event.country !== f.country) return false;
  if (f.status && getDisplayStatus(event, now) !== f.status) return false;
  if (f.region && event.region !== f.region) return false;
  if (f.issue && !(event.issues ?? []).includes(f.issue)) return false;
  if (!withinWindow(event, f.window, now)) return false;
  return matchesHistory(event, context, {year: f.year || '', city: ignoreCountry ? '' : (f.city || ''), outcome: f.outcome || ''});
}

const observedTime = event => {
  const time = toTime(event?.last_observed_at);
  return Number.isFinite(time) ? time : -Infinity;
};
/** New array, newest last_observed_at first. Ties keep published file order (stable sort, C-34). */
export function sortByObservation(events) {
  return (events ?? []).map((event, index) => ({event, index, time: observedTime(event)}))
    .sort((a, b) => (a.time === b.time ? a.index - b.index : a.time > b.time ? -1 : 1))
    .map(row => row.event);
}

/** Reported envelope events, or the example events in example mode. */
export function selectEvents(state) {
  if (state?.mode === 'example') return state?.data?.examples?.events ?? [];
  return state?.data?.events?.events ?? [];
}

/** Filter and sort without caching. */
function filterEvents(state, filters, ignoreCountry) {
  const contexts = state?.mode === 'example' ? null : state?.data?.contexts ?? null;
  const index = indexContexts(contexts);
  const now = state?.now ?? Date.now();
  const applied = contextsPaused(state) ? {...filters, city: '', outcome: ''} : filters;
  return sortByObservation(selectEvents(state).filter(e => eventMatches(e, applied, {context: index.get(e.id) ?? null, now, ignoreCountry})));
}

// One memo per ignoreCountry flag, so the list and the map do not evict each other.
const filterCache = new Map();
/** Filtered and sorted events for the current state (memoised on the inputs that matter). */
export function selectFiltered(state, {ignoreCountry = false} = {}) {
  const key = [selectEvents(state), state?.filters, state?.now, state?.mode === 'example' ? null : state?.data?.contexts ?? null, contextsPaused(state)];
  const hit = filterCache.get(ignoreCountry);
  if (hit && hit.key.every((v, i) => v === key[i])) return hit.result;
  const result = filterEvents(state, state?.filters, ignoreCountry);
  filterCache.set(ignoreCountry, {key, result});
  return result;
}

/** Number of active filters: window !== 'all' counts as one, the search query as one. */
export function activeFilterCount(filters) {
  const f = filters ?? {};
  return ['query', 'country', 'region', 'issue', 'status', 'year', 'city', 'outcome'].filter(k => f[k]).length + (f.window && f.window !== 'all' ? 1 : 0);
}

/** Years with dated evidence (start, end, latest evidence, timeline), newest first. */
export function availableYears(events) {
  const years = new Set();
  for (const e of events ?? []) {
    for (const date of [e.start_date, e.end_date, e.last_observed_at, ...(e.timeline ?? []).map(t => t?.date)]) {
      if (typeof date === 'string' && /^20\d{2}/.test(date)) years.add(date.slice(0, 4));
    }
  }
  return [...years].sort((a, b) => b.localeCompare(a));
}

const byLabel = (a, b) => a.label.localeCompare(b.label, 'en');
/** [{value: 'CC:Name', label: 'Name · Country'}], unique, A–Z, optionally for one country. */
export function cityOptions(events, contextIndex, country = '') {
  const index = contextIndex instanceof Map ? contextIndex : new Map();
  const options = new Map();
  for (const e of events ?? []) {
    if (country && e.country !== country) continue;
    for (const city of index.get(e.id)?.cities ?? []) {
      if (!city?.name) continue;
      const value = `${e.country}:${city.name}`;
      if (!options.has(value)) options.set(value, {value, label: `${city.name} · ${displayCountryName(e.country, e.country_name)}`});
    }
  }
  return [...options.values()].sort(byLabel);
}

/** Regions and issues present in the data, A–Z, no counts. */
export function refinementOptions(events) {
  const regions = new Set(), issues = new Set();
  for (const e of events ?? []) {
    if (e.region) regions.add(e.region);
    for (const issue of e.issues ?? []) if (issue) issues.add(issue);
  }
  const az = (a, b) => a.localeCompare(b, 'en');
  return {regions: [...regions].sort(az), issues: [...issues].sort(az)};
}

const STATUS_ORDER = ['ongoing', 'planned', 'needs-review', 'ended', 'unknown'];
/**
 * Status filter options with counts computed with every other filter applied (C-07).
 * "Any status" comes first. Options with no match are omitted unless they are the current value.
 */
export function statusOptions(state) {
  const filtered = filterEvents(state, {...(state?.filters ?? {}), status: ''}, false);
  const now = state?.now ?? Date.now();
  const counts = Object.fromEntries(STATUS_ORDER.map(s => [s, 0]));
  for (const e of filtered) {
    const s = getDisplayStatus(e, now);
    counts[s in counts ? s : 'unknown'] += 1;
  }
  const current = state?.filters?.status ?? '';
  return [{value: '', label: 'Any status', count: filtered.length},
    ...STATUS_ORDER.filter(s => counts[s] > 0 || s === current).map(s => ({value: s, label: STATUS_LABELS[s], count: counts[s]}))];
}

/** Scope numbers only; never rankings and never "N in the last 7 days" (C-08). */
export function datasetStats(envelope, countries, now) {
  const events = envelope?.events ?? [];
  const directory = Array.isArray(countries) ? countries : [];
  const codes = new Set(directory.map(c => c.code));
  const withRecords = new Set(events.map(e => e.country).filter(code => !codes.size || codes.has(code)));
  return {
    episodes: events.length,
    countriesWithRecords: withRecords.size,
    directoryTotal: directory.length,
    newestEvidence: updateStamps({events: envelope}).latestObservation,
    fresh: events.filter(e => observationBand(e, now) === 'fresh').length,
  };
}

/** Whole-snapshot state from the newest evidence date (C-02). */
export function snapshotState(envelope, now) {
  if (!envelope) return 'unknown';
  return datasetState(updateStamps({events: envelope}).latestObservation, now);
}

/**
 * "2 Oct 2026, 22:45 UTC · 1 hour ago" for a timestamp. Once it is a day old the relative part counts UTC days,
 * so S1 and the dates sheet agree with the chip and notice day counts (§16.2 item 8, C-52).
 */
export function snapshotAgeText(value, now) {
  const time = toTime(value);
  if (!Number.isFinite(time)) return absoluteLabel(value);
  const relative = now - time >= DAY ? relativeLabel(isoDay(time), now) : relativeLabel(value, now);
  return `${absoluteLabel(value)} · ${relative}`;
}

/** Whole UTC days from the newest evidence day to today; null when no valid evidence date. */
export function evidenceAgeDays(envelope, now) {
  const latest = toTime(updateStamps({events: envelope}).latestObservation);
  if (!Number.isFinite(latest) || !Number.isFinite(now)) return null;
  return Math.floor(now / DAY) - Math.floor(latest / DAY);
}

// freshness.js month names, so a note written as "2 Oct 2026" parses with the table that writes it.
const MONTHS = Array.from({length: 12}, (_, i) => absoluteLabel(isoDay(Date.UTC(2000, i, 1))).split(' ')[1]);
const isoFromLabel = label => {
  const [, day, month, year] = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(label) ?? [];
  const m = MONTHS.indexOf(month) + 1;
  const iso = m ? `${year}-${String(m).padStart(2, '0')}-${day.padStart(2, '0')}` : '';
  return Number.isFinite(Date.parse(iso)) ? iso : null;
};

/**
 * The latest sweep facts, parsed from data (never hard-coded): events.coverage_note and upcoming.note (§6.6).
 * → {records: {day, blocked} | null, announcements: {day, blocked, searches, pagesRead} | null}
 */
export function sweepFact({events, upcoming} = {}) {
  let records = null;
  const note = typeof events?.coverage_note === 'string' ? events.coverage_note : '';
  const blocked = /A recent-activity search on (\d{1,2} [A-Z][a-z]{2} \d{4}) logged (\d+) searches but could not open news articles/.exec(note);
  const read = /A recent-activity search on (\d{1,2} [A-Z][a-z]{2} \d{4}) read (\d+) source pages/.exec(note);
  const recordMatch = blocked || read;
  const recordDay = recordMatch && isoFromLabel(recordMatch[1]);
  if (recordDay) records = {day: recordDay, blocked: Boolean(blocked)};
  let announcements = null;
  const upNote = typeof upcoming?.note === 'string' ? upcoming.note : '';
  const a = /Latest search for announcements: (\d{4}-\d{2}-\d{2}), (\d+) searches logged, (\d+) source pages could be opened/.exec(upNote);
  if (a && Number.isFinite(Date.parse(a[1]))) {
    const pagesRead = Number(a[3]);
    announcements = {day: a[1], blocked: pagesRead === 0, searches: Number(a[2]), pagesRead};
  }
  return {records, announcements};
}

/** S7 from a sweepFact result (§6.4); '' unless the latest records sweep is known to have been blocked. */
export function sweepLine(sweep) {
  const day = sweep?.records?.blocked ? sweep.records.day : null;
  return day ? `A search for newer reports on ${absoluteLabel(day)} could not open news websites, so no records were added. Recent coverage is especially thin.` : '';
}

const BAND_ORDER = ['fresh', 'week', 'month', 'older', 'unknown'];
const yearOf = event => (typeof event?.last_observed_at === 'string' ? event.last_observed_at.slice(0, 4) : '');
/** "Earlier research, {min}–{max}" from the group's own evidence years. */
function olderHeading(events) {
  const years = events.map(yearOf).filter(y => /^\d{4}$/.test(y)).sort();
  if (!years.length) return BAND_HEADINGS.older;
  const [min, max] = [years[0], years[years.length - 1]];
  return `Earlier research, ${min === max ? min : `${min}–${max}`}`;
}

/**
 * Groups by latest-evidence band, in band order, keeping the input order inside each group.
 * → [{band, heading, events}] with no empty group.
 */
export function groupByBand(events, now) {
  const groups = new Map(BAND_ORDER.map(b => [b, []]));
  for (const e of events ?? []) groups.get(observationBand(e, now)).push(e);
  return BAND_ORDER.filter(b => groups.get(b).length).map(band => {
    const list = groups.get(band);
    return {band, heading: band === 'older' ? olderHeading(list) : BAND_HEADINGS[band], events: list};
  });
}

/**
 * E4 over the whole reported snapshot (filters ignored): 'fresh' when the 72-hour band is empty but the
 * 3–7 day band is not; 'week' when both are empty; null otherwise (or with no events at all).
 */
export function emptyBandNotice(allEvents, now) {
  const list = allEvents ?? [];
  if (!list.length) return null;
  const bands = new Set(list.map(e => observationBand(e, now)));
  if (bands.has('fresh')) return null;
  return bands.has('week') ? 'fresh' : 'week';
}

/**
 * Everything time-dependent the UI shows, as one string. A change means a re-render is due:
 * display status and band per record, announcement state and day count, snapshot state and its day count.
 */
export function timeSnapshot(state) {
  const now = state?.now ?? Date.now();
  const reported = state?.data?.events?.events ?? [];
  const examples = state?.data?.examples?.events ?? [];
  const records = [...reported, ...examples].map(e => `${e.id}:${getDisplayStatus(e, now)}:${observationBand(e, now)}`).join('|');
  const items = (state?.data?.upcoming?.items ?? []).map((item, i) => `${item?.id ?? i}:${announcementState(item, now)}:${daysUntil(item, now)}`).join('|');
  const envelope = state?.data?.events ?? null;
  return `${records}#${items}#${snapshotState(envelope, now)}:${evidenceAgeDays(envelope, now)}`;
}
