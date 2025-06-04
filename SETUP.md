# Automan Setup Guide

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Supabase Configuration (Required Now)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Keys (Will be needed in future phases)
DEEPGRAM_API_KEY=your_deepgram_api_key
OPENAI_API_KEY=your_openai_api_key  
HEYGEN_API_KEY=your_heygen_api_key
SOCIALBEE_API_KEY=your_socialbee_api_key

# Cloudinary Configuration (Will be needed in future phases)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Base URL for webhooks
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Database Setup

1. Go to your Supabase project
2. Open the SQL Editor
3. Run the SQL schema provided in the main instructions

## Current Phase Complete

✅ **Dependencies installed**: downloadtiktok, @supabase/supabase-js, @deepgram/sdk, openai  
✅ **UI Components**: Shadcn components added (button, input, card, form, label, progress, alert)  
✅ **Frontend Form**: TikTok URL submission form with progress tracking  
✅ **Submit API**: `/api/submit` endpoint for job creation  
✅ **Status API**: `/api/job-status/[jobId]` endpoint for real-time updates  
✅ **Database Integration**: Supabase client and job interface  

## Test the Current Setup

1. Set up your `.env.local` with Supabase credentials
2. Run the SQL schema in Supabase
3. Start the development server: `npm run dev`
4. Visit `http://localhost:3000`
5. Try submitting a TikTok URL to test the form and API

The form will:
- Validate TikTok URL format
- Create a job record in Supabase  
- Show job status (currently stays in "submitted" state)
- Poll for status updates every 3 seconds 