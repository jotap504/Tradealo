export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'test/integration',
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.ts'],
};
