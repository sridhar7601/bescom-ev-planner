import type { ScoreComponents } from './scoring'

export interface ProposalRationaleInput {
  siteScore: ScoreComponents
  paybackMonths: number
  feederImpactPct: number
  locationCategory: string
}

export async function explainProposal(input: ProposalRationaleInput): Promise<string> {
  if (process.env.USE_MOCK_AI !== 'false') return mockExplain(input)
  throw new Error('Real AI not wired — set USE_MOCK_AI=true')
}

function mockExplain(input: ProposalRationaleInput): string {
  const { siteScore, paybackMonths, feederImpactPct, locationCategory } = input
  const parts: string[] = []

  if (siteScore.composite >= 0.8) {
    parts.push('This site is a top-tier candidate — high demand density, strong grid capacity, low competition.')
  } else if (siteScore.composite >= 0.6) {
    parts.push('Solid candidate with balanced scores across demand and capacity.')
  } else {
    parts.push('Borderline candidate; consider only if budget allows after higher-ranked sites.')
  }

  if (paybackMonths < 18) {
    parts.push(`Payback of ${paybackMonths.toFixed(1)} months signals fast commercial viability.`)
  } else if (paybackMonths < 30) {
    parts.push(`Payback of ${paybackMonths.toFixed(1)} months is within BESCOM's acceptable ROI window.`)
  } else {
    parts.push(`Payback of ${paybackMonths.toFixed(1)} months is extended — subsidies may improve viability.`)
  }

  if (feederImpactPct < 15) {
    parts.push(`Feeder impact at ${feederImpactPct.toFixed(1)}% is minimal — no reinforcement needed.`)
  } else if (feederImpactPct < 30) {
    parts.push(`Feeder impact at ${feederImpactPct.toFixed(1)}% is within safe headroom limits.`)
  } else {
    parts.push(`Feeder impact at ${feederImpactPct.toFixed(1)}% is at threshold — coordinate with DT team.`)
  }

  parts.push(`Category: ${locationCategory.replace('_', ' ').toLowerCase()}.`)

  return parts.join(' ')
}
