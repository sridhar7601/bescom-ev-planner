# ChargeSense AI — EV Charging Optimization & Infrastructure Planning for BESCOM

> **PanIIT AI for Bharat Hackathon — Theme 9**
> AI decision-support for Bengaluru's EV charging future: demand prediction + peak-shift scheduling + score-based location planning, with **Azure GPT-4.1** narration grounded on real numbers.

---

## What it solves

The brief has **two parts**, both addressed by ChargeSense AI:

### Part A — EV Charging Demand & Scheduling
- **Predict** hourly EV charging demand by zone (24h ahead, area-type signature × population × adoption)
- **Recommend** optimal charging times — peak-shift to overnight off-peak (23:00–05:00) using BESCOM ToU tariff
- **Quantify** grid stress: feeder utilisation %, pincodes at risk (>80%), MW shiftable, ₹ daily savings

### Part B — Infrastructure Location Planning
- **Identify** high-demand zones (hotspots + adoption choropleth)
- **Recommend** new charger locations — composite scoring (demand × capacity × accessibility × competition) with hard constraints (budget, 500 m spacing, ≤30 % feeder load)
- **Corridor analysis** — group pincodes into Bengaluru arterials (ORR East, Whitefield, Hosur Rd, Bellary Rd, Tumkur Rd, CBD, Jayanagar–BSK) and rank by growth signal

**Brief non-negotiables met:** synthetic data only, no hosted-LLM on real customer telemetry, deterministic explainable scoring, decision-support-only (no system writes).

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |

No Python. No Docker. No external database. SQLite is bundled.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure environment

Create `.env.local`:

```env
# Required for AI features (briefing, scheduling explanations, corridor narration, proposal rationale)
AZURE_OPENAI_API_KEY=your_azure_openai_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2025-01-01-preview

# Optional fallback if Azure not available
# OPENAI_API_KEY=sk-...
```

> **Without API keys:** the app runs fully — every AI block falls back to deterministic templates. All forecasting, optimization, charts, and exports work offline.

### 3. Set up the database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Seed demo data

```bash
npm run seed
```

Seeds:
- **29 Bengaluru pincodes** with population, EV adoption index, peak demand MW, feeder headroom
- **40 existing charging stations** across 7 operators (BESCOM, Tata Power, ChargeZone, Statiq, Ather, BPCL, Jio-bp)
- **60 demand hotspots** concentrated in tech/commercial zones
- **15 charger proposals** ranked by composite score (₹4 Cr total CAPEX)
- All seeded with Faker seed 42 → deterministic, reproducible runs

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Full setup (one-liner)

```bash
npm install && npx prisma generate && npx prisma migrate dev --name init && npm run seed && npm run dev
```

---

## Key features

| Feature | Where |
|---------|-------|
| **AI Morning Briefing** (Azure GPT-4.1) | Dashboard — top card |
| **24h hourly demand forecast** + peak-shift optimizer | `/scheduling` |
| **AI scheduling recommendations** for top-5 stressed pincodes | `/scheduling` |
| **Corridor analysis** — ORR East, Whitefield, Hosur Rd, Bellary Rd, etc. | `/scheduling` |
| **AI corridor narration** with charger gap + urgency | `/scheduling` |
| Score-based site optimizer (4 components, hard constraints) | `/plan/new` |
| Baseline comparison (ChargeSense vs uniform placement) | `/proposals` |
| **AI proposal rationale** (replaces template strings) | `/proposals/[id]` |
| 5-year ROI breakdown + feeder code binding | `/proposals/[id]` |
| Approval workflow (5 states: PROPOSED → SHORTLISTED → APPROVED → DEPLOYED → REJECTED) | `/proposals/[id]` |
| Interactive Leaflet map with 4 toggleable layers | `/map` |
| CSV export of proposals | `/proposals` |
| Pincode-level detail (existing + proposed) | `/pincodes/[id]` |

---

## Available scripts

