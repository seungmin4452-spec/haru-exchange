import type { SymbolInfo } from '../domain/types'

/**
 * 화면 개발용 가상 종목. 백엔드 연동(F.13) 전까지만 쓴다.
 * 가상 하루 그룹의 업종별 계열사 8개다. 이름과 업종은 docs/상장 종목.md가 기준이다 (WBS 0.7).
 * 전일 종가는 호가 단위에 맞춘 값이다.
 */
export const mockSymbols: SymbolInfo[] = [
  { symbol: 'ENTR', name: '하루엔터', prevClose: 46_750 }, // 엔터
  { symbol: 'ORBT', name: '하루스페이스', prevClose: 13_000 }, // 항공우주
  { symbol: 'OCEN', name: '하루오션', prevClose: 31_250 }, // 조선
  { symbol: 'FOOD', name: '하루식품', prevClose: 8_030 }, // 식품
  { symbol: 'ENRG', name: '하루에너지', prevClose: 21_900 }, // 원자력
  { symbol: 'SYST', name: '하루시스템', prevClose: 5_440 }, // 방산
  { symbol: 'AUTO', name: '하루차', prevClose: 17_650 }, // 자동차
  { symbol: 'ELEC', name: '하루전자', prevClose: 9_410 }, // 반도체
]

export function findSymbol(symbol: string | undefined): SymbolInfo | undefined {
  return mockSymbols.find((s) => s.symbol === symbol)
}
