# QuickBite – Food Delivery Platform

Production-ready full-stack food delivery application with **customer**, **restaurant**, and **delivery partner** portals.

```
Quick_Bite/
├── frontend/     # React + Vite SPA
└── backend/      # Node.js + Express + MongoDB API
```

---

## Tech Stack

| Layer    | Stack                                              |
|----------|----------------------------------------------------|
| Frontend | React 18, React Router 6, Vite, Socket.IO client   |
| Backend  | Express, Mongoose, JWT, bcrypt, Multer, Socket.IO  |
| Database | MongoDB                                            |
| Payments | Razorpay (with mock/dummy mode for local dev)      |

---

## Prerequisites

- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas URI)

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env   # edit secrets as needed
npm install
npm run seed           # demo users, restaurant, menu
npm run dev            # http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev            # http://localhost:5173
```

The Vite dev server proxies `/api`, `/images`, and `/socket.io` to the backend.

---

## Demo Accounts

| Role       | Email                   | Password     |
|------------|-------------------------|--------------|
| Customer   | customer@quickbite.com  | password123  |
| Restaurant | kitchen@quickbite.com   | password123  |
| Delivery   | rider@quickbite.com     | password123  |
| Admin      | admin@food.com          | admin123     |

---

## Production Build

### Frontend

```bash
cd frontend
npm run build
```

Output: `frontend/dist/`

### Backend (serves API + SPA)

```bash
cd backend
# Ensure frontend/dist exists
NODE_ENV=production npm start
```

When `frontend/dist` is present, the backend serves the SPA and API from the same origin (recommended for simple deploys).

For split hosting, set:

- Backend `CORS_ORIGIN` to your frontend origin
- Frontend `VITE_API_URL` to your API origin (e.g. `https://api.example.com`)

---

## Environment Variables

### Backend (`backend/.env`)

| Variable            | Description                          | Default                                      |
|---------------------|--------------------------------------|----------------------------------------------|
| `PORT`              | API port                             | `8000`                                       |
| `MONGO_URI`         | MongoDB connection string            | `mongodb://localhost:27017/food_delivery`    |
| `JWT_SECRET`        | JWT signing secret                   | *(required in production)*                   |
| `JWT_EXPIRES_IN`    | Token lifetime                       | `1d`                                         |
| `SESSION_SECRET`    | Session cookie secret                | *(required in production)*                   |
| `CORS_ORIGIN`       | Allowed origins (`*` or CSV)         | `*`                                          |
| `NODE_ENV`          | `development` / `production`         | `development`                                |
| `RAZORPAY_KEY_ID`   | Razorpay key (optional)              | dummy keys → mock payments                   |
| `RAZORPAY_KEY_SECRET` | Razorpay secret                    | —                                            |

### Frontend (`frontend/.env`)

| Variable             | Description                                      |
|----------------------|--------------------------------------------------|
| `VITE_API_URL`       | API origin (empty = same-origin / Vite proxy)    |
| `VITE_BACKEND_PORT`  | Backend port for dev proxy (default `8000`)      |
| `VITE_PROXY_TARGET`  | Full proxy target override                       |

---

## API Overview

| Area        | Base path            | Auth role      |
|-------------|----------------------|----------------|
| Customer    | `/api/login`, `/api/signup`, `/api/me` | JWT `user` |
| Cart        | `/api/cart`          | user           |
| Orders      | `/api/orders`        | user / admin   |
| Foods       | `/api/foods`         | public         |
| Restaurant  | `/api/restaurant`    | `restaurant`   |
| Dishes      | `/api/dishes`        | `restaurant`   |
| Delivery    | `/api/delivery`      | `delivery`     |
| Admin       | `/api/admin`         | `admin`        |
| Payments    | `/api/payments`      | user           |
| Health      | `/api/health`        | public         |

All responses use:

```json
{ "success": true, "message": "...", "data": {} }
```

or

```json
{ "success": false, "message": "...", "errors": {} }
```

---

## Portals

| Portal     | Routes                                              |
|------------|-----------------------------------------------------|
| Customer   | `/`, `/menu`, `/cart`, `/checkout`, `/order-history` |
| Restaurant | `/restaurant/login`, `/restaurant/dashboard`, `/restaurant/menu` |
| Delivery   | `/delivery/login`, `/delivery/dashboard`            |

---

## Scripts

### Backend

```bash
npm start      # production
npm run dev    # nodemon
npm run seed   # seed demo data
```

### Frontend

```bash
npm run dev      # Vite dev server
npm run build    # production build
npm run preview  # preview production build
npm run lint     # ESLint
```

---

## Security Notes

- Passwords hashed with bcrypt
- JWT Bearer auth with role-based authorization
- Auth rate limiting on login/signup endpoints
- Global rate limiting
- Input validation on all auth and write endpoints
- Card numbers truncated before storage
- Unauthenticated listing of all orders removed
- Upload MIME/size limits on dish images

**Change all secrets before production deployment.**
