import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { Loading } from './components/Status'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import Agent from './pages/Agent'
import Check from './pages/Check'
import NotFound from './pages/NotFound'

// 3D 지도(three.js)는 용량이 커서 그 화면에 들어갈 때만 불러온다
const Map3D = lazy(() => import('./pages/Map3D'))

// 메뉴 추가: ① pages/ 에 파일 ② NAV_ITEMS 에 한 줄 ③ routes 에 한 줄
export const NAV_ITEMS = [
  { to: '/', key: 'nav.home', icon: 'shop' },
  { to: '/agent', key: 'nav.agent', icon: 'chat-heart' },
  { to: '/check', key: 'nav.check', icon: 'clipboard-check' },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'agent', element: <Agent /> },
      { path: 'check', element: <Check /> },
      { path: 'map3d', element: <Suspense fallback={<Loading text="..." />}><Map3D /></Suspense> },
    ],
  },
])
