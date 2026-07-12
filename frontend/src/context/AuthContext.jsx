import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

function buildUser(data) {
  if (data.user) {
    return {
      id: data.user.id || data.user._id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role
    }
  }
  return {
    id: data.user_id,
    name: data.user_name,
    email: data.email,
    role: data.role
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const data = await authApi.getMe()
      if (data.loggedIn || data.success) {
        setUser(buildUser(data))
      } else {
        localStorage.removeItem('token')
        setUser(null)
      }
    } catch {
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email, password) => {
    const data = await authApi.login(email, password)
    if (data.success) {
      localStorage.setItem('token', data.token)
      setUser(data.user)
    }
    return data
  }

  const signup = async (userData) => {
    const data = await authApi.signup(userData)
    if (data.success) {
      localStorage.setItem('token', data.token)
      setUser(data.user)
    }
    return data
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // clear local state regardless
    }
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isRestaurant: user?.role === 'restaurant',
        isDelivery: user?.role === 'delivery',
        login,
        signup,
        logout,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
