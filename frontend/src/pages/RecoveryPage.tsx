import { marketSource, useMarket } from '../data/market'
import { formatNumber, formatTime } from '../domain/format'
import type { EngineState, EngineStatus } from '../domain/types'
import '../features/recovery/recovery.css'
import { mockSymbols } from '../mocks/symbols'

const STAGES: { key: string; label: string; done: (s: EngineStatus) => boolean; current: (s: EngineStatus) => boolean }[] = [
  { key: 'run', label: '정상 운영', done: (s) => s !== 'RUNNING', current: (s) => s === 'RUNNING' },
  { key: 'crash', label: '강제 종료', done: (s) => s === 'REPLAYING' || s === 'VERIFIED', current: (s) => s === 'CRASHED' },
  { key: 'replay', label: '스냅샷 + 명령 로그 재생', done: (s) => s === 'VERIFIED', current: (s) => s === 'REPLAYING' },
  { key: 'verify', label: '호가창 해시 검증', done: () => false, current: (s) => s === 'VERIFIED' },
]

function Action({ engine }: { engine: EngineState }) {
  switch (engine.status) {
    case 'RUNNING':
      return (
        <button type="button" className="drill-action danger" onClick={() => marketSource.crashEngine()}>
          매칭 엔진 강제 종료
        </button>
      )
    case 'CRASHED':
      return (
        <button type="button" className="drill-action" onClick={() => marketSource.startRecovery()}>
          복구 시작
        </button>
      )
    case 'REPLAYING':
      return (
        <button type="button" className="drill-action" disabled>
          명령 로그 재생 중
        </button>
      )
    case 'VERIFIED':
      return (
        <button type="button" className="drill-action" onClick={() => marketSource.resumeEngine()}>
          연속 매매 재개
        </button>
      )
  }
}

export function RecoveryPage() {
  const { engine, metrics, bookHashes } = useMarket()
  const progress = engine.replayTotal > 0 ? engine.replayed / engine.replayTotal : 0
  // 정상 운영 중에는 지금 해시를 보여주고, 종료하면 그 순간 값으로 고정한다
  const before = engine.status === 'RUNNING' ? bookHashes : engine.hashesBefore
  const after = engine.hashesAfter
  const matched = after ? mockSymbols.filter((s) => before?.[s.symbol] === after[s.symbol]).length : 0

  return (
    <div className="recovery-layout">
      <section className="panel drill" aria-labelledby="drill-title">
        <header className="panel-head">
          <h1 id="drill-title" className="panel-title">장애 복구</h1>
          <span className="panel-meta">체결 중 엔진을 죽여도 호가창이 똑같이 돌아오는지 확인합니다</span>
        </header>

        <ol className="stages" aria-label="복구 단계">
          {STAGES.map((stage) => (
            <li
              key={stage.key}
              className={stage.current(engine.status) ? 'current' : stage.done(engine.status) ? 'done' : undefined}
              aria-current={stage.current(engine.status) ? 'step' : undefined}
            >
              {stage.label}
            </li>
          ))}
        </ol>

        <div className="drill-body">
          <dl className="drill-facts num">
            <div>
              <dt>{engine.status === 'RUNNING' ? '현재 엔진 순번' : '종료 시점 순번'}</dt>
              <dd>{formatNumber(engine.status === 'RUNNING' ? metrics.seq : (engine.crashSeq ?? 0))}</dd>
            </div>
            <div>
              <dt>마지막 스냅샷</dt>
              <dd>{engine.snapshotSeq ? formatNumber(engine.snapshotSeq) : '-'}</dd>
            </div>
            <div>
              <dt>재생할 명령</dt>
              <dd>{engine.replayTotal ? `${formatNumber(engine.replayTotal)}건` : '-'}</dd>
            </div>
            <div>
              <dt>중복 반영</dt>
              <dd className={engine.status === 'VERIFIED' ? 'ok' : undefined}>{engine.status === 'VERIFIED' ? `${engine.duplicates}건` : '-'}</dd>
            </div>
          </dl>

          <div className="replay">
            <div className="replay-head num">
              <span>명령 로그 재생</span>
              <span>
                {formatNumber(engine.replayed)} / {formatNumber(engine.replayTotal)} · {Math.round(progress * 100)}%
              </span>
            </div>
            <div
              className="replay-track"
              role="progressbar"
              aria-label="명령 로그 재생 진행률"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <span style={{ width: `${progress * 100}%` }} />
            </div>
          </div>

          <Action engine={engine} />
        </div>
      </section>

      <section className="panel hashes" aria-labelledby="hash-title">
        <header className="panel-head">
          <h2 id="hash-title" className="panel-title">호가창 해시 비교</h2>
          {after ? (
            <span className={`verdict ${matched === mockSymbols.length ? 'ok' : 'bad'}`} role="status">
              {matched === mockSymbols.length ? `${matched}종목 모두 일치` : `${mockSymbols.length - matched}종목 불일치`}
            </span>
          ) : (
            <span className="panel-meta">{engine.status === 'RUNNING' ? '체결될 때마다 바뀝니다' : '종료 직전 해시를 고정했습니다'}</span>
          )}
        </header>
        <table className="data-table hash-table">
          <thead>
            <tr>
              <th scope="col">종목</th>
              <th scope="col">{engine.status === 'RUNNING' ? '현재' : '종료 직전'}</th>
              <th scope="col">복구 후</th>
              <th scope="col">결과</th>
            </tr>
          </thead>
          <tbody>
            {mockSymbols.map((s) => {
              const b = before?.[s.symbol]
              const a = after?.[s.symbol]
              return (
                <tr key={s.symbol}>
                  <td>{s.name}</td>
                  <td className="hash">{b ?? '-'}</td>
                  <td className="hash">{a ?? (engine.status === 'REPLAYING' ? '재생 중' : '-')}</td>
                  <td>{a ? <span className={a === b ? 'ok' : 'bad'}>{a === b ? '일치' : '불일치'}</span> : '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="panel drill-log" aria-labelledby="log-title">
        <header className="panel-head">
          <h2 id="log-title" className="panel-title">복구 기록</h2>
          <span className="panel-meta">가상 시나리오</span>
        </header>
        {engine.log.length === 0 ? (
          <p className="feed-empty">아직 기록이 없습니다. 엔진을 강제 종료하면 단계별 기록이 여기에 남습니다.</p>
        ) : (
          <ol className="log-list num" aria-live="polite">
            {engine.log.map((entry, i) => (
              <li key={i}>
                <time>{formatTime(entry.time).slice(0, 8)}</time>
                <span>{entry.text}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
