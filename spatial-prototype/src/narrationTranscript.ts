import { presentationCorrection, presentationTitle, presentationSummary } from "./sourceCorrections";
import type { EvidenceItem } from "./model";
/** The same qualifications heard aloud must remain visible in the source reader. */
export function buildNarrationTranscript(
  item: EvidenceItem,
  held = false,
): string {
  const title = presentationTitle(item);
  const correction = presentationCorrection(item.id);
  const parts = [
    held
      ? "Held for review. Reading and counter-context only; excluded from the factual map."
      : "",
    title,
    presentationSummary(item),
    correction ? `Source-scope correction: ${correction.reason} ${correction.interpretationNotice}` : "",
  ];
  if ("tier" in item && !correction)
    parts.push(
      `Evidence tier: ${item.tier}. Recorded status: ${item.status}. Status as of: ${item.statusAsOf ?? "not established"}. Date basis: ${item.dateBasis}.`,
    );
  parts.push(
    `${new Set(item.sourceIds).size} distinct retained source records.`,
  );
  if ("amounts" in item)
    for (const amount of item.amounts)
      parts.push(
        `Amount: ${amount.currency} ${amount.value} ${amount.unit}. Accounting stage: ${amount.stage}. Period: ${amount.period}.`,
      );
  if ("response" in item && item.response)
    parts.push(`Recorded response: ${item.response}`);
  if ("alternativeExplanations" in item && item.alternativeExplanations.length)
    parts.push(
      `Alternative explanations: ${item.alternativeExplanations.join(" ")}`,
    );
  if ("falsifier" in item && item.falsifier)
    parts.push(`What would change this assessment: ${item.falsifier}`);
  parts.push(
    `Limitations: ${item.limitations.join(" ")}`,
    "A graph path does not establish influence, causation or misconduct.",
  );
  return parts.filter(Boolean).join(" ");
}
