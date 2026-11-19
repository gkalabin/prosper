import {defineConfig, globalIgnores} from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import importPlugin from 'eslint-plugin-import';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {rules: importPlugin.flatConfigs.recommended.rules},
  prettier,
  globalIgnores(['lib/search/generated', 'lib/grpc/gen']),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {ignoreRestSiblings: true, destructuredArrayIgnorePattern: '^_'},
      ],
      // already covered by typescript https://github.com/import-js/eslint-plugin-import/issues/3135
      'import/named': 'off',
      // TODO: make render functions pure and enable these React Compiler rules.
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/incompatible-library': 'off',
    },
  },
]);
