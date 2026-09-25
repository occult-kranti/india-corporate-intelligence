import raw from '../../research/raw/pmcares.json';

/**
 * PM CARES — a fund, and the control that governs everything said about it.
 *
 * The organising fact of this dataset is not a number. It is that the investigation
 * ran a control — PMNRF, the 1948 fund administered from the same office — and the
 * control killed the two claims most often made about PM CARES.
 *
 * That is why the page leads with the comparison rather than with the money: an
 * unusual-looking property that a comparable institution also has is not a finding
 * about the institution, it is a finding about the category. The desk skill calls
 * this the control test, and it is the check with the highest kill rate in the whole
 * procedure after the date test.
 */

export interface PmSource {
  id: string;
  publisher?: string;
  title?: string;
  url?: string;
  retrieved?: string;
  readAs?: string;
}

export interface FinancialYear {
  fy: string;
  published: boolean;
  publishedUrl?: string;
  statementType?: string;
  periodNote?: string;
  auditor?: string;
  auditSignedOn?: string;
  auditLagDays?: number;
  receipts?: {
    voluntaryContributionsRs?: number;
    foreignContributionsRs?: number;
    totalRs?: number;
    /** Present only for FY2019-20, whose statement has no opening balance to confuse. */
    totalCr?: number;
    /** Money actually received in the year. THIS is the receipts figure. */
    receiptsOnlyCr?: number;
    /**
     * The "Total" line as printed, which includes the opening balance carried forward.
     * Reading this as the year's receipts is the origin of the widely repeated claim
     * that PM CARES received ₹10,990 cr in FY2020-21; it received ₹7,913.55 cr and
     * the rest was already in the bank. Carried so the misreading can be shown, never
     * used as a receipts figure.
     */
    printedTotalIncludingOpeningBalanceCr?: number;
  };
  payments?: { heads?: { head: string; amountRs: number }[]; totalRs?: number; totalCr?: number };
  closingBalanceCr?: number;
  notesReferencedButNotPublished?: string;
  auditorsReportPublished?: boolean;
  balanceSheetPublished?: boolean;
  castsExactly?: boolean;
  /** Why an unpublished year is unpublished, and how that was established. */
  note?: string;
  daysOverdue?: number;
}

export interface ControlProperty {
  property: string;
  pmcares: boolean;
  pmnrf: boolean;
  note?: string;
  srcs?: string[];
}

export interface Departure {
  id: string;
  departure: string;
  pmnrf?: string;
  pmcares?: string;
  significance: string;
  tier: string;
  innocentReading?: string;
  srcs?: string[];
}

export interface ContestedItem {
  id: string;
  question: string;
  status: string;
  positionA: { holder: string; statement: string; srcs?: string[] };
  positionB: { holder: string; statement: string; srcs?: string[] };
  note?: string;
  innocentReading?: string;
  killIf?: string;
  upgradeIf?: string;
}

export interface Disbursement {
  id: string;
  announced?: { date?: string; amountCr?: number; amountQualifier?: string; quantity?: string };
  audited?: Record<string, number | undefined>;
  difference?: string;
  unresolved?: string;
}

const doc = raw as unknown as {
  asOf: string;
  scope: string;
  /** The single most important sentence in the file. Rendered verbatim. */
  headline: string;
  entity: Record<string, unknown>;
  trustees: Record<string, unknown>;
  deedKeyClauses: { clause: string; text: string; note?: string }[];
  timeline: { date: string; event: string; tier?: string; note?: string; srcs?: string[] }[];
  financials: FinancialYear[];
  aggregates: Record<string, number | string | undefined>;
  disbursements: Disbursement[];
  contested: ContestedItem[];
  control: {
    comparator: string;
    whyThisComparator: string;
    resultsIdentical: ControlProperty[];
    departuresThatSurvive: Departure[];
    verdict: string;
  };
  csrEligibility: Record<string, unknown>;
  denominators: Record<string, unknown>;
  novelty: Record<string, unknown>;
  gaps: (string | { gap: string; why?: string; closes?: string })[];
  rejected: { id: string; claim: string; killedBy: string; reason: string }[];
  upgradeKill: { id?: string; item?: string; upgradeIf?: string; killIf?: string }[];
  sources: PmSource[];
  unreachable: (string | { what: string; why: string })[];
};

