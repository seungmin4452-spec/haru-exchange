/**
 * 시드 고정 난수(mulberry32). 같은 시드면 같은 가상 시장이 만들어져
 * 화면 확인과 데모 녹화를 반복할 수 있다.
 */
export function createRng(seed: number) {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
  }
}

export type Rng = ReturnType<typeof createRng>
