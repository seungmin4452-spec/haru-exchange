/** 기획서: 수수료는 매수·매도 각 0.015%, 1원 미만은 올림. */
export function fee(amount: number): number {
  return Math.ceil((amount * 15) / 100_000)
}