export const PMCARES = doc;
export const PM_AS_OF = doc.asOf;
export const PM_FINANCIALS = doc.financials;
export const PM_CONTROL = doc.control;
export const PM_CONTESTED = doc.contested;

/**
 * Publication coverage — the headline for a fund, because the holes in the series
 * carry more information than the totals do.
 */
export function coverage(): {
  published: number;
  elapsed: number;
  unpublished: FinancialYear[];
  latestPublished: string | null;
} {
  const pub = PM_FINANCIALS.filter((f) => f.published);
  return {
    published: pub.length,
    elapsed: PM_FINANCIALS.length,
    unpublished: PM_FINANCIALS.filter((f) => !f.published),
    latestPublished: pub.length ? pub[pub.length - 1].fy : null,
  };
}

/**
 * How much of the fund's own accounting is visible.
 *
 * Four statements exist and every one is a single-page Receipts and Payments Account.
 * The notes they themselves reference, the auditor's report and the balance sheet are
 * not published for any year — so "the accounts are published" and "the accounts can
 * be read" are different statements, and this function is the difference.
 */
export function statementCompleteness(): {
  years: number;
  withNotes: number;
  withAuditorsReport: number;
  withBalanceSheet: number;
} {
  const pub = PM_FINANCIALS.filter((f) => f.published);
  return {
    years: pub.length,
    withNotes: 0, // every published year references notes 1–6 and publishes none
    withAuditorsReport: pub.filter((f) => f.auditorsReportPublished === true).length,
    withBalanceSheet: pub.filter((f) => f.balanceSheetPublished === true).length,
  };
}

/**
 * Money received IN the year, never the printed Total line.
 *
 * The statements from FY2020-21 onward print a "Total" that includes the opening
 * balance carried forward. Reading that as the year's receipts is exactly how the
 * ₹10,990 cr figure for FY2020-21 entered circulation — the fund received
 * ₹7,913.55 cr and the remainder was already in the bank. This accessor exists so
 * that misreading cannot be made anywhere in the app.
 */
export function receiptsCr(f: FinancialYear): number | null {
  return f.receipts?.receiptsOnlyCr ?? f.receipts?.totalCr ?? null;
}

/** The printed Total, for showing the misreading beside the correct figure. */
export function printedTotalCr(f: FinancialYear): number | null {
  return f.receipts?.printedTotalIncludingOpeningBalanceCr ?? null;
}

/** Audit lag by year — the series that shows a trend rather than a level. */
export function auditLag(): { fy: string; days: number }[] {
  return PM_FINANCIALS.filter(
    (f): f is FinancialYear & { auditLagDays: number } => f.published && f.auditLagDays != null,
  ).map((f) => ({ fy: f.fy, days: f.auditLagDays }));
}

/** Properties on which PM CARES and the control are indistinguishable. */
export function identicalCount(): number {
  return PM_CONTROL.resultsIdentical.filter((r) => r.pmcares === r.pmnrf).length;
}

export function sourceById(): Map<string, PmSource> {
  return new Map(doc.sources.map((s) => [s.id, s]));
}

/** Normalise the gaps array, which mixes bare strings and objects. */
export function gapList(): { what: string; why: string; closes?: string }[] {
  return doc.gaps.map((g) =>
    typeof g === 'string'
      ? { what: g.length > 190 ? `${g.slice(0, 190)}…` : g, why: g.length > 190 ? g.slice(190) : 'Recorded during retrieval.' }
      : { what: g.gap, why: g.why ?? 'Recorded during retrieval.', closes: g.closes },
  );
}
