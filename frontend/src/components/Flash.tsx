import type { ReactNode } from 'react'
import { useTickDirection } from './useTickDirection'

/**
 * 값이 바뀔 때 등락색 바탕으로 잠깐 깜빡인다 (HTS 체결 하이라이트).
 * key로 다시 마운트해서 CSS 애니메이션을 처음부터 돌린다.
 */
export function Flash({ value, children, className = '' }: { value: number; children: ReactNode; className?: string }) {
  const direction = useTickDirection(value)
  return (
    <span key={value} className={`${className} ${direction ? `flash-${direction}` : ''}`}>
      {children}
    </span>
  )
}
