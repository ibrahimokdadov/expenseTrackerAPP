// Environment configuration
// This file provides a centralized place for environment variables

interface Config {
  GOOGLE_WEB_CLIENT_ID: string;
  GOOGLE_TEST_EMAIL?: string;
}

const config: Config = {
  // Replace this with your actual Web Client ID from Google Cloud Console
  GOOGLE_WEB_CLIENT_ID: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',

  // Optional: For testing
  GOOGLE_TEST_EMAIL: undefined,
};

export default config;