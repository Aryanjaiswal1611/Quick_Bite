import { io } from 'socket.io-client'

let socket = null

function getSocketUrl() {
  // Empty string = same origin (Vite proxy in dev, backend SPA host in prod)
  return import.meta.env.VITE_API_URL || undefined
}

function initSocket() {
  if (!socket) {
    const url = getSocketUrl()
    socket = io(url || undefined, {
      autoConnect: false,
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling']
    })
  }
  return socket
}

export function connectSocket() {
  const s = initSocket()
  if (!s.connected) {
    s.connect()
  }
  return s
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect()
  }
}

export function getSocket() {
  return socket
}

export function joinRestaurantRoom(restaurantId) {
  const s = connectSocket()
  s.emit('join_restaurant_room', restaurantId)
}

export function leaveRestaurantRoom(restaurantId) {
  socket?.emit('leave_restaurant_room', restaurantId)
}

export function joinOrderRoom(orderId) {
  const s = connectSocket()
  s.emit('join_order_room', orderId)
}

export function leaveOrderRoom(orderId) {
  socket?.emit('leave_order_room', orderId)
}

export function sendLocationUpdate(orderId, lat, lng) {
  socket?.emit('delivery_location_update', { orderId, lat, lng })
}

export function onNewOrder(callback) {
  const s = connectSocket()
  s.on('new_order', callback)
}

export function offNewOrder(callback) {
  socket?.off('new_order', callback)
}

export function onStatusUpdate(callback) {
  const s = connectSocket()
  s.on('status_update', callback)
}

export function offStatusUpdate(callback) {
  socket?.off('status_update', callback)
}

export function onLocationUpdate(callback) {
  const s = connectSocket()
  s.on('location_update', callback)
}

export function offLocationUpdate(callback) {
  socket?.off('location_update', callback)
}

export function onConnect(callback) {
  socket?.on('connect', callback)
}

export function offConnect(callback) {
  socket?.off('connect', callback)
}

export function onDisconnect(callback) {
  socket?.on('disconnect', callback)
}

export function offDisconnect(callback) {
  socket?.off('disconnect', callback)
}

const socketService = {
  initSocket,
  connectSocket,
  disconnectSocket,
  getSocket,
  joinRestaurantRoom,
  leaveRestaurantRoom,
  joinOrderRoom,
  leaveOrderRoom,
  sendLocationUpdate,
  onNewOrder,
  offNewOrder,
  onStatusUpdate,
  offStatusUpdate,
  onLocationUpdate,
  offLocationUpdate,
  onConnect,
  offConnect,
  onDisconnect,
  offDisconnect
}

export default socketService