```bash
npm run dev     # Start dev server (Next.js)
npm run build   # Production build
npm run start   # Start production server
npm run seed    # Seed Faker-deterministic demo data (29 pincodes, 40 stations, 60 hotspots, 15 proposals)
npm run lint    # ESLint
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, TypeScript 5) |
| Database | Prisma 5 + SQLite (PostgreSQL-portable) |
| Charts | @tremor/react |
| Map | Leaflet + react-leaflet (OSM) + Turf.js (haversine, buffer) |
| AI / LLM | Azure OpenAI GPT-4.1 (enterprise) — fully optional |
| Styling | Tailwind CSS v3 + lucide-react icons |
| Data | Faker 10 (seed 42) — deterministic |

---

## Architecture

```
app/                        Next.js pages + API routes
├── page.tsx                Dashboard — AI briefing, KPIs, grid stress snapshot
├── scheduling/             Part A: hourly demand forecast + peak-shift + corridor analysis
├── map/                    Leaflet map with pincodes, hotspots, chargers, proposals
├── plan/new/               Score-based plan generator (sliders → optimizer)
├── proposals/              Ranked proposals list + baseline comparison + CSV export
│   └── [id]/               Single-proposal detail with AI rationale + ROI + approval workflow
├── pincodes/[id]/          Pincode detail — existing chargers + proposed sites
└── api/                    REST endpoints (plants, clusters, stations, proposals, plan/generate)

lib/
├── demand-forecast.ts      24h hourly EV demand prediction (area-type signature × pop × adoption)
├── scheduler.ts            Peak-shift optimizer (40 % flex, 23:00–05:00 off-peak, ToU tariff)
├── corridors.ts            Bengaluru arterial mapping + corridor growth-signal scoring
├── optimizer.ts            Greedy site selection (4-component composite, hard constraints)
├── scoring.ts              Demand × capacity × accessibility × competition
├── roi.ts                  CAPEX / monthly revenue / payback / 5-yr cumulative
├── baselines.ts            Uniform-placement baseline for Part B comparison
├── llm-narration.ts        Azure GPT-4.1 grounded narration (4 use cases, disk-cached)
├── geo.ts                  Turf.js haversine helpers
└── ai.ts                   Legacy template rationale (kept as deterministic fallback)
```

---

## How AI is used (Azure GPT-4.1)

All AI outputs are **grounded** — GPT-4.1 only describes pre-computed numbers. No hallucinated MW, ₹, or pincode values. Every response cached to `data/llm-cache/` after first call → demo never breaks if network is down.

| Use case | Where |
|----------|-------|
| **Daily briefing** | Dashboard — fleet outlook + grid stress + recommended action |
| **Scheduling explanation** | `/scheduling` — peak-shift rationale per pincode |
| **Corridor flag** | `/scheduling` — urgency + charger count + timeline per arterial |
| **Proposal rationale** | `/proposals/[id]` — site justification + financial case |

Production deployment note: per the brief's non-negotiables, hosted-LLM use on real BESCOM customer data is not permitted. This implementation uses synthetic demo data only; production swaps Azure OpenAI for an on-prem inference layer (Llama-3 / Mistral) without changing the application code.

---

## Methodology — Part A (Demand & Scheduling)

**Hourly demand forecast:**
```
peakEvMW = (population × 4% × adoptionIndex) × 6 kWh/EV/day × 30% peak-hour fraction / 1000
demandMW[h] = peakEvMW × signature[archetype][h]
```

Archetype signatures (residential / IT-park / commercial / transport-hub / mixed) come from published BESCOM/CEA load-profile studies. Production swaps signatures for smart-meter telemetry; the forecast logic stays identical.

**Peak-shift scheduler:**
```
flexible = 40% of evening EV charging (residential AC, overnight-shiftable)
shifted to 23:00–05:00 off-peak window (lowest baseLoad period)
₹ savings = flexMWh × 1000 × (₹8.50/kWh peak − ₹4.50/kWh off-peak)
```

---

## Methodology — Part B (Location Planning)

Composite score (0–1):
```
composite = 0.35 × demand + 0.25 × capacity + 0.20 × accessibility + 0.20 × competition
```

Greedy selection with **hard constraints**:
1. ≥ 500 m from any already-selected site (Turf.js haversine)
2. Cumulative feeder load ≤ 30 % per feeder code
3. Total CAPEX ≤ budget
4. Per-site payback ≤ user-set max

Baseline comparison: vs **uniform placement** (the strawman the brief asks us to beat).

---

## Submission

- **Hackathon:** PanIIT AI for Bharat
- **Theme:** 9 — AI for EV Charging Optimization & Infrastructure Planning (BESCOM)
- **Team:** Sridhar, Sruthi
