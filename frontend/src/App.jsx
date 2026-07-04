import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './context/AuthContext'

import Home from './pages/Home'
import Menu from './pages/Menu'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import OrderHistory from './pages/OrderHistory'
import OrderTracking from './pages/OrderTracking'

import RestaurantLogin from './pages/restaurant/Login'
import RestaurantSignup from './pages/restaurant/Signup'
import RestaurantDashboard from './pages/restaurant/Dashboard'
import RestaurantMenu from './pages/restaurant/Menu'

import DeliveryLogin from './pages/delivery/Login'
import DeliverySignup from './pages/delivery/Signup'
import DeliveryDashboard from './pages/delivery/Dashboard'

import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'

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
  const { checkAuth } = useAuth()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <div className="app">
      <Routes>
        <Route path="/restaurant/login" element={<RestaurantLogin />} />
        <Route path="/restaurant/signup" element={<RestaurantSignup />} />
        <Route path="/restaurant/dashboard" element={<RestaurantDashboard />} />
        <Route path="/restaurant/menu" element={<RestaurantMenu />} />

        <Route path="/delivery/login" element={<DeliveryLogin />} />
        <Route path="/delivery/signup" element={<DeliverySignup />} />
        <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />

        <Route path="/" element={<MainLayout><Home /></MainLayout>} />
        <Route path="/menu" element={<MainLayout><Menu /></MainLayout>} />
        <Route path="/login" element={<MainLayout><Login /></MainLayout>} />
        <Route path="/signup" element={<MainLayout><Signup /></MainLayout>} />
        <Route path="/cart" element={<MainLayout><Cart /></MainLayout>} />
        <Route path="/checkout" element={
          <ProtectedRoute>
            <MainLayout><Checkout /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/order-success" element={
          <ProtectedRoute>
            <MainLayout><OrderSuccess /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/order-history" element={
          <ProtectedRoute>
            <MainLayout><OrderHistory /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/tracking" element={
          <ProtectedRoute>
            <MainLayout><OrderTracking /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<MainLayout><Home /></MainLayout>} />
      </Routes>
    </div>
  )
}

export default App
