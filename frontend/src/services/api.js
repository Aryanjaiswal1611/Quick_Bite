/**
 * API client — all frontend requests go through here.
 * Base URL is configurable via VITE_API_URL (empty = same-origin / Vite proxy).
 */

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api'

export class ApiError extends Error {
  constructor(message, { status = 0, errors = null, data = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.data = data
  }
}

function getTokenForEndpoint(endpoint) {
  if (endpoint.startsWith('/restaurant') || endpoint.startsWith('/dishes')) {
    return localStorage.getItem('restaurant_token')
  }
  if (endpoint.startsWith('/delivery')) {
    return localStorage.getItem('delivery_token')
  }
  return localStorage.getItem('token')
}

function getAuthHeaders(endpoint, isFormData = false) {
  const token = getTokenForEndpoint(endpoint)
  const headers = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}

async function handleResponse(response) {
  let data = null
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      data = await response.json()
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Request failed (${response.status})`,
      {
        status: response.status,
        errors: data?.errors || null,
        data
      }
    )
  }

  return data ?? { success: true }
}

async function request(method, endpoint, body = null) {
  const isFormData = body instanceof FormData
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: getAuthHeaders(endpoint, isFormData),
      body: isFormData ? body : (body != null ? JSON.stringify(body) : null)
    })
    return handleResponse(response)
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError(err.message || 'Network error. Please check your connection.', {
      status: 0
    })
  }
}

export const api = {
  get: (endpoint) => request('GET', endpoint),
  post: (endpoint, body) => request('POST', endpoint, body),
  put: (endpoint, body) => request('PUT', endpoint, body),
  patch: (endpoint, body) => request('PATCH', endpoint, body),
  delete: (endpoint, body) => request('DELETE', endpoint, body)
}

export const authApi = {
  login: (email, password) => api.post('/login', { email, password }),
  signup: (userData) => api.post('/signup', userData),
  logout: () => api.post('/logout', {}),
  getMe: () => api.get('/me')
}

export const foodApi = {
  getAll: () => api.get('/foods'),
  getFeatured: () => api.get('/foods/featured'),
  getRecommended: () => api.get('/foods/recommended'),
  getCategories: () => api.get('/foods/categories'),
  getById: (id) => api.get(`/foods/${id}`)
}

export const cartApi = {
  get: () => api.get('/cart'),
  add: (foodId) => api.post('/cart/add', { food_id: foodId }),
  update: (cartId, change) => api.put('/cart/update', { cart_id: cartId, change }),
  remove: (cartId) => api.delete('/cart/remove', { cart_id: cartId })
}

export const orderApi = {
  place: (orderData) => api.post('/orders/place', orderData),
  getHistory: () => api.get('/orders/history'),
  getById: (id) => api.get(`/orders/${id}`),
  rateDelivery: (id, rating) => api.post(`/orders/${id}/rate-delivery`, { rating })
}

export const paymentApi = {
  createOrder: (amount) => api.post('/payments/create-order', { amount }),
  verifyPayment: (data) => api.post('/payments/verify-payment', data)
}

export const feedbackApi = {
  submit: (data) => api.post('/feedback/submit', data)
}

export const restaurantApi = {
  login: (email, password) => api.post('/restaurant/login', { email, password }),
  signup: (data) => api.post('/restaurant/signup', data),
  logout: () => api.post('/restaurant/logout', {}),
  checkAuth: () => api.get('/restaurant/check-auth'),
  getOrders: () => api.get('/restaurant/orders'),
  acceptOrder: (id) => api.post(`/restaurant/orders/${id}/accept`, {}),
  rejectOrder: (id) => api.post(`/restaurant/orders/${id}/reject`, {}),
  updateStatus: (id, status) => api.post(`/restaurant/orders/${id}/status`, { status }),
  assignPartner: (id, partnerId) => api.post(`/restaurant/orders/${id}/assign`, { partnerId }),
  toggleStatus: (isActive) => api.patch('/restaurant/status', { isActive }),
  getPartners: () => api.get('/restaurant/delivery-partners')
}

export const dishesApi = {
  getByRestaurant: (restaurantId) => api.get(`/dishes/restaurant/${restaurantId}`),
  create: (formData) => api.post('/dishes', formData),
  update: (id, formData) => api.put(`/dishes/${id}`, formData),
  delete: (id) => api.delete(`/dishes/${id}`, {}),
  toggleAvailability: (id, availability) =>
    api.patch(`/dishes/${id}/availability`, { availability })
}

export const deliveryApi = {
  login: (email, password) => api.post('/delivery/login', { email, password }),
  signup: (data) => api.post('/delivery/signup', data),
  logout: () => api.post('/delivery/logout', {}),
  getMe: () => api.get('/delivery/me'),
  toggleStatus: (is_online) => api.post('/delivery/toggle-status', { is_online }),
  getOrders: () => api.get('/delivery/orders'),
  updateStatus: (id, status, verificationCode) =>
    api.post(`/delivery/orders/${id}/status`, { status, verificationCode }),
  getEarnings: () => api.get('/delivery/earnings')
}

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getFoods: () => api.get('/admin/foods'),
  getOrders: () => api.get('/admin/orders'),
  getUsers: () => api.get('/admin/users'),
  assignPartner: (orderId, partnerId) =>
    api.post(`/admin/orders/${orderId}/assign`, { partnerId }),
  updateOrderStatus: (id, status) => api.put(`/admin/orders/${id}/status`, { status })
}
