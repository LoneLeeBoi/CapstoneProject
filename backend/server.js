// Import the Express framework to create the server and API routes
const express = require("express")

// Import CORS middleware to allow requests from different origins (e.g., frontend on a different port)
const cors = require("cors")

// Import bcryptjs to securely hash and compare passwords
const bcrypt = require("bcryptjs")

// Import jsonwebtoken to create and verify JWT tokens for authentication
const jwt = require("jsonwebtoken")

// Import mysql2 (with promise support) to interact with the MySQL database asynchronously
const mysql = require("mysql2/promise")

// Load environment variables from a .env file into process.env (e.g., for secrets, DB credentials, etc.)
require("dotenv").config()

// Initialize the Express app
const app = express()

// Define the port the server will listen on, using environment variable or defaulting to 3001
const PORT = process.env.PORT || 3001


// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "ecommerce",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

// Created MySQL connection pool
const pool = mysql.createPool(dbConfig)

// JWT Secret 
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key"

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid token" })
    }
    req.user = user
    next()
  })
}

// Middleware to verify admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required" })
  }
  next()
}

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Check if user already exists
    const [existingUsers] = await pool.execute("SELECT * FROM users WHERE email = ?", [email])
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: "User already exists" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const [result] = await pool.execute("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", [
      name,
      email,
      hashedPassword,
      "user",
    ])

    const userId = result.insertId
    const token = jwt.sign({ id: userId, email, role: "user" }, JWT_SECRET)

    res.json({
      success: true,
      token,
      user: { id: userId, name, email, role: "user" },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})
//responsible for handling user login
app.post("/api/auth/login", async (req, res) => {
  try {
    // receives email and password from the frontend via a POST request.
    const { email, password } = req.body

    // Find user / mocheck if ang email or ang user ga exist sa database If not, it returns an error: "Invalid credentials".
    const [users] = await pool.execute("SELECT * FROM users WHERE email = ?", [email])
    if (users.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid credentials" })
    }

    const user = users[0]

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(400).json({ success: false, message: "Invalid credentials" })
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET)

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// This route verifies the logged-in user using the token provided in the request
app.get("/api/auth/verify", authenticateToken, async (req, res) => {
  try {
    // Mo Query sa database to fetch the user info based on the user ID decoded from the JWT
    const [users] = await pool.execute(
      "SELECT id, name, email, role FROM users WHERE id = ?", 
      [req.user.id] //then ang req.user is set by the authenticateToken middleware
    )

    // If no user is found in the database, send a 404 response
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    // If user is found, return their basic info (excluding sensitive data like password)
    res.json({ success: true, user: users[0] })
  } catch (error) {
    // Log any unexpected errors and send a generic server error message
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})


// Update user profile (name and email)
app.put("/api/auth/profile", authenticateToken, async (req, res) => {
  try {
    // Destructure updated name and email from the request body
    const { name, email } = req.body

    // Update the user's name and email in the database using their ID from the JWT token
    await pool.execute(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [name, email, req.user.id]
    )

    // Fetch the updated user data to return in the response
    const [users] = await pool.execute(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [req.user.id]
    )

    // Return the updated user profile
    res.json({ success: true, user: users[0] })
  } catch (error) {
    // Log the error for debugging and return a server error response
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})


// Product Routes
// ===========================
// Public Product Routes
// ===========================

// Get all products, sorted by newest first
app.get("/api/products", async (req, res) => {
  try {
    const [products] = await pool.execute("SELECT * FROM products ORDER BY created_at DESC")
    res.json({ success: true, products })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Get a specific product by ID
app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params
    const [products] = await pool.execute("SELECT * FROM products WHERE id = ?", [id])

    // Return 404 if product doesn't exist
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" })
    }

    res.json({ success: true, product: products[0] })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})


// ===========================
// Admin Product Routes (protected)
// ===========================

// Add a new product
app.post("/api/admin/products", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, image, category, stock } = req.body

    // Insert new product into the database
    const [result] = await pool.execute(
      "INSERT INTO products (name, description, price, image, category, stock) VALUES (?, ?, ?, ?, ?, ?)",
      [name, description, price, image, category, stock],
    )

    // Fetch and return the newly inserted product
    const [products] = await pool.execute("SELECT * FROM products WHERE id = ?", [result.insertId])
    res.json({ success: true, product: products[0] })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Update an existing product by ID
app.put("/api/admin/products/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, price, image, category, stock } = req.body

    // Update product in the database
    await pool.execute(
      "UPDATE products SET name = ?, description = ?, price = ?, image = ?, category = ?, stock = ? WHERE id = ?",
      [name, description, price, image, category, stock, id],
    )

    // Fetch and return the updated product
    const [products] = await pool.execute("SELECT * FROM products WHERE id = ?", [id])
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" })
    }

    res.json({ success: true, product: products[0] })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Delete a product by ID
app.delete("/api/admin/products/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    // Delete product from the database
    const [result] = await pool.execute("DELETE FROM products WHERE id = ?", [id])

    // Return 404 if product was not found
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Product not found" })
    }

    res.json({ success: true, message: "Product deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})


// ===========================
// User Order Routes
// ===========================

// Get current user's orders
app.get("/api/orders/user", authenticateToken, async (req, res) => {
  try {
    // Fetch orders by authenticated user
    const [orders] = await pool.execute(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id]
    )
    res.json({ success: true, orders })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Create a new order
app.post("/api/orders", authenticateToken, async (req, res) => {
  try {
    const { items, total } = req.body

    // Insert new order with status "pending"
    const [result] = await pool.execute(
      "INSERT INTO orders (user_id, items, total, status) VALUES (?, ?, ?, ?)",
      [req.user.id, JSON.stringify(items), total, "pending"]
    )

    // Fetch and return the newly created order
    const [orders] = await pool.execute("SELECT * FROM orders WHERE id = ?", [result.insertId])
    res.json({ success: true, order: orders[0] })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})


// ===========================
// Admin Routes (protected)
// ===========================

// Get list of all users
app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.execute(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
    )
    res.json({ success: true, users })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Get list of all orders with user info
app.get("/api/admin/orders", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Join orders with users to get full order info
    const [orders] = await pool.execute(`
      SELECT o.*, u.name as user_name, u.email as user_email 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      ORDER BY o.created_at DESC
    `)

    // Format the response to group user info under a 'user' object
    const ordersWithUser = orders.map((order) => ({
      ...order,
      user: { name: order.user_name, email: order.user_email },
    }))

    res.json({ success: true, orders: ordersWithUser })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})


// Test route
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "Backend server is running!" })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  // console.log(`Test the server at: http://localhost:${PORT}/api/test`)
})

// Key Features:
// 🔐 Authentication:
// -JWT-based authentication (/api/auth/register, /api/auth/login, /api/auth/verify)

// -Passwords are securely hashed using bcryptjs

// -Token-based session verification with authenticateToken middleware

// -Admin role-checking via requireAdmin middleware

// 👤 User Routes:
// -Register new users (default role: user)

// -Login to receive token and role-based access

// -Verify login token and return user info

// -Update profile (PUT /api/auth/profile)

// 🛍️ Product Routes:
// -Public product list and details

// -Admin-only CRUD for products (/api/admin/products)

// -Add product

// -Edit product

// -Delete product

// 📦 Order Routes:
// -Users can place orders and view their own orders

// -Admins can later be extended to view/manage all orders

// 🧑‍💼 Admin Routes:
// -Fetch all users: /api/admin/users
