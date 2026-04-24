export type ChargerType = 'AC_001' | 'AC_002' | 'DC_FAST_25KW' | 'DC_FAST_50KW' | 'DC_ULTRA_150KW'
export type LocationCategory = 'RESIDENTIAL' | 'COMMERCIAL' | 'IT_PARK' | 'HIGHWAY_EXIT' | 'MALL' | 'TRANSPORT_HUB' | 'INSTITUTIONAL'
export type ProposalStatus = 'PROPOSED' | 'SHORTLISTED' | 'APPROVED' | 'DEPLOYED' | 'REJECTED'

export const CHARGER_COSTS_INR: Record<ChargerType, number> = {
  AC_001: 40000,
  AC_002: 75000,
  DC_FAST_25KW: 400000,
  DC_FAST_50KW: 800000,
  DC_ULTRA_150KW: 2200000,
}

export const CHARGER_KW: Record<ChargerType, number> = {
  AC_001: 3.3,
  AC_002: 7.4,
  DC_FAST_25KW: 25,
  DC_FAST_50KW: 50,
  DC_ULTRA_150KW: 150,
}

export const TARIFF_INR_PER_KWH = 16
export const COST_INR_PER_KWH = 7
export const TARGET_UTILIZATION = 0.25
