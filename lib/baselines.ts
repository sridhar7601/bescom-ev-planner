// Baseline strategies for Part B comparison.
// Brief evaluation criterion: "Outputs should be comparable against baseline approaches
// such as uniform infrastructure placement or unmanaged charging."

export interface BaselineComparison {
  ours: { meanComposite: number; meanFeederPct: number; meanPaybackMonths: number; totalRevenueInr: number };
  uniform: { meanComposite: number; meanFeederPct: number; meanPaybackMonths: number; totalRevenueInr: number };
  improvementCompositePct: number;     // (ours-uniform)/uniform × 100, on composite score
  improvementPaybackPct: number;       // (uniform-ours)/uniform × 100, on payback (lower is better)
  improvementRevenuePct: number;       // (ours-uniform)/uniform × 100
}

export interface ProposalRow {
  siteScore: number;
  feederImpactPct: number;
  paybackMonths: number;
  estimatedRevenueInrPerMonth: number;
}

/**
 * Compares ChargeSense proposals against a "uniform placement" baseline.
 * Uniform = mean of all candidate sites (i.e. what you'd get with no optimisation,
 * just spreading chargers evenly without scoring). This is the strawman from the brief.
 */
export function compareToUniformBaseline(
  ours: ProposalRow[],
  allCandidates: ProposalRow[],
): BaselineComparison {
  const mean = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
  const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);

  const oursStats = {
    meanComposite: mean(ours.map((p) => p.siteScore)),
    meanFeederPct: mean(ours.map((p) => p.feederImpactPct)),
    meanPaybackMonths: mean(ours.map((p) => p.paybackMonths)),
    totalRevenueInr: sum(ours.map((p) => p.estimatedRevenueInrPerMonth)),
  };

  // Uniform baseline = same number of sites picked uniformly from all candidates
  // (no score-based selection). We approximate by averaging across the whole candidate pool.
  const uniformStats = {
    meanComposite: mean(allCandidates.map((p) => p.siteScore)),
    meanFeederPct: mean(allCandidates.map((p) => p.feederImpactPct)),
    meanPaybackMonths: mean(allCandidates.map((p) => p.paybackMonths)),
    totalRevenueInr: sum(
      allCandidates.slice(0, ours.length).map((p) => p.estimatedRevenueInrPerMonth),
    ),
  };

  const safe = (n: number) => (Number.isFinite(n) ? n : 0);

  return {
    ours: oursStats,
    uniform: uniformStats,
    improvementCompositePct: safe(((oursStats.meanComposite - uniformStats.meanComposite) / Math.max(uniformStats.meanComposite, 0.001)) * 100),
    improvementPaybackPct: safe(((uniformStats.meanPaybackMonths - oursStats.meanPaybackMonths) / Math.max(uniformStats.meanPaybackMonths, 0.001)) * 100),
    improvementRevenuePct: safe(((oursStats.totalRevenueInr - uniformStats.totalRevenueInr) / Math.max(uniformStats.totalRevenueInr, 1)) * 100),
  };
}
