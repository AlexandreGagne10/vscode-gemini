// Structure du projet
/**
 * vscode-gemini/
 * ├── .vscode/            // Configuration VS Code
 * │   ├── launch.json     // Configuration de débogage
 * │   └── tasks.json      // Tâches VS Code
 * ├── media/              // Ressources statiques
 * │   ├── gemini-icon.svg // Icône de l'extension
 * │   └── styles.css      // Styles CSS pour le webview
 * ├── src/
 * │   ├── api/            // Intégration API
 * │   │   └── geminiApi.ts // Service d'API Gemini
 * │   ├── extension.ts    // Point d'entrée de l'extension
 * │   ├── providers/      // Fournisseurs de services
 * │   │   ├── aiProvider.ts      // Abstraction des modèles d'IA
 * │   │   ├── errorDetector.ts   // Détection d'erreurs
 * │   │   └── fileManager.ts     // Gestion des fichiers
 * │   ├── ui/             // Interface utilisateur
 * │   │   ├── sidebar.ts  // Vue de la barre latérale
 * │   │   └── webview.ts  // Contenu du webview
 * │   └── utils/          // Utilitaires
 * │       └── helpers.ts  // Fonctions utilitaires
 * ├── package.json        // Manifeste de l'extension
 * ├── tsconfig.json       // Configuration TypeScript
 * ├── webpack.config.js   // Configuration du bundler
 * └── README.md           // Documentation
 */