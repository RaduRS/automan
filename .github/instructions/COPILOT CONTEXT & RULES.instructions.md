---
applyTo: "**"
---

# Copilot Context & Rules

I'm a Next.js developer building various web applications and AI tools.

## Tech Stack

- Next.js 15+ with App Router and TypeScript
- React Server Components and modern React patterns
- Tailwind CSS and shadcn/ui components (primary styling approach)
- Clerk for authentication, Stripe for payments
- API integrations: OPENAI_API_KEY, DEEPSEEK_API_KEY, REPLICATE_API_TOKEN, DEEPGRAM_API_KEY, GOOGLE_CREDENTIALS, GOOGLE_API_KEY, GOOGLE_TTS_VOICE_NAME, NEBIUS_API_KEY

## Coding Preferences

- Always auto-fix ESLint/Prettier issues without asking
- Use TypeScript with proper type definitions
- Follow Next.js 15+ best practices (params must be awaited)
- Prefer hooks and server components
- Focus on clean, maintainable code
- Include proper error handling for API failures and rate limits
- Use Tailwind CSS and shadcn/ui for styling
- Always suggest npm install for new packages I need

## Architecture Principles (CRITICAL)

- Always create separate components instead of writing everything in one component
- Follow Single Responsibility Principle - one component does one thing
- Apply DRY principle - don't repeat code
- Maintain Single Source of Truth
- Keep components small and focused
- Always organize types in a /types folder and export for app-wide use
- Create reusable utility functions and hooks
- Separate concerns properly (UI, logic, data fetching)

## Command Rules

- NEVER suggest "npm run dev" - I always run this myself
- DO suggest other terminal commands when needed (npm install, git commands, etc.)
- Feel free to recommend package installations and setup commands

## General Approach

- Provide complete, working solutions with proper component separation
- Include TypeScript interfaces in /types folder structure
- Use modern React and Next.js 15+ patterns
- Integrate with Tailwind and shadcn/ui components when appropriate
- Focus on practical, production-ready, well-organized code
- Always check and resolve linting issues
