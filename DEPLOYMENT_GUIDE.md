# Firebase Deployment Guide for Remember App

## Prerequisites

1. **Firebase CLI installed** ✅ (Already installed on your system)
2. **Firebase Project** - You'll need to create or use an existing Firebase project
3. **Environment Variables** - Firebase configuration values

## Step-by-Step Deployment Instructions

### 1. Set Up Firebase Project

If you haven't already created a Firebase project:

```bash
# Login to Firebase (if not already logged in)
firebase login

# Initialize Firebase in your project (if not already done)
firebase init
```

When running `firebase init`, select:

- ✅ **Firestore** (already configured)
- ✅ **Hosting**
- Use existing project or create new one
- Accept the default `firestore.rules` and `firestore.indexes.json`
- Choose `dist` as your public directory (already configured)
- Configure as single-page app: **Yes**
- Set up automatic builds and deploys with GitHub: **Optional**

### 2. Configure Environment Variables

#### For Development

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase project values in `.env`:

   ```bash
   PUBLIC_FIREBASE_API_KEY=your_actual_api_key
   PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
   PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABCDEF1234
   ```

#### For Production

Firebase Hosting automatically provides environment variables at build time when you deploy, so no additional configuration is needed for production.

### 3. Deploy Commands

#### Full Deployment (Hosting + Firestore)

```bash
pnpm deploy
```

#### Deploy Only Hosting

```bash
pnpm deploy:hosting
```

#### Deploy Only Firestore Rules

```bash
pnpm deploy:firestore
```

#### Manual Steps

```bash
# Build the project
pnpm build

# Deploy to Firebase
firebase deploy
```

### 4. Firestore Security Rules

Your app uses Firestore with authentication. Make sure your `firestore.rules` are properly configured for production:

```javascript
// Current rules in firestore.rules should be reviewed for production
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Make sure rules are secure for production
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. Post-Deployment Checklist

After deployment:

1. **Test Authentication**: Ensure login/logout works
2. **Test Firestore**: Verify data reads/writes function properly
3. **Test Card Sets**: Confirm flashcard data loads correctly
4. **Check Console**: Look for any JavaScript errors in browser console
5. **Verify HTTPS**: Ensure site loads over HTTPS
6. **Test Mobile**: Check responsive design on mobile devices

### 6. Domain Configuration (Optional)

To use a custom domain:

1. In Firebase Console, go to Hosting
2. Click "Add custom domain"
3. Follow the DNS configuration instructions
4. Wait for SSL certificate provisioning

### 7. Continuous Deployment (Optional)

You can set up GitHub Actions for automatic deployment:

1. In Firebase Console, go to Hosting
2. Set up GitHub integration
3. This will create `.github/workflows/firebase-hosting-*.yml` files
4. Commits to main branch will automatically deploy

## Available Scripts

- `pnpm deploy` - Build and deploy everything
- `pnpm deploy:hosting` - Deploy only hosting
- `pnpm deploy:firestore` - Deploy only Firestore rules
- `pnpm firebase:init` - Initialize Firebase (if needed)

## Troubleshooting

### Build Errors

- Ensure all dependencies are installed: `pnpm install`
- Check TypeScript errors: `pnpm check`
- Run tests: `pnpm test:run`

### Firebase Errors

- Verify you're logged in: `firebase login`
- Check project selection: `firebase use --list`
- Switch projects if needed: `firebase use your-project-id`

### Environment Variables

- Make sure `.env` exists and has correct values
- Verify PUBLIC\_ prefix on all client-side variables
- Check Firebase console for correct configuration values

## Production Considerations

1. **Performance**: The build shows some large chunks. Consider code splitting for better performance
2. **Caching**: Firebase Hosting automatically handles caching for static assets
3. **Monitoring**: Set up Firebase Analytics and Performance Monitoring
4. **Security**: Review Firestore rules before production use
5. **Backup**: Set up regular Firestore backups

Your app is now ready for Firebase deployment! 🚀
