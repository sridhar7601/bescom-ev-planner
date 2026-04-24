import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const pincode = await prisma.pincode.findFirst({
    where: { OR: [{ id }, { pincode: id }] },
    include: {
      existingChargers: true,
      proposals: { orderBy: { siteScore: 'desc' } },
    },
  })

  if (!pincode) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(pincode)
}
