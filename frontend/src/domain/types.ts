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
}

export interface MarketSnapshot {
  quotes: Record<string, Quote>
  books: Record<string, OrderBook>
  /** 종목별 최근 체결, 최신이 앞 */
  trades: Record<string, Trade[]>
  candles: Record<string, Candle[]>
  metrics: MarketMetrics
}
