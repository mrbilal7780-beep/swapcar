import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.torque.app",
  appName: "TORQUE",
  webDir: "dist/client",
  server: {
    // L'app charge le site en direct plutôt qu'une copie figée embarquée :
    // les mises à jour de contenu n'ont pas besoin de repasser par une
    // review App Store / Play Store à chaque fois.
    url: "https://swapcar.mr-bilal-7780.workers.dev",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
