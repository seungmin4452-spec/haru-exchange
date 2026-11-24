/**
 * 화면이 쓰는 도메인 타입. 백엔드 API가 생기면(F.13) 응답을 이 타입으로 변환한다.
 * 가격과 금액은 모두 정수 원이다 (기획서: double 금지).
 */

export type Side = 'BUY' | 'SELL'

export interface SymbolInfo {
  symbol: string
  name: string
  /** 전일 종가. 등락률과 상·하한가의 기준 */
  prevClose: number
}

export interface Quote {
  symbol: string
  price: number
  /** 전일 대비 (원) */
  change: number
  /** 전일 대비 (%) */
  changeRate: number
  volume: number
}

export interface BookLevel {
  price: number
  qty: number
  /** 이 가격에 걸린 내 주문 잔량 */
  myQty?: number
}

export interface OrderBook {
  symbol: string
  /** 이 호가창을 만든 마지막 엔진 순번 */
  seq: number
  /** 낮은 가격 → 높은 가격 */
  asks: BookLevel[]
  /** 높은 가격 → 낮은 가격 */
  bids: BookLevel[]
}

export interface Trade {
  seq: number
  /** epoch ms. 엔진은 명령에 기록된 시각을 쓴다 */
  time: number
  symbol: string
  price: number
  qty: number
  /** 체결을 일으킨(공격한) 쪽 */
  side: Side
}

export interface Candle {
  /** 봉 시작 시각, epoch seconds */
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface MarketMetrics {
  /** 최근 1초 체결 수 */
  tps: number
  p99LatencyMs: number
  /** 전체 엔진 순번 */
  seq: number
  /** 체결 이벤트 소비 지연 (건) */
  consumerLag: number
}

export interface MarketSnapshot {
  quotes: Record<string, Quote>
  books: Record<string, OrderBook>
  /** 종목별 최근 체결, 최신이 앞 */
  trades: Record<string, Trade[]>
  candles: Record<string, Candle[]>
  metrics: MarketMetrics
  account: Account
  /** 내 주문, 최신이 앞 */
  orders: Order[]
  sim: SimConfig
  /** 가상 뉴스와 시장 이벤트, 최신이 앞 */
  news: NewsItem[]
  /** 종목별 거래 정지 해제 시각 (epoch ms). 정지가 아니면 없다 */
  halts: Record<string, number | undefined>
  /** 종목별 1분 전 대비 등락률 (%) */
  oneMinuteChange: Record<string, number>
  /** 1초 간격 지표, 최근 120개 */
  metricHistory: MetricPoint[]
}

export type OrderType = 'LIMIT' | 'MARKET'
export type OrderStatus = 'OPEN' | 'PARTIAL' | 'FILLED' | 'CANCELLED'

export interface OrderRequest {
  symbol: string
  side: Side
  type: OrderType
  /** 지정가일 때만 */
  price?: number
  qty: number
}

export interface Fill {
  seq: number
  time: number
  price: number
  qty: number
  fee: number
}

export interface Order {
  id: string
  symbol: string
  side: Side
  type: OrderType
  /** 지정가. 시장가는 undefined */
  price?: number
  qty: number
  filledQty: number
  status: OrderStatus
  createdAt: number
  /** 매수: 아직 잠겨 있는 현금. 매도: 아직 잠겨 있는 주식 수 */
  locked: number
  fills: Fill[]
}

export interface Holding {
  symbol: string
  qty: number
  lockedQty: number
  /** 평균 매입가 (수수료 제외) */
  avgPrice: number
}

export interface Account {
  cashAvailable: number
  cashLocked: number
  holdings: Holding[]
}

export type OrderResult = { ok: true; order: Order } | { ok: false; reason: string }

/** 시장 시뮬레이터 설정 (기획서 4장: 봇 수와 주문 속도 조절) */
export interface SimConfig {
  running: boolean
  bots: number
  /** 초당 봇 주문 수 */
  ordersPerSecond: number
}

export type NewsTone = 'POSITIVE' | 'NEGATIVE' | 'SYSTEM'

export interface NewsItem {
  id: number
  time: number
  symbol: string
  headline: string
  tone: NewsTone
}

export interface MetricPoint {
  /** epoch seconds */
  time: number
  tps: number
  p99LatencyMs: number
}
