# Google AdMob Integration - Setup & Compliance Guide

## Overview
This mobile app includes a professional Google AdMob integration that fully complies with Google's AdMob policies.

## Features Implemented

### ✅ 1. GDPR/CCPA Consent Management
- **Automatic consent request** on first launch
- **Consent form** for users in EEA/UK regions
- **User privacy controls** in settings
- Located in: `src/services/admob.ts`

### ✅ 2. Banner Ads
- **Non-intrusive placement** between content sections
- **Proper spacing** to avoid accidental clicks
- **Responsive sizing** (BANNER, MEDIUM_RECTANGLE)
- **Error handling** - fails gracefully without breaking UI
- Located in: `src/components/ads/BannerAd.tsx`

### ✅ 3. Interstitial Ads
- **Time-based frequency capping** (minimum 60 seconds between ads)
- **Natural transitions** - shown when user navigates away from content
- **Non-blocking** - doesn't interrupt user actions
- **Preloading** for smooth user experience
- Located in: `src/services/interstitialAd.ts`

### ✅ 4. Policy Compliance

#### Content Policy ✓
- Ads are **clearly separated** from content
- No ads on **error screens** or **empty states**
- No ads on **authentication screens**

#### Placement Policy ✓
- Ads don't **obstruct navigation**
- Ads don't **cover content**
- Proper spacing around all ads
- Ads are clearly distinguishable from content

#### User Experience Policy ✓
- **No accidental clicks** - proper spacing and sizing
- **Frequency capping** - not too many ads
- **Non-intrusive** - doesn't disrupt user flow
- **Smooth loading** - preloading and error handling

#### Privacy Policy ✓
- **GDPR/CCPA compliance** via consent management
- **User control** over ad personalization
- **Transparent** - users can see and manage consent

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **For development builds (requires Expo Dev Client):**
   ```bash
   npx expo prebuild
   npx expo run:android
   # or
   npx expo run:ios
   ```

3. **For production builds:**
   ```bash
   eas build --platform android
   eas build --platform ios
   ```

## Configuration

### Test vs Production Mode

The app automatically uses **test ads** in development mode (`__DEV__ = true`).

#### Current Ad IDs (Test Mode)
Located in `.env`:
- `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID` - Test ID
- `EXPO_PUBLIC_ADMOB_IOS_APP_ID` - Test ID
- `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID` - Test ID
- `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID` - Test ID
- `EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID` - Test ID
- `EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID` - Test ID

### ⚠️ IMPORTANT: Before Publishing to Production

**YOU MUST** replace test ad unit IDs with your real AdMob IDs:

1. Go to [Google AdMob Console](https://admob.google.com)
2. Create an app in AdMob
3. Create ad units (Banner and Interstitial)
4. Update `.env` with your real IDs:

```env
# Replace these with your actual AdMob IDs
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_IOS_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
```

5. Update `app.json` with your real App IDs:

```json
{
  "expo": {
    "android": {
      "googleMobileAdsAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
    },
    "ios": {
      "googleMobileAdsAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
    },
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
          "iosAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
        }
      ]
    ]
  }
}
```

## Testing

### Test Ads in Development
The app uses Google's official test ad unit IDs in development mode. You'll see:
- Banner ads with "Test Ad" label
- Interstitial ads with test content

### Testing Consent Flow

1. **Reset consent (development only):**
   ```javascript
   import { adMobService } from '@/services/admob';
   await adMobService.resetConsent();
   ```

2. **Force EEA geography for testing:**
   The app automatically sets debug geography to EEA in development mode to test the consent flow.

### Manual Testing Checklist

- [ ] Banner ads load correctly on HomeScreen
- [ ] Banner ads load on ArticleDetailsScreen
- [ ] Banner ads load on PostDetailsScreen
- [ ] Ads don't obstruct content or navigation
- [ ] Ads have proper spacing
- [ ] Interstitial ads show when leaving content screens
- [ ] Interstitial ads respect 60-second frequency cap
- [ ] Consent form appears on first launch
- [ ] App works properly when ad fails to load
- [ ] App works on both Android and iOS

## Ad Placements

### HomeScreen
- **Banner ad** after categories section
- **Medium Rectangle ad** between lessons and posts

### ArticleDetailsScreen
- **Medium Rectangle ad** after article content, before files

### PostDetailsScreen
- **Medium Rectangle ad** after post content

### Interstitial Ads
- Shown when user navigates away from:
  - ArticleDetailsScreen
  - PostDetailsScreen
- Minimum 60 seconds between shows
- Preloaded for smooth experience

## Policy Compliance Checklist

### ✅ Before Submitting to App Stores

- [ ] Replace test ad IDs with real production ad IDs
- [ ] Add Privacy Policy URL to app stores
- [ ] Ensure app has privacy policy accessible within the app
- [ ] Test consent flow on real devices
- [ ] Verify ads load correctly in production build
- [ ] Test on multiple devices and screen sizes
- [ ] Ensure RTL layout works correctly with ads (Arabic support)
- [ ] Review Google AdMob policies: https://support.google.com/admob/answer/6128543

### AdMob Policy Requirements Met

1. **Ad Placement** ✓
   - Ads clearly separated from content
   - No ads near clickable buttons
   - Proper spacing to avoid accidental clicks

2. **User Experience** ✓
   - Ads don't obstruct content
   - Frequency capping implemented
   - Smooth loading with error handling

3. **Privacy** ✓
   - GDPR/CCPA consent implemented
   - User can manage consent
   - Privacy controls accessible

4. **Content** ✓
   - No ads on error screens
   - No ads on empty screens
   - No ads on auth screens

## Troubleshooting

### Ads not showing in development
- Make sure you've run `npx expo prebuild` and are using Expo Dev Client
- Check console logs for "[AdMob]" messages
- Ensure you're using test ad IDs in development

### "AdMob SDK not initialized" error
- Check that `adMobService.initialize()` is called in `App.tsx`
- Ensure it's called after locale is ready

### Consent form not appearing
- In development, debug geography is set to EEA automatically
- In production, it only shows for users in regions requiring consent
- Use `adMobService.resetConsent()` to test again

### TypeScript errors
- Run `npm install` to ensure all dependencies are installed
- Make sure `react-native-google-mobile-ads` is properly installed

## Resources

- [Google AdMob Policies](https://support.google.com/admob/answer/6128543)
- [AdMob Privacy & Messaging](https://support.google.com/admob/answer/10113005)
- [React Native Google Mobile Ads](https://docs.page/invertase/react-native-google-mobile-ads)
- [Expo AdMob Setup](https://docs.expo.dev/versions/latest/sdk/admob/)

## Support

For issues related to:
- **AdMob setup**: Contact AdMob support
- **App implementation**: Check the code in `src/services/admob.ts` and `src/components/ads/`
- **Policy compliance**: Review [AdMob policies](https://support.google.com/admob/answer/6128543)
