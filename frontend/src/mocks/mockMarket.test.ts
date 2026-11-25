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

describe('MockMarket 주문', () => {
  const total = (m: MockMarket) => {
    const { account } = m.getSnapshot()
    return account.cashAvailable + account.cashLocked
  }

  it('지정가 매수는 주문가 기준으로 수수료까지 잠근다', () => {
    const market = new MockMarket(5, NOW)
    const bid = market.getSnapshot().books.ENTR.bids[3].price
    const before = total(market)
    const result = market.submitOrder({ symbol: 'ENTR', side: 'BUY', type: 'LIMIT', price: bid, qty: 10 }, NOW)
    expect(result.ok).toBe(true)
    const { account, books } = market.getSnapshot()
    expect(account.cashLocked).toBe(bid * 10 + Math.ceil((bid * 10 * 15) / 100_000))
    expect(total(market)).toBe(before)
    expect(books.ENTR.bids.find((l) => l.price === bid)?.myQty).toBe(10)
  })

  it('최우선 매도가 이상 지정가 매수는 바로 체결되고 남은 잠금을 푼다', () => {
    const market = new MockMarket(5, NOW)
    const ask = market.getSnapshot().books.ENTR.asks[0]
    const qty = Math.min(5, ask.qty)
    const limit = ask.price + 500
    const result = market.submitOrder({ symbol: 'ENTR', side: 'BUY', type: 'LIMIT', price: limit, qty }, NOW)
    expect(result.ok && result.order.status).toBe('FILLED')
    const { account } = market.getSnapshot()
    expect(account.cashLocked).toBe(0)
    const amount = ask.price * qty
    expect(account.cashAvailable).toBe(12_480_000 - amount - Math.ceil((amount * 15) / 100_000))
  })

  it('취소하면 잠금이 전부 풀린다', () => {
    const market = new MockMarket(5, NOW)
    const bid = market.getSnapshot().books.ENTR.bids[5].price
    const result = market.submitOrder({ symbol: 'ENTR', side: 'BUY', type: 'LIMIT', price: bid, qty: 3 }, NOW)
    if (!result.ok) throw new Error(result.reason)
    market.cancelOrder(result.order.id)
    const { account, orders } = market.getSnapshot()
    expect(account.cashLocked).toBe(0)
    expect(account.cashAvailable).toBe(12_480_000)
    expect(orders[0].status).toBe('CANCELLED')
  })

  it('매도 가능 수량과 호가 단위를 검사한다', () => {
    const market = new MockMarket(5, NOW)
    expect(market.submitOrder({ symbol: 'ENTR', side: 'SELL', type: 'MARKET', qty: 81 }, NOW).ok).toBe(false)
    expect(market.submitOrder({ symbol: 'ENTR', side: 'BUY', type: 'LIMIT', price: 46_730, qty: 1 }, NOW).ok).toBe(false)
  })

  it('봇 체결이 계속돼도 잠금은 음수가 되지 않고 주식 수는 보존된다', () => {
    const market = new MockMarket(9, NOW)
    const book = market.getSnapshot().books.ENTR
    market.submitOrder({ symbol: 'ENTR', side: 'BUY', type: 'LIMIT', price: book.bids[0].price, qty: 40 }, NOW)
    market.submitOrder({ symbol: 'ENTR', side: 'SELL', type: 'LIMIT', price: book.asks[1].price, qty: 30 }, NOW)
    for (let i = 0; i < 3_000; i++) market.step(NOW + i * 200)
    const { account, orders } = market.getSnapshot()
    expect(account.cashLocked).toBeGreaterThanOrEqual(0)
    const haru = account.holdings.find((h) => h.symbol === 'ENTR')
    const bought = orders.filter((o) => o.side === 'BUY').reduce((s, o) => s + o.filledQty, 0)
    const sold = orders.filter((o) => o.side === 'SELL').reduce((s, o) => s + o.filledQty, 0)
    expect(haru?.qty ?? 0).toBe(80 + bought - sold)
    expect(haru?.lockedQty ?? 0).toBeGreaterThanOrEqual(0)
  })
})

