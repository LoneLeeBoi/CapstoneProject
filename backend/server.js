const express = require("express")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const mysql = require("mysql2/promise")
require("dotenv").config()

const app = express()
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

// Create MySQL connection pool
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

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user
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

app.get("/api/auth/verify", authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute("SELECT id, name, email, role FROM users WHERE id = ?", [req.user.id])
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    res.json({ success: true, user: users[0] })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

app.put("/api/auth/profile", authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body
    await pool.execute("UPDATE users SET name = ?, email = ? WHERE id = ?", [name, email, req.user.id])

    const [users] = await pool.execute("SELECT id, name, email, role FROM users WHERE id = ?", [req.user.id])
    res.json({ success: true, user: users[0] })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Product Routes
app.get("/api/products", async (req, res) => {
  try {
    const [products] = await pool.execute("SELECT * FROM products ORDER BY created_at DESC")
    res.json({ success: true, products })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params
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

// Admin Product Routes
app.post("/api/admin/products", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, image, category, stock } = req.body
    const [result] = await pool.execute(
      "INSERT INTO products (name, description, price, image, category, stock) VALUES (?, ?, ?, ?, ?, ?)",
      [name, description, price, image, category, stock],
    )

    const [products] = await pool.execute("SELECT * FROM products WHERE id = ?", [result.insertId])
    res.json({ success: true, product: products[0] })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

app.put("/api/admin/products/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, price, image, category, stock } = req.body

    await pool.execute(
      "UPDATE products SET name = ?, description = ?, price = ?, image = ?, category = ?, stock = ? WHERE id = ?",
      [name, description, price, image, category, stock, id],
    )

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

app.delete("/api/admin/products/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const [result] = await pool.execute("DELETE FROM products WHERE id = ?", [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Product not found" })
    }

    res.json({ success: true, message: "Product deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Order Routes
app.get("/api/orders/user", authenticateToken, async (req, res) => {
  try {
    const [orders] = await pool.execute("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [
      req.user.id,
    ])
    res.json({ success: true, orders })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

app.post("/api/orders", authenticateToken, async (req, res) => {
  try {
    const { items, total } = req.body

    const [result] = await pool.execute("INSERT INTO orders (user_id, items, total, status) VALUES (?, ?, ?, ?)", [
      req.user.id,
      JSON.stringify(items),
      total,
      "pending",
    ])

    const [orders] = await pool.execute("SELECT * FROM orders WHERE id = ?", [result.insertId])
    res.json({ success: true, order: orders[0] })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Admin Routes
app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.execute("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC")
    res.json({ success: true, users })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

app.get("/api/admin/orders", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [orders] = await pool.execute(`
      SELECT o.*, u.name as user_name, u.email as user_email 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      ORDER BY o.created_at DESC
    `)

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
  console.log(`Test the server at: http://localhost:${PORT}/api/test`)
})
