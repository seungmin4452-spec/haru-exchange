import { NavLink, Outlet } from 'react-router'
import { navItems } from './navItems'
import './Layout.css'

const DISCLAIMER = '모든 종목과 자금은 가상이며 투자 권유가 아닙니다'

export function Layout() {
  return (
    <div className="shell">
      <header className="shell-header">
        <strong className="brand">하루거래소</strong>
        <nav className="shell-nav" aria-label="주요 화면">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        {/* 기획서 필수 문구: 모든 화면에 항상 표시한다. */}
        <p className="disclaimer">{DISCLAIMER}</p>
      </header>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  )
}
