import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const operator = searchParams.get('operator') ?? undefined
  const category = searchParams.get('category') ?? undefined

  const stations = await prisma.chargingStation.findMany({
    where: {
      ...(operator ? { operator } : {}),
      ...(category ? { category } : {}),
    },
    include: { pincode: { select: { pincode: true, area: true } } },
  })

  return NextResponse.json({ total: stations.length, stations })
}
