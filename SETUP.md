# Automan Setup Guide

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Supabase Configuration (Required Now)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Keys (Required for Phase 2)
DEEPGRAM_API_KEY=your_deepgram_api_key
OPENAI_API_KEY=your_openai_api_key  
PERPLEXITY_API_KEY=your_perplexity_api_key
REPLICATE_API_TOKEN=your_replicate_api_token
HEYGEN_API_KEY=your_heygen_api_key
SOCIALBEE_API_KEY=your_socialbee_api_key

# Cloudinary Configuration (Required for Phase 2)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Base URL for webhooks
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Database Setup

1. Go to your Supabase project
2. Open the SQL Editor
3. Run the following SQL schema:

```sql
-- Create the jobs table for tracking the entire workflow
CREATE TABLE jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tiktok_url_1 TEXT NOT NULL,
    tiktok_url_2 TEXT,
    tiktok_url_3 TEXT,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
        'submitted', 
        'downloading', 
        'transcribing', 
        'transcription_complete',
        'generating_script', 
        'generating_video', 
        'video_ready', 
        'publishing', 
        'published', 
        'error'
    )),
    transcript_1 TEXT,
    transcript_2 TEXT,
    transcript_3 TEXT,
    openai_script TEXT,
    job_description TEXT,
    job_hashtags TEXT,
    final_video_url TEXT,
    socialbee_post_id TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    job_title TEXT,
    instagram_posted BOOLEAN DEFAULT false,
    facebook_posted BOOLEAN DEFAULT false,
    tiktok_posted BOOLEAN DEFAULT false,
    youtube_posted BOOLEAN DEFAULT false,
    x_posted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on status for faster queries
CREATE INDEX idx_jobs_status ON jobs(status);

-- Create an index on created_at for sorting
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at on row changes
CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Clean up invalid status values (keep only the ones in your enum)
UPDATE jobs 
SET status = 'error' 
WHERE status NOT IN (
    'submitted',
    'downloading',
    'transcribing',
    'transcription_complete',
    'generating_script',
    'script_generated',
    'generating_video',
    'video_ready',
    'scheduled_to_socialbee',
    'error'
);

-- Set proper constraints for fields that should not be null
```

## Database Migration for Existing Users

If you already have the jobs table set up, run this SQL to add the new columns for description and hashtags:

```sql
-- Add new columns for description and hashtags
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS job_description TEXT,
ADD COLUMN IF NOT EXISTS job_hashtags TEXT;

-- Create image generation tracking table
CREATE TABLE IF NOT EXISTS image_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sentence TEXT NOT NULL,
    prompt_generated TEXT,
    image_url TEXT,
    cost DECIMAL(10,6) DEFAULT 0.003,
    downloaded BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_image_generations_created_at ON image_generations(created_at DESC);

-- Create a view for total spend tracking
CREATE OR REPLACE VIEW image_generation_stats AS
SELECT 
    COUNT(*) as total_generations,
    SUM(cost) as total_cost,
    MAX(created_at) as last_generation
FROM image_generations;

-- Add downloaded column to existing table
ALTER TABLE image_generations 
ADD COLUMN IF NOT EXISTS downloaded BOOLEAN DEFAULT false;
```