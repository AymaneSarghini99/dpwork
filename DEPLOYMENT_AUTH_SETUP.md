# Production Authentication Setup Guide for Vercel

## Supabase OAuth Configuration for Vercel

To fix authentication issues in Vercel deployment, you need to configure the OAuth redirect URLs in your Supabase project.

### 1. Get Your Vercel Domain

After deploying to Vercel:
1. Go to your Vercel dashboard
2. Find your deployed project
3. Copy the production URL (e.g., `https://your-app.vercel.app` or your custom domain)

### 2. Update Supabase OAuth Settings

Go to your Supabase project dashboard:
1. Navigate to **Authentication** → **Settings**
2. Scroll down to **URL Configuration** (or **Redirect URLs**)
3. Add your Vercel domain(s) to the redirect URLs list:

```
https://your-app.vercel.app/auth/callback
https://your-app.vercel.app/**
```

If you have a custom domain:
```
https://your-custom-domain.com/auth/callback
https://your-custom-domain.com/**
```

### 2. Google OAuth Configuration

1. Go to **Authentication** → **Providers** → **Google**
2. Make sure Google is enabled
3. Add your production domain to the **Authorized Redirect URIs**:
   - `https://your-production-domain.com/auth/callback`

### 3. Vercel Environment Variables

Configure environment variables in your Vercel project:

1. Go to your Vercel dashboard → Project Settings → Environment Variables
2. Add the following environment variables:

```
VITE_SUPABASE_URL=https://jdgppjzmmowqtpkjzhwd.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ap9wCTyBJB7JmzlFR9mycg_fGDTgPBt
```

3. Redeploy your project after adding environment variables

### 4. Vercel Deployment Steps

1. **Push your code** to GitHub (if not already done)
2. **Connect to Vercel**:
   - Go to vercel.com
   - Click "New Project"
   - Import your GitHub repository
3. **Configure build settings** (Vercel should auto-detect):
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. **Add environment variables** (see step 3)
5. **Deploy** the project

### 5. Google OAuth Configuration for Vercel

1. Go to **Authentication** → **Providers** → **Google**
2. Make sure Google is enabled
3. Add your Vercel domain to **Authorized Redirect URIs**:
   - `https://your-app.vercel.app/auth/callback`
   - Or your custom domain: `https://your-custom-domain.com/auth/callback`

### 7. Common Issues & Solutions for Vercel

#### Issue: Stuck at login wall after email signup
- **Cause**: Auth state not persisting properly in production
- **Solution**: The updated AuthContext now handles OAuth parameters correctly

#### Issue: Google OAuth redirects to URL with hash parameters
- **Cause**: OAuth callback not being processed
- **Solution**: The AuthCallback component now properly handles hash parameters and redirects

#### Issue: Authentication works locally but not on Vercel
- **Cause**: Missing Vercel domain in Supabase redirect URLs
- **Solution**: Add your Vercel domain (`your-app.vercel.app`) to Supabase redirect URLs

#### Issue: Environment variables not working on Vercel
- **Cause**: Environment variables not properly configured in Vercel dashboard
- **Solution**: Ensure environment variables are added in Vercel Project Settings and redeploy

#### Issue: CORS errors during authentication
- **Cause**: Supabase CORS configuration missing Vercel domain
- **Solution**: Add Vercel domain to Supabase CORS settings

### 8. Vercel-Specific Debugging

If issues persist on Vercel:
1. **Check Vercel Function Logs**: Go to Vercel dashboard → Functions → Logs
2. **Verify environment variables**: Check they're correctly set in Vercel dashboard
3. **Test with incognito**: Clear browser cache and test in incognito mode
4. **Check Supabase logs**: Go to Supabase dashboard → Auth → Logs
5. **Verify HTTPS**: Vercel automatically provides HTTPS, required for OAuth
6. **Check redirect URLs**: Ensure exact match between Vercel domain and Supabase settings

### 9. Debugging

If issues persist:
1. Check browser console for auth-related errors
2. Verify Supabase redirect URLs match your production domain exactly
3. Ensure HTTPS is used (required for OAuth in production)
4. Check that cookies are enabled in the browser

## Code Changes Made

The following changes were implemented to fix production authentication:

1. **Enhanced AuthCallback component**: Better handling of OAuth hash parameters with retry logic
2. **Improved AuthContext**: Proper initialization and auth state change handling
3. **OAuth parameter detection**: Main page now redirects to callback when OAuth params are present
4. **Dynamic redirect URLs**: OAuth redirects now use the current origin for both local and production

These changes ensure authentication works consistently across development and production environments.
