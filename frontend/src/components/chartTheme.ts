import { ColorType, type ChartOptions, type DeepPartial, type UTCTimestamp } from 'lightweight-charts'

const KST_OFFSET = 9 * 60 * 60

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** 차트 라이브러리는 UTC 기준이라 한국 시간으로 옮겨서 넘긴다. epoch seconds를 받는다. */
export const toChartTime = (time: number) => (time + KST_OFFSET) as UTCTimestamp

/** 패널 위에 놓이는 차트의 공통 모양. 디자인 토큰에서 색을 읽는다. */
export function baseChartOptions(): DeepPartial<ChartOptions> {
  return {
    autoSize: true,
    layout: {
      background: { type: ColorType.Solid, color: cssVar('--color-panel') },
      textColor: cssVar('--color-text-sub'),
      fontFamily: cssVar('--font-sans'),
      fontSize: 12,
      attributionLogo: true,
    },
    grid: {
      vertLines: { color: cssVar('--color-line') },
      horzLines: { color: cssVar('--color-line') },
    },
    rightPriceScale: { borderColor: cssVar('--color-line') },
    leftPriceScale: { borderColor: cssVar('--color-line') },
    timeScale: { borderColor: cssVar('--color-line'), timeVisible: true, secondsVisible: false },
    localization: { locale: 'ko-KR', priceFormatter: (p: number) => Math.round(p).toLocaleString('ko-KR') },
  }
}
