import { useState } from 'react';
import { 
  Globe, Building2, Users, TrendingUp, Network, 
  FileText, AlertTriangle, Landmark, Radio, 
  ArrowDownRight, Activity, Anchor
} from 'lucide-react';
import { WorldMap } from '../components/WorldMap';

// Adani global presence - ports, power, airports
const ADANI_LOCATIONS = [
  { name: 'Mundra Port', lat: 22.7500, lng: 69.7000, type: 'port' as const, country: 'India' },
  { name: 'Hazira Port', lat: 21.1000, lng: 72.6500, type: 'port' as const, country: 'India' },
  { name: 'Dhamra Port', lat: 20.9500, lng: 86.9500, type: 'port' as const, country: 'India' },
  { name: 'Kattupalli Port', lat: 13.3000, lng: 80.3500, type: 'port' as const, country: 'India' },
  { name: 'Mumbai Office', lat: 19.0760, lng: 72.8777, type: 'office' as const, country: 'India' },
  { name: 'Delhi Office', lat: 28.6139, lng: 77.2090, type: 'office' as const, country: 'India' },
  { name: 'Brisbane', lat: -27.4698, lng: 153.0251, type: 'subsidiary' as const, country: 'Australia' },
  { name: 'Carmichael Mine', lat: -21.9000, lng: 146.3000, type: 'factory' as const, country: 'Australia' },
  { name: 'Colombo Port', lat: 6.9271, lng: 79.8612, type: 'port' as const, country: 'Sri Lanka' },
  { name: 'Haifa Port', lat: 32.7940, lng: 34.9896, type: 'port' as const, country: 'Israel' },
  { name: 'Mombasa', lat: -4.0435, lng: 39.6682, type: 'port' as const, country: 'Kenya' },
];

const ADANI_CONNECTIONS = [
  { from: 'Ahmedabad HQ', to: 'Mundra Port', type: 'ownership' as const, strength: 1.0 },
  { from: 'Ahmedabad HQ', to: 'Hazira Port', type: 'ownership' as const, strength: 1.0 },
  { from: 'Ahmedabad HQ', to: 'Dhamra Port', type: 'ownership' as const, strength: 1.0 },
  { from: 'Ahmedabad HQ', to: 'Kattupalli Port', type: 'ownership' as const, strength: 1.0 },
  { from: 'Mundra Port', to: 'Colombo Port', type: 'trade' as const, strength: 0.7 },
  { from: 'Mundra Port', to: 'Haifa Port', type: 'trade' as const, strength: 0.6 },
  { from: 'Ahmedabad HQ', to: 'Brisbane', type: 'ownership' as const, strength: 0.9 },
  { from: 'Brisbane', to: 'Carmichael Mine', type: 'supply' as const, strength: 1.0 },
  { from: 'Mundra Port', to: 'Mombasa', type: 'trade' as const, strength: 0.4 },
  { from: 'Ahmedabad HQ', to: 'Mumbai Office', type: 'ownership' as const, strength: 1.0 },
];

const ADANI_ENTITIES = [
  { name: 'Adani Enterprises', sector: 'Incubator', marketCap: '₹3.8L Cr', revenue: '₹1.2L Cr' },
  { name: 'Adani Ports & SEZ', sector: 'Ports', marketCap: '₹2.9L Cr', revenue: '₹24,000 Cr' },
  { name: 'Adani Power', sector: 'Power', marketCap: '₹1.8L Cr', revenue: '₹38,000 Cr' },
  { name: 'Adani Transmission', sector: 'Utilities', marketCap: '₹1.5L Cr', revenue: '₹16,000 Cr' },
  { name: 'Adani Green Energy', sector: 'Renewable', marketCap: '₹1.2L Cr', revenue: '₹9,000 Cr' },
  { name: 'Adani Total Gas', sector: 'Gas', marketCap: '₹85,000 Cr', revenue: '₹4,500 Cr' },
  { name: 'Adani Wilmar', sector: 'FMCG', marketCap: '₹65,000 Cr', revenue: '₹55,000 Cr' },
  { name: 'Ambuja Cements', sector: 'Cement', marketCap: '₹1.1L Cr', revenue: '₹35,000 Cr' },
  { name: 'ACC', sector: 'Cement', marketCap: '₹72,000 Cr', revenue: '₹20,000 Cr' },
  { name: 'NDTV', sector: 'Media', marketCap: '₹1,200 Cr', revenue: '₹450 Cr' },
];

