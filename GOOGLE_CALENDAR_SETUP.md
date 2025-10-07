# Google Calendar Authentication Setup Guide

## Problem

You're getting the error: `"Auth config not found"` with code `607` when trying to connect to Google Calendar through Composio.

## Solution Steps

### 1. Set up Google Cloud Console Project

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project** or select an existing one
3. **Enable Google Calendar API:**

   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click on it and press "Enable"

4. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for NextAuth)
     - `https://backend.composio.dev/api/v3/toolkits/auth/callback` (for Composio)
   - Save and note down your Client ID and Client Secret

### 2. Set up Composio Auth Config

1. **Log into [Composio Dashboard](https://app.composio.dev)**
2. **Go to Auth Configs section**
3. **Create New Auth Config:**
   - Click "Create Auth Config"
   - Select "Google Calendar" from the toolkit list
   - Choose "OAuth2" authentication method
   - Select "Use your own developer credentials"
   - Enter your Google OAuth credentials:
     - Client ID: (from Google Cloud Console)
     - Client Secret: (from Google Cloud Console)
   - Set Redirect URI: `https://backend.composio.dev/api/v3/toolkits/auth/callback`
   - Configure scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
   - Click "Create Auth Config"
   - **Copy the Auth Config ID** (starts with `ac_...`)

### 3. Environment Variables

Create a `.env.local` file in your project root with:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# Google OAuth (for NextAuth)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Composio Configuration
COMPOSIO_API_KEY=your-composio-api-key
COMPOSIO_GOOGLECALENDAR_AUTH_CONFIG_ID=ac_your-auth-config-id-here

# Optional Composio settings
COMPOSIO_MCP_SERVER_ID=your-mcp-server-id
COMPOSIO_CONNECTED_ACCOUNT_ID=your-connected-account-id
```

### 4. Test the Setup

1. **Start your development server:**

   ```bash
   npm run dev
   ```

2. **Sign in with Google** on your app
3. **Click "Connect Google Calendar"**
4. **Complete the OAuth flow** in the popup window
5. **Check if meetings are loaded** successfully

## Troubleshooting

### Common Issues:

1. **"Auth config not found" error:**

   - Make sure you've created the Auth Config in Composio dashboard
   - Verify the `COMPOSIO_GOOGLECALENDAR_AUTH_CONFIG_ID` environment variable is set correctly

2. **"Unauthorized" error:**

   - Check that your Google OAuth credentials are correct
   - Verify the redirect URIs are properly configured

3. **"No connected account" error:**
   - Make sure the user has completed the OAuth flow
   - Check that the connection was successful in Composio dashboard

### Debug Steps:

1. **Check environment variables:**

   ```bash
   # In your terminal, verify env vars are loaded
   echo $COMPOSIO_API_KEY
   echo $COMPOSIO_GOOGLECALENDAR_AUTH_CONFIG_ID
   ```

2. **Check browser console** for any JavaScript errors
3. **Check server logs** for detailed error messages
4. **Verify Composio dashboard** shows the connected account

## Alternative: Direct Google Calendar API

If you continue having issues with Composio, you can implement direct Google Calendar API integration:

1. Use the same Google OAuth credentials
2. Implement OAuth flow directly in your app
3. Use Google Calendar API v3 directly
4. Store access tokens securely

This approach gives you more control but requires more implementation work.
