# Public Endpoints for Customer Website

These endpoints are accessible without authentication (no JWT token required).

## Products

### Get All Products
- **URL**: `GET /products/public`
- **Description**: Fetch all products with limited information (no purchase price)
- **Rate Limit**: 5 requests per minute
- **Response**: Array of products with: `_id`, `name`, `brand`, `description`, `mainCategory`, `subCategory`, `sellingPrice`, `images`, `stock`, `variants`

### Get Product by ID
- **URL**: `GET /products/public/:id`
- **Description**: Fetch a single product by ID with detailed information
- **Rate Limit**: 10 requests per minute
- **Response**: Product details including specifications and available options

## Categories

### Get All Categories
- **URL**: `GET /categories/public`
- **Description**: Fetch all categories with subcategories (up to 3 levels)
- **Rate Limit**: 10 requests per minute
- **Response**: Array of categories with nested subcategories, transformed with `id` field

## Authentication

### Customer Registration
- **URL**: `POST /auth/customer/register`
- **Body**: 
  ```json
  {
    "email": "string",
    "password": "string",
    "name": "string"
  }
  ```
- **Description**: Register a new customer account

### Customer Login
- **URL**: `POST /auth/customer/login`
- **Body**: 
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Description**: Login and receive JWT token

### Store Signup (First Time Setup)
- **URL**: `POST /auth/store-signup`
- **Body**: Store signup details (see StoreSignupDto)
- **Description**: Initial store setup (admin account creation)

### Validate User
- **URL**: `POST /auth/validate`
- **Body**: 
  ```json
  {
    "email": "string",
    "role": "string"
  }
  ```
- **Description**: Check if user exists (for frontend email validation step)

---

## Protected Endpoints (Require JWT Token)

All other endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Customer-Only Endpoints
- `GET /cart` - Get cart
- `POST /cart/add` - Add to cart
- `PUT /cart/:productId` - Update cart item
- `DELETE /cart/:productId` - Remove from cart
- `DELETE /cart` - Clear cart
- `POST /orders/create` - Create order
- `GET /orders/history` - Get order history
- `GET /orders/:id` - Get order by ID

### Admin/Cashier Endpoints
- All product management endpoints (POST, PUT, DELETE)
- All category management endpoints
- Sales and inventory endpoints

