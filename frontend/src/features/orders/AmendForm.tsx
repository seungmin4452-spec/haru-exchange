import { useId, useState } from 'react'
import { marketSource } from '../../data/market'
import { formatNumber } from '../../domain/format'
import { nextTick, prevTick, priceLimits } from '../../domain/price'
import type { Order } from '../../domain/types'
import { findSymbol } from '../../mocks/symbols'

interface Props {
  order: Order
  prevClose: number
  onDone: (message: string) => void
  onClose: () => void
}

/** 지정가 주문 정정. 가격을 바꾸거나 수량을 늘리면 시간 우선순위를 잃는다 */
export function AmendForm({ order, prevClose, onDone, onClose }: Props) {
  const ids = useId()
  const [price, setPrice] = useState(order.price!)
  const [qty, setQty] = useState(order.qty)
  const [error, setError] = useState<string | null>(null)
  const { upper, lower } = priceLimits(prevClose)
  const losesPriority = price !== order.price || qty > order.qty
  const unchanged = price === order.price && qty === order.qty

  return (
    <form
      className="amend-form"
      aria-label="주문 정정"
      onSubmit={(e) => {
        e.preventDefault()
        const result = marketSource.amendOrder(order.id, { price, qty })
        if (result.ok) onDone(`${findSymbol(order.symbol)?.name} 주문을 정정했습니다`)
        else setError(result.reason)
      }}
    >
      <label htmlFor={`${ids}-price`}>정정 가격</label>
      <div className="amend-stepper">
        <button type="button" aria-label="한 호가 내리기" onClick={() => setPrice((p) => Math.max(lower, prevTick(p)))}>
          −
        </button>
        <input
          id={`${ids}-price`}
          className="num"
          inputMode="numeric"
          value={formatNumber(price)}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^0-9]/g, ''))
            if (Number.isFinite(n)) setPrice(n)
          }}
        />
        <button type="button" aria-label="한 호가 올리기" onClick={() => setPrice((p) => Math.min(upper, nextTick(p)))}>
          +
        </button>
      </div>
      <label htmlFor={`${ids}-qty`}>정정 수량</label>
      <div className="amend-stepper">
        <button type="button" aria-label="1주 줄이기" onClick={() => setQty((q) => Math.max(order.filledQty + 1, q - 1))}>
          −
        </button>
        <input
          id={`${ids}-qty`}
          className="num"
          inputMode="numeric"
          value={formatNumber(qty)}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^0-9]/g, ''))
            if (Number.isFinite(n)) setQty(n)
          }}
        />
        <button type="button" aria-label="1주 늘리기" onClick={() => setQty((q) => q + 1)}>
          +
        </button>
      </div>
      <p className={`amend-note ${losesPriority ? 'warn' : ''}`}>
        {unchanged ? '가격이나 수량을 바꾸세요' : losesPriority ? '대기 순서가 맨 뒤로 갑니다' : '대기 순서를 유지합니다'}
        {error && <span className="bad"> · {error}</span>}
      </p>
      <div className="amend-actions">
        <button type="button" onClick={onClose}>
          닫기
        </button>
        <button type="submit" className="primary" disabled={unchanged}>
          정정 주문
        </button>
      </div>
    </form>
  )
}
