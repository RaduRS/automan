Automan - application that automates the process of posting content (I will be the sole user - no team or external users)

# Project Goal:

Build a Next.js application that automates the process of taking a TikTok URL (and optionally two additional URLs), extracting audio, generating a new video with a custom avatar using AI, and then publishing that video to multiple social media platforms via SocialBee.

## Core Technologies:

- **Frontend & Backend:** Next.js 15 (with TypeScript)
- **UI Library:** Shadcn UI (for styling and components)
- **Database:** Supabase (for storing application state, job metadata, and intermediate results)
- **TikTok URL Resolution & Media Retrieval:** `@tobyg74/tiktok-api-dl` Node.js library
- **Cloud Storage & Media Transformations:** Cloudinary (for storing videos and audio, and for audio extraction)
- **Speech-to-Text:** Deepgram (for transcribing audio to text)
- **AI Script Generation:** OpenAI API (for creating new video scripts and scene breakdowns from the combined transcripts)
- **AI Video Generation:** HeyGen API (for generating videos with a custom avatar from the AI script)
- **Social Media Publishing:** SocialBee API (for scheduling and publishing to multiple platforms)

## Required npm packages:

- @tobyg74/tiktok-api-dl
- @supabase/supabase-js
- cloudinary
- @deepgram/sdk
- openai

## Application Architecture:

The application will consist of the following components:

## 1. Frontend:

**Main Page (URL Input & Progress):**

- A form with:
    - One required input field for the primary TikTok URL
    - Two optional input fields for additional TikTok URLs (for providing context to the AI)
    - A "Submit" button
    - Basic UI to display the status of each stage in the process (e.g., "Downloading," "Transcribing," "Generating Video," "Publishing")
    - **Progress bar with current step and estimated time remaining**
    - **Manual retry buttons for failed jobs**

**Dashboard Page (Job Management):**

- **Table displaying all jobs with columns:**
    - **Job title/ID**
    - **Created date**
    - **Status**
    - **Social media platform columns (Instagram, Facebook, TikTok, YouTube, X)**
    - **Each platform column shows:**
        - **✓ (green checkmark icon) if posted successfully**
        - **✗ (red X icon) if not posted or failed**
        - **⏳ (pending icon) if scheduled but not yet posted**
- **Clickable rows to view job details**
- **Filter options by status (All, Published, Failed, In Progress)**

## 2. Backend (Next.js API Routes):

- `/api/submit`: Accepts the TikTok URLs from the frontend, initiates the workflow
- `/api/transcribe`: Downloads TikToks, extracts audio, transcribes to text, stores results in Supabase
- `/api/generate`: Takes transcripts from Supabase, uses OpenAI to generate the new script and scene breakdown, and triggers HeyGen
- `/api/heygen-webhook`: Receives the webhook call from HeyGen upon video completion, downloads the final video, stores it in Cloudinary
- **`/api/socialbee-publish`: Handles social media publishing via SocialBee API**
- `/api/socialbee-webhook`: Receives webhook calls from SocialBee on post status, updates Supabase
- **`/api/job-status/[jobId]`: Returns current job status for frontend polling**

## 3. Database (Supabase):

A table called `jobs` (or similar) to track the state of each TikTok-to-Social Media process. Columns:

- `id` (UUID, primary key)
- `tiktok_url_1` (text, required)
- `tiktok_url_2` (text, optional)
- `tiktok_url_3` (text, optional)
- `status` (enum: "submitted", "downloading", "transcribing", "generating_script", "generating_video", "video_ready", "publishing", "published", "error")
- `transcript_1` (text, optional)
- `transcript_2` (text, optional)
- `transcript_3` (text, optional)
- `openai_script` (text, optional)
- `final_video_url` (text, optional, Cloudinary URL)
- `socialbee_post_id` (text, optional)
- **`error_message` (text, optional)**
- **`retry_count` (integer, default 0)**
- **`job_title` (text, optional)**
- **`instagram_posted` (boolean, default false)**
- **`facebook_posted` (boolean, default false)**
- **`tiktok_posted` (boolean, default false)**
- **`youtube_posted` (boolean, default false)**
- **`x_posted` (boolean, default false)**
- `created_at` (timestamp)
- `updated_at` (timestamp)

