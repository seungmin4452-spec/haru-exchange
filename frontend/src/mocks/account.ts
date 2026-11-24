/**
 * 화면 개발용 가상 계좌. 주문·잔고 API(2단계)와 연동하기 전까지만 쓴다.
 * 금액은 정수 원이다.
 */
export interface Holding {
  symbol: string
  qty: number
  lockedQty: number
  avgPrice: number
}

export interface MockAccount {
  cashAvailable: number
  cashLocked: number
  holdings: Holding[]
}

export const mockAccount: MockAccount = {
  cashAvailable: 12_480_000,
  cashLocked: 0,
  holdings: [
    { symbol: 'HARU', qty: 80, lockedQty: 0, avgPrice: 47_400 },
    { symbol: 'TOUR', qty: 150, lockedQty: 0, avgPrice: 16_900 },
    { symbol: 'CUTN', qty: 300, lockedQty: 0, avgPrice: 8_210 },
  ],
}
