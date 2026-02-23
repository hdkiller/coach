export const KG_TO_LBS = 2.20462262185
export const LBS_TO_KG = 0.45359237

export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100
}
