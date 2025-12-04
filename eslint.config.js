const pluginImport = require('eslint-plugin-import');
const pluginPrettier = require('eslint-plugin-prettier');

module.exports = [
  {
    ignores: ['node_modules/', '.webpack/', 'out/', 'dist/', 'coverage/']
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        MAIN_WINDOW_WEBPACK_ENTRY: 'readonly',
        MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: 'readonly'
      }
    },
    plugins: {
      import: pluginImport,
      prettier: pluginPrettier
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-console': 'off',
      'prettier/prettier': 'warn'
    }
  }
];