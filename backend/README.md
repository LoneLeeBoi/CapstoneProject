# Ecommerce Backend API

Express.js backend for the ecommerce application with MySQL database.

## Features

- User authentication (register/login) with JWT
- Product management (CRUD operations)
- Order management
- Admin panel functionality
- Role-based access control
- MySQL database integration

## Setup Instructions

### 1. Install Dependencies

\`\`\`bash
cd backend
npm install
\`\`\`

### 2. Database Setup

1. Make sure MySQL is installed and running
2. Create the database and tables using the schema file:

\`\`\`bash
mysql -u root -p < database/schema.sql
\`\`\`

Or run the SQL commands in phpMyAdmin.

### 3. Environment Configuration

1. Copy the `.env` file and update the values:
   - Update `DB_PASSWORD` with your MySQL password
   - Update `JWT_SECRET` with a secure random string
   - Update other values as needed

### 4. Start the Server

Development mode (with auto-restart):
\`\`\`bash
npm run dev
\`\`\`

Production mode:
\`\`\`bash
npm start
\`\`\`

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token
- `PUT /api/auth/profile` - Update user profile

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product

### Admin Products
- `POST /api/admin/products` - Create product (admin only)
- `PUT /api/admin/products/:id` - Update product (admin only)
- `DELETE /api/admin/products/:id` - Delete product (admin only)

### Orders
- `GET /api/orders/user` - Get user orders
- `POST /api/orders` - Create new order

### Admin
- `GET /api/admin/users` - Get all users (admin only)
- `GET /api/admin/orders` - Get all orders (admin only)

## Default Admin Account

- Email: `admin@example.com`
- Password: `admin123`

## Testing

Test if the server is running:
\`\`\`bash
curl http://localhost:5000/api/test
\`\`\`

## Project Structure

\`\`\`
backend/
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── .env              # Environment variables
├── database/
│   └── schema.sql    # Database schema
└── README.md         # This file
