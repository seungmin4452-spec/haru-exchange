import { createBrowserRouter, Navigate } from 'react-router'
import { Layout } from './Layout'
import { AssetsPage } from '../pages/AssetsPage'
import { LedgerPage } from '../pages/LedgerPage'
import { OperatorPage } from '../pages/OperatorPage'
import { OrdersPage } from '../pages/OrdersPage'
import { RecoveryPage } from '../pages/RecoveryPage'
import { SimulatorPage } from '../pages/SimulatorPage'
import { TradePage } from '../pages/TradePage'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/trade" replace /> },
      { path: 'trade/:symbol?', element: <TradePage /> },
      { path: 'simulator', element: <SimulatorPage /> },
      { path: 'recovery', element: <RecoveryPage /> },
      { path: 'assets', element: <AssetsPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'ledger', element: <LedgerPage /> },
      { path: 'operator', element: <OperatorPage /> },
    ],
  },
])
