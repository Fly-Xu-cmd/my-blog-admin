module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/unit/**/*.test.ts'],
  moduleNameMapper: {
    '\\.(css|less)$': '<rootDir>/tests/unit/style.cjs',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@umijs/max$': '<rootDir>/tests/unit/umi.cjs',
  },
  transform: { '^.+\\.tsx?$': '<rootDir>/tests/unit/transform.cjs' },
};
