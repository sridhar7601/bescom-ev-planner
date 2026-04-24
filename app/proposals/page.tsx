import Link from 'next/link'
import { prisma } from '@/lib/db'
import { formatInr, statusColor, categoryLabel } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

export default async function ProposalsList({ searchParams }: { searchParams: Promise<{ status?: string; district?: string }> }) {
  const params = await searchParams
  const proposals = await prisma.chargerProposal.findMany({
    where: {
      ...(params.status ? { status: params.status } : {}),
      ...(params.district ? { pincode: { district: params.district } } : {}),
    },
    orderBy: { siteScore: 'desc' },
    include: { pincode: { select: { pincode: true, area: true, district: true } } },
  })

  const statuses = ['', 'PROPOSED', 'SHORTLISTED', 'APPROVED', 'DEPLOYED', 'REJECTED']

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Charger Proposals</h1>
        <p className="text-slate-500 mt-1">{proposals.length} proposals ranked by composite site score</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {statuses.map(s => {
          const active = (params.status ?? '') === s
          return (
            <Link
              key={s || 'all'}
              href={s ? `/proposals?status=${s}` : '/proposals'}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${active ? 'bg-lime-500 text-white border-lime-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {s || 'All'}
            </Link>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Ports</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3 text-right">Feeder %</th>
              <th className="px-4 py-3 text-right">Revenue/mo</th>
              <th className="px-4 py-3 text-right">Payback</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proposals.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{p.pincode.area}</div>
                  <div className="text-xs text-slate-500">{p.pincode.pincode} · {p.pincode.district}</div>
                </td>
                <td className="px-4 py-3 text-slate-700">{categoryLabel(p.category)}</td>
                <td className="px-4 py-3 text-right font-mono">{p.recommendedPorts}</td>
                <td className="px-4 py-3 text-right">
                  <span className="font-bold text-lime-700">{(p.siteScore * 100).toFixed(0)}%</span>
                </td>
                <td className="px-4 py-3 text-right text-slate-700">{p.feederImpactPct.toFixed(1)}%</td>
                <td className="px-4 py-3 text-right text-slate-700">{formatInr(p.estimatedRevenueInrPerMonth)}</td>
                <td className="px-4 py-3 text-right text-slate-700">{p.paybackMonths}mo</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(p.status)}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/proposals/${p.id}`} className="text-lime-700 hover:underline text-sm flex items-center gap-1">
                    Open <ArrowRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {proposals.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No proposals match this filter.</div>}
      </div>
    </div>
  )
}
