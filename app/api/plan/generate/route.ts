import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { optimize } from '@/lib/optimizer'

export async function POST(req: Request) {
  const body = await req.json()
  const {
    budgetInr = 50_000_000,
    minPaybackMonths = 6,
    targetCount = 15,
    focusDistrict,
    replaceExisting = true,
  } = body as {
    budgetInr?: number
    minPaybackMonths?: number
    targetCount?: number
    focusDistrict?: string
    replaceExisting?: boolean
  }

  const pincodes = await prisma.pincode.findMany()
  const hotspots = await prisma.demandHotspot.findMany()
  const stations = await prisma.chargingStation.findMany()

  const result = optimize(
    { budgetInr, minPaybackMonths, targetCount, focusDistrict },
    pincodes,
    hotspots,
    stations,
  )

  if (replaceExisting) await prisma.chargerProposal.deleteMany()

  const created = []
  for (const p of result.proposals) {
    created.push(
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
          status: 'PROPOSED',
        },
      }),
    )
  }

  return NextResponse.json({
    totalInvestment: result.totalInvestment,
    totalRevenueYr1Inr: result.totalRevenueYr1Inr,
    totalPincodesCovered: result.totalPincodesCovered,
    proposals: created,
  })
}
