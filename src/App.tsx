import { AppProvider, useRoute } from './store'
import { CompareBar, Toasts } from './ui'
import Layout from './Layout'
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductPage from './pages/Product'
import Studio from './pages/Studio'
import { Cart, Checkout, PaymentStatus } from './pages/Checkout'
import Auth from './pages/Auth'
import Account from './pages/Account'
import Track from './pages/Track'
import Quote from './pages/Quote'
import DesignSystem from './pages/DesignSystem'
import { About, Gallery, Contact, Faq, Policy, CmsPage, NotFound } from './pages/Info'
import AcceptInvite from './pages/AcceptInvite'
import AdminApp from './admin/AdminApp'
import { useStorefrontSeo } from './seo'

function Router() {
  const { path, query } = useRoute()
  useStorefrontSeo(path)
  const seg = path.split('/').filter(Boolean)
  const [a, b] = seg

  if (a === 'admin') return <><AdminApp path={path} /><Toasts /></>

  let page
  switch (a) {
    case undefined: page = <Home />; break
    case 'shop': page = <Shop key="shop" />; break
    case 'category': page = <Shop key={'c' + b} cat={b} />; break
    case 'search': page = <Shop key={'s' + query.get('q')} q={query.get('q') ?? ''} />; break
    case 'product': page = <ProductPage key={b} id={b} />; break
    case 'customize':
    case 'studio': page = <ProductPage key={b} id={b} />; break
    case 'cart': page = <Cart />; break
    case 'checkout': page = <Checkout />; break
    case 'payment': page = <PaymentStatus state={b} />; break
    case 'order-confirmation': page = <PaymentStatus state="success" />; break
    case 'login': page = <Auth mode="login" />; break
    case 'register': page = <Auth mode="register" />; break
    case 'forgot-password': page = <Auth mode="forgot" />; break
    case 'reset-password': page = <Auth mode="reset" />; break
    case 'verify-email': page = <Auth mode="verify" />; break
    case 'accept-invite': page = <AcceptInvite />; break
    case 'account':
      page = <Account section={b === 'addresses' ? 'addresses' : b === 'orders' ? (seg[2] ? 'order' : 'orders') : b === 'recent' ? 'recent' : b === 'quotes' ? 'quotes' : 'profile'} id={seg[2]} />
      break
    case 'wishlist': page = <Account section="wishlist" />; break
    case 'compare': page = <Account section="compare" />; break
    case 'track': page = <Track />; break
    case 'quote': page = <Quote key={query.get('product') ?? ''} />; break
    case 'about': page = <About />; break
    case 'gallery': page = <Gallery />; break
    case 'contact': page = <Contact />; break
    case 'faq': page = <Faq />; break
    case 'policy': page = <Policy slug={b} />; break
    case 'page':
    case 'pages':
    case 'p':
      page = <CmsPage slug={b} />; break
    case 'design': page = <DesignSystem />; break
    default:
      // If single slug, attempt to load CMS page; if not found, CmsPage renders NotFound
      page = a && !b ? <CmsPage slug={a} /> : <NotFound />
  }
  // auth screens are full-bleed
  if (a === 'login' || a === 'register' || a === 'forgot-password' || a === 'reset-password' || a === 'verify-email' || a === 'accept-invite') return <><main>{page}</main><Toasts /></>
  return <Layout>{page}</Layout>
}

export default function App() {
  return <AppProvider><Router /></AppProvider>
}
