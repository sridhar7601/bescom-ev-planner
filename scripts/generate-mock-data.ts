/**
 * Generate mock geo data for ChargeSense AI.
 * 30 Bengaluru pincodes with realistic lat/lng, 40 existing charging stations,
 * 60 demand hotspots concentrated near IT parks, malls, highway exits.
 */

import { faker } from '@faker-js/faker'

faker.seed(42)

type Pincode = {
  pincode: string
  area: string
  district: string
  lat: number
  lng: number
  population: number
  evAdoptionIndex: number
  peakDemandMW: number
  availableCapacityMW: number
}

type Station = {
  pincodeIdx: number
  name: string
  operator: string
  chargerTypes: string
  portCount: number
  lat: number
  lng: number
  category: string
  dailyUtilization: number
  dailyEnergyKwh: number
}

type Hotspot = {
  lat: number
  lng: number
  demandScore: number
  source: string
  notes: string
}

// 30 Bengaluru pincodes — name + approx lat/lng + district
const BENGALURU_PINCODES: Array<[string, string, string, number, number]> = [
  ['560001', 'MG Road / Cantonment', 'Bengaluru Urban', 12.9756, 77.6094],
  ['560002', 'Bengaluru GPO', 'Bengaluru Urban', 12.9716, 77.5946],
  ['560003', 'Malleshwaram', 'Bengaluru Urban', 13.003, 77.574],
  ['560004', 'Basavanagudi', 'Bengaluru Urban', 12.9422, 77.571],
  ['560005', 'Frazer Town', 'Bengaluru Urban', 12.9957, 77.6143],
  ['560008', 'Indiranagar', 'Bengaluru Urban', 12.9784, 77.6408],
  ['560010', 'Rajajinagar', 'Bengaluru Urban', 12.9916, 77.5538],
  ['560011', 'Jayanagar East', 'Bengaluru Urban', 12.9293, 77.5826],
  ['560020', 'Gandhinagar', 'Bengaluru Urban', 12.9784, 77.5729],
  ['560021', 'Rajajinagar Ind Area', 'Bengaluru Urban', 13.0044, 77.5445],
  ['560022', 'Yeshwanthpur', 'Bengaluru Urban', 13.028, 77.548],
  ['560024', 'RT Nagar', 'Bengaluru Urban', 13.023, 77.593],
  ['560029', 'BTM Layout 1st Stage', 'Bengaluru Urban', 12.9152, 77.6101],
  ['560034', 'Koramangala 4th Block', 'Bengaluru Urban', 12.9352, 77.6244],
  ['560037', 'Marathahalli Outer Ring Rd', 'Bengaluru Urban', 12.9565, 77.7],
  ['560038', 'Indiranagar 2nd Stage', 'Bengaluru Urban', 12.9716, 77.6412],
  ['560041', 'Jayanagar 9th Block', 'Bengaluru Urban', 12.9226, 77.5929],
  ['560043', 'HRBR Layout', 'Bengaluru Urban', 13.0167, 77.6428],
  ['560048', 'Whitefield Main Road', 'Bengaluru Urban', 12.9698, 77.7499],
  ['560058', 'Peenya Industrial Area', 'Bengaluru Urban', 13.0344, 77.5196],
  ['560066', 'Whitefield EPIP', 'Bengaluru Urban', 12.9855, 77.7338],
  ['560068', 'Bommanahalli', 'Bengaluru Urban', 12.9041, 77.6186],
  ['560076', 'BTM Layout 2nd Stage', 'Bengaluru Urban', 12.9175, 77.6072],
  ['560085', 'Banashankari 3rd Stage', 'Bengaluru Urban', 12.9244, 77.555],
  ['560095', 'Koramangala 6th Block', 'Bengaluru Urban', 12.9312, 77.6337],
  ['560097', 'Hegde Nagar / Manyata Tech Park', 'Bengaluru Urban', 13.049, 77.622],
  ['560100', 'Electronic City Phase 1', 'Bengaluru Urban', 12.8452, 77.6602],
  ['560102', 'HSR Layout Sector 2', 'Bengaluru Urban', 12.9081, 77.6476],
  ['560103', 'Bellandur / Sarjapur Rd', 'Bengaluru Urban', 12.9336, 77.6789],
  ['560076', 'BTM 2nd Stage duplicate', 'Bengaluru Urban', 12.9175, 77.6072],
]

// de-dupe by pincode code (the '560076' appears twice in the sample list)
const seenPincode = new Set<string>()
const BASE = BENGALURU_PINCODES.filter(p => {
  if (seenPincode.has(p[0])) return false
  seenPincode.add(p[0])
  return true
})

const OPERATORS = ['BESCOM', 'Tata Power', 'ChargeZone', 'Statiq', 'Ather Grid', 'BPCL-MOB', 'Jio-bp pulse']

