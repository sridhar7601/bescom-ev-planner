import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { explainProposal } from '@/lib/ai'

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const proposal = await prisma.chargerProposal.findUnique({
    where: { id },
    include: { pincode: true },
  })
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const aiRationale = await explainProposal({
    siteScore: {
      demand: proposal.demandScore,
      capacity: proposal.capacityScore,
      accessibility: proposal.accessibilityScore,
      competition: proposal.competitionScore,
      composite: proposal.siteScore,
    },
    paybackMonths: proposal.paybackMonths,
    feederImpactPct: proposal.feederImpactPct,
    locationCategory: proposal.category,
  })

  return NextResponse.json({ ...proposal, aiRationale })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const { status } = body as { status: string }
  if (!['PROPOSED', 'SHORTLISTED', 'APPROVED', 'DEPLOYED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  const updated = await prisma.chargerProposal.update({ where: { id }, data: { status } })
  return NextResponse.json(updated)
}
