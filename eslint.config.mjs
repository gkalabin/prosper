import { defineConfig } from "eslint/config";
import nextConfig from "eslint-config-next";
import prettier from "eslint-config-prettier";

export default defineConfig([
  ...nextConfig,
  prettier,
  {
    ignores: ["src/lib/search/generated"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          ignoreRestSiblings: true,
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
]);