const KEY_PEOPLE = [
  { name: 'Gautam Adani', role: 'Chairman', since: '1988' },
  { name: 'Karan Adani', role: 'CEO, Adani Ports', since: '2016' },
  { name: 'Pranav Adani', role: 'Director, Adani Enterprises', since: '2017' },
  { name: 'Jugeshinder Singh', role: 'CFO', since: '2020' },
  { name: 'Sagar Adani', role: 'Executive Director', since: '2021' },
];

const PORTFOLIO = [
  { name: 'Ports', count: 13, capacity: '580 MMT', globalRank: '#1 India' },
  { name: 'Airports', count: 7, capacity: '23% India traffic', globalRank: '#2 India' },
  { name: 'Power Generation', count: 15, capacity: '15 GW', globalRank: '#1 Private' },
  { name: 'Solar Manufacturing', count: 3, capacity: '10 GW', globalRank: '#1 India' },
  { name: 'Cement', count: 2, capacity: '78 MTPA', globalRank: '#2 India' },
  { name: 'Gas Distribution', count: 52, capacity: '12% India', globalRank: '#1 India' },
];

const TIMELINE = [
  { date: '2024-03', event: 'Supreme Court clean chit on Hindenburg allegations', category: 'legal' },
  { date: '2023-12', event: 'Acquires majority stake in NDTV', category: 'acquisition' },
  { date: '2023-07', event: 'Sri Lanka cancels wind power projects amid protests', category: 'political' },
  { date: '2023-06', event: 'US DOJ begins investigation into Adani companies', category: 'legal' },
  { date: '2023-03', event: 'Hindenburg Research publishes fraud allegations', category: 'legal' },
  { date: '2022-09', 'event': 'Acquires ACC and Ambuja Cements for $10.5B', category: 'acquisition' },
  { date: '2022-05', event: 'Acquires Haifa Port in Israel', category: 'acquisition' },
  { date: '2021-08', event: 'Becomes 3rd richest person globally', category: 'financial' },
  { date: '2020-06', event: 'Acquires 74% stake in Mumbai International Airport', category: 'acquisition' },
  { date: '2019-06', event: 'Wins all 6 airport bids', category: 'acquisition' },
  { date: '2018-12', event: 'First coal shipment from Carmichael Mine, Australia', category: 'product' },
  { date: '2011-06', event: 'Acquires Abbot Point coal terminal, Australia', category: 'acquisition' },
  { date: '2008-01', event: 'Mundra Port becomes largest commercial port in India', category: 'product' },
  { date: '1988-01', event: 'Adani Enterprises founded as commodity trader', category: 'product' },
];

const MEDIA_COVERAGE = [
  { outlet: 'Financial Times', title: 'Adani shares surge after Supreme Court clean chit', date: '2024-03-15', sentiment: 'positive' as const },
  { outlet: 'The Guardian', title: 'Adani coal mine: environmental concerns persist', date: '2024-02-10', sentiment: 'negative' as const },
  { outlet: 'Reuters', title: 'Adani Group plans $100B investment over next decade', date: '2024-01-20', sentiment: 'positive' as const },
  { outlet: 'Hindenburg Research', title: 'Adani Group: How The World\'s 3rd Richest Man Is Pulling The Largest Con In Corporate History', date: '2023-01-24', sentiment: 'negative' as const },
  { outlet: 'Bloomberg', title: 'Adani gets $553 million from GQG Partners investment', date: '2023-03-02', sentiment: 'neutral' as const },
  { outlet: 'Al Jazeera', title: 'Sri Lanka protesters oppose Adani wind project', date: '2023-07-18', sentiment: 'negative' as const },
];

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  acquisition: Building2,
  legal: Landmark,
  financial: TrendingUp,
  political: Users,
  product: Activity,
};

