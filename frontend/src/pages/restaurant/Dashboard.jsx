import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { restaurantApi } from '../../services/api'
import { useRestaurantAuth } from '../../context/RestaurantAuthContext'
import { useToast } from '../../context/ToastContext'
import {
  connectSocket,
  joinRestaurantRoom,
  onNewOrder,
  offNewOrder,
  onStatusUpdate,
  offStatusUpdate
} from '../../services/socket'

export default function RestaurantDashboard() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { restaurant, logout, setRestaurant } = useRestaurantAuth()
  const [orders, setOrders] = useState([])
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [isActive, setIsActive] = useState(!!restaurant?.isActive)

  const loadOrders = useCallback(async () => {
    try {
      const data = await restaurantApi.getOrders()
      if (data.success) {
        setOrders(data.orders || [])
      }
    } catch {
      showToast('Failed to load orders', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const loadPartners = useCallback(async () => {
    try {
      const data = await restaurantApi.getPartners()
      if (data.success) {
        setPartners(data.partners || [])
      }
    } catch {
      // partners list is optional
    }
  }, [])

  useEffect(() => {
    if (restaurant?.isActive != null) {
      setIsActive(!!restaurant.isActive)
    }
  }, [restaurant])

  useEffect(() => {
    loadOrders()
    loadPartners()

    const restaurantId = restaurant?.id || restaurant?._id
    if (restaurantId) {
      connectSocket()
      joinRestaurantRoom(restaurantId)

      const handleNewOrder = () => {
        showToast('New order received!', 'success')
        loadOrders()
      }
      const handleStatus = () => loadOrders()

      onNewOrder(handleNewOrder)
      onStatusUpdate(handleStatus)

      return () => {
        offNewOrder(handleNewOrder)
        offStatusUpdate(handleStatus)
      }
    }
  }, [restaurant, loadOrders, loadPartners, showToast])

  const handleToggleStatus = async () => {
    try {
      const next = !isActive
      const data = await restaurantApi.toggleStatus(next)
      if (data.success) {
        setIsActive(next)
        setRestaurant?.((prev) => (prev ? { ...prev, isActive: next } : prev))
        showToast(data.message, 'success')
      }
    } catch (error) {
      showToast(error.message || 'Failed to update status', 'error')
    }
  }

  const handleLogout = async () => {
    await logout()
    showToast('Logged out successfully', 'success')
    navigate('/restaurant/login')
  }

  const handleAcceptOrder = async (orderId) => {
    try {
      const data = await restaurantApi.acceptOrder(orderId)
      if (data.success) {
        showToast('Order accepted!', 'success')
        loadOrders()
        loadPartners()
      }
    } catch (error) {
      showToast(error.message || 'Failed to accept order', 'error')
    }
  }

  const handleRejectOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to reject this order?')) return
    try {
      const data = await restaurantApi.rejectOrder(orderId)
      if (data.success) {
        showToast('Order rejected', 'info')
        loadOrders()
      }
    } catch (error) {
      showToast(error.message || 'Failed to reject order', 'error')
    }
  }

  const handleAssignPartner = async (orderId, partnerId) => {
    if (!partnerId) {
      showToast('Please select a delivery partner', 'error')
      return
    }
    try {
      const data = await restaurantApi.assignPartner(orderId, partnerId)
      if (data.success) {
        showToast(data.message, 'success')
        loadOrders()
      }
    } catch (error) {
      showToast(error.message || 'Failed to assign partner', 'error')
    }
  }

  const getStatusBadge = (status) => {
    const statusClass = {
      Pending: 'badge-pending',
      Accepted: 'badge-success',
      Rejected: 'badge-danger',
      Preparing: 'badge-info',
      'Out for Delivery': 'badge-warning',
      Delivered: 'badge-success',
      Cancelled: 'badge-danger'
    }
    return `badge ${statusClass[status] || ''}`
  }

  const pendingOrders = orders.filter((o) => o.restaurantStatus === 'Pending')
  const activeOrders = orders.filter(
    (o) =>
      o.restaurantStatus === 'Accepted' &&
      !['Delivered', 'Cancelled'].includes(o.orderStatus)
  )

  return (
    <div className="page-wrapper">
      <div className="restaurant-dashboard">
        <div className="dashboard-header">
          <div>
            <h1>
              <i className="fas fa-utensils"></i> Restaurant Dashboard
            </h1>
            <p>Welcome, {restaurant?.name || restaurant?.restaurantName}</p>
          </div>
          <div className="dashboard-actions">
            <Link to="/restaurant/menu" className="btn btn-outline">
              <i className="fas fa-utensils"></i> Manage Menu
            </Link>
            <button
              onClick={handleToggleStatus}
              className={`btn ${isActive ? 'btn-success' : 'btn-secondary'}`}
            >
              <i className={`fas ${isActive ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
              {isActive ? 'Online' : 'Offline'}
            </button>
            <button onClick={handleLogout} className="btn btn-outline">
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <i className="fas fa-clock"></i>
            <div>
              <h3>{pendingOrders.length}</h3>
              <p>Pending Orders</p>
            </div>
          </div>
          <div className="stat-card">
            <i className="fas fa-fire"></i>
            <div>
              <h3>{activeOrders.length}</h3>
              <p>Active Orders</p>
            </div>
          </div>
          <div className="stat-card">
            <i className="fas fa-motorcycle"></i>
            <div>
              <h3>{partners.length}</h3>
              <p>Available Riders</p>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>
            <i className="fas fa-bell"></i> Pending Orders ({pendingOrders.length})
          </h2>
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-check-circle"></i>
              <p>No pending orders</p>
            </div>
          ) : (
            <div className="orders-grid">
              {pendingOrders.map((order) => (
                <div key={order._id} className="order-card pending">
                  <div className="order-card-header">
                    <span className="order-id">
                      #{String(order._id).slice(-6).toUpperCase()}
                    </span>
                    <span className={getStatusBadge(order.restaurantStatus)}>
                      {order.restaurantStatus}
                    </span>
                  </div>
                  <div className="order-items">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="order-item">
                        <span>
                          {item.quantity}x {item.food_name}
                        </span>
                        <span>₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="order-total">
                    <strong>Total: ₹{order.totalPrice}</strong>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {order.delivery_name} · {order.delivery_phone}
                  </p>
                  <div className="order-actions">
                    <button
                      onClick={() => handleAcceptOrder(order._id)}
                      className="btn btn-success btn-sm"
                    >
                      <i className="fas fa-check"></i> Accept
                    </button>
                    <button
                      onClick={() => handleRejectOrder(order._id)}
                      className="btn btn-danger btn-sm"
                    >
                      <i className="fas fa-times"></i> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-section">
          <h2>
            <i className="fas fa-fire"></i> Active Orders ({activeOrders.length})
          </h2>
          {activeOrders.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-utensils"></i>
              <p>No active orders</p>
            </div>
          ) : (
            <div className="orders-grid">
              {activeOrders.map((order) => (
                <div key={order._id} className="order-card active">
                  <div className="order-card-header">
                    <span className="order-id">
                      #{String(order._id).slice(-6).toUpperCase()}
                    </span>
                    <span className={getStatusBadge(order.orderStatus)}>
                      {order.orderStatus}
                    </span>
                  </div>
                  <div className="order-items">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="order-item">
                        <span>
                          {item.quantity}x {item.food_name}
                        </span>
                        <span>₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="order-total">
                    <strong>Total: ₹{order.totalPrice}</strong>
                  </div>
                  {order.delivery_partner_id ? (
                    <p style={{ fontSize: '0.85rem' }}>
                      <i className="fas fa-motorcycle"></i>{' '}
                      {order.delivery_partner_id.name || 'Partner assigned'}
                    </p>
                  ) : (
                    <div className="assign-partner">
                      <label htmlFor={`partner-${order._id}`}>Assign Delivery Partner:</label>
                      <select
                        id={`partner-${order._id}`}
                        onChange={(e) => handleAssignPartner(order._id, e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select partner
                        </option>
                        {partners.map((partner) => (
                          <option key={partner._id} value={partner._id}>
                            {partner.name} ({partner.vehicle_type})
                          </option>
                        ))}
                      </select>
                      {partners.length === 0 && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          No online delivery partners right now.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
