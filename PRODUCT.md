# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + TypeScript + Vite in `frontend/` (same repository as the Spring backend). Routing: React Router. Server state: TanStack Query. Candles: TradingView Lightweight Charts (attribution required). Frontend work is delegated to Claude; library choices beyond these are Claude's call.

## Users

Primary: interviewers and evaluators of a backend portfolio. They see the product through a 30-second README GIF and a 3-minute local demo (`docker compose up`), and want to verify within minutes that orders, matching, balances, and recovery are correct. Secondary personas the screens role-play: mock investor, market operator, settlement clerk.

## Product Purpose

하루거래소 is a mock stock exchange where 8 fictional entertainment companies are listed. It processes orders, matching, balances, and T+2 settlement. The core promise: if the server dies mid-match, not one won and not one share goes wrong, and the order book is restored identically. The frontend exists to make that promise visible and checkable, not to be a consumer trading app.

## Positioning

The screens show internal correctness as evidence: order book hash before and after recovery, replay progress, ledger sum of zero, reconciliation difference of 0 won, TPS and p99 latency. A neighbouring trading-app clone cannot truthfully show these.

## Operating Context

- Demo scenario (3 min): bots move the market → fictional news ("하루빛 월드투어 매진") triggers a spike and circuit breaker → manual buy with partial fill and balance change → kill the matching engine mid-match → restore from snapshot + command log, hashes match → close market, reconciliation diff 0.
- Desktop-first; viewed on a laptop or recorded as GIF. Mobile only needs to not break.
- UI language: Korean.

## Capabilities and Constraints

- 7 screens, priority order: 거래 화면, 시장 시뮬레이터, 장애 복구 화면 (P1); 내 자산, 주문 내역, 원장·대사 (P2); 운영 콘솔 (P3, may be cut).
- Real-time data over WebSocket `/ws/market/{symbol}`, `/ws/me/orders`; backend not yet built, so screens start on mock data.
- Spot stocks only: limit/market orders, amend, cancel. No credit, shorting, derivatives.
- Frontend schedule budget: about 2 weeks of the 16-week plan.

## Brand Commitments

- Every screen always shows: "모든 종목과 자금은 가상이며 투자 권유가 아닙니다".
- All companies, tickers, prices, and money are fictional. Eight listed affiliates of the fictional 하루 group, one per sector (semiconductor, defense, shipbuilding, nuclear, food, entertainment, automotive, aerospace); the fictional idol group 하루빛 belongs to 하루엔터; names must not collide with real companies or trademarks.
- Name: 하루거래소 (working title).
- Visual direction (chosen 2026-11-24, after one re-roll): the category standard, a dark three-column Korean HTS-style trading screen, executed straight without themed metaphors. Quality bar: 토스증권 PC, 키움 영웅문 HTS, 업비트 웹, 바이낸스 / TradingView.
- Korean market colour convention: red = up, blue = down.

## Evidence on Hand

None yet: no measurements, no real company names finalized (WBS 0.7). Demonstration data is synthetic and labeled as such; benchmark numbers must come from real measurement, never invented.

## Product Principles

1. Correctness is the hero: show the proof (hashes, sums, diffs), not just the result.
2. The 3-minute demo path is the product; every screen earns its place in it.
3. Fiction is explicit: never mistakable for a real market or investment advice.
4. Scope stays small; depth over breadth.
