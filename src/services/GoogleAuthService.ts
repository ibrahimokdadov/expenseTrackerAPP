import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  statusCodes,
  User,
} from '@react-native-google-signin/google-signin';
// import config from '../config/env';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  photo: string | null;
  accessToken: string;
  idToken: string;
  serverAuthCode: string | null;
}

class GoogleAuthService {
  private static instance: GoogleAuthService;
  private currentUser: UserProfile | null = null;
  private isConfigured = false;
  private authInProgress = false;
  private tokenPromise: Promise<string | null> | null = null;
  private signInSilentlyPromise: Promise<UserProfile | null> | null = null;

  private constructor() {}

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  async configure() {
    if (this.isConfigured) return;

    try {
      // Check if GoogleSignin is available
      if (!GoogleSignin || typeof GoogleSignin.configure !== 'function') {
        console.warn('[GoogleAuth] GoogleSignin not available - native module not linked');
        return;
      }

      const WEB_CLIENT_ID = '866774020961-aiddoqbqr0qs9mjpr25p0p093upv644l.apps.googleusercontent.com';
      console.log('[GoogleAuth] Configuring with Web Client ID:', WEB_CLIENT_ID);

      GoogleSignin.configure({
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
        webClientId: WEB_CLIENT_ID, // From Google Console
        offlineAccess: true,
        forceCodeForRefreshToken: true,
        prompt: 'select_account',
      });

      this.isConfigured = true;
      console.log('[GoogleAuth] Configuration successful');
    } catch (error: any) {
      console.error('[GoogleAuth] Failed to configure:', error);
      console.error('[GoogleAuth] Error details:', error.message, error.code);
      // Don't throw, just log the error
    }
  }

