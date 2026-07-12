import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute, {
  RestaurantProtectedRoute,
  DeliveryProtectedRoute
} from './components/ProtectedRoute'

const Home = lazy(() => import('./pages/Home'))
const Menu = lazy(() => import('./pages/Menu'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'))
const OrderHistory = lazy(() => import('./pages/OrderHistory'))
const OrderTracking = lazy(() => import('./pages/OrderTracking'))

const RestaurantLogin = lazy(() => import('./pages/restaurant/Login'))
const RestaurantSignup = lazy(() => import('./pages/restaurant/Signup'))
const RestaurantDashboard = lazy(() => import('./pages/restaurant/Dashboard'))
const RestaurantMenu = lazy(() => import('./pages/restaurant/Menu'))

const DeliveryLogin = lazy(() => import('./pages/delivery/Login'))
const DeliverySignup = lazy(() => import('./pages/delivery/Signup'))
const DeliveryDashboard = lazy(() => import('./pages/delivery/Dashboard'))

function PageLoader() {
  return (
    <div className="loading-screen">
      <div className="spinner"></div>
    </div>
  )
}

function MainLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="main-content">{children}</main>
      <Footer />
    </>
  )
}

function App() {
  return (
    <div className="app">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Restaurant panel */}
          <Route path="/restaurant/login" element={<RestaurantLogin />} />
          <Route path="/restaurant/signup" element={<RestaurantSignup />} />
          <Route
            path="/restaurant/dashboard"
            element={
              <RestaurantProtectedRoute>
                <RestaurantDashboard />
              </RestaurantProtectedRoute>
            }
          />
          <Route
            path="/restaurant/menu"
            element={
              <RestaurantProtectedRoute>
                <RestaurantMenu />
              </RestaurantProtectedRoute>
            }
          />

          {/* Delivery panel */}
          <Route path="/delivery/login" element={<DeliveryLogin />} />
          <Route path="/delivery/signup" element={<DeliverySignup />} />
          <Route
            path="/delivery/dashboard"
            element={
              <DeliveryProtectedRoute>
                <DeliveryDashboard />
              </DeliveryProtectedRoute>
            }
          />

          {/* Customer app */}
          <Route path="/" element={<MainLayout><Home /></MainLayout>} />
          <Route path="/menu" element={<MainLayout><Menu /></MainLayout>} />
          <Route path="/login" element={<MainLayout><Login /></MainLayout>} />
          <Route path="/signup" element={<MainLayout><Signup /></MainLayout>} />
          <Route path="/cart" element={<MainLayout><Cart /></MainLayout>} />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <MainLayout><Checkout /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-success"
            element={
              <ProtectedRoute>
                <MainLayout><OrderSuccess /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-history"
            element={
              <ProtectedRoute>
                <MainLayout><OrderHistory /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracking"
            element={
              <ProtectedRoute>
                <MainLayout><OrderTracking /></MainLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<MainLayout><Home /></MainLayout>} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default App
