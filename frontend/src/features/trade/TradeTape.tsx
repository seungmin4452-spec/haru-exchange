import { formatNumber, formatTime } from '../../domain/format'
import type { Trade } from '../../domain/types'

export function TradeTape({ trades }: { trades: Trade[] }) {
  return (
    <section className="panel tape" aria-labelledby="tape-title">
      <header className="panel-head">
        <h2 id="tape-title" className="panel-title">실시간 체결</h2>
        <span className="panel-meta">최근 {trades.length}건</span>
      </header>
      <div className="tape-scroll">
        <table className="data-table num">
          <thead>
            <tr>
              <th scope="col">시각</th>
              <th scope="col">체결가</th>
              <th scope="col">수량</th>
              <th scope="col">순번</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">아직 체결이 없습니다</td>
              </tr>
            )}
            {trades.map((t, i) => (
              <tr key={t.seq} className={i === 0 ? 'tape-new' : undefined}>
                <td>{formatTime(t.time)}</td>
                <td className={t.side === 'BUY' ? 'up' : 'down'}>{formatNumber(t.price)}</td>
                <td className={t.side === 'BUY' ? 'up' : 'down'}>{formatNumber(t.qty)}</td>
                <td className="sub">{formatNumber(t.seq)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
