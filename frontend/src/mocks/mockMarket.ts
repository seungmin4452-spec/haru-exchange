import { fee } from '../domain/fees'
import { changeRate, nextTick, prevTick, priceLimits, tickSize } from '../domain/price'
import type {
  Account,
  BookLevel,
  Candle,
  MarketSnapshot,
  Order,
  OrderBook,
  OrderRequest,
  OrderResult,
  Quote,
  Side,
  SymbolInfo,
  Trade,
} from '../domain/types'
import type { MarketSource } from '../data/marketSource'
import { createRng, type Rng } from './rng'
import { mockSymbols } from './symbols'

const BOOK_DEPTH = 10
const TRADE_HISTORY = 40
const CANDLE_HISTORY = 120
const TICK_MS = 200

interface SymbolState {
  info: SymbolInfo
  price: number
  volume: number
  /** 가격 → 다른 참가자 잔량. 내 주문은 orders에서 따로 더한다 */
  askQty: Map<number, number>
  bidQty: Map<number, number>
  trades: Trade[]
  candles: Candle[]
  /** 작은 추세. 봇이 한쪽으로 몰리는 장면을 흉내 낸다 */
  drift: number
}

const initialAccount = (): Account => ({
  cashAvailable: 12_480_000,
  cashLocked: 0,
  holdings: [
    { symbol: 'HARU', qty: 80, lockedQty: 0, avgPrice: 45_900 },
    { symbol: 'TOUR', qty: 150, lockedQty: 0, avgPrice: 16_900 },
    { symbol: 'CUTN', qty: 300, lockedQty: 0, avgPrice: 8_210 },
  ],
})

/**
 * 백엔드 없이 화면을 만들기 위한 가상 시장과 가상 계좌.
 * 실제 매칭 엔진이 아니다. 가격·시간 우선과 증거금 잠금을 흉내만 내고,
 * 내 주문은 같은 가격의 다른 잔량보다 먼저 체결된다고 단순화했다.
 */
export class MockMarket implements MarketSource {
  private readonly rng: Rng
  private readonly states = new Map<string, SymbolState>()
  private seq = 1_204_000
  private nextOrderId = 20_400
  private recentTradeTimes: number[] = []
  private account: Account = initialAccount()
  private orders: Order[] = []
  private snapshot: MarketSnapshot
  private listeners = new Set<() => void>()
  private timer: ReturnType<typeof setInterval> | undefined

  constructor(seed = 20261124, now = Date.now()) {
    this.rng = createRng(seed)
    for (const info of mockSymbols) {
      this.states.set(info.symbol, this.initSymbol(info, now))
    }
    this.snapshot = this.buildSnapshot()
  }

