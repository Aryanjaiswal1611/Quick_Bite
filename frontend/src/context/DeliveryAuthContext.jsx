import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { deliveryApi } from '../services/api'

const DeliveryAuthContext = createContext(null)

export function DeliveryAuthProvider({ children }) {
  const [partner, setPartner] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('delivery_token')
    if (!token) {
      setPartner(null)
      setLoading(false)
      return false
    }

    try {
      const data = await deliveryApi.getMe()
      if (data.success && data.partner) {
        setPartner(data.partner)
        localStorage.setItem('delivery_user', JSON.stringify(data.partner))
        return true
      }
      localStorage.removeItem('delivery_token')
      localStorage.removeItem('delivery_user')
      setPartner(null)
      return false
    } catch {
      localStorage.removeItem('delivery_token')
      localStorage.removeItem('delivery_user')
      setPartner(null)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email, password) => {
    const data = await deliveryApi.login(email, password)
    if (data.success) {
      localStorage.setItem('delivery_token', data.token)
      localStorage.setItem('delivery_user', JSON.stringify(data.partner))
      setPartner(data.partner)
    }
    return data
  }

  const signup = async (formData) => {
    const data = await deliveryApi.signup(formData)
    if (data.success) {
      localStorage.setItem('delivery_token', data.token)
      localStorage.setItem('delivery_user', JSON.stringify(data.partner))
      setPartner(data.partner)
    }
    return data
  }

  const logout = async () => {
    try {
      await deliveryApi.logout()
    } catch {
      // clear local state regardless
    }
    localStorage.removeItem('delivery_token')
    localStorage.removeItem('delivery_user')
    setPartner(null)
  }

  return (
    <DeliveryAuthContext.Provider
      value={{
        partner,
        loading,
        isAuthenticated: !!partner,
        login,
        signup,
        logout,
        checkAuth,
        setPartner
      }}
    >
      {children}
    </DeliveryAuthContext.Provider>
  )
}

export function useDeliveryAuth() {
  const context = useContext(DeliveryAuthContext)
  if (!context) {
    throw new Error('useDeliveryAuth must be used within a DeliveryAuthProvider')
  }
  return context
}
