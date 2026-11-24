import type { MarketSnapshot, NewsTone, OrderRequest, OrderResult, SimConfig } from '../domain/types'

/**
 * 시세와 내 주문·잔고의 출처. 지금은 MockMarket이고, 연동 시(F.13) 백엔드 구현으로 바꾼다.
 * useSyncExternalStore 규약을 따른다: 상태가 바뀔 때마다 새 스냅샷 객체를 돌려준다.
 */
export interface MarketSource {
  getSnapshot(): MarketSnapshot
  subscribe(listener: () => void): () => void
  submitOrder(request: OrderRequest): OrderResult
  cancelOrder(orderId: string): OrderResult
  /** 정정: 가격을 바꾸거나 수량을 늘리면 시간 우선순위를 잃는다 */
  amendOrder(orderId: string, change: { price?: number; qty?: number }): OrderResult
  /** 시뮬레이터: 봇 수, 주문 속도, 일시 정지 */
  setSimConfig(config: Partial<SimConfig>): void
  /** 시뮬레이터: 가상 뉴스 발행. 봇이 반응해 가격이 한쪽으로 움직인다 */
  publishNews(symbol: string, headline: string, tone: Exclude<NewsTone, 'SYSTEM'>): void
  /** 장애 복구 데모: 매칭 엔진 강제 종료 */
  crashEngine(): void
  /** 장애 복구 데모: 스냅샷을 읽고 명령 로그를 재생한다 */
  startRecovery(): void
  /** 장애 복구 데모: 검증이 끝나면 연속 매매를 재개한다 */
  resumeEngine(): void
  /** 운영 콘솔 */
  openMarket(): void
  closeMarket(): void
  haltSymbol(symbol: string): void
  resumeSymbol(symbol: string): void
  retryDlq(id: string): void
  discardDlq(id: string): void
}
