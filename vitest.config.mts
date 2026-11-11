import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['lib/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'app/api/**/*.ts', 'app/login/page.tsx', 'app/register/page.tsx'],
      exclude: ['**/*.d.ts'],
      thresholds: {
        'lib/theme.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'components/ThemeProvider.tsx': { statements: 100, branches: 85, functions: 85, lines: 100 },
        'app/api/auth/register/route.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
      },
    },
  },
});
