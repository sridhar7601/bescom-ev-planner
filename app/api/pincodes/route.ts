import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const district = searchParams.get('district')
  const minEvAdoption = parseFloat(searchParams.get('minEvAdoption') ?? '0')

  const where: Record<string, unknown> = {}
  if (district) where.district = district
  if (minEvAdoption > 0) where.evAdoptionIndex = { gte: minEvAdoption }

  const pincodes = await prisma.pincode.findMany({
    where,
    orderBy: { pincode: 'asc' },
    include: { _count: { select: { existingChargers: true, proposals: true } } },
  })

  return NextResponse.json({ total: pincodes.length, pincodes })
}
