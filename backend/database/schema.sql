-- Create database
CREATE DATABASE ecommercewebsite;

-- Use the database
\c ecommerce_db;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image VARCHAR(500),
    category VARCHAR(100),
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    items JSONB NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample admin user (password: admin123)
INSERT INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Insert sample products
INSERT INTO products (name, description, price, image, category, stock) VALUES 
('Laptop', 'High-performance laptop for work and gaming', 999.99, '/placeholder.svg?height=200&width=200', 'Electronics', 50),
('Smartphone', 'Latest smartphone with advanced features', 699.99, '/placeholder.svg?height=200&width=200', 'Electronics', 100),
('Headphones', 'Wireless noise-cancelling headphones', 199.99, '/placeholder.svg?height=200&width=200', 'Electronics', 75),
('T-Shirt', 'Comfortable cotton t-shirt', 29.99, '/placeholder.svg?height=200&width=200', 'Clothing', 200),
('Jeans', 'Classic blue jeans', 79.99, '/placeholder.svg?height=200&width=200', 'Clothing', 150),
('Sneakers', 'Comfortable running sneakers', 129.99, '/placeholder.svg?height=200&width=200', 'Footwear', 80);