describe('MockMarket 시뮬레이터', () => {
  it('호재 뉴스가 나오면 가격이 오르고, 1분 안에 10% 넘게 오르면 서킷브레이커가 걸린다', () => {
    const market = new MockMarket(21, NOW)
    market.setSimConfig({ ordersPerSecond: 400 })
    const before = market.getSnapshot().quotes.ENTR.price
    market.publishNews('ENTR', '하루빛 월드투어 전석 매진', 'POSITIVE', NOW)
    let halted = false
    for (let i = 0; i < 300 && !halted; i++) {
      market.step(NOW + i * 200)
      halted = market.getSnapshot().halts.ENTR !== undefined
    }
    const snapshot = market.getSnapshot()
    expect(snapshot.quotes.ENTR.price).toBeGreaterThan(before)
    expect(halted).toBe(true)
    expect(snapshot.news[0].tone).toBe('SYSTEM')
  })

  it('거래 정지 중에는 새 주문을 받지 않는다', () => {
    const market = new MockMarket(21, NOW)
    market.setSimConfig({ ordersPerSecond: 400 })
    market.publishNews('ENTR', '하루빛 월드투어 전석 매진', 'POSITIVE', NOW)
    let i = 0
    while (market.getSnapshot().halts.ENTR === undefined && i < 300) market.step(NOW + i++ * 200)
    const result = market.submitOrder({ symbol: 'ENTR', side: 'BUY', type: 'MARKET', qty: 1 }, NOW + i * 200)
    expect(result.ok).toBe(false)
  })

  it('일시 정지하면 봇 체결이 멈춘다', () => {
    const market = new MockMarket(4, NOW)
    market.setSimConfig({ running: false })
    const seq = market.getSnapshot().metrics.seq
    for (let i = 0; i < 50; i++) market.step(NOW + i * 200)
    expect(market.getSnapshot().metrics.seq).toBe(seq)
  })
})

describe('MockMarket 장애 복구 데모', () => {
  it('강제 종료 → 재생 → 해시 일치 → 재개 순서로 진행한다', () => {
    const market = new MockMarket(8, NOW)
    for (let i = 0; i < 100; i++) market.step(NOW + i * 200)
    market.crashEngine(NOW)
    const crashed = market.getSnapshot().engine
    expect(crashed.status).toBe('CRASHED')
    expect(crashed.replayTotal).toBe(crashed.crashSeq! - crashed.snapshotSeq!)

    // 종료 중에는 체결도 주문도 없다
    for (let i = 0; i < 10; i++) market.step(NOW + 20_000 + i * 200)
    expect(market.getSnapshot().metrics.seq).toBe(crashed.crashSeq)
    expect(market.submitOrder({ symbol: 'ENTR', side: 'BUY', type: 'MARKET', qty: 1 }, NOW).ok).toBe(false)

    market.startRecovery(NOW)
    for (let i = 0; i < 40; i++) market.step(NOW + 30_000 + i * 200)
    const verified = market.getSnapshot().engine
    expect(verified.status).toBe('VERIFIED')
    expect(verified.replayed).toBe(verified.replayTotal)
    expect(verified.hashesAfter).toEqual(verified.hashesBefore)
    expect(verified.duplicates).toBe(0)

    market.resumeEngine(NOW)
    expect(market.getSnapshot().engine.status).toBe('RUNNING')
  })
})

