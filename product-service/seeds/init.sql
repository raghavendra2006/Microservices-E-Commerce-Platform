-- Product Service Database Initialization
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed sample products
INSERT INTO products (id, name, description, price, stock)
VALUES
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Wireless Headphones', 'Premium noise-cancelling wireless headphones', 99.99, 50),
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 'Mechanical Keyboard', 'RGB mechanical gaming keyboard', 149.99, 30),
    ('e5f6a7b8-c9d0-1234-efab-345678901234', 'USB-C Hub', '7-in-1 USB-C hub with HDMI', 49.99, 100)
ON CONFLICT (id) DO NOTHING;
