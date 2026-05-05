// Corridor analysis — Bengaluru EV demand corridors.
// The brief calls out: "rising EV density in a corridor → flag for new charging infrastructure".
// Pincodes are zones; corridors are linear road systems linking multiple zones with shared
// commute/traffic characteristics. ChargeSense maps known Bengaluru arterials to their pincodes
// and aggregates demand + charger density at the corridor level.

export interface CorridorDef {
  id: string;
  name: string;
  description: string;
  pincodePatterns: RegExp[];   // matched against the `area` string of the pincode
}

// Major Bengaluru EV corridors. Mapping is based on physical adjacency to the named arterial.
// In production this comes from a BBMP / BDA road-network spatial join.
export const CORRIDORS: CorridorDef[] = [
  {
    id: "ORR_EAST",
    name: "Outer Ring Road East (Marathahalli–Bellandur)",
    description: "Tech-corridor traffic spine; highest commute EV density in Bengaluru.",
    pincodePatterns: [/marathahalli/i, /bellandur/i, /sarjapur/i, /hsr/i, /bommanahalli/i, /koramangala/i],
  },
  {
    id: "WHITEFIELD",
    name: "Whitefield–KR Puram corridor",
    description: "ITPL employee commute belt; rapid EV adoption at IT campuses.",
    pincodePatterns: [/whitefield/i, /mahadevapura/i, /kr puram/i, /kasavanahalli/i],
  },
  {
    id: "HOSUR_RD",
    name: "Hosur Road / Electronic City",
    description: "Inter-city EV truck route + Electronic City IT cluster.",
    pincodePatterns: [/electronic city/i, /bommanahalli/i, /silk board/i, /btm/i],
  },
  {
    id: "BELLARY_RD",
    name: "Bellary Road (Hebbal–Yelahanka)",
    description: "Airport corridor + North Bengaluru residential growth.",
    pincodePatterns: [/hebbal/i, /yelahanka/i, /rt nagar/i, /hegde nagar/i, /manyata/i, /frazer/i],
  },
  {
    id: "TUMKUR_RD",
    name: "Tumkur Road / Yeshwantpur",
    description: "West Bengaluru industrial + rapid metro extension.",
    pincodePatterns: [/yeshwantpur/i, /peenya/i, /rajajinagar/i, /malleshwaram/i],
  },
  {
    id: "CENTRAL",
    name: "Central Business District",
    description: "MG Road / Brigade — commercial fleet + ride-hailing recharge.",
    pincodePatterns: [/mg road/i, /cantonment/i, /gandhinagar/i, /gpo/i, /indiranagar/i],
  },
  {
    id: "JAYANAGAR_BSK",
    name: "Jayanagar–Banashankari",
    description: "Established residential South Bengaluru with growing EV adoption.",
    pincodePatterns: [/jayanagar/i, /banashankari/i, /basavanagudi/i, /btm layout/i],
  },
];

export interface CorridorPincode {
  id: string;
  pincode: string;
  area: string;
  population: number;
  evAdoptionIndex: number;
  peakDemandMW: number;
  availableCapacityMW: number;
  existingChargerCount: number;
  hourlyEvPeakMW: number;       // peak EV charging MW from forecast
  feederUtilizationPct: number; // peak hour utilisation % from forecast
}

export interface CorridorSummary {
  id: string;
  name: string;
  description: string;
  pincodeCount: number;
  pincodes: CorridorPincode[];
  totalPopulation: number;
  avgAdoptionIndex: number;
  totalPeakEvMW: number;          // aggregate peak EV charging across the corridor
  totalChargers: number;
  chargersPerLakhPop: number;     // charger density (existing chargers per lakh population)
  pincodesAtRisk: number;         // feeder utilisation > 80% in this corridor
  growthSignalScore: number;      // 0–1 — composite score: high demand, low charger density, growing adoption
  recommendation: "URGENT" | "HIGH" | "MODERATE" | "MONITOR";
}

/** Match a pincode area string to a corridor (or null if no match). */
export function classifyCorridor(area: string): CorridorDef | null {
  for (const c of CORRIDORS) {
    if (c.pincodePatterns.some((re) => re.test(area))) return c;
  }
  return null;
}

/** Compute corridor summaries given enriched pincode data with forecast metrics. */
export function summarizeCorridors(rows: CorridorPincode[]): CorridorSummary[] {
  const buckets = new Map<string, CorridorPincode[]>();
  for (const r of rows) {
    const c = classifyCorridor(r.area);
    if (!c) continue;
    if (!buckets.has(c.id)) buckets.set(c.id, []);
    buckets.get(c.id)!.push(r);
  }

  const summaries: CorridorSummary[] = [];
  for (const def of CORRIDORS) {
    const members = buckets.get(def.id) ?? [];
    if (members.length === 0) continue;

    const totalPopulation = members.reduce((s, m) => s + m.population, 0);
    const avgAdoption = members.reduce((s, m) => s + m.evAdoptionIndex, 0) / members.length;
    const totalPeakEvMW = members.reduce((s, m) => s + m.hourlyEvPeakMW, 0);
    const totalChargers = members.reduce((s, m) => s + m.existingChargerCount, 0);
    const chargersPerLakhPop = totalPopulation > 0 ? (totalChargers * 1e5) / totalPopulation : 0;
    const pincodesAtRisk = members.filter((m) => m.feederUtilizationPct > 80).length;

    // Growth signal: high adoption + high demand + low charger density + risk pincodes
    // Each component normalised 0-1, then averaged.
    const adoptionScore = Math.min(1, avgAdoption);
    const demandScore = Math.min(1, totalPeakEvMW / 10);                       // 10 MW = max
    const gapScore = Math.min(1, Math.max(0, 1 - chargersPerLakhPop / 30));    // 30/lakh = saturated
    const stressScore = Math.min(1, pincodesAtRisk / Math.max(1, members.length));

    const growthSignalScore = Number(((adoptionScore + demandScore + gapScore + stressScore) / 4).toFixed(3));

    let recommendation: CorridorSummary["recommendation"];
    if (growthSignalScore >= 0.75 || pincodesAtRisk >= 2) recommendation = "URGENT";
    else if (growthSignalScore >= 0.55) recommendation = "HIGH";
    else if (growthSignalScore >= 0.35) recommendation = "MODERATE";
    else recommendation = "MONITOR";

    summaries.push({
      id: def.id,
      name: def.name,
      description: def.description,
      pincodeCount: members.length,
      pincodes: members,
      totalPopulation,
      avgAdoptionIndex: Number(avgAdoption.toFixed(3)),
      totalPeakEvMW: Number(totalPeakEvMW.toFixed(2)),
      totalChargers,
      chargersPerLakhPop: Number(chargersPerLakhPop.toFixed(1)),
      pincodesAtRisk,
      growthSignalScore,
      recommendation,
    });
  }

  return summaries.sort((a, b) => b.growthSignalScore - a.growthSignalScore);
}