Additional columns as needed to store API responses, error messages, etc.

## Workflow Steps (Detailed):

## 1. Frontend:

- User enters TikTok URLs in the app's form and clicks "Submit"
- The frontend sends a POST request to `/api/submit` with the TikTok URLs
- **Frontend starts polling `/api/job-status/{jobId}` every 3-5 seconds to update UI with progress**

## 2. `/api/submit` (Initial Submission):

- Receives the TikTok URLs
- Creates a new record in the `jobs` table in Supabase with `status = "submitted"` and the provided TikTok URLs
- Generates a unique job ID (UUID) and stores it in the Supabase record
- Immediately returns a success response to the frontend, providing the job ID
- **Includes try-catch blocks and updates job status to "error" on failure**
- Calls `/api/transcribe` (or queues it using a job queue if needed), passing the job ID

## 3. `/api/transcribe` (Download & Transcribe):

- **Must complete within 60 seconds (Vercel Hobby plan timeout)**
- Receives the job ID
- Updates the job status in Supabase to `"downloading"`
- **Process URLs sequentially (not in parallel) to avoid timeout issues**
- For each TikTok URL (up to 3):
    - Uses `@tobyg74/tiktok-api-dl` library to get the direct audio URL (or video URL if direct audio isn't available)
    - If direct audio URL is available:
        - Uploads the audio to Cloudinary (folder `tiktok_audios`)
    - Else (if only video URL is available):
        - Uploads the video to Cloudinary (folder `tiktok_videos_for_audio_extraction`)
        - Uses Cloudinary's transformation to extract the audio (generates the audio URL)
    - Sends the audio URL to Deepgram for transcription
    - Stores the resulting transcript in the corresponding column (`transcript_1`, `transcript_2`, `transcript_3`) in the `jobs` table in Supabase
- Updates the job status in Supabase to `"transcribing"`
- Once all TikTok URLs have been processed and transcripts stored, updates the job status to `"transcription_complete"`
- **Includes error handling with exponential backoff for API calls**
- **Logs detailed error messages in Supabase for debugging**
- Calls `/api/generate`, passing the job ID

## 4. `/api/generate` (AI Script & HeyGen Trigger):

- **Must complete within 60 seconds (Vercel Hobby plan timeout)**
- Receives the job ID
- Updates the job status in Supabase to `"generating_script"`
- Retrieves the transcripts from the `jobs` table in Supabase
- Combines the transcripts into a single input for OpenAI's API
- Sends a request to OpenAI's API with a prompt that instructs it to generate a video script with scene breakdowns. The prompt should be carefully designed to specify the desired output format (e.g., JSON or Markdown with clear scene delimiters)
- Stores the generated script in the `openai_script` column in the `jobs` table
- Updates the job status in Supabase to `"script_generated"`
- Sends a request to the HeyGen API to initiate video generation, providing the generated script and specifying the desired custom avatar, voice cloning, etc.
- Receives the `video_id` from HeyGen and stores it in the `heygen_video_id` column in the `jobs` table
- Updates the job status in Supabase to `"generating_video"`
- Configures the HeyGen API call to use a webhook URL pointing to `/api/heygen-webhook`, so HeyGen will notify your application when the video is ready
- **Includes try-catch blocks and error handling**

## 5. `/api/heygen-webhook` (HeyGen Video Completion):

- Receives the webhook call from HeyGen (event: `avatar_video.success`)
- Parses the webhook payload to extract the `video_id` and the `video_url` (the URL to download the generated video)
- Uses the `video_id` to find the corresponding job in the `jobs` table in Supabase
- Updates the job status in Supabase to `"video_downloading"`
- Downloads the final video from HeyGen's `video_url`. Stream the video
- Uploads the final video to Cloudinary (folder `final_videos`)
- Stores the resulting video URL in the `final_video_url` column in the `jobs` table
- Updates the job status in Supabase to `"video_ready"`
- Calls `/api/socialbee-publish`, passing the job ID

## 6. `/api/socialbee-publish` (Social Media Publishing):

- Receives the job ID
- Updates the job status in Supabase to `"publishing"`
- Retrieves the `final_video_url` from the `jobs` table
- Calls the SocialBee API to schedule a post using the `final_video_url` for the video content. Make sure to set the desired publishing time, captions, and target social media profiles
- When the SocialBee API responds, it will provide a unique identifier for the scheduled post. Store this identifier in the `socialbee_post_id` column in the `jobs` table
- Updates the job status in Supabase to `"publishing_scheduled"`

## 7. `/api/socialbee-webhook` (SocialBee Post Status Updates - Optional, but Recommended):

- Configures SocialBee to send webhook calls to this endpoint when posts are published or experience errors
- The endpoint receives the webhook call from SocialBee
- Parses the payload to extract information about the post status (success, failure, etc.)
- Uses the `socialbee_post_id` to find the corresponding job in the `jobs` table
- Updates the `jobs` table with the post status (e.g., changes `status` to `"published"` if successful)
- **Updates individual platform status columns (`instagram_posted`, `facebook_posted`, etc.) based on SocialBee webhook data**
- This provides real-time feedback on the success or failure of the social media posting process

## 8. **`/api/job-status/[jobId]` (Frontend Status Polling):**

- **Receives job ID as URL parameter**
- **Returns current job status, progress, and any error messages**
- **Used by frontend to update UI in real-time**

## **Error Handling & Timeout Management:**

- **Each API route must include try-catch blocks and update job status to "error" on failure**
- **Implement exponential backoff for API calls**
- **Add job cleanup for stuck/failed processes**
- **Log detailed error messages in Supabase for debugging**
- **All API routes must complete within 60 seconds (Vercel Hobby plan constraint)**

## **Backup Mechanisms:**

- **If HeyGen webhook fails, implement polling mechanism checking video status every 30 seconds**
- **Add manual retry functionality in the UI for failed jobs**
- **Implement job recovery system for interrupted processes**

## **Webhook URL Configuration:**

- **Configure HeyGen webhook URL to point to: `https://your-vercel-app.vercel.app/api/heygen-webhook`**
- **Configure SocialBee webhook URL to point to: `https://your-vercel-app.vercel.app/api/socialbee-webhook`**
- **Ensure webhook URLs are updated when deploying to different environments**

## Vercel-Specific Considerations:

- **Keep API Routes Short:** Each API route (especially `/api/transcribe`, `/api/generate`, and `/api/heygen-webhook`) *must* complete its work within Vercel's function timeout limits (60 seconds on Hobby plan). Decompose the workflow into asynchronous steps and use webhooks to trigger subsequent actions
- **Streaming to Cloudinary:** Download TikTok videos and HeyGen-generated videos directly to Cloudinary using streams (instead of loading entire files into memory)
- **Database for State:** Use Supabase (or another database) to reliably track the state of each job, pass data between API routes, and handle retries if necessary
- **Minimize Dependencies:** Keep the size of your Next.js function bundles small by using lightweight libraries and minimizing unnecessary dependencies

# Automan

**Transform TikTok videos into multi-platform social media content automatically**

A Next.js application that automates the workflow of taking TikTok videos, transcribing them, generating optimized scripts, creating new videos, and scheduling posts across multiple social media platforms.

## 🚀 Features

- **TikTok Video Processing**: Download and transcribe TikTok videos (supports up to 3 URLs per job)
- **AI Script Generation**: Create platform-optimized content using OpenAI
- **Video Creation**: Generate new videos with HeyGen
- **Multi-Platform Scheduling**: Automatically schedule to Instagram, Facebook, TikTok, YouTube, and X via SocialBee
- **Real-time Dashboard**: Track job progress and posting status
- **Webhook Integration**: Receive updates when content is posted

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Supabase account (database)
- A Cloudinary account (media storage)
- A Deepgram account (transcription)
- **A RapidAPI account with TikTok Scraper subscription** (for reliable TikTok downloads)
- An OpenAI account (script generation) 
- A HeyGen account (video creation)
- A SocialBee account (social media scheduling)

