import { describe, expect, it } from 'vitest'
import { MockMarket, initialAccount } from '../mocks/mockMarket'
import { addBusinessDays, buildJournals, reconcile, reconDiff, settlementByDate } from './ledger'

const NOW = Date.UTC(2026, 10, 24, 1, 0, 0)

describe('addBusinessDays', () => {
  it('주말을 건너뛴다', () => {
    expect(addBusinessDays('2026-11-24', 2)).toBe('2026-11-26') // 화 → 목
    expect(addBusinessDays('2026-11-26', 2)).toBe('2026-11-30') // 목 → 월
    expect(addBusinessDays('2026-11-27', 2)).toBe('2026-12-01') // 금 → 화
  })
})

describe('원장과 대사', () => {
  function tradedMarket() {
    const market = new MockMarket(11, NOW)
    const book = () => market.getSnapshot().books
    market.submitOrder({ symbol: 'ENTR', side: 'BUY', type: 'MARKET', qty: 7 }, NOW)
    market.submitOrder({ symbol: 'AUTO', side: 'SELL', type: 'MARKET', qty: 20 }, NOW)
    market.submitOrder({ symbol: 'ORBT', side: 'BUY', type: 'LIMIT', price: book().ORBT.asks[0].price, qty: 3 }, NOW)
    market.submitOrder({ symbol: 'FOOD', side: 'SELL', type: 'MARKET', qty: 300 }, NOW)
    for (let i = 0; i < 200; i++) market.step(NOW + i * 200)
    return market.getSnapshot()
  }

  it('원장 거래마다 현금과 종목별 주식 합계가 0이다', () => {
    const journals = buildJournals(tradedMarket().orders)
    expect(journals.length).toBeGreaterThan(0)
    for (const j of journals) {
      const byAsset = new Map<string, number>()
      for (const l of j.lines) byAsset.set(l.asset, (byAsset.get(l.asset) ?? 0) + l.amount)
      for (const total of byAsset.values()) expect(total).toBe(0)
    }
  })

  it('체결 후 대사 차이가 모두 0이다', () => {
    const snap = tradedMarket()
    const items = reconcile(initialAccount(), snap.account, snap.orders, buildJournals(snap.orders))
    for (const item of items) expect([item.key, reconDiff(item)]).toEqual([item.key, 0])
  })

  it('잔고가 원장과 어긋나면 대사가 잡아낸다', () => {
    const snap = tradedMarket()
    const tampered = { ...snap.account, cashAvailable: snap.account.cashAvailable + 1 }
    const items = reconcile(initialAccount(), tampered, snap.orders, buildJournals(snap.orders))
    expect(reconDiff(items.find((i) => i.key === 'cash-balance')!)).toBe(-1)
  })

  it('결제는 T+2 날짜로 묶인다', () => {
    const days = settlementByDate(buildJournals(tradedMarket().orders))
    expect(days.map((d) => d.settleDate)).toEqual(['2026-11-26'])
  })
})
