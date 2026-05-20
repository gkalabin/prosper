import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jest-environment-jsdom',
  moduleDirectories: ['node_modules', '<rootDir>'],
  // Workaround for https://github.com/jestjs/jest/issues/10577 where Jest fails to compare a circular structure.
  detectOpenHandles: true,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
