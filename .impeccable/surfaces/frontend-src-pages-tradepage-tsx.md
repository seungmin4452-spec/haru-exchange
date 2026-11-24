---
version: 1
slug: "frontend-src-pages-tradepage-tsx"
primary_target: "frontend/src/pages/TradePage.tsx"
related_targets: []
---

# 거래 화면 (/trade)

Mode: Operate. Audience: 면접관·평가자 (3분 데모, README GIF). Task: 실시간 시장을 보고 주문을 넣어 부분 체결과 잔고 변화를 확인한다.
Constraints: 한국어, 데스크톱 우선(1440 기준, 모바일은 깨지지 않을 정도), 고지 문구 상시 표시, 목 데이터로 먼저 만들고 F.13에서 WebSocket으로 교체.

## Direction contract

THESIS: 국내 HTS와 거래소 웹이 쓰는 어두운 3단 거래 화면을 정석대로 만들고, 마감 품질은 업계 최고 수준에 맞춘다. 장식적인 은유나 테마는 쓰지 않는다.

OWN-WORLD: 셸 #16181D, 패널 #22262E(라운드 8px, 간격 8px), 본문 #E6E8EB, 보조 #9AA1AC. 상승은 빨강 #E8483F, 하락은 파랑 #3C7BF0이고 이 두 색은 등락에만 쓴다. 숫자는 모두 tabular-nums로 열을 맞춘다. 한글 sans 하나로 위계를 만든다. 기준 제품: 토스증권 PC, 키움 영웅문, 업비트 웹, 바이낸스/TradingView.

STORY: 평가자는 첫 화면에서 시장이 실시간으로 움직이는 것을 보고, 매수 주문을 넣어 부분 체결, 호가창의 내 잔량, 주문 가능 금액이 바뀌는 것을 확인한다.

FIRST VIEWPORT: 상단 52px 바에 로고, 화면 7개 내비게이션, 고지 문구. 아래 3단: 왼쪽 280px 관심 종목 8개(현재가, 등락률). 가운데는 종목 헤더(이름, 현재가, 등락, TPS·p99) 아래 캔들 차트, 그 아래 실시간 체결. 오른쪽 360px은 위에 호가창(매도 파랑 위, 매수 빨강 아래, 잔량 막대, 내 잔량 표시), 아래에 주문 입력(매수/매도 탭, 가격, 수량, 주문 가능 금액). 주요 동작은 오른쪽 아래 주문 버튼이다.

FORM: canon (standing exit, user-chosen after one re-roll); seed:1b5fc28df6467e28. Signature interaction: 체결이 들어오면 해당 호가 잔량 셀과 현재가가 등락색으로 짧게 하이라이트되는 HTS 관례(reduced-motion이면 끔). Motion grammar: 150ms 이하 상태 전환만 쓰고 장식 모션은 넣지 않는다.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
