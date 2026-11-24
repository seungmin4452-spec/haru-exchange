import { describe, expect, it } from 'vitest'
import { priceLimits, tickSize } from '../domain/price'
import { MockMarket } from './mockMarket'
import { mockSymbols } from './symbols'

const NOW = Date.UTC(2026, 10, 24, 0, 40)

function run(seed: number, steps: number) {
  const market = new MockMarket(seed, NOW)
  for (let i = 0; i < steps; i++) market.step(NOW + i * 200)
  return market.getSnapshot()
}

describe('MockMarket', () => {
  it('같은 시드면 같은 시장을 만든다', () => {
    expect(run(7, 300)).toEqual(run(7, 300))
  })

  it('가격은 호가 단위와 상·하한가를 지킨다', () => {
    const snapshot = run(11, 2_000)
    for (const info of mockSymbols) {
      const { upper, lower } = priceLimits(info.prevClose)
      const { price } = snapshot.quotes[info.symbol]
      expect(price % tickSize(price)).toBe(0)
      expect(price).toBeLessThanOrEqual(upper)
      expect(price).toBeGreaterThanOrEqual(lower)
    }
  })

  it('호가창은 매도 최우선이 매수 최우선보다 높다', () => {
    const snapshot = run(3, 500)
    for (const book of Object.values(snapshot.books)) {
      if (book.asks.length && book.bids.length) {
        expect(book.asks[0].price).toBeGreaterThan(book.bids[0].price)
      }
    }
  })
})