  async signIn(): Promise<UserProfile> {
    try {
      console.log('[GoogleAuth] Starting sign in process...');
      await this.configure();

      // Check if already signed in
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        console.log('[GoogleAuth] User already signed in, using silent sign in');
        // Use our wrapped signInSilently method to avoid conflicts
        const profile = await this.signInSilently();
        if (profile) {
          return profile;
        }
        // If silent sign-in failed, continue to regular sign-in
        console.log('[GoogleAuth] Silent sign-in failed, proceeding to regular sign-in');
      }

      // Check Play Services
      console.log('[GoogleAuth] Checking Play Services...');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Prompt for sign in
      console.log('[GoogleAuth] Prompting for sign in...');
      const userInfo = await GoogleSignin.signIn();
      console.log('[GoogleAuth] Sign in successful');
      console.log('[GoogleAuth] UserInfo:', JSON.stringify({
        id: userInfo.user.id,
        email: userInfo.user.email,
        idToken: userInfo.idToken ? 'present' : 'missing',
        serverAuthCode: userInfo.serverAuthCode ? 'present' : 'missing',
      }));

      console.log('[GoogleAuth] Getting tokens...');
      let tokens;
      try {
        tokens = await GoogleSignin.getTokens();
        console.log('[GoogleAuth] Tokens retrieved:', {
          accessToken: tokens.accessToken ? 'present' : 'missing',
          idToken: tokens.idToken ? 'present' : 'missing',
        });
      } catch (tokenError) {
        console.error('[GoogleAuth] Failed to get tokens:', tokenError);
        tokens = { accessToken: '', idToken: userInfo.idToken || '' };
      }

      const profile = await this.processUserInfo(userInfo);
      profile.accessToken = tokens.accessToken;

      // Store user data
      await this.saveUserProfile(profile);
      console.log('[GoogleAuth] Profile saved successfully');

      return profile;
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Sign in cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Sign in already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Play services not available');
      } else {
        console.error('Sign in error:', error);
        throw error;
      }
    }
  }

  async signInSilently(): Promise<UserProfile | null> {
    // If a silent sign-in is already in progress, return the existing promise
    if (this.signInSilentlyPromise) {
      console.log('[GoogleAuth] Silent sign-in already in progress, waiting for existing promise');
      return await this.signInSilentlyPromise;
    }

    // Create new promise for this sign-in attempt
    this.signInSilentlyPromise = this._signInSilentlyInternal();

    try {
      const result = await this.signInSilentlyPromise;
      return result;
    } finally {
      // Clear the promise after completion
      this.signInSilentlyPromise = null;
    }
  }

  private async _signInSilentlyInternal(): Promise<UserProfile | null> {
    try {
      console.log('[GoogleAuth] Starting silent sign-in...');
      await this.configure();
      const userInfo = await GoogleSignin.signInSilently();
      const tokens = await GoogleSignin.getTokens();
      const profile = await this.processUserInfo(userInfo);
      profile.accessToken = tokens.accessToken;
      await this.saveUserProfile(profile);
      console.log('[GoogleAuth] Silent sign-in successful');
      return profile;
    } catch (error) {
      console.log('[GoogleAuth] Silent sign in failed:', error);
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
      await AsyncStorage.removeItem('@google_user_profile');
      this.currentUser = null;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async revokeAccess(): Promise<void> {
    try {
      await GoogleSignin.revokeAccess();
      await this.signOut();
    } catch (error) {
      console.error('Revoke access error:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    if (this.currentUser) return this.currentUser;

    try {
      const savedProfile = await AsyncStorage.getItem('@google_user_profile');
      if (savedProfile) {
        this.currentUser = JSON.parse(savedProfile);
        return this.currentUser;
      }
      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  async getAccessToken(): Promise<string | null> {
    // If a token request is already in progress, wait for it
    if (this.tokenPromise) {
      console.log('[GoogleAuth] Token request already in progress, waiting...');
      return await this.tokenPromise;
    }

    // Create a new token promise
    this.tokenPromise = this._getAccessTokenInternal();

    try {
      const token = await this.tokenPromise;
      return token;
    } finally {
      // Clear the promise when done
      this.tokenPromise = null;
    }
  }

  private async _getAccessTokenInternal(): Promise<string | null> {
    try {
      await this.configure();

      // Check if signed in
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (!isSignedIn) {
        console.log('[GoogleAuth] Not signed in, cannot get access token');
        return null;
      }

      // Always try to get fresh tokens first
      try {
        console.log('[GoogleAuth] Attempting to get fresh tokens...');
        const tokens = await GoogleSignin.getTokens();
        console.log('[GoogleAuth] Got tokens:', {
          hasAccessToken: !!tokens.accessToken,
          hasIdToken: !!tokens.idToken,
          accessTokenLength: tokens.accessToken?.length || 0,
        });

        if (tokens.accessToken) {
          // Update stored profile with new token
          const currentUser = await this.getCurrentUser();
          if (currentUser) {
            currentUser.accessToken = tokens.accessToken;
            await this.saveUserProfile(currentUser);
          }
          return tokens.accessToken;
        }
      } catch (tokenError: any) {
        console.log('[GoogleAuth] getTokens failed:', tokenError);
        console.log('[GoogleAuth] Error details:', tokenError.message, tokenError.code);

        // Try refreshing through our safe signInSilently method
        console.log('[GoogleAuth] Attempting to refresh tokens via signInSilently...');
        const profile = await this.signInSilently();
        if (profile && profile.accessToken) {
          console.log('[GoogleAuth] Got new access token after silent sign-in');
          return profile.accessToken;
        }
      }

      // Last resort: check stored token
      const user = await this.getCurrentUser();
      if (user && user.accessToken) {
        console.warn('[GoogleAuth] Using potentially stale stored access token');
        return user.accessToken;
      }

      console.error('[GoogleAuth] No tokens available - user may need to sign in again');
      return null;
    } catch (error) {
      console.error('[GoogleAuth] Failed to get access token:', error);
      return null;
    }
  }

  async isSignedIn(): Promise<boolean> {
    try {
      // Check if GoogleSignin is available
      if (!GoogleSignin || typeof GoogleSignin.isSignedIn !== 'function') {
        console.warn('[GoogleAuth] GoogleSignin not available or not linked properly');
        return false;
      }

      await this.configure();
      const signedIn = await GoogleSignin.isSignedIn();
      console.log('[GoogleAuth] Is signed in:', signedIn);
      return signedIn;
    } catch (error: any) {
      console.error('[GoogleAuth] Failed to check sign in status:', error);
      console.error('[GoogleAuth] Error code:', error.code);
      console.error('[GoogleAuth] Error message:', error.message);
      return false;
    }
  }

  private async processUserInfo(userInfo: User): Promise<UserProfile> {
    const profile: UserProfile = {
      id: userInfo.user.id,
      email: userInfo.user.email,
      name: userInfo.user.name || userInfo.user.email,
      photo: userInfo.user.photo,
      accessToken: '',
      idToken: userInfo.idToken || '',
      serverAuthCode: userInfo.serverAuthCode,
    };

    this.currentUser = profile;
    return profile;
  }

  private async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem('@google_user_profile', JSON.stringify(profile));
    } catch (error) {
      console.error('Failed to save user profile:', error);
    }
  }

  async refreshTokens(): Promise<void> {
    try {
      await this.configure();

      // Force a token refresh
      await GoogleSignin.clearCachedAccessToken();
      const tokens = await GoogleSignin.getTokens();

      if (this.currentUser) {
        this.currentUser.accessToken = tokens.accessToken;
        await this.saveUserProfile(this.currentUser);
      }
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      throw error;
    }
  }
}

export default GoogleAuthService.getInstance();