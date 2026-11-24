import { useState } from 'react'
import { Link } from 'react-router'
import { marketSource, useMarket } from '../data/market'
import { formatNumber, formatRate, formatTime, trendClass } from '../domain/format'
import type { DlqItem } from '../domain/types'
import '../features/operator/operator.css'
import { mockSymbols } from '../mocks/symbols'

const DLQ_STATUS: Record<DlqItem['status'], string> = {
  PENDING: '대기',
  REPROCESSED: '재처리 완료',
  DISCARDED: '폐기',
}

export function OperatorPage() {
  const market = useMarket()
  const { session, halts, quotes, dlq, audit, orders } = market
  const [confirmClose, setConfirmClose] = useState(false)
  const open = session === 'OPEN'
  const liveOrders = orders.filter((o) => o.status === 'OPEN' || o.status === 'PARTIAL').length
  const pendingDlq = dlq.filter((d) => d.status === 'PENDING').length
  const lastTick = market.metricHistory.at(-1)?.time ?? 0

  return (
    <div className="ops-layout">
      <section className="panel ops-session" aria-labelledby="ops-title">
        <header className="panel-head">
          <h1 id="ops-title" className="panel-title">운영 콘솔</h1>
          <span className="panel-meta">시장 운영자 · 모든 조작은 운영 기록에 남습니다</span>
        </header>
        <div className="session-body">
          <div className="session-state" role="status">
            <span className={`session-dot ${open ? 'open' : 'closed'}`} aria-hidden="true" />
            <div>
              <strong>{open ? '장 진행 중' : '장 마감'}</strong>
              <span className="sub">{open ? `미체결 주문 ${liveOrders}건 · DLQ 대기 ${pendingDlq}건` : '새 주문을 받지 않습니다'}</span>
            </div>
          </div>
          {open ? (
            confirmClose ? (
              <div className="close-confirm">
                <p>미체결 주문 {liveOrders}건이 만료되고 잠금이 풀립니다. 마감할까요?</p>
                <button type="button" className="ops-button" onClick={() => setConfirmClose(false)}>
                  돌아가기
                </button>
                <button
                  type="button"
                  className="ops-button danger"
                  onClick={() => {
                    marketSource.closeMarket()
                    setConfirmClose(false)
                  }}
                >
                  장 마감
                </button>
              </div>
            ) : (
              <button type="button" className="ops-button" onClick={() => setConfirmClose(true)}>
                장 마감…
              </button>
            )
          ) : (
            <div className="close-confirm">
              <p>
                마감 뒤에는 <Link to="/ledger">원장·대사</Link>에서 차이 0원을 확인하세요.
              </p>
              <button type="button" className="ops-button primary" onClick={() => marketSource.openMarket()}>
                개장
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="panel ops-symbols" aria-labelledby="ops-symbols-title">
        <header className="panel-head">
          <h2 id="ops-symbols-title" className="panel-title">종목 상태</h2>
          <span className="panel-meta">정지 중에는 취소만 받습니다</span>
        </header>
        <table className="data-table num ops-table">
          <thead>
            <tr>
              <th scope="col">종목</th>
              <th scope="col">현재가</th>
              <th scope="col">전일 대비</th>
              <th scope="col">상태</th>
              <th scope="col">
                <span className="visually-hidden">작업</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {mockSymbols.map((info) => {
              const quote = quotes[info.symbol]
              const halt = halts[info.symbol]
              const manual = halt !== undefined && !Number.isFinite(halt)
              const left = halt !== undefined && !manual ? Math.max(0, Math.ceil((halt - lastTick * 1000) / 1000)) : 0
              return (
                <tr key={info.symbol} className={halt !== undefined ? 'halted' : undefined}>
                  <td>
                    <span className="sym-name">{info.name}</span> <span className="sub">{info.symbol}</span>
                  </td>
                  <td className={trendClass(quote.change)}>{formatNumber(quote.price)}</td>
                  <td className={trendClass(quote.change)}>{formatRate(quote.changeRate)}</td>
                  <td>
                    {halt === undefined ? (
                      <span className="sub">{open ? '연속 매매' : '장 마감'}</span>
                    ) : manual ? (
                      <span className="ops-tag warn">운영자 정지</span>
                    ) : (
                      <span className="ops-tag warn">
                        서킷브레이커 {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
                      </span>
                    )}
                  </td>
                  <td className="row-actions">
                    {halt === undefined ? (
                      <button type="button" onClick={() => marketSource.haltSymbol(info.symbol)} aria-label={`${info.name} 거래 정지`}>
                        정지
                      </button>
                    ) : (
                      <button type="button" onClick={() => marketSource.resumeSymbol(info.symbol)} aria-label={`${info.name} 거래 재개`}>
                        재개
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="panel ops-dlq" aria-labelledby="ops-dlq-title">
        <header className="panel-head">
          <h2 id="ops-dlq-title" className="panel-title">DLQ 재처리</h2>
          <span className="panel-meta">처리에 실패해 격리된 메시지 · 가상 데이터</span>
        </header>
        <ul className="dlq-list">
          {dlq.map((item) => (
            <li key={item.id} className={`dlq-item dlq-${item.status.toLowerCase()}`}>
              <div className="dlq-head">
                <span className="dlq-topic">
                  {item.topic} <span className="sub">· 키 {item.key}</span>
                </span>
                <span className={`ops-tag ${item.status === 'PENDING' ? 'warn' : item.status === 'REPROCESSED' ? 'ok' : ''}`}>{DLQ_STATUS[item.status]}</span>
              </div>
              <p className="dlq-event num">{item.event}</p>
              <p className="dlq-error">{item.error}</p>
              <div className="dlq-foot">
                <span className="sub num">
                  시도 {item.attempts}회 · 최초 실패 {formatTime(item.firstFailedAt).slice(0, 8)}
                </span>
                {item.status === 'PENDING' && (
                  <span className="dlq-actions">
                    <button type="button" onClick={() => marketSource.discardDlq(item.id)}>
                      폐기
                    </button>
                    <button type="button" className="primary" onClick={() => marketSource.retryDlq(item.id)}>
                      재처리
                    </button>
                  </span>
                )}
              </div>
              {item.resolution && <p className="dlq-resolution">{item.resolution}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel ops-audit" aria-labelledby="ops-audit-title">
        <header className="panel-head">
          <h2 id="ops-audit-title" className="panel-title">운영 기록</h2>
          <span className="panel-meta">최근 {audit.length}건</span>
        </header>
        {audit.length === 0 ? (
          <p className="feed-empty">아직 운영 조작이 없습니다.</p>
        ) : (
          <ol className="audit-list num" aria-live="polite">
            {audit.map((entry, i) => (
              <li key={audit.length - i}>
                <time>{formatTime(entry.time).slice(0, 8)}</time>
                <span>{entry.action}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
