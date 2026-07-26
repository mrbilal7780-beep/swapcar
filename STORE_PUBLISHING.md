# Publier TORQUE sur l'App Store et le Play Store

Ce document explique où on en est et ce qu'il reste à faire de ton côté.
Je ne peux pas créer de compte développeur, payer les frais, ni compiler
avec Xcode (il faut un Mac) — ce sont des actions que toi seul peux faire.

## Ce qui est déjà prêt

- Le PWA (`public/manifest.json`) est corrigé et fonctionnel.
- `capacitor.config.ts` : l'app native (iOS + Android) charge le site en
  direct (`https://swapcar.mr-bilal-7780.workers.dev`) au lieu d'une copie
  figée. Ça veut dire que quand tu pushes une modif sur le site, elle
  apparaît direct dans l'app mobile aussi, sans repasser par une review.
- `android/` : projet Android natif scaffoldé (Gradle, Android Studio).
- `ios/` : projet iOS natif scaffoldé (Xcode).

## Ce qu'il te reste à faire

### 1. Android (Google Play) — le plus simple des deux

1. Crée un compte [Google Play Console](https://play.google.com/console) (25$, une seule fois).
2. Installe [Android Studio](https://developer.android.com/studio) (Windows, ça marche très bien).
3. Ouvre le dossier `android/` avec Android Studio (`File > Open`).
4. `Build > Generate Signed Bundle / APK` → choisis **Android App Bundle**.
   Android Studio te propose de créer un keystore (un fichier de clé de
   signature) — **garde ce fichier précieusement et fais-en une sauvegarde**,
   si tu le perds tu ne pourras plus jamais mettre à jour l'app.
5. Sur Google Play Console : crée une fiche d'application, uploade le
   `.aab` généré, remplis la description/captures d'écran/icône, choisis
   la catégorie ("Réseaux sociaux"), remplis le questionnaire de
   confidentialité (l'app utilise Supabase pour stocker email/photos/
   localisation des rassemblements).
6. Soumets pour review (en général quelques heures à 2-3 jours).

### 2. iOS (Apple App Store) — demande un Mac

1. Crée un compte [Apple Developer Program](https://developer.apple.com/programs/) (99$/an, ton propre compte).
2. Il te faut un **Mac** avec Xcode installé (pas de Mac ? tu peux louer un
   Mac dans le cloud — MacStadium, MacinCloud — ou demander à quelqu'un).
3. Ouvre `ios/App/App.xcworkspace` avec Xcode (pas le `.xcodeproj`).
4. Dans Xcode : `Signing & Capabilities` → connecte ton compte Apple
   Developer, choisis ton "Team".
5. `Product > Archive` pour compiler une version de release.
6. Envoie-la vers **App Store Connect** directement depuis Xcode
   (`Distribute App`).
7. Sur [App Store Connect](https://appstoreconnect.apple.com) : crée la
   fiche d'app, description, captures d'écran (obligatoires pour plusieurs
   tailles d'écran), icône 1024x1024, politique de confidentialité (URL
   obligatoire — à héberger quelque part, je peux te rédiger le texte).
8. Soumets pour review. Apple est plus strict que Google : ils peuvent
   rejeter si l'app "ressemble trop à un site web" (règle 4.2). Le fait
   que ce soit une vraie app native avec Capacitor (pas juste un onglet
   Safari) aide, mais prévois une ou deux itérations possibles avec leur
   équipe de review.

## Choses à préparer avant de soumettre (les deux stores)

- **Politique de confidentialité** (obligatoire sur les deux stores) —
  dis-moi et je te rédige un texte adapté à ce que TORQUE collecte
  (email, photos, localisation des événements, messages).
- **Icône** : les icônes par défaut de Capacitor sont encore en place
  dans `android/app/src/main/res/mipmap-*` et
  `ios/App/App/Assets.xcassets/AppIcon.appiconset` — à remplacer par le
  vrai logo TORQUE avant de soumettre (un simple outil comme
  [appicon.co](https://appicon.co) génère toutes les tailles à partir
  d'une seule image).
- **Captures d'écran** : les deux stores en exigent plusieurs par taille
  d'écran. Je peux t'aider à les organiser une fois l'app testée sur un
  vrai appareil/simulateur.

## Pour tester avant de soumettre

```bash
npm run build          # rebuild le site
npx cap sync            # recopie la config vers android/ et ios/
npx cap open android    # ouvre Android Studio
npx cap open ios        # ouvre Xcode (Mac uniquement)
```
