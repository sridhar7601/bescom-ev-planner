import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { generatePincodes, generateStations, generateHotspots } from './generate-mock-data'
import { optimize } from '../lib/optimizer'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding ChargeSense AI demo data...')

  // Clear in FK-safe order
  await prisma.chargerProposal.deleteMany()
  await prisma.chargingStation.deleteMany()
  await prisma.demandHotspot.deleteMany()
  await prisma.pincode.deleteMany()

  // Pincodes
  const pincodeRows = generatePincodes()
  const createdPincodes = []
  for (const p of pincodeRows) {
    createdPincodes.push(
      await prisma.pincode.create({ data: p }),
    )
  }
  console.log(`  ✓ ${createdPincodes.length} pincodes`)

  // Existing stations
  const stationRows = generateStations(pincodeRows)
  for (const s of stationRows) {
    await prisma.chargingStation.create({
      data: {
        pincodeId: createdPincodes[s.pincodeIdx].id,
        name: s.name,
        operator: s.operator,
        chargerTypes: s.chargerTypes,
        portCount: s.portCount,
        lat: s.lat,
        lng: s.lng,
        category: s.category,
        dailyUtilization: s.dailyUtilization,
        dailyEnergyKwh: s.dailyEnergyKwh,
      },
    })
  }
  console.log(`  ✓ ${stationRows.length} existing charging stations`)

  // Hotspots
  const hotspotRows = generateHotspots(pincodeRows)
  for (const h of hotspotRows) {
    await prisma.demandHotspot.create({ data: h })
  }
  console.log(`  ✓ ${hotspotRows.length} demand hotspots`)

  // Run optimizer once with default params
  const allPincodes = await prisma.pincode.findMany()
  const allHotspots = await prisma.demandHotspot.findMany()
  const allStations = await prisma.chargingStation.findMany()

  const result = optimize(
    { budgetInr: 50_000_000, minPaybackMonths: 6, targetCount: 15 },
    allPincodes,
    allHotspots,
    allStations,
  )

  // Status variety for the demo
  const statuses = [
    ...Array(8).fill('PROPOSED'),
    ...Array(3).fill('SHORTLISTED'),
    ...Array(2).fill('APPROVED'),
    ...Array(2).fill('DEPLOYED'),
  ]

  for (let i = 0; i < result.proposals.length; i++) {
    const p = result.proposals[i]
    await prisma.chargerProposal.create({
      data: {
        pincodeId: p.pincodeId,
        proposedLat: p.proposedLat,
        proposedLng: p.proposedLng,
        category: p.category,
        recommendedTypes: JSON.stringify(p.recommendedTypes),
        recommendedPorts: p.recommendedPorts,
        siteScore: p.siteScore,
        demandScore: p.demandScore,
        capacityScore: p.capacityScore,
        accessibilityScore: p.accessibilityScore,
        competitionScore: p.competitionScore,
        feederImpactPct: p.feederImpactPct,
        feederCode: p.feederCode,
        estimatedDailyKwh: p.estimatedDailyKwh,
        estimatedRevenueInrPerMonth: p.estimatedRevenueInrPerMonth,
        paybackMonths: p.paybackMonths,
        rationale: p.rationale,
        status: statuses[i] ?? 'PROPOSED',
      },
    })
  }
  console.log(`  ✓ ${result.proposals.length} charger proposals (total CAPEX ₹${(result.totalInvestment / 10_000_000).toFixed(2)} Cr)`)

  console.log('\n✅ Demo seeded. Start with: npm run dev → http://localhost:3000')
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
