import { useState } from 'react';
import { 
  Globe, Building2, Users, TrendingUp, Network, 
  FileText, AlertTriangle, Landmark, Radio, 
  ArrowUpRight, Activity
} from 'lucide-react';
import { WorldMap } from '../components/WorldMap';

interface Subsidiary {
  name: string;
  country: string;
  type: string;
  ownership: number;
}

interface KeyPerson {
  name: string;
  role: string;
  since: string;
}

interface PoliticalDonation {
  party: string;
  amount: number;
  year: number;
  method: string;
}

interface MediaArticle {
  outlet: string;
  title: string;
  date: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface TimelineEvent {
  date: string;
  event: string;
  category: 'acquisition' | 'legal' | 'financial' | 'political' | 'product';
}

// Reliance global presence data
const RELIANCE_LOCATIONS = [
  { name: 'Mumbai HQ', lat: 19.0760, lng: 72.8777, type: 'hq' as const, country: 'India' },
  { name: 'Jamnagar Refinery', lat: 22.4707, lng: 70.0577, type: 'factory' as const, country: 'India' },
  { name: 'Navi Mumbai', lat: 19.0330, lng: 73.0297, type: 'office' as const, country: 'India' },
  { name: 'Silicon Valley', lat: 37.4419, lng: -122.1430, type: 'office' as const, country: 'USA' },
  { name: 'London', lat: 51.5074, lng: -0.1278, type: 'office' as const, country: 'UK' },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, type: 'subsidiary' as const, country: 'Singapore' },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708, type: 'office' as const, country: 'UAE' },
  { name: 'Shanghai', lat: 31.2304, lng: 121.4737, type: 'office' as const, country: 'China' },
];

const RELIANCE_CONNECTIONS = [
  { from: 'Mumbai HQ', to: 'Jamnagar Refinery', type: 'ownership' as const, strength: 1.0 },
  { from: 'Mumbai HQ', to: 'Silicon Valley', type: 'investment' as const, strength: 0.7 },
  { from: 'Mumbai HQ', to: 'London', type: 'trade' as const, strength: 0.6 },
  { from: 'Mumbai HQ', to: 'Singapore', type: 'ownership' as const, strength: 0.8 },
  { from: 'Mumbai HQ', to: 'Dubai', type: 'trade' as const, strength: 0.5 },
  { from: 'Mumbai HQ', to: 'Shanghai', type: 'supply' as const, strength: 0.6 },
  { from: 'Jamnagar Refinery', to: 'London', type: 'trade' as const, strength: 0.8 },
  { from: 'Singapore', to: 'Shanghai', type: 'trade' as const, strength: 0.4 },
];

const SUBSIDIARIES: Subsidiary[] = [
  { name: 'Reliance Jio Infocomm', country: 'India', type: 'Telecom', ownership: 100 },
  { name: 'Reliance Retail Ventures', country: 'India', type: 'Retail', ownership: 100 },
  { name: 'Reliance Industries (SEZ)', country: 'India', type: 'Manufacturing', ownership: 100 },
  { name: 'Network18 Media', country: 'India', type: 'Media', ownership: 75 },
  { name: 'Reliance Strategic Business', country: 'India', type: 'Investment', ownership: 100 },
  { name: 'Jio Platforms', country: 'India', type: 'Technology', ownership: 100 },
  { name: 'Reliance New Energy Solar', country: 'India', type: 'Renewable Energy', ownership: 100 },
  { name: 'Reliance O2C', country: 'India', type: 'Petrochemicals', ownership: 100 },
  { name: 'Den Networks', country: 'India', type: 'Cable TV', ownership: 78 },
  { name: 'Hathway Cable', country: 'India', type: 'Cable TV', ownership: 71 },
];

const KEY_PEOPLE: KeyPerson[] = [
  { name: 'Mukesh Ambani', role: 'Chairman & MD', since: '2002' },
  { name: 'Nita Ambani', role: 'Director', since: '2014' },
  { name: 'PMS Prasad', role: 'Executive Director', since: '2010' },
  { name: 'Alok Agarwal', role: 'CFO', since: '2012' },
  { name: 'Srikanth Venkatachari', role: 'Joint CFO', since: '2020' },
];

const POLITICAL_DONATIONS: PoliticalDonation[] = [
  { party: 'BJP', amount: 610, year: 2023, method: 'Electoral Bond' },
  { party: 'BJP', amount: 965, year: 2022, method: 'Electoral Bond' },
  { party: 'BJP', amount: 720, year: 2021, method: 'Electoral Bond' },
  { party: 'INC', amount: 50, year: 2023, method: 'Electoral Bond' },
  { party: 'BJP', amount: 450, year: 2020, method: 'Direct' },
  { party: 'TMC', amount: 25, year: 2023, method: 'Electoral Bond' },
];

