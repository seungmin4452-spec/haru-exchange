import { useId } from 'react'
import { marketSource } from '../../data/market'
import { formatNumber } from '../../domain/format'
import type { SimConfig } from '../../domain/types'

/** 가상 시장의 주문 속도 상한. MockMarket이 한 번에 처리하는 양에 맞췄다 */
const MAX_RATE = 300
const MAX_BOTS = 500

export function SimControls({ sim }: { sim: SimConfig }) {
  const ids = useId()
  return (
    <section className="panel sim-controls" aria-labelledby={`${ids}-title`}>
      <header className="panel-head">
        <h2 id={`${ids}-title`} className="panel-title">봇 설정</h2>
        <span className={`run-state ${sim.running ? 'running' : 'paused'}`}>{sim.running ? '진행 중' : '일시 정지'}</span>
      </header>
      <div className="sim-body">
        <label className="range-field" htmlFor={`${ids}-bots`}>
          <span>
            봇 수 <output className="num">{formatNumber(sim.bots)}개</output>
          </span>
          <input
            id={`${ids}-bots`}
            type="range"
            min={0}
            max={MAX_BOTS}
            step={10}
            value={sim.bots}
            onChange={(e) => marketSource.setSimConfig({ bots: Number(e.target.value) })}
          />
        </label>
        <label className="range-field" htmlFor={`${ids}-rate`}>
          <span>
            주문 속도 <output className="num">초당 {formatNumber(sim.ordersPerSecond)}건</output>
          </span>
          <input
            id={`${ids}-rate`}
            type="range"
            min={0}
            max={MAX_RATE}
            step={5}
            value={sim.ordersPerSecond}
            onChange={(e) => marketSource.setSimConfig({ ordersPerSecond: Number(e.target.value) })}
          />
        </label>
        <div className="sim-presets" role="group" aria-label="주문 속도 빠르게 고르기">
          {[12, 60, 150, 300].map((rate) => (
            <button
              key={rate}
              type="button"
              aria-pressed={sim.ordersPerSecond === rate}
              onClick={() => marketSource.setSimConfig({ ordersPerSecond: rate })}
            >
              {rate === 12 ? '평온' : rate === 60 ? '활발' : rate === 150 ? '과열' : '최대'}
            </button>
          ))}
        </div>
        <button type="button" className="sim-toggle" onClick={() => marketSource.setSimConfig({ running: !sim.running })}>
          {sim.running ? '시장 일시 정지' : '시장 다시 시작'}
        </button>
      </div>
    </section>
  )
}
