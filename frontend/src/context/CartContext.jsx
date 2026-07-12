import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { cartApi } from '../services/api'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [count, setCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([])
      setCount(0)
      setTotal(0)
      return
    }

    try {
      setLoading(true)
      const data = await cartApi.get()
      if (data.success) {
        setItems(data.items || [])
        setCount(data.count || 0)
        setTotal(data.total || 0)
      }
    } catch {
      // cart fetch failures are non-fatal (e.g. expired token)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  const addToCart = async (foodId) => {
    try {
      const data = await cartApi.add(foodId)
      if (data.success) {
        showToast(data.message || 'Added to cart!', 'success')
        setCount(data.cart_count)
        setTotal(data.cart_total)
        await fetchCart()
        return true
      }
      showToast(data.message || 'Something went wrong', 'error')
      return false
    } catch (err) {
      if (err.status === 401) {
        showToast('Please login to add items to cart.', 'info')
      } else {
        showToast(err.message || 'Failed to add to cart', 'error')
      }
      return false
    }
  }

  const updateQuantity = async (cartId, change) => {
    try {
      const data = await cartApi.update(cartId, change)
      if (data.success) {
        setCount(data.cart_count)
        setTotal(data.cart_total)
        await fetchCart()
        return data
      }
      showToast(data.message || 'Error updating cart', 'error')
      return null
    } catch (err) {
      showToast(err.message || 'Failed to update cart', 'error')
      return null
    }
  }

  const removeFromCart = async (cartId) => {
    if (!window.confirm('Remove this item from cart?')) return

    try {
      const data = await cartApi.remove(cartId)
      if (data.success) {
        showToast('Item removed from cart', 'info')
        setCount(data.cart_count)
        setTotal(data.cart_total)
        await fetchCart()
        return true
      }
      return false
    } catch (err) {
      showToast(err.message || 'Failed to remove item', 'error')
      return false
    }
  }

  const clearCart = () => {
    setItems([])
    setCount(0)
    setTotal(0)
  }

  const deliveryFee = 30
  const grandTotal = total + (count > 0 ? deliveryFee : 0)

  return (
    <CartContext.Provider value={{
      items,
      count,
      total,
      deliveryFee,
      grandTotal,
      loading,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      refreshCart: fetchCart
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
