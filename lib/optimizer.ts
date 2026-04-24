import type { Pincode, DemandHotspot, ChargingStation } from '@prisma/client'
import { scoreCandidate, rationaleFor, type ScoreContext } from './scoring'
import { projectRoi } from './roi'
import { CHARGER_COSTS_INR, CHARGER_KW } from './types'
import type { ChargerType, LocationCategory } from './types'
import { haversineKm } from './geo'

export interface OptimizationInput {
  budgetInr: number
  minPaybackMonths: number
  targetCount: number
  focusDistrict?: string
}

export interface ProposalCandidate {
  pincodeId: string
  proposedLat: number
  proposedLng: number
  category: LocationCategory
  recommendedTypes: ChargerType[]
  recommendedPorts: number
  siteScore: number
  demandScore: number
  capacityScore: number
  accessibilityScore: number
  competitionScore: number
  feederImpactPct: number
  feederCode: string
  estimatedDailyKwh: number
  estimatedRevenueInrPerMonth: number
  paybackMonths: number
  rationale: string
}

export interface OptimizationOutput {
  proposals: ProposalCandidate[]
  totalInvestment: number
  totalRevenueYr1Inr: number
  totalPincodesCovered: number
}

const MIN_INTER_SITE_KM = 0.5
const MAX_FEEDER_IMPACT_PCT = 30

interface CandidatePoint {
  pincodeId: string
  lat: number
  lng: number
  category: LocationCategory
  sourceNote: string
}

function generateCandidatePoints(pincodes: Pincode[], hotspots: DemandHotspot[]): CandidatePoint[] {
  const points: CandidatePoint[] = []

  for (const p of pincodes) {
    // Centroid candidate
    points.push({
      pincodeId: p.id,
      lat: p.lat,
      lng: p.lng,
      category: categorizeByArea(p.area),
      sourceNote: 'pincode_centroid',
    })

    // Hotspot-adjacent candidates (hotspots within 3 km of this pincode centroid)
    const nearbyHotspots = hotspots.filter(
      h => haversineKm(p.lat, p.lng, h.lat, h.lng) <= 3,
    )
    for (const h of nearbyHotspots) {
      points.push({
        pincodeId: p.id,
        lat: h.lat + (Math.random() - 0.5) * 0.001,
        lng: h.lng + (Math.random() - 0.5) * 0.001,
        category: categorizeByArea(p.area),
        sourceNote: `hotspot:${h.source}`,
      })
    }
  }

  return points
}

function categorizeByArea(area: string): LocationCategory {
  const a = area.toLowerCase()
  if (/tech|electronic city|whitefield|manyata|it park/.test(a)) return 'IT_PARK'
  if (/mall|ub city|orion|forum|phoenix/.test(a)) return 'MALL'
  if (/highway|hosur|tumkur|mysore road|airport/.test(a)) return 'HIGHWAY_EXIT'
  if (/station|bus stand|metro|transit/.test(a)) return 'TRANSPORT_HUB'
  if (/college|institute|university|hospital/.test(a)) return 'INSTITUTIONAL'
  if (/market|bazaar|commercial|main road/.test(a)) return 'COMMERCIAL'
  return 'RESIDENTIAL'
}

function pickChargerMix(category: LocationCategory, demandScore: number): { types: ChargerType[]; ports: number } {
  if (category === 'HIGHWAY_EXIT' || category === 'TRANSPORT_HUB') {
    return { types: demandScore > 0.7 ? ['DC_ULTRA_150KW', 'DC_FAST_50KW'] : ['DC_FAST_50KW', 'DC_FAST_25KW'], ports: 4 }
  }
  if (category === 'IT_PARK' || category === 'MALL') {
    return { types: ['DC_FAST_50KW', 'AC_002'], ports: demandScore > 0.6 ? 6 : 4 }
  }
  if (category === 'COMMERCIAL' || category === 'INSTITUTIONAL') {
    return { types: ['DC_FAST_25KW', 'AC_002'], ports: 4 }
  }
  return { types: ['AC_002', 'AC_001'], ports: 4 }
}

function chargerMixLoadKw(types: ChargerType[], ports: number): number {
  const avgKw = types.reduce((sum, t) => sum + CHARGER_KW[t], 0) / types.length
  return avgKw * ports
}

function capexForMix(types: ChargerType[], ports: number): number {
  return types.reduce((sum, t) => sum + CHARGER_COSTS_INR[t], 0) * ports
}

