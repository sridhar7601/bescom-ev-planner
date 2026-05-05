// Hourly EV charging demand prediction per pincode.
// Deterministic, weather-independent — uses area-type signature × population × adoption index.
// Real BESCOM deployment swaps these signature curves with actual smart-meter / FCS telemetry.

export type AreaArchetype = "RESIDENTIAL" | "IT_PARK" | "COMMERCIAL" | "TRANSPORT_HUB" | "MIXED";

// Hourly demand signature — fraction of daily peak at hour h (0–23). Sums close to 1 daily share.
// Curves are based on published BESCOM/CEA load-profile studies for residential vs commercial feeders.
const SIGNATURES: Record<AreaArchetype, number[]> = {
  // Residential: heavy evening peak 18-22h when people return home and plug in
  RESIDENTIAL:    [0.25, 0.20, 0.18, 0.15, 0.12, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.42,
                   0.45, 0.42, 0.40, 0.45, 0.55, 0.70, 0.95, 1.00, 0.90, 0.75, 0.55, 0.35],
  // IT park: midday peak 11-15h (employee charging during work hours)
  IT_PARK:        [0.10, 0.08, 0.07, 0.07, 0.08, 0.12, 0.20, 0.40, 0.65, 0.80, 0.90, 0.95,
                   1.00, 0.98, 0.92, 0.85, 0.70, 0.50, 0.30, 0.20, 0.15, 0.12, 0.10, 0.10],
  // Commercial/retail: late evening peak 19-22h shoppers + ride-hailing fleet recharge
  COMMERCIAL:     [0.20, 0.15, 0.12, 0.10, 0.10, 0.12, 0.18, 0.25, 0.35, 0.45, 0.55, 0.60,
                   0.65, 0.62, 0.60, 0.65, 0.75, 0.85, 0.95, 1.00, 0.90, 0.75, 0.55, 0.30],
  // Transport hub (bus stand / metro / station): all-day flat with 8-10h + 18-20h spikes
  TRANSPORT_HUB:  [0.40, 0.30, 0.25, 0.20, 0.25, 0.35, 0.55, 0.80, 0.95, 0.90, 0.85, 0.80,
                   0.78, 0.75, 0.72, 0.75, 0.85, 0.95, 1.00, 0.90, 0.75, 0.65, 0.55, 0.45],
  // Mixed-use default: averaged residential+commercial
  MIXED:          [0.22, 0.18, 0.15, 0.12, 0.11, 0.14, 0.19, 0.25, 0.33, 0.40, 0.48, 0.51,
                   0.55, 0.52, 0.50, 0.55, 0.65, 0.78, 0.95, 1.00, 0.90, 0.75, 0.55, 0.32],
};

// Heuristic mapping from pincode "area" string to archetype. Keeps the brief honest:
// in production this comes from a BESCOM zone classification API.
export function classifyArea(area: string): AreaArchetype {
  const a = area.toLowerCase();
  if (/whitefield|electronic city|sarjapur|bellandur|mahadevapura|hebbal it|manyata/.test(a)) return "IT_PARK";
  if (/mg road|brigade|commercial|market|chickpet|jayanagar 4th|indiranagar|koramangala/.test(a)) return "COMMERCIAL";
  if (/majestic|kr puram|ksr|airport|hub|station|bus stand/.test(a)) return "TRANSPORT_HUB";
  if (/banashankari|jayanagar|hsr|btm|hebbal|rt nagar|rajajinagar|basavanagudi|malleshwaram/.test(a)) return "RESIDENTIAL";
  return "MIXED";
}

export interface HourlyDemandPoint {
  hour: number;          // 0–23
  demandMW: number;      // EV charging demand (megawatts)
  baseLoadMW: number;    // non-EV baseline load on the same feeder
  totalLoadMW: number;   // baseLoad + demandMW
  capacityMW: number;    // feeder available capacity
  utilizationPct: number; // totalLoadMW / capacityMW × 100
  isPeak: boolean;       // utilizationPct > 80
  isOffPeak: boolean;    // utilizationPct < 50
}

