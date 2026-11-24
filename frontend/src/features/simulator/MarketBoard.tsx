import { Link } from 'react-router'
import { TrendIcon } from '../../components/Trend'
import { formatNumber, formatRate, trendClass } from '../../domain/format'
import type { MarketSnapshot } from '../../domain/types'
import { mockSymbols } from '../../mocks/symbols'

function remaining(until: number, now: number): string {
  const sec = Math.max(0, Math.ceil((until - now) / 1000))
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

/** 8종목 현황. 1분 변동률이 ±10%에 닿으면 서킷브레이커가 걸린다 */
export function MarketBoard({ market, now }: { market: MarketSnapshot; now: number }) {
  return (
    <section className="panel market-board" aria-labelledby="board-title">
      <header className="panel-head">
        <h2 id="board-title" className="panel-title">종목 현황</h2>
        <span className="panel-meta">1분 변동 ±10%에서 2분 정지</span>
      </header>
      <div className="board-scroll">
        <table className="data-table num">
          <thead>
            <tr>
              <th scope="col">종목</th>
              <th scope="col">현재가</th>
              <th scope="col">전일 대비</th>
              <th scope="col">1분 변동</th>
              <th scope="col">상태</th>
            </tr>
          </thead>
          <tbody>
            {mockSymbols.map((info) => {
              const quote = market.quotes[info.symbol]
              const minute = market.oneMinuteChange[info.symbol] ?? 0
              const halt = market.halts[info.symbol]
              const near = Math.abs(minute) >= 7
              return (
                <tr key={info.symbol} className={halt ? 'halted' : undefined}>
                  <td>
                    <Link to={`/trade/${info.symbol}`} className="board-name">
                      {info.name}
                    </Link>
                  </td>
                  <td className={trendClass(quote.change)}>{formatNumber(quote.price)}</td>
                  <td className={trendClass(quote.change)}>
                    <TrendIcon value={quote.change} />
                    {formatRate(quote.changeRate)}
                  </td>
                  <td className={trendClass(minute)}>
                    <span className="minute-meter" aria-hidden="true">
                      <span style={{ width: `${Math.min(100, (Math.abs(minute) / 10) * 100)}%` }} className={trendClass(minute)} />
                    </span>
                    {formatRate(minute)}
                  </td>
                  <td>
                    {halt ? (
                      <span className="status warn">정지 {remaining(halt, now)} 남음</span>
                    ) : near ? (
                      <span className="status caution">급변 주의</span>
                    ) : (
                      <span className="status">연속 매매</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
