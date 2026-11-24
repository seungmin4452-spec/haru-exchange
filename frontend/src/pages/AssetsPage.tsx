import { Link } from 'react-router'
import { TrendIcon } from '../components/Trend'
import { useMarket } from '../data/market'
import { formatNumber, formatRate, formatSigned, trendClass } from '../domain/format'
import '../features/assets/assets.css'
import { findSymbol } from '../mocks/symbols'

export function AssetsPage() {
  const { account, quotes } = useMarket()

  const rows = account.holdings.map((h) => {
    const price = quotes[h.symbol]?.price ?? h.avgPrice
    const cost = h.avgPrice * h.qty
    const value = price * h.qty
    return { ...h, name: findSymbol(h.symbol)?.name ?? h.symbol, price, cost, value, pnl: value - cost }
  })
  const stockValue = rows.reduce((s, r) => s + r.value, 0)
  const stockCost = rows.reduce((s, r) => s + r.cost, 0)
  const cash = account.cashAvailable + account.cashLocked
  const total = cash + stockValue
  const pnl = stockValue - stockCost
  const pnlRate = stockCost > 0 ? (pnl / stockCost) * 100 : 0

  return (
    <div className="assets-layout">
      <section className="panel assets-summary" aria-labelledby="assets-title">
        <header className="panel-head">
          <h1 id="assets-title" className="panel-title">내 자산</h1>
          <span className="panel-meta">가상 계좌 · 현재가 기준 평가</span>
        </header>
        <dl className="summary-grid num">
          <div className="summary-total">
            <dt>총 자산</dt>
            <dd>{formatNumber(total)}원</dd>
          </div>
          <div>
            <dt>주문 가능 현금</dt>
            <dd>{formatNumber(account.cashAvailable)}원</dd>
          </div>
          <div>
            <dt>주문에 잠긴 현금</dt>
            <dd>{formatNumber(account.cashLocked)}원</dd>
            <p className="hint">미체결 매수 주문의 주문가 × 수량 + 수수료</p>
          </div>
          <div>
            <dt>주식 평가금액</dt>
            <dd>{formatNumber(stockValue)}원</dd>
          </div>
          <div>
            <dt>평가손익</dt>
            <dd className={trendClass(pnl)}>
              {formatSigned(pnl)}원 <small>({formatRate(pnlRate)})</small>
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel holdings" aria-labelledby="holdings-title">
        <header className="panel-head">
          <h2 id="holdings-title" className="panel-title">보유 종목</h2>
          <span className="panel-meta">{rows.length}종목</span>
        </header>
        <div className="holdings-scroll">
          <table className="data-table num">
            <thead>
              <tr>
                <th scope="col">종목</th>
                <th scope="col">보유</th>
                <th scope="col">매도 주문 중</th>
                <th scope="col">평균 매입가</th>
                <th scope="col">현재가</th>
                <th scope="col">평가금액</th>
                <th scope="col">평가손익</th>
                <th scope="col">수익률</th>
                <th scope="col">비중</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty">
                    보유 종목이 없습니다. <Link to="/trade">거래 화면</Link>에서 매수해 보세요.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.symbol}>
                  <td>
                    <Link to={`/trade/${r.symbol}`} className="row-link">
                      {r.name}
                    </Link>
                  </td>
                  <td>{formatNumber(r.qty)}주</td>
                  <td className={r.lockedQty > 0 ? undefined : 'sub'}>{formatNumber(r.lockedQty)}주</td>
                  <td>{formatNumber(r.avgPrice)}</td>
                  <td>{formatNumber(r.price)}</td>
                  <td>{formatNumber(r.value)}</td>
                  <td className={trendClass(r.pnl)}>{formatSigned(r.pnl)}</td>
                  <td className={trendClass(r.pnl)}>
                    <TrendIcon value={r.pnl} />
                    {formatRate(r.cost > 0 ? (r.pnl / r.cost) * 100 : 0)}
                  </td>
                  <td className="sub">{total > 0 ? ((r.value / total) * 100).toFixed(1) : '0.0'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="table-note">평균 매입가와 수익률은 수수료를 빼고 계산합니다. 체결가는 가상 시세입니다.</p>
      </section>
    </div>
  )
}
