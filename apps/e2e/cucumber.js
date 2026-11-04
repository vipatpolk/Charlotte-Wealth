const common = {
  paths: ['features/**/*.feature'],
  require: [
    'features/support/**/*.ts',
    'features/step_definitions/**/*.ts',
  ],
  requireModule: ['ts-node/register'],
  format: [
    '@serenity-js/cucumber',
    ['html', 'target/cucumber-report.html'],
  ],
  formatOptions: {
    specDirectory: 'features',
  },
};

module.exports = {
  default: {
    ...common,
  },
  web: {
    ...common,
    tags: '@web',
  },
  api: {
    ...common,
    tags: '@api',
  },
  mobile: {
    ...common,
    tags: '@mobile',
  },
  smoke: {
    ...common,
    tags: '@smoke',
  },
  regression: {
    ...common,
    tags: '@regression',
  },
};
