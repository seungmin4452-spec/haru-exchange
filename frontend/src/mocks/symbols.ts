import type { SymbolInfo } from '../domain/types'

/**
 * 화면 개발용 가상 종목. 백엔드 연동(F.13) 전까지만 쓴다.
 * 종목명은 임시다. WBS 0.7에서 실존 기업·상표와 겹치지 않는지 확인한 뒤 확정한다.
 * 전일 종가는 호가 단위에 맞춘 값이다.
 */
export const mockSymbols: SymbolInfo[] = [
  { symbol: 'HARU', name: '하루엔터', prevClose: 46_750 },
  { symbol: 'BYUL', name: '별빛레코드', prevClose: 13_000 },
  { symbol: 'MUDE', name: '무대공작소', prevClose: 31_250 },
  { symbol: 'CUTN', name: '컷툰스튜디오', prevClose: 8_030 },
  { symbol: 'PXHR', name: '픽셀하루', prevClose: 21_900 },
  { symbol: 'GDSS', name: '굿즈상회', prevClose: 5_440 },
  { symbol: 'TOUR', name: '하루투어', prevClose: 17_650 },
  { symbol: 'SORI', name: '소리공방', prevClose: 9_410 },
]

export function findSymbol(symbol: string | undefined): SymbolInfo | undefined {
  return mockSymbols.find((s) => s.symbol === symbol)
}
