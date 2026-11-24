import { useSyncExternalStore } from 'react'
import { MockMarket } from '../mocks/mockMarket'
import type { MarketSource } from './marketSource'

/** 앱 전체가 공유하는 시세 출처. 연동(F.13) 시 이 한 줄만 바꾼다. */
export const marketSource: MarketSource = new MockMarket()

export function useMarket() {
  return useSyncExternalStore(marketSource.subscribe, marketSource.getSnapshot)
}
