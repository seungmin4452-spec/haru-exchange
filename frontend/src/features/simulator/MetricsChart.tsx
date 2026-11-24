import { createChart, LineSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import { baseChartOptions, cssVar, toChartTime } from '../../components/chartTheme'
import type { MetricPoint } from '../../domain/types'

interface Series {
  chart: IChartApi
  tps: ISeriesApi<'Line'>
  p99: ISeriesApi<'Line'>
}

/** 체결 TPS(왼쪽 축)와 p99 지연(오른쪽 축)을 1초 간격으로 그린다. */
export function MetricsChart({ history }: { history: MetricPoint[] }) {
  const container = useRef<HTMLDivElement>(null)
  const series = useRef<Series | null>(null)

  useEffect(() => {
    const options = baseChartOptions()
    const chart = createChart(container.current!, {
      ...options,
      leftPriceScale: { ...options.leftPriceScale, visible: true },
      timeScale: { ...options.timeScale, secondsVisible: true },
      localization: { locale: 'ko-KR' },
    })
    const tps = chart.addSeries(LineSeries, {
      priceScaleId: 'left',
      color: cssVar('--color-text'),
      lineWidth: 2,
      priceLineVisible: false,
      priceFormat: { type: 'custom', formatter: (v: number) => String(Math.round(v)), minMove: 1 },
      title: 'TPS',
    })
    const p99 = chart.addSeries(LineSeries, {
      priceScaleId: 'right',
      color: cssVar('--color-warn'),
      lineWidth: 1,
      priceLineVisible: false,
      priceFormat: { type: 'custom', formatter: (v: number) => `${Math.round(v)}ms` },
      title: 'p99',
    })
    series.current = { chart, tps, p99 }
    return () => {
      chart.remove()
      series.current = null
    }
  }, [])

  useEffect(() => {
    const s = series.current
    if (!s) return
    s.tps.setData(history.map((p) => ({ time: toChartTime(p.time), value: p.tps })))
    s.p99.setData(history.map((p) => ({ time: toChartTime(p.time), value: p.p99LatencyMs })))
    s.chart.timeScale().fitContent()
  }, [history])

  return <div ref={container} className="metrics-canvas" />
}
