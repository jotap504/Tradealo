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
    // Thresholds are added per directory as each module is implemented.
    // The full global threshold will be enforced once all modules have tests.
    './src/config/': { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}
