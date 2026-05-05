import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { formatInr, statusColor, categoryLabel } from '@/lib/utils'
import { explainProposalAI } from '@/lib/llm-narration'
import { fiveYearCumulativeRevenue } from '@/lib/roi'
import { CHARGER_COSTS_INR } from '@/lib/types'
import type { ChargerType } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'
import StatusActions from './StatusActions'

export default async function ProposalDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await prisma.chargerProposal.findUnique({
    where: { id },
    include: { pincode: true },
  })
  if (!p) notFound()

  const types = JSON.parse(p.recommendedTypes) as ChargerType[]
  const capex = types.reduce((sum, t) => sum + CHARGER_COSTS_INR[t], 0) * p.recommendedPorts
  const cumRevenue = fiveYearCumulativeRevenue(p.estimatedRevenueInrPerMonth)
  const breakEvenMonth = cumRevenue.findIndex(v => v >= capex) + 1

  const aiRationale = await explainProposalAI({
    proposalId: p.id,
    area: p.pincode.area,
    category: p.category,
    composite: p.siteScore,
    demand: p.demandScore,
    capacity: p.capacityScore,
    accessibility: p.accessibilityScore,
    competition: p.competitionScore,
    paybackMonths: p.paybackMonths,
    feederImpactPct: p.feederImpactPct,
    monthlyRevenueInr: p.estimatedRevenueInrPerMonth,
  })

  const components: Array<{ label: string; value: number; color: string }> = [
    { label: 'Demand', value: p.demandScore, color: 'bg-orange-400' },
    { label: 'Capacity', value: p.capacityScore, color: 'bg-emerald-400' },
    { label: 'Accessibility', value: p.accessibilityScore, color: 'bg-sky-400' },
    { label: 'Competition', value: p.competitionScore, color: 'bg-purple-400' },
  ]

  return (
    <div>
      <Link href="/proposals" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-lime-700 mb-4">
        <ArrowLeft size={16} /> Back to Proposals
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{p.pincode.area}</h1>
            <p className="text-slate-500 mt-1">
              {p.pincode.pincode} · {p.pincode.district} · {categoryLabel(p.category)}
            </p>
            <div className="mt-3 max-w-2xl rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider rounded-full bg-indigo-600 text-white px-2 py-0.5 font-bold">Azure GPT-4.1</span>
                <span className="text-[10px] uppercase tracking-wider text-indigo-700 font-semibold">AI Rationale</span>
              </div>
              <p className="text-sm text-slate-700">{aiRationale}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(p.status)}`}>
              {p.status}
            </span>
            <StatusActions proposalId={p.id} currentStatus={p.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card label="Site Score" value={`${(p.siteScore * 100).toFixed(0)}%`} sub="Composite" big />
        <Card label="CAPEX" value={formatInr(capex)} sub={`${p.recommendedPorts} ports`} />
        <Card label="Payback" value={`${p.paybackMonths} mo`} sub={breakEvenMonth > 0 ? `Break-even m${breakEvenMonth}` : 'Long payback'} />
        <Card label="Feeder Load" value={`${p.feederImpactPct.toFixed(1)}%`} sub={p.feederCode ?? 'Feeder'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Scoring Breakdown</h2>
          <div className="space-y-4">
            {components.map(c => (
              <div key={c.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{c.label}</span>
                  <span className="text-sm text-slate-500">{(c.value * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${c.color}`} style={{ width: `${c.value * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
            Weights: Demand 35% · Capacity 25% · Accessibility 20% · Competition 20%
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">5-Year ROI Projection</h2>
          <div className="text-xs text-slate-500 mb-2">Cumulative revenue vs. CAPEX break-even</div>
          <div className="h-48 flex items-end gap-1">
            {[0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60].map(m => {
              const rev = m === 0 ? 0 : cumRevenue[m - 1]
              const pct = Math.min(100, (rev / (capex * 3)) * 100)
              const past = rev >= capex
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-full rounded-t transition-all ${past ? 'bg-emerald-400' : 'bg-slate-300'}`} style={{ height: `${pct}%`, minHeight: '2px' }} />
                  <div className="text-xs text-slate-400">{m}m</div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
            <div><span className="text-slate-500">Monthly revenue: </span><span className="font-medium">{formatInr(p.estimatedRevenueInrPerMonth)}</span></div>
            <div><span className="text-slate-500">Break-even: </span><span className="font-medium">{breakEvenMonth > 0 ? `Month ${breakEvenMonth}` : 'beyond 5yr'}</span></div>
            <div><span className="text-slate-500">Daily kWh: </span><span className="font-medium">{p.estimatedDailyKwh}</span></div>
            <div><span className="text-slate-500">5-yr revenue: </span><span className="font-medium">{formatInr(cumRevenue[59])}</span></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Scoring Rationale</h2>
        <p className="text-sm text-slate-700 leading-relaxed">{p.rationale}</p>
        <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500">
          Recommended chargers: {types.join(' + ')} · {p.recommendedPorts} ports · feeder {p.feederCode}
        </div>
      </div>
    </div>
  )
}

function Card({ label, value, sub, big }: { label: string; value: string; sub?: string; big?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</div>
      <div className={`font-bold text-slate-900 mt-1 ${big ? 'text-3xl text-lime-600' : 'text-xl'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}
