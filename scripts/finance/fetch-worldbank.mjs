#!/usr/bin/env node
/**
 * fetch-worldbank.mjs — every World Bank project for India, as a fleet research file.
 *
 * Writes research/raw/finance/worldbank-projects.json in the shape of the fleet contract
 * (scratchpad/fleet-common/CONTRACT.md; docs/research/FLEET_CONTRACT.md): entities,
 * one `loan` claim per project per lender, voids, base rates, a symmetry sentence and
 * gaps. Everything in the file is `documented` (official portal API) — no person, no
 * narrative, no analytic claim; the research agent adds ministers and conditions.
 *
 * Sources, all fetched here and hashed:
 *   - Projects API v3: https://search.worldbank.org/api/v3/projects?format=json&countrycode_exact=IN&rows=500&os=<offset>
 *     The v3 index holds 1,117 India projects but does not carry `lendinginstr`, `url`,
 *     `sector1`, `mjsector1` or `theme1` (probed 2026-09-26 with an explicit `fl=`; the v3
 *     names for the commitments are `curr_ibrd_commitment`, `curr_ida_commitment`,
 *     `totalamt`, `grantamt`, `curr_total_commitment`).
 *   - Projects API v2, same query: 882 of the 1,117, carrying `lendinginstr`, `url`,
 *     `sector1`, `mjsector1`, `theme1`. Joined by project id for those fields only.
 *   - PA.NUS.FCRF (official exchange rate, LCU per US$, period average, annual):
 *     https://api.worldbank.org/v2/country/IND/indicator/PA.NUS.FCRF?format=json&per_page=100
 *
 * Conversion: ₹ crore = US$ × rate(approval year) / 1e7, stated in every `d` as
 * "US$X m at ₹Y/US$ (WB PA.NUS.FCRF, <year>)". A year past the series' last value takes
 * the last value and says so; a year before its first (1960) gets no ₹ amount and says
 * "amount not stated" (in US$ m only).
 *
 * Node 20+, ESM, no dependencies. `node scripts/finance/fetch-worldbank.mjs [--out <path>]`.
 * The pure builder is exported for scripts/finance/fetch-worldbank.test.mjs.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');

export const V3_URL = (os) => `https://search.worldbank.org/api/v3/projects?format=json&countrycode_exact=IN&rows=500&os=${os}`;
export const V3_FIELDS = 'id,project_name,boardapprovaldate,closingdate,status,borrower,impagency,totalcommamt,totalamt,grantamt,ibrdcommamt,curr_ibrd_commitment,idacommamt,curr_ida_commitment,curr_total_commitment,lendprojectcost,lendinginstr,projectfinancialtype,sector1,mjsector1,major_sector_name,theme1,regionname,url,project_abstract,pdo';
export const V2_URL = (os) => `https://search.worldbank.org/api/v2/projects?format=json&countrycode_exact=IN&rows=500&os=${os}`;
export const V2_FIELDS = 'id,lendinginstr,url,sector1,mjsector1,theme1,totalcommamt,ibrdcommamt,idacommamt,status';
export const FX_URL = 'https://api.worldbank.org/v2/country/IND/indicator/PA.NUS.FCRF?format=json&per_page=100';
export const PROJECT_URL = (id) => `https://projects.worldbank.org/en/projects-operations/project-detail/${id}`;
const LENDER_PAGES = [
  ['fin:ibrd', 'https://www.worldbank.org/en/who-we-are/ibrd'],
  ['fin:ida', 'https://ida.worldbank.org/en/about'],
];

export const sha16 = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

// ---------------------------------------------------------------------------
// Names → ids
// ---------------------------------------------------------------------------

/** State/UT name → code (contract list). Longest names first so "Andhra Pradesh" wins over "Pradesh". */
export const STATES = [
  ['andaman and nicobar islands', 'an', 'Andaman and Nicobar Islands'], ['andaman & nicobar', 'an', 'Andaman and Nicobar Islands'],
  ['andhra pradesh', 'ap', 'Andhra Pradesh'], ['arunachal pradesh', 'ar', 'Arunachal Pradesh'], ['assam', 'as', 'Assam'],
  ['bihar', 'br', 'Bihar'], ['chandigarh', 'ch', 'Chandigarh'], ['chhattisgarh', 'ct', 'Chhattisgarh'], ['chattisgarh', 'ct', 'Chhattisgarh'],
  ['dadra and nagar haveli', 'dn', 'Dadra and Nagar Haveli'], ['daman and diu', 'dd', 'Daman and Diu'],
  ['nct of delhi', 'dl', 'Delhi'], ['delhi', 'dl', 'Delhi'], ['goa', 'ga', 'Goa'], ['gujarat', 'gj', 'Gujarat'],
  ['haryana', 'hr', 'Haryana'], ['himachal pradesh', 'hp', 'Himachal Pradesh'], ['jammu and kashmir', 'jk', 'Jammu and Kashmir'],
  ['jammu & kashmir', 'jk', 'Jammu and Kashmir'], ['jharkhand', 'jh', 'Jharkhand'], ['karnataka', 'ka', 'Karnataka'],
  ['kerala', 'kl', 'Kerala'], ['lakshadweep', 'ld', 'Lakshadweep'], ['madhya pradesh', 'mp', 'Madhya Pradesh'],
  ['maharashtra', 'mh', 'Maharashtra'], ['manipur', 'mn', 'Manipur'], ['meghalaya', 'ml', 'Meghalaya'], ['mizoram', 'mz', 'Mizoram'],
  ['nagaland', 'nl', 'Nagaland'], ['odisha', 'or', 'Odisha'], ['orissa', 'or', 'Odisha'], ['puducherry', 'py', 'Puducherry'],
  ['pondicherry', 'py', 'Puducherry'], ['punjab', 'pb', 'Punjab'], ['rajasthan', 'rj', 'Rajasthan'], ['sikkim', 'sk', 'Sikkim'],
  ['tamil nadu', 'tn', 'Tamil Nadu'], ['tamilnadu', 'tn', 'Tamil Nadu'], ['telangana', 'tg', 'Telangana'], ['tripura', 'tr', 'Tripura'],
  ['uttar pradesh', 'up', 'Uttar Pradesh'], ['uttarakhand', 'ut', 'Uttarakhand'], ['uttaranchal', 'ut', 'Uttarakhand'],
  ['west bengal', 'wb', 'West Bengal'],
];
const STATE_LABEL = Object.fromEntries(STATES.map(([, code, label]) => [code, label]));

/** Normalised comparison key: case, punctuation, common abbreviations and spelling slips removed. */
export function norm(s) {
  return String(s ?? '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bgovt\.?\b/g, 'government')
    .replace(/\bgoverment\b/g, 'government')
    .replace(/\bfinanace\b/g, 'finance')
    .replace(/\bdepartmen t\b/g, 'department')
    .replace(/\bdept\.?\b/g, 'department')
    .replace(/\bltd\.?\b/g, 'limited')
    .replace(/\bminsitry\b/g, 'ministry')
    .replace(/\bmaharasthra\b/g, 'maharashtra')
    .replace(/\bdevelopemnt\b/g, 'development')
    .replace(/\bworlks\b/g, 'works')
    .replace(/\bheath\b/g, 'health')
    .replace(/\bgotn\b/g, 'government of tamil nadu')
    .replace(/\bgoup\b/g, 'government of uttar pradesh')
    .replace(/\bgomp\b/g, 'government of madhya pradesh')
    .replace(/\bgowb\b/g, 'government of west bengal')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^the /, '');
}
const stripParen = (s) => String(s).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
export function slug(s) {
  const words = norm(stripParen(s)).split(' ').filter(Boolean);
  let out = '';
  for (const w of words) { if (out && out.length + 1 + w.length > 64) break; out = out ? `${out}-${w}` : w; }
  return out || 'unnamed';
}

/** The Union borrower: India, the Republic, GoI, DEA, MoF — all one node. */
const UNION_RE = /^(india|republic of india|government of india|goi|india government of india|dea|department of economic affairs|ministry of finance|department of economic affairs ministry of finance|india department of economic affairs government of india)$/;
function isUnionBorrower(key) {
  if (UNION_RE.test(key)) return true;
  if (/department of economic affairs|\bdea\b/.test(key) && !STATES.some(([n]) => key.includes(n))) return true;
  if (/^(republic of india|india) ministry of finance$/.test(key)) return true;
  if (/^ministry of finance (department of economic affairs|government of india)$/.test(key)) return true;
  return false;
}

/** Detect the state a name belongs to; null for the Union and for names with no state word. */
export function detectState(raw) {
  const key = ` ${norm(raw)} `;
  for (const [name, code] of STATES) if (key.includes(` ${name} `)) return code;
  return null;
}

/** "Government of X", "State of X", "Finance Department, Government of X", "X" alone: the state government itself. */
function isStateGovernment(key, code) {
  const names = STATES.filter(([, c]) => c === code).map(([n]) => n);
  return names.some((n) =>
    key === n || key === `government of ${n}` || key === `state of ${n}` || key === `state government of ${n}` ||
    key === `${n} government` || key === `${n} state government` || key.endsWith(` government of ${n}`) ||
    key.endsWith(` state of ${n}`) || key.startsWith(`government of ${n} `) || key === `${n} state` || key === `government of ${n} ministry of finance`);
}