export function generatePincodes(): Pincode[] {
  return BASE.map(([code, area, district, lat, lng]) => {
    const isTechArea = /tech|electronic city|whitefield|manyata|it park|hsr|koramangala/i.test(area)
    const isIndustrial = /ind|peenya/i.test(area)
    const population = faker.number.int({ min: isTechArea ? 40000 : 20000, max: isTechArea ? 90000 : 55000 })
    const evAdoptionIndex = isTechArea
      ? faker.number.float({ min: 0.55, max: 0.9, fractionDigits: 2 })
      : isIndustrial
      ? faker.number.float({ min: 0.15, max: 0.35, fractionDigits: 2 })
      : faker.number.float({ min: 0.3, max: 0.7, fractionDigits: 2 })
    const peakDemandMW = Math.round(population / 1000 * (isTechArea ? 1.6 : 1.1))
    const availableCapacityMW = Math.round(peakDemandMW * faker.number.float({ min: 0.15, max: 0.35, fractionDigits: 2 }))

    return {
      pincode: code,
      area,
      district,
      lat: lat + faker.number.float({ min: -0.002, max: 0.002, fractionDigits: 4 }),
      lng: lng + faker.number.float({ min: -0.002, max: 0.002, fractionDigits: 4 }),
      population,
      evAdoptionIndex,
      peakDemandMW,
      availableCapacityMW,
    }
  })
}

export function generateStations(pincodes: Pincode[]): Station[] {
  const stations: Station[] = []
  const NUM_STATIONS = 40

  for (let i = 0; i < NUM_STATIONS; i++) {
    const idx = faker.number.int({ min: 0, max: pincodes.length - 1 })
    const pin = pincodes[idx]
    const operator = faker.helpers.arrayElement(OPERATORS)
    const categories: Array<{ cat: string; types: string[]; ports: number }> = [
      { cat: 'IT_PARK', types: ['DC_FAST_50KW', 'AC_002'], ports: 6 },
      { cat: 'MALL', types: ['DC_FAST_25KW', 'AC_002'], ports: 4 },
      { cat: 'HIGHWAY_EXIT', types: ['DC_ULTRA_150KW', 'DC_FAST_50KW'], ports: 4 },
      { cat: 'COMMERCIAL', types: ['AC_002', 'AC_001'], ports: 4 },
      { cat: 'RESIDENTIAL', types: ['AC_001'], ports: 2 },
    ]
    const pick = faker.helpers.arrayElement(categories)

    stations.push({
      pincodeIdx: idx,
      name: `${operator} ${pin.area.split(/[,\/]/)[0].trim()}`,
      operator,
      chargerTypes: JSON.stringify(pick.types),
      portCount: pick.ports,
      lat: pin.lat + faker.number.float({ min: -0.008, max: 0.008, fractionDigits: 5 }),
      lng: pin.lng + faker.number.float({ min: -0.008, max: 0.008, fractionDigits: 5 }),
      category: pick.cat,
      dailyUtilization: faker.number.float({ min: 0.12, max: 0.58, fractionDigits: 2 }),
      dailyEnergyKwh: faker.number.float({ min: 80, max: 420, fractionDigits: 1 }),
    })
  }

  return stations
}

export function generateHotspots(pincodes: Pincode[]): Hotspot[] {
  const hotspots: Hotspot[] = []
  const SOURCES = ['mobility_data', 'ev_registrations', 'parking_lot_density', 'commute_pattern']

  // Bias hotspots toward tech/commercial areas — those get 60% of the 60 hotspots
  const techPincodes = pincodes.filter(p =>
    /tech|electronic city|whitefield|manyata|it park|hsr|koramangala|indiranagar/i.test(p.area),
  )
  const otherPincodes = pincodes.filter(p => !techPincodes.includes(p))

  for (let i = 0; i < 36; i++) {
    const pin = faker.helpers.arrayElement(techPincodes.length ? techPincodes : pincodes)
    hotspots.push({
      lat: pin.lat + faker.number.float({ min: -0.012, max: 0.012, fractionDigits: 5 }),
      lng: pin.lng + faker.number.float({ min: -0.012, max: 0.012, fractionDigits: 5 }),
      demandScore: faker.number.float({ min: 0.55, max: 0.98, fractionDigits: 2 }),
      source: faker.helpers.arrayElement(SOURCES),
      notes: `High EV commute density near ${pin.area}`,
    })
  }
  for (let i = 0; i < 24; i++) {
    const pin = faker.helpers.arrayElement(otherPincodes.length ? otherPincodes : pincodes)
    hotspots.push({
      lat: pin.lat + faker.number.float({ min: -0.02, max: 0.02, fractionDigits: 5 }),
      lng: pin.lng + faker.number.float({ min: -0.02, max: 0.02, fractionDigits: 5 }),
      demandScore: faker.number.float({ min: 0.2, max: 0.55, fractionDigits: 2 }),
      source: faker.helpers.arrayElement(SOURCES),
      notes: `Emerging demand at ${pin.area}`,
    })
  }

  return hotspots
}
