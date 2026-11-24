import {
  CandlestickSeries,
  createChart,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import { baseChartOptions, cssVar, toChartTime } from '../../components/chartTheme'
import type { Candle } from '../../domain/types'

interface Series {
  chart: IChartApi
  candles: ISeriesApi<'Candlestick'>
  volume: ISeriesApi<'Histogram'>
}

export function CandleChart({ symbol, candles }: { symbol: string; candles: Candle[] }) {
  const container = useRef<HTMLDivElement>(null)
  const series = useRef<Series | null>(null)
  const loadedSymbol = useRef<string | null>(null)

  useEffect(() => {
    const el = container.current!
    const up = cssVar('--color-up')
    const down = cssVar('--color-down')
    const chart = createChart(el, baseChartOptions())
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: up,
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down,
      priceLineColor: cssVar('--color-text-sub'),
    })
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    })
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    series.current = { chart, candles: candleSeries, volume: volumeSeries }
    return () => {
      chart.remove()
      series.current = null
      loadedSymbol.current = null
    }
  }, [])

  useEffect(() => {
    const s = series.current
    if (!s || candles.length === 0) return
    const upSoft = cssVar('--color-up-soft')
    const downSoft = cssVar('--color-down-soft')
    const toVolume = (c: Candle) => ({
      time: toChartTime(c.time),
      value: c.volume,
      color: c.close >= c.open ? upSoft : downSoft,
    })
    const toBar = (c: Candle) => ({ time: toChartTime(c.time), open: c.open, high: c.high, low: c.low, close: c.close })

    if (loadedSymbol.current !== symbol) {
      s.candles.setData(candles.map(toBar))
      s.volume.setData(candles.map(toVolume))
      s.chart.timeScale().scrollToRealTime()
      loadedSymbol.current = symbol
    } else {
      const last = candles[candles.length - 1]
      s.candles.update(toBar(last))
      s.volume.update(toVolume(last))
    }
  }, [symbol, candles])

  return (
    <section className="panel chart-panel" aria-label="1분봉 차트">
      <header className="panel-head">
        <h2 className="panel-title">1분봉</h2>
        <span className="panel-meta">가상 시세</span>
      </header>
      <div ref={container} className="chart-canvas" />
    </section>
  )
}
