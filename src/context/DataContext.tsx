import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { COMPANIES, COMPANIES_AS_OF, rollupByState, sectorTotals, type Company } from '../data/companies';
import { MINISTERS, type Minister } from '../data/politics';
import { GROUPS, type Group } from '../data/conglomerates';
import { NODES, EDGES } from '../graph/data';
import { buildNationalGraph } from '../graph/build';
import { mergeFleet } from '../graph/mergeFleet';
import { ENERGY_NODES, ENERGY_EDGES } from '../graph/energy.generated';
import { WELFARE_ENTITIES, WELFARE_SCHEME_NODES, WELFARE_CLAIMS } from '../data/welfare.generated';
import { FINANCE_NODES, FINANCE_EDGES } from '../graph/finance.generated';
import { NGO_NODES, NGO_EDGES } from '../graph/ngo.generated';
import { CAPITAL_NODES, CAPITAL_EDGES } from '../graph/capital.generated';
import type { GNode, GEdge, StateCode } from '../graph/schema';

/**
 * Application data context.
 *
 * Serves the real datasets — no sample data. Every figure carries its as-of date,
 * and the merged graph is built once and memoised, because the derived national
 * layer is several hundred nodes and rebuilding it per route is wasteful.
 */

export interface Filters {
  sectors: string[];
  states: StateCode[];
  exchanges: ('NSE' | 'BSE')[];
  ownership: string[];
  groups: string[];
  minMarketCap: number;
  query: string;
}

const DEFAULT_FILTERS: Filters = {
  sectors: [],
  states: [],
  exchanges: [],
  ownership: [],
  groups: [],
  minMarketCap: 0,
  query: '',
};

interface DataContextType {
  companies: Company[];
  filteredCompanies: Company[];
  ministers: Minister[];
  groups: Group[];
  nodes: GNode[];
  edges: GEdge[];
  /**
   * Research-fleet edges held out of `edges` because an endpoint is not a node in
   * the merged graph — a denial answering a claim id, or an inventory id the
   * national build does not produce. Exposed so a page can report them, never drawn
   * as dangling links.
   */
  heldEdges: GEdge[];
  asOf: string;
  filters: Filters;
  setFilters: (f: Filters) => void;
  resetFilters: () => void;
  sectors: ReturnType<typeof sectorTotals>;
  stateRollup: ReturnType<typeof rollupByState>;
  watchlist: string[];
  toggleWatch: (id: string) => void;
  isWatched: (id: string) => boolean;
}

const DataContext = createContext<DataContextType | null>(null);
const WATCH_KEY = 'icip.watchlist.v1';

export function DataProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // Persist the watchlist locally. Nothing is sent anywhere.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(WATCH_KEY);
      if (raw) setWatchlist(JSON.parse(raw));
    } catch {
      /* storage unavailable — the watchlist is simply session-scoped */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(WATCH_KEY, JSON.stringify(watchlist));
    } catch {
      /* ignore */
    }
  }, [watchlist]);

  const graph = useMemo(() => {
    const national = buildNationalGraph();
    return mergeFleet({ nodes: [...NODES, ...national.nodes], edges: [...EDGES, ...national.edges] }, [
      { nodes: ENERGY_NODES, edges: ENERGY_EDGES },
      { nodes: [...WELFARE_ENTITIES, ...WELFARE_SCHEME_NODES], edges: WELFARE_CLAIMS },
      // Phase G fleets. Each module is empty (META.empty) until its research lands.
      { nodes: FINANCE_NODES, edges: FINANCE_EDGES },
      { nodes: NGO_NODES, edges: NGO_EDGES },
      { nodes: CAPITAL_NODES, edges: CAPITAL_EDGES },
    ]);
  }, []);

  const filteredCompanies = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return COMPANIES.filter((c) => {
      if (filters.sectors.length && !filters.sectors.includes(c.sector)) return false;
      if (filters.states.length && !filters.states.includes(c.stateCode)) return false;
      if (filters.ownership.length && !filters.ownership.includes(c.ownership)) return false;
      if (filters.groups.length && (!c.group || !filters.groups.includes(c.group))) return false;
      if (filters.exchanges.length) {
        const has = filters.exchanges.some((x) => (x === 'NSE' ? !!c.nse : !!c.bse));
        if (!has) return false;
      }
      if (filters.minMarketCap && (c.marketCapCr ?? 0) < filters.minMarketCap) return false;
      if (q) {
        const hay = `${c.name} ${c.shortName} ${c.nse ?? ''} ${c.bse ?? ''} ${c.isin ?? ''} ${c.sector} ${c.industry} ${c.hqCity} ${c.state} ${c.group ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filters]);

  const sectors = useMemo(() => sectorTotals(), []);
  const stateRollup = useMemo(() => rollupByState(), []);

  const toggleWatch = useCallback((id: string) => {
    setWatchlist((prev) => (prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]));
  }, []);

  const isWatched = useCallback((id: string) => watchlist.includes(id), [watchlist]);
  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return (
    <DataContext.Provider
      value={{
        companies: COMPANIES,
        filteredCompanies,
        ministers: MINISTERS,
        groups: GROUPS,
        nodes: graph.nodes,
        edges: graph.edges,
        heldEdges: graph.heldEdges,
        asOf: COMPANIES_AS_OF,
        filters,
        setFilters,
        resetFilters,
        sectors,
        stateRollup,
        watchlist,
        toggleWatch,
        isWatched,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
