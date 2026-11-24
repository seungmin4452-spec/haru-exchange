---
name: 하루거래소
description: 가상 엔터 기업 8개가 상장된 모의 증권 거래소의 어두운 3단 HTS 화면
colors:
  shell: "#16181d"
  panel: "#22262e"
  panel-raised: "#2a2f38"
  line: "#2f343d"
  text: "#e6e8eb"
  text-sub: "#9aa1ac"
  text-disabled: "#6e7581"
  up: "#ff5b52"
  up-strong: "#d0352e"
  down: "#4d8dff"
  down-strong: "#2a66d4"
  ok: "#3fcf8e"
  warn: "#f5b841"
typography:
  price:
    fontFamily: "Pretendard Variable, Pretendard, Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "tnum"
  headline:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  body-sm:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  label:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
components:
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.md}"
    padding: "16px"
  button-buy:
    backgroundColor: "{colors.up-strong}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "14px 16px"
  button-sell:
    backgroundColor: "{colors.down-strong}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "14px 16px"
  input:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
---

# Design System: 하루거래소

> 상태: 초안. 거래 화면(F.6)을 만든 뒤 실제 화면에서 다시 추출해 갱신한다.
> 토큰의 원본은 `frontend/src/styles/tokens.css`이고, 이 파일과 값이 같아야 한다.

## Overview

**Creative North Star: "정석 HTS"**

국내 증권사 HTS와 거래소 웹이 쓰는 어두운 3단 거래 화면을 정석대로 만든다. 장식적인 은유나 테마는 넣지 않는다. 완성도 기준은 토스증권 PC, 키움 영웅문, 업비트 웹, 바이낸스/TradingView다. 평가자가 처음 보는 순간 어디에 무엇이 있는지 알아야 하고, 그다음에 정합성 지표(엔진 순번, 해시, 원장 합계, 대사 차이)가 눈에 들어와야 한다.

**Key Characteristics:**
- 어두운 셸 위에 한 단계 밝은 패널을 8px 간격으로 붙인다.
- 색은 거의 무채색이다. 의미를 갖는 색은 등락의 빨강과 파랑, 상태의 초록과 노랑뿐이다.
- 숫자는 모두 tabular-nums로 열을 맞춘다.
- 모션은 상태 전환과 체결 하이라이트만 쓴다.

## Colors

무채색 셸 위에서 등락색만 강하게 보인다.

### Primary
- **상승 빨강** (#ff5b52): 상승 가격, 매수 호가, 매수 탭. 패널 위 대비 4.96:1.
- **하락 파랑** (#4d8dff): 하락 가격, 매도 호가, 매도 탭. 패널 위 대비 4.74:1.
- **매수 버튼 빨강** (#d0352e) / **매도 버튼 파랑** (#2a66d4): 흰 글자를 올리는 버튼 바탕. 대비 4.9:1 이상.

### Neutral
- **셸** (#16181d): 페이지 바탕, 입력칸 바탕.
- **패널** (#22262e): 작업 영역.
- **패널 강조** (#2a2f38): 선택된 행, 탭 바탕, 호버.
- **구분선** (#2f343d): 표 행 구분, 패널 내부 구분.
- **본문** (#e6e8eb), **보조** (#9aa1ac, 패널 위 5.83:1), **비활성** (#6e7581, 비활성 상태에만 사용).

### 상태
- **정상 초록** (#3fcf8e): 해시 일치, 대사 차이 0, 원장 합계 0 같은 검증 통과.
- **주의 노랑** (#f5b841): 서킷브레이커, 종목 정지, 소비 지연 경고.

### Named Rules
**한 색 한 역할.** 빨강은 상승, 파랑은 하락에만 쓴다. 링크, 강조, 브랜드 색으로 빨강이나 파랑을 쓰지 않는다. 초록은 '검증 통과'에만 쓰고 상승을 뜻하지 않는다.

## Typography

**Body Font:** Pretendard Variable (fallback: Apple SD Gothic Neo, Malgun Gothic)

**Character:** 한 글꼴로 크기와 굵기만 바꿔 위계를 만든다. 고정폭 글꼴은 쓰지 않고, 숫자 정렬은 tabular-nums로 해결한다.

### Hierarchy
- **Price** (700, 28px): 종목 헤더의 현재가.
- **Headline** (700, 20px): 종목명, 화면 제목.
- **Title** (600, 16px): 패널 제목, 주문 버튼.
- **Body** (400, 14px): 기본 글자.
- **Body-sm** (400, 13px, tnum): 호가창, 체결 내역, 표.
- **Label** (500, 12px): 열 머리, 보조 설명, 고지 문구.

## Layout

데스크톱 1440px 기준 3단: 왼쪽 280px 관심 종목, 가운데 가변(차트와 체결), 오른쪽 360px(호가창과 주문). 상단 바는 52px. 패널 사이와 바깥 간격은 8px이고, 패널 안쪽 여백은 16px이다. 1024px 아래에서는 왼쪽 단을 접고, 720px 아래에서는 세로 한 단으로 쌓는다.

## Elevation & Depth

그림자를 쓰지 않는다. 깊이는 셸, 패널, 패널 강조의 밝기 세 단계로만 표현한다.

## Shapes

패널 8px, 버튼·입력칸·탭 4px 라운드. 테두리는 1px 구분선만 쓴다.

## Components

- **호가창:** 매도 호가는 위에 파랑, 매수 호가는 아래 빨강으로 둔다. 잔량은 해당 색 12% 막대로 표시하고, 현재가 행은 위아래 1px 선으로 구분한다. 내 주문 잔량은 따로 표시한다.
- **체결 하이라이트:** 체결이 들어오면 현재가와 해당 호가 칸이 등락색 soft 바탕으로 600ms 동안 깜빡인다. reduced-motion이면 끈다.
- **주문 입력:** 매수/매도 탭, 가격, 수량, 주문 가능 금액, 주문 버튼을 위에서 아래로 둔다. 버튼 색은 선택한 탭을 따른다.
- **고지 문구:** "모든 종목과 자금은 가상이며 투자 권유가 아닙니다"를 상단 바에 항상 표시한다.

## Do's and Don'ts

- **Do** 정합성 지표(엔진 순번, 해시, 대사 차이)를 숫자 그대로 보여준다.
- **Do** 모든 숫자 열을 오른쪽 정렬하고 tabular-nums를 적용한다.
- **Don't** 그림자, 그라데이션 글자, 글래스 효과를 쓰지 않는다.
- **Don't** 이모지나 유니코드 기호를 아이콘 대신 쓰지 않는다. 등락 표시 삼각형은 SVG로 그린다.
- **Don't** 빨강과 파랑을 등락 외의 의미로 쓰지 않는다.
