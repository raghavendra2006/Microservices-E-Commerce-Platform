-- Auth Service Database Initialization
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50),
    provider_id VARCHAR(255),
    role VARCHAR(20) DEFAULT 'USER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider_id);

-- Seed admin user
INSERT INTO users (id, email, name, provider, provider_id, role)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'admin@example.com',
    'Admin User',
    'google',
    '000000001',
    'ADMIN'
) ON CONFLICT (email) DO NOTHING;

-- Seed regular user
INSERT INTO users (id, email, name, provider, provider_id, role)
VALUES (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'user@example.com',
    'Regular User',
    'google',
    '000000002',
    'USER'
) ON CONFLICT (email) DO NOTHING;
