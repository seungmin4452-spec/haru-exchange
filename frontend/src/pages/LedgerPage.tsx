import { useState } from 'react'
import { useMarket } from '../data/market'
import { formatNumber, formatSigned, formatTime } from '../domain/format'
import { buildJournals, kstDate, reconcile, reconDiff, settlementByDate, type LedgerAccount, type ReconItem } from '../domain/ledger'
import '../features/ledger/ledger.css'
import { initialAccount } from '../mocks/mockMarket'
import { findSymbol } from '../mocks/symbols'

const ACCOUNT_LABEL: Record<LedgerAccount, string> = {
  CUSTOMER: '내 계좌',
  COUNTERPARTY: '상대 봇 계좌',
  FEE: '수수료 계정',
}

/** 대사 실행 시각. 이벤트 처리 중에만 부른다 */
const clock = () => Date.now()

/** 화면에 보여줄 최근 원장 거래 수 */
const JOURNAL_LIMIT = 40

interface Run {
  time: number
  items: ReconItem[]
  journalCount: number
}

function assetLabel(asset: string) {
  return asset === 'KRW' ? '현금' : (findSymbol(asset)?.name ?? asset)
}

export function LedgerPage() {
  const market = useMarket()
  const [run, setRun] = useState<Run | null>(null)
  const journals = buildJournals(market.orders)
  const settlements = settlementByDate(journals)
  const lastTick = market.metricHistory.at(-1)?.time
  const today = lastTick ? kstDate(lastTick * 1000) : '-'

  const mismatches = run ? run.items.filter((i) => reconDiff(i) !== 0).length : 0
  const newSinceRun = run ? journals.length - run.journalCount : 0

  const execute = () => {
    setRun({
      time: clock(),
      items: reconcile(initialAccount(), market.account, market.orders, journals),
      journalCount: journals.length,
    })
  }

  return (
    <div className="ledger-layout">
      <section className="panel ledger-summary" aria-labelledby="ledger-title">
        <header className="panel-head">
          <h1 id="ledger-title" className="panel-title">원장·대사</h1>
          <span className="panel-meta">원장은 고치지 않고 역분개로만 바로잡습니다</span>
        </header>
        <div className="ledger-run">
          <dl className="run-facts num">
            <div>
              <dt>거래일</dt>
              <dd>{today}</dd>
            </div>
            <div>
              <dt>원장 거래</dt>
              <dd>{formatNumber(journals.length)}건</dd>
            </div>
            <div>
              <dt>대사 결과</dt>
              <dd>
                {run ? (
                  <span className={`verdict ${mismatches === 0 ? 'ok' : 'bad'}`} role="status">
                    {mismatches === 0 ? '차이 0원' : `불일치 ${mismatches}건`}
                  </span>
                ) : (
                  <span className="sub">아직 실행하지 않음</span>
                )}
              </dd>
            </div>
            <div>
              <dt>마지막 실행</dt>
              <dd>
                {run ? formatTime(run.time).slice(0, 8) : '-'}
                {newSinceRun > 0 && <span className="stale"> · 이후 새 체결 {newSinceRun}건</span>}
              </dd>
            </div>
          </dl>
          <button type="button" className="run-button" onClick={execute}>
            {run ? '대사 다시 실행' : '대사 실행'}
          </button>
        </div>
      </section>

      <section className="panel recon" aria-labelledby="recon-title">
        <header className="panel-head">
          <h2 id="recon-title" className="panel-title">대사 항목</h2>
          <span className="panel-meta">주문 · 체결 · 원장 · 잔고</span>
        </header>
        <table className="data-table num recon-table">
          <thead>
            <tr>
              <th scope="col">항목</th>
              <th scope="col">기준</th>
              <th scope="col">비교</th>
              <th scope="col">차이</th>
              <th scope="col">결과</th>
            </tr>
          </thead>
          <tbody>
            {!run && (
              <tr>
                <td colSpan={5} className="empty">
                  대사를 실행하면 주문, 체결, 원장, 잔고를 서로 맞춰 본 결과가 나옵니다.
                </td>
              </tr>
            )}
            {run?.items.map((item) => {
              const diff = reconDiff(item)
              return (
                <tr key={item.key}>
                  <th scope="row">{item.label}</th>
                  <td>
                    <span className="recon-side">{item.left.label}</span>
                    {formatNumber(item.left.value)}
                    {item.unit}
                  </td>
                  <td>
                    <span className="recon-side">{item.right.label}</span>
                    {formatNumber(item.right.value)}
                    {item.unit}
                  </td>
                  <td className={diff === 0 ? 'sub' : 'bad'}>
                    {diff === 0 ? '0' : formatSigned(diff)}
                    {item.unit}
                  </td>
                  <td>{diff === 0 ? <span className="ok">일치</span> : <span className="bad">불일치</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="panel settlement" aria-labelledby="settle-title">
        <header className="panel-head">
          <h2 id="settle-title" className="panel-title">T+2 결제 현황</h2>
          <span className="panel-meta">가상 영업일 기준, 주말 제외</span>
        </header>
        <table className="data-table num">
          <thead>
            <tr>
              <th scope="col">결제일</th>
              <th scope="col">건수</th>
              <th scope="col">매수</th>
              <th scope="col">매도</th>
              <th scope="col">수수료</th>
              <th scope="col">순 현금</th>
              <th scope="col">상태</th>
            </tr>
          </thead>
          <tbody>
            {settlements.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  결제할 체결이 없습니다.
                </td>
              </tr>
            )}
            {settlements.map((d) => (
              <tr key={d.settleDate}>
                <td>{d.settleDate}</td>
                <td>{formatNumber(d.count)}</td>
                <td>{formatNumber(d.buyAmount)}</td>
                <td>{formatNumber(d.sellAmount)}</td>
                <td>{formatNumber(d.fees)}</td>
                <td className={d.netCash > 0 ? 'up' : d.netCash < 0 ? 'down' : undefined}>{formatSigned(d.netCash)}</td>
                <td>
                  <span className="sub">{d.settleDate > today ? '결제 대기' : '결제 완료'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel journal" aria-labelledby="journal-title">
        <header className="panel-head">
          <h2 id="journal-title" className="panel-title">원장 거래</h2>
          <span className="panel-meta">
            체결 하나가 원장 거래 하나 · 자산별 합계 0{journals.length > JOURNAL_LIMIT && ` · 최근 ${JOURNAL_LIMIT}건`}
          </span>
        </header>
        <div className="journal-scroll">
          <table className="data-table num journal-table">
            <thead>
              <tr>
                <th scope="col">체결 순번</th>
                <th scope="col">시각</th>
                <th scope="col">원거래</th>
                <th scope="col">계정</th>
                <th scope="col">자산</th>
                <th scope="col">증감</th>
              </tr>
            </thead>
            {journals.length === 0 && (
              <tbody>
                <tr>
                  <td colSpan={6} className="empty">
                    아직 원장 거래가 없습니다. 거래 화면에서 주문이 체결되면 여기에 기록됩니다.
                  </td>
                </tr>
              </tbody>
            )}
            {journals
              .slice(-JOURNAL_LIMIT)
              .reverse()
              .map((j) => (
                <tbody key={j.tradeSeq} className="journal-group">
                  {j.lines.map((line, i) => (
                    <tr key={i}>
                      {i === 0 && (
                        <>
                          <th scope="rowgroup" rowSpan={j.lines.length}>
                            {formatNumber(j.tradeSeq)}
                          </th>
                          <td rowSpan={j.lines.length} className="sub">
                            {formatTime(j.time)}
                          </td>
                          <td rowSpan={j.lines.length}>
                            {findSymbol(j.symbol)?.name} <span className={j.side === 'BUY' ? 'up' : 'down'}>{j.side === 'BUY' ? '매수' : '매도'}</span>
                            <span className="sub">
                              {' '}
                              {formatNumber(j.qty)}주 × {formatNumber(j.price)}
                            </span>
                          </td>
                        </>
                      )}
                      <td>{ACCOUNT_LABEL[line.account]}</td>
                      <td>{assetLabel(line.asset)}</td>
                      <td>
                        {formatSigned(line.amount)}
                        {line.asset === 'KRW' ? '원' : '주'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
          </table>
        </div>
      </section>
    </div>
  )
}
