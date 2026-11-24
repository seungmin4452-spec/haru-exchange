import { useId, useState } from 'react'
import { marketSource } from '../../data/market'
import { mockSymbols } from '../../mocks/symbols'

/** 데모용 가상 뉴스. 실존 인물·기업과 무관한 가상 그룹 하루빛과 소속 기업 이야기다 */
const PRESETS = [
  { headline: '하루빛 월드투어 전석 매진', tone: 'POSITIVE' },
  { headline: '하루빛 정규 3집 컴백 발표', tone: 'POSITIVE' },
  { headline: '신작 웹툰 해외 연재 확정', tone: 'POSITIVE' },
  { headline: '신작 게임 사전 예약 100만 돌파', tone: 'POSITIVE' },
  { headline: '월드투어 일부 공연 연기', tone: 'NEGATIVE' },
  { headline: '대표 IP 계약 분쟁 보도', tone: 'NEGATIVE' },
  { headline: '굿즈 품질 논란으로 판매 중단', tone: 'NEGATIVE' },
] as const

export function NewsPublisher({ halts }: { halts: Record<string, number | undefined> }) {
  const ids = useId()
  const [symbol, setSymbol] = useState('HARU')
  const [presetIndex, setPresetIndex] = useState(0)
  const preset = PRESETS[presetIndex]
  const halted = halts[symbol] !== undefined

  return (
    <section className="panel news-publisher" aria-labelledby={`${ids}-title`}>
      <header className="panel-head">
        <h2 id={`${ids}-title`} className="panel-title">가상 뉴스 발행</h2>
        <span className="panel-meta">봇이 30초간 반응</span>
      </header>
      <form
        className="sim-body"
        onSubmit={(e) => {
          e.preventDefault()
          marketSource.publishNews(symbol, preset.headline, preset.tone)
        }}
      >
        <label className="select-field" htmlFor={`${ids}-symbol`}>
          <span>종목</span>
          <select id={`${ids}-symbol`} value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            {mockSymbols.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.name} ({s.symbol})
              </option>
            ))}
          </select>
        </label>
        <fieldset className="preset-list">
          <legend>뉴스</legend>
          {PRESETS.map((p, i) => (
            <label key={p.headline} className={`preset ${p.tone === 'POSITIVE' ? 'up' : 'down'}`}>
              <input type="radio" name={`${ids}-preset`} checked={presetIndex === i} onChange={() => setPresetIndex(i)} />
              <span className="preset-tone">{p.tone === 'POSITIVE' ? '호재' : '악재'}</span>
              <span className="preset-text">{p.headline}</span>
            </label>
          ))}
        </fieldset>
        <button type="submit" className="publish" disabled={halted}>
          {halted ? '거래 정지 중인 종목입니다' : '뉴스 발행'}
        </button>
      </form>
    </section>
  )
}
