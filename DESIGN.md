---
name: 하루거래소
description: 업종별 가상 기업 8개가 상장된 모의 증권 거래소의 어두운 3단 HTS 화면
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

> 거래 화면(F.6) 구현을 기준으로 갱신했다. 토큰의 원본은 `frontend/src/styles/tokens.css`이고, 이 파일과 값이 같아야 한다.

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

데스크톱 1440px 기준 3단: 왼쪽 280px 관심 종목, 가운데 가변(종목 헤더, 차트, 체결 220px), 오른쪽 360px(호가창과 주문). 상단 바는 52px이고 화면 전체 높이를 쓴다(최소 720px). 패널 사이와 바깥 간격은 8px이고, 패널 안쪽 여백은 16px이다.

- **1100px 이하:** 관심 종목이 맨 위 가로 스크롤 띠가 되고, 2단(가변 | 340px)으로 바뀐다. 상단 바의 고지 문구는 아래 줄로 내려가며 숨기지 않는다.
- **720px 이하:** 세로 한 단으로 쌓는다. 호가창은 높이 560px로 고정한다.

## Elevation & Depth

그림자를 쓰지 않는다. 깊이는 셸, 패널, 패널 강조의 밝기 세 단계로만 표현한다.

## Shapes

패널 8px, 버튼·입력칸·탭 4px 라운드. 테두리는 1px 구분선만 쓴다.

## Components

- **호가창:** HTS 3단(매도 잔량 | 가격 | 매수 잔량). 매도 칸은 파랑 soft, 매수 칸은 빨강 soft 바탕이고 잔량은 같은 색 막대로 표시한다. 가격 글자색은 전일 종가 대비 등락을 따르고 옆에 등락률을 작게 붙인다. 현재가 행은 가격 칸에 1px 흰 테두리를 두른다. 내 주문 잔량은 흰 바탕 배지(`내 40`)로 표시한다. 높이가 모자라면 위아래 먼 호가부터 똑같이 잘려서 매도·매수 경계가 항상 가운데 온다. 가격을 누르면 주문 가격에 들어간다.
- **체결 하이라이트:** 체결이 들어오면 현재가와 해당 호가 칸이 등락색 soft 바탕으로 600ms 동안 깜빡인다. reduced-motion이면 끈다.
- **주문 입력:** 매수/매도 탭(선택 시 버튼 빨강·파랑), 지정가/시장가 탭, 가격(±한 호가 버튼), 수량(10·25·50%·최대), 금액 요약(주문 가능, 주문 금액, 수수료, 총 잠금 금액 또는 예상 수령액), 주문 버튼 순서로 둔다. 결과와 오류는 버튼 아래 `role="status"` 한 줄로 알린다(성공은 초록, 오류는 노랑). 아래에 이 종목의 내 미체결 주문과 취소 버튼을 둔다.
- **관심 종목:** 이름과 코드, 현재가와 등락률. 선택된 종목은 패널 강조 바탕과 굵은 이름으로 표시한다(색 막대는 쓰지 않는다).
- **차트:** TradingView Lightweight Charts 캔들과 거래량. 양봉 빨강, 음봉 파랑, 거래량은 soft 색. 라이브러리 출처 로고는 끄지 않는다.
- **세그먼트 컨트롤:** 셸 색 바탕 안에서 선택된 칸만 패널 강조 바탕으로 띄운다.
- **고지 문구:** "모든 종목과 자금은 가상이며 투자 권유가 아닙니다"를 상단 바에 항상 표시한다.

## Do's and Don'ts

- **Do** 정합성 지표(엔진 순번, 해시, 대사 차이)를 숫자 그대로 보여준다.
- **Do** 모든 숫자 열을 오른쪽 정렬하고 tabular-nums를 적용한다.
- **Don't** 그림자, 그라데이션 글자, 글래스 효과를 쓰지 않는다.
- **Don't** 이모지나 유니코드 기호를 아이콘 대신 쓰지 않는다. 등락 표시 삼각형은 SVG로 그린다.
- **Don't** 빨강과 파랑을 등락 외의 의미로 쓰지 않는다.
