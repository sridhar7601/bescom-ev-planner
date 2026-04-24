import { CHARGER_COSTS_INR, CHARGER_KW, TARIFF_INR_PER_KWH, COST_INR_PER_KWH, TARGET_UTILIZATION } from './types'
import type { ChargerType } from './types'

export interface RoiProjection {
  capexInr: number
  estimatedDailyKwh: number
  monthlyRevenueInr: number
  monthlyProfitInr: number
  paybackMonths: number
}

export function projectRoi(
  chargerTypes: ChargerType[],
  portCount: number,
  demandScore: number,
): RoiProjection {
  const capexInr = chargerTypes.reduce((sum, t) => sum + CHARGER_COSTS_INR[t], 0) * portCount
  const avgKw = chargerTypes.reduce((sum, t) => sum + CHARGER_KW[t], 0) / chargerTypes.length
  const hoursPerDayInUse = 24 * TARGET_UTILIZATION * (0.5 + 0.5 * demandScore)
  const estimatedDailyKwh = avgKw * portCount * hoursPerDayInUse
  const monthlyRevenueInr = estimatedDailyKwh * TARIFF_INR_PER_KWH * 30
  const monthlyProfitInr = estimatedDailyKwh * (TARIFF_INR_PER_KWH - COST_INR_PER_KWH) * 30
  const paybackMonths = monthlyProfitInr > 0 ? capexInr / monthlyProfitInr : Infinity

  return {
    capexInr: Math.round(capexInr),
    estimatedDailyKwh: Math.round(estimatedDailyKwh * 10) / 10,
    monthlyRevenueInr: Math.round(monthlyRevenueInr),
    monthlyProfitInr: Math.round(monthlyProfitInr),
    paybackMonths: paybackMonths === Infinity ? 999 : Math.round(paybackMonths * 10) / 10,
  }
}

export function fiveYearCumulativeRevenue(monthlyRevenueInr: number): number[] {
  const months = 60
  const result: number[] = []
  let cum = 0
  for (let i = 0; i < months; i++) {
    cum += monthlyRevenueInr
    result.push(cum)
  }
  return result
}
