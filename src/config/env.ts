// Environment configuration
// This file provides a centralized place for environment variables

interface Config {
  GOOGLE_WEB_CLIENT_ID: string;
  GOOGLE_TEST_EMAIL?: string;
}

const config: Config = {
  // Replace this with your actual Web Client ID from Google Cloud Console
  GOOGLE_WEB_CLIENT_ID: '866774020961-aiddoqbqr0qs9mjpr25p0p093upv644l.apps.googleusercontent.com',

  // Optional: For testing
  GOOGLE_TEST_EMAIL: undefined,
};

export default config;