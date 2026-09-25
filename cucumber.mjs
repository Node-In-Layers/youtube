export default {
  default: {
    paths: ['features/**/*.feature'],
    import: ['features/steps/steps.mjs'],
    publishQuiet: true,
    format: ['progress'],
  },
  integration: {
    paths: ['features/**/*.feature'],
    import: ['features/steps/steps.mjs'],
    publishQuiet: true,
    format: ['progress'],
    tags: '@integration',
  },
}
