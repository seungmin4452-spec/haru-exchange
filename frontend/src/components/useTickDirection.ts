import { useState } from 'react'

/**
 * 값이 바뀐 방향을 기억한다. 렌더 중 상태 조정 패턴이라 effect가 필요 없다.
 * 같은 값으로 다시 렌더되면 마지막 방향을 유지한다.
 */
export function useTickDirection(value: number): 'up' | 'down' | null {
  const [prev, setPrev] = useState(value)
  const [direction, setDirection] = useState<'up' | 'down' | null>(null)
  if (value !== prev) {
    setPrev(value)
    setDirection(value > prev ? 'up' : 'down')
  }
  return direction
}