export interface PincodeForecastInput {
  pincode: string;
  area: string;
  population: number;
  evAdoptionIndex: number;       // 0–1
  peakDemandMW: number;          // baseline (non-EV) peak load on the feeder
  availableCapacityMW: number;   // total feeder capacity (incl. headroom)
}

/**
 * Generates 24h hourly EV charging demand forecast for a pincode.
 * Returns array of 24 HourlyDemandPoint, one per hour 00:00 → 23:00.
 *
 * Model: dailyPeakEvMW = (population × evShare × adoptionIndex) × kwhPerDayPerEV × peakFactor / 1000
 *   - evShare = 0.04 (4% of population owns an EV at full adoption — Bengaluru 2026 projection)
 *   - kwhPerDayPerEV = 6 (BESCOM survey typical for urban EV daily charging)
 *   - peakFactor = 0.3 (30% of fleet charges in the peak hour)
 * Then distribute across 24 hours using the area-type signature.
 *
 * Total feeder capacity = peakDemandMW + availableCapacityMW (where availableCapacityMW is headroom).
 */
export function forecastHourlyDemand(input: PincodeForecastInput): HourlyDemandPoint[] {
  const archetype = classifyArea(input.area);
  const signature = SIGNATURES[archetype];

  const KWH_PER_EV_PER_DAY = 6;
  const EV_SHARE_OF_POPULATION = 0.04;
  const PEAK_HOUR_FRACTION = 0.3;

  const evCount = input.population * EV_SHARE_OF_POPULATION * input.evAdoptionIndex;
  const dailyPeakEvMW = (evCount * KWH_PER_EV_PER_DAY * PEAK_HOUR_FRACTION) / 1000;

  const baseSig = SIGNATURES.MIXED;
  const baseDailyPeakMW = input.peakDemandMW;

  // Total feeder capacity = current peak + spare headroom
  const totalCapacityMW = input.peakDemandMW + input.availableCapacityMW;

  const points: HourlyDemandPoint[] = [];
  for (let h = 0; h < 24; h++) {
    const demandMW = Number((dailyPeakEvMW * signature[h]).toFixed(3));
    const baseLoadMW = Number((baseDailyPeakMW * baseSig[h]).toFixed(3));
    const totalLoadMW = Number((baseLoadMW + demandMW).toFixed(3));
    const capacityMW = totalCapacityMW;
    const utilizationPct = capacityMW > 0 ? Number(((totalLoadMW / capacityMW) * 100).toFixed(1)) : 0;
    points.push({
      hour: h,
      demandMW,
      baseLoadMW,
      totalLoadMW,
      capacityMW,
      utilizationPct,
      isPeak: utilizationPct > 80,
      isOffPeak: utilizationPct < 50,
    });
  }
  return points;
}

/** Sum demand across many pincodes hour-by-hour for fleet-level view. */
export function aggregateHourly(forecasts: HourlyDemandPoint[][]): HourlyDemandPoint[] {
  if (forecasts.length === 0) return [];
  const out: HourlyDemandPoint[] = [];
  for (let h = 0; h < 24; h++) {
    let demandMW = 0, baseLoadMW = 0, capacityMW = 0;
    for (const f of forecasts) {
      demandMW += f[h].demandMW;
      baseLoadMW += f[h].baseLoadMW;
      capacityMW += f[h].capacityMW;
    }
    const totalLoadMW = demandMW + baseLoadMW;
    const utilizationPct = capacityMW > 0 ? (totalLoadMW / capacityMW) * 100 : 0;
    out.push({
      hour: h,
      demandMW: Number(demandMW.toFixed(3)),
      baseLoadMW: Number(baseLoadMW.toFixed(3)),
      totalLoadMW: Number(totalLoadMW.toFixed(3)),
      capacityMW: Number(capacityMW.toFixed(3)),
      utilizationPct: Number(utilizationPct.toFixed(1)),
      isPeak: utilizationPct > 80,
      isOffPeak: utilizationPct < 50,
    });
  }
  return out;
}
