/* import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config"; */

// export default defineConfig([
//   { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser,...globals.node, } },
//   { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
// ]);

import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser, // pour le front
        ...globals.node,    // pour le back (process, __dirname, etc.)
      },
    },
  },
  {
    files: ["**/*.js"],
    languageOptions: { sourceType: "commonjs" },
  },
]);