const MEDIA_COVERAGE: MediaArticle[] = [
  { outlet: 'Economic Times', title: 'Reliance Jio launches 5G services in 500 cities', date: '2024-01-15', sentiment: 'positive' },
  { outlet: 'Business Standard', title: 'RIL announces ₹75,000 crore green energy investment', date: '2024-02-20', sentiment: 'positive' },
  { outlet: 'The Wire', title: 'Questions raised over Reliance SEZ land acquisition', date: '2024-01-10', sentiment: 'negative' },
  { outlet: 'Mint', title: 'Reliance Retail expands to 18,000 stores nationwide', date: '2024-03-05', sentiment: 'positive' },
  { outlet: 'Scroll', title: 'Media ownership concentration: Network18 acquisition impact', date: '2023-12-18', sentiment: 'negative' },
  { outlet: 'Financial Express', title: 'RIL Q3 profit rises 12% to ₹19,299 crore', date: '2024-01-20', sentiment: 'positive' },
  { outlet: 'Reuters', title: 'Reliance in talks for Middle East petrochemical JV', date: '2024-02-28', sentiment: 'neutral' },
];

const TIMELINE: TimelineEvent[] = [
  { date: '2024-03', event: 'Jio launches 5G in 500 cities', category: 'product' },
  { date: '2024-02', event: '₹75,000 crore green energy investment announced', category: 'financial' },
  { date: '2023-12', event: 'Supreme Court upholds electoral bonds anonymity', category: 'political' },
  { date: '2023-08', event: 'Reliance Retail acquires 51% stake in Metro AG India', category: 'acquisition' },
  { date: '2023-05', event: 'CCI approves RIL-Saudi Aramco deal', category: 'legal' },
  { date: '2022-08', event: 'Google invests ₹33,737 crore in Jio Platforms', category: 'financial' },
  { date: '2020-09', event: 'RIL becomes net debt-free ahead of schedule', category: 'financial' },
  { date: '2019-08', event: 'Saudi Aramco agrees to buy 20% in RIL chemicals', category: 'acquisition' },
  { date: '2016-09', event: 'Jio launches free voice and data services', category: 'product' },
  { date: '2014-06', event: 'Narendra Modi becomes PM; Ambani ties strengthen', category: 'political' },
  { date: '2008-01', event: 'Reliance Petroleum merges with RIL', category: 'acquisition' },
  { date: '2002-07', event: 'Mukesh Ambani takes over after Dhirubhai\'s death', category: 'financial' },
];

const CATEGORY_ICONS = {
  acquisition: Building2,
  legal: Landmark,
  financial: TrendingUp,
  political: Users,
  product: Activity,
};

