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
ELEVENLABS_API_KEY=your_elevenlabs_api_key

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
        'script_generated', 
        'combining_video',
        'video_complete',
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
    script_scenes TEXT,
    job_description TEXT,
    job_hashtags TEXT,
    final_video_url TEXT,
    video_duration INTEGER,
    video_size_mb DECIMAL(10,2),
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
    'combining_video',
    'video_complete',
    'generating_video',
    'video_ready',
    'scheduled_to_socialbee',
    'error'
);

-- Set proper constraints for fields that should not be null
```

## Database Migration for Text Input Support

If you want to add text input support (bifurcation between TikTok URLs and direct text input), run this SQL to add the new field:

```sql
-- Add text_input field to support direct text input as an alternative to TikTok URLs
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS text_input TEXT,
ADD COLUMN IF NOT EXISTS input_mode TEXT DEFAULT 'tiktok' CHECK (input_mode IN ('tiktok', 'text'));

-- Update the constraint to make tiktok_url_1 optional when using text input
ALTER TABLE jobs ALTER COLUMN tiktok_url_1 DROP NOT NULL;

-- Add a constraint to ensure either tiktok_url_1 or text_input is provided
ALTER TABLE jobs ADD CONSTRAINT jobs_input_check 
CHECK (
  (input_mode = 'tiktok' AND tiktok_url_1 IS NOT NULL) OR 
  (input_mode = 'text' AND text_input IS NOT NULL)
);

-- Add index for input_mode for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_input_mode ON jobs(input_mode);
```

## Database Migration for Existing Users

If you already have the jobs table set up, run this SQL to add the new columns for video workflow:

```sql
-- Add new columns for script scenes and video workflow
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS script_scenes TEXT,
ADD COLUMN IF NOT EXISTS video_duration INTEGER,
ADD COLUMN IF NOT EXISTS video_size_mb DECIMAL(10,2);

-- Update status enum to include new video workflow statuses
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN (
    'submitted',
    'downloading', 
    'transcribing',
    'transcription_complete',
    'generating_script',
    'script_generated',
    'combining_video',
    'video_complete',
    'generating_video',
    'video_ready',
    'scheduled_to_socialbee',
    'error'
));

-- Add new columns for description and hashtags (if not exists)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS job_description TEXT,
ADD COLUMN IF NOT EXISTS job_hashtags TEXT;

-- Create image generation tracking table
CREATE TABLE IF NOT EXISTS image_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sentence TEXT NOT NULL,
    prompt_generated TEXT,
    image_url TEXT,
    downloaded BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_image_generations_created_at ON image_generations(created_at DESC);

-- Add downloaded column to existing table
ALTER TABLE image_generations 
ADD COLUMN IF NOT EXISTS downloaded BOOLEAN DEFAULT false;
```

## Required Software

### FFmpeg Installation

The video combination feature requires FFmpeg to be installed on your system:

**macOS (using Homebrew):**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html and add to PATH

**Verify installation:**
```bash
ffmpeg -version
```