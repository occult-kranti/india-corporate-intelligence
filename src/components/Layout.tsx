import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, NavLink, useLocation, useNavigationType } from 'react-router-dom';
import {
  LayoutDashboard, Map, Network, Factory, Landmark, Newspaper, Search,
  Bookmark, Menu, X, Building2, GitBranch, Scale, Ruler, BookOpen,
  Waypoints, Users, Radar, ShieldCheck, Shield, Gavel, Telescope,
  Notebook, Mountain, Crosshair, HandCoins, Zap, Coins, GraduationCap,
  ArrowUpRight, ChevronRight,
} from 'lucide-react';
import { COMPANIES, COMPANIES_AS_OF } from '../data/companies';

const navGroups: { label: string; items: { path: string; label: string; icon: typeof Map }[] }[] = [
  {
    label: 'Markets',
    items: [
      { path: '/', label: 'Overview', icon: LayoutDashboard },
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
      { path: '/tenders', label: 'Govt awards', icon: Gavel },
      { path: '/resources', label: 'Natural resources', icon: Mountain },
      { path: '/pmcares', label: 'PM CARES', icon: HandCoins },
      { path: '/energy', label: 'Energy power map', icon: Zap },
      { path: '/welfare', label: 'Distribution funds', icon: Coins },
      { path: '/finance', label: 'Foreign money', icon: Coins },
      { path: '/security', label: 'Security spend', icon: Shield },
      { path: '/media', label: 'Media ownership', icon: Newspaper },
      { path: '/allocation', label: 'Allocation graph', icon: Waypoints },
    ],
  },
  {
    label: 'Power',
    items: [
      { path: '/cabinet', label: 'Union cabinet', icon: Landmark },
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

function Navigation({ query, onNavigate, label }: { query: string; onNavigate?: () => void; label: string }) {
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
            <NavLink key={path} to={path} end={path === '/'} onClick={onNavigate}
              className={({ isActive }) => `site-nav-link${isActive ? ' is-active' : ''}`}>
              <Icon size={16} strokeWidth={1.6} aria-hidden="true" />
              <span>{itemLabel}</span>
              {path === '/education' && <span className="nav-new">New</span>}
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
    <Link to="/" className="site-brand" aria-label="ICIP — platform overview">
      <span className="site-brand-mark" aria-hidden="true"><Landmark size={23} strokeWidth={1.4} /></span>
      <span><strong>ICIP<span className="brand-period">.</span></strong><small>India intelligence</small></span>
    </Link>
  );
}

export default function Layout() {
  const [query, setQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousPath = useRef(location.pathname);
  const currentGroup = navGroups.find((group) => group.items.some((item) => item.path === location.pathname));
  const currentItem = currentGroup?.items.find((item) => item.path === location.pathname);
  const routeTitle = currentItem?.label ?? (location.pathname.startsWith('/company/') ? 'Company profile' : location.pathname.startsWith('/states/') ? 'State profile' : location.pathname.startsWith('/conglomerates/') ? 'Group deep dive' : 'Intelligence platform');

  useEffect(() => {
    document.title = `${routeTitle} · ICIP`;
    if (previousPath.current !== location.pathname && navigationType !== 'POP') {
      mainRef.current?.scrollTo({ top: 0 });
      mainRef.current?.focus({ preventScroll: true });
    }
    previousPath.current = location.pathname;
    setMobileMenuOpen(false);
  }, [location.pathname, navigationType, routeTitle]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (mobileMenuOpen && !dialog.open) dialog.showModal();
    if (!mobileMenuOpen && dialog.open) dialog.close();
  }, [mobileMenuOpen]);

  useEffect(() => {
    const breakpoint = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (breakpoint.matches) setMobileMenuOpen(false); };
    breakpoint.addEventListener('change', closeOnDesktop);
    return () => breakpoint.removeEventListener('change', closeOnDesktop);
  }, []);

  function closeNavigation() {
    setMobileMenuOpen(false);
    menuRef.current?.focus();
  }

  return (
    <div className="site-shell">
      <a href="#main-content" className="skip-link" onClick={(event) => {
        event.preventDefault();
        mainRef.current?.focus();
      }}>Skip to content</a>

      <aside className="site-sidebar">
        <div className="sidebar-brand"><Brand /><p className="brand-caption">Public records. Clearer connections.</p></div>
        <div className="nav-search-wrap">
          <Search size={15} aria-hidden="true" />
          <input type="text" aria-label="Find a page" placeholder="Find a page…" value={query} onChange={(event) => setQuery(event.target.value)} className="nav-search" />
        </div>
        <Navigation query={query} label="Primary navigation" />
        <div className="sidebar-footer">
          <Link to="/provenance"><ShieldCheck size={16} aria-hidden="true" /><span>Follow the evidence</span><ArrowUpRight size={13} aria-hidden="true" /></Link>
          <p>{COMPANIES.length} listed companies · {COMPANIES_AS_OF || 'Date not recorded'}</p>
        </div>
      </aside>

      <div className="site-workspace">
        <header className="site-masthead">
          <div className="mobile-brand"><Brand /></div>
          <div className="masthead-context"><span>India intelligence</span><ChevronRight size={13} aria-hidden="true" /><span>{currentGroup?.label ?? 'Records'}</span><span className="masthead-current">{routeTitle}</span></div>
          <div className="masthead-actions">
            <Link className="masthead-search" to="/search"><Search size={16} aria-hidden="true" /><span>Search records</span></Link>
            <Link className="masthead-method" to="/method">About the evidence <ArrowUpRight size={13} aria-hidden="true" /></Link>
            <button type="button" ref={menuRef} className="mobile-menu-button" aria-label="Open navigation" aria-expanded={mobileMenuOpen} aria-controls="site-nav-mobile" onClick={() => setMobileMenuOpen(true)}><Menu size={21} aria-hidden="true" /></button>
          </div>
        </header>
        <main id="main-content" ref={mainRef} tabIndex={-1} className="site-main">
          <div className="site-content"><Outlet /></div>
          <footer className="site-page-footer"><span>ICIP / Public-record intelligence</span><p>A connection is a question. Its source is the starting point.</p><Link to="/method">Read the method <ArrowUpRight size={13} aria-hidden="true" /></Link></footer>
        </main>
      </div>

      <dialog ref={dialogRef} id="site-nav-mobile" className="mobile-nav-dialog" aria-labelledby="mobile-nav-title" onCancel={(event) => { event.preventDefault(); closeNavigation(); }} onClose={() => setMobileMenuOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) closeNavigation(); }}>
        <div className="mobile-nav-heading"><div><p className="eyebrow">ICIP / Explore</p><h2 id="mobile-nav-title">The intelligence library</h2></div><button type="button" className="mobile-menu-button" aria-label="Close navigation" onClick={closeNavigation} autoFocus><X size={21} aria-hidden="true" /></button></div>
        <div className="nav-search-wrap"><Search size={16} aria-hidden="true" /><input type="text" aria-label="Find a page in navigation" placeholder="Find a page…" value={query} onChange={(event) => setQuery(event.target.value)} className="nav-search" /></div>
        <Navigation query={query} label="Mobile navigation" onNavigate={() => { dialogRef.current?.close(); setMobileMenuOpen(false); }} />
      </dialog>
    </div>
  );
}
