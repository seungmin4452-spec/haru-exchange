import { trendClass } from '../domain/format'

/** 등락 삼각형. 유니코드 기호 대신 SVG로 그린다. */
export function TrendIcon({ value }: { value: number }) {
  const trend = trendClass(value)
  if (trend === 'flat') return null
  return (
    <svg className={`trend-icon ${trend}`} width="8" height="7" viewBox="0 0 8 7" aria-hidden="true">
      <path d={trend === 'up' ? 'M4 0 8 7H0Z' : 'M4 7 0 0h8Z'} fill="currentColor" />
    </svg>
  )
}
