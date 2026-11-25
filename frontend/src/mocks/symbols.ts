import type { SymbolInfo } from '../domain/types'

/**
 * 화면 개발용 가상 종목. 백엔드 연동(F.13) 전까지만 쓴다.
 * 업종마다 한 종목씩 8개다. 이름과 업종은 docs/상장 종목.md가 기준이다 (WBS 0.7).
 * 전일 종가는 호가 단위에 맞춘 값이다.
 */
export const mockSymbols: SymbolInfo[] = [
  { symbol: 'HARU', name: '하루엔터', prevClose: 46_750 }, // 엔터
  { symbol: 'BYUL', name: '별길항공우주', prevClose: 13_000 }, // 항공우주
  { symbol: 'NURL', name: '너울조선', prevClose: 31_250 }, // 조선
  { symbol: 'SAEC', name: '새참식품', prevClose: 8_030 }, // 식품
  { symbol: 'NEUL', name: '늘빛원자력', prevClose: 21_900 }, // 원자력
  { symbol: 'ARMR', name: '철갑디펜스', prevClose: 5_440 }, // 방산
  { symbol: 'BRAM', name: '바람모터스', prevClose: 17_650 }, // 자동차
  { symbol: 'SLCN', name: '하루실리콘', prevClose: 9_410 }, // 반도체
]

export function findSymbol(symbol: string | undefined): SymbolInfo | undefined {
  return mockSymbols.find((s) => s.symbol === symbol)
}
