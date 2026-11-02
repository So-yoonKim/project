import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Badge, Button, Container, Nav, Navbar, Toast, ToastContainer } from 'react-bootstrap'
import { NAV_ITEMS } from '../router'
import { useAppStore } from '../store/useAppStore'
import { useT } from '../i18n/useT'
import CartDrawer from '../components/CartDrawer'
import LangSwitcher from '../components/LangSwitcher'

export default function RootLayout() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const toasts = useAppStore((s) => s.toasts)
  const cartCount = useAppStore((s) => s.cart.length)
  const setCartOpen = useAppStore((s) => s.setCartOpen)
  const loadCart = useAppStore((s) => s.loadCart)

  const wide = useLocation().pathname === '/map3d'

  useEffect(() => { loadCart() }, [loadCart]) // 앱을 열 때 Supabase 에서 내 나들이 불러오기
  useEffect(() => { document.documentElement.lang = lang; document.title = t('brand') }, [lang, t])

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar expand="xl" className="shop-nav" collapseOnSelect sticky="top" data-bs-theme="dark">
        <Container>
          <Navbar.Brand as={NavLink} to="/" className="shop-brand">
            <i className="bi bi-shop me-2" />{t('brand')}
          </Navbar.Brand>
          <div className="d-flex align-items-center gap-2 order-xl-last flex-shrink-0">
            <LangSwitcher />
            <Button as={NavLink} to="/map3d" className="cart-btn top-fixed" aria-label={t('m3d.button')}>
              <i className="bi bi-badge-3d-fill me-1" />{t('m3d.button')}
            </Button>
            <Button className="cart-btn top-fixed" onClick={() => setCartOpen(true)} aria-label={t('cart.open')}>
              <i className="bi bi-basket3-fill me-1" />{t('cart.button')}
              {cartCount > 0 && <Badge pill className="cart-count ms-2">{cartCount}</Badge>}
            </Button>
            <Navbar.Toggle aria-controls="main-nav" />
          </div>
          <Navbar.Collapse id="main-nav">
            <Nav className="me-auto">
              {NAV_ITEMS.map((item) => (
                <Nav.Link key={item.to} as={NavLink} to={item.to} end={item.to === '/'} eventKey={item.to}>
                  <i className={`bi bi-${item.icon} me-1`} />{t(item.key)}
                </Nav.Link>
              ))}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* 3D 지도는 화면 가득, 나머지 화면은 가운데 정렬 */}
      <main className={`flex-grow-1 ${wide ? '' : 'py-4'}`}>
        {wide ? <Outlet /> : <Container><Outlet /></Container>}
      </main>

      <footer className="shop-footer py-3">
        <Container className="small">{t('footer')}</Container>
      </footer>

      <CartDrawer />

      <ToastContainer position="bottom-end" className="p-3 position-fixed">
        {toasts.map((x) => (
          <Toast key={x.id} bg={x.variant}>
            <Toast.Body className="text-white">{x.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </div>
  )
}
