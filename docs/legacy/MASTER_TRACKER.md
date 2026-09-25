# ICIP Master Tracker

> **India Corporate Intelligence Platform**
> Live: https://occult-kranti.github.io/india-corporate-intelligence/

---

## Current Status Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 99 |
| Complete | 30 (30%) |
| In Progress | 1 |
| Blocked | 0 |
| Last Deploy | 2026-08-11 |
| Live URL | https://occult-kranti.github.io/india-corporate-intelligence/ |

---

## Repositories

| Repo | Purpose | Status | URL |
|------|---------|--------|-----|
| `india-corporate-intelligence` | Main React web app | 🟢 Active | https://github.com/occult-kranti/india-corporate-intelligence |
| `icip-data-pipeline` | Python ETL + scraping | 🟡 Scaffolded | https://github.com/occult-kranti/icip-data-pipeline |
| `icip-network-engine` | Graph analytics API | 🟡 Scaffolded | https://github.com/occult-kranti/icip-network-engine |
| `icip-docs` | Documentation + research | 🟡 Scaffolded | https://github.com/occult-kranti/icip-docs |

---

## Completed Features (30)

### Core Frontend (C001-C023)
- [x] C001 - React 18 + TypeScript + Vite scaffold
- [x] C002 - Dark theme design system
- [x] C003 - Layout with navigation
- [x] C004 - Dashboard page
- [x] C005 - Company Profile page
- [x] C006 - Map Explorer (India SVG)
- [x] C007 - Network Graph (D3.js)
- [x] C008 - Industry Clustering
- [x] C009 - Political Connections
- [x] C010 - Media Ownership
- [x] C011 - Search page
- [x] C012 - Watchlist page
- [x] C014 - Deploy to GitHub Pages
- [x] C015 - HashRouter for static hosting
- [x] C021 - NIFTY 50 index page
- [x] C022 - NIFTY 50 sparkline cards
- [x] C023 - NIFTY 50 sector allocation pie chart

### Advanced Maps (D001-D013)
- [x] D011 - NSE Map page (50 companies)
- [x] D012 - BSE Map page (30 companies)
- [x] D013 - Exchange filter on Map Explorer

### Infrastructure (A001-A008)
- [x] A001 - icip-data-pipeline repository
- [x] A002 - icip-network-engine repository
- [x] A003 - icip-docs repository

### Data Architecture (B001-B008)
- [x] B007 - Sample datasets for development

### Network & Graph (E001-E010)
- [x] E001 - D3 force simulation engine

---

## In Progress

- [~] C013 - Mobile responsive optimization

---

## Next 10 Priority Tasks

| # | ID | Task | Why Priority |
|---|-----|------|-------------|
| 1 | **F001** | Scrape NSE listed companies | Real data needed for all features |
| 2 | **D001** | Integrate Mapbox GL JS | Realistic maps with accurate geocoding |
| 3 | **D002** | India GeoJSON state boundaries | Accurate state-level visualization |
| 4 | **B002** | PostgreSQL migration scripts | Data persistence layer |
| 5 | **C023** | Sector allocation pie chart | Complete NIFTY 50 dashboard |
| 6 | **E002** | Node clustering by sector | Better network visualization |
| 7 | **G001** | Scrape Electoral Bonds data | Political connections feature |
| 8 | **F004** | Scrape company basic info | CIN, ISIN, sector classification |
| 9 | **E003** | Relationship type filters | Filter network by connection type |
| 10 | **D007** | Drill-down State→City→Company | Map navigation hierarchy |

---

## Feature Roadmap

### Phase 1: MVP Complete ✅
- [x] Dark theme UI
- [x] 3 sample companies
- [x] Static India SVG map
- [x] D3 network graph
- [x] All 10 view pages
- [x] GitHub Pages deployment

### Phase 2: Realistic Maps (Current)
- [ ] Mapbox GL JS integration
- [ ] Accurate India GeoJSON
- [ ] Choropleth company density
- [ ] City-level clustering
- [ ] World map with FDI flows
- [ ] Port connection lines

