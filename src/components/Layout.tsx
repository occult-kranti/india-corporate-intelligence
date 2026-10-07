import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, NavLink, useLocation, useNavigationType } from 'react-router-dom';
import {
  LayoutDashboard, Map, Network, Factory, Landmark, Newspaper, Search,
  Bookmark, Menu, X, Building2, GitBranch, Scale, Ruler, BookOpen,
  Waypoints, Users, Radar, ShieldCheck, Shield, Gavel, Telescope,
  Notebook, Mountain, Crosshair, HandCoins, Zap, Coins, GraduationCap,
  ArrowUpRight, ChevronRight, Droplets, Globe2, HeartPulse, HandHeart,
  TriangleAlert, TrainFront, FolderKanban, Files,
} from 'lucide-react';
import Workspace from './investigation/Workspace';
import { normalizeInvestigationState } from '../data/investigation';
import './investigation/shell.css';

const navGroups: { label: string; items: { path: string; label: string; icon: typeof Map }[] }[] = [
  {
    label: 'Markets',
    items: [
      { path: '/', label: 'Investigate India', icon: LayoutDashboard },
      { path: '/follow-the-money', label: 'Follow the money', icon: GitBranch },
      { path: '/map', label: 'NSE / BSE map', icon: Map },
      { path: '/geograph', label: 'Geographic network', icon: Radar },
      { path: '/industries', label: 'Industries', icon: Factory },
      { path: '/conglomerates', label: 'Conglomerates', icon: Building2 },
      { path: '/interlocks', label: 'Interlocks', icon: Users },
    ],
  },
  {
    label: 'Registers',
    items: [
      { path: '/education', label: 'Education funding', icon: GraduationCap },
      { path: '/water', label: 'Water & food security', icon: Droplets },
      { path: '/health', label: 'Health & hospitals', icon: HeartPulse },
      { path: '/public-works', label: 'Roads & public works', icon: Waypoints },
      { path: '/transport', label: 'Transport & railways', icon: TrainFront },
      { path: '/ngo', label: 'NGOs & foundations', icon: HandHeart },
      { path: '/disaster-relief', label: 'Disaster relief', icon: TriangleAlert },
      { path: '/public-funds', label: 'Public funds', icon: FolderKanban },
      { path: '/tenders', label: 'Govt awards', icon: Gavel },
      { path: '/resources', label: 'Natural resources', icon: Mountain },
      { path: '/pmcares', label: 'PM CARES', icon: HandCoins },
      { path: '/energy', label: 'Energy power map', icon: Zap },
      { path: '/welfare', label: 'Distribution funds', icon: Coins },
      { path: '/finance', label: 'Finance & lenders', icon: Coins },
      { path: '/debt', label: 'Debt & recovery', icon: Building2 },
      { path: '/justice', label: 'Justice & oversight', icon: Scale },
      { path: '/security', label: 'Security spend', icon: Shield },
      { path: '/international-finance', label: 'International finance', icon: Globe2 },
      { path: '/defence-trade', label: 'Arms contracts', icon: ShieldCheck },
      { path: '/media', label: 'Media ownership', icon: Newspaper },
      { path: '/allocation', label: 'Allocation graph', icon: Waypoints },
    ],
  },
  {
    label: 'Power',
    items: [
      { path: '/cabinet', label: 'Union cabinet', icon: Landmark },
      { path: '/policy', label: 'Laws & policy', icon: Gavel },
      { path: '/network', label: 'Connection graph', icon: Network },
      { path: '/atlas', label: 'Money-trail atlas', icon: GitBranch },
    ],
  },
  {
    label: 'Method',
    items: [
      { path: '/patterns', label: 'Pattern discipline', icon: Ruler },
      { path: '/motifs', label: 'Motif engine', icon: Waypoints },
      { path: '/prospector', label: 'Prospector', icon: Telescope },
      { path: '/desk', label: 'Investigative desk', icon: Notebook },
      { path: '/capture', label: 'Capture pathways', icon: Crosshair },
      { path: '/evidence', label: 'Evidence audit', icon: Scale },
      { path: '/base-rates', label: 'Base rates', icon: BookOpen },
      { path: '/competition', label: 'Bidder counts', icon: Gavel },
      { path: '/provenance', label: 'Provenance ledger', icon: ShieldCheck },
      { path: '/public-records', label: 'Public records', icon: Files },
      { path: '/method', label: 'How this is built', icon: BookOpen },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/search', label: 'Search', icon: Search },
      { path: '/political', label: 'Donations', icon: Landmark },
      { path: '/watchlist', label: 'Watchlist', icon: Bookmark },
    ],
  },
];

