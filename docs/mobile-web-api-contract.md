# Mobile/Web API Contract Matrix

This document defines the baseline API contract consumed by both `cosmetic-ecomm` (web) and `cosmetic` (Android).

## Auth

- `POST /api/auth/register` - Public - Register user
- `POST /api/auth/login` - Public - Login user
- `POST /api/auth/refresh-token` - Public - Refresh access token
- `POST /api/auth/logout` - Protected - Logout user
- `GET /api/auth/me` - Protected - Current user profile
- `POST /api/auth/forgot-password` - Public - Send reset link
- `PUT /api/auth/reset-password/:token` - Public - Reset password
- `POST /api/auth/addresses` - Protected - Add address

## Products and Discovery

- `GET /api/products` - Public - List/search/filter products
- `GET /api/products/featured` - Public - Featured products
- `GET /api/products/:id` - Public - Product detail
- `PUT /api/products/:id/wishlist` - Protected - Toggle wishlist
- `POST /api/products/:id/reviews` - Protected - Create review
- `POST /api/back-in-stock/:productId/subscribe` - Public - Back-in-stock subscription

## Cart and Checkout

- `GET /api/cart` - Protected - Fetch cart and pricing summary
- `POST /api/cart/add` - Protected - Add product/mystery box to cart
- `PUT /api/cart/items/:itemId` - Protected - Update item quantity
- `DELETE /api/cart/items/:itemId` - Protected - Remove item from cart
- `POST /api/cart/coupon` - Protected - Apply coupon
- `DELETE /api/cart/coupon` - Protected - Remove coupon
- `POST /api/orders` - Protected - Create order from server-side cart
- `GET /api/orders/my-orders` - Protected - Customer orders
- `GET /api/orders/:id` - Protected - Customer order detail
- `PUT /api/orders/:id/cancel` - Protected - Cancel order

## Payments

- `POST /api/payments/create-order` - Protected - Create Razorpay order from internal order
- `POST /api/payments/verify` - Protected - Verify Razorpay payment signature and mark order paid
- `POST /api/payments/webhook` - Razorpay - Webhook updates

## Extensions

- `GET /api/blog` and `GET /api/blog/:slug` - Public - Blog content
- `GET /api/gift-cards/my-cards` - Protected - Purchased gift cards
- `POST /api/gift-cards/purchase` - Protected - Buy gift card
- `POST /api/gift-cards/validate` - Protected - Validate gift card
- `GET /api/subscriptions/my` - Protected - Subscription status
- `POST /api/subscriptions` - Protected - Start subscription
- `PUT /api/subscriptions/pause` - Protected - Pause/resume subscription
- `DELETE /api/subscriptions/cancel` - Protected - Cancel subscription
- `GET /api/affiliates/me` - Protected - Affiliate profile
- `POST /api/affiliates/apply` - Protected - Affiliate application
- `GET /api/mystery-boxes` - Public - Mystery boxes
- `GET /api/bundles` - Public - Bundles

## Admin APIs

All admin endpoints require `protect + adminOnly`.

- Products admin CRUD
- Orders listing, stats, status transitions, CSV export
- Coupons admin CRUD
- Mystery boxes admin CRUD
- Users management
- Payment logs

## Common Response Envelope

- Success: `{ success: true, ...data }`
- Error: `{ success: false, message: string }`

All clients must treat backend totals, order states, and payment verification responses as source of truth.
