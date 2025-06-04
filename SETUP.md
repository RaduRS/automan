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
    heygen_video_id TEXT,
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
    linkedin_posted BOOLEAN DEFAULT false,
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
```

## Current Phase Complete

✅ **Dependencies installed**: @tobyg74/tiktok-api-dl, @supabase/supabase-js, @deepgram/sdk, openai  
✅ **UI Components**: Shadcn components added (button, input, card, form, label, progress, alert)  
✅ **Frontend Form**: TikTok URL submission form with progress tracking  
✅ **Submit API**: `/api/submit` endpoint for job creation and workflow trigger  
✅ **Status API**: `/api/job-status/[jobId]` endpoint for real-time updates  
✅ **Transcribe API**: `/api/transcribe` endpoint for TikTok download and transcription  
✅ **Database Integration**: Supabase client and job interface  

## New Features in Phase 2

🔄 **TikTok Download**: Uses `@tobyg74/tiktok-api-dl` library to extract audio/video streams  
☁️ **Cloudinary Integration**: Uploads media and extracts audio from videos  
🎙️ **Speech-to-Text**: Deepgram transcription with exponential backoff retry logic  
📊 **Status Tracking**: Real-time job status updates (submitted → downloading → transcribing → transcription_complete)  
🛡️ **Error Handling**: Comprehensive error handling with detailed logging  

## Test the Current Setup

1. Set up your `.env.local` with all API credentials (Supabase, Deepgram, Cloudinary)
2. Run the updated SQL schema in Supabase
3. Start the development server: `npm run dev`
4. Visit `http://localhost:3000`
5. Submit a TikTok URL and watch the status progress through the workflow

The form will now:
- Validate TikTok URL format
- Create a job record in Supabase  
- Trigger the transcription process automatically
- Show real-time status updates: `submitted` → `downloading` → `transcribing` → `transcription_complete`
- Handle errors with detailed error messages
- Store transcripts in the database for future use 