/**
 * New nodes the hand map creates (id → shape). A name in HAND may point at an inventory
 * id or at one of these. Types are from the body's statute or registration as commonly
 * known; the research agent confirms before adding facts.
 *
 * Nothing here may duplicate a node the graph already has: a body in the inventory
 * (SECI is the Atlas `seci`, ELCOT the welfare `wel:elcot`) is reached through HAND, and a
 * Union ministry is the national `min:` node src/graph/build.ts derives from
 * research/raw/cabinet.json (listed in id-inventory.json with src "cabinet"), never a
 * `fin:` id. Only departments that are not cabinet portfolios (DoT, DPIIT) stay `fin:`.
 * A NEW id a sibling finance file already uses is spelt as that file spells it
 * (`fin:nmcg`, contracts.json), so the two records are one node.
 * fetch-worldbank.test.mjs holds these rules.
 */
export const NEW = {
  'fin:sidbi': { label: 'Small Industries Development Bank of India', ty: 'psu', fam: 'state', st: 'up', al: ['SIDBI'] },
  'fin:iifcl': { label: 'India Infrastructure Finance Company Limited', ty: 'psu', fam: 'state', st: 'dl', al: ['IIFCL'] },
  'fin:nabfid': { label: 'National Bank for Financing Infrastructure and Development', ty: 'psu', fam: 'state', st: 'mh', al: ['NaBFID'] },
  'fin:national-housing-bank': { label: 'National Housing Bank', ty: 'psu', fam: 'state', st: 'dl', al: ['NHB'] },
  'fin:eesl': { label: 'Energy Efficiency Services Limited', ty: 'psu', fam: 'state', st: 'dl', al: ['EESL'] },
  'fin:dfccil': { label: 'Dedicated Freight Corridor Corporation of India Limited', ty: 'psu', fam: 'state', st: 'dl', al: ['DFCCIL'] },
  'fin:ndma': { label: 'National Disaster Management Authority', ty: 'agency', fam: 'state', st: 'dl', al: ['NDMA'] },
  'fin:nhai': { label: 'National Highways Authority of India', ty: 'agency', fam: 'state', st: 'dl', al: ['NHAI'] },
  'fin:nrida': { label: 'National Rural Infrastructure Development Agency (ex-NRRDA)', ty: 'agency', fam: 'state', st: 'dl', al: ['NRIDA', 'NRRDA', 'National Rural Roads Development Agency'] },
  'fin:central-water-commission': { label: 'Central Water Commission', ty: 'agency', fam: 'state', st: 'dl', al: ['CWC'] },
  'fin:nmcg': { label: 'National Mission for Clean Ganga', ty: 'agency', fam: 'state', st: 'dl', al: ['NMCG'] },
  'fin:icar': { label: 'Indian Council of Agricultural Research', ty: 'agency', fam: 'state', st: 'dl', al: ['ICAR'] },
  'fin:icmr': { label: 'Indian Council of Medical Research', ty: 'agency', fam: 'state', st: 'dl', al: ['ICMR'] },
  'fin:department-of-telecommunications': { label: 'Department of Telecommunications', ty: 'ministry', fam: 'state', st: 'dl', al: ['DoT'] },
  'fin:dpiit': { label: 'Department for Promotion of Industry and Internal Trade', ty: 'ministry', fam: 'state', st: 'dl', al: ['DPIIT'] },
  'fin:tamil-nadu-urban-development-fund': { label: 'Tamil Nadu Urban Development Fund', ty: 'fund', fam: 'state', st: 'tn', al: ['TNUDF'] },
  'fin:tamil-nadu-health-systems-project': { label: 'Tamil Nadu Health Systems Project (society)', ty: 'agency', fam: 'state', st: 'tn', al: ['TNHSP'] },
  'fin:aprdc': { label: 'Andhra Pradesh Road Development Corporation', ty: 'psu', fam: 'state', st: 'ap', al: ['APRDC'] },
  'fin:krwsa': { label: 'Kerala Rural Water Supply and Sanitation Agency (Jalanidhi)', ty: 'agency', fam: 'state', st: 'kl', al: ['KRWSA'] },
  'fin:mrvc': { label: 'Mumbai Railway Vikas Corporation', ty: 'psu', fam: 'state', st: 'mh', al: ['MRVC'] },
  'fin:hppcl': { label: 'Himachal Pradesh Power Corporation Limited', ty: 'psu', fam: 'state', st: 'hp', al: ['HPPCL'] },
  'fin:hpptcl': { label: 'Himachal Pradesh Power Transmission Corporation Limited', ty: 'psu', fam: 'state', st: 'hp', al: ['HPPTCL'] },
  'fin:hpsebl': { label: 'Himachal Pradesh State Electricity Board Limited', ty: 'psu', fam: 'state', st: 'hp', al: ['HPSEBL', 'HPSLDC'] },
  'fin:hpridc': { label: 'Himachal Pradesh Road and Other Infrastructure Development Corporation', ty: 'psu', fam: 'state', st: 'hp', al: ['HPRIDC'] },
  'fin:himurja': { label: 'HIMURJA (Himachal Pradesh Energy Development Agency)', ty: 'agency', fam: 'state', st: 'hp', al: ['HimUrja'] },
  'fin:dhbvn': { label: 'Dakshin Haryana Bijli Vitran Nigam', ty: 'psu', fam: 'state', st: 'hr', al: ['DHBVN'] },
  'fin:hvpn': { label: 'Haryana Vidyut Prasaran Nigam', ty: 'psu', fam: 'state', st: 'hr', al: ['HVPN', 'HVPNL'] },
  'fin:prbdb': { label: 'Punjab Roads and Bridges Development Board', ty: 'agency', fam: 'state', st: 'pb', al: ['PRBDB', 'PMU-PRBDB'] },
  'fin:mysuru-city-corporation': { label: 'Mysuru City Corporation', ty: 'agency', fam: 'state', st: 'ka', al: ['Mysore City Corporation'] },
  'fin:midfc': { label: 'Meghalaya Infrastructure Development and Finance Corporation', ty: 'psu', fam: 'state', st: 'ml', al: ['MIDFC'] },
  'fin:octdms': { label: 'Odisha Community Tank Development and Management Society', ty: 'agency', fam: 'state', st: 'or', al: ['OCTDMS', 'Orissa Community Based Tank Management Society'] },
  'fin:mahatransco-mahagenco': null,
};
delete NEW['fin:mahatransco-mahagenco'];

/** Short forms added as aliases when a name resolves to one of these inventory ids. */
const INV_AL = {
  'min:ministry-of-health-and-family-welfare': ['MoHFW'],
  'min:ministry-of-education': ['MHRD', 'MoE'],
  'min:ministry-of-housing-and-urban-affairs': ['MoHUA'],
  'min:ministry-of-personnel-public-grievances-and-pensions': ['DoPT'],
  'min:ministry-of-road-transport-and-highways': ['MoRTH'],
  'min:ministry-of-skill-development-and-entrepreneurship-independent-charge-': ['MSDE'],
  'min:ministry-of-statistics-and-programme-implementation-independent-charge-': ['MoSPI'],
  'min:ministry-of-women-and-child-development': ['MWCD'],
  'min:ministry-of-development-of-north-eastern-region': ['MDoNER'],
  'seci': ['SECI'],
  'wel:elcot': ['ELCOT'],
};