const sectorNavigation = [
  { path: '/public-works', label: 'Public works', icon: Waypoints },
  { path: '/education', label: 'Education', icon: GraduationCap },
  { path: '/health', label: 'Health', icon: HeartPulse },
  { path: '/water', label: 'Water & food', icon: Droplets },
  { path: '/transport', label: 'Transport', icon: TrainFront },
  { path: '/energy', label: 'Energy', icon: Zap },
  { path: '/welfare', label: 'Welfare', icon: Coins },
  { path: '/finance', label: 'Finance', icon: Building2 },
  { path: '/debt', label: 'Debt & recovery', icon: Landmark },
  { path: '/justice', label: 'Justice', icon: Scale },
  { path: '/pmcares', label: 'PM CARES', icon: HandCoins },
  { path: '/public-funds', label: 'Public funds', icon: FolderKanban },
  { path: '/ngo', label: 'NGOs', icon: HandHeart },
  { path: '/disaster-relief', label: 'Disaster relief', icon: TriangleAlert },
  { path: '/policy', label: 'Laws & policy', icon: Gavel },
  { path: '/security', label: 'Security', icon: Shield },
  { path: '/international-finance', label: 'International finance', icon: Globe2 },
  { path: '/defence-trade', label: 'Arms contracts', icon: ShieldCheck },
  { path: '/resources', label: 'Resources', icon: Mountain },
  { path: '/media', label: 'Media', icon: Newspaper },
  { path: '/public-records', label: 'Public records', icon: Files },
];

function contextualRoute(path: string, search: string, currentPath: string, dossier = false) {
  const carried = new URLSearchParams();
  const keep = new Set(['iw_state', 'iw_compare', 'iw_q', 'iw_layers', 'iw_tier', 'iw_from', 'iw_to', 'iw_undated', 'iw_national', 'iw_geo', 'iw_view']);
  for (const [key, value] of new URLSearchParams(search)) if (keep.has(key)) carried.set(key, value);
  if (!carried.has('iw_state') && currentPath.startsWith('/states/')) {
    const state = normalizeInvestigationState(currentPath.split('/')[2]);
    if (state) carried.set('iw_state', state);
  }
  if (dossier) carried.set('iw_view', 'dossier');
  return `${path}${carried.size ? `?${carried}` : ''}`;
}

function Navigation({ query, onNavigate, label }: { query: string; onNavigate?: () => void; label: string }) {
  const location = useLocation();
  const groups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => `${group.label} ${item.label}`.toLowerCase().includes(query.trim().toLowerCase())),
  })).filter((group) => group.items.length);

  return (
    <nav className="site-navigation" aria-label={label}>
      {groups.map((group) => (
        <div className="nav-group" key={group.label}>
          <p className="nav-group-label">{group.label}</p>
          {group.items.map(({ path, label: itemLabel, icon: Icon }) => (
            <NavLink key={path} to={contextualRoute(path, location.search, location.pathname)} end={path === '/'} onClick={onNavigate}
              className={({ isActive }) => `site-nav-link${isActive ? ' is-active' : ''}`}>
              <Icon size={16} strokeWidth={1.6} aria-hidden="true" />
              <span>{itemLabel}</span>
            </NavLink>
          ))}
        </div>
      ))}
      {groups.length === 0 && <p className="nav-empty" role="status">No pages match “{query}”. Try “education”, “map”, or “evidence”.</p>}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/" className="site-brand" aria-label="ICIP — investigate India">
      <span className="site-brand-mark" aria-hidden="true"><Globe2 size={26} strokeWidth={1.15} /></span>
      <span><strong>ICIP<span className="brand-period">.</span></strong><small>Public record atlas</small></span>
    </Link>
  );
}

