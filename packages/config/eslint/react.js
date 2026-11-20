import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import base from './base.js';

/** ESLint flat config for React apps: the shared base plus React hooks rules. */
export default [
  ...base,
  reactHooks.configs.flat['recommended-latest'],
  {
    languageOptions: {
      globals: globals.browser,
    },
  },
];