### Phase 3: Deep Company Analysis (Next)
- [ ] Individual company deep-dive pages
- [ ] Global subsidiary mapping
- [ ] Supply chain visualization
- [ ] Ownership structure trees
- [ ] Historical timeline
- [ ] Document analysis (annual reports)

### Phase 4: Real Data Pipeline
- [ ] NSE/BSE scraping
- [ ] Geocoding all addresses
- [ ] PostgreSQL database
- [ ] DuckDB analytics
- [ ] API layer

### Phase 5: Network Intelligence
- [ ] Political donation flows
- [ ] Media ownership mapping
- [ ] Community detection
- [ ] Anomaly detection
- [ ] Influence scoring

### Phase 6: Advanced Features
- [ ] PWA + offline support
- [ ] Mobile app (Capacitor)
- [ ] Alert system
- [ ] Export reports (PDF)
- [ ] API for researchers

---

## Deep-Dive Company Pages Planned

| Company | Priority | Features |
|---------|----------|----------|
| **Reliance Industries** | P0 | Global map, subsidiaries, Jio/Ambani network, political connections |
| **Adani Group** | P0 | 10 listed entities, port network, global acquisitions, regulatory issues |
| **TCS** | P1 | Global delivery centers, client network, employee distribution |
| **HDFC Bank** | P1 | Branch network, merger timeline, financial metrics |

---

## Agent Skills (7 Created)

| Skill | Purpose | Location |
|-------|---------|----------|
| icip-data-scout | Data collection & scraping | `skills/icip-data-scout/` |
| icip-doc-analyzer | LLM document analysis | `skills/icip-doc-analyzer/` |
| icip-network-mapper | Graph algorithms | `skills/icip-network-mapper/` |
| icip-political-analyst | Political connections | `skills/icip-political-analyst/` |
| icip-media-tracker | Media ownership | `skills/icip-media-tracker/` |
| icip-frontend-dev | React UI patterns | `skills/icip-frontend-dev/` |
| icip-backend-dev | API + database | `skills/icip-backend-dev/` |

---

## Data Sources

| Source | Data | Status |
|--------|------|--------|
| NSE India | Listed companies, prices | Planned |
| BSE India | Listed companies, prices | Planned |
| MCA (Ministry of Corporate Affairs) | Company Master Data | Planned |
| SEBI | Filings, disclosures | Planned |
| ECI Electoral Bonds | Donation data | Planned |
| RBI | Banking data | Planned |
| RNI | Newspaper ownership | Planned |
| OpenStreetMap | Geocoding | Planned |

---

## Technical Debt

| Issue | Priority | Fix |
|-------|----------|-----|
| Map uses simplified SVG | P0 | Integrate Mapbox GL JS |
| Sample data only (3 companies) | P0 | Scrape real data |
| No backend API | P1 | Build icip-data-pipeline |
| No tests | P2 | Add Vitest + Playwright |
| No offline support | P2 | Service worker + cache |

---

## Metrics Targets

| Metric | Target | Current |
|--------|--------|---------|
| Companies tracked | 5,000+ | 80 (sample) |
| Persons tracked | 50,000+ | 6 (sample) |
| Network edges | 200,000+ | 15 (sample) |
| Documents analyzed | 2,500 | 0 |
| Monthly active users | TBD | N/A |

---

## How to Use Each Repo

### india-corporate-intelligence (Main App)
```bash
cd india-corporate-intelligence
npm install
npm run dev     # Local development
npm run build   # Production build
git push        # Auto-deploys to gh-pages
```

### icip-data-pipeline (ETL)
```bash
cd icip-data-pipeline
pip install -r requirements.txt
python scrapers/nse_companies.py
python scrapers/bse_companies.py
python geocoding/geocode_all.py
```

### icip-network-engine (Analytics)
```bash
cd icip-network-engine
npm install
npm run build
npm start       # GraphQL API on :4000
```

### icip-docs (Documentation)
```bash
cd icip-docs
mkdocs serve    # Local docs server
mkdocs build    # Build static site
```

---

*Last Updated: 2026-08-11*
*Maintained by: @tryclaw*
