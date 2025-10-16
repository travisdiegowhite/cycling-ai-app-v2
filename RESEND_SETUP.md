# Resend Email Integration Setup

This document explains how the Resend email integration works for beta signup welcome emails.

## Setup Complete

The following has been implemented:

### 1. Package Installation
- `resend` package installed (v6.1.3)

### 2. Environment Configuration
- Added `RESEND_API_KEY` to `.env.example`
- You need to add your actual API key to `.env` file

### 3. API Endpoints Created

#### `/api/send-welcome-email` (POST)
Sends a welcome email to new beta signups.

**Request Body:**
```json
{
  "name": "User Name",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "unique-message-id"
}
```

### 4. Email Template
A professional HTML email template with:
- Gradient header with cycling theme
- Personalized greeting
- Beta launch date (December 1, 2025)
- Feature highlights
- Call-to-action button to try demo
- Responsive design

### 5. Integration Points

**BetaSignup.js** (src/components/BetaSignup.js:57-84)
- Automatically sends welcome email after successful signup
- Gracefully handles email failures (signup still succeeds)
- Shows appropriate toast messages

**dev-server.js** (dev-server.js:160-295)
- Email endpoint for local development
- Validates API key on startup
- Logs email sending status

## How to Get Your Resend API Key

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Navigate to "API Keys" in the dashboard
4. Create a new API key
5. Copy the key (starts with `re_`)

## Configuration

### Step 1: Add API Key to .env
```bash
# Add this to your .env file
RESEND_API_KEY=re_your_actual_key_here
```

### Step 2: Configure Domain (Production)

For production, you'll need to:

1. **Add and verify your domain** in Resend dashboard
2. **Update the "from" address** in both files:
   - `api/send-welcome-email.js:43`
   - `dev-server.js:180`

   Change from:
   ```javascript
   from: 'Tribos Studio <onboarding@tribos.studio>',
   ```

   To your verified domain:
   ```javascript
   from: 'Tribos Studio <onboarding@yourdomain.com>',
   ```

### Step 3: Test Locally

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Fill out the beta signup form
3. Check the terminal for email sending logs
4. Check your email inbox

## Testing Email Sending

You can test the email API directly:

```bash
curl -X POST http://localhost:3001/api/send-welcome-email \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "your-test-email@example.com"
  }'
```

## Production Deployment

The API endpoint at `api/send-welcome-email.js` is ready for Vercel deployment. Vercel will automatically:

1. Detect the serverless function
2. Deploy it as `/api/send-welcome-email`
3. Use the `RESEND_API_KEY` from Vercel environment variables

### Add Environment Variable to Vercel

```bash
# Via Vercel CLI
vercel env add RESEND_API_KEY

# Or via Vercel Dashboard:
# Settings > Environment Variables > Add
```

## Email Features

The welcome email includes:

- Personalized greeting with user's name
- Beta launch date announcement
- List of key features
- Call-to-action button to try demo account
- Professional styling with your brand colors
- Mobile-responsive design
- Proper email client compatibility

## Resend Free Tier

Resend's free tier includes:
- 100 emails/day
- 3,000 emails/month
- All features included
- No credit card required

This is more than enough for beta signups!

## Troubleshooting

### Email not sending

1. Check that `RESEND_API_KEY` is in your `.env` file
2. Verify the API key is valid in Resend dashboard
3. Check terminal logs for error messages
4. Ensure dev server is running (`npm run api`)

### Email going to spam

1. Verify your domain in Resend dashboard
2. Add SPF and DKIM records to your DNS
3. Use a verified "from" address
4. Avoid spam trigger words in content

### "Email service not configured" error

This means `RESEND_API_KEY` is missing from environment variables.
Add it to your `.env` file and restart the dev server.

## Next Steps

1. Get your Resend API key
2. Add it to `.env`
3. Test the signup flow
4. Verify domain for production
5. Update "from" address to your domain
6. Deploy to production with environment variable

## Support

- Resend Docs: https://resend.com/docs
- Resend API Reference: https://resend.com/docs/api-reference
- GitHub Issues: https://github.com/resendlabs/resend-node
