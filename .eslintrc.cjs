module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  ignorePatterns: ['dist', 'node_modules'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['react-refresh'],
  rules: {
    'react/prop-types': 'off',
    'react-refresh/only-export-components': 'off',
    'no-unused-vars': ['error', { 'varsIgnorePattern': '^React$', 'argsIgnorePattern': '^_' }],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