export default function RelianceDeepDive() {
  const [activeTab, setActiveTab] = useState<'overview' | 'global' | 'subsidiaries' | 'political' | 'media' | 'timeline'>('overview');

  const totalDonations = POLITICAL_DONATIONS.reduce((s, d) => s + d.amount, 0);
  const bjpPercentage = (POLITICAL_DONATIONS.filter(d => d.party === 'BJP').reduce((s, d) => s + d.amount, 0) / totalDonations * 100).toFixed(1);

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Activity },
    { id: 'global' as const, label: 'Global Map', icon: Globe },
    { id: 'subsidiaries' as const, label: 'Subsidiaries', icon: Network },
    { id: 'political' as const, label: 'Political', icon: Landmark },
    { id: 'media' as const, label: 'Media', icon: Radio },
    { id: 'timeline' as const, label: 'Timeline', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-8 h-8 text-[#c9a86c]" />
              <h1 className="text-3xl font-bold text-[#f0e6d8]">Reliance Industries Ltd</h1>
            </div>
            <p className="text-[#9c9588]">
              NSE: RELIANCE • BSE: 500325 • ISIN: INE002A01018
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <div className="text-3xl font-bold text-[#c9a86c]">₹2,450.50</div>
              <div className="flex items-center justify-end gap-1 text-[#7a9e7e]">
                <ArrowUpRight className="w-4 h-4" />
                <span>+12.30 (+0.50%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#f4f0e8]/10">
          <div>
            <div className="text-[#7a7569] text-sm">Market Cap</div>
            <div className="text-xl font-bold text-[#f0e6d8]">₹15.0L Cr</div>
          </div>
          <div>
            <div className="text-[#7a7569] text-sm">P/E Ratio</div>
            <div className="text-xl font-bold text-[#f0e6d8]">22.5x</div>
          </div>
          <div>
            <div className="text-[#7a7569] text-sm">Div Yield</div>
            <div className="text-xl font-bold text-[#f0e6d8]">0.42%</div>
          </div>
          <div>
            <div className="text-[#7a7569] text-sm">52W Range</div>
            <div className="text-xl font-bold text-[#f0e6d8]">₹2,100-2,600</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#c9a86c] text-[#0c0c0e]'
                : 'bg-[#161618] text-[#9c9588] hover:text-[#f0e6d8] border border-[#f4f0e8]/10'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Business Segments */}
          <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#f0e6d8] mb-4">Business Segments</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'O2C (Oil to Chemicals)', revenue: '₹5.2L Cr', margin: '12%', color: '#ef4444' },
                { name: 'Jio (Digital Services)', revenue: '₹1.4L Cr', margin: '48%', color: '#3b82f6' },
                { name: 'Retail', revenue: '₹2.8L Cr', margin: '7%', color: '#f59e0b' },
                { name: 'New Energy', revenue: '₹8,000 Cr', margin: '15%', color: '#10b981' },
                { name: 'Media (Network18)', revenue: '₹6,500 Cr', margin: '18%', color: '#ec4899' },
                { name: 'Others', revenue: '₹12,000 Cr', margin: '10%', color: '#8b5cf6' },
              ].map(seg => (
                <div key={seg.name} className="bg-[#0c0c0e] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                    <span className="text-[#f0e6d8] font-medium text-sm">{seg.name}</span>
                  </div>
                  <div className="text-[#c9a86c] text-lg font-bold">{seg.revenue}</div>
                  <div className="text-[#7a7569] text-xs">EBITDA Margin: {seg.margin}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Key People */}
          <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#f0e6d8] mb-4">Key People</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {KEY_PEOPLE.map(person => (
                <div key={person.name} className="flex items-center gap-3 p-3 bg-[#0c0c0e] rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-[#c9a86c]/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#c9a86c]" />
                  </div>
                  <div>
                    <div className="text-[#f0e6d8] font-medium text-sm">{person.name}</div>
                    <div className="text-[#7a7569] text-xs">{person.role}</div>
                    <div className="text-[#9c9588] text-xs">Since {person.since}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Flags */}
          <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#f0e6d8] mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#c45b5a]" />
              Risk Indicators
            </h2>
            <div className="space-y-3">
              {[
                { level: 'high', text: 'High political donation concentration (96.3% to BJP)' },
                { level: 'medium', text: 'Media ownership: Controls Network18, CNN-News18, CNBC-TV18' },
                { level: 'medium', text: 'SEZ land acquisition disputes in multiple states' },
                { level: 'low', text: 'Debt levels reduced significantly since 2020' },
              ].map((risk, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[#0c0c0e] rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    risk.level === 'high' ? 'bg-[#c45b5a]' : 
                    risk.level === 'medium' ? 'bg-[#f59e0b]' : 'bg-[#7a9e7e]'
                  }`} />
                  <span className="text-[#f0e6d8] text-sm">{risk.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'global' && (
        <div className="space-y-6">
          <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#f0e6d8] mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#c9a86c]" />
              Global Presence & Connections
            </h2>
            <WorldMap locations={RELIANCE_LOCATIONS} connections={RELIANCE_CONNECTIONS} />
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-[#7a7569]">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#c9a86c]" /> HQ
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#7a9e7e]" /> Subsidiary
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#3b82f6]" /> Office
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]" /> Factory
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#ec4899]" /> Port
              </div>
            </div>
          </div>

          {/* Export Destinations */}
          <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#f0e6d8] mb-4">Top Export Destinations</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { country: 'USA', percentage: 18, product: 'Petrochemicals' },
                { country: 'China', percentage: 15, product: 'Textiles, Chemicals' },
                { country: 'UAE', percentage: 12, product: 'Refined Petroleum' },
                { country: 'UK', percentage: 8, product: 'Petrochemicals' },
                { country: 'Singapore', percentage: 7, product: 'Trading Hub' },
                { country: 'Saudi Arabia', percentage: 6, product: 'Joint Ventures' },
                { country: 'Netherlands', percentage: 5, product: 'Chemicals' },
                { country: 'Brazil', percentage: 4, product: 'Textiles' },
              ].map(dest => (
                <div key={dest.country} className="bg-[#0c0c0e] rounded-lg p-4">
                  <div className="text-[#f0e6d8] font-medium">{dest.country}</div>
                  <div className="text-[#c9a86c] text-lg font-bold">{dest.percentage}%</div>
                  <div className="text-[#7a7569] text-xs">{dest.product}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subsidiaries' && (
        <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#f0e6d8] mb-4">Subsidiaries & Holdings</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f4f0e8]/10">
                  <th className="text-left py-3 px-4 text-[#9c9588] text-sm">Company</th>
                  <th className="text-left py-3 px-4 text-[#9c9588] text-sm">Type</th>
                  <th className="text-left py-3 px-4 text-[#9c9588] text-sm">Country</th>
                  <th className="text-right py-3 px-4 text-[#9c9588] text-sm">Ownership</th>
                </tr>
              </thead>
              <tbody>
                {SUBSIDIARIES.map(sub => (
                  <tr key={sub.name} className="border-b border-[#f4f0e8]/5 hover:bg-[#1c1c1f]">
                    <td className="py-3 px-4 text-[#f0e6d8] text-sm font-medium">{sub.name}</td>
                    <td className="py-3 px-4 text-[#9c9588] text-sm">{sub.type}</td>
                    <td className="py-3 px-4 text-[#9c9588] text-sm">{sub.country}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-[#0c0c0e] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#c9a86c] rounded-full"
                            style={{ width: `${sub.ownership}%` }}
                          />
                        </div>
                        <span className="text-[#c9a86c] text-sm font-medium">{sub.ownership}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'political' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
              <div className="text-[#7a7569] text-sm mb-1">Total Political Donations</div>
              <div className="text-3xl font-bold text-[#c9a86c]">₹{totalDonations} Cr</div>
              <div className="text-[#7a7569] text-xs mt-2">Last 4 years</div>
            </div>
            <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
              <div className="text-[#7a7569] text-sm mb-1">BJP Share</div>
              <div className="text-3xl font-bold text-[#c9a86c]">{bjpPercentage}%</div>
              <div className="text-[#7a7569] text-xs mt-2">Of total donations</div>
            </div>
            <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
              <div className="text-[#7a7569] text-sm mb-1">Primary Method</div>
              <div className="text-3xl font-bold text-[#c9a86c]">Electoral Bonds</div>
              <div className="text-[#7a7567] text-xs mt-2">Anonymous donations</div>
            </div>
          </div>

          <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#f0e6d8] mb-4">Donation History</h2>
            <div className="space-y-3">
              {POLITICAL_DONATIONS.map((donation, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#0c0c0e] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      donation.party === 'BJP' ? 'bg-[#ff6600]' :
                      donation.party === 'INC' ? 'bg-[#00aaff]' :
                      'bg-[#9c9588]'
                    }`} />
                    <div>
                      <div className="text-[#f0e6d8] text-sm font-medium">{donation.party}</div>
                      <div className="text-[#7a7569] text-xs">{donation.method} • {donation.year}</div>
                    </div>
                  </div>
                  <div className="text-[#c9a86c] font-bold">₹{donation.amount} Cr</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#f0e6d8] mb-4">Owned Media Outlets</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                'CNN-News18', 'CNBC-TV18', 'News18 India', 'Moneycontrol',
                'Firstpost', ' Forbes India', 'Overdrive', 'Better Interiors'
              ].map(outlet => (
                <div key={outlet} className="bg-[#0c0c0e] rounded-lg p-3 text-center">
                  <Radio className="w-5 h-5 text-[#c9a86c] mx-auto mb-1" />
                  <div className="text-[#f0e6d8] text-sm">{outlet}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#f0e6d8] mb-4">Recent Coverage Analysis</h2>
            <div className="space-y-3">
              {MEDIA_COVERAGE.map((article, i) => (
                <div key={i} className="flex items-start justify-between p-3 bg-[#0c0c0e] rounded-lg">
                  <div className="flex-1">
                    <div className="text-[#f0e6d8] text-sm font-medium">{article.title}</div>
                    <div className="text-[#7a7569] text-xs mt-1">{article.outlet} • {article.date}</div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    article.sentiment === 'positive' ? 'bg-[#7a9e7e]/20 text-[#7a9e7e]' :
                    article.sentiment === 'negative' ? 'bg-[#c45b5a]/20 text-[#c45b5a]' :
                    'bg-[#9c9588]/20 text-[#9c9588]'
                  }`}>
                    {article.sentiment}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#f0e6d8] mb-4">Company Timeline</h2>
          <div className="space-y-4 relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#f4f0e8]/10" />
            
            {TIMELINE.map((event, i) => {
              const Icon = CATEGORY_ICONS[event.category];
              return (
                <div key={i} className="flex items-start gap-4 relative pl-10">
                  <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-[#161618] border-2 border-[#c9a86c] flex items-center justify-center z-10">
                    <Icon className="w-2.5 h-2.5 text-[#c9a86c]" />
                  </div>
                  <div className="flex-1 p-3 bg-[#0c0c0e] rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[#c9a86c] text-xs font-medium">{event.date}</span>
                      <span className="text-[#7a7569] text-xs capitalize">{event.category}</span>
                    </div>
                    <div className="text-[#f0e6d8] text-sm">{event.event}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
