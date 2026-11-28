import react from '@school-mgmt/config/eslint/react';

export default [
  // Written by the router plugin.
  { ignores: ['src/routeTree.gen.ts'] },
  ...react,
  {
    files: ['src/routes/**/*.{ts,tsx}'],
    rules: {
      // TanStack Router's `redirect()` is meant to be thrown.
      '@typescript-eslint/only-throw-error': [
        'error',
        { allow: [{ from: 'package', name: 'Redirect', package: '@tanstack/router-core' }] },
      ],
    },
  },
];
