import { NavLink } from 'react-router'
import { Flash } from '../../components/Flash'
import { TrendIcon } from '../../components/Trend'
import { formatNumber, formatRate, trendClass } from '../../domain/format'
import type { Quote } from '../../domain/types'
import { mockSymbols } from '../../mocks/symbols'

export function WatchList({ quotes }: { quotes: Record<string, Quote> }) {
  return (
    <section className="panel watchlist" aria-labelledby="watchlist-title">
      <header className="panel-head">
        <h2 id="watchlist-title" className="panel-title">종목</h2>
        <span className="panel-meta">현재가 · 전일 대비</span>
      </header>
      <ul>
        {mockSymbols.map((info) => {
          const quote = quotes[info.symbol]
          const trend = trendClass(quote.change)
          return (
            <li key={info.symbol}>
              <NavLink to={`/trade/${info.symbol}`} className="watch-row">
                <span className="watch-name">
                  <strong>{info.name}</strong>
                  <small>{info.symbol}</small>
                </span>
                <span className={`watch-price num ${trend}`}>
                  <Flash value={quote.price}>{formatNumber(quote.price)}</Flash>
                  <small>
                    <TrendIcon value={quote.change} />
                    {formatRate(quote.changeRate)}
                  </small>
                </span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
