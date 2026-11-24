import { Fragment, useState } from 'react'
import { Link } from 'react-router'
import { marketSource, useMarket } from '../data/market'
import { formatNumber, formatTime } from '../domain/format'
import type { Order, OrderStatus } from '../domain/types'
import { AmendForm } from '../features/orders/AmendForm'
import '../features/orders/orders.css'
import { findSymbol } from '../mocks/symbols'

const STATUS_LABEL: Record<OrderStatus, string> = {
  OPEN: '미체결',
  PARTIAL: '부분 체결',
  FILLED: '체결 완료',
  CANCELLED: '취소',
}

const FILTERS = [
  { key: 'all', label: '전체', match: () => true },
  { key: 'open', label: '미체결', match: (o: Order) => o.status === 'OPEN' || o.status === 'PARTIAL' },
  { key: 'filled', label: '체결 완료', match: (o: Order) => o.status === 'FILLED' },
  { key: 'cancelled', label: '취소', match: (o: Order) => o.status === 'CANCELLED' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

function avgFillPrice(order: Order): number | undefined {
  if (order.fills.length === 0) return undefined
  const amount = order.fills.reduce((s, f) => s + f.price * f.qty, 0)
  return Math.round(amount / order.filledQty)
}

export function OrdersPage() {
  const { orders } = useMarket()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [amending, setAmending] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const sorted = [...orders].sort((a, b) => b.createdAt - a.createdAt)
  const visible = sorted.filter(FILTERS.find((f) => f.key === filter)!.match)
  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, orders.filter(f.match).length])) as Record<FilterKey, number>

  const cancel = (order: Order) => {
    const result = marketSource.cancelOrder(order.id)
    setMessage(result.ok ? { ok: true, text: `${findSymbol(order.symbol)?.name} 주문을 취소했습니다` } : { ok: false, text: result.reason })
  }

  return (
    <div className="orders-layout">
      <section className="panel orders" aria-labelledby="orders-title">
        <header className="panel-head orders-head">
          <h1 id="orders-title" className="panel-title">주문 내역</h1>
          <div className="status-filter" role="group" aria-label="주문 상태로 거르기">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label} <span className="num">{counts[f.key]}</span>
              </button>
            ))}
          </div>
        </header>

        <p className="orders-feedback" role="status">
          {message && <span className={message.ok ? 'ok' : 'bad'}>{message.text}</span>}
        </p>

        <div className="orders-scroll">
          <table className="data-table num orders-table">
            <thead>
              <tr>
                <th scope="col">주문 시각</th>
                <th scope="col">종목</th>
                <th scope="col">구분</th>
                <th scope="col">주문가</th>
                <th scope="col">주문 수량</th>
                <th scope="col">체결 수량</th>
                <th scope="col">평균 체결가</th>
                <th scope="col">잠금</th>
                <th scope="col">상태</th>
                <th scope="col">
                  <span className="visually-hidden">작업</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={10} className="empty">
                    {orders.length === 0 ? (
                      <>
                        아직 주문이 없습니다. <Link to="/trade">거래 화면</Link>에서 주문해 보세요.
                      </>
                    ) : (
                      '이 상태의 주문이 없습니다.'
                    )}
                  </td>
                </tr>
              )}
              {visible.map((order) => {
                const live = order.status === 'OPEN' || order.status === 'PARTIAL'
                const avg = avgFillPrice(order)
                const isOpen = expanded === order.id
                return (
                  <Fragment key={order.id}>
                    <tr className={order.status === 'CANCELLED' ? 'dim' : undefined}>
                      <td className="sub">{formatTime(order.createdAt)}</td>
                      <td>
                        <Link to={`/trade/${order.symbol}`} className="row-link">
                          {findSymbol(order.symbol)?.name ?? order.symbol}
                        </Link>
                      </td>
                      <td className={order.side === 'BUY' ? 'up' : 'down'}>
                        {order.side === 'BUY' ? '매수' : '매도'}
                        <span className="sub"> · {order.type === 'LIMIT' ? '지정가' : '시장가'}</span>
                      </td>
                      <td>{order.price !== undefined ? formatNumber(order.price) : '-'}</td>
                      <td>{formatNumber(order.qty)}</td>
                      <td>
                        {order.fills.length > 0 ? (
                          <button
                            type="button"
                            className="fills-toggle"
                            aria-expanded={isOpen}
                            aria-label={`체결 ${order.fills.length}건 보기`}
                            onClick={() => setExpanded(isOpen ? null : order.id)}
                          >
                            {formatNumber(order.filledQty)}
                            <span className="sub"> ({order.fills.length}건)</span>
                          </button>
                        ) : (
                          formatNumber(order.filledQty)
                        )}
                      </td>
                      <td>{avg !== undefined ? formatNumber(avg) : '-'}</td>
                      <td className="sub">
                        {order.locked > 0 ? (order.side === 'BUY' ? `${formatNumber(order.locked)}원` : `${formatNumber(order.locked)}주`) : '-'}
                      </td>
                      <td>
                        <span className={`order-status status-${order.status.toLowerCase()}`}>{STATUS_LABEL[order.status]}</span>
                      </td>
                      <td className="row-actions">
                        {live && order.type === 'LIMIT' && (
                          <button
                            type="button"
                            aria-expanded={amending === order.id}
                            onClick={() => setAmending(amending === order.id ? null : order.id)}
                          >
                            정정
                          </button>
                        )}
                        {live && (
                          <button type="button" onClick={() => cancel(order)}>
                            취소
                          </button>
                        )}
                      </td>
                    </tr>
                    {amending === order.id && live && (
                      <tr className="detail-row">
                        <td colSpan={10}>
                          <AmendForm
                            order={order}
                            prevClose={findSymbol(order.symbol)!.prevClose}
                            onDone={(text) => {
                              setAmending(null)
                              setMessage({ ok: true, text })
                            }}
                            onClose={() => setAmending(null)}
                          />
                        </td>
                      </tr>
                    )}
                    {isOpen && (
                      <tr className="detail-row">
                        <td colSpan={10}>
                          <table className="fills-table num">
                            <caption className="visually-hidden">체결 내역</caption>
                            <thead>
                              <tr>
                                <th scope="col">체결 시각</th>
                                <th scope="col">엔진 순번</th>
                                <th scope="col">체결가</th>
                                <th scope="col">수량</th>
                                <th scope="col">수수료</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.fills.map((f) => (
                                <tr key={f.seq}>
                                  <td>{formatTime(f.time)}</td>
                                  <td>{formatNumber(f.seq)}</td>
                                  <td>{formatNumber(f.price)}</td>
                                  <td>{formatNumber(f.qty)}</td>
                                  <td>{formatNumber(f.fee)}원</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="table-note">정정 규칙: 가격을 바꾸거나 수량을 늘리면 대기 순서가 맨 뒤로 갑니다. 수량만 줄이면 순서를 유지합니다.</p>
      </section>
    </div>
  )
}
