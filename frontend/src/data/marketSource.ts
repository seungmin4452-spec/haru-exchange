import type { MarketSnapshot } from '../domain/types'

/**
 * 시세 데이터의 출처. 지금은 MockMarket이고, F.13에서 WebSocket 구현으로 바꾼다.
 * useSyncExternalStore 규약을 따른다: 상태가 바뀔 때마다 새 스냅샷 객체를 돌려준다.
 */
export interface MarketSource {
  getSnapshot(): MarketSnapshot
  subscribe(listener: () => void): () => void
}
