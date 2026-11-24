import { useMarket } from '../data/market'
import { formatNumber } from '../domain/format'
import { MarketBoard } from '../features/simulator/MarketBoard'
import { MetricsChart } from '../features/simulator/MetricsChart'
import { NewsFeed } from '../features/simulator/NewsFeed'
import { NewsPublisher } from '../features/simulator/NewsPublisher'
import { SimControls } from '../features/simulator/SimControls'
import '../features/simulator/simulator.css'

export function SimulatorPage() {
  const market = useMarket()
  const { metrics, sim } = market
  // 정지 남은 시간은 스냅샷의 마지막 지표 시각(1초 단위)으로 계산한다
  const now = (market.metricHistory.at(-1)?.time ?? 0) * 1000

  return (
    <div className="sim-layout">
      <div className="sim-left">
        <SimControls sim={sim} />
        <NewsPublisher halts={market.halts} />
      </div>
      <div className="sim-center">
        <section className="panel metrics-panel" aria-labelledby="metrics-title">
          <header className="panel-head">
            <h2 id="metrics-title" className="panel-title">처리량과 지연</h2>
            <span className="panel-meta">1초 간격 · 최근 2분 · 가상 지표</span>
          </header>
          <dl className="metric-strip num">
            <div><dt>체결 TPS</dt><dd>{formatNumber(metrics.tps)}</dd></div>
            <div><dt>p99 지연</dt><dd>{metrics.p99LatencyMs}ms</dd></div>
            <div><dt>소비 지연</dt><dd>{formatNumber(metrics.consumerLag)}건</dd></div>
            <div><dt>엔진 순번</dt><dd>{formatNumber(metrics.seq)}</dd></div>
            <div><dt>봇</dt><dd>{formatNumber(sim.bots)}개</dd></div>
          </dl>
          <MetricsChart history={market.metricHistory} />
        </section>
        <MarketBoard market={market} now={now} />
      </div>
      <NewsFeed news={market.news} />
    </div>
  )
}
