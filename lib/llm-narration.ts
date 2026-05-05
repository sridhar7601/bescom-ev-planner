// Azure OpenAI GPT-4.1 narration overlay for ChargeSense AI.
// All AI outputs are GROUNDED — we pre-compute numbers and let the LLM only describe what's there.
// Responses cached to disk by content hash. No hosted-LLM use on real BESCOM customer data
// (synthetic demo only — production would use on-prem inference per brief non-negotiables).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

function cacheDir(): string {
  return join(process.cwd(), "data", "llm-cache");
}

function readCache(key: string): string | null {
  const path = join(cacheDir(), `${key}.txt`);
  if (!existsSync(path)) return null;
  try { return readFileSync(path, "utf8"); } catch { return null; }
}

function writeCache(key: string, text: string): void {
  mkdirSync(cacheDir(), { recursive: true });
  writeFileSync(join(cacheDir(), `${key}.txt`), text);
}

async function rawLLM(systemPrompt: string, userContent: string, maxTokens = 200): Promise<string> {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
  const azureKey = process.env.AZURE_OPENAI_API_KEY;
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  if (azureKey && azureEndpoint) {
    const res = await fetch(azureEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": azureKey },
      body: JSON.stringify({ messages, max_tokens: maxTokens, temperature: 0.2 }),
    });
    if (!res.ok) throw new Error(`Azure OpenAI HTTP ${res.status}`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content?.trim() ?? "";
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("No LLM API key configured");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: maxTokens, temperature: 0.2 }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

function hasLLM(): boolean {
  return !!(process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
}

// ─── 1. Dashboard Daily Briefing ──────────────────────────────────────────────
export interface DashboardBriefingInput {
  totalProposals: number;
  totalInvestmentCr: number;
  avgPaybackMonths: number;
  fleetPeakUtilizationPct: number;
  fleetPeakHour: number;
  pincodesAtRisk: number;
  totalShiftableMW: number;
  costSavingsInrPerDay: number;
}

export async function generateDashboardBriefing(input: DashboardBriefingInput): Promise<string> {
  const cacheKey = createHash("sha256")
    .update(JSON.stringify({ ...input, day: new Date().toISOString().slice(0, 10) }))
    .digest("hex").slice(0, 16);
  const cached = readCache(`briefing_${cacheKey}`);
  if (cached) return cached;

  if (!hasLLM()) {
    return `${input.totalProposals} charger proposals queued (₹${input.totalInvestmentCr.toFixed(2)} Cr). Fleet peaks at ${input.fleetPeakUtilizationPct.toFixed(0)}% feeder utilisation at ${String(input.fleetPeakHour).padStart(2,"0")}:00. ${input.pincodesAtRisk} pincode${input.pincodesAtRisk!==1?"s":""} at risk; peak-shift can move ${input.totalShiftableMW.toFixed(1)} MW off-peak.`;
  }

  const system =
    "You are the AI grid-planning assistant for BESCOM (Bengaluru distribution utility). " +
    "Write a 3-sentence morning briefing for the EV planning desk. Structure:\n" +
    "1. Infra plan: total proposals + investment + avg payback months.\n" +
    "2. Grid stress: fleet peak hour + utilisation % + pincodes at risk.\n" +
    "3. Action: peak-shift opportunity in MW + ₹ daily savings + recommended next step.\n" +
    "Use Indian power-sector + EV terms (feeder, ToU tariff, off-peak, payback). Under 70 words.";

  try {
    const text = await rawLLM(system, JSON.stringify(input), 200);
    writeCache(`briefing_${cacheKey}`, text);
    return text;
  } catch {
    return `${input.totalProposals} proposals (₹${input.totalInvestmentCr.toFixed(2)} Cr), avg ${input.avgPaybackMonths.toFixed(0)} mo payback. Fleet peak ${input.fleetPeakUtilizationPct.toFixed(0)}% at ${String(input.fleetPeakHour).padStart(2,"0")}:00. Shift ${input.totalShiftableMW.toFixed(1)} MW off-peak to save ₹${(input.costSavingsInrPerDay/1000).toFixed(1)}k/day.`;
  }
}

// ─── 2. Peak-shift narration per pincode ─────────────────────────────────────
export interface SchedulingExplainInput {
  pincode: string;
  area: string;
  unmanagedPeakHour: number;
  unmanagedPeakUtilizationPct: number;
  shiftedPeakUtilizationPct: number;
  shiftableMW: number;
  costSavingsInrPerDay: number;
  feederStressAvoided: boolean;
}

export async function explainScheduling(input: SchedulingExplainInput): Promise<string> {
  const cacheKey = createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);
  const cached = readCache(`sched_${cacheKey}`);
  if (cached) return cached;

  if (!hasLLM()) {
    return `Pincode ${input.pincode} (${input.area}): unmanaged peak ${input.unmanagedPeakUtilizationPct.toFixed(0)}% at ${String(input.unmanagedPeakHour).padStart(2,"0")}:00. Shift ${input.shiftableMW.toFixed(2)} MW to overnight off-peak → new peak ${input.shiftedPeakUtilizationPct.toFixed(0)}%, saves ₹${input.costSavingsInrPerDay.toFixed(0)}/day.`;
  }

  const system =
    "You are a BESCOM grid planner advising on EV charging schedules. Write 2 sentences:\n" +
    "1. State the unmanaged peak (hour + utilisation %) and the risk to the feeder.\n" +
    "2. Recommend the shift (MW from peak hours to off-peak 23:00–05:00) and the ₹ savings + grid benefit.\n" +
    "Use 24-hour format. Be concrete with numbers. Under 50 words.";

  try {
    const text = await rawLLM(system, JSON.stringify(input), 140);
    writeCache(`sched_${cacheKey}`, text);
    return text;
  } catch {
    return `${input.area}: peak ${input.unmanagedPeakUtilizationPct.toFixed(0)}% at ${String(input.unmanagedPeakHour).padStart(2,"0")}:00 risks feeder stress. Shifting ${input.shiftableMW.toFixed(1)} MW to overnight off-peak saves ₹${input.costSavingsInrPerDay.toFixed(0)}/day and brings utilisation to ${input.shiftedPeakUtilizationPct.toFixed(0)}%.`;
  }
}

// ─── 3. Corridor analysis narration ──────────────────────────────────────────
export interface CorridorNarrateInput {
  id: string;
  name: string;
  pincodeCount: number;
  totalPopulation: number;
  avgAdoptionIndex: number;
  totalPeakEvMW: number;
  totalChargers: number;
  chargersPerLakhPop: number;
  pincodesAtRisk: number;
  growthSignalScore: number;
  recommendation: string;
}

export async function explainCorridor(input: CorridorNarrateInput): Promise<string> {
  const cacheKey = createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);
  const cached = readCache(`corr_${cacheKey}`);
  if (cached) return cached;

  if (!hasLLM()) {
    return `${input.name}: ${input.totalPeakEvMW.toFixed(1)} MW peak EV demand across ${input.pincodeCount} pincodes, only ${input.totalChargers} chargers (${input.chargersPerLakhPop.toFixed(1)}/lakh pop). ${input.pincodesAtRisk} at-risk. Recommendation: ${input.recommendation}.`;
  }

  const system =
    "You are a BESCOM EV infrastructure planner writing a 2-sentence flag for an executive memo:\n" +
    "1. Why this corridor is flagged — call out the strongest signal (demand growth, charger gap, feeder stress).\n" +
    "2. What infrastructure action to prioritise — number of new chargers, type (DC fast vs AC), and timeline urgency.\n" +
    "Be concrete with numbers. Use Indian power-sector terms. Under 50 words.";

  try {
    const text = await rawLLM(system, JSON.stringify(input), 140);
    writeCache(`corr_${cacheKey}`, text);
    return text;
  } catch {
    return `${input.name}: ${input.pincodesAtRisk}/${input.pincodeCount} pincodes at risk, ${input.chargersPerLakhPop.toFixed(1)} chargers/lakh population. ${input.recommendation} priority — accelerate DC fast charger rollout on ${input.name.split('—')[0]?.trim() || 'this corridor'}.`;
  }
}

