import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { deliveryApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

export default function DeliveryDashboard() {
    const navigate = useNavigate()
    const { showToast } = useToast()
    const [partner, setPartner] = useState(null)
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [isOnline, setIsOnline] = useState(false)
    const [verificationCode, setVerificationCode] = useState('')

    useEffect(() => {
        checkAuth()
        loadOrders()
    }, [])

    const checkAuth = async () => {
        try {
            const data = await deliveryApi.getMe()
            if (data.success) {
                setPartner(data.partner)
                setIsOnline(data.partner.is_online)
            } else {
                navigate('/delivery/login')
            }
        } catch (error) {
            navigate('/delivery/login')
        }
    }

    const loadOrders = async () => {
        try {
            const data = await deliveryApi.getOrders()
            if (data.success) {
                setOrders(data.orders)
            }
        } catch (error) {
            console.error('Error loading orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleToggleStatus = async () => {
        try {
            const data = await deliveryApi.toggleStatus(!isOnline)
            if (data.success) {
                setIsOnline(data.partner.is_online)
                showToast(`You are now ${data.partner.is_online ? 'online' : 'offline'}`, 'success')
            }
        } catch (error) {
            showToast('Failed to update status', 'error')
        }
    }

    const handleLogout = async () => {
        try {
            await deliveryApi.logout()
        } catch (error) {
            console.error('Logout error:', error)
        } finally {
            localStorage.removeItem('delivery_token')
            localStorage.removeItem('delivery_user')
            showToast('Logged out successfully', 'success')
            navigate('/delivery/login')
        }
    }

    const handleUpdateStatus = async (orderId, status) => {
        let codeToSend = undefined
        if (status === 'Delivered') {
            if (!verificationCode) {
                const code = window.prompt('Enter the 4-digit verification code from the customer:')
                if (!code) return
                codeToSend = code
            } else {
                codeToSend = verificationCode
            }
        }

        try {
            const data = await deliveryApi.updateStatus(orderId, status, codeToSend)
            if (data.success) {
                showToast(`Order marked as ${status}`, 'success')
                setVerificationCode('')
                loadOrders()
            }
        } catch (error) {
            showToast(error.message || 'Failed to update status', 'error')
        }
    }

    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const preparingOrders = orders.filter(o => o.orderStatus === 'Preparing')
    const inDeliveryOrders = orders.filter(o => o.orderStatus === 'Out for Delivery')

    return (
        <div className="page-wrapper">
            <div className="delivery-dashboard">
                <div className="dashboard-header">
                    <div>
                        <h1><i className="fas fa-motorcycle"></i> Delivery Dashboard</h1>
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
                            <h3>{partner?.averageRating?.toFixed(1) || 'New'}</h3>
                            <p>Your Rating</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <i className="fas fa-motorcycle"></i>
                        <div>
                            <h3>{partner?.vehicle_type || 'N/A'}</h3>
                            <p>Vehicle</p>
                        </div>
                    </div>
                </div>

                <div className="dashboard-section">
                    <h2><i className="fas fa-box"></i> Ready for Pickup ({preparingOrders.length})</h2>
                    {loading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                        </div>
                    ) : preparingOrders.length === 0 ? (
                        <div className="empty-state">
                            <i className="fas fa-box-open"></i>
                            <p>No orders ready for pickup</p>
                        </div>
                    ) : (
                        <div className="orders-grid">
                            {preparingOrders.map(order => (
                                <div key={order._id} className="order-card pickup">
                                    <div className="order-card-header">
                                        <span className="order-id">#{String(order._id).slice(-6).toUpperCase()}</span>
                                        <span className="badge badge-warning">Ready for Pickup</span>
                                    </div>
                                    <div className="restaurant-info">
                                        <i className="fas fa-store"></i>
                                        <div>
                                            <strong>{order.restaurantId?.restaurantName || 'Restaurant'}</strong>
                                            <p>{order.restaurantId?.branchName}</p>
                                        </div>
                                    </div>
                                    <div className="delivery-info">
                                        <i className="fas fa-map-marker-alt"></i>
                                        <div>
                                            <strong>Deliver to:</strong>
                                            <p>{order.delivery_address}</p>
                                        </div>
                                    </div>
                                    <div className="order-items">
                                        {order.items.slice(0, 2).map((item, idx) => (
                                            <div key={idx} className="order-item">
                                                <span>{item.quantity}x {item.food_name}</span>
                                            </div>
                                        ))}
                                        {order.items.length > 2 && (
                                            <div className="order-item">+{order.items.length - 2} more items</div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleUpdateStatus(order._id, 'Picked Up')}
                                        className="btn btn-primary btn-block"
                                    >
                                        <i className="fas fa-box"></i> Mark as Picked Up
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dashboard-section">
                    <h2><i className="fas fa-motorcycle"></i> In Delivery ({inDeliveryOrders.length})</h2>
                    {inDeliveryOrders.length === 0 ? (
                        <div className="empty-state">
                            <i className="fas fa-road"></i>
                            <p>No active deliveries</p>
                        </div>
                    ) : (
                        <div className="orders-grid">
                            {inDeliveryOrders.map(order => (
                                <div key={order._id} className="order-card delivering">
                                    <div className="order-card-header">
                                        <span className="order-id">#{String(order._id).slice(-6).toUpperCase()}</span>
                                        <span className="badge badge-info">Out for Delivery</span>
                                    </div>
                                    <div className="customer-info">
                                        <i className="fas fa-user"></i>
                                        <div>
                                            <strong>{order.delivery_name}</strong>
                                            <p>{order.delivery_phone}</p>
                                        </div>
                                    </div>
                                    <div className="delivery-info">
                                        <i className="fas fa-map-marker-alt"></i>
                                        <div>
                                            <strong>Deliver to:</strong>
                                            <p>{order.delivery_address}</p>
                                        </div>
                                    </div>
                                    <div className="verification-box">
                                        <label>Verification Code:</label>
                                        <input
                                            type="text"
                                            placeholder="Enter 4-digit code"
                                            maxLength="4"
                                            onChange={(e) => setVerificationCode(e.target.value)}
                                        />
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            Ask customer for the code shown on their order confirmation
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleUpdateStatus(order._id, 'Delivered')}
                                        className="btn btn-success btn-block"
                                        disabled={!verificationCode}
                                    >
                                        <i className="fas fa-check-circle"></i> Complete Delivery
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