describe('MockMarket 정정', () => {
  it('수량만 줄이면 시간 우선순위를 유지하고 잠금을 줄인다', () => {
    const market = new MockMarket(5, NOW)
    const bid = market.getSnapshot().books.ENTR.bids[4].price
    const placed = market.submitOrder({ symbol: 'ENTR', side: 'BUY', type: 'LIMIT', price: bid, qty: 10 }, NOW)
    if (!placed.ok) throw new Error(placed.reason)
    const amended = market.amendOrder(placed.order.id, { qty: 4 }, NOW + 5_000)
    if (!amended.ok) throw new Error(amended.reason)
    expect(amended.order.createdAt).toBe(NOW)
    expect(market.getSnapshot().account.cashLocked).toBe(bid * 4 + Math.ceil((bid * 4 * 15) / 100_000))
  })

  it('가격을 바꾸면 시간 우선순위를 잃는다', () => {
    const market = new MockMarket(5, NOW)
    const book = market.getSnapshot().books.ENTR
    const placed = market.submitOrder({ symbol: 'ENTR', side: 'BUY', type: 'LIMIT', price: book.bids[4].price, qty: 10 }, NOW)
    if (!placed.ok) throw new Error(placed.reason)
    const amended = market.amendOrder(placed.order.id, { price: book.bids[3].price }, NOW + 5_000)
    expect(amended.ok && amended.order.createdAt).toBe(NOW + 5_000)
  })

  it('이미 체결된 수량 이하로는 줄일 수 없다', () => {
    const market = new MockMarket(5, NOW)
    const placed = market.submitOrder({ symbol: 'ENTR', side: 'SELL', type: 'LIMIT', price: market.getSnapshot().books.ENTR.asks[2].price, qty: 5 }, NOW)
    if (!placed.ok) throw new Error(placed.reason)
    expect(market.amendOrder(placed.order.id, { qty: 0 }, NOW).ok).toBe(false)
  })
})

describe('MockMarket 운영 콘솔', () => {
  it('장 마감은 미체결 주문을 만료하고 잠금을 풀며, 새 주문과 봇 체결을 막는다', () => {
    const market = new MockMarket(9, NOW)
    const bid = market.getSnapshot().books.ENTR.bids[4].price
    market.submitOrder({ symbol: 'ENTR', side: 'BUY', type: 'LIMIT', price: bid, qty: 3 }, NOW)
    market.closeMarket(NOW)
    const snap = market.getSnapshot()
    expect(snap.session).toBe('CLOSED')
    expect(snap.orders.every((o) => o.status === 'CANCELLED')).toBe(true)
    expect(snap.account.cashLocked).toBe(0)
    expect(market.submitOrder({ symbol: 'ENTR', side: 'BUY', type: 'MARKET', qty: 1 }, NOW).ok).toBe(false)
    const seq = snap.metrics.seq
    for (let i = 0; i < 20; i++) market.step(NOW + i * 200)
    expect(market.getSnapshot().metrics.seq).toBe(seq)
    market.openMarket(NOW)
    expect(market.getSnapshot().session).toBe('OPEN')
  })

  it('수동 정지는 시간이 지나도 풀리지 않고, 재개하면 풀린다', () => {
    const market = new MockMarket(9, NOW)
    market.haltSymbol('ORBT', NOW)
    for (let i = 0; i < 1000; i++) market.step(NOW + i * 200)
    expect(market.getSnapshot().halts.ORBT).toBe(Number.POSITIVE_INFINITY)
    expect(market.submitOrder({ symbol: 'ORBT', side: 'BUY', type: 'MARKET', qty: 1 }, NOW).ok).toBe(false)
    market.resumeSymbol('ORBT', NOW)
    expect(market.getSnapshot().halts.ORBT).toBeUndefined()
  })

  it('DLQ: 일시 오류는 재처리에 성공하고, 형식 오류는 다시 실패한다', () => {
    const market = new MockMarket(9, NOW)
    market.retryDlq('dlq-1', NOW)
    market.retryDlq('dlq-3', NOW)
    const [first, , third] = market.getSnapshot().dlq
    expect(first.status).toBe('REPROCESSED')
    expect(third.status).toBe('PENDING')
    expect(third.attempts).toBe(2)
    market.discardDlq('dlq-3', NOW)
    expect(market.getSnapshot().dlq[2].status).toBe('DISCARDED')
  })
})
