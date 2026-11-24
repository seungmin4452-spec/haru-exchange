/** 기획서 3장의 가상 규칙: 호가 단위와 상·하한가(전일 종가 ±30%). */

export function tickSize(price: number): number {
  if (price < 10_000) return 10
  if (price < 50_000) return 50
  return 100
}

/** 가격을 그 가격대의 호가 단위로 내린다. */
export function floorToTick(price: number): number {
  const tick = tickSize(price)
  return Math.floor(price / tick) * tick
}

/** 가격을 그 가격대의 호가 단위로 올린다. */
export function ceilToTick(price: number): number {
  const tick = tickSize(price)
  return Math.ceil(price / tick) * tick
}

/** 한 호가 위. 가격대 경계에서는 위 가격대의 단위를 쓴다. */
export function nextTick(price: number): number {
  return ceilToTick(price + tickSize(price))
}

/** 한 호가 아래. 가격대 경계에서는 아래 가격대의 단위를 쓴다. */
export function prevTick(price: number): number {
  return floorToTick(price - tickSize(price - 1))
}

export function priceLimits(prevClose: number): { upper: number; lower: number } {
  return {
    upper: floorToTick(Math.floor(prevClose * 1.3)),
    lower: ceilToTick(Math.ceil(prevClose * 0.7)),
  }
}

export function changeRate(price: number, prevClose: number): number {
  return ((price - prevClose) / prevClose) * 100
}
