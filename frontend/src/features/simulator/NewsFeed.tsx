import { formatTime } from '../../domain/format'
import type { NewsItem } from '../../domain/types'
import { findSymbol } from '../../mocks/symbols'

const TONE_LABEL = { POSITIVE: '호재', NEGATIVE: '악재', SYSTEM: '시장' } as const

export function NewsFeed({ news }: { news: NewsItem[] }) {
  return (
    <section className="panel news-feed" aria-labelledby="feed-title">
      <header className="panel-head">
        <h2 id="feed-title" className="panel-title">뉴스와 시장 이벤트</h2>
        <span className="panel-meta">최근 {news.length}건</span>
      </header>
      {news.length === 0 ? (
        <p className="feed-empty">아직 발행된 뉴스가 없습니다. 왼쪽에서 가상 뉴스를 발행하면 봇이 반응합니다.</p>
      ) : (
        <ol className="feed-list" aria-live="polite">
          {news.map((n) => (
            <li key={n.id} className={`feed-item tone-${n.tone.toLowerCase()}`}>
              <span className="feed-meta num">
                {formatTime(n.time).slice(0, 8)} · {findSymbol(n.symbol)?.name ?? n.symbol}
              </span>
              <span className="feed-tag">{TONE_LABEL[n.tone]}</span>
              <p>{n.headline}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
