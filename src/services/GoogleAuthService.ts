import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  statusCodes,
  User,
} from '@react-native-google-signin/google-signin';
import config from '../config/env';

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
      GoogleSignin.configure({
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
        webClientId: config.GOOGLE_WEB_CLIENT_ID, // From Google Console
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });
      this.isConfigured = true;
    } catch (error) {
      console.error('Failed to configure Google Sign-In:', error);
      throw error;
    }
  }

  async signIn(): Promise<UserProfile> {
    try {
      await this.configure();

      // Check if already signed in
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        const userInfo = await GoogleSignin.signInSilently();
        return this.processUserInfo(userInfo);
      }

      // Prompt for sign in
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();

      const profile = await this.processUserInfo(userInfo);
      profile.accessToken = tokens.accessToken;

      // Store user data
      await this.saveUserProfile(profile);

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
    try {
      await this.configure();
      const userInfo = await GoogleSignin.signInSilently();
      const profile = await this.processUserInfo(userInfo);
      await this.saveUserProfile(profile);
      return profile;
    } catch (error) {
      console.log('Silent sign in failed:', error);
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
    try {
      await this.configure();

      // Check if signed in
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (!isSignedIn) return null;

      // Get fresh tokens
      const tokens = await GoogleSignin.getTokens();
      return tokens.accessToken;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  async isSignedIn(): Promise<boolean> {
    try {
      await this.configure();
      return await GoogleSignin.isSignedIn();
    } catch (error) {
      console.error('Failed to check sign in status:', error);
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