// ─── 4. Proposal AI rationale ────────────────────────────────────────────────
export interface ProposalExplainInput {
  proposalId: string;
  area: string;
  category: string;
  composite: number;
  demand: number;
  capacity: number;
  accessibility: number;
  competition: number;
  paybackMonths: number;
  feederImpactPct: number;
  monthlyRevenueInr: number;
}

export async function explainProposalAI(input: ProposalExplainInput): Promise<string> {
  const cacheKey = createHash("sha256").update(input.proposalId).digest("hex").slice(0, 16);
  const cached = readCache(`prop_${cacheKey}`);
  if (cached) return cached;

  if (!hasLLM()) {
    return `Composite ${(input.composite*100).toFixed(0)}/100. Payback ${input.paybackMonths.toFixed(1)} mo. Feeder ${input.feederImpactPct.toFixed(1)}%. Strongest signal: ${input.demand>=input.capacity?"demand":"capacity"}.`;
  }

  const system =
    "You are a BESCOM EV planning analyst writing a 2-sentence rationale for an executive memo:\n" +
    "1. Why this site ranks where it does — call out the strongest of the 4 components (demand / capacity / accessibility / competition).\n" +
    "2. The financial + grid case — payback months, monthly revenue, feeder impact %.\n" +
    "Be direct. Use numbers. No marketing language. Under 50 words.";

  try {
    const text = await rawLLM(system, JSON.stringify(input), 140);
    writeCache(`prop_${cacheKey}`, text);
    return text;
  } catch {
    const top = Math.max(input.demand, input.capacity, input.accessibility, input.competition);
    const topName = top===input.demand?"demand":top===input.capacity?"capacity":top===input.accessibility?"accessibility":"low competition";
    return `Composite ${(input.composite*100).toFixed(0)}/100, driven by ${topName} (${(top*100).toFixed(0)}/100). Payback ${input.paybackMonths.toFixed(1)} months · ₹${(input.monthlyRevenueInr/1000).toFixed(0)}k/mo revenue · feeder load ${input.feederImpactPct.toFixed(1)}%.`;
  }
}
