import type { Pincode, DemandHotspot, ChargingStation } from '@prisma/client'
import { haversineKm, pointsWithinKm, minDistanceKm } from './geo'

export interface ScoreComponents {
  demand: number
  capacity: number
  accessibility: number
  competition: number
  composite: number
}

export interface ScoreContext {
  pincode: Pincode
  hotspots: DemandHotspot[]
  nearbyStations: ChargingStation[]
  estimatedLoadKw: number
}

const WEIGHTS = { demand: 0.35, capacity: 0.25, accessibility: 0.2, competition: 0.2 }

export function scoreCandidate(candidate: { lat: number; lng: number }, ctx: ScoreContext): ScoreComponents {
  const { pincode, hotspots, nearbyStations, estimatedLoadKw } = ctx

  // DEMAND: density of hotspots within 1km, weighted by their demandScore
  const hotspotsWithin1km = hotspots.filter(
    h => haversineKm(candidate.lat, candidate.lng, h.lat, h.lng) <= 1,
  )
  const rawDemand = hotspotsWithin1km.reduce((sum, h) => sum + h.demandScore, 0)
  const demand = Math.min(1, rawDemand / 5 + pincode.evAdoptionIndex * 0.3)

  // CAPACITY: headroom on pincode's grid capacity vs the load this charger adds
  const loadFraction = estimatedLoadKw / Math.max(1, pincode.availableCapacityMW * 1000)
  const capacity = Math.max(0, 1 - loadFraction * 4)

  // ACCESSIBILITY: mock by using distance to pincode centroid (proxy for main-road proximity)
  const distanceToCentroidKm = haversineKm(candidate.lat, candidate.lng, pincode.lat, pincode.lng)
  const accessibility = Math.max(0, 1 - distanceToCentroidKm / 3)

  // COMPETITION: fewer existing chargers within 1km = higher score
  const stationsWithin1km = pointsWithinKm(candidate, nearbyStations, 1)
  const saturation = 5
  const competition = Math.max(0, 1 - stationsWithin1km / saturation)

  const composite =
    demand * WEIGHTS.demand +
    capacity * WEIGHTS.capacity +
    accessibility * WEIGHTS.accessibility +
    competition * WEIGHTS.competition

  return {
    demand: round3(demand),
    capacity: round3(capacity),
    accessibility: round3(accessibility),
    competition: round3(competition),
    composite: round3(composite),
  }
}

export function rationaleFor(scores: ScoreComponents, ctx: ScoreContext): string {
  const parts: string[] = []
  const { pincode, hotspots, nearbyStations, estimatedLoadKw } = ctx

  const hotspotsWithin1km = hotspots.filter(
    h => haversineKm(pincode.lat, pincode.lng, h.lat, h.lng) <= 1,
  ).length
  parts.push(
    `${hotspotsWithin1km} demand hotspot(s) within 1 km; pincode EV adoption index ${pincode.evAdoptionIndex.toFixed(2)} (demand ${(scores.demand * 100).toFixed(0)}%).`,
  )

  const loadPct = (estimatedLoadKw / (pincode.availableCapacityMW * 1000)) * 100
  parts.push(
    `Projected ${loadPct.toFixed(1)}% of pincode grid headroom consumed by this station (capacity ${(scores.capacity * 100).toFixed(0)}%).`,
  )

  const nearestKm = minDistanceKm(
    { lat: pincode.lat, lng: pincode.lng },
    nearbyStations.map(s => ({ lat: s.lat, lng: s.lng })),
  )
  if (nearbyStations.length === 0) {
    parts.push(`No existing chargers nearby — green-field opportunity (competition ${(scores.competition * 100).toFixed(0)}%).`)
  } else {
    parts.push(
      `Nearest existing charger ${nearestKm.toFixed(2)} km away; ${nearbyStations.length} total nearby (competition ${(scores.competition * 100).toFixed(0)}%).`,
    )
  }

  parts.push(`Composite site score ${(scores.composite * 100).toFixed(0)}%.`)
  return parts.join(' ')
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}
