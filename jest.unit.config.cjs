module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@umijs/max$': '<rootDir>/tests/unit/umi.cjs',
  },
  transform: { '^.+\\.tsx?$': '<rootDir>/tests/unit/transform.cjs' },
};