/** The national graph's ministry id for a portfolio name — src/graph/build.ts ministryNode(). */
export const ministryId = (label) => `min:${String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

/** Hand map of World Bank spellings → inventory id or NEW id. Keys are norm(stripParen(name)). */
const HAND = {
  'state bank of india': 'co:state-bank-of-india', 'sbi': 'co:state-bank-of-india',
  'indian renewable energy development agency limited': 'energy:ireda', 'indian renewable energy development agency': 'energy:ireda', 'ireda': 'energy:ireda',
  'ntpc limited': 'co:ntpc', 'national thermal power corporation': 'co:ntpc', 'national thermal power corporation limited': 'co:ntpc', 'ntpc': 'co:ntpc',
  'power grid corporation of india limited': 'co:power-grid', 'powergrid corporation of india limited': 'co:power-grid', 'power grid corporation of india': 'co:power-grid', 'powergrid': 'co:power-grid', 'powergrid corporation limited': 'co:power-grid',
  'power finance corporation limited': 'co:power-finance-corporation', 'power finance corporation': 'co:power-finance-corporation',
  'rural electrification corporation limited': 'co:rec-limited', 'rural electrification corporation': 'co:rec-limited', 'rec limited': 'co:rec-limited',
  'nhpc limited': 'co:nhpc', 'national hydroelectric power corporation': 'co:nhpc', 'national hydroelectric power corporation limited': 'co:nhpc',
  'coal india limited': 'co:coal-india', 'oil and natural gas corporation limited': 'co:ongc', 'oil and natural gas corporation': 'co:ongc', 'ongc': 'co:ongc',
  'indian oil corporation limited': 'co:indian-oil', 'gail india limited': 'co:gail-india', 'steel authority of india limited': 'co:sail',
  'oil india limited': 'co:oil-india', 'sjvn limited': 'co:sjvn', 'nathpa jhakri power corporation': 'co:sjvn', 'satluj jal vidyut nigam limited': 'co:sjvn',
  'neyveli lignite corporation limited': 'co:nlc-india', 'neyveli lignite corporation': 'co:nlc-india',
  'tehri hydro development corporation': 'energy:thdc', 'thdc india limited': 'energy:thdc', 'thdc': 'energy:thdc',
  'north eastern electric power corporation': 'energy:neepco', 'neepco': 'energy:neepco',
  'sardar sarovar narmada nigam limited': 'energy:ssnnl', 'uttar pradesh power corporation limited': 'energy:uppcl',
  'maharashtra state electricity distribution company limited': 'energy:msedcl', 'maharashtra state electricity board': 'energy:msedcl',
  'maharashtra state power generation company limited': 'energy:mahagenco',
  'tamil nadu generation and distribution corporation': 'energy:tangedco', 'tamil nadu generation and distribution corporation limited': 'energy:tangedco', 'tangedco tamil nadu': 'energy:tangedco', 'tangedco': 'energy:tangedco', 'tamil nadu electricity board': 'energy:tangedco',
  'grid corporation of odisha': 'energy:gridco', 'grid corporation of orissa': 'energy:gridco', 'gridco': 'energy:gridco',
  'andhra pradesh southern power distribution company limited': 'energy:apspdcl',
  'andhra pradesh central power distribution company limited': 'energy:ap-discoms', 'andhra pradesh central power distribution corporation limited': 'energy:ap-discoms', 'andhra pradesh eastern power distribution company limited': 'energy:ap-discoms',
  'central electricity authority': 'energy:cea', 'central electricity authority republic of india': 'energy:cea', 'central electricity regulatory commission': 'energy:cerc',
  'ministry of power': 'min:ministry-of-power', 'ministry of coal': 'min:ministry-of-coal', 'ministry of mines': 'min:ministry-of-mines', 'ministry of steel': 'min:ministry-of-steel',
  'ministry of new and renewable energy': 'min:ministry-of-new-and-renewable-energy', 'ministry of non conventional energy sources': 'min:ministry-of-new-and-renewable-energy',
  'ministry of petroleum and natural gas': 'min:ministry-of-petroleum-and-natural-gas',
  'ministry of environment and forests': 'min:ministry-of-environment-forest-and-climate-change', 'ministry of environment forest and climate change': 'min:ministry-of-environment-forest-and-climate-change', 'ministry of environment forests and climate change': 'min:ministry-of-environment-forest-and-climate-change',
  'ministry of rural development': 'min:ministry-of-rural-development', 'department of land resources': 'min:ministry-of-rural-development',
  'ministry of agriculture': 'min:ministry-of-agriculture-and-farmers-welfare', 'ministry of agriculture and farmers welfare': 'min:ministry-of-agriculture-and-farmers-welfare', 'department of agriculture and cooperation': 'min:ministry-of-agriculture-and-farmers-welfare', 'department of agriculture cooperation and farmers welfare': 'min:ministry-of-agriculture-and-farmers-welfare', 'department of agriculture and farmers welfare': 'min:ministry-of-agriculture-and-farmers-welfare',
  'ministry of water resources': 'min:ministry-of-jal-shakti', 'ministry of jal shakti': 'min:ministry-of-jal-shakti', 'ministry of water resources river development and ganga rejuvenation': 'min:ministry-of-jal-shakti', 'ministry of drinking water and sanitation': 'min:ministry-of-jal-shakti', 'department of drinking water and sanitation': 'min:ministry-of-jal-shakti', 'department of drinking water': 'min:ministry-of-jal-shakti', 'department of water resources river development and ganga rejuvenation': 'min:ministry-of-jal-shakti', 'department of water resources rd and gr': 'min:ministry-of-jal-shakti', 'department of water resources ganga rejuvenation and river development': 'min:ministry-of-jal-shakti',
  'ministry of micro small and medium enterprises': 'min:ministry-of-micro-small-and-medium-enterprises', 'ministry of msme': 'min:ministry-of-micro-small-and-medium-enterprises',
  'ministry of consumer affairs food and public distribution': 'min:ministry-of-consumer-affairs-food-and-public-distribution',
  'department of financial services': 'min:ministry-of-finance', 'department of expenditure': 'min:ministry-of-finance', 'department of revenue': 'min:ministry-of-finance',
  'food corporation of india': 'wel:fci', 'reserve bank of india': 'wel:rbi', 'rbi': 'wel:rbi', 'niti aayog': 'wel:niti-aayog', 'planning commission': 'wel:niti-aayog',
  'unique identification authority of india': 'wel:uidai', 'uidai': 'wel:uidai', 'department of posts': 'wel:india-post',
  'department of atomic energy': 'min:department-of-atomic-energy', 'ministry of external affairs': 'min:ministry-of-external-affairs',
  'election commission of india': 'energy:eci', 'geological survey of india': 'energy:gsi',
  'government of national capital territory of delhi': 'energy:govt-of-nct-delhi', 'government of nct of delhi': 'energy:govt-of-nct-delhi',
  // New nodes
  'small industries development bank of india': 'fin:sidbi', 'sidbi': 'fin:sidbi',
  'india infrastructure finance company limited': 'fin:iifcl', 'iifcl': 'fin:iifcl',
  'national bank for financing infrastructure and development': 'fin:nabfid', 'nabfid': 'fin:nabfid',
  'national housing bank': 'fin:national-housing-bank', 'nhb': 'fin:national-housing-bank',
  'energy efficiency services limited': 'fin:eesl', 'eesl': 'fin:eesl',
  'dedicated freight corridor corporation of india limited': 'fin:dfccil', 'dfccil': 'fin:dfccil',
  'solar energy corporation of india limited': 'seci', 'solar energy corporation of india': 'seci',
  'national disaster management authority': 'fin:ndma', 'ndma': 'fin:ndma',
  'national highways authority of india': 'fin:nhai', 'nhai': 'fin:nhai',
  'national rural roads development agency': 'fin:nrida', 'national rural road development agency': 'fin:nrida', 'national rural infrastructure development agency': 'fin:nrida', 'nrrda': 'fin:nrida', 'nrida': 'fin:nrida',
  'central water commission': 'fin:central-water-commission',
  'national mission for clean ganga': 'fin:nmcg', 'nmcg': 'fin:nmcg',
  'indian council of agricultural research': 'fin:icar', 'indian council for agricultural research': 'fin:icar', 'icar': 'fin:icar',
  'indian council of medical research': 'fin:icmr', 'indian council for medical research': 'fin:icmr', 'icmr': 'fin:icmr',
  'department of telecommunications': 'fin:department-of-telecommunications', 'wireless planning coordination wing within dot': 'fin:department-of-telecommunications', 'telecommunications engineering center': 'fin:department-of-telecommunications', 'telecommunication engineering centre': 'fin:department-of-telecommunications',
  'department for promotion of industry and internal trade': 'fin:dpiit', 'dpiit': 'fin:dpiit', 'department of industrial policy and promotion': 'fin:dpiit',
  'ministry of health and family welfare': 'min:ministry-of-health-and-family-welfare', 'department of health and family welfare ministry of health and family welfare': 'min:ministry-of-health-and-family-welfare',
  'ministry of education': 'min:ministry-of-education', 'ministry of human resource development': 'min:ministry-of-education', 'department of school education and literacy': 'min:ministry-of-education',
  'ministry of urban development': 'min:ministry-of-housing-and-urban-affairs', 'ministry of housing and urban poverty alleviation': 'min:ministry-of-housing-and-urban-affairs', 'ministry of housing and urban affairs': 'min:ministry-of-housing-and-urban-affairs',
  'ministry of fisheries animal husbandry and dairying': 'min:ministry-of-fisheries-animal-husbandry-and-dairying', 'department of animal husbandry and dairying': 'min:ministry-of-fisheries-animal-husbandry-and-dairying', 'department of fisheries': 'min:ministry-of-fisheries-animal-husbandry-and-dairying',
  'ministry of personnel public grievances and pensions': 'min:ministry-of-personnel-public-grievances-and-pensions', 'department of personnel and training': 'min:ministry-of-personnel-public-grievances-and-pensions',
  'ministry of road transport and highways': 'min:ministry-of-road-transport-and-highways',
  'ministry of skill development and entrepreneurship': 'min:ministry-of-skill-development-and-entrepreneurship-independent-charge-',
  'ministry of statistics and programme implementation': 'min:ministry-of-statistics-and-programme-implementation-independent-charge-',
  'ministry of women and child development': 'min:ministry-of-women-and-child-development',
  'ministry of minority affairs': 'min:ministry-of-minority-affairs',
  'ministry of development of north eastern region': 'min:ministry-of-development-of-north-eastern-region',
  'tnudf': 'fin:tamil-nadu-urban-development-fund', 'tamil nadu urban development fund': 'fin:tamil-nadu-urban-development-fund',
  'tnhsp': 'fin:tamil-nadu-health-systems-project', 'tamil nadu health systems project': 'fin:tamil-nadu-health-systems-project',
  'elcot': 'wel:elcot', 'electronics corporation of tamil nadu': 'wel:elcot', 'electronics corporation of tamil nadu limited': 'wel:elcot',
  'aprdc': 'fin:aprdc', 'andhra pradesh road development corporation': 'fin:aprdc',
  'krwsa': 'fin:krwsa', 'kerala rural water supply and sanitation agency': 'fin:krwsa',
  'mrvc': 'fin:mrvc', 'mumbai railway vikas corporation': 'fin:mrvc', 'mumbai railway vikas corporation limited': 'fin:mrvc',
  'hppcl': 'fin:hppcl', 'himachal pradesh power corporation limited': 'fin:hppcl',
  'hpptcl': 'fin:hpptcl', 'himachal pradesh power transmission corporation limited': 'fin:hpptcl',
  'hpsebl': 'fin:hpsebl', 'hpsldc': 'fin:hpsebl', 'himachal pradesh state electricity board limited': 'fin:hpsebl', 'himachal pradesh state electricity board': 'fin:hpsebl',
  'hpridc': 'fin:hpridc', 'himachal pradesh road and other infrastructure development corporation': 'fin:hpridc',
  'himurja': 'fin:himurja',
  'dhbvn': 'fin:dhbvn', 'dakshin haryana bijli vitran nigam': 'fin:dhbvn', 'dakshin haryana bijli vitran nigam limited': 'fin:dhbvn',
  'hvpn': 'fin:hvpn', 'hvpnl': 'fin:hvpn', 'haryana vidyut prasaran nigam': 'fin:hvpn', 'haryana vidyut prasaran nigam limited': 'fin:hvpn',
  'up pwd': 'energy:state-uttar-pradesh', 'uttar pradesh public works department': 'energy:state-uttar-pradesh',
  'pmu prbdb': 'fin:prbdb', 'prbdb': 'fin:prbdb', 'punjab roads and bridges development board': 'fin:prbdb',
  'mysore city corporation': 'fin:mysuru-city-corporation', 'mysuru city corporation': 'fin:mysuru-city-corporation',
  'meghalaya infrastructure development and finance corporation': 'fin:midfc', 'meghalaya infrastructure development finance corporation': 'fin:midfc',
  'odisha community tank development and management society': 'fin:octdms', 'orissa community based tank management society': 'fin:octdms', 'orissa community tank development and management society': 'fin:octdms',
};

/** City → state, for `st` on bodies named after a city. */
const CITIES = [
  ['bangalore', 'ka'], ['bengaluru', 'ka'], ['hubli', 'ka'], ['dharwad', 'ka'], ['mysore', 'ka'], ['mysuru', 'ka'], ['ahmedabad', 'gj'], ['surat', 'gj'], ['vadodara', 'gj'],
  ['amritsar', 'pb'], ['ludhiana', 'pb'], ['chennai', 'tn'], ['madras', 'tn'], ['coimbatore', 'tn'], ['mumbai', 'mh'], ['bombay', 'mh'], ['pune', 'mh'], ['pimpri chinchwad', 'mh'], ['nagpur', 'mh'],
  ['indore', 'mp'], ['bhopal', 'mp'], ['rewa', 'mp'], ['gurugram', 'hr'], ['gurgaon', 'hr'], ['shimla', 'hp'], ['jaipur', 'rj'], ['ajmer', 'rj'], ['jodhpur', 'rj'], ['naya raipur', 'ct'], ['raipur', 'ct'],
  ['kolkata', 'wb'], ['calcutta', 'wb'], ['hyderabad', 'tg'], ['lucknow', 'up'], ['kanpur', 'up'], ['patna', 'br'], ['bhubaneswar', 'or'], ['kochi', 'kl'], ['cochin', 'kl'], ['thiruvananthapuram', 'kl'],
  ['dispur', 'as'], ['guwahati', 'as'], ['askot', 'ut'], ['dehradun', 'ut'], ['ranchi', 'jh'], ['bhakra', 'hp'], ['damodar', 'wb'],
];
function detectCity(key) {
  const k = ` ${key} `;
  for (const [c, code] of CITIES) if (k.includes(` ${c} `)) return code;
  return null;
}

/** Inventory ids by normalised label and alias; only institutional types so a person's name never matches. */
export function inventoryIndex(inventory) {
  const byKey = new Map();
  const byId = new Map();
  const INST = new Set(['ministry', 'state', 'psu', 'agency', 'company', 'trust', 'fund']);
  for (const e of inventory.ids ?? []) {
    byId.set(e.id, e);
    if (!INST.has(e.ty)) continue;
    for (const name of [e.label, ...(e.al ?? [])]) {
      const k = norm(stripParen(name));
      if (k.length < 4) continue; // "ECL", "REC" are ambiguous alone
      if (!byKey.has(k)) byKey.set(k, e.id);
    }
  }
  return { byKey, byId, stateIds: stateIdIndex(inventory) };
}

/** Which inventory id stands for each state government (energy:state-*, energy:govt-of-*). */
function stateIdIndex(inventory) {
  const out = {};
  for (const e of inventory.ids ?? []) {
    if (e.ty !== 'state') continue;
    const m = /^(?:energy:)?(?:state-|govt-of-|state-of-)(.+)$/.exec(e.id);
    const code = detectState(e.label) ?? (m ? detectState(m[1].replace(/-/g, ' ')) : null);
    if (code && !out[code] && /government of|state of/i.test(e.label)) out[code] = e.id;
  }
  return out;
}

const TY_GUESS = [
  [/\b(ministry)\b/, 'ministry', 'state'],
  [/\b(municipal corporation|city corporation|mahanagara palike|nagar nigam|nagar palika|municipality|metropolitan development authority|urban local bodies)\b/, 'agency', 'state'],
  [/\b(bank|finance corporation|financing|financial services)\b/, 'psu', 'state'],
  [/\b(limited|corporation|company|nigam|undertaking|utility|electricity board|transco|genco|discom|discoms|spv)\b/, 'psu', 'state'],
  [/\b(foundation|trust|association|ngo|sangh|sewa|pradan|samiti|sangam|federation)\b/, 'trust', 'recipient'],
  [/\b(department|directorate|commission|authority|board|mission|society|council|agency|secretariat|institute|university|cell|unit|office|administration|panchayat|centre|center|bureau|organisation|organization|parishad|sansthan|tribunal|wing)\b/, 'agency', 'state'],
];
function guessType(key) {
  for (const [re, ty, fam] of TY_GUESS) if (re.test(key)) return { ty, fam };
  return { ty: 'agency', fam: 'state' };
}

const BODY_RE = /\b(limited|corporation|company|nigam|board|authority|agency|mission|society|university|institute|bank|foundation|parishad|sansthan|council|commission|tribunal|fund|project|unit|palike|municipality|spv)\b/;
/** A department, directorate or wing: an organ of a government, not a body corporate. */
const isDepartment = (key) => /\b(department|directorate|secretariat|wing|commissionerate|organisation|organization|finance|planning)\b/.test(key) && !BODY_RE.test(key);
/** Generic organ names that cannot be placed without a state ("Water Resources Department", "Department of Agriculture"). */
const isGeneric = (key) => isDepartment(key) && !/\b(india|indian|national|central|union|ministry)\b/.test(key) && !detectState(key);
/** Strip the Union suffixes and "under/within the ministry of …" tails a WB entry adds to a body's name. */
const unionCore = (key) => key.replace(/\b(the )?(republic of india|government of india|goi)\b/g, ' ').replace(/\s+/g, ' ').trim();

function fromId(id, idx, how) {
  const e = idx.byId.get(id);
  if (e) return { id, label: e.label, ty: e.ty, fam: e.ty === 'trust' ? 'recipient' : e.ty === 'company' ? 'market' : 'state', st: detectState(e.label) ?? detectCity(norm(e.label)), al: INV_AL[id], how, isNew: false };
  const n = NEW[id];
  if (n) return { id, label: n.label, ty: n.ty, fam: n.fam, st: n.st, al: n.al, how, isNew: true };
  throw new Error(`hand map points at unknown id ${id}`);
}

function stateNode(st, idx, how) {
  const invId = idx.stateIds[st];
  return invId
    ? { id: invId, label: idx.byId.get(invId).label, ty: 'state', fam: 'state', st, how: `${how} → inventory state id`, isNew: false }
    : { id: `fin:state-${slug(STATE_LABEL[st])}`, label: `Government of ${STATE_LABEL[st]}`, ty: 'state', fam: 'state', st, how: `${how} → new fin:state id`, isNew: true };
}

/** A Union ministry the inventory does not list: the id build.ts would derive for it, never a `fin:` id. */
function unionMinistry(key, how) {
  const label = key.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bOf\b/g, 'of').replace(/\bAnd\b/g, 'and');
  return { id: ministryId(label), label, ty: 'ministry', fam: 'state', st: 'dl', how: `${how} → min: id by the national ministry rule (not in cabinet.json)`, isNew: true };
}

/** Segments of a compound name: "Central Water Commission, Ministry of Jal Shakti" → both parts. */
const segments = (raw) => stripParen(raw).split(/,\s+|\s+under\s+(?:the\s+)?|\s+within\s+|\s*:\s+|\s+-\s+/).map((x) => norm(x)).filter((x) => x.length >= 3);

/**
 * Resolve one borrower / implementing-agency name to a node. Returns
 * { id, label, ty, fam, st, how, isNew } or null when the name cannot be placed
 * (a generic department with no state anywhere). `how` records the rule that fired so
 * the research agent can audit the resolution. `hintState` is the state the project
 * title names, used only for generic department names.
 */
export function resolveName(raw, idx, role, hintState = null) {
  const key0 = norm(stripParen(raw));
  const stripped = norm(raw);
  if (!key0) return null;
  if (isUnionBorrower(key0) || isUnionBorrower(stripped)) {
    return { id: 'min:ministry-of-finance', label: 'Ministry of Finance', ty: 'ministry', fam: 'state', st: 'dl', how: 'Union borrower (India / Republic of India / DEA / MoF) → Ministry of Finance', isNew: false };
  }
  const key = unionCore(key0);
  for (const k of [key0, stripped, key]) {
    if (HAND[k]) return fromId(HAND[k], idx, 'hand alias map');
    const inv = idx.byKey.get(k);
    if (inv) return fromId(inv, idx, 'inventory label/alias match');
  }
  const st = detectState(raw);
  if (st && isStateGovernment(key, st)) return stateNode(st, idx, 'state-government pattern');
  // A department or wing of a state government is the state government node (the
  // department's name is kept as an alias and in the claim's d).
  if (st && isDepartment(key)) return stateNode(st, idx, 'state department → state government node');
  // Compound names: the first segment that resolves wins; a Union ministry segment
  // ("…, Ministry of Jal Shakti") places its department.
  const segs = segments(raw).map(unionCore);
  if (segs.length > 1) {
    for (const s of segs) {
      if (HAND[s]) return fromId(HAND[s], idx, `hand alias map on segment "${s}"`);
      const inv = idx.byKey.get(s);
      if (inv) return fromId(inv, idx, `inventory match on segment "${s}"`);
    }
    const sSt = segs.map((s) => detectState(s)).find(Boolean);
    if (sSt && segs.every((s) => isDepartment(s) || isStateGovernment(s, sSt) || detectState(s) === sSt)) return stateNode(sSt, idx, 'state department segments → state government node');
    const min = segs.find((s) => /^ministry of /.test(s));
    if (min) return unionMinistry(min, `Union ministry segment "${min}"`);
  }
  if (isGeneric(key)) {
    if (hintState) return stateNode(hintState, idx, `generic department name placed by the state in the project title (${STATE_LABEL[hintState]})`);
    return null;
  }
  if (/^(project implementing entity|urban local bodies|state agency for public services|various|to be determined|tbd|not applicable|n a)$/.test(key)) return null;
  if (!st && /^ministry of /.test(key)) return unionMinistry(key, 'Union ministry name');
  const g = guessType(key);
  const label = stripParen(raw).replace(/\s+,/g, ',').replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  return { id: `fin:${slug(key)}`, label, ty: g.ty, fam: g.fam, st: st ?? detectCity(key) ?? null, how: `new fin: id; type "${g.ty}" inferred from the name`, isNew: true, role };
}

/** Split a World Bank agency or borrower field. Several bodies are joined with "," and no space; a comma inside one name is followed by a space. */
export const splitAgencies = (s) => String(s ?? '').split(/,(?=\S)/).map((x) => x.trim()).filter(Boolean);

// ---------------------------------------------------------------------------
// Money and dates
// ---------------------------------------------------------------------------

/** US$ from a v3 or v2 amount field ("325,100,000" or "325100000"); null when absent. */
export function usd(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}
export const usdM = (n) => Math.round(n / 1e4) / 100; // US$ → US$ million, 2 dp
const fmtM = (m) => (Number.isInteger(m) ? String(m) : m.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

/** Year → LCU per US$ from the PA.NUS.FCRF response body. */
export function fxTable(fxJson) {
  const rows = Array.isArray(fxJson) ? fxJson[1] ?? [] : [];
  const t = {};
  for (const r of rows) if (r && r.value != null) t[Number(r.date)] = Number(r.value);
  const years = Object.keys(t).map(Number).sort((a, b) => a - b);
  return { rates: t, first: years[0] ?? null, last: years[years.length - 1] ?? null };
}

/** The rate for an approval year, and the note explaining which year's rate was used. */
export function rateFor(fx, year) {
  if (year == null || fx.last == null) return null;
  if (fx.rates[year] != null) return { rate: fx.rates[year], year, note: `WB PA.NUS.FCRF, ${year}` };
  if (year > fx.last) return { rate: fx.rates[fx.last], year: fx.last, note: `WB PA.NUS.FCRF, ${fx.last} — latest available, ${year} not yet published` };
  return null; // before the series begins
}

/** ₹ crore from US$ at a rate: crore = US$ × ₹/US$ ÷ 1e7, 2 dp. */
export const toCrore = (usdAmt, rate) => Math.round((usdAmt * rate) / 1e7 * 100) / 100;

/** ISO 8601 reduced-precision date from "2027-07-15T00:00:00Z", "2032-12-31" or "9/30/2030 12:00:00 AM". */
export function isoDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  m = /^(\d{4})$/.exec(s);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const UPA = ['2004-05-22', '2014-05-25'];
const NDA = ['2014-05-26', '2099-12-31'];
const inSpan = (d, [a, b]) => d != null && d >= a && d <= b;

/**
 * Turn fetched bodies into the research file. Pure: same inputs, same output.
 *   v3Pages: [{ url, text }], v2Pages: [{ url, text }], fx: { url, text },
 *   inventory: the id inventory, asOf: 'YYYY-MM-DD', lenderPages: [{ id, url, ok }]
 */
export function build({ v3Pages, v2Pages = [], fx, inventory, asOf, lenderPages = [] }) {
  const idx = inventoryIndex(inventory);
  const pages = [];
  const v3 = [];
  for (const p of v3Pages) {
    const j = JSON.parse(p.text);
    const rows = Object.values(j.projects ?? {});
    pages.push({ api: 'v3', url: p.url, sha256_16: sha16(p.text), bytes: p.text.length, rows: rows.length, total: Number(j.total) });
    v3.push(...rows);
  }
  const v2 = new Map();
  for (const p of v2Pages) {
    const j = JSON.parse(p.text);
    const rows = Object.values(j.projects ?? {});
    pages.push({ api: 'v2', url: p.url, sha256_16: sha16(p.text), bytes: p.text.length, rows: rows.length, total: Number(j.total) });
    for (const r of rows) v2.set(r.id, r);
  }
  const fxT = fxTable(JSON.parse(fx.text));
  pages.push({ api: 'indicator', url: fx.url, sha256_16: sha16(fx.text), bytes: fx.text.length, rows: Object.keys(fxT.rates).length, total: Object.keys(fxT.rates).length });
  const runId = sha16([...v3Pages, ...v2Pages, fx].map((p) => p.text).join('\n'));

  // De-duplicate by project id (a page boundary can repeat a row when the index moves).
  const seen = new Set();
  const projects = v3.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const apiSrc = ['World Bank Projects API v3 (India)', pages[0].url];
  const entities = new Map();
  const aliasOwner = new Map();
  const mentions = new Map(); // id → { asBorrower: Set(pid), asAgency: Set(pid), names: Set }
  const touch = (r, pid, role, rawName) => {
    if (!entities.has(r.id)) {
      entities.set(r.id, {
        id: r.id, label: r.label, sub: '', ty: r.ty, fam: r.fam, st: r.st ?? null, sz: 2, al: [], resolved: true,
        identity: { cin: null, din: null, nse: null, office: null, lei: null, fcra: null },
        publicRole: '', d: [], srcs: [apiSrc], _how: new Set(), _new: r.isNew,
      });
      mentions.set(r.id, { asBorrower: new Set(), asAgency: new Set(), names: new Set() });
    }
    const e = entities.get(r.id);
    e._how.add(r.how);
    for (const a of r.al ?? []) {
      const ak = norm(a);
      if (norm(e.label) !== ak && !aliasOwner.has(ak)) { aliasOwner.set(ak, r.id); e.al.push(a); }
    }
    const m = mentions.get(r.id);
    (role === 'borrower' ? m.asBorrower : m.asAgency).add(pid);
    if (rawName == null) return;
    const cleaned = String(rawName).replace(/\s+/g, ' ').trim();
    m.names.add(cleaned);
    const k = norm(cleaned);
    if (cleaned && norm(e.label) !== k && !aliasOwner.has(k)) {
      aliasOwner.set(k, r.id);
      e.al.push(cleaned);
    }
  };

  const lenderSrc = (id) => {
    const lp = lenderPages.find((x) => x.id === id && x.ok);
    return lp ? [apiSrc, ['World Bank', lp.url]] : [apiSrc];
  };
  entities.set('fin:ibrd', {
    id: 'fin:ibrd', label: 'IBRD', sub: 'World Bank lending arm for middle-income and creditworthy borrowers', ty: 'fund', fam: 'capital', st: null, sz: 4,
    al: ['International Bank for Reconstruction and Development', 'World Bank (IBRD)'], resolved: true,
    identity: { cin: null, din: null, nse: null, office: null, lei: null, fcra: null },
    publicRole: 'Multilateral lender to the Republic of India since 1949; every IBRD loan to India is a public contract approved by the Bank\'s Board and guaranteed or borrowed by the Union.',
    d: [], srcs: lenderSrc('fin:ibrd'), _how: new Set(), _new: true,
  });
  entities.set('fin:ida', {
    id: 'fin:ida', label: 'IDA', sub: 'World Bank concessional arm; India graduated from IDA in 2014', ty: 'fund', fam: 'capital', st: null, sz: 3,
    al: ['International Development Association', 'World Bank (IDA)'], resolved: true,
    identity: { cin: null, din: null, nse: null, office: null, lei: null, fcra: null },
    publicRole: 'Concessional multilateral lender to India (credits, not loans, at near-zero interest) until graduation; the largest IDA recipient historically.',
    d: [], srcs: lenderSrc('fin:ida'), _how: new Set(), _new: true,
  });
  for (const a of ['International Bank for Reconstruction and Development', 'World Bank (IBRD)']) aliasOwner.set(norm(a), 'fin:ibrd');
  for (const a of ['International Development Association', 'World Bank (IDA)']) aliasOwner.set(norm(a), 'fin:ida');

  const claims = [];
  const projectRows = [];
  const totals = { projects: projects.length, claims: 0, croreExclPipeline: 0, usdMExclPipeline: 0, pipeline: 0, dropped: 0, grantOnly: 0, otherOnly: 0, noRupee: 0, borrowerUnstated: 0, agencyUnstated: 0, noInstrument: 0 };
  const byYear = {}; // year → { n, cr, usdM }
  const byState = {}; // code → { n, cr, usdM }
  const byStatus = {};
  const byInstrument = {};
  const byLender = { 'fin:ibrd': { n: 0, cr: 0, usdM: 0 }, 'fin:ida': { n: 0, cr: 0, usdM: 0 } };
  const era = { upa: { n: 0, cr: 0, usdM: 0 }, nda: { n: 0, cr: 0, usdM: 0 }, pre2004: { n: 0, cr: 0, usdM: 0 } };
  let seq = 0;
  const nextId = () => `worldbank:c${String(++seq).padStart(4, '0')}`;

  for (const p of projects) {
    const v2r = v2.get(p.id);
    const status = p.status ?? null;
    byStatus[status ?? 'unknown'] = (byStatus[status ?? 'unknown'] ?? 0) + 1;
    const from = isoDate(p.boardapprovaldate);
    const to = isoDate(p.closingdate ?? v2r?.closingdate);
    const year = from ? Number(from.slice(0, 4)) : null;
    const pipeline = status === 'Pipeline' || (from != null && from > asOf);
    const instrument = v2r?.lendinginstr ?? null;
    const url = v2r?.url ?? PROJECT_URL(p.id);
    const ibrd = usd(p.curr_ibrd_commitment) ?? usd(p.ibrdcommamt) ?? usd(v2r?.ibrdcommamt);
    const ida = usd(p.curr_ida_commitment) ?? usd(p.idacommamt) ?? usd(v2r?.idacommamt);
    const grant = usd(p.grantamt);
    const total = usd(p.totalamt) ?? usd(p.curr_total_commitment) ?? usd(v2r?.totalcommamt);
    const fin = Array.isArray(p.projectfinancialtype) ? [...new Set(p.projectfinancialtype)] : p.projectfinancialtype ? [String(p.projectfinancialtype)] : [];
    const sector = p.major_sector_name ?? (v2r?.mjsector1?.Name || null);
    const theme = typeof v2r?.theme1 === 'string' && !/^!\$!/.test(v2r.theme1) ? v2r.theme1 : null;
    const abstract = typeof p.project_abstract === 'string' ? p.project_abstract : p.project_abstract?.['cdata!'] ?? (typeof v2r?.project_abstract === 'string' ? v2r.project_abstract : v2r?.project_abstract?.['cdata!']) ?? null;

    const borrowerRaw = (p.borrower ?? v2r?.borrower ?? '').trim();
    const agencyRaw = (p.impagency ?? v2r?.impagency ?? '').trim();
    const titleState = detectState(p.project_name);
    const agencyNames = splitAgencies(agencyRaw);
    const agencies = agencyNames.map((a) => ({ raw: a, r: resolveName(a, idx, 'agency', titleState) })).filter((x) => x.r);
    const unplaced = agencyNames.filter((a) => !resolveName(a, idx, 'agency', titleState));
    // Several borrowers joined with "," — the first is the borrower of record here; the rest are noted.
    const borrowerNames = splitAgencies(borrowerRaw);
    const borrowerRs = borrowerNames.map((b) => resolveName(b, idx, 'borrower', titleState)).filter(Boolean);
    const borrowerR = borrowerRs[0] ?? null;
    // The projects table keeps the row whatever its status; claims are for loans that exist.
    // A state attribution comes from a state-government node, a body seated in a state
    // (Delhi-seated Union bodies do not make a project a Delhi project), or the title.
    const stateCode = (borrowerR && borrowerR.ty === 'state' ? borrowerR.st : null)
      ?? agencies.map((a) => (a.r.ty === 'state' ? a.r.st : null)).find(Boolean)
      ?? agencies.map((a) => (a.r.st && a.r.st !== 'dl' && a.r.ty !== 'ministry' ? a.r.st : null)).find(Boolean)
      ?? titleState ?? null;
    projectRows.push({
      id: p.id, project_name: p.project_name ?? null, status, boardapprovaldate: from, closingdate: to, pipeline,
      borrower: borrowerRaw || null, impagency: agencyRaw || null, projectfinancialtype: fin, lendinginstr: instrument,
      ibrd_usd: ibrd, ida_usd: ida, grant_usd: grant, total_usd: total, lendprojectcost_usd: usd(p.lendprojectcost),
      curr_total_commitment_usd: usd(p.curr_total_commitment), major_sector_name: sector, sector1: v2r?.sector1?.Name || null, theme1: theme,
      regionname: p.regionname ?? null, url, project_abstract: abstract, pdo: p.pdo ?? null,
      borrower_id: borrowerR?.id ?? null, impagency_ids: agencies.map((a) => a.r.id), state: stateCode,
    });

    if (status === 'Dropped') { totals.dropped++; continue; }
    if (!instrument) totals.noInstrument++;
    if (instrument) byInstrument[instrument] = (byInstrument[instrument] ?? 0) + 1;

    // Lender legs: IBRD and/or IDA by non-zero amount; by projectfinancialtype when no amount is given.
    const legs = [];
    let amountNote = null;
    if (ibrd > 0) legs.push(['fin:ibrd', ibrd]);
    if (ida > 0) legs.push(['fin:ida', ida]);
    if (!legs.length) {
      const hasIbrd = fin.includes('IBRD'), hasIda = fin.includes('IDA');
      // One lender named, its own field absent (not zero), a total stated: the total less
      // any grant is that lender's commitment, and d says so.
      const single = hasIbrd !== hasIda;
      const own = hasIbrd ? ibrd : ida;
      const fromTotal = single && own == null && total > 0 ? total - (grant ?? 0) : null;
      if (fromTotal > 0) amountNote = `${hasIbrd ? 'IBRD' : 'IDA'} amount taken from the total commitment less grants (lender field absent in the API)`;
      if (hasIbrd) legs.push(['fin:ibrd', fromTotal > 0 ? fromTotal : null]);
      if (hasIda) legs.push(['fin:ida', fromTotal > 0 ? fromTotal : null]);
      if (!legs.length) {
        if (grant > 0 || fin.includes('Grants')) { totals.grantOnly++; continue; }
        // Neither IBRD nor IDA named ("Other": GEF, carbon finance, co-financing): not an IBRD/IDA loan.
        totals.otherOnly++;
        continue;
      }
    }

    // Resolve the borrower node now that the project carries a claim.
    let t;
    if (borrowerR) {
      t = borrowerR;
    } else {
      totals.borrowerUnstated++;
      t = { id: 'min:ministry-of-finance', label: 'Ministry of Finance', ty: 'ministry', fam: 'state', st: 'dl', how: 'borrower not stated in API — Union (DEA) recorded by default; every IBRD/IDA operation in India is borrowed or guaranteed by the Republic of India', isNew: false };
    }
    touch(t, p.id, 'borrower', borrowerNames[0] || null);
    for (let i = 1; i < borrowerRs.length; i++) touch(borrowerRs[i], p.id, 'borrower', borrowerNames[i]);
    for (const a of agencies) touch(a.r, p.id, 'agency', a.raw);
    if (!agencies.length) totals.agencyUnstated++;
    const who = agencies[0]?.r.id ?? t.id;

    for (const [lender, amt] of legs) {
      const fxr = amt != null ? rateFor(fxT, year) : null;
      // A pipeline operation is not a loan yet: its US$ figure and the rate that would
      // apply are stated in d, but `a` stays empty so no ₹ total can count it.
      const cr = amt != null && fxr && !pipeline ? toCrore(amt, fxr.rate) : null;
      const parts = [];
      if (amt != null && fxr && pipeline) parts.push(`US$${fmtM(usdM(amt))} m at ₹${fxr.rate.toFixed(2)}/US$ (${fxr.note}) — ₹ amount not stated: pipeline, not yet approved`);
      else if (amt != null && fxr) parts.push(`US$${fmtM(usdM(amt))} m at ₹${fxr.rate.toFixed(2)}/US$ (${fxr.note})`);
      else if (amt != null) parts.push(`US$${fmtM(usdM(amt))} m — no PA.NUS.FCRF rate for ${year ?? 'an unknown year'} (series begins ${fxT.first}); ₹ amount not stated, in US$ m only`);
      else parts.push(`amount not stated in the API for the ${lender === 'fin:ibrd' ? 'IBRD' : 'IDA'} leg (projectfinancialtype ${JSON.stringify(fin)}, total US$${total != null ? fmtM(usdM(total)) : '?'} m)`);
      if (amountNote) parts.push(amountNote);
      parts.push(`instrument: ${instrument ?? 'not in the v3 API (v2 index lacks this project)'}`);
      parts.push(`status: ${status ?? 'unknown'}`);
      if (pipeline) parts.push('PIPELINE — approval date in the future; not yet a loan; excluded from totals');
      parts.push(`approved ${from ?? 'date not stated'}${to ? `, closes ${to}` : ''}`);
      parts.push(`borrower: ${borrowerRaw ? `"${borrowerNames[0]}"` : 'not stated in API — Union (DEA) by default'} → ${t.id}${borrowerRs.length > 1 ? `; co-borrowers: ${borrowerRs.slice(1).map((b, i) => `"${borrowerNames[i + 1]}" → ${b.id}`).join(', ')}` : ''}`);
      parts.push(agencies.length ? `implementing: ${agencies.map((a) => `"${a.raw}" → ${a.r.id}`).join('; ')}${unplaced.length ? `; unplaced (generic name, no state): ${unplaced.map((u) => `"${u}"`).join(', ')}` : ''}` : agencyRaw ? `implementing agency "${agencyRaw}" cannot be placed by name (generic department, no state stated) — benefit recorded to the borrower` : 'implementing agency not stated in API');
      if (sector) parts.push(`sectors: ${sector}`);
      if (theme) parts.push(`theme: ${theme}`);
      if (legs.length === 2) parts.push('blend: IBRD and IDA legs recorded as two claims');
      parts.push('terms (rate, tenor, grace, conditions) are not in the API — Loan/Financing Agreement and Program Document needed');

      const claim = {
        id: nextId(), s: lender, t: t.id, pred: 'loan', tier: 'documented',
        a: cr, lab: `${p.id} — ${p.project_name ?? ''}`.trim(), d: parts.join('; '),
        from, to,
        srcs: [['World Bank', url]],
        terms: { instrument, ratePct: null, tenorYears: null, graceYears: null, conditions: [] },
        benefit: { who, how: agencies.length ? 'implements the loan-funded programme' : 'implementing agency not stated in the API; borrower recorded', amountCr: cr, confidence: agencies.length ? 'documented' : 'unknown' },
        innocentReading: null, upgradeIf: 'Loan Agreement and Program Document fetched: terms, conditions and ministers at approval recorded', killIf: 'project page shows the operation cancelled before signing or the amount revised to zero', supersededBy: null,
      };
      claims.push(claim);
      totals.claims++;
      if (amt != null && cr == null && !pipeline) totals.noRupee++;
      if (pipeline) { totals.pipeline++; continue; }
      const m = amt != null ? usdM(amt) : 0;
      if (cr != null) totals.croreExclPipeline += cr;
      totals.usdMExclPipeline += m;
      const bump = (o) => { o.n++; o.cr += cr ?? 0; o.usdM += m; };
      bump(byLender[lender]);
      if (year != null) bump(byYear[year] ??= { n: 0, cr: 0, usdM: 0 });
      if (stateCode) bump(byState[stateCode] ??= { n: 0, cr: 0, usdM: 0 });
      if (inSpan(from, UPA)) bump(era.upa); else if (inSpan(from, NDA)) bump(era.nda); else if (from) bump(era.pre2004);
    }
  }
  totals.croreExclPipeline = Math.round(totals.croreExclPipeline * 100) / 100;
  totals.usdMExclPipeline = Math.round(totals.usdMExclPipeline * 100) / 100;

  // Finish entities: descriptions from mentions; drop private helpers.
  const ents = [];
  for (const e of entities.values()) {
    const m = mentions.get(e.id);
    if (m) {
      const b = [...m.asBorrower].sort(), a = [...m.asAgency].sort();
      if (b.length) e.d.push(`Named as borrower in ${b.length} World Bank project${b.length === 1 ? '' : 's'} (${b.slice(0, 8).join(', ')}${b.length > 8 ? ', …' : ''}) [documented]`);
      if (a.length) e.d.push(`Named as implementing agency in ${a.length} World Bank project${a.length === 1 ? '' : 's'} (${a.slice(0, 8).join(', ')}${a.length > 8 ? ', …' : ''}) [documented]`);
      e.d.push(`Resolution: ${[...e._how].join(' | ')}${m.names.size > 1 ? `; API spellings: ${[...m.names].slice(0, 6).map((x) => `"${x}"`).join(', ')}${m.names.size > 6 ? ', …' : ''}` : ''}`);
      if (e._new && !/^fin:(ibrd|ida)$/.test(e.id)) e.d.push('New to the graph: id created from the API name; type inferred from the name — confirm before adding facts');
      const weight = b.length * 2 + a.length;
      e.sz = e.id === 'min:ministry-of-finance' ? 4 : e.ty === 'state' ? 3 : weight >= 6 ? 3 : weight >= 2 ? 2 : 1;
      e.publicRole = e.publicRole || (b.length ? 'Borrower of record on World Bank operations' : 'Implementing agency of World Bank-financed operations');
      if (e.id === 'min:ministry-of-finance') e.sub = 'Department of Economic Affairs — the Union borrower of record for IBRD/IDA operations';
      else if (e.ty === 'state') e.sub = 'State government — borrower or implementing government of World Bank operations';
    } else {
      e.d.push(`Lender on ${byLender[e.id].n} non-pipeline claims in this file, US$${fmtM(Math.round(byLender[e.id].usdM * 100) / 100)} m, ₹${Math.round(byLender[e.id].cr).toLocaleString('en-IN')} crore at PA.NUS.FCRF approval-year rates [documented]`);
    }
    delete e._how; delete e._new;
    ents.push(e);
  }
  ents.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // Symmetry: the same lens on UPA and NDA, and on states.
  const fmtCr = (x) => Math.round(x).toLocaleString('en-IN');
  const fmtUsd = (x) => Math.round(x).toLocaleString('en-US');
  const upaYears = 10.0, ndaYears = Math.max(0.1, (Date.UTC(...asOf.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0))) - Date.UTC(2014, 4, 26)) / (365.25 * 864e5));
  const stateRows = Object.entries(byState).sort((a, b) => b[1].usdM - a[1].usdM);
  const stateUsd = stateRows.reduce((s, [, v]) => s + v.usdM, 0);
  const stateCr = stateRows.reduce((s, [, v]) => s + v.cr, 0);
  const top = stateRows.slice(0, 6).map(([c, v]) => `${STATE_LABEL[c]} ${Math.round((100 * v.usdM) / stateUsd)}% (US$${fmtUsd(v.usdM)} m, ${v.n} claims)`).join(', ');
  const symmetryCheck = `Same lens on both eras, computed from this file's non-pipeline loan claims (Dropped projects and grant-only trust-fund operations excluded): UPA (approvals 2004-05-22 to 2014-05-25) ${era.upa.n} claims, US$${fmtUsd(era.upa.usdM)} m, ₹${fmtCr(era.upa.cr)} crore at approval-year rates — US$${fmtUsd(era.upa.usdM / upaYears)} m a year; NDA (2014-05-26 to ${asOf}) ${era.nda.n} claims, US$${fmtUsd(era.nda.usdM)} m, ₹${fmtCr(era.nda.cr)} crore — US$${fmtUsd(era.nda.usdM / ndaYears)} m a year; before 2004-05-22, ${era.pre2004.n} claims, US$${fmtUsd(era.pre2004.usdM)} m, ₹${fmtCr(era.pre2004.cr)} crore. Read the ₹ series with care: the rupee moved from about ₹45 to ₹87 per US$ between the two eras, so nominal ₹ totals rise mechanically; compare the US$ column, and against India's GDP and external-debt stock (debt domain) before calling any gap a finding. State denominator: ${stateRows.length} states/UTs carry a state attribution (borrower state government, else the implementing agency's state, else a state named in the project title — not a lender field); US$${fmtUsd(stateUsd)} m (₹${fmtCr(stateCr)} crore) of US$${fmtUsd(totals.usdMExclPipeline)} m is attributable to a state at all, the rest is Union or national programmes. Top states by US$: ${top}. Whether BJP-run or opposition-run states borrowed more in a given year needs the ruling-party-by-year table (people domain) joined on approval date: this file does not carry it, so no party share is asserted here.`;

  const rate = (num, den, property, label, srcs) => ({ property, numerator: num, denominator: den, label, srcs });
  const baseRates = [];
  for (const [s, n] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) baseRates.push(rate(n, projects.length, `projects with status ${s}`, 'all India projects in the v3 index', [apiSrc]));
  const instrDen = Object.values(byInstrument).reduce((a, b) => a + b, 0);
  for (const [k, n] of Object.entries(byInstrument).sort((a, b) => b[1] - a[1])) baseRates.push(rate(n, instrDen, `non-dropped projects by lending instrument: ${k}`, 'non-dropped projects whose lending instrument the v2 index states', [apiSrc, ['World Bank Projects API v2 (India)', pages.find((x) => x.api === 'v2')?.url ?? V2_URL(0)]]));
  baseRates.push(rate(totals.noInstrument, projects.length - totals.dropped, 'non-dropped projects with no lending instrument in either index', 'non-dropped projects', [apiSrc]));
  for (const [c, v] of stateRows.slice(0, 15)) baseRates.push(rate(Math.round(v.usdM), Math.round(stateUsd), `US$ m of non-pipeline lending attributed to ${STATE_LABEL[c]} (${v.n} claims, ₹${fmtCr(v.cr)} crore)`, 'US$ m of non-pipeline lending attributable to any state (borrower state, implementing agency state, or state in the title)', [apiSrc]));
  baseRates.push(rate(Math.round(byLender['fin:ibrd'].usdM), Math.round(totals.usdMExclPipeline), 'US$ m of non-pipeline lending from IBRD (non-concessional)', 'US$ m of non-pipeline IBRD+IDA lending in this file', [apiSrc]));
  baseRates.push(rate(Math.round(byLender['fin:ida'].usdM), Math.round(totals.usdMExclPipeline), 'US$ m of non-pipeline lending from IDA (concessional)', 'US$ m of non-pipeline IBRD+IDA lending in this file', [apiSrc]));
  baseRates.push(rate(totals.borrowerUnstated, totals.claims, 'loan claims whose borrower the API leaves blank (Union recorded by default)', 'loan claims in this file', [apiSrc]));
  baseRates.push(rate(totals.agencyUnstated, projects.length - totals.dropped - totals.grantOnly - totals.otherOnly, 'lending projects with no implementing agency in the API', 'projects that carry a loan claim', [apiSrc]));

  const yearRows = Object.entries(byYear).sort((a, b) => Number(a[0]) - Number(b[0])).map(([y, v]) => ({ year: Number(y), claims: v.n, usdM: Math.round(v.usdM * 100) / 100, crore: Math.round(v.cr * 100) / 100 }));
  const stateTable = stateRows.map(([c, v]) => ({ st: c, state: STATE_LABEL[c], claims: v.n, usdM: Math.round(v.usdM * 100) / 100, crore: Math.round(v.cr * 100) / 100 }));

  const voids = [
    { what: 'Loan conditions (prior actions, disbursement-linked indicators, procurement and safeguard covenants) are not in the Projects API; every claim carries terms.conditions = []', whyItMatters: 'The political question about external finance is the conditionality, not the money; the Program Documents and Loan Agreements on each project page hold it', srcs: [apiSrc] },
    { what: 'Interest rate, tenor and grace period are not in the API (ratePct, tenorYears, graceYears are null on every claim)', whyItMatters: 'IBRD variable-spread loans and IDA credits differ by an order of magnitude in cost; the Loan/Financing Agreement states them', srcs: [apiSrc] },
    { what: `Borrower is blank for ${totals.borrowerUnstated} of ${totals.claims} loan claims; the Union (DEA) is recorded by default and each such claim says so in d`, whyItMatters: 'Sub-sovereign borrowers (SBI, IREDA, EESL, DFCCIL, state governments) exist in the record; a default can hide one', srcs: [apiSrc] },
    { what: `The lending instrument is missing for ${totals.noInstrument} non-dropped projects: the v3 index has no lendinginstr field and the v2 index covers 882 of 1,117 projects`, whyItMatters: 'Development Policy Lending (budget support with policy conditions) and Program-for-Results are the instruments that carry conditionality; an unknown instrument is an unknown condition set', srcs: [apiSrc] },
    { what: 'Contracts awarded under these loans are not in the Projects API; the Data Catalog "Major Contract Awards" endpoint rate-limited (429) on 2026-09-26', whyItMatters: 'Who wins the loan-funded contracts is the cui-bono question; the contracts domain must fetch the catalog or scrape the per-project procurement pages', srcs: [apiSrc] },
    { what: 'Ministers, secretaries and chief ministers at approval, and the Executive Director for India at the Bank, are not in the API; this file has no persons and no role claims', whyItMatters: 'Approval is a political act with named signatories; the people domain adds them by office-with-dates', srcs: [apiSrc] },
    { what: 'Outcome ratings (ICR, IEG) are not in the API', whyItMatters: 'The lender\'s own evaluation is the check on every claimed benefit', srcs: [apiSrc] },
  ];

  const gaps = [
    `Instrument unknown for ${totals.noInstrument} non-dropped projects (not in v3; absent from v2) — the project page's "Lending Instrument" field would fill it`,
    `${totals.borrowerUnstated} loan claims with no borrower in the API, recorded to the Ministry of Finance (DEA) by default and flagged in d — the Loan Agreement names the borrower`,
    `${totals.noRupee} claims carry a US$ amount but no ₹ amount because PA.NUS.FCRF begins in ${fxT.first} (approvals ${projects.filter((p) => isoDate(p.boardapprovaldate) && Number(isoDate(p.boardapprovaldate).slice(0, 4)) < fxT.first && p.status !== 'Dropped').length} projects before ${fxT.first}); RBI historical rates or the Bretton Woods par value (₹4.76/US$ to 1966) would convert them`,
    `${totals.grantOnly} grant-only (trust fund) operations and ${totals.otherOnly} "Other"-only operations (GEF, carbon finance, co-financing — neither IBRD nor IDA named) carry no claim; ${totals.dropped} Dropped projects carry no claim — all remain in the projects table`,
    'Approvals dated 2026 and later use the latest published PA.NUS.FCRF value (stated in d); refresh when the indicator publishes the year',
    'Implementing-agency strings are split on a comma not followed by a space (the API joins several agencies with ","); a name containing such a comma would split wrongly — the raw string is kept in each claim\'s d and in the projects table',
    'New fin: entities are typed from their names (ministry / psu / agency / trust) and carry no CIN, LEI or office; confirm before adding facts to them',
    'Ministers, chief ministers, DEA secretaries and the Executive Director at approval are not in this file (people domain); conditions are not in this file (conditions domain); contract awards are not in this file (contracts domain)',
  ];

  const doc = {
    asOf, domain: 'worldbank-projects',
    scope: `Every India project in the World Bank Projects API v3 index (${projects.length} projects, 1949–${Math.max(...projectRows.map((r) => Number((r.boardapprovaldate ?? '0').slice(0, 4))))}), fetched by scripts/finance/fetch-worldbank.mjs on ${asOf} and recorded at documented tier as it stands in the API: id, name, dates, status, borrower, implementing agency, IBRD/IDA/grant/total commitments, lending instrument (from the v2 index, 882 of ${projects.length}), sectors, theme, abstract. One loan claim per project per lender (IBRD and IDA legs separately) for every non-dropped operation with an IBRD or IDA commitment; amounts in ₹ crore at the World Bank's PA.NUS.FCRF official rate for the approval year, stated in each d. Pipeline projects are kept and flagged, carry no ₹ amount (\`a\` empty, the US$ figure in d) and are excluded from totals. Left out: Dropped projects (${totals.dropped}), grant-only trust-fund operations (${totals.grantOnly}) and "Other"-only operations with neither IBRD nor IDA named (${totals.otherOnly}) carry no claim; no persons, no conditions, no contract awards, no evaluations — the API has none of them, and the worldbank, conditions, contracts and people domain agents add them. The full projects table (all recorded fields, with the resolved ids) is in \`projects\`; fetch provenance (page hashes, run id) is in \`provenance\`.`,
    sources: [
      ...pages.map((p) => [`World Bank Projects API ${p.api === 'indicator' ? '— PA.NUS.FCRF indicator (official exchange rate, LCU per US$, annual)' : `${p.api} (India, os=${new URL(p.url).searchParams.get('os')})`}`, p.url]),
      ...lenderPages.filter((x) => x.ok).map((x) => [`World Bank — ${x.id === 'fin:ibrd' ? 'IBRD' : 'IDA'} about page`, x.url]),
    ],
    entities: ents,
    claims,
    voids,
    narratives: [],
    symmetryCheck,
    baseRates,
    gaps,
    provenance: {
      runId, fetchedAt: asOf, script: 'scripts/finance/fetch-worldbank.mjs',
      fx: { indicator: 'PA.NUS.FCRF', firstYear: fxT.first, lastYear: fxT.last, conversion: '₹ crore = US$ × rate(approval year) ÷ 1e7' },
      pages,
      fieldMap: { ibrd_usd: 'v3 curr_ibrd_commitment (v2 ibrdcommamt as fallback)', ida_usd: 'v3 curr_ida_commitment / idacommamt (v2 idacommamt as fallback)', total_usd: 'v3 totalamt / curr_total_commitment (v2 totalcommamt as fallback)', grant_usd: 'v3 grantamt', lendinginstr: 'v2 lendinginstr (not in v3)', url: 'v2 url, else the project-detail URL pattern', major_sector_name: 'v3 major_sector_name', sector1: 'v2 sector1.Name', theme1: 'v2 theme1 when it is text' },
      totals,
      byYear: yearRows,
      byState: stateTable,
      byLender: Object.fromEntries(Object.entries(byLender).map(([k, v]) => [k, { claims: v.n, usdM: Math.round(v.usdM * 100) / 100, crore: Math.round(v.cr * 100) / 100 }])),
      eras: Object.fromEntries(Object.entries(era).map(([k, v]) => [k, { claims: v.n, usdM: Math.round(v.usdM * 100) / 100, crore: Math.round(v.cr * 100) / 100 }])),
    },
    projects: projectRows,
  };
  return { doc, totals, runId };
}

