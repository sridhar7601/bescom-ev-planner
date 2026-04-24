import Link from 'next/link'
import { prisma } from '@/lib/db'
import { formatInr } from '@/lib/utils'
import { Zap, MapPin, Plug, TrendingUp } from 'lucide-react'

export default async function Dashboard() {
  const [pincodeCount, stationCount, proposals] = await Promise.all([
    prisma.pincode.count(),
    prisma.chargingStation.count(),
    prisma.chargerProposal.findMany({
      orderBy: { siteScore: 'desc' },
      include: { pincode: { select: { pincode: true, area: true } } },
      take: 6,
    }),
  ])

  const allProposals = await prisma.chargerProposal.findMany()
  const totalRevenueYr1 = allProposals.reduce((sum, p) => sum + p.estimatedRevenueInrPerMonth * 12, 0)
  const statusCounts: Record<string, number> = {}
  for (const p of allProposals) statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1

  const metrics = [
    { label: 'Pincodes Analyzed', value: pincodeCount.toString(), icon: MapPin, color: 'bg-slate-100 text-slate-700' },
    { label: 'Existing Chargers', value: stationCount.toString(), icon: Plug, color: 'bg-blue-50 text-blue-700' },
    { label: 'Active Proposals', value: allProposals.length.toString(), icon: Zap, color: 'bg-lime-50 text-lime-700' },
    { label: 'Revenue Yr 1', value: formatInr(totalRevenueYr1), icon: TrendingUp, color: 'bg-emerald-50 text-emerald-700' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operational Dashboard</h1>
          <p className="text-slate-500 mt-1">BESCOM EV charging infrastructure planning</p>
        </div>
        <Link
          href="/plan/new"
          className="px-4 py-2.5 bg-lime-500 text-white rounded-lg text-sm font-medium hover:bg-lime-600 flex items-center gap-2"
        >
          <Zap size={16} />
          Generate Plan
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {metrics.map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${m.color}`}>
                <m.icon size={18} />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">{m.label}</div>
                <div className="text-2xl font-bold text-slate-900">{m.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Top Proposals by Site Score</h2>
            <Link href="/proposals" className="text-sm text-lime-700 hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {proposals.map(p => (
              <Link
                key={p.id}
                href={`/proposals/${p.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-900 truncate">
                    {p.pincode.area} ({p.pincode.pincode})
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {p.category.replace(/_/g, ' ')} · {p.recommendedPorts} ports · {formatInr(p.estimatedRevenueInrPerMonth)}/mo
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Score</div>
                    <div className="font-bold text-lg text-lime-600">{(p.siteScore * 100).toFixed(0)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Payback</div>
                    <div className="font-medium text-sm text-slate-700">{p.paybackMonths}mo</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Proposal Status</h2>
          <div className="space-y-3">
            {['PROPOSED', 'SHORTLISTED', 'APPROVED', 'DEPLOYED', 'REJECTED'].map(s => {
              const count = statusCounts[s] ?? 0
              const pct = allProposals.length ? (count / allProposals.length) * 100 : 0
              return (
                <div key={s}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{s}</span>
                    <span className="text-sm text-slate-500">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-lime-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Interactive Map</h2>
          <Link href="/map" className="text-sm text-lime-700 hover:underline">Open full map →</Link>
        </div>
        <div className="h-64 bg-gradient-to-br from-slate-50 to-lime-50 rounded-lg border border-slate-200 flex items-center justify-center">
          <div className="text-center">
            <MapPin size={40} className="mx-auto text-lime-500 mb-2" />
            <p className="text-sm font-medium text-slate-700">Leaflet map with pincodes, hotspots, chargers, proposals</p>
            <Link
              href="/map"
              className="inline-block mt-3 px-4 py-2 bg-lime-500 text-white rounded-lg text-sm font-medium hover:bg-lime-600"
            >
              Open Map
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
