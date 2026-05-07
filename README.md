# ChargeSense AI — EV Charging Optimization & Infrastructure Planning for BESCOM

> **PanIIT AI for Bharat 2026 — Theme 9** · **Sponsor:** BESCOM
> Predict · Shift · Site

[![ChargeSense AI — 5-min walkthrough](demo/video/poster.jpg)](https://youtu.be/n3n8ft261Co)

▶ **[Watch the 5-minute demo](https://youtu.be/n3n8ft261Co)**

---

## What it solves

Bengaluru is racing toward 15% EV penetration by 2030, but BESCOM doesn't yet have the planning tool to keep up. **The brief has two parts**, both addressed: Part A — predict hourly EV demand by zone and recommend peak-shift to overnight off-peak using the BESCOM ToU tariff. Part B — score-based charger location planning under hard constraints (budget, 500 m spacing, ≤30% feeder load).

## Key features

- **Part A — 24h hourly EV demand forecast** — Per pincode (area-type signature × population × adoption)
- **Peak-shift recommendation** — MW shiftable to overnight off-peak (23:00–05:00) using BESCOM ToU tariff; ₹ daily savings quantified
- **Grid stress analytics** — Feeder utilisation %, pincodes at risk (>80%)
- **Part B — score-based site planner** — 4-component composite (demand × capacity × accessibility × competition) with 35/25/20/20 weights
- **Hard constraints** — Budget · 500 m spacing · ≤30% cumulative feeder load
- **Corridor analysis** — 7 Bengaluru arterials (ORR East, Whitefield, Hosur, Bellary, Tumkur, CBD, Jayanagar–BSK) with growth-signal ranking
- **Baseline comparison** — ChargeSense vs uniform-placement strawman (composite +2%, payback 3% sooner)
- **AI Morning Briefing** — Azure GPT-4.1 narrates fleet outlook + peak-shift opportunity + recommended action
- **AI rationale per proposal** — Replaces template strings; cites the actual scoring numbers

## Architecture

![Architecture](docs/diagrams/architecture.png)

> Source: [`docs/diagrams/architecture.mmd`](docs/diagrams/architecture.mmd) (Mermaid)

## Quick start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |

> No Python. No Docker. SQLite is bundled.

### Setup

```bash
# 1. Install
npm install

# 2. Configure environment (optional — without keys, AI falls back to deterministic templates)
cat > .env.local <<'EOF'
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/openai/deployments/<deployment>/chat/completions?api-version=2025-01-01-preview
EOF

# 3. Set up the database
npx prisma generate
npx prisma migrate dev --name init

# 4. Seed demo data
npm run seed

# 5. Run the dev server
npm run dev
```

Open <http://localhost:3000>.

### One-liner

```bash
npm install && npx prisma generate && npx prisma migrate dev --name init && npm run seed && npm run dev
```


## Demo flow

1. Land on `/` for the **AI Morning Briefing** + KPI strip + plant map
2. `/scheduling` — 24h hourly EV demand forecast + peak-shift recommendation + AI scheduling advisory
3. `/map` — Bengaluru charging map (4 layers: adoption choropleth, demand hotspots, existing chargers, proposed sites)
4. `/proposals` — score-ranked site list + baseline comparison band
5. Click any proposal → AI rationale + 5-year ROI breakdown
6. `/plan/new` — re-run the optimizer with custom budget + payback constraints

> **Demo data:** 29 Bengaluru pincodes · 40 existing charging stations across 7 operators · 60 demand hotspots · 15 charger proposals (₹3.56 Cr CAPEX) · Faker seed=42

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | Prisma + SQLite |
| Charts | Tremor v3 |
| Map | Leaflet + react-leaflet |
| AI / LLM | Azure OpenAI GPT-4.1 with deterministic fallback |
| Styling | Tailwind CSS |

## Brief non-negotiables met

- ✅ Synthetic data only
- ✅ No hosted-LLM on real customer telemetry
- ✅ Deterministic explainable scoring
- ✅ Decision-support only (no system writes)

---

## Submission

- **Hackathon:** PanIIT AI for Bharat 2026
- **Theme:** 9 — EV Charging Optimization & Infrastructure Planning for BESCOM
- **Video:** https://youtu.be/n3n8ft261Co
- **Repo:** https://github.com/sridhar7601/bescom-ev-planner
- **Team:** Sridhar Suresh, Sruthi Krishnakumar