export function optimize(
  input: OptimizationInput,
  pincodes: Pincode[],
  hotspots: DemandHotspot[],
  existingStations: ChargingStation[],
): OptimizationOutput {
  const focused = input.focusDistrict
    ? pincodes.filter(p => p.district.toLowerCase() === input.focusDistrict!.toLowerCase())
    : pincodes

  const candidatePoints = generateCandidatePoints(focused, hotspots)

  // Score each candidate
  const scored = candidatePoints.map(cp => {
    const pincode = focused.find(p => p.id === cp.pincodeId)!
    const nearbyStations = existingStations.filter(
      s => haversineKm(cp.lat, cp.lng, s.lat, s.lng) <= 2,
    )
    const hotspotsNearby = hotspots.filter(
      h => haversineKm(cp.lat, cp.lng, h.lat, h.lng) <= 2,
    )

    // Pick a preliminary charger mix based on category + local demand estimate
    const prelimDemand = Math.min(1, hotspotsNearby.length / 3 + pincode.evAdoptionIndex * 0.3)
    const mix = pickChargerMix(cp.category, prelimDemand)
    const loadKw = chargerMixLoadKw(mix.types, mix.ports)

    const ctx: ScoreContext = { pincode, hotspots: hotspotsNearby, nearbyStations, estimatedLoadKw: loadKw }
    const scores = scoreCandidate({ lat: cp.lat, lng: cp.lng }, ctx)

    const roi = projectRoi(mix.types, mix.ports, scores.demand)
    const feederImpactPct = (loadKw / (pincode.availableCapacityMW * 1000)) * 100
    const feederCode = `FDR-${pincode.pincode.slice(0, 3)}-${Math.floor(Math.random() * 90 + 10)}`

    return {
      candidate: cp,
      pincode,
      scores,
      mix,
      roi,
      feederImpactPct,
      feederCode,
      rationale: rationaleFor(scores, ctx),
    }
  })

  // Sort by composite score desc, then by payback asc
  scored.sort((a, b) => {
    if (b.scores.composite !== a.scores.composite) return b.scores.composite - a.scores.composite
    return a.roi.paybackMonths - b.roi.paybackMonths
  })

  // Greedy selection subject to constraints
  const selected: (typeof scored)[number][] = []
  let remainingBudget = input.budgetInr
  const feederImpact: Record<string, number> = {}

  for (const s of scored) {
    if (selected.length >= input.targetCount) break

    // Budget check
    const capex = capexForMix(s.mix.types, s.mix.ports)
    if (capex > remainingBudget) continue

    // Payback check
    if (s.roi.paybackMonths < input.minPaybackMonths) continue
    if (s.roi.paybackMonths > 36) continue // reject proposals with > 3 year payback

    // Spatial check: minimum 500m between selected proposals
    const tooClose = selected.some(
      sel =>
        haversineKm(
          s.candidate.lat,
          s.candidate.lng,
          sel.candidate.lat,
          sel.candidate.lng,
        ) < MIN_INTER_SITE_KM,
    )
    if (tooClose) continue

    // Feeder cumulative impact check
    const cumulative = (feederImpact[s.feederCode] ?? 0) + s.feederImpactPct
    if (cumulative > MAX_FEEDER_IMPACT_PCT) continue

    selected.push(s)
    remainingBudget -= capex
    feederImpact[s.feederCode] = cumulative
  }

  const proposals: ProposalCandidate[] = selected.map(s => ({
    pincodeId: s.pincode.id,
    proposedLat: s.candidate.lat,
    proposedLng: s.candidate.lng,
    category: s.candidate.category,
    recommendedTypes: s.mix.types,
    recommendedPorts: s.mix.ports,
    siteScore: s.scores.composite,
    demandScore: s.scores.demand,
    capacityScore: s.scores.capacity,
    accessibilityScore: s.scores.accessibility,
    competitionScore: s.scores.competition,
    feederImpactPct: Math.round(s.feederImpactPct * 10) / 10,
    feederCode: s.feederCode,
    estimatedDailyKwh: s.roi.estimatedDailyKwh,
    estimatedRevenueInrPerMonth: s.roi.monthlyRevenueInr,
    paybackMonths: s.roi.paybackMonths,
    rationale: s.rationale,
  }))

  const totalInvestment = proposals.reduce(
    (sum, p) => sum + capexForMix(p.recommendedTypes, p.recommendedPorts),
    0,
  )
  const totalRevenueYr1Inr = proposals.reduce((sum, p) => sum + p.estimatedRevenueInrPerMonth * 12, 0)
  const pincodesCovered = new Set(proposals.map(p => p.pincodeId))

  return {
    proposals,
    totalInvestment,
    totalRevenueYr1Inr,
    totalPincodesCovered: pincodesCovered.size,
  }
}
