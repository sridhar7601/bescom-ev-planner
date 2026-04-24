import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { formatInr, categoryLabel, statusColor } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export default async function PincodeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pincode = await prisma.pincode.findFirst({
    where: { OR: [{ id }, { pincode: id }] },
    include: {
      existingChargers: true,
      proposals: { orderBy: { siteScore: 'desc' } },
    },
  })
  if (!pincode) notFound()

  return (
    <div>
      <Link href="/map" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-lime-700 mb-4">
        <ArrowLeft size={16} /> Back to Map
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{pincode.area}</h1>
        <p className="text-slate-500 mt-1">Pincode {pincode.pincode} · {pincode.district}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Stat label="Population" value={pincode.population.toLocaleString('en-IN')} />
          <Stat label="EV Adoption Index" value={`${(pincode.evAdoptionIndex * 100).toFixed(0)}%`} big />
          <Stat label="Peak Demand" value={`${pincode.peakDemandMW} MW`} />
          <Stat label="Capacity Headroom" value={`${pincode.availableCapacityMW} MW`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Existing Chargers ({pincode.existingChargers.length})</h2>
          {pincode.existingChargers.length === 0 ? (
            <div className="text-sm text-slate-500">No existing chargers in this pincode.</div>
          ) : (
            <div className="space-y-2">
              {pincode.existingChargers.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                  <div>
                    <div className="font-medium text-sm text-slate-900">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.operator} · {s.portCount} ports · {categoryLabel(s.category)}</div>
                  </div>
                  <div className="text-xs text-slate-500">{(s.dailyUtilization * 100).toFixed(0)}% util</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Proposed Sites ({pincode.proposals.length})</h2>
          {pincode.proposals.length === 0 ? (
            <div className="text-sm text-slate-500">No proposals generated for this pincode yet.</div>
          ) : (
            <div className="space-y-2">
              {pincode.proposals.map(p => (
                <Link key={p.id} href={`/proposals/${p.id}`} className="block p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-slate-900">{categoryLabel(p.category)} · {p.recommendedPorts} ports</div>
                      <div className="text-xs text-slate-500 mt-0.5">{formatInr(p.estimatedRevenueInrPerMonth)}/mo · {p.paybackMonths}mo payback</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(p.status)}`}>{p.status}</span>
                      <span className="font-bold text-lime-600">{(p.siteScore * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</div>
      <div className={`font-bold text-slate-900 mt-1 ${big ? 'text-2xl text-lime-600' : 'text-xl'}`}>{value}</div>
    </div>
  )
}
