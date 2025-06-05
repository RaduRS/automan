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

# Anam API Configuration (Required for Phase 3)
ANAM_API_KEY=your_anam_api_key
ANAM_API_ID=your_anam_api_id
NEXT_PUBLIC_ANAM_API_ID=your_anam_api_id  # Same as ANAM_API_ID, but accessible to client-side

# Legacy HeyGen (if still needed)
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
        'script_generated',
        'generating_video',
        'video_generated', 
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
    
    -- Anam API integration fields
    anam_session_token TEXT,
    anam_session_id TEXT,
    video_url TEXT,
    
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

## Migration for Existing Databases

If you already have a `jobs` table, run this migration instead:

```sql
-- Add new Anam-related columns
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS anam_session_token TEXT,
ADD COLUMN IF NOT EXISTS anam_session_id TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Update the status constraint to include new statuses
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
CHECK (status IN (
    'submitted', 
    'downloading', 
    'transcribing', 
    'transcription_complete',
    'generating_script', 
    'script_generated',
    'generating_video',
    'video_generated', 
    'video_ready', 
    'publishing', 
    'published', 
    'error'
));
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

## New Features in Phase 3 - Anam AI Integration

🤖 **AI Script Generation**: Enhanced OpenAI integration optimized for Anam AI avatar generation  
🎭 **Anam AI Integration**: Session-based avatar creation with persona configuration  
📹 **Video Generation Foundation**: Session tokens for future video generation capabilities  
🔄 **Enhanced Status Flow**: New statuses (script_generated → generating_video → video_generated)  
📊 **Extended Database Schema**: New fields for Anam session management  

## Anam AI Setup Guide

### 1. Get Your Anam API Credentials

1. Sign up for an account at [Anam AI](https://anam.ai)
2. Navigate to your dashboard and generate an API key
3. Note down your API ID from the account settings
4. Add these to your `.env.local` file:

```bash
ANAM_API_KEY=your_anam_api_key_here
ANAM_API_ID=your_anam_api_id_here
```

### 2. Current Integration Status

The current implementation provides:

- ✅ **Session Creation**: Creates Anam AI sessions with your generated script
- ✅ **Persona Configuration**: Sets up AI persona with custom personality and script
- ✅ **Database Storage**: Stores session tokens for future use
- ⏳ **Video Download**: Foundation ready for video generation and download
- ⏳ **Cloudinary Upload**: Integration ready for final video storage

### 3. How It Works

1. **Script Generation**: OpenAI generates optimized content for Anam AI avatars
2. **Session Creation**: Creates an Anam AI session with persona configuration
3. **Token Storage**: Stores session tokens in the database for future video generation
4. **Status Updates**: Updates job status to `video_generated`

### 4. Next Steps for Full Video Generation

To complete the video generation workflow, you can:

1. **Use Anam's JavaScript SDK** to create downloadable videos from sessions
2. **Implement webhook handling** for video completion notifications
3. **Add video download logic** to fetch generated videos
4. **Integrate with Cloudinary** for final video storage

### 5. Alternative: Real-time Avatar Interaction

The session tokens can also be used for real-time avatar interactions:

```javascript
import { createClient } from '@anam-ai/js-sdk';

// Use the stored session token for real-time interaction
const anamClient = createClient('your-session-token');

// Stream to video and audio elements
await anamClient.streamToVideoAndAudioElements(
  'video-element-id',
  'audio-element-id'
);
```

## Test the Current Setup

1. Set up your `.env.local` with all API credentials (Supabase, Deepgram, Cloudinary, Anam)
2. Run the database migration in Supabase
3. Start the development server: `npm run dev`
4. Submit TikTok URLs and monitor the enhanced workflow in the dashboard 