  getSnapshot = (): MarketSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    if (!this.timer) this.timer = setInterval(() => this.step(Date.now()), TICK_MS)
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0 && this.timer) {
        clearInterval(this.timer)
        this.timer = undefined
      }
    }
  }

  /** 한 번의 시간 진행. 테스트에서는 직접 호출한다. */
  step(now: number): void {
    const count = this.rng.int(1, 4)
    for (let i = 0; i < count; i++) {
      const state = this.states.get(this.rng.pick(mockSymbols).symbol)!
      this.botTrade(state, now + i)
    }
    for (const state of this.states.values()) this.jitterBook(state)
    this.recentTradeTimes = this.recentTradeTimes.filter((t) => now - t < 1000)
    this.publish()
  }

  submitOrder = (request: OrderRequest, now = Date.now()): OrderResult => {
    const state = this.states.get(request.symbol)
    if (!state) return { ok: false, reason: '없는 종목입니다' }
    if (!Number.isInteger(request.qty) || request.qty < 1) return { ok: false, reason: '수량은 1주 이상 정수로 입력하세요' }

    const { upper, lower } = priceLimits(state.info.prevClose)
    if (request.type === 'LIMIT') {
      const price = request.price ?? 0
      if (price < lower || price > upper) {
        return { ok: false, reason: `가격은 하한가 ${lower.toLocaleString()}원 ~ 상한가 ${upper.toLocaleString()}원 사이여야 합니다` }
      }
      if (price % tickSize(price) !== 0) return { ok: false, reason: `이 가격대의 호가 단위는 ${tickSize(price)}원입니다` }
    }

    let locked: number
    if (request.side === 'BUY') {
      // 기획서: 지정가는 주문가, 시장가는 상한가 기준으로 수수료까지 잠근다
      const basis = request.type === 'LIMIT' ? request.price! : upper
      locked = basis * request.qty + fee(basis * request.qty)
      if (locked > this.account.cashAvailable) return { ok: false, reason: '주문 가능 금액이 부족합니다' }
      this.account.cashAvailable -= locked
      this.account.cashLocked += locked
    } else {
      const holding = this.account.holdings.find((h) => h.symbol === request.symbol)
      const sellable = holding ? holding.qty - holding.lockedQty : 0
      if (request.qty > sellable) return { ok: false, reason: `매도 가능 수량(${sellable}주)을 넘었습니다` }
      holding!.lockedQty += request.qty
      locked = request.qty
    }

    const order: Order = {
      id: `A-${this.nextOrderId++}`,
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      price: request.type === 'LIMIT' ? request.price : undefined,
      qty: request.qty,
      filledQty: 0,
      status: 'OPEN',
      createdAt: now,
      locked,
      fills: [],
    }
    this.orders = [order, ...this.orders]
    this.matchIncoming(state, order, now)
    if (order.type === 'MARKET' && order.filledQty < order.qty) {
      // 시장가의 남은 수량은 즉시 취소한다. 체결된 만큼은 filledQty에 남는다
      this.release(order)
      order.status = 'CANCELLED'
    }
    this.fillBook(state)
    this.publish()
    return { ok: true, order: this.orders.find((o) => o.id === order.id)! }
  }

  cancelOrder = (orderId: string): OrderResult => {
    const order = this.orders.find((o) => o.id === orderId)
    if (!order) return { ok: false, reason: '없는 주문입니다' }
    if (order.status === 'FILLED' || order.status === 'CANCELLED') return { ok: false, reason: '이미 끝난 주문입니다' }
    this.release(order)
    order.status = 'CANCELLED'
    this.publish()
    return { ok: true, order: this.orders.find((o) => o.id === orderId)! }
  }

  private initSymbol(info: SymbolInfo, now: number): SymbolState {
    const { upper, lower } = priceLimits(info.prevClose)
    const minute = Math.floor(now / 60_000) * 60
    const candles: Candle[] = []
    let price = info.prevClose
    for (let i = CANDLE_HISTORY - 1; i >= 0; i--) {
      const open = price
      let high = open
      let low = open
      for (let k = 0; k < 6; k++) {
        price = this.walk(price, lower, upper)
        high = Math.max(high, price)
        low = Math.min(low, price)
      }
      candles.push({ time: minute - i * 60, open, high, low, close: price, volume: this.rng.int(200, 3_000) })
    }
    const state: SymbolState = {
      info,
      price,
      volume: candles.reduce((sum, c) => sum + c.volume, 0),
      askQty: new Map(),
      bidQty: new Map(),
      trades: [],
      candles,
      drift: 0,
    }
    this.fillBook(state)
    return state
  }

  private walk(price: number, lower: number, upper: number): number {
    const r = this.rng.next()
    const moved = r > 0.6 ? nextTick(price) : r < 0.4 ? prevTick(price) : price
    return Math.min(upper, Math.max(lower, moved))
  }

  /** 봇 주문 하나가 최우선 호가를 친다. 그 가격에 걸린 내 주문이 있으면 먼저 체결된다. */
  private botTrade(state: SymbolState, now: number): void {
    if (this.rng.next() < 0.02) state.drift = (this.rng.next() - 0.5) * 0.3
    const side: Side = this.rng.next() + state.drift > 0.5 ? 'BUY' : 'SELL'
    const level = side === 'BUY' ? this.bestAsk(state) : this.bestBid(state)
    if (!level) return
    let qty = this.rng.int(1, 60)
    let total = 0

    for (const mine of this.restingAt(state.info.symbol, side === 'BUY' ? 'SELL' : 'BUY', level.price)) {
      const take = Math.min(qty, mine.qty - mine.filledQty)
      this.recordFill(mine, level.price, take, now)
      qty -= take
      total += take
      if (qty === 0) break
    }

    const book = side === 'BUY' ? state.askQty : state.bidQty
    const take = Math.min(qty, book.get(level.price) ?? 0)
    const left = (book.get(level.price) ?? 0) - take
    if (left > 0) book.set(level.price, left)
    else book.delete(level.price)
    total += take

    if (total > 0) this.recordTrade(state, side, level.price, total, now)
    this.fillBook(state)
  }

  /** 새 주문을 반대편 호가와 맞춘다. */
  private matchIncoming(state: SymbolState, order: Order, now: number): void {
    const book = order.side === 'BUY' ? state.askQty : state.bidQty
    while (order.filledQty < order.qty) {
      const level = order.side === 'BUY' ? this.bestAsk(state, false) : this.bestBid(state, false)
      if (!level) break
      if (order.type === 'LIMIT') {
        if (order.side === 'BUY' && level.price > order.price!) break
        if (order.side === 'SELL' && level.price < order.price!) break
      }
      const take = Math.min(order.qty - order.filledQty, level.qty)
      const left = level.qty - take
      if (left > 0) book.set(level.price, left)
      else book.delete(level.price)
      this.recordFill(order, level.price, take, now)
      this.recordTrade(state, order.side, level.price, take, now)
    }
  }

  private recordTrade(state: SymbolState, side: Side, price: number, qty: number, now: number): void {
    state.price = price
    state.volume += qty
    const trade: Trade = { seq: ++this.seq, time: now, symbol: state.info.symbol, price, qty, side }
    state.trades = [trade, ...state.trades].slice(0, TRADE_HISTORY)
    this.recentTradeTimes.push(now)
    this.updateCandle(state, trade)
  }

  /** 내 주문 체결: 잠금 해제, 현금·주식 이동, 수수료. */
  private recordFill(order: Order, price: number, qty: number, now: number): void {
    const amount = price * qty
    const commission = fee(amount)
    const account = this.account
    let holding = account.holdings.find((h) => h.symbol === order.symbol)

    if (order.side === 'BUY') {
      const cost = amount + commission
      const fromLock = Math.min(cost, order.locked)
      order.locked -= fromLock
      account.cashLocked -= fromLock
      account.cashAvailable -= cost - fromLock
      if (!holding) {
        holding = { symbol: order.symbol, qty: 0, lockedQty: 0, avgPrice: 0 }
        account.holdings = [...account.holdings, holding]
      }
      holding.avgPrice = Math.round((holding.avgPrice * holding.qty + amount) / (holding.qty + qty))
      holding.qty += qty
    } else {
      order.locked -= qty
      holding!.lockedQty -= qty
      holding!.qty -= qty
      account.cashAvailable += amount - commission
      if (holding!.qty === 0) account.holdings = account.holdings.filter((h) => h !== holding)
    }

    order.filledQty += qty
    order.fills = [...order.fills, { seq: this.seq + 1, time: now, price, qty, fee: commission }]
    order.status = order.filledQty === order.qty ? 'FILLED' : 'PARTIAL'
    // 다 체결되면 유리한 체결가로 남은 잠금을 푼다
    if (order.status === 'FILLED') this.release(order)
  }

  private release(order: Order): void {
    if (order.side === 'BUY') {
      this.account.cashAvailable += order.locked
      this.account.cashLocked -= order.locked
    } else {
      const holding = this.account.holdings.find((h) => h.symbol === order.symbol)
      if (holding) holding.lockedQty -= order.locked
    }
    order.locked = 0
  }

  private restingAt(symbol: string, side: Side, price: number): Order[] {
    return this.orders
      .filter((o) => o.symbol === symbol && o.side === side && o.type === 'LIMIT' && o.filledQty < o.qty)
      .filter((o) => o.status === 'OPEN' || o.status === 'PARTIAL')
      .filter((o) => (side === 'BUY' ? o.price! >= price : o.price! <= price))
      .sort((a, b) => a.createdAt - b.createdAt)
  }

  private bestAsk(state: SymbolState, includeMine = true): BookLevel | undefined {
    return (includeMine ? this.levels(state).asks : this.sideLevels(state.askQty, 'asc'))[0]
  }

  private bestBid(state: SymbolState, includeMine = true): BookLevel | undefined {
    return (includeMine ? this.levels(state).bids : this.sideLevels(state.bidQty, 'desc'))[0]
  }

  private updateCandle(state: SymbolState, trade: Trade): void {
    const minute = Math.floor(trade.time / 60_000) * 60
    const last = state.candles[state.candles.length - 1]
    if (last && last.time === minute) {
      state.candles = [
        ...state.candles.slice(0, -1),
        {
          ...last,
          high: Math.max(last.high, trade.price),
          low: Math.min(last.low, trade.price),
          close: trade.price,
          volume: last.volume + trade.qty,
        },
      ]
    } else {
      state.candles = [
        ...state.candles.slice(-(CANDLE_HISTORY - 1)),
        { time: minute, open: trade.price, high: trade.price, low: trade.price, close: trade.price, volume: trade.qty },
      ]
    }
  }

  /** 현재가 기준으로 위아래 BOOK_DEPTH개 호가를 채운다. 매도 최우선은 현재가 한 호가 위. */
  private fillBook(state: SymbolState): void {
    const { upper, lower } = priceLimits(state.info.prevClose)
    const asks = new Map<number, number>()
    const bids = new Map<number, number>()
    let ask = nextTick(state.price)
    for (let i = 0; i < BOOK_DEPTH && ask <= upper; i++, ask = nextTick(ask)) {
      asks.set(ask, state.askQty.get(ask) ?? this.rng.int(20, 900))
    }
    let bid = state.price
    for (let i = 0; i < BOOK_DEPTH && bid >= lower; i++, bid = prevTick(bid)) {
      bids.set(bid, state.bidQty.get(bid) ?? this.rng.int(20, 900))
    }
    state.askQty = asks
    state.bidQty = bids
  }

  private jitterBook(state: SymbolState): void {
    for (const map of [state.askQty, state.bidQty]) {
      for (const [price, qty] of map) {
        if (this.rng.next() < 0.08) map.set(price, Math.max(1, qty + this.rng.int(-40, 60)))
      }
    }
  }

  private sideLevels(map: Map<number, number>, order: 'asc' | 'desc'): BookLevel[] {
    return [...map]
      .map(([price, qty]) => ({ price, qty }))
      .sort((a, b) => (order === 'asc' ? a.price - b.price : b.price - a.price))
  }

  /** 다른 참가자 잔량에 내 미체결 잔량을 더한 호가창 */
  private levels(state: SymbolState): { asks: BookLevel[]; bids: BookLevel[] } {
    const merge = (side: Side, map: Map<number, number>, order: 'asc' | 'desc') => {
      const levels = new Map(this.sideLevels(map, order).map((l) => [l.price, { ...l }]))
      for (const o of this.orders) {
        if (o.symbol !== state.info.symbol || o.side !== side || o.type !== 'LIMIT') continue
        if (o.status !== 'OPEN' && o.status !== 'PARTIAL') continue
        const rest = o.qty - o.filledQty
        const level = levels.get(o.price!) ?? { price: o.price!, qty: 0 }
        level.qty += rest
        level.myQty = (level.myQty ?? 0) + rest
        levels.set(o.price!, level)
      }
      return [...levels.values()]
        .sort((a, b) => (order === 'asc' ? a.price - b.price : b.price - a.price))
        .slice(0, BOOK_DEPTH)
    }
    return { asks: merge('SELL', state.askQty, 'asc'), bids: merge('BUY', state.bidQty, 'desc') }
  }

  private publish(): void {
    this.snapshot = this.buildSnapshot()
    this.listeners.forEach((l) => l())
  }

  private buildSnapshot(): MarketSnapshot {
    const quotes: Record<string, Quote> = {}
    const books: Record<string, OrderBook> = {}
    const trades: Record<string, Trade[]> = {}
    const candles: Record<string, Candle[]> = {}
    for (const [symbol, s] of this.states) {
      quotes[symbol] = {
        symbol,
        price: s.price,
        change: s.price - s.info.prevClose,
        changeRate: changeRate(s.price, s.info.prevClose),
        volume: s.volume,
      }
      books[symbol] = { symbol, seq: this.seq, ...this.levels(s) }
      trades[symbol] = s.trades
      candles[symbol] = s.candles
    }
    return {
      quotes,
      books,
      trades,
      candles,
      metrics: {
        tps: this.recentTradeTimes.length,
        p99LatencyMs: this.rng.int(140, 220),
        seq: this.seq,
      },
      // 스냅샷은 불변이어야 하므로 계좌와 주문은 복사해서 내보낸다
      account: { ...this.account, holdings: this.account.holdings.map((h) => ({ ...h })) },
      orders: this.orders.map((o) => ({ ...o })),
    }
  }
}
