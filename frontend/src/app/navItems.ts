/** 기획서 4장의 화면 7개. 순서는 우선순위(1 → 3)를 따른다. */
export const navItems = [
  { path: '/trade', label: '거래' },
  { path: '/simulator', label: '시장 시뮬레이터' },
  { path: '/recovery', label: '장애 복구' },
  { path: '/assets', label: '내 자산' },
  { path: '/orders', label: '주문 내역' },
  { path: '/ledger', label: '원장·대사' },
  { path: '/operator', label: '운영 콘솔' },
] as const