export default function Layout() {
  const [query, setQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const sectorRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousPath = useRef(location.pathname);
  const currentGroup = navGroups.find((group) => group.items.some((item) => item.path === location.pathname));
  const currentItem = currentGroup?.items.find((item) => item.path === location.pathname);
  const routeTitle = location.pathname === '/allegations' ? 'Allegations atlas' : currentItem?.label ?? (location.pathname.startsWith('/company/') ? 'Company profile' : location.pathname.startsWith('/states/') ? 'State profile' : location.pathname.startsWith('/conglomerates/') ? 'Group deep dive' : 'Investigation workspace');

  useEffect(() => {
    document.title = `${routeTitle} · ICIP`;
    if (previousPath.current !== location.pathname && navigationType !== 'POP') {
      mainRef.current?.scrollTo({ top: 0 });
      mainRef.current?.focus({ preventScroll: true });
    }
    previousPath.current = location.pathname;
    setMobileMenuOpen(false);
    const activeSector = sectorRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (activeSector && sectorRef.current) sectorRef.current.scrollLeft = activeSector.offsetLeft - sectorRef.current.offsetLeft - 16;
  }, [location.pathname, navigationType, routeTitle]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (mobileMenuOpen && !dialog.open) dialog.showModal();
    if (!mobileMenuOpen && dialog.open) dialog.close();
  }, [mobileMenuOpen]);


  function closeNavigation() {
    setMobileMenuOpen(false);
    menuRef.current?.focus();
  }

  return (
    <div className="site-shell investigation-shell">
      <a href="#main-content" className="skip-link" onClick={(event) => {
        event.preventDefault();
        mainRef.current?.focus();
      }}>Skip to content</a>

      <aside className="iw-navigation-rail" aria-label="Investigation lenses">
        <Link to="/" className="iw-rail-brand" aria-label="ICIP — investigate India"><Globe2 size={27} strokeWidth={1.2} aria-hidden="true" /><span>ICIP<strong>.</strong></span><small>ATLAS</small></Link>
        <nav aria-label="Primary navigation">
          <div className="atlas-primary-routes">{[
            { path: '/', label: 'National atlas', icon: Globe2 },
            { path: '/follow-the-money', label: 'Money trails', icon: GitBranch },
            { path: '/allegations', label: 'Allegations', icon: ShieldCheck },
          ].map(({ path, label, icon: Icon }) => <NavLink key={path} to={contextualRoute(path, location.search, location.pathname)} end={path === '/'} className={({ isActive }) => `iw-rail-link${isActive ? ' is-active' : ''}`}><Icon size={19} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span></NavLink>)}</div>
          <p className="atlas-rail-label">Sector lenses</p>
          {sectorNavigation.map(({ path, label, icon: Icon }) => <NavLink key={path} to={contextualRoute(path, location.search, location.pathname)} className={({ isActive }) => `iw-rail-link${isActive ? ' is-active' : ''}`}><Icon size={18} strokeWidth={1.5} aria-hidden="true" /><span>{label}</span><ChevronRight className="atlas-rail-chevron" size={12} aria-hidden="true" /></NavLink>)}
        </nav>
        <div className="atlas-rail-footer"><Link to={contextualRoute('/method', location.search, location.pathname, true)} className="atlas-rail-method"><ShieldCheck size={16} aria-hidden="true" /><span>Evidence method</span></Link><button type="button" className="iw-rail-more" aria-label="Open all lenses and registers" aria-expanded={mobileMenuOpen} aria-controls="site-nav-mobile" onClick={event => { menuRef.current = event.currentTarget; setMobileMenuOpen(true); }}><Menu size={18} aria-hidden="true" /><span>All registers & tools</span></button></div>
      </aside>

      <div className="site-workspace">
        <header className="site-masthead">
          <div className="mobile-brand"><Brand /></div>
          <div className="masthead-context"><span>India</span><ChevronRight size={13} aria-hidden="true" /><span className="masthead-current">{routeTitle}</span></div>
          <div className="masthead-actions">
            <Link className="masthead-search" to={contextualRoute('/search', location.search, location.pathname)}><Search size={16} aria-hidden="true" /><span>Find records</span></Link>
            <Link className="masthead-method" to={contextualRoute('/watchlist', location.search, location.pathname, true)}><Bookmark size={15} aria-hidden="true" /> Saved research <ArrowUpRight size={12} aria-hidden="true" /></Link>
            <button type="button" ref={menuRef} className="mobile-menu-button iw-all-lenses-button" aria-label="Open navigation" aria-expanded={mobileMenuOpen} aria-controls="site-nav-mobile" onClick={event => { menuRef.current = event.currentTarget; setMobileMenuOpen(true); }}><Menu size={21} aria-hidden="true" /></button>
          </div>
        </header>
        <nav ref={sectorRef} className="atlas-mobile-sectors" aria-label="Sector shortcuts"><NavLink to={contextualRoute('/', location.search, location.pathname)} end><Globe2 size={15} aria-hidden="true" />All India</NavLink><NavLink to={contextualRoute('/follow-the-money', location.search, location.pathname)}><GitBranch size={15} aria-hidden="true" />Money trails</NavLink><NavLink to="/allegations"><ShieldCheck size={15} aria-hidden="true" />Allegations</NavLink>{sectorNavigation.map(({ path, label, icon: Icon }) => <NavLink key={path} to={contextualRoute(path, location.search, location.pathname)}><Icon size={15} aria-hidden="true" />{label}</NavLink>)}</nav>
        <main id="main-content" ref={mainRef} tabIndex={-1} className="site-main">
          <div className="site-content iw-shell-content">{['/follow-the-money', '/allegations'].includes(location.pathname) ? <Outlet /> : <Workspace routeTitle={routeTitle} routeKey={location.pathname}><Outlet /></Workspace>}</div>
        </main>
      </div>

      <dialog ref={dialogRef} id="site-nav-mobile" className="mobile-nav-dialog" aria-labelledby="mobile-nav-title" onCancel={(event) => { event.preventDefault(); closeNavigation(); }} onClose={() => setMobileMenuOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) closeNavigation(); }}>
        <div className="mobile-nav-heading"><div><h2 id="mobile-nav-title">Explore the atlas</h2><p>Sector lenses, source registers and research tools.</p></div><button type="button" className="mobile-menu-button" aria-label="Close navigation" onClick={closeNavigation} autoFocus><X size={21} aria-hidden="true" /></button></div>
        <div className="nav-search-wrap"><Search size={16} aria-hidden="true" /><input type="text" aria-label="Find a page in navigation" placeholder="Find a page…" value={query} onChange={(event) => setQuery(event.target.value)} className="nav-search" /></div>
        <Navigation query={query} label="Mobile navigation" onNavigate={() => { dialogRef.current?.close(); setMobileMenuOpen(false); }} />
      </dialog>
    </div>
  );
}
