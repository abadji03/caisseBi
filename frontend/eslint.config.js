// eslint.config.js ou eslint.config.mjs
import storybook from "eslint-plugin-storybook";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import angular from "angular-eslint";

export default tseslint.config(
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
      // Garde-fou contre le bruit de debug en production (audit chantier 3 & 7).
      // Les logs warn/error restent autorisés (gestion d'erreurs, à migrer vers ngx-logger).
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          vars: "all",             // Vérifie toutes les variables
          args: "after-used",      // Ignore les arguments utilisés
          ignoreRestSiblings: true, // Ignore le reste des propriétés déstructurées
          varsIgnorePattern: "^_",  // Ignore variables commençant par "_"
          argsIgnorePattern: "^_",  // Ignore args commençant par "_"
        },
      ],
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  }
);
