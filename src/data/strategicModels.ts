/** A hypothetical decision under risk. No input estimates any real actor. */
export interface StrategicInputs {
  benefit: number;
  detection: number;
  sanction: number;
  complianceCost: number;
}

export type BestResponse = 'lawful' | 'abuse' | 'indifferent';
export interface StrategicResult {
  lawfulUtility: number;
  abuseUtility: number;
  advantage: number;
  bestResponse: BestResponse;
  /** Null when a zero sanction makes the detection threshold undefined. */
  threshold: number | null;
  thresholdKind: 'reachable' | 'unreachable' | 'no-sanction';
}

export const DEFAULT_STRATEGIC_INPUTS: StrategicInputs = {
  benefit: 40, detection: 0.35, sanction: 100, complianceCost: 10,
};

export function evaluateStrategy(input: StrategicInputs): StrategicResult {
  for (const [name, value] of Object.entries(input)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} must be a finite nonnegative number.`);
    }
  }
  const { benefit: B, detection: p, sanction: S, complianceCost: C } = input;
  // Explicit keys also catch missing values passed by JavaScript consumers.
  if (![B, p, S, C].every(Number.isFinite) || p > 1) {
    throw new RangeError('All four inputs are required; detection must lie between 0 and 1.');
  }
  const lawfulUtility = -C;
  const abuseUtility = B - p * S;
  const advantage = abuseUtility - lawfulUtility;
  if (![lawfulUtility, abuseUtility, advantage].every(Number.isFinite)) {
    throw new RangeError('Inputs overflow the finite utility range.');
  }
  // Tolerance only absorbs floating-point rounding, not substantive differences.
  const tolerance = Number.EPSILON * 8 * Math.max(1, Math.abs(B), Math.abs(p * S), C);
  const bestResponse: BestResponse = Math.abs(advantage) <= tolerance
    ? 'indifferent' : advantage > 0 ? 'abuse' : 'lawful';
  const threshold = S > 0 ? (B + C) / S : null;
  if (threshold !== null && !Number.isFinite(threshold)) {
    throw new RangeError('Inputs overflow the finite threshold range.');
  }
  return {
    lawfulUtility, abuseUtility, advantage, bestResponse, threshold,
    thresholdKind: threshold === null ? 'no-sanction' : threshold <= 1 ? 'reachable' : 'unreachable',
  };
}

export function strategySensitivity(input: StrategicInputs) {
  evaluateStrategy(input);
  return Array.from({ length: 11 }, (_, step) => {
    const detection = step / 10;
    return { detection, ...evaluateStrategy({ ...input, detection }) };
  });
}

export interface StrategicRole {
  id: string;
  title: string;
  objective: string;
  lawful: string[];
  abuseHypothesis: string;
  predictedTrace: string;
  alternative: string;
  falsifier: string;
  ruleQuestions: string[];
}

export const STRATEGIC_ROLES: StrategicRole[] = [
  {
    id: 'official', title: 'Public official',
    objective: 'Deliver a public service, retain institutional trust and demonstrate value for money.',
    lawful: ['Publish eligibility and evaluation criteria before a decision.', 'Record conflicts and recusals, and preserve a reasoned decision trail.', 'Measure delivery against an agreed baseline; make audit exceptions visible.'],
    abuseHypothesis: 'A decision could prioritize a connected beneficiary over the published public objective.',
    predictedTrace: 'Comparable applicants treated differently, unexplained departures from recorded criteria, or conflicts unaddressed in the file.',
    alternative: 'A documented emergency, technical requirement or lawful policy change explains the different treatment.',
    falsifier: 'Contemporaneous reasons and independent evaluation show the same relevant criteria applied to comparable applicants.',
    ruleQuestions: ['Which procurement or allocation rules applied on the decision date?', 'What conflict declaration, recusal and record-retention duties applied?', 'Was an exception authorized by the competent body, and is its reason recorded?'],
  },
  {
    id: 'supplier', title: 'Supplier or contractor',
    objective: 'Win sustainable business through delivery, quality and a competitive offer.',
    lawful: ['Bid against published requirements and disclose required ownership information.', 'Keep delivery, pricing, subcontract and payment records reconcilable.', 'Seek a documented explanation or lawful review of an inconsistent award.'],
    abuseHypothesis: 'Competition could be weakened by preferential treatment or coordination between nominal competitors.',
    predictedTrace: 'Repeated unusual bid similarities or related-party participation that remains unexplained after checking tender templates and market structure.',
    alternative: 'Shared standard templates, a concentrated supplier market, common input costs or legitimate subcontracting explain similarity.',
    falsifier: 'Independent cost and capacity records explain the bids, and a matched comparison shows no preferential award pattern.',
    ruleQuestions: ['What ownership, eligibility and related-party disclosures were required?', 'Which competition and procurement provisions applied to this conduct?', 'Do contract amendments, acceptance records and payment approvals reconcile?'],
  },
  {
    id: 'oversight', title: 'Oversight body',
    objective: 'Detect material failures and apply consistent review while preserving due process.',
    lawful: ['Use published, consistent risk criteria and a comparison group.', 'Record scope limits, referral decisions and disposition of material exceptions.', 'Separate investigator, reviewer and appeal functions where required.'],
    abuseHypothesis: 'Review could be selective, leaving similar conduct with different scrutiny for reasons unrelated to risk.',
    predictedTrace: 'Matched cases receive different timelines, scope or outcomes without a recorded risk-based explanation.',
    alternative: 'Differences in jurisdiction, evidence quality, staffing, legal deadlines or case complexity explain the apparent asymmetry.',
    falsifier: 'A complete case denominator and documented triage criteria explain the observed distribution of attention.',
    ruleQuestions: ['What legal jurisdiction, procedural safeguards and review duties apply?', 'Are relevant timelines mandatory or discretionary?', 'Can selection criteria and reasoned outcomes be examined without exposing protected records?'],
  },
  {
    id: 'researcher', title: 'Public-interest researcher',
    objective: 'Produce reproducible findings that survive disconfirming evidence and independent review.',
    lawful: ['Register a precise question, comparison group and falsifier before testing.', 'Acquire public records lawfully and record source dates, limitations and transformations.', 'Seek a response, retain contradictory evidence and publish corrections with the finding.'],
    abuseHypothesis: 'A narrative could be made persuasive through selective cases, omitted denominators or unsupported accusations.',
    predictedTrace: 'Conclusions change when missing comparable cases, contradictory records or source versions are restored.',
    alternative: 'A bounded dataset or explicit scope limit, rather than deliberate selection, explains an incomplete analysis.',
    falsifier: 'An independent analyst reproduces the result from complete declared inputs and adversarial checks.',
    ruleQuestions: ['Does acquisition respect access restrictions and applicable privacy requirements?', 'Are quotes, allegations and findings attributed accurately?', 'Do published claims exceed the evidence or the scope of a court or audit finding?'],
  },
];
