# 프론트엔드 인수인계 (HANDOFF)

프론트엔드 작업을 이어받을 때 이 파일부터 읽는다. 작업을 멈출 때마다 **현재 상태**와 **다음 할 일**을 갱신한다.

- 마지막 갱신: 2026-11-25
- 관리 이슈: #19 (F.1~F.5, 0단계), #20 (F.6~F.15, 4단계)
- 디자인 기준: 루트 `PRODUCT.md`, `DESIGN.md`, `.impeccable/surfaces/`

## 현재 상태

F.1~F.12까지 끝나 모두 `main`에 머지됐다. 화면 7개를 목 데이터로 만들었고, F.13부터는 백엔드 API가 필요해서 멈춘 상태다. F.13 전 정리로 라우트별 코드 분할과 공통 표 스타일 이동을 마쳤다.

| WBS | 내용 | PR | 상태 |
| --- | --- | --- | --- |
| F.1~F.5 | 뼈대, PRODUCT.md, DESIGN.md, CI, 라우트·목 데이터 | #24, #25, #28, #29, #30 | 완료 |
| F.6 | 거래 화면 (호가창, 캔들, 체결, 주문) | #32 | 완료 |
| F.7 | 시장 시뮬레이터 | #33 | 완료 |
| F.8 | 장애 복구 화면 | #35 | 완료 |
| F.9 | 내 자산 | #36 | 완료 |
| F.10 | 주문 내역 (정정·취소) | #38 | 완료 |
| F.11 | 원장·대사 | #39 | 완료 |
| F.12 | 운영 콘솔 | #40 | 완료 |
| F.13 | 목 데이터를 REST·WebSocket으로 교체 | - | 백엔드 대기 |
| F.14 | `compose.yaml`에 frontend 서비스 추가 (4.16) | - | 보류 |
| F.15 | 데모 리허설, 장애 복구 30초 GIF (4.18) | - | 백엔드 대기 |

## 다음 할 일

1. **F.13 백엔드 연동.** 선행: 백엔드 4.2(WebSocket `/ws/market/{symbol}`, `/ws/me/orders`)와 2단계 주문·잔고 API.
   - 연결 지점은 `src/data/market.ts` 한 줄(`export const marketSource: MarketSource = new MockMarket()`)이다. `MarketSource` 인터페이스(`src/data/marketSource.ts`)를 구현하는 `ApiMarket`을 만들어 바꾼다.
   - 기획서 API 표(`docs/모의 증권 거래소 기획서.md`)와 화면이 쓰는 메서드를 맞춘다: 주문 `POST /api/orders`(Idempotency-Key 필수), 정정 `PATCH`, 취소 `DELETE`, 포트폴리오 `GET /api/me/portfolio`, 운영 `POST /api/admin/...`.
   - 목 데이터 전용 값(장애 복구 해시, DLQ 3건, TPS·p99 지표, 원장)은 실제 API 응답으로 바꾼다. 원장은 지금 `src/domain/ledger.ts`가 내 체결로 계산하는데, 연동 뒤에는 `journal`, `reconciliation_result` 조회로 교체한다.
   - Vite 개발 서버는 이미 `/api`, `/ws`를 `BACKEND_URL`(기본 `http://localhost:8080`)로 프록시한다.
2. **F.14 compose.** 프론트만 넣는 것은 지금도 가능하지만, `docker compose up` 한 번으로 데모 실행(4.16)은 백엔드 앱 서비스가 compose에 들어온 뒤가 의미 있다. 이미지 버전 고정 규칙(CLAUDE.md)을 지킨다.
3. **F.15 GIF.** 실제 복구 결과로 찍어야 하므로 3단계(Kafka·복구) 이후.

### 미뤄 둔 작업

미뤄 둔 작업은 **`docs/후속 작업.md`**에서 관리한다 (장애 복구 해시 실제 연동 등). 새로 미루는 일이 생기면 그 문서에 적고, 여기에는 적지 않는다.

## 구조 요약

```
frontend/src/
  app/          라우터(화면별 lazy 로딩), 레이아웃(상단 메뉴 52px, 면책 문구)
  data/         MarketSource 인터페이스와 연결 지점(market.ts), useMarket()
  domain/       타입, 호가 단위·상하한가(price.ts), 수수료(fees.ts), 포맷, 원장·대사(ledger.ts)
  mocks/        MockMarket(결정적 가상 시장, seed 20261124), 종목 8개, 난수
  components/   Trend, Flash, chartTheme(차트 공통 설정), components.css(패널·표 등 여러 화면 공통 스타일)
  features/     화면별 컴포넌트와 CSS (trade, simulator, recovery, assets, orders, ledger, operator)
  pages/        라우트 7개
```

**MockMarket이 흉내 내는 기획서 규칙:** 호가 단위, ±30% 상하한가, 수수료 0.015% 올림, 증거금 잠금(시장가 매수는 상한가 기준), 시장가 잔량 취소, 정정 시 시간 우선순위, 서킷브레이커(1분 ±10% → 2분 정지), 장 마감 시 미체결 만료, 수동 정지, 엔진 강제 종료·재생, DLQ 재처리.

## 작업 규칙과 검증

- 브랜치·커밋·PR 규칙은 루트 `CLAUDE.md`를 따른다. 커밋 본문에 `Refs #20 (WBS F.n)`. WBS 번호 하나당 커밋 하나, PR 하나.
- 검증 (모두 `frontend/`에서 실행):
  - `npx tsc -b` (다른 디렉터리에서 실행하면 tsconfig를 못 찾는다)
  - `npm test` (현재 26개), `npm run lint`, `npm run build`
- 화면 확인: `npx vite --port 5174 --strictPort`로 띄우고 헤드리스 크롬으로 스크린샷을 찍는다.
  ```
  "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars \
    --virtual-time-budget=4000 --window-size=1440,900 --screenshot=<경로>.png http://localhost:5174/<route>
  ```
  - 헤드리스 크롬은 최소 폭이 약 512px라서 모바일은 512px로 확인한다.
  - 주문이 있는 상태를 보려면 `src/data/market.ts` 끝에 임시로 `marketSource.submitOrder(...)`를 붙여 찍고, `git checkout`으로 되돌린다. **커밋하지 않는다.**
  - 스크린샷은 `.impeccable/review/`에 둔다 (git 무시됨).

## 주의할 점

- **다른 세션이 같은 저장소의 백엔드를 작업한다.** 프론트 작업은 별도 worktree(`C:\Users\SMSHIN\git\haru-exchange-frontend`)에서 하고, 메인 디렉터리의 `build.gradle`, `compose.yaml` 등 백엔드 파일은 건드리지 않는다. force push는 하지 않는다.
- oxlint의 `react(purity)` 규칙은 렌더 중 `Date.now()`를 막는다. 시각은 스냅샷의 `metricHistory` 마지막 값을 쓰거나, 모듈 수준 함수로 감싸 이벤트 처리에서만 부른다.
- 화면은 라우트마다 따로 청크로 나뉜다. 화면별 CSS는 그 화면에 들어가야 읽히므로, 두 화면 이상이 쓰는 스타일은 `components/components.css`에 둔다.
- 상승 빨강, 하락 파랑. 경고·정지는 `--color-warn`(노랑), 정상·일치는 `--color-ok`(초록). 브라우저 `confirm()` 대신 화면 안에서 두 번 확인한다.
- 종목 이름은 0.7 확정 전까지 임시다 (`src/mocks/symbols.ts`).
