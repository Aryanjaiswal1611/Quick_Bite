import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { deliveryApi } from '../../services/api'
import { useDeliveryAuth } from '../../context/DeliveryAuthContext'
import { useToast } from '../../context/ToastContext'

export default function DeliveryDashboard() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { partner, logout, setPartner } = useDeliveryAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(!!partner?.is_online)

  const loadOrders = useCallback(async () => {
    try {
      const data = await deliveryApi.getOrders()
      if (data.success) {
        setOrders(data.orders || [])
      }
    } catch {
      // silent — may be offline
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (partner?.is_online != null) {
      setIsOnline(!!partner.is_online)
    }
  }, [partner])

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 15000)
    return () => clearInterval(interval)
  }, [loadOrders])

  const handleToggleStatus = async () => {
    try {
      const data = await deliveryApi.toggleStatus(!isOnline)
      if (data.success) {
        setIsOnline(data.partner.is_online)
        setPartner?.(data.partner)
        showToast(
          `You are now ${data.partner.is_online ? 'online' : 'offline'}`,
          'success'
        )
        loadOrders()
      }
    } catch (error) {
      showToast(error.message || 'Failed to update status', 'error')
    }
  }

  const handleLogout = async () => {
    await logout()
    showToast('Logged out successfully', 'success')
    navigate('/delivery/login')
  }

  const handleUpdateStatus = async (orderId, status) => {
    let codeToSend
    if (status === 'Delivered') {
      const code = window.prompt('Enter the 4-digit verification code from the customer:')
      if (!code) return
      codeToSend = code
    }

    try {
      const data = await deliveryApi.updateStatus(orderId, status, codeToSend)
      if (data.success) {
        showToast(data.message || `Order marked as ${status}`, 'success')
        loadOrders()
        // refresh partner stats (earnings)
        try {
          const me = await deliveryApi.getMe()
          if (me.success) setPartner?.(me.partner)
        } catch {
          // ignore
        }
      }
    } catch (error) {
      showToast(error.message || 'Failed to update status', 'error')
    }
  }

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })

  const preparingOrders = orders.filter((o) => o.orderStatus === 'Preparing')
  const inDeliveryOrders = orders.filter((o) => o.orderStatus === 'Out for Delivery')

  return (
    <div className="page-wrapper">
      <div className="delivery-dashboard">
        <div className="dashboard-header">
          <div>
            <h1>
              <i className="fas fa-motorcycle"></i> Delivery Dashboard
            </h1>
            <p>Welcome, {partner?.name}</p>
          </div>
          <div className="dashboard-actions">
            <button
              onClick={handleToggleStatus}
              className={`btn ${isOnline ? 'btn-success' : 'btn-secondary'}`}
            >
              <i className={`fas fa-circle ${isOnline ? 'text-success' : 'text-muted'}`}></i>
              {isOnline ? 'Online' : 'Offline'}
            </button>
            <button onClick={handleLogout} className="btn btn-outline">
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <i className="fas fa-fire"></i>
            <div>
              <h3>{preparingOrders.length}</h3>
              <p>Pickup Ready</p>
            </div>
          </div>
          <div className="stat-card">
            <i className="fas fa-motorcycle"></i>
            <div>
              <h3>{inDeliveryOrders.length}</h3>
              <p>In Delivery</p>
            </div>
          </div>
          <div className="stat-card">
            <i className="fas fa-star"></i>
            <div>
              <h3>{partner?.averageRating?.toFixed?.(1) || partner?.averageRating || 'New'}</h3>
              <p>Your Rating</p>
            </div>
          </div>
          <div className="stat-card">
            <i className="fas fa-rupee-sign"></i>
            <div>
              <h3>₹{partner?.sessionEarnings ?? partner?.earnings ?? 0}</h3>
              <p>Session Earnings</p>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>
            <i className="fas fa-box"></i> Assigned Orders
          </h2>
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-inbox"></i>
              <p>
                {isOnline
                  ? 'No assigned orders right now. Stay online!'
                  : 'Go online to receive delivery assignments.'}
              </p>
            </div>
          ) : (
            <div className="orders-grid">
              {orders.map((order) => (
                <div key={order._id} className="order-card">
                  <div className="order-card-header">
                    <span className="order-id">
                      #{String(order._id).slice(-6).toUpperCase()}
                    </span>
                    <span className="badge badge-info">{order.orderStatus}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem' }}>
                    <strong>
                      {order.restaurantId?.restaurantName || 'Restaurant'}
                      {order.restaurantId?.branchName
                        ? ` — ${order.restaurantId.branchName}`
                        : ''}
                    </strong>
                  </p>
                  <div className="order-items">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="order-item">
                        <span>
                          {item.quantity}x {item.food_name}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <i className="fas fa-map-marker-alt"></i> {order.delivery_address}
                  </p>
                  <p style={{ fontSize: '0.85rem' }}>
                    {order.delivery_name} · {order.delivery_phone}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Placed {formatTime(order.createdAt)}
                  </p>
                  <div className="order-actions" style={{ marginTop: '12px', gap: '8px', display: 'flex', flexWrap: 'wrap' }}>
                    {order.orderStatus === 'Preparing' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleUpdateStatus(order._id, 'Picked Up')}
                      >
                        <i className="fas fa-hand-holding"></i> Picked Up
                      </button>
                    )}
                    {order.orderStatus === 'Out for Delivery' && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleUpdateStatus(order._id, 'Delivered')}
                      >
                        <i className="fas fa-check"></i> Delivered
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