// ---------------------------------------------------------------------------
// Fetch and run
// ---------------------------------------------------------------------------

async function getText(url, { retries = 3 } = {}) {
  let last;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json, text/html;q=0.5', 'user-agent': 'india-corporate-intelligence/fetch-worldbank (research; contact via repository)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw new Error(`${url}: ${last?.message ?? 'fetch failed'}`);
}

async function fetchAllPages(mk, fields) {
  const pages = [];
  for (let os = 0; ; os += 500) {
    const url = `${mk(os)}&fl=${fields}`;
    const text = await getText(url);
    const j = JSON.parse(text);
    const n = Object.keys(j.projects ?? {}).length;
    pages.push({ url, text });
    process.stderr.write(`  ${url.slice(0, 80)}… ${n} rows / total ${j.total}\n`);
    if (n === 0 || os + 500 >= Number(j.total)) break;
  }
  return pages;
}

export async function main(argv = process.argv.slice(2)) {
  const outIdx = argv.indexOf('--out');
  const out = resolve(ROOT, outIdx >= 0 ? argv[outIdx + 1] : 'research/raw/finance/worldbank-projects.json');
  const invIdx = argv.indexOf('--inventory');
  const inventory = JSON.parse(readFileSync(resolve(ROOT, invIdx >= 0 ? argv[invIdx + 1] : join(HERE, 'id-inventory.json')), 'utf8'));
  const asOf = new Date().toISOString().slice(0, 10);
  process.stderr.write('World Bank Projects API v3\n');
  const v3Pages = await fetchAllPages(V3_URL, V3_FIELDS);
  process.stderr.write('World Bank Projects API v2 (instrument, url, sectors)\n');
  const v2Pages = await fetchAllPages(V2_URL, V2_FIELDS);
  process.stderr.write('PA.NUS.FCRF\n');
  const fx = { url: FX_URL, text: await getText(FX_URL) };
  const lenderPages = [];
  for (const [id, url] of LENDER_PAGES) {
    let ok = false;
    try { const t = await getText(url, { retries: 1 }); ok = t.length > 0; } catch { ok = false; }
    lenderPages.push({ id, url, ok });
    process.stderr.write(`  ${url} ${ok ? 'opened' : 'NOT opened — left out of sources'}\n`);
  }
  const { doc, totals, runId } = build({ v3Pages, v2Pages, fx, inventory, asOf, lenderPages });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(doc, null, 1) + '\n');
  process.stderr.write(`wrote ${out}\n`);
  process.stdout.write(JSON.stringify({ out, runId, projects: totals.projects, claims: totals.claims, entities: doc.entities.length, croreExclPipeline: totals.croreExclPipeline, usdMExclPipeline: totals.usdMExclPipeline, pipeline: totals.pipeline, dropped: totals.dropped, grantOnly: totals.grantOnly, otherOnly: totals.otherOnly, noInstrument: totals.noInstrument, borrowerUnstated: totals.borrowerUnstated }, null, 2) + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { process.stderr.write(`${e.stack ?? e}\n`); process.exit(1); });
}
