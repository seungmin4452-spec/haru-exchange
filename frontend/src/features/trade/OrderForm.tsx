import { useId, useState } from 'react'
import { marketSource } from '../../data/market'
import { fee } from '../../domain/fees'
import { formatNumber } from '../../domain/format'
import { nextTick, prevTick, priceLimits } from '../../domain/price'
import type { Account, Order, OrderType, Side, SymbolInfo } from '../../domain/types'

interface Props {
  info: SymbolInfo
  lastPrice: number
  account: Account
  orders: Order[]
  /** 호가창에서 고른 가격. nonce가 바뀔 때마다 가격 칸에 반영한다 */
  picked: { price: number; nonce: number } | null
}

type Feedback = { tone: 'ok' | 'error'; text: string } | null

const STATUS_LABEL: Record<Order['status'], string> = {
  OPEN: '미체결',
  PARTIAL: '부분 체결',
  FILLED: '체결',
  CANCELLED: '취소',
}

export function OrderForm({ info, lastPrice, account, orders, picked }: Props) {
  const ids = useId()
  const [side, setSide] = useState<Side>('BUY')
  const [type, setType] = useState<OrderType>('LIMIT')
  const [price, setPrice] = useState(lastPrice)
  const [qty, setQty] = useState(1)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pickedNonce, setPickedNonce] = useState(picked?.nonce)
  if (picked && picked.nonce !== pickedNonce) {
    setPickedNonce(picked.nonce)
    setPrice(picked.price)
    setType('LIMIT')
  }

  const { upper } = priceLimits(info.prevClose)
  const unitPrice = type === 'LIMIT' ? price : side === 'BUY' ? upper : lastPrice
  const amount = unitPrice * qty
  const commission = fee(amount)
  const holding = account.holdings.find((h) => h.symbol === info.symbol)
  const sellable = holding ? holding.qty - holding.lockedQty : 0
  const maxBuy = Math.floor(account.cashAvailable / (unitPrice * 1.00015))
  const maxQty = side === 'BUY' ? maxBuy : sellable
  const myOpen = orders.filter((o) => o.symbol === info.symbol && (o.status === 'OPEN' || o.status === 'PARTIAL'))
  const sideLabel = side === 'BUY' ? '매수' : '매도'

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const result = marketSource.submitOrder({ symbol: info.symbol, side, type, price: type === 'LIMIT' ? price : undefined, qty })
    if (!result.ok) {
      setFeedback({ tone: 'error', text: result.reason })
      return
    }
    const o = result.order
    const filled = o.filledQty > 0 ? ` · ${formatNumber(o.filledQty)}주 체결` : ''
    const rest = o.status === 'CANCELLED' && o.filledQty < o.qty ? ` · 남은 ${formatNumber(o.qty - o.filledQty)}주 취소` : ''
    setFeedback({ tone: 'ok', text: `${o.id} ${sideLabel} ${formatNumber(o.qty)}주 접수${filled}${rest}` })
  }

  return (
    <section className={`panel order-form side-${side.toLowerCase()}`} aria-labelledby={`${ids}-title`}>
      <header className="panel-head">
        <h2 id={`${ids}-title`} className="panel-title">주문</h2>
        <span className="panel-meta">{info.name}</span>
      </header>
      <form onSubmit={submit} className="order-body">
        <div className="segmented side-tabs" role="radiogroup" aria-label="매수 매도 선택">
          {(['BUY', 'SELL'] as const).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={side === s} className={s.toLowerCase()} onClick={() => setSide(s)}>
              {s === 'BUY' ? '매수' : '매도'}
            </button>
          ))}
        </div>

        <div className="segmented type-tabs" role="radiogroup" aria-label="주문 유형">
          {(['LIMIT', 'MARKET'] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => setType(t)}>
              {t === 'LIMIT' ? '지정가' : '시장가'}
            </button>
          ))}
        </div>

        <label className="field" htmlFor={`${ids}-price`}>
          <span>가격</span>
          <span className="stepper">
            <button type="button" aria-label="한 호가 내리기" disabled={type === 'MARKET'} onClick={() => setPrice((p) => prevTick(p))}>
              <svg width="10" height="2" viewBox="0 0 10 2" aria-hidden="true"><path d="M0 0h10v2H0z" fill="currentColor" /></svg>
            </button>
            <input
              id={`${ids}-price`}
              className="num"
              inputMode="numeric"
              disabled={type === 'MARKET'}
              value={type === 'MARKET' ? '시장가' : formatNumber(price)}
              onChange={(e) => setPrice(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
            />
            <button type="button" aria-label="한 호가 올리기" disabled={type === 'MARKET'} onClick={() => setPrice((p) => nextTick(p))}>
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M4 0h2v4h4v2H6v4H4V6H0V4h4z" fill="currentColor" /></svg>
            </button>
          </span>
        </label>

        <label className="field" htmlFor={`${ids}-qty`}>
          <span>수량</span>
          <span className="stepper">
            <input
              id={`${ids}-qty`}
              className="num"
              inputMode="numeric"
              value={formatNumber(qty)}
              onChange={(e) => setQty(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
            />
            <span className="unit">주</span>
          </span>
        </label>

        <div className="quick-qty" role="group" aria-label="수량 빠르게 입력">
          {[10, 25, 50, 100].map((pct) => (
            <button key={pct} type="button" disabled={maxQty === 0} onClick={() => setQty(Math.max(1, Math.floor((maxQty * pct) / 100)))}>
              {pct === 100 ? '최대' : `${pct}%`}
            </button>
          ))}
        </div>

        <dl className="order-summary num">
          {side === 'BUY' ? (
            <div><dt>주문 가능</dt><dd>{formatNumber(account.cashAvailable)}원</dd></div>
          ) : (
            <div><dt>매도 가능</dt><dd>{formatNumber(sellable)}주</dd></div>
          )}
          <div><dt>{type === 'MARKET' && side === 'BUY' ? '잠금 기준 금액 (상한가)' : '주문 금액'}</dt><dd>{formatNumber(amount)}원</dd></div>
          <div><dt>수수료 (0.015%)</dt><dd>{formatNumber(commission)}원</dd></div>
          <div className="total">
            <dt>{side === 'BUY' ? '총 잠금 금액' : '예상 수령액'}</dt>
            <dd>{formatNumber(side === 'BUY' ? amount + commission : amount - commission)}원</dd>
          </div>
        </dl>

        <button type="submit" className={`submit ${side.toLowerCase()}`} disabled={qty < 1}>
          {type === 'LIMIT' ? '지정가' : '시장가'} {sideLabel}
        </button>
        <p className={`feedback ${feedback?.tone ?? ''}`} role="status">
          {feedback?.text ?? ''}
        </p>
      </form>

      <div className="my-orders">
        <h3 className="panel-meta">내 미체결 {myOpen.length}건</h3>
        {myOpen.length > 0 && (
          <ul>
            {myOpen.map((o) => (
              <li key={o.id} className="num">
                <span className={o.side === 'BUY' ? 'up' : 'down'}>{o.side === 'BUY' ? '매수' : '매도'}</span>
                <span>{formatNumber(o.price ?? 0)}</span>
                <span>
                  {formatNumber(o.filledQty)}/{formatNumber(o.qty)}
                </span>
                <span className="sub">{STATUS_LABEL[o.status]}</span>
                <button type="button" onClick={() => marketSource.cancelOrder(o.id)} aria-label={`${o.id} 취소`}>
                  취소
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
