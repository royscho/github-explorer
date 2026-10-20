module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['coverage/', 'vendor/', 'ios/', 'android/'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
  },
};
