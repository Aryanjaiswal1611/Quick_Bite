import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { restaurantApi } from '../services/api'

const RestaurantAuthContext = createContext(null)

export function RestaurantAuthProvider({ children }) {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('restaurant_token')
    if (!token) {
      setRestaurant(null)
      setLoading(false)
      return false
    }

    try {
      const data = await restaurantApi.checkAuth()
      if (data.success && data.loggedIn) {
        const profile = data.restaurant || {
          id: data.id,
          name: data.name,
          isActive: data.isActive
        }
        setRestaurant(profile)
        localStorage.setItem('restaurant_user', JSON.stringify(profile))
        return true
      }
      localStorage.removeItem('restaurant_token')
      localStorage.removeItem('restaurant_user')
      setRestaurant(null)
      return false
    } catch {
      localStorage.removeItem('restaurant_token')
      localStorage.removeItem('restaurant_user')
      setRestaurant(null)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email, password) => {
    const data = await restaurantApi.login(email, password)
    if (data.success) {
      localStorage.setItem('restaurant_token', data.token)
      localStorage.setItem('restaurant_user', JSON.stringify(data.restaurant))
      setRestaurant(data.restaurant)
    }
    return data
  }

  const signup = async (formData) => {
    return restaurantApi.signup(formData)
  }

  const logout = async () => {
    try {
      await restaurantApi.logout()
    } catch {
      // clear local state regardless
    }
    localStorage.removeItem('restaurant_token')
    localStorage.removeItem('restaurant_user')
    setRestaurant(null)
  }

  return (
    <RestaurantAuthContext.Provider
      value={{
        restaurant,
        loading,
        isAuthenticated: !!restaurant,
        login,
        signup,
        logout,
        checkAuth,
        setRestaurant
      }}
    >
      {children}
    </RestaurantAuthContext.Provider>
  )
}

export function useRestaurantAuth() {
  const context = useContext(RestaurantAuthContext)
  if (!context) {
    throw new Error('useRestaurantAuth must be used within a RestaurantAuthProvider')
  }
  return context
}
