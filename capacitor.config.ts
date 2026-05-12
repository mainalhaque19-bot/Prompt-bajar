import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.promptbajar.app',
  appName: 'Prompt Bajar',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
