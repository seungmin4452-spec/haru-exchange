import { fee } from './fees'
import type { Account, Order, Side } from './types'

/**
 * 화면용 복식 원장과 대사. 기획서 3장 "결제와 원장"을 목 데이터에서 재현한다.
 * 백엔드 연동(F.13) 뒤에는 journal, reconciliation_result API 응답으로 바꾼다.
 */

export type LedgerAccount = 'CUSTOMER' | 'COUNTERPARTY' | 'FEE'
/** 'KRW' 또는 종목 코드 */
export type Asset = string

export interface JournalLine {
  account: LedgerAccount
  asset: Asset
  amount: number
}

export interface Journal {
  /** 원거래(체결)의 엔진 순번 */
  tradeSeq: number
  time: number
  symbol: string
  side: Side
  price: number
  qty: number
  tradeDate: string
  settleDate: string
  lines: JournalLine[]
}

const KST_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })

/** epoch ms를 한국 날짜(YYYY-MM-DD)로 */
export function kstDate(time: number): string {
  return KST_DATE.format(time)
}

/** 주말을 건너뛰고 영업일을 더한다. 공휴일은 고려하지 않는 가상 영업일이다 */
export function addBusinessDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  let left = days
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) left--
  }
  return d.toISOString().slice(0, 10)
}

/**
 * 내 체결 하나를 원장 거래 하나로 기록한다. 상대는 봇 계좌, 수수료는 양쪽 모두 0.015% 올림.
 * 현금과 주식 모두 거래별 합계가 0이다.
 */
export function buildJournals(orders: Order[]): Journal[] {
  const journals: Journal[] = []
  for (const order of orders) {
    for (const fill of order.fills) {
      const amount = fill.price * fill.qty
      const counterFee = fee(amount)
      const buy = order.side === 'BUY'
      const tradeDate = kstDate(fill.time)
      journals.push({
        tradeSeq: fill.seq,
        time: fill.time,
        symbol: order.symbol,
        side: order.side,
        price: fill.price,
        qty: fill.qty,
        tradeDate,
        settleDate: addBusinessDays(tradeDate, 2),
        lines: buy
          ? [
              { account: 'CUSTOMER', asset: 'KRW', amount: -(amount + fill.fee) },
              { account: 'COUNTERPARTY', asset: 'KRW', amount: amount - counterFee },
              { account: 'FEE', asset: 'KRW', amount: fill.fee + counterFee },
              { account: 'CUSTOMER', asset: order.symbol, amount: fill.qty },
              { account: 'COUNTERPARTY', asset: order.symbol, amount: -fill.qty },
            ]
          : [
              { account: 'CUSTOMER', asset: 'KRW', amount: amount - fill.fee },
              { account: 'COUNTERPARTY', asset: 'KRW', amount: -(amount + counterFee) },
              { account: 'FEE', asset: 'KRW', amount: fill.fee + counterFee },
              { account: 'CUSTOMER', asset: order.symbol, amount: -fill.qty },
              { account: 'COUNTERPARTY', asset: order.symbol, amount: fill.qty },
            ],
      })
    }
  }
  return journals.sort((a, b) => a.tradeSeq - b.tradeSeq)
}

export interface ReconItem {
  key: string
  label: string
  /** 기준 쪽 설명과 값 */
  left: { label: string; value: number }
  right: { label: string; value: number }
  unit: '원' | '주' | '건'
}

export const reconDiff = (item: ReconItem) => item.left.value - item.right.value

function sumLines(journals: Journal[], filter: (l: JournalLine) => boolean): number {
  let total = 0
  for (const j of journals) for (const l of j.lines) if (filter(l)) total += l.amount
  return total
}

/** 주문, 체결, 원장, 잔고를 서로 맞춰 본다 (기획서: 장 마감 후 대사) */
export function reconcile(initial: Account, account: Account, orders: Order[], journals: Journal[]): ReconItem[] {
  const fills = orders.reduce((n, o) => n + o.fills.length, 0)
  const symbols = new Set<string>([
    ...initial.holdings.map((h) => h.symbol),
    ...account.holdings.map((h) => h.symbol),
    ...journals.map((j) => j.symbol),
  ])
  const stockImbalance = [...symbols].reduce((n, s) => n + Math.abs(sumLines(journals, (l) => l.asset === s)), 0)
  const initialQty = (s: string) => initial.holdings.find((h) => h.symbol === s)?.qty ?? 0
  const currentQty = (s: string) => account.holdings.find((h) => h.symbol === s)?.qty ?? 0
  const ledgerQty = [...symbols].reduce((n, s) => n + initialQty(s) + sumLines(journals, (l) => l.account === 'CUSTOMER' && l.asset === s), 0)
  const heldQty = [...symbols].reduce((n, s) => n + currentQty(s), 0)
  const overfilled = orders.filter((o) => o.filledQty > o.qty || o.fills.reduce((n, f) => n + f.qty, 0) !== o.filledQty).length

  return [
    {
      key: 'orders-fills',
      label: '주문 ↔ 체결',
      left: { label: '체결 수량이 맞지 않는 주문', value: overfilled },
      right: { label: '기대값', value: 0 },
      unit: '건',
    },
    {
      key: 'fills-journal',
      label: '체결 ↔ 원장',
      left: { label: '내 체결', value: fills },
      right: { label: '원장 거래', value: journals.length },
      unit: '건',
    },
    {
      key: 'cash-zero',
      label: '원장 현금 합계',
      left: { label: '전 계정 현금 증감 합', value: sumLines(journals, (l) => l.asset === 'KRW') },
      right: { label: '기대값', value: 0 },
      unit: '원',
    },
    {
      key: 'stock-zero',
      label: '원장 주식 합계',
      left: { label: '종목별 증감 합의 절댓값', value: stockImbalance },
      right: { label: '기대값', value: 0 },
      unit: '주',
    },
    {
      key: 'cash-balance',
      label: '원장 ↔ 현금 잔고',
      left: { label: '기초 현금 + 원장 증감', value: initial.cashAvailable + initial.cashLocked + sumLines(journals, (l) => l.account === 'CUSTOMER' && l.asset === 'KRW') },
      right: { label: '가용 + 잠금 현금', value: account.cashAvailable + account.cashLocked },
      unit: '원',
    },
    {
      key: 'stock-balance',
      label: '원장 ↔ 보유 주식',
      left: { label: '기초 수량 + 원장 증감', value: ledgerQty },
      right: { label: '보유 수량', value: heldQty },
      unit: '주',
    },
  ]
}

export interface SettlementDay {
  settleDate: string
  count: number
  /** 받을 현금(+) 또는 낼 현금(-) */
  netCash: number
  buyAmount: number
  sellAmount: number
  fees: number
}

/** T+2 결제 지시를 결제일별로 묶는다 */
export function settlementByDate(journals: Journal[]): SettlementDay[] {
  const days = new Map<string, SettlementDay>()
  for (const j of journals) {
    const day = days.get(j.settleDate) ?? { settleDate: j.settleDate, count: 0, netCash: 0, buyAmount: 0, sellAmount: 0, fees: 0 }
    const cash = j.lines.find((l) => l.account === 'CUSTOMER' && l.asset === 'KRW')!.amount
    const amount = j.price * j.qty
    day.count++
    day.netCash += cash
    if (j.side === 'BUY') day.buyAmount += amount
    else day.sellAmount += amount
    day.fees += Math.abs(Math.abs(cash) - amount)
    days.set(j.settleDate, day)
  }
  return [...days.values()].sort((a, b) => a.settleDate.localeCompare(b.settleDate))
}
