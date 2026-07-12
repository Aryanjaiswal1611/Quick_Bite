import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRestaurantAuth } from '../context/RestaurantAuthContext'
import { useDeliveryAuth } from '../context/DeliveryAuthContext'

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner"></div>
    </div>
  )
}

/** Customer (and admin) protected routes */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

/** Restaurant panel routes */
export function RestaurantProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useRestaurantAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />

  if (!isAuthenticated) {
    return <Navigate to="/restaurant/login" state={{ from: location }} replace />
  }

  return children
}

/** Delivery panel routes */
export function DeliveryProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useDeliveryAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />

  if (!isAuthenticated) {
    return <Navigate to="/delivery/login" state={{ from: location }} replace />
  }

  return children
}
