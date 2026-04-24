import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const hotspots = await prisma.demandHotspot.findMany()
  return NextResponse.json({ total: hotspots.length, hotspots })
}
