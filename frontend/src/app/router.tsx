import { createBrowserRouter, Navigate } from 'react-router'
import { Layout } from './Layout'

// 화면마다 따로 청크를 만든다. 차트 라이브러리처럼 큰 의존성은 그 화면에 들어갈 때만 받는다.
export const router = createBrowserRouter([
  {
    element: <Layout />,
    // 첫 화면 청크를 받는 동안에도 상단 메뉴와 면책 문구를 보여 준다.
    hydrateFallbackElement: <Layout />,
    children: [
      { index: true, element: <Navigate to="/trade" replace /> },
      {
        path: 'trade/:symbol?',
        lazy: async () => ({ Component: (await import('../pages/TradePage')).TradePage }),
      },
      {
        path: 'simulator',
        lazy: async () => ({ Component: (await import('../pages/SimulatorPage')).SimulatorPage }),
      },
      {
        path: 'recovery',
        lazy: async () => ({ Component: (await import('../pages/RecoveryPage')).RecoveryPage }),
      },
      {
        path: 'assets',
        lazy: async () => ({ Component: (await import('../pages/AssetsPage')).AssetsPage }),
      },
      {
        path: 'orders',
        lazy: async () => ({ Component: (await import('../pages/OrdersPage')).OrdersPage }),
      },
      {
        path: 'ledger',
        lazy: async () => ({ Component: (await import('../pages/LedgerPage')).LedgerPage }),
      },
      {
        path: 'operator',
        lazy: async () => ({ Component: (await import('../pages/OperatorPage')).OperatorPage }),
      },
    ],
  },
])
