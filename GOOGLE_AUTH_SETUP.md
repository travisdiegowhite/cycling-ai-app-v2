# Google OAuth Setup for Tribos.studio

This guide will help you configure Google OAuth authentication in your Supabase project.

## Prerequisites
- Supabase project already set up
- Access to Google Cloud Console

## Step 1: Configure Google OAuth in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: `Tribos.studio` (or your preferred name)
   - User support email: Your email
   - Developer contact email: Your email
   - Add scopes: `email` and `profile`
   - Add test users if in testing mode

6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: `Tribos.studio Web Client`
   - Authorized JavaScript origins:
     ```
     https://toihfeffpljsmgritmuy.supabase.co
     http://localhost:3000
     ```
   - Authorized redirect URIs:
     ```
     https://toihfeffpljsmgritmuy.supabase.co/auth/v1/callback
     http://localhost:3000
     ```

7. Click **Create** and save your:
   - Client ID
   - Client Secret

## Step 2: Configure Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** in the list and enable it
5. Enter your Google OAuth credentials:
   - **Client ID**: Paste the Client ID from Google Cloud Console
   - **Client Secret**: Paste the Client Secret from Google Cloud Console
6. Click **Save**

## Step 3: Update Your Application URLs (Production)

When deploying to production (e.g., Vercel), you'll need to update:

### In Google Cloud Console:
Add your production URLs to:
- Authorized JavaScript origins: `https://yourdomain.com`
- Authorized redirect URIs: `https://toihfeffpljsmgritmuy.supabase.co/auth/v1/callback`

### In Supabase:
1. Go to **Authentication** > **URL Configuration**
2. Set **Site URL** to your production URL: `https://yourdomain.com`
3. Add any additional redirect URLs if needed

## Step 4: Test the Integration

1. Start your development server: `npm start`
2. Navigate to the login page
3. Click "Sign up with Google" or "Sign in with Google"
4. You should be redirected to Google's OAuth consent screen
5. After authorizing, you'll be redirected back to your app and logged in

## Troubleshooting

### "redirect_uri_mismatch" Error
- Verify that the redirect URI in Google Cloud Console exactly matches:
  `https://toihfeffpljsmgritmuy.supabase.co/auth/v1/callback`
- Make sure there are no trailing slashes or typos

### "Access Blocked" Error
- Your OAuth consent screen might be in testing mode
- Add your email as a test user in Google Cloud Console
- Or publish your OAuth consent screen for production use

### User Not Appearing in Database
- Check Supabase **Authentication** > **Users** to verify the user was created
- The user's email from Google will be automatically populated
- User metadata will include Google profile information

## Security Notes

- **Never commit** your Google Client Secret to version control
- Store secrets in environment variables or Supabase vault
- Regularly rotate your OAuth credentials
- Monitor OAuth usage in Google Cloud Console
- Review granted permissions periodically

## Additional Features

### Email Verification
Google OAuth users are automatically verified since Google verifies email addresses.

### User Metadata
After Google OAuth sign-in, you can access:
```javascript
const { user } = useAuth();
// user.user_metadata contains:
// - full_name
// - avatar_url
// - email
// - provider (will be 'google')
```

### Sign Out
Users signed in via Google OAuth can sign out normally:
```javascript
const { signOut } = useAuth();
await signOut();
```

## Support

For more information:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
