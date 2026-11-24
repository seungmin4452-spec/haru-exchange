import { useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { useMarket } from '../data/market'
import { CandleChart } from '../features/trade/CandleChart'
import { OrderBookPanel } from '../features/trade/OrderBookPanel'
import { OrderForm } from '../features/trade/OrderForm'
import { SymbolHeader } from '../features/trade/SymbolHeader'
import { TradeTape } from '../features/trade/TradeTape'
import { WatchList } from '../features/trade/WatchList'
import '../features/trade/trade.css'
import { findSymbol, mockSymbols } from '../mocks/symbols'

export function TradePage() {
  const { symbol } = useParams()
  const info = findSymbol(symbol)
  const market = useMarket()
  const [picked, setPicked] = useState<{ price: number; nonce: number } | null>(null)

  if (!info) return <Navigate to={`/trade/${mockSymbols[0].symbol}`} replace />

  const quote = market.quotes[info.symbol]
  return (
    <div className="trade-layout">
      <WatchList quotes={market.quotes} />
      <div className="trade-center">
        <SymbolHeader info={info} quote={quote} candles={market.candles[info.symbol]} metrics={market.metrics} />
        <CandleChart symbol={info.symbol} candles={market.candles[info.symbol]} />
        <TradeTape trades={market.trades[info.symbol]} />
      </div>
      <div className="trade-side">
        <OrderBookPanel
          book={market.books[info.symbol]}
          prevClose={info.prevClose}
          lastPrice={quote.price}
          onPickPrice={(price) => setPicked((p) => ({ price, nonce: (p?.nonce ?? 0) + 1 }))}
        />
        <OrderForm
          key={info.symbol}
          info={info}
          lastPrice={quote.price}
          account={market.account}
          orders={market.orders}
          picked={picked}
        />
      </div>
    </div>
  )
}
