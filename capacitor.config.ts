import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.clarionot.app",
  appName: "ClarioNot",
  webDir: "public",
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? "https://clarionot.com",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
