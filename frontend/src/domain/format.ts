const krw = new Intl.NumberFormat('ko-KR')

export function formatNumber(value: number): string {
  return krw.format(value)
}

export function formatSigned(value: number): string {
  if (value === 0) return '0'
  return `${value > 0 ? '+' : '-'}${krw.format(Math.abs(value))}`
}

export function formatRate(rate: number): string {
  const fixed = Math.abs(rate).toFixed(2)
  if (rate > 0) return `+${fixed}%`
  if (rate < 0) return `-${fixed}%`
  return `${fixed}%`
}

const clock = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Seoul',
})

/** HH:mm:ss.SSS (한국 시간) */
export function formatTime(epochMs: number): string {
  return `${clock.format(epochMs)}.${String(epochMs % 1000).padStart(3, '0')}`
}

/** 등락 방향에 맞는 CSS 클래스 */
export function trendClass(value: number): 'up' | 'down' | 'flat' {
  if (value > 0) return 'up'
  if (value < 0) return 'down'
  return 'flat'
}
