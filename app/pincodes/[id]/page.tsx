import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AreaChart } from '@tremor/react'
import { prisma } from '@/lib/db'
import { formatInr, categoryLabel, statusColor } from '@/lib/utils'
import { ArrowLeft, AlertTriangle, Sparkles, Route } from 'lucide-react'
import { forecastHourlyDemand } from '@/lib/demand-forecast'
import { optimizeSchedule } from '@/lib/scheduler'
import { classifyCorridor } from '@/lib/corridors'
import { explainScheduling } from '@/lib/llm-narration'

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

  // Part A drill-down: hourly forecast + schedule for THIS pincode
  const forecast = forecastHourlyDemand({
    pincode: pincode.pincode,
    area: pincode.area,
    population: pincode.population,
    evAdoptionIndex: pincode.evAdoptionIndex,
    peakDemandMW: pincode.peakDemandMW,
    availableCapacityMW: pincode.availableCapacityMW,
  })
  const schedule = optimizeSchedule(forecast)
  const corridor = classifyCorridor(pincode.area)

  const aiAdvice = await explainScheduling({
    pincode: pincode.pincode,
    area: pincode.area,
    unmanagedPeakHour: schedule.unmanagedPeakHour,
    unmanagedPeakUtilizationPct: schedule.unmanagedPeakUtilizationPct,
    shiftedPeakUtilizationPct: schedule.shiftedPeakUtilizationPct,
    shiftableMW: schedule.shiftableMW,
    costSavingsInrPerDay: schedule.costSavingsInrPerDay,
    feederStressAvoided: schedule.feederStressAvoided,
  })

  const chartData = forecast.map((p, i) => ({
    hour: `${String(p.hour).padStart(2, '0')}:00`,
    'Unmanaged demand': Number(p.totalLoadMW.toFixed(2)),
    'Shifted demand': Number(schedule.shiftedCurve[i].totalLoadMW.toFixed(2)),
    'Capacity': Number(p.capacityMW.toFixed(2)),
  }))

  const peakStress = schedule.unmanagedPeakUtilizationPct > 80
  const peakColorBg = peakStress ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'

  return (
    <div>
      <Link href="/scheduling" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-lime-700 mb-4">
        <ArrowLeft size={16} /> Back to Scheduling
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{pincode.area}</h1>
            <p className="text-slate-500 mt-1">Pincode {pincode.pincode} · {pincode.district}</p>
            {corridor && (
              <Link
                href={`/scheduling#${corridor.id}`}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-lime-700 bg-lime-50 px-2 py-1 rounded-full hover:bg-lime-100"
              >
                <Route size={12} /> {corridor.name}
              </Link>
            )}
          </div>
          {peakStress && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
              <AlertTriangle size={12} /> AT-RISK FEEDER
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Stat label="Population" value={pincode.population.toLocaleString('en-IN')} />
          <Stat label="EV Adoption" value={`${(pincode.evAdoptionIndex * 100).toFixed(0)}%`} big />
          <Stat label="Peak Demand" value={`${pincode.peakDemandMW} MW`} />
          <Stat label="Feeder Headroom" value={`${pincode.availableCapacityMW} MW`} />
        </div>
      </div>

      {/* Part A — Hourly demand + peak-shift */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">24-hour demand forecast & peak-shift</h2>
          <span className="text-[10px] uppercase tracking-wider rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 font-medium">
            Part A
          </span>
        </div>
        <AreaChart
          className="h-64"
          data={chartData}
          index="hour"
          categories={['Unmanaged demand', 'Shifted demand', 'Capacity']}
          colors={['red', 'lime', 'slate']}
          yAxisWidth={48}
        />

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={`rounded-lg border ${peakColorBg} px-4 py-3`}>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Unmanaged peak</div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {schedule.unmanagedPeakUtilizationPct.toFixed(0)}% @ {String(schedule.unmanagedPeakHour).padStart(2, '0')}:00
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              {peakStress ? 'Feeder stress risk' : 'Within safe limits'}
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold">After peak-shift</div>
            <div className="text-lg font-bold text-emerald-900 mt-1">
              {schedule.shiftedPeakUtilizationPct.toFixed(0)}%
            </div>
            <div className="text-xs text-emerald-700 mt-0.5">
              −{schedule.peakReductionPct.toFixed(0)}% peak reduction
            </div>
          </div>
          <div className="rounded-lg border border-lime-200 bg-lime-50 px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-lime-700 font-semibold">Daily ToU savings</div>
            <div className="text-lg font-bold text-lime-900 mt-1">
              ₹{schedule.costSavingsInrPerDay.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-lime-700 mt-0.5">
              Shift {schedule.shiftableMW.toFixed(2)} MW → 23:00–05:00
            </div>
          </div>
        </div>

        {/* AI advice */}
        <div className="mt-4 rounded-md bg-indigo-50 border border-indigo-100 px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={12} className="text-indigo-600" />
            <span className="text-[10px] uppercase tracking-wider text-indigo-700 font-semibold">AI Recommendation</span>
            <span className="text-[10px] uppercase tracking-wider rounded-full bg-indigo-600 text-white px-2 py-0.5 font-bold">Azure GPT-4.1</span>
          </div>
          <p className="text-sm text-slate-700">{aiAdvice}</p>
        </div>
      </div>

      {/* Part B — existing + proposals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Existing Chargers ({pincode.existingChargers.length})</h2>
            <span className="text-[10px] uppercase tracking-wider rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 font-medium">Part B</span>
          </div>
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
