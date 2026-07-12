import { useState } from 'react'
import { useCart } from '../context/CartContext'

export default function FoodCard({ food }) {
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const { addToCart } = useCart()

  const isRestaurantOnline = food.restaurantId?.isLoggedIn && food.restaurantId?.isActive
  const isOffline = !isRestaurantOnline

  const handleAddToCart = async (e) => {
    e.preventDefault()
    if (isOffline || isAdding) return

    setIsAdding(true)
    const success = await addToCart(food._id)
    
    if (success) {
      setAdded(true)
      setTimeout(() => setAdded(false), 1500)
    }
    
    setIsAdding(false)
  }

  const handleImageError = (e) => {
    e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=75'
  }

  return (
    <div className={`food-card-wrapper food-card ${isOffline ? 'offline' : ''}`} data-category={food.category}>
      {isOffline && <div className="offline-overlay">Restaurant Currently Offline</div>}
      
      <div className="food-card-img-wrapper">
        <img
          src={food.image}
          alt={food.food_name}
          className="food-card-img"
          onError={handleImageError}
        />
        <span className="food-category-tag">{food.category}</span>
      </div>
      
      <div className="food-card-body">
        <h3 className="food-card-title">{food.food_name}</h3>
        <p className="food-card-desc">{food.description || ''}</p>
        <div className="food-card-footer">
          <div className="food-price">₹{parseFloat(food.price).toFixed(2)}</div>
          <button
            className={`add-to-cart-btn ${added ? 'added' : ''}`}
            onClick={handleAddToCart}
            disabled={isOffline || isAdding}
            title={isOffline ? 'Restaurant is offline' : 'Add to Cart'}
          >
            {isOffline ? (
              <i className="fas fa-moon"></i>
            ) : added ? (
              <i className="fas fa-check"></i>
            ) : isAdding ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-plus"></i>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
