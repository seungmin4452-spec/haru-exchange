import { Flash } from '../../components/Flash'
import { formatNumber, formatRate, trendClass } from '../../domain/format'
import { changeRate } from '../../domain/price'
import type { BookLevel, OrderBook } from '../../domain/types'

interface Props {
  book: OrderBook
  prevClose: number
  lastPrice: number
  onPickPrice: (price: number) => void
}

/** HTS 3단 호가창: 매도 잔량 | 가격 | 매수 잔량. 위가 매도(높은 가격), 아래가 매수. */
export function OrderBookPanel({ book, prevClose, lastPrice, onPickPrice }: Props) {
  const asks = [...book.asks].reverse()
  const maxQty = Math.max(1, ...book.asks.map((l) => l.qty), ...book.bids.map((l) => l.qty))
  const askTotal = book.asks.reduce((s, l) => s + l.qty, 0)
  const bidTotal = book.bids.reduce((s, l) => s + l.qty, 0)

  const row = (level: BookLevel, side: 'ask' | 'bid') => {
    const width = `${(level.qty / maxQty) * 100}%`
    const trend = trendClass(level.price - prevClose)
    const qtyCell = (
      <span className="book-qty">
        <span className={`book-bar ${side}`} style={{ width }} />
        <Flash value={level.qty}>{formatNumber(level.qty)}</Flash>
        {level.myQty ? <span className="book-mine" title="내 주문 잔량">내 {formatNumber(level.myQty)}</span> : null}
      </span>
    )
    return (
      <tr key={`${side}-${level.price}`} className={level.price === lastPrice ? 'book-last' : undefined}>
        <td className="book-side ask">{side === 'ask' ? qtyCell : null}</td>
        <td className="book-price">
          <button type="button" className={trend} onClick={() => onPickPrice(level.price)}>
            <span>{formatNumber(level.price)}</span>
            <small>{formatRate(changeRate(level.price, prevClose))}</small>
          </button>
        </td>
        <td className="book-side bid">{side === 'bid' ? qtyCell : null}</td>
      </tr>
    )
  }

  return (
    <section className="panel orderbook" aria-labelledby="book-title">
      <header className="panel-head">
        <h2 id="book-title" className="panel-title">호가</h2>
        <span className="panel-meta num">엔진 순번 {formatNumber(book.seq)}</span>
      </header>
      {/* 높이가 모자라면 위아래 먼 호가부터 똑같이 잘려서 매도·매수 경계가 늘 가운데 온다 */}
      <div className="book-window">
        <table className="book-table num">
          <thead className="visually-hidden">
            <tr>
              <th scope="col">매도 잔량</th>
              <th scope="col">가격</th>
              <th scope="col">매수 잔량</th>
            </tr>
          </thead>
          <tbody>
            {asks.map((l) => row(l, 'ask'))}
            {book.bids.map((l) => row(l, 'bid'))}
          </tbody>
        </table>
      </div>
      <footer className="book-total num">
        <span className="down">{formatNumber(askTotal)}</span>
        <span>잔량 합계</span>
        <span className="up">{formatNumber(bidTotal)}</span>
      </footer>
    </section>
  )
}
