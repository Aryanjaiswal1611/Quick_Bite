import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDeliveryAuth } from '../../context/DeliveryAuthContext'
import { useToast } from '../../context/ToastContext'

const VEHICLE_OPTIONS = [
  { value: 'Bike', label: 'Bike' },
  { value: 'Scooter', label: 'Scooter' },
  { value: 'Bicycle', label: 'Bicycle' },
  { value: 'Car', label: 'Car' }
]

export default function DeliverySignup() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { signup } = useDeliveryAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    vehicle_type: 'Bike'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!/^\d{10}$/.test(formData.phone)) {
      setError('Please enter a valid 10-digit phone number')
      return
    }

    setLoading(true)

    try {
      const data = await signup({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        vehicle_type: formData.vehicle_type
      })
      if (data.success) {
        showToast('Registration successful!', 'success')
        navigate('/delivery/dashboard')
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon" style={{ background: 'rgba(76, 175, 80, 0.1)' }}>
              <i className="fas fa-motorcycle" style={{ color: '#4caf50' }}></i>
            </div>
            <h2>Become a Delivery Partner</h2>
            <p>Start earning with QuickBite</p>
          </div>

          {error && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-circle"></i>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <div className="input-wrapper">
                <i className="fas fa-user"></i>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <i className="fas fa-envelope"></i>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <div className="input-wrapper">
                  <i className="fas fa-phone"></i>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="10-digit number"
                    pattern="[0-9]{10}"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="vehicle_type">Vehicle Type</label>
              <div className="input-wrapper">
                <i className="fas fa-motorcycle"></i>
                <select
                  id="vehicle_type"
                  name="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={handleChange}
                  required
                >
                  {VEHICLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <i className="fas fa-lock"></i>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <i className="fas fa-lock"></i>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '18px', height: '18px' }}></span>
                  Registering...
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus"></i> Register as Partner
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/delivery/login">Sign In</Link>
            </p>
            <Link to="/login" className="back-link">
              <i className="fas fa-arrow-left"></i> Back to Customer Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
