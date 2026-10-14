import type { InvestigationStateCoverage } from '../../data/investigation';
import type { MapEvidenceScene, MapEvidenceSelection, MapEvidenceSite } from '../../data/mapEvidence';
import type { AtlasSite } from '../../data/atlasInvestigation';
import type { ReactNode } from 'react';

export type PublicMapSite = AtlasSite & { sourceLabel?: string; sourceUrl?: string };
export interface GeographicMapProps {
  coverage: InvestigationStateCoverage[];
  selectedState: string | null;
  onStateSelect: (code: string | null) => void;
  geographyMode: 'coverage' | 'associations' | 'all';
  sites?: PublicMapSite[];
  timeLabel?: string;
  highlightedStateCodes?: string[];
  onSiteSelect?: (site: PublicMapSite | MapEvidenceSite) => void;
  onEntitySelect?: (id: string) => void;
  onUnavailable: (reason: string) => void;
  evidenceScene?: MapEvidenceScene;
  evidenceSelection?: MapEvidenceSelection | null;
  onEvidenceSelect?: (selection: MapEvidenceSelection) => void;
  mapOverlay?: ReactNode;
}
