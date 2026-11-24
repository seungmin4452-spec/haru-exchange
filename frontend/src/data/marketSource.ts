import type { MarketSnapshot, OrderRequest, OrderResult } from '../domain/types'

/**
 * 시세와 내 주문·잔고의 출처. 지금은 MockMarket이고, 연동 시(F.13) 백엔드 구현으로 바꾼다.
 * useSyncExternalStore 규약을 따른다: 상태가 바뀔 때마다 새 스냅샷 객체를 돌려준다.
 */
export interface MarketSource {
  getSnapshot(): MarketSnapshot
  subscribe(listener: () => void): () => void
  submitOrder(request: OrderRequest): OrderResult
  cancelOrder(orderId: string): OrderResult
}
