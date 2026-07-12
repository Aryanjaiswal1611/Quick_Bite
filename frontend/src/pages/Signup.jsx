import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { signup, isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/menu')
    }
  }, [isAuthenticated, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name] || errors.confirm) {
      setErrors((prev) => ({ ...prev, [name]: '', confirm: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Full name is required.'
    if (!formData.email) newErrors.email = 'Email is required.'
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Invalid email address.'
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.'
    }
    if (formData.password !== formData.confirm_password) {
      newErrors.confirm = 'Passwords do not match.'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const data = await signup(formData)
      if (data.success) {
        showToast('Account created! Redirecting…', 'success')
        navigate(data.redirect || '/menu')
      } else if (data.errors) {
        setErrors(data.errors)
      } else {
        showToast(data.message || 'Signup failed.', 'error')
      }
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors)
      } else {
        showToast(err.message || 'Network error. Please try again.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <i className="fas fa-fire-alt"></i> QuickBite
        </div>
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">Join thousands of happy customers today</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Full Name
            </label>
            <div className="input-icon-wrapper">
              <i className="fas fa-user"></i>
              <input
                type="text"
                id="name"
                name="name"
                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                placeholder="Your full name"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>
            {errors.name && (
              <div className="invalid-feedback" style={{ display: 'flex' }}>
                <i className="fas fa-exclamation-circle"></i>
                <span>{errors.name}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <div className="input-icon-wrapper">
              <i className="fas fa-envelope"></i>
              <input
                type="email"
                id="email"
                name="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <div className="invalid-feedback" style={{ display: 'flex' }}>
                <i className="fas fa-exclamation-circle"></i>
                <span>{errors.email}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className="input-icon-wrapper">
              <i className="fas fa-lock"></i>
              <input
                type="password"
                id="password"
                name="password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </div>
            {errors.password && (
              <div className="invalid-feedback" style={{ display: 'flex' }}>
                <i className="fas fa-exclamation-circle"></i>
                <span>{errors.password}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm_password">
              Confirm Password
            </label>
            <div className="input-icon-wrapper">
              <i className="fas fa-lock"></i>
              <input
                type="password"
                id="confirm_password"
                name="confirm_password"
                className={`form-control ${errors.confirm ? 'is-invalid' : ''}`}
                placeholder="Re-enter your password"
                value={formData.confirm_password}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </div>
            {errors.confirm && (
              <div className="invalid-feedback" style={{ display: 'flex' }}>
                <i className="fas fa-exclamation-circle"></i>
                <span>{errors.confirm}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Creating account…
              </>
            ) : (
              <>
                <i className="fas fa-user-plus"></i> Create Account
              </>
            )}
          </button>
        </form>

        <div className="auth-divider">or</div>
        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in here</Link>
        </div>
      </div>
    </div>
  )
}
