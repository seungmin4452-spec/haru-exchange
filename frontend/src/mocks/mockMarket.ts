import { fee } from '../domain/fees'
import { changeRate, nextTick, prevTick, priceLimits, tickSize } from '../domain/price'
import type {
  Account,
  BookLevel,
  Candle,
  MarketSnapshot,
  MetricPoint,
  NewsItem,
  NewsTone,
  SimConfig,
  EngineState,
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
/** 기획서: 1분 안에 ±10% 움직이면 2분간 신규 체결 정지 */
const BREAKER_RATE = 10
const BREAKER_WINDOW_MS = 60_000
const BREAKER_HALT_MS = 120_000
const NEWS_EFFECT_MS = 30_000
const METRIC_HISTORY = 120
const MAX_TRADES_PER_TICK = 60
/** 가상 스냅샷 주기. 이 순번 간격마다 스냅샷을 찍는다고 가정한다 */
const SNAPSHOT_EVERY = 500
/** 명령 로그 재생에 걸리는 틱 수 (약 5초) */
const REPLAY_TICKS = 25

/** FNV-1a 32비트. 호가창 내용이 같으면 같은 해시가 나온다 */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

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
  /** 뉴스 효과가 끝나는 시각. 그 전에는 drift를 바꾸지 않는다 */
  newsUntil: number
  haltedUntil?: number
  /** 1초 간격 가격 기록, 서킷브레이커 기준가 */
  priceHistory: { time: number; price: number }[]
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
  private sim: SimConfig = { running: true, bots: 40, ordersPerSecond: 12 }
  private news: NewsItem[] = []
  private nextNewsId = 1
  private metricHistory: MetricPoint[] = []
  private lastMetricSecond = 0
  private lastP99 = 160
  private engine: EngineState = { status: 'RUNNING', replayed: 0, replayTotal: 0, duplicates: 0, log: [] }
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
    this.releaseHalts(now)
    this.advanceReplay(now)
    if (this.engine.status === 'RUNNING' && this.sim.running && this.sim.bots > 0) {
      const expected = (this.sim.ordersPerSecond * TICK_MS) / 1000
      const count = Math.min(MAX_TRADES_PER_TICK, Math.floor(expected) + (this.rng.next() < expected % 1 ? 1 : 0))
      const open = [...this.states.values()].filter((st) => !st.haltedUntil)
      for (let i = 0; i < count && open.length > 0; i++) {
        this.botTrade(this.rng.pick(open), now + i)
      }
      for (const state of this.states.values()) {
        if (state.newsUntil && state.newsUntil <= now) {
          state.newsUntil = 0
          state.drift = 0
        }
        this.checkBreaker(state, now)
      }
    }
    // 엔진이 멈춰 있으면 호가창도 그대로여야 한다 (복구 전후 해시 비교)
    if (this.engine.status === 'RUNNING') for (const state of this.states.values()) this.jitterBook(state)
    this.recentTradeTimes = this.recentTradeTimes.filter((t) => now - t < 1000)
    this.recordSecond(now)
    this.publish()
  }

  /**
   * 장애 복구 데모. 실제 엔진 복구가 아니라 화면 흐름을 흉내 낸다.
   * 시장을 멈춘 채로 해시를 다시 계산하므로 목 데이터에서는 항상 일치한다.
   * 진짜 검증은 백엔드 3단계(Kafka·복구)에서 하고, 연동 후 이 값을 실제 결과로 바꾼다.
   */
  crashEngine = (now = Date.now()): void => {
    if (this.engine.status !== 'RUNNING') return
    const crashSeq = this.seq
    const snapshotSeq = crashSeq - (crashSeq % SNAPSHOT_EVERY)
    this.engine = {
      status: 'CRASHED',
      crashSeq,
      snapshotSeq,
      replayed: 0,
      replayTotal: crashSeq - snapshotSeq,
      duplicates: 0,
      hashesBefore: this.bookHashes(),
      hashesAfter: undefined,
      log: [{ time: now, text: `매칭 엔진 강제 종료 · 마지막 처리 순번 ${crashSeq.toLocaleString()}` }],
    }
    this.publish()
  }

  startRecovery = (now = Date.now()): void => {
    if (this.engine.status !== 'CRASHED') return
    const { snapshotSeq = 0, replayTotal } = this.engine
    this.engine = {
      ...this.engine,
      status: 'REPLAYING',
      log: [
        ...this.engine.log,
        { time: now, text: `스냅샷 로드 · 순번 ${snapshotSeq.toLocaleString()}` },
        { time: now, text: `명령 로그 재생 시작 · ${replayTotal.toLocaleString()}건` },
      ],
    }
    this.publish()
  }

  resumeEngine = (now = Date.now()): void => {
    if (this.engine.status !== 'VERIFIED') return
    this.engine = {
      ...this.engine,
      status: 'RUNNING',
      log: [...this.engine.log, { time: now, text: '연속 매매 재개' }],
    }
    this.publish()
  }

  private advanceReplay(now: number): void {
    const engine = this.engine
    if (engine.status !== 'REPLAYING') return
    const step = Math.max(1, Math.ceil(engine.replayTotal / REPLAY_TICKS))
    const replayed = Math.min(engine.replayTotal, engine.replayed + step)
    if (replayed < engine.replayTotal) {
      this.engine = { ...engine, replayed }
      return
    }
    const after = this.bookHashes()
    const mismatched = Object.keys(after).filter((k) => after[k] !== engine.hashesBefore?.[k]).length
    this.engine = {
      ...engine,
      replayed,
      status: 'VERIFIED',
      hashesAfter: after,
      log: [
        ...engine.log,
        { time: now, text: `명령 로그 재생 완료 · 순번 ${engine.crashSeq?.toLocaleString()}까지` },
        {
          time: now,
          text: mismatched === 0 ? '호가창 해시 8종목 모두 일치 · 중복 반영 0건' : `호가창 해시 불일치 ${mismatched}종목`,
        },
      ],
    }
  }

  /** 종목별 호가창(가격·잔량·내 주문)을 순서대로 이어 붙여 해시한다 */
  private bookHashes(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [symbol, state] of this.states) {
      const { asks, bids } = this.levels(state)
      const text = [...asks.map((l) => `A${l.price}:${l.qty}:${l.myQty ?? 0}`), ...bids.map((l) => `B${l.price}:${l.qty}:${l.myQty ?? 0}`)].join('|')
      result[symbol] = fnv1a(`${symbol}|${text}`)
    }
    return result
  }

  setSimConfig = (config: Partial<SimConfig>): void => {
    this.sim = {
      ...this.sim,
      ...config,
      bots: Math.max(0, Math.round(config.bots ?? this.sim.bots)),
      ordersPerSecond: Math.max(0, Math.round(config.ordersPerSecond ?? this.sim.ordersPerSecond)),
    }
    this.publish()
  }

  publishNews = (symbol: string, headline: string, tone: Exclude<NewsTone, 'SYSTEM'>, now = Date.now()): void => {
    const state = this.states.get(symbol)
    if (!state) return
    // 봇 대부분이 같은 방향으로 주문해 가격이 빠르게 한쪽으로 움직인다
    state.drift = tone === 'POSITIVE' ? 0.42 : -0.42
    state.newsUntil = now + NEWS_EFFECT_MS
    this.pushNews(now, symbol, headline, tone)
    this.publish()
  }

  private pushNews(time: number, symbol: string, headline: string, tone: NewsTone): void {
    this.news = [{ id: this.nextNewsId++, time, symbol, headline, tone }, ...this.news].slice(0, 30)
  }

  private checkBreaker(state: SymbolState, now: number): void {
    if (state.haltedUntil) return
    const ref = state.priceHistory.find((p) => now - p.time <= BREAKER_WINDOW_MS)
    if (!ref) return
    const rate = changeRate(state.price, ref.price)
    if (Math.abs(rate) >= BREAKER_RATE) {
      state.haltedUntil = now + BREAKER_HALT_MS
      state.newsUntil = 0
      state.drift = 0
      const sign = rate > 0 ? '+' : ''
      this.pushNews(now, state.info.symbol, `서킷브레이커 발동: 1분간 ${sign}${rate.toFixed(1)}%, 2분간 체결 정지`, 'SYSTEM')
    }
  }

  private releaseHalts(now: number): void {
    for (const state of this.states.values()) {
      if (state.haltedUntil && state.haltedUntil <= now) {
        state.haltedUntil = undefined
        // 재개 직후 같은 변동으로 다시 걸리지 않게 기준가를 새로 잡는다
        state.priceHistory = [{ time: now, price: state.price }]
        this.pushNews(now, state.info.symbol, '거래 재개: 연속 매매로 돌아갑니다', 'SYSTEM')
      }
    }
  }

  private recordSecond(now: number): void {
    const second = Math.floor(now / 1000)
    if (second === this.lastMetricSecond) return
    this.lastMetricSecond = second
    for (const state of this.states.values()) {
      const recent = state.priceHistory.filter((p) => now - p.time <= BREAKER_WINDOW_MS)
      state.priceHistory = [...recent, { time: now, price: state.price }]
    }
    // 가상 지연: 주문 속도가 오를수록 p99가 완만하게 늘어난다
    const load = this.sim.running ? this.sim.ordersPerSecond : 0
    this.lastP99 = Math.round(120 + load * 0.08 + this.rng.int(0, 40))
    this.metricHistory = [
      ...this.metricHistory.slice(-(METRIC_HISTORY - 1)),
      { time: second, tps: this.recentTradeTimes.length, p99LatencyMs: this.lastP99 },
    ]
  }

  submitOrder = (request: OrderRequest, now = Date.now()): OrderResult => {
    const state = this.states.get(request.symbol)
    if (!state) return { ok: false, reason: '없는 종목입니다' }
    if (this.engine.status !== 'RUNNING') return { ok: false, reason: '매칭 엔진 복구 중입니다. 잠시 후 다시 주문하세요' }
    if (state.haltedUntil) return { ok: false, reason: '거래 정지 중입니다. 취소만 할 수 있습니다' }
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

  /**
   * 정정. 기획서 규칙: 가격을 바꾸거나 수량을 늘리면 시간 우선순위를 잃고, 수량만 줄이면 유지한다.
   * 잠금은 남은 수량 기준으로 다시 계산한다.
   */
  amendOrder = (orderId: string, change: { price?: number; qty?: number }, now = Date.now()): OrderResult => {
    const order = this.orders.find((o) => o.id === orderId)
    if (!order) return { ok: false, reason: '없는 주문입니다' }
    if (order.status === 'FILLED' || order.status === 'CANCELLED') return { ok: false, reason: '이미 끝난 주문은 정정할 수 없습니다' }
    if (order.type !== 'LIMIT') return { ok: false, reason: '시장가 주문은 정정할 수 없습니다' }
    if (this.engine.status !== 'RUNNING') return { ok: false, reason: '매칭 엔진 복구 중입니다' }
    const state = this.states.get(order.symbol)!
    if (state.haltedUntil) return { ok: false, reason: '거래 정지 중입니다. 취소만 할 수 있습니다' }

    const price = change.price ?? order.price!
    const qty = change.qty ?? order.qty
    const remaining = qty - order.filledQty
    if (!Number.isInteger(qty) || remaining < 1) {
      return { ok: false, reason: `수량은 이미 체결된 ${order.filledQty}주보다 많아야 합니다` }
    }
    const { upper, lower } = priceLimits(state.info.prevClose)
    if (price < lower || price > upper) return { ok: false, reason: '가격이 상·하한가를 벗어났습니다' }
    if (price % tickSize(price) !== 0) return { ok: false, reason: `이 가격대의 호가 단위는 ${tickSize(price)}원입니다` }
    if (price === order.price && qty === order.qty) return { ok: false, reason: '바뀐 내용이 없습니다' }

    if (order.side === 'BUY') {
      const lock = price * remaining + fee(price * remaining)
      const diff = lock - order.locked
      if (diff > this.account.cashAvailable) return { ok: false, reason: '주문 가능 금액이 부족합니다' }
      this.account.cashAvailable -= diff
      this.account.cashLocked += diff
      order.locked = lock
    } else {
      const holding = this.account.holdings.find((h) => h.symbol === order.symbol)!
      const diff = remaining - order.locked
      if (diff > holding.qty - holding.lockedQty) return { ok: false, reason: '매도 가능 수량을 넘었습니다' }
      holding.lockedQty += diff
      order.locked = remaining
    }

    const losesPriority = price !== order.price || qty > order.qty
    order.price = price
    order.qty = qty
    if (losesPriority) order.createdAt = now
    this.matchIncoming(state, order, now)
    this.fillBook(state)
    this.publish()
    return { ok: true, order: this.orders.find((o) => o.id === orderId)! }
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
      newsUntil: 0,
      priceHistory: [{ time: now, price }],
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
    if (!state.newsUntil && this.rng.next() < 0.02) state.drift = (this.rng.next() - 0.5) * 0.3
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
        p99LatencyMs: this.lastP99,
        seq: this.seq,
        consumerLag: this.sim.running ? Math.round(this.recentTradeTimes.length * 0.04) : 0,
      },
      // 스냅샷은 불변이어야 하므로 계좌와 주문은 복사해서 내보낸다
      account: { ...this.account, holdings: this.account.holdings.map((h) => ({ ...h })) },
      orders: this.orders.map((o) => ({ ...o })),
      sim: { ...this.sim },
      news: this.news,
      halts: Object.fromEntries([...this.states].map(([symbol, st]) => [symbol, st.haltedUntil])),
      oneMinuteChange: Object.fromEntries(
        [...this.states].map(([symbol, st]) => [symbol, changeRate(st.price, st.priceHistory[0]?.price ?? st.price)]),
      ),
      metricHistory: this.metricHistory,
      engine: { ...this.engine },
      bookHashes: this.bookHashes(),
    }
  }
}
