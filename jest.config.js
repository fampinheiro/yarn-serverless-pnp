const { readdirSync } = require('fs');
const { resolve } = require('path');

const baseConfig = require('./jest-base.config.js');
const makeDefaultConfig = (parentDir, packageName) => {
  const rootDir = resolve(parentDir, packageName);
  const displayName = `test-${packageName}`;
  const setupFilesAfterEnv = [...(baseConfig.setupFilesAfterEnv || [])];

  const packageTsLibs = require(resolve(rootDir, 'tsconfig.json'))
    .compilerOptions.lib;
  if (
    packageTsLibs &&
    packageTsLibs.some((lib) => lib.toLowerCase() === 'dom')
  ) {
    setupFilesAfterEnv.push(
      require.resolve('./jest/dom-extensions-setup-after-env.js'),
    );
  }
  return {
    ...baseConfig,
    rootDir,
    displayName,
    setupFilesAfterEnv,
  };
};

const packagesDir = resolve(__dirname, 'packages');
const appsDir = resolve(__dirname, 'apps');

const packages = readdirSync(packagesDir);
const apps = readdirSync(appsDir);

const appsWithCustomConfig = [];
const appsWithDefaultConfig = [];
apps.forEach((app) => {
  const appDir = resolve(appsDir, app);
  if (readdirSync(appDir).includes('jest.config.js')) {
    appsWithCustomConfig.push(app);
  } else {
    appsWithDefaultConfig.push(app);
  }
});

const packageTestConfigs = packages.map((package) =>
  makeDefaultConfig(packagesDir, package),
);
const appTestConfigs = appsWithDefaultConfig.map((app) =>
  makeDefaultConfig(appsDir, app),
);
// For apps with a custom config in their directory, we just have to give Jest the path to them
const appPaths = appsWithCustomConfig.map((app) => resolve(appsDir, app));

const lintConfigs = [
  ...packages.map((package) => [packagesDir, package]),
  ...apps.map((app) => [appsDir, app]),
].map(([dir, packageOrApp]) => ({
  rootDir: resolve(dir, packageOrApp),
  runner: require.resolve('jest-runner-eslint'),
  testMatch: ['<rootDir>/src/**/*.{js,jsx,ts,tsx}'],

  modulePathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/coverage/'],

  displayName: `lint-${packageOrApp}`,
}));

module.exports = {
  ...baseConfig,
  projects: [
    ...lintConfigs,
    ...packageTestConfigs,
    ...appTestConfigs,
    ...appPaths,
  ],
  testRegex: '^$', // root project does not have tests itself
};
