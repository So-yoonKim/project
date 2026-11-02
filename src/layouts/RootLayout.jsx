import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Badge, Button, Container, Nav, Navbar, Offcanvas, Toast, ToastContainer } from 'react-bootstrap'
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
  const [navOpen, setNavOpen] = useState(false)
  const closeNav = () => setNavOpen(false)

  useEffect(() => { loadCart() }, [loadCart]) // 앱을 열 때 Supabase 에서 내 나들이 불러오기
  useEffect(() => { document.documentElement.lang = lang; document.title = t('brand') }, [lang, t])

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* 넓은 화면(xl 이상): 메뉴와 버튼을 상단 바에 그대로 펼친다 / 폰·태블릿: 로고와 ☰ 버튼만 두고 나머지는 오른쪽 옆 메뉴로 */}
      <Navbar expand="xl" className="shop-nav" sticky="top" data-bs-theme="dark">
        <Container>
          <Navbar.Brand as={NavLink} to="/" className="shop-brand">
            <i className="bi bi-shop me-2" />{t('brand')}
          </Navbar.Brand>
          <Nav className="me-auto d-none d-xl-flex">
            {NAV_ITEMS.map((item) => (
              <Nav.Link key={item.to} as={NavLink} to={item.to} end={item.to === '/'}>
                <i className={`bi bi-${item.icon} me-1`} />{t(item.key)}
              </Nav.Link>
            ))}
          </Nav>
          <div className="d-none d-xl-flex align-items-center gap-2 flex-shrink-0">
            <LangSwitcher />
            <Button as={NavLink} to="/map3d" className="cart-btn top-fixed" aria-label={t('m3d.button')}>
              <i className="bi bi-badge-3d-fill me-1" />{t('m3d.button')}
            </Button>
            <Button className="cart-btn top-fixed" onClick={() => setCartOpen(true)} aria-label={t('cart.open')}>
              <i className="bi bi-basket3-fill me-1" />{t('cart.button')}
              {cartCount > 0 && <Badge pill className="cart-count ms-2">{cartCount}</Badge>}
            </Button>
          </div>
          <button type="button" className="nav-burger d-xl-none" aria-label={t('nav.menu')} onClick={() => setNavOpen(true)}>
            <i className="bi bi-list" />
            {cartCount > 0 && <Badge pill className="cart-count nav-burger-count">{cartCount}</Badge>}
          </button>
        </Container>
      </Navbar>

      {/* 폰·태블릿용 오른쪽 옆 메뉴: 언어 → 3D지도 → 장바구니 → 페이지 이동 */}
      <Offcanvas show={navOpen} onHide={closeNav} placement="end" className="nav-drawer">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="svg-title">{t('nav.menu')}</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <LangSwitcher inline />
          <div className="nav-drawer-actions">
            <Button as={NavLink} to="/map3d" className="cart-btn" onClick={closeNav}>
              <i className="bi bi-badge-3d-fill me-2" />{t('m3d.button')}
            </Button>
            <Button className="cart-btn" onClick={() => { closeNav(); setCartOpen(true) }}>
              <i className="bi bi-basket3-fill me-2" />{t('cart.button')}
              {cartCount > 0 && <Badge pill className="cart-count ms-2">{cartCount}</Badge>}
            </Button>
          </div>
          <nav className="nav-drawer-links">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={closeNav}>
                <i className={`bi bi-${item.icon} me-2`} />{t(item.key)}
              </NavLink>
            ))}
          </nav>
        </Offcanvas.Body>
      </Offcanvas>

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