export default function AdaniDeepDive() {
  const [activeTab, setActiveTab] = useState<'overview' | 'global' | 'entities' | 'timeline' | 'media'>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Activity },
    { id: 'global' as const, label: 'Global Map', icon: Globe },
    { id: 'entities' as const, label: 'Listed Entities', icon: Network },
    { id: 'timeline' as const, label: 'Timeline', icon: FileText },
    { id: 'media' as const, label: 'Media', icon: Radio },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-8 h-8 text-[#c9a86c]" />
              <h1 className="text-3xl font-bold text-[#f0e6d8]">Adani Group</h1>
            </div>
            <p className="text-[#9c9588]">
              10 Listed Entities • Ports • Power • Airports • Cement • Media
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <div className="text-3xl font-bold text-[#c9a86c]">₹3,150.00</div>
              <div className="flex items-center justify-end gap-1 text-[#c45b5a]">
                <ArrowDownRight className="w-4 h-4" />
                <span>-45.20 (-1.42%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#f4f0e8]/10">
          <div>
            <div className="text-[#7a7569] text-sm">Combined M-Cap</div>
            <div className="text-xl font-bold text-[#f0e6d8]">₹14.5L Cr</div>
          </div>
          <div>
            <div className="text-[#7a7569] text-sm">Revenue (FY24)</div>
            <div className="text-xl font-bold text-[#f0e6d8]">₹3.0L Cr</div>
          </div>
          <div>
            <div className="text-[#7a7569] text-sm">Employees</div>
            <div className="text-xl font-bold text-[#f0e6d8]">25,000+</div>
          </div>
          <div>
            <div className="text-[#7a7569] text-sm">Countries</div>
            <div className="text-xl font-bold text-[#f0e6d8]">14+</div>
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
          {/* Portfolio Overview */}
          <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#f0e6d8] mb-4 flex items-center gap-2">
              <Anchor className="w-5 h-5 text-[#c9a86c]" />
              Infrastructure Portfolio
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {PORTFOLIO.map(item => (
                <div key={item.name} className="bg-[#0c0c0e] rounded-lg p-4">
                  <div className="text-[#f0e6d8] font-medium text-sm">{item.name}</div>
                  <div className="text-[#c9a86c] text-lg font-bold">{item.count} assets</div>
                  <div className="text-[#7a7569] text-xs">{item.capacity}</div>
                  <div className="text-[#9c9588] text-xs mt-1">{item.globalRank}</div>
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
                { level: 'high' as const, text: 'Hindenburg fraud allegations (2023) - US DOJ investigating' },
                { level: 'high' as const, text: 'High debt-to-equity ratio across group companies' },
                { level: 'medium' as const, text: 'International project cancellations (Sri Lanka wind)' },
                { level: 'medium' as const, text: 'Concentrated ownership: Promoters hold ~72%' },
                { level: 'low' as const, text: 'Supreme Court clean chit in some allegations' },
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
              Global Port & Infrastructure Network
            </h2>
            <WorldMap locations={ADANI_LOCATIONS} connections={ADANI_CONNECTIONS} />
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-[#7a7569]">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#c9a86c]" /> HQ
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#ec4899]" /> Port
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#7a9e7e]" /> Subsidiary
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#3b82f6]" /> Office
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]" /> Factory/Mine
              </div>
            </div>
          </div>

          {/* Port Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Port Capacity', value: '580 MMT', sub: 'India #1' },
              { label: 'International Ports', value: '3', sub: 'Israel, Sri Lanka, Kenya' },
              { label: 'Coal Reserves', value: '10 Bn Tonnes', sub: 'Australia Carmichael' },
              { label: 'Airports Operated', value: '7', sub: '23% India traffic' },
            ].map(stat => (
              <div key={stat.label} className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-4">
                <div className="text-[#7a7569] text-xs">{stat.label}</div>
                <div className="text-[#c9a86c] text-xl font-bold">{stat.value}</div>
                <div className="text-[#9c9588] text-xs">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'entities' && (
        <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#f0e6d8] mb-4">Listed Entities</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f4f0e8]/10">
                  <th className="text-left py-3 px-4 text-[#9c9588] text-sm">Company</th>
                  <th className="text-left py-3 px-4 text-[#9c9588] text-sm">Sector</th>
                  <th className="text-right py-3 px-4 text-[#9c9588] text-sm">Market Cap</th>
                  <th className="text-right py-3 px-4 text-[#9c9588] text-sm">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {ADANI_ENTITIES.map(entity => (
                  <tr key={entity.name} className="border-b border-[#f4f0e8]/5 hover:bg-[#1c1c1f]">
                    <td className="py-3 px-4 text-[#f0e6d8] text-sm font-medium">{entity.name}</td>
                    <td className="py-3 px-4 text-[#9c9588] text-sm">{entity.sector}</td>
                    <td className="py-3 px-4 text-right text-[#c9a86c] font-medium">{entity.marketCap}</td>
                    <td className="py-3 px-4 text-right text-[#9c9588] text-sm">{entity.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#f0e6d8] mb-4">Company Timeline</h2>
          <div className="space-y-4 relative">
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

      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="bg-[#161618] border border-[#f4f0e8]/10 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#f0e6d8] mb-4">Owned Media Outlets</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['NDTV', 'NDTV 24x7', 'NDTV India', 'NDTV Profit'].map(outlet => (
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
    </div>
  );
}
