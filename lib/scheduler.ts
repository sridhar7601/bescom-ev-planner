// Peak-shift scheduling optimizer.
// Given an hourly demand forecast, compute how much "flexible" charging load can be
// shifted from peak hours into off-peak windows to reduce feeder stress and operating cost.
// Decision-support only — no automatic control of chargers.

import type { HourlyDemandPoint } from "./demand-forecast";

export interface ScheduleRecommendation {
  unmanagedPeakHour: number;
  unmanagedPeakUtilizationPct: number;
  shiftedPeakHour: number;
  shiftedPeakUtilizationPct: number;
  shiftableMW: number;             // MW moved from peak → off-peak
  peakReductionPct: number;        // % reduction in peak utilization
  costSavingsInrPerDay: number;    // Cost saving from shifting to off-peak tariff
  feederStressAvoided: boolean;    // True if shift kept peak below 80% threshold
  shiftedCurve: HourlyDemandPoint[];
}

const PEAK_TARIFF_INR_PER_KWH = 8.5;   // BESCOM ToU peak tariff
const OFF_PEAK_TARIFF_INR_PER_KWH = 4.5; // ToU off-peak tariff (typical)
const FLEXIBILITY_FRACTION = 0.4;      // 40% of EV charging is "flexible" (overnight chargeable)

/**
 * Optimizes a demand curve by shifting flexible load from peak hours to off-peak.
 * Off-peak window: 23:00 → 05:00 (lowest baseLoad period).
 * Flexible portion: residential overnight charging that can be delayed without UX impact.
 */
export function optimizeSchedule(forecast: HourlyDemandPoint[]): ScheduleRecommendation {
  // 1. Find unmanaged peak hour
  const peakIdx = forecast.reduce((max, p, i) => (p.totalLoadMW > forecast[max].totalLoadMW ? i : max), 0);
  const peak = forecast[peakIdx];

  // 2. Compute total flexible load to shift (40% of charging load during evening peak)
  const flexHours = forecast.filter((p) => p.hour >= 18 && p.hour <= 22);
  const totalFlexEnergy = flexHours.reduce((s, p) => s + p.demandMW * FLEXIBILITY_FRACTION, 0); // MWh per evening

  // 3. Distribute shifted load across off-peak hours (23, 0, 1, 2, 3, 4)
  const offPeakHours = [23, 0, 1, 2, 3, 4];
  const shiftPerHour = totalFlexEnergy / offPeakHours.length;

  // 4. Build the new curve
  const shiftedCurve: HourlyDemandPoint[] = forecast.map((p) => {
    let newDemandMW = p.demandMW;
    if (p.hour >= 18 && p.hour <= 22) {
      newDemandMW -= p.demandMW * FLEXIBILITY_FRACTION;
    } else if (offPeakHours.includes(p.hour)) {
      newDemandMW += shiftPerHour;
    }
    const totalLoadMW = Number((p.baseLoadMW + newDemandMW).toFixed(3));
    const utilizationPct = p.capacityMW > 0 ? Number(((totalLoadMW / p.capacityMW) * 100).toFixed(1)) : 0;
    return {
      ...p,
      demandMW: Number(newDemandMW.toFixed(3)),
      totalLoadMW,
      utilizationPct,
      isPeak: utilizationPct > 80,
      isOffPeak: utilizationPct < 50,
    };
  });

  // 5. New peak after shift
  const newPeakIdx = shiftedCurve.reduce((max, p, i) => (p.totalLoadMW > shiftedCurve[max].totalLoadMW ? i : max), 0);
  const newPeak = shiftedCurve[newPeakIdx];

  // 6. Cost savings: shifted MWh × (peak − off-peak tariff) × 1000 (MW→kW)
  const costSavingsInrPerDay = totalFlexEnergy * 1000 * (PEAK_TARIFF_INR_PER_KWH - OFF_PEAK_TARIFF_INR_PER_KWH);

  return {
    unmanagedPeakHour: peak.hour,
    unmanagedPeakUtilizationPct: peak.utilizationPct,
    shiftedPeakHour: newPeak.hour,
    shiftedPeakUtilizationPct: newPeak.utilizationPct,
    shiftableMW: Number(totalFlexEnergy.toFixed(3)),
    peakReductionPct: Number(((peak.utilizationPct - newPeak.utilizationPct) / peak.utilizationPct * 100).toFixed(1)),
    costSavingsInrPerDay: Number(costSavingsInrPerDay.toFixed(0)),
    feederStressAvoided: peak.utilizationPct > 80 && newPeak.utilizationPct <= 80,
    shiftedCurve,
  };
}

/** Aggregate fleet-level schedule recommendation. */
export interface FleetSchedule {
  totalShiftableMW: number;
  totalCostSavingsInrPerDay: number;
  pincodesAtRisk: number;        // pincodes where unmanaged peak > 80% utilization
  pincodesRescued: number;       // pincodes where shift brings peak below 80%
  perPincode: Array<{ pincode: string; area: string } & ScheduleRecommendation>;
}
