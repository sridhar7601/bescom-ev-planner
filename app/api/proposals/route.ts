import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? undefined
  const district = searchParams.get('district') ?? undefined

  const proposals = await prisma.chargerProposal.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(district ? { pincode: { district } } : {}),
    },
    orderBy: { siteScore: 'desc' },
    include: { pincode: { select: { pincode: true, area: true, district: true } } },
  })

  return NextResponse.json({ total: proposals.length, proposals })
}
