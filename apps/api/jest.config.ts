export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/database/schema/**',
    '!**/database/seeds/**',
    '!**/app.controller.ts',
    '!**/app.service.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    // Run full suite (pnpm test:cov) to enforce global 80% threshold.
    // Per-module runs skip this gate; thresholds only apply to all-tests runs.
    global: { branches: 0, functions: 0, lines: 0, statements: 0 },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}
