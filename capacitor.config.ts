import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.torque.app",
  appName: "TORQUE",
  webDir: "dist/client",
  server: {
    // L'app charge le site en direct plutôt qu'une copie figée embarquée :
    // les mises à jour de contenu n'ont pas besoin de repasser par une
    // review App Store / Play Store à chaque fois.
    // On pointe direct sur /login (pas "/") : la page vitrine ne sert qu'au
    // web, quelqu'un qui a deja installe l'app n'a pas besoin qu'on lui
    // revende TORQUE, il doit tomber direct sur connexion/app.
    url: "https://swapcar.mr-bilal-7780.workers.dev/login",
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
