import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { PageHeader } from '../components/UIComponents'
import { orderApi, paymentApi } from '../services/api'

export default function Checkout() {
  const { user, isAuthenticated } = useAuth()
  const { items, grandTotal, clearCart } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [formData, setFormData] = useState({
    delivery_name: '',
    delivery_phone: '',
    delivery_address: ''
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (items.length === 0) {
      navigate('/cart')
      return
    }
    setFormData(prev => ({ ...prev, delivery_name: user?.name || '' }))
  }, [isAuthenticated, items, user, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.delivery_name || !formData.delivery_phone || !formData.delivery_address) {
      setError('All delivery fields are required.')
      return
    }

    setLoading(true)

    try {
      if (paymentMethod === 'online') {
        const amount = grandTotal
        const createResult = await paymentApi.createOrder(amount)

        if (createResult.isDummy) {
          showToast('Test Mode: Simulating secure online payment...', 'success')
          
          const orderData = {
            ...formData,
            payment_method: 'online',
            paymentStatus: 'Paid',
            transactionId: createResult.order.id
          }

          const orderResult = await orderApi.place(orderData)
          if (orderResult.success) {
            clearCart()
            showToast('Order placed! Redirecting…', 'success')
            navigate(`/order-success?order_id=${orderResult.order_id}`)
          } else {
            setError(orderResult.message || 'Order placement failed.')
          }
          setLoading(false)
          return
        }

        if (window.Razorpay) {
          const options = {
            key: 'rzp_test_dummyKeyId12345',
            amount: createResult.order.amount,
            currency: 'INR',
            name: 'QuickBite',
            description: 'Food Delivery Order',
            order_id: createResult.order.id,
            handler: async (response) => {
              try {
                await paymentApi.verifyPayment({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                })

                const orderData = {
                  ...formData,
                  payment_method: 'online',
                  paymentStatus: 'Paid',
                  transactionId: response.razorpay_payment_id
                }

                const orderResult = await orderApi.place(orderData)
                if (orderResult.success) {
                  clearCart()
                  showToast('Order placed! Redirecting…', 'success')
                  navigate(`/order-success?order_id=${orderResult.order_id}`)
                } else {
                  setError(orderResult.message || 'Order placement failed.')
                }
              } catch (err) {
                setError('Payment verification failed. Please contact support.')
              }
            },
            prefill: {
              name: formData.delivery_name,
              contact: formData.delivery_phone
            },
            theme: { color: '#FF6B35' }
          }

          const rzp = new window.Razorpay(options)
          rzp.on('payment.failed', (response) => {
            setError('Payment failed: ' + response.error.description)
            setLoading(false)
          })
          rzp.open()
        } else {
          setError('Payment gateway not loaded. Please try again.')
          setLoading(false)
        }
      } else {
        const orderData = {
          ...formData,
          payment_method: 'cod'
        }

        const result = await orderApi.place(orderData)
        if (result.success) {
          clearCart()
          showToast('Order placed! Redirecting…', 'success')
          navigate(`/order-success?order_id=${result.order_id}`)
        } else {
          setError(result.message || 'Order placement failed.')
        }
        setLoading(false)
      }
    } catch (err) {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  if (!isAuthenticated || items.length === 0) {
    return null
  }

  return (
    <div className="page-wrapper">
      <PageHeader
        title="Checkout"
        subtitle="Just one step away from your delicious meal!"
        icon="fa-clipboard-check"
      />

      <div className="checkout-section">
        <div className="container">
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
              <i className="fas fa-exclamation-circle"></i>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="checkout-layout">
              <div>
                <div className="checkout-card">
                  <h3><i className="fas fa-map-marker-alt"></i> Delivery Details</h3>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <div className="input-icon-wrapper">
                      <i className="fas fa-user"></i>
                      <input
                        type="text"
                        name="delivery_name"
                        className="form-control"
                        required
                        placeholder="Your full name"
                        value={formData.delivery_name}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <div className="input-icon-wrapper">
                      <i className="fas fa-phone"></i>
                      <input
                        type="tel"
                        name="delivery_phone"
                        className="form-control"
                        required
                        placeholder="+91 XXXXX XXXXX"
                        value={formData.delivery_phone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Delivery Address</label>
                    <textarea
                      name="delivery_address"
                      className="form-control"
                      rows="4"
                      required
                      placeholder="House No., Street, Area, City, PIN Code"
                      style={{ resize: 'vertical' }}
                      value={formData.delivery_address}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="checkout-card">
                  <h3><i className="fas fa-credit-card"></i> Payment Method</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label className={`payment-option ${paymentMethod === 'cod' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                      />
                      <i className="fas fa-money-bill-wave" style={{ color: 'var(--primary)', fontSize: '1.2rem', width: '20px' }}></i>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Cash on Delivery</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pay when your food arrives.</div>
                      </div>
                    </label>
                    <label className={`payment-option ${paymentMethod === 'online' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="online"
                        checked={paymentMethod === 'online'}
                        onChange={() => setPaymentMethod('online')}
                      />
                      <i className="fas fa-credit-card" style={{ color: 'var(--primary)', fontSize: '1.2rem', width: '20px' }}></i>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Pay Online</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pay securely via UPI, Cards, or Netbanking.</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <div className="checkout-card" style={{ position: 'sticky', top: '90px' }}>
                  <h3><i className="fas fa-receipt"></i> Order Summary</h3>
                  {items.map(item => (
                    <div key={item.cart_id} className="order-item-row">
                      <span>{item.food_name} <span style={{ color: 'var(--text-muted)' }}>×{item.quantity}</span></span>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="order-item-row">
                    <span>Subtotal</span>
                    <span>₹{(grandTotal - 30).toFixed(2)}</span>
                  </div>
                  <div className="order-item-row">
                    <span>Delivery</span>
                    <span>₹30.00</span>
                  </div>
                  <div className="order-item-row" style={{ fontWeight: '800', fontSize: '1.1rem', borderTop: '2px solid var(--border)', marginTop: '8px', paddingTop: '12px', color: 'var(--primary)' }}>
                    <span>Total</span>
                    <span>₹{grandTotal.toFixed(2)}</span>
                  </div>
                  <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: '24px' }}>
                    {loading ? (
                      <><i className="fas fa-spinner fa-spin"></i> Processing…</>
                    ) : (
                      <><i className="fas fa-check-circle"></i> Place Order</>
                    )}
                  </button>
                  <a href="/cart" className="btn btn-outline btn-block" style={{ marginTop: '12px' }}>
                    <i className="fas fa-arrow-left"></i> Back to Cart
                  </a>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
