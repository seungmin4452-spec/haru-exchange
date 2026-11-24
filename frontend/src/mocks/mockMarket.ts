import { nextTick, prevTick, priceLimits, changeRate } from '../domain/price'
import type { BookLevel, Candle, MarketSnapshot, OrderBook, Quote, Side, SymbolInfo, Trade } from '../domain/types'
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
  /** 가격 → 잔량. 호가창을 다시 그려도 같은 가격의 잔량이 유지되게 한다 */
  askQty: Map<number, number>
  bidQty: Map<number, number>
  trades: Trade[]
  candles: Candle[]
  /** 작은 추세. 봇이 한쪽으로 몰리는 장면을 흉내 낸다 */
  drift: number
}

/**
 * 백엔드 없이 화면을 만들기 위한 가상 시장.
 * 실제 매칭 엔진이 아니다. 체결 규칙(가격·시간 우선)을 흉내만 내고, 정합성은 보장하지 않는다.
 */
export class MockMarket implements MarketSource {
  private readonly rng: Rng
  private readonly states = new Map<string, SymbolState>()
  private seq = 1_204_000
  private recentTradeTimes: number[] = []
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
      this.trade(state, now + i)
    }
    for (const state of this.states.values()) this.jitterBook(state)
    this.recentTradeTimes = this.recentTradeTimes.filter((t) => now - t < 1000)
    this.snapshot = this.buildSnapshot()
    this.listeners.forEach((l) => l())
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
        price = this.walk(price, 0, lower, upper)
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

  private walk(price: number, drift: number, lower: number, upper: number): number {
    const r = this.rng.next() + drift
    const moved = r > 0.6 ? nextTick(price) : r < 0.4 ? prevTick(price) : price
    return Math.min(upper, Math.max(lower, moved))
  }

  private trade(state: SymbolState, now: number): void {
    if (this.rng.next() < 0.02) state.drift = (this.rng.next() - 0.5) * 0.3
    const side: Side = this.rng.next() + state.drift > 0.5 ? 'BUY' : 'SELL'
    const book = this.levels(state)
    const level = side === 'BUY' ? book.asks[0] : book.bids[0]
    if (!level) return
    const qty = Math.min(level.qty, this.rng.int(1, 60))
    const sideQty = side === 'BUY' ? state.askQty : state.bidQty
    const left = level.qty - qty
    if (left > 0) {
      sideQty.set(level.price, left)
    } else {
      // 최우선 호가를 다 먹으면 그 가격대가 사라지고 호가창이 한 칸 밀린다
      sideQty.delete(level.price)
    }
    state.price = level.price
    state.volume += qty
    const trade: Trade = { seq: ++this.seq, time: now, symbol: state.info.symbol, price: level.price, qty, side }
    state.trades = [trade, ...state.trades].slice(0, TRADE_HISTORY)
    this.recentTradeTimes.push(now)
    this.updateCandle(state, trade)
    this.fillBook(state)
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

  private levels(state: SymbolState): { asks: BookLevel[]; bids: BookLevel[] } {
    const asks = [...state.askQty].map(([price, qty]) => ({ price, qty })).sort((a, b) => a.price - b.price)
    const bids = [...state.bidQty].map(([price, qty]) => ({ price, qty })).sort((a, b) => b.price - a.price)
    return { asks, bids }
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
    }
  }
}
