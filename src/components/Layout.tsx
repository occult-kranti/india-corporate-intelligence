import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Network,
  Factory,
  Landmark,
  Newspaper,
  Search,
  Bookmark,
  Menu,
  X,
  Globe,
  Building2,
  GitBranch,
  Scale,
  Ruler,
  BookOpen,
  Waypoints,
  Users,
  Radar,
  ShieldCheck,
  Gavel,
  Telescope,
  Notebook,
  Mountain,
  Crosshair,
  HandCoins,
} from 'lucide-react';
import { COMPANIES, COMPANIES_AS_OF } from '../data/companies';
import { MINISTERS } from '../data/politics';
import { EDGES } from '../graph/data';

const navGroups: { label: string; items: { path: string; label: string; icon: typeof Map }[] }[] = [
  {
    label: 'Markets',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/map', label: 'NSE / BSE map', icon: Map },
      { path: '/geograph', label: 'Geographic network', icon: Radar },
      { path: '/industries', label: 'Industries', icon: Factory },
      { path: '/conglomerates', label: 'Conglomerates', icon: Building2 },
      { path: '/interlocks', label: 'Interlocks', icon: Users },
    ],
  },
  {
    // The allocation registers sit together because they are the same KIND of thing —
    // records of how public value was handed over — and the comparison across them is
    // the point. Media is here as the coverage register: who owns the outlets that
    // report on the other three.
    label: 'Registers',
    items: [
      { path: '/tenders', label: 'Govt awards', icon: Gavel },
      { path: '/resources', label: 'Natural resources', icon: Mountain },
      { path: '/pmcares', label: 'PM CARES', icon: HandCoins },
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

const navItems = navGroups.flatMap((g) => g.items);

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-bg text-text overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-bg-elevated border-r border-border flex-shrink-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg leading-tight">ICIP</h1>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Intelligence Platform</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-text-muted px-3 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all ${
                        active
                          ? 'bg-accent/10 text-accent border border-accent/20'
                          : 'text-text-secondary hover:text-text hover:bg-bg-card border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="font-mono text-[10px] text-text-muted leading-relaxed">
            <p>{COMPANIES.length} listed companies</p>
            <p>{MINISTERS.length} union ministers</p>
            <p>{EDGES.length} sourced relationships</p>
            <p className="mt-1.5 text-text-muted/70">as of {COMPANIES_AS_OF || '—'}</p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-bg-elevated/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent" />
            <span className="font-serif font-bold">ICIP</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-bg-card"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="bg-bg-elevated border-b border-border p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    active 
                      ? 'bg-accent/10 text-accent' 
                      : 'text-text-secondary hover:text-text hover:bg-bg-card'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
