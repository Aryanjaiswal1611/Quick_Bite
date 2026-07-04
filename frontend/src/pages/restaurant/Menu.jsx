import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { restaurantApi, dishesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

export default function RestaurantMenu() {
    const navigate = useNavigate()
    const { showToast } = useToast()
    const [dishes, setDishes] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingDish, setEditingDish] = useState(null)
    const [formData, setFormData] = useState({
        food_name: '',
        description: '',
        price: '',
        category: '',
        availability: true,
        image: null
    })

    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        try {
            const data = await restaurantApi.checkAuth()
            if (data.success && data.loggedIn) {
                loadDishes(data.id)
            } else {
                navigate('/restaurant/login')
            }
        } catch (error) {
            navigate('/restaurant/login')
        }
    }

    const loadDishes = async (restaurantId) => {
        try {
            const data = await dishesApi.getByRestaurant(restaurantId)
            if (data.success) {
                setDishes(data.dishes || [])
            }
        } catch (error) {
            console.error('Error loading dishes:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        })
    }

    const handleFileChange = (e) => {
        setFormData({ ...formData, image: e.target.files[0] })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const formDataToSend = new FormData()
        formDataToSend.append('food_name', formData.food_name)
        formDataToSend.append('description', formData.description)
        formDataToSend.append('price', formData.price)
        formDataToSend.append('category', formData.category)
        formDataToSend.append('availability', formData.availability)
        if (formData.image) {
            formDataToSend.append('image', formData.image)
        }

        try {
            let data
            if (editingDish) {
                data = await dishesApi.update(editingDish._id, formDataToSend)
            } else {
                data = await dishesApi.create(formDataToSend)
            }

            if (data.success) {
                showToast(editingDish ? 'Dish updated!' : 'Dish added!', 'success')
                setShowModal(false)
                setEditingDish(null)
                setFormData({ food_name: '', description: '', price: '', category: '', availability: true, image: null })
                const authData = await restaurantApi.checkAuth()
                if (authData.success) {
                    loadDishes(authData.id)
                }
            }
        } catch (error) {
            showToast('Failed to save dish', 'error')
        }
    }

    const handleEdit = (dish) => {
        setEditingDish(dish)
        setFormData({
            food_name: dish.food_name,
            description: dish.description || '',
            price: dish.price,
            category: dish.category,
            availability: dish.availability,
            image: null
        })
        setShowModal(true)
    }

    const handleDelete = async (dishId) => {
        if (!window.confirm('Are you sure you want to delete this dish?')) return

        try {
            const data = await dishesApi.delete(dishId)
            if (data.success) {
                showToast('Dish deleted', 'info')
                const authData = await restaurantApi.checkAuth()
                if (authData.success) {
                    loadDishes(authData.id)
                }
            }
        } catch (error) {
            showToast('Failed to delete dish', 'error')
        }
    }

    const handleToggleAvailability = async (dish) => {
        try {
            const data = await dishesApi.toggleAvailability(dish._id, !dish.availability)
            if (data.success) {
                showToast(`Dish ${dish.availability ? 'unavailable' : 'available'}`, 'success')
                const authData = await restaurantApi.checkAuth()
                if (authData.success) {
                    loadDishes(authData.id)
                }
            }
        } catch (error) {
            showToast('Failed to update availability', 'error')
        }
    }

    const categories = [...new Set(dishes.map(d => d.category).filter(Boolean))]

    return (
        <div className="page-wrapper">
            <div className="menu-management">
                <div className="menu-header">
                    <div>
                        <Link to="/restaurant/dashboard" className="back-link">
                            <i className="fas fa-arrow-left"></i> Back to Dashboard
                        </Link>
                        <h1><i className="fas fa-utensils"></i> Menu Management</h1>
                    </div>
                    <button
                        onClick={() => {
                            setEditingDish(null)
                            setFormData({ food_name: '', description: '', price: '', category: '', availability: true, image: null })
                            setShowModal(true)
                        }}
                        className="btn btn-primary"
                    >
                        <i className="fas fa-plus"></i> Add New Dish
                    </button>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                    </div>
                ) : dishes.length === 0 ? (
                    <div className="empty-state">
                        <i className="fas fa-utensils"></i>
                        <h3>No dishes yet</h3>
                        <p>Add your first dish to get started!</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn btn-primary"
                        >
                            <i className="fas fa-plus"></i> Add Dish
                        </button>
                    </div>
                ) : (
                    <>
                        {categories.map(category => (
                            <div key={category} className="menu-category">
                                <h2><i className="fas fa-tag"></i> {category}</h2>
                                <div className="dishes-grid">
                                    {dishes.filter(d => d.category === category).map(dish => (
                                        <div key={dish._id} className={`dish-card ${!dish.availability ? 'unavailable' : ''}`}>
                                            <div className="dish-image">
                                                {dish.image ? (
                                                    <img src={dish.image} alt={dish.food_name} />
                                                ) : (
                                                    <div className="dish-placeholder">
                                                        <i className="fas fa-utensils"></i>
                                                    </div>
                                                )}
                                                {!dish.availability && (
                                                    <div className="unavailable-badge">Unavailable</div>
                                                )}
                                            </div>
                                            <div className="dish-info">
                                                <h3>{dish.food_name}</h3>
                                                <p>{dish.description}</p>
                                                <div className="dish-footer">
                                                    <span className="dish-price">₹{dish.price}</span>
                                                    <div className="dish-actions">
                                                        <button
                                                            onClick={() => handleToggleAvailability(dish)}
                                                            className={`btn btn-sm ${dish.availability ? 'btn-outline' : 'btn-success'}`}
                                                        >
                                                            <i className={`fas ${dish.availability ? 'fa-toggle-off' : 'fa-toggle-on'}`}></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(dish)}
                                                            className="btn btn-sm btn-outline"
                                                        >
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(dish._id)}
                                                            className="btn btn-sm btn-danger"
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingDish ? 'Edit Dish' : 'Add New Dish'}</h2>
                            <button onClick={() => setShowModal(false)} className="close-btn">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>Dish Name *</label>
                                <input
                                    type="text"
                                    name="food_name"
                                    value={formData.food_name}
                                    onChange={handleChange}
                                    placeholder="Enter dish name"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Enter description"
                                    rows="3"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Price (₹) *</label>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Category *</label>
                                    <input
                                        type="text"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        placeholder="e.g., Main Course, Starter"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Image</label>
                                <input
                                    type="file"
                                    name="image"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                />
                            </div>
                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="availability"
                                        checked={formData.availability}
                                        onChange={handleChange}
                                    />
                                    Available for order
                                </label>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <i className="fas fa-save"></i> {editingDish ? 'Update' : 'Add'} Dish
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
