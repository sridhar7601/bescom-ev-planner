import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CHARGER_COSTS_INR } from '@/lib/types'
import type { ChargerType } from '@/lib/types'

export async function GET() {
  const [pincodeCount, stationCount, proposals] = await Promise.all([
    prisma.pincode.count(),
    prisma.chargingStation.count(),
    prisma.chargerProposal.findMany(),
  ])

  const byStatus: Record<string, number> = {}
  let totalInvestmentInr = 0
  let totalRevenueYr1Inr = 0
  let avgPayback = 0

  for (const p of proposals) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1
    const types = (JSON.parse(p.recommendedTypes) as ChargerType[]) || []
    const capex = types.reduce((sum, t) => sum + CHARGER_COSTS_INR[t], 0) * p.recommendedPorts
    totalInvestmentInr += capex
    totalRevenueYr1Inr += p.estimatedRevenueInrPerMonth * 12
    avgPayback += p.paybackMonths
  }
  if (proposals.length) avgPayback = avgPayback / proposals.length

  return NextResponse.json({
    pincodeCount,
    stationCount,
    proposalCount: proposals.length,
    byStatus,
    totalInvestmentInr,
    totalRevenueYr1Inr,
    avgPaybackMonths: Math.round(avgPayback * 10) / 10,
  })
}
