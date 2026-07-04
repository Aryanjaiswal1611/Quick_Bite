import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { restaurantApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

export default function RestaurantLogin() {
    const navigate = useNavigate()
    const { showToast } = useToast()
    const [formData, setFormData] = useState({ email: '', password: '' })
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const data = await restaurantApi.login(formData.email, formData.password)
            if (data.success) {
                localStorage.setItem('restaurant_token', data.token)
                localStorage.setItem('restaurant_user', JSON.stringify(data.restaurant))
                showToast('Login successful!', 'success')
                navigate('/restaurant/dashboard')
            } else {
                showToast(data.message || 'Login failed', 'error')
            }
        } catch (error) {
            showToast('Network error. Please try again.', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-icon" style={{ background: 'rgba(255, 107, 53, 0.1)' }}>
                            <i className="fas fa-utensils" style={{ color: 'var(--primary)' }}></i>
                        </div>
                        <h2>Restaurant Portal</h2>
                        <p>Sign in to manage your restaurant</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label>Email</label>
                            <div className="input-wrapper">
                                <i className="fas fa-envelope"></i>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <div className="input-wrapper">
                                <i className="fas fa-lock"></i>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                            {loading ? (
                                <>
                                    <span className="spinner" style={{ width: '18px', height: '18px' }}></span>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-sign-in-alt"></i> Sign In
                                </>
                            )}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>
                            Don&apos;t have an account?{' '}
                            <Link to="/restaurant/signup">Register Restaurant</Link>
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
