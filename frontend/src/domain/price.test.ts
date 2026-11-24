import { describe, expect, it } from 'vitest'
import { nextTick, prevTick, priceLimits, tickSize } from './price'

describe('호가 단위', () => {
  it('가격대별 단위를 따른다', () => {
    expect(tickSize(9_990)).toBe(10)
    expect(tickSize(10_000)).toBe(50)
    expect(tickSize(49_950)).toBe(50)
    expect(tickSize(50_000)).toBe(100)
  })

  it('가격대 경계를 넘나드는 한 호가 이동', () => {
    expect(nextTick(9_990)).toBe(10_000)
    expect(prevTick(10_000)).toBe(9_990)
    expect(nextTick(49_950)).toBe(50_000)
    expect(prevTick(50_000)).toBe(49_950)
  })
})

describe('상·하한가', () => {
  it('전일 종가 ±30%를 호가 단위 안쪽으로 맞춘다', () => {
    expect(priceLimits(46_750)).toEqual({ upper: 60_700, lower: 32_750 })
    expect(priceLimits(8_030)).toEqual({ upper: 10_400, lower: 5_630 })
  })
})
