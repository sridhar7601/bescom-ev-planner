import Link from "next/link";
import { AreaChart, BarChart } from "@tremor/react";
import { prisma } from "@/lib/db";
import { forecastHourlyDemand, aggregateHourly } from "@/lib/demand-forecast";
import { optimizeSchedule } from "@/lib/scheduler";
import { explainScheduling } from "@/lib/llm-narration";
import { AlertTriangle, Clock, IndianRupee, Activity, Sparkles } from "lucide-react";

export default async function SchedulingPage() {
  const pincodes = await prisma.pincode.findMany({ orderBy: { evAdoptionIndex: "desc" } });

  // Build per-pincode forecasts + schedule recommendations
  const perPincode = pincodes.map((p) => {
    const forecast = forecastHourlyDemand({
      pincode: p.pincode,
      area: p.area,
      population: p.population,
      evAdoptionIndex: p.evAdoptionIndex,
      peakDemandMW: p.peakDemandMW,
      availableCapacityMW: p.availableCapacityMW,
    });
    const schedule = optimizeSchedule(forecast);
    return { ...p, forecast, schedule };
  });

  // Fleet aggregate (un-managed)
  const fleetForecast = aggregateHourly(perPincode.map((x) => x.forecast));
  // Fleet aggregate (shifted)
  const fleetShifted = aggregateHourly(perPincode.map((x) => x.schedule.shiftedCurve));

  const fleetUnmanagedPeak = fleetForecast.reduce((a, b) => (b.totalLoadMW > a.totalLoadMW ? b : a));
  const fleetShiftedPeak = fleetShifted.reduce((a, b) => (b.totalLoadMW > a.totalLoadMW ? b : a));

  const totalShiftableMW = perPincode.reduce((s, x) => s + x.schedule.shiftableMW, 0);
  const totalSavings = perPincode.reduce((s, x) => s + x.schedule.costSavingsInrPerDay, 0);
  const pincodesAtRisk = perPincode.filter((x) => x.schedule.unmanagedPeakUtilizationPct > 80).length;
  const pincodesRescued = perPincode.filter((x) => x.schedule.feederStressAvoided).length;

  // Top 5 highest-stress pincodes
  const topStress = [...perPincode]
    .sort((a, b) => b.schedule.unmanagedPeakUtilizationPct - a.schedule.unmanagedPeakUtilizationPct)
    .slice(0, 5);

  const explanations = await Promise.all(
    topStress.map((p) =>
      explainScheduling({
        pincode: p.pincode,
        area: p.area,
        unmanagedPeakHour: p.schedule.unmanagedPeakHour,
        unmanagedPeakUtilizationPct: p.schedule.unmanagedPeakUtilizationPct,
        shiftedPeakUtilizationPct: p.schedule.shiftedPeakUtilizationPct,
        shiftableMW: p.schedule.shiftableMW,
        costSavingsInrPerDay: p.schedule.costSavingsInrPerDay,
        feederStressAvoided: p.schedule.feederStressAvoided,
      }),
    ),
  );

  const fleetChartData = fleetForecast.map((p, i) => ({
    hour: `${String(p.hour).padStart(2, "0")}:00`,
    "Unmanaged demand": Number(p.totalLoadMW.toFixed(2)),
    "Shifted demand": Number(fleetShifted[i].totalLoadMW.toFixed(2)),
    "Capacity": Number(p.capacityMW.toFixed(2)),
  }));

  const evOnlyData = fleetForecast.map((p, i) => ({
    hour: `${String(p.hour).padStart(2, "0")}:00`,
    "Unmanaged EV charging": Number(p.demandMW.toFixed(2)),
    "Shifted EV charging": Number(fleetShifted[i].demandMW.toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">EV Demand Forecast & Peak-Shift Scheduling</h1>
        <p className="text-slate-500 mt-1">
          Part A: Predict charging demand by time + location, recommend peak-load reduction.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Clock size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Fleet peak hour</div>
              <div className="text-2xl font-bold text-slate-900">{String(fleetUnmanagedPeak.hour).padStart(2, "0")}:00</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2">{fleetUnmanagedPeak.utilizationPct.toFixed(0)}% utilisation</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-700">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Pincodes at risk</div>
              <div className="text-2xl font-bold text-slate-900">{pincodesAtRisk}</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2">{pincodesRescued} rescued by shift</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-lime-50 text-lime-700">
              <Activity size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Shiftable load</div>
              <div className="text-2xl font-bold text-slate-900">{totalShiftableMW.toFixed(1)} MW</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2">peak → off-peak (23:00–05:00)</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <IndianRupee size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Daily savings</div>
              <div className="text-2xl font-bold text-slate-900">₹{(totalSavings / 1000).toFixed(0)}k</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2">vs unmanaged ToU peak tariff</div>
        </div>
      </div>

      {/* Fleet chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-900">Fleet load curve — unmanaged vs shifted</h2>
            <p className="text-xs text-slate-500 mt-1">
              Aggregate of {pincodes.length} Bengaluru pincodes. Shift moves {totalShiftableMW.toFixed(1)} MW
              of flexible EV charging out of evening peak into overnight off-peak.
            </p>
          </div>
        </div>
        <AreaChart
          className="h-72"
          data={fleetChartData}
          index="hour"
          categories={["Unmanaged demand", "Shifted demand", "Capacity"]}
          colors={["red", "lime", "slate"]}
          yAxisWidth={48}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">EV-only charging demand — peak-shift effect</h2>
        </div>
        <BarChart
          className="h-64"
          data={evOnlyData}
          index="hour"
          categories={["Unmanaged EV charging", "Shifted EV charging"]}
          colors={["red", "lime"]}
          yAxisWidth={48}
        />
      </div>

      {/* Top stressed pincodes with AI explanations */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-900">AI Recommendations — top 5 stressed pincodes</h2>
          <span className="ml-2 text-[10px] uppercase tracking-wider rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 font-semibold">Azure GPT-4.1</span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Each row shows where the unmanaged EV peak risks feeder overload, and the recommended shift.
        </p>
        <div className="space-y-3">
          {topStress.map((p, i) => (
            <div key={p.id} className="rounded-lg border border-slate-100 p-4 hover:bg-slate-50">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <Link href={`/pincodes/${p.id}`} className="font-semibold text-slate-900 hover:text-lime-700">
                    {p.area}
                  </Link>
                  <span className="ml-2 text-xs text-slate-500">{p.pincode}</span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Unmanaged peak</div>
                    <div className={`text-sm font-bold ${p.schedule.unmanagedPeakUtilizationPct > 80 ? "text-red-600" : "text-amber-600"}`}>
                      {p.schedule.unmanagedPeakUtilizationPct.toFixed(0)}% @ {String(p.schedule.unmanagedPeakHour).padStart(2, "0")}:00
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">After shift</div>
                    <div className="text-sm font-bold text-emerald-600">
                      {p.schedule.shiftedPeakUtilizationPct.toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Saving</div>
                    <div className="text-sm font-bold text-slate-700">₹{p.schedule.costSavingsInrPerDay.toLocaleString("en-IN")}/day</div>
                  </div>
                </div>
              </div>
              <div className="rounded-md bg-indigo-50 border border-indigo-100 px-3 py-2">
                <p className="text-sm text-slate-700">{explanations[i]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-600">
        <strong className="text-slate-900">Methodology:</strong> Hourly demand forecast uses area-type signature
        (residential / IT-park / commercial / transport-hub) × population × adoption index. Flexibility model:
        40% of evening EV charging is overnight-shiftable (residential AC charging at home). Off-peak window:
        23:00–05:00. Tariff differential: ₹8.50/kWh peak vs ₹4.50/kWh off-peak (BESCOM ToU). Real BESCOM
        deployment swaps signatures with smart-meter telemetry; the forecast and scheduler logic stay identical.
      </div>
    </div>
  );
}
