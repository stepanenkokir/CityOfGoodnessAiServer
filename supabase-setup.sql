-- Voice Business Finder - Supabase Database Setup
-- Run this script in your Supabase SQL Editor

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create business_status enum type
CREATE TYPE business_status AS ENUM ('pending', 'active', 'inactive', 'suspended', 'rejected');

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, slug)
);

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'United States',
    latitude NUMERIC,
    longitude NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'United States',
    latitude NUMERIC,
    longitude NUMERIC,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(500),
    business_hours JSONB,
    overall_rating NUMERIC,
    total_reviews INTEGER DEFAULT 0,
    google_rating NUMERIC,
    yelp_rating NUMERIC,
    price_range INTEGER,
    established_year INTEGER,
    employee_count_range VARCHAR(50),
    keywords TEXT[],
    search_tags TEXT[],
    features TEXT[],
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    primary_image_url VARCHAR(500),
    status business_status DEFAULT 'pending',
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    address_id UUID REFERENCES addresses(id) ON DELETE SET NULL
);

-- Create business_embeddings table
CREATE TABLE IF NOT EXISTS business_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    embedding_vector vector(1536) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, embedding_model)
);

-- Create index for vector similarity search (using cosine distance)
CREATE INDEX IF NOT EXISTS business_embeddings_vector_idx 
ON business_embeddings 
USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);

-- Create RPC function for vector similarity search
CREATE OR REPLACE FUNCTION match_business_embeddings (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  business_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    business_embeddings.business_id,
    1 - (business_embeddings.embedding_vector <=> query_embedding) as similarity
  FROM business_embeddings
  WHERE 1 - (business_embeddings.embedding_vector <=> query_embedding) > match_threshold
  ORDER BY business_embeddings.embedding_vector <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Sample data insert (optional - for testing)
-- Uncomment and modify as needed

/*
-- Insert sample categories
INSERT INTO categories (name, slug, description) VALUES 
    ('Food & Dining', 'food-dining', 'Restaurants, cafes, and food establishments'),
    ('Health & Beauty', 'health-beauty', 'Salons, spas, and wellness services'),
    ('Professional Services', 'professional-services', 'Business and professional services');

-- Insert sample subcategories
INSERT INTO subcategories (category_id, name, slug, description) VALUES 
    ((SELECT id FROM categories WHERE slug = 'food-dining'), 'Coffee Shops', 'coffee-shops', 'Coffee shops and cafes'),
    ((SELECT id FROM categories WHERE slug = 'food-dining'), 'Restaurants', 'restaurants', 'Full-service restaurants'),
    ((SELECT id FROM categories WHERE slug = 'health-beauty'), 'Barbershops', 'barbershops', 'Traditional barbershops and grooming'),
    ((SELECT id FROM categories WHERE slug = 'health-beauty'), 'Hair Salons', 'hair-salons', 'Hair styling and beauty salons');

-- Insert sample addresses
INSERT INTO addresses (address, city, state, zip_code, latitude, longitude) VALUES 
    ('123 Main St', 'Sacramento', 'CA', '95814', 38.5816, -121.4944),
    ('456 J St', 'Sacramento', 'CA', '95814', 38.5777, -121.4892),
    ('789 K St', 'Sacramento', 'CA', '95814', 38.5805, -121.4937);

-- Insert sample businesses
INSERT INTO businesses (
    name, slug, description, short_description, category_id, subcategory_id,
    address, city, state, zip_code, latitude, longitude, phone, website,
    keywords, search_tags, features, status
) VALUES 
    (
        'Sample Coffee Shop', 'sample-coffee-shop', 
        'Cozy coffee shop with great espresso and pastries', 
        'Great coffee and pastries in downtown Sacramento',
        (SELECT id FROM categories WHERE slug = 'food-dining'),
        (SELECT id FROM subcategories WHERE slug = 'coffee-shops'),
        '123 Main St', 'Sacramento', 'CA', '95814', 38.5816, -121.4944, 
        '(916) 555-0100', 'https://example.com',
        ARRAY['coffee', 'espresso', 'pastries', 'breakfast'],
        ARRAY['cozy', 'downtown', 'local'],
        ARRAY['wifi', 'outdoor seating', 'takeout'],
        'active'
    ),
    (
        'Sacramento Barber', 'sacramento-barber',
        'Traditional barbershop and grooming services',
        'Professional barbering and grooming',
        (SELECT id FROM categories WHERE slug = 'health-beauty'),
        (SELECT id FROM subcategories WHERE slug = 'barbershops'),
        '456 J St', 'Sacramento', 'CA', '95814', 38.5777, -121.4892,
        '(916) 555-0101', 'https://example.com',
        ARRAY['barber', 'haircut', 'grooming', 'traditional'],
        ARRAY['traditional', 'professional', 'downtown'],
        ARRAY['walk-ins welcome', 'appointments'],
        'active'
    ),
    (
        'Russian Cuisine Restaurant', 'russian-cuisine-restaurant',
        'Authentic Russian food and atmosphere',
        'Traditional Russian dishes and drinks',
        (SELECT id FROM categories WHERE slug = 'food-dining'),
        (SELECT id FROM subcategories WHERE slug = 'restaurants'),
        '789 K St', 'Sacramento', 'CA', '95814', 38.5805, -121.4937,
        '(916) 555-0102', 'https://example.com',
        ARRAY['russian', 'eastern european', 'traditional', 'vodka'],
        ARRAY['authentic', 'traditional', 'downtown'],
        ARRAY['full bar', 'dine-in', 'takeout'],
        'active'
    );

-- Note: You'll need to generate embeddings for these businesses using OpenAI API
-- and insert them into business_embeddings table
*/

-- Verify setup
SELECT 'Setup complete! Tables created:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('categories', 'subcategories', 'addresses', 'businesses', 'business_embeddings');

SELECT 'Vector extension enabled:' as status;
SELECT * FROM pg_extension WHERE extname = 'vector';

SELECT 'Business status enum created:' as status;
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'business_status');

