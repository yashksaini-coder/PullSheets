import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'design-reference/**', 'drizzle/**', 'next-env.d.ts', '.superpowers/**', '.remember/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['components/cards/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['next', 'next/*', '@/lib/*', '@/components/ui*', '@/components/editor/*'], message: 'components/cards must stay pure: props in, JSX out. It renders in the browser and in Remotion.' }] }],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'fetch', 'location'],
    },
  },
];

export default config;
