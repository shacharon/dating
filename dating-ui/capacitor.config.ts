import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dating.app',
  appName: 'Dating',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
