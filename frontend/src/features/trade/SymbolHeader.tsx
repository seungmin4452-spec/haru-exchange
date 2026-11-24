import { Flash } from '../../components/Flash'
import { TrendIcon } from '../../components/Trend'
import { formatNumber, formatRate, formatSigned, trendClass } from '../../domain/format'
import { priceLimits } from '../../domain/price'
import type { Candle, MarketMetrics, Quote, SymbolInfo } from '../../domain/types'

interface Props {
  info: SymbolInfo
  quote: Quote
  candles: Candle[]
  metrics: MarketMetrics
}

export function SymbolHeader({ info, quote, candles, metrics }: Props) {
  const trend = trendClass(quote.change)
  const { upper, lower } = priceLimits(info.prevClose)
  const high = Math.max(...candles.map((c) => c.high))
  const low = Math.min(...candles.map((c) => c.low))

  return (
    <section className="panel symbol-header" aria-label={`${info.name} 시세 요약`}>
      <div className="symbol-title">
        <h1>
          {info.name}
          <small>{info.symbol}</small>
        </h1>
        <p className={`symbol-price num ${trend}`}>
          <Flash value={quote.price} className="symbol-price-value">
            {formatNumber(quote.price)}
          </Flash>
          <span className="symbol-change">
            <TrendIcon value={quote.change} />
            {formatSigned(quote.change)} ({formatRate(quote.changeRate)})
          </span>
        </p>
      </div>
      <dl className="symbol-stats num">
        <div><dt>고가</dt><dd className={trendClass(high - info.prevClose)}>{formatNumber(high)}</dd></div>
        <div><dt>저가</dt><dd className={trendClass(low - info.prevClose)}>{formatNumber(low)}</dd></div>
        <div><dt>상한가</dt><dd className="up">{formatNumber(upper)}</dd></div>
        <div><dt>하한가</dt><dd className="down">{formatNumber(lower)}</dd></div>
        <div><dt>거래량</dt><dd>{formatNumber(quote.volume)}</dd></div>
      </dl>
      <dl className="symbol-stats engine-stats num" aria-label="엔진 지표">
        <div><dt>체결 TPS</dt><dd>{formatNumber(metrics.tps)}</dd></div>
        <div><dt>p99 지연</dt><dd>{metrics.p99LatencyMs}ms</dd></div>
        <div><dt>엔진 순번</dt><dd>{formatNumber(metrics.seq)}</dd></div>
      </dl>
    </section>
  )
}
