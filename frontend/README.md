# 하루거래소 프론트엔드

React + TypeScript + Vite. 기획서의 화면 7개를 담는다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
```

개발 서버는 `/api`와 `/ws` 요청을 Spring(`http://localhost:8080`)으로 넘긴다. 다른 주소를 쓰려면 `BACKEND_URL`을 지정한다.

```bash
BACKEND_URL=http://localhost:8081 npm run dev
```

## 스크립트

- `npm run build`: 타입 검사 후 `dist/`로 빌드
- `npm run lint`: oxlint
- `npm run preview`: 빌드 결과 미리 보기

## 주요 라이브러리

- React Router: 화면 라우팅
- TanStack Query: 서버 상태
- [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/): 캔들 차트 (Apache 2.0, 출처 표기 필요)
