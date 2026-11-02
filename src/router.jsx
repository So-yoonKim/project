import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import Agent from './pages/Agent'
import Check from './pages/Check'
import NotFound from './pages/NotFound'

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
    ],
  },
])
