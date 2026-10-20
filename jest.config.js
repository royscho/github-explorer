module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: [
    require.resolve('@react-native/jest-preset/jest/setup.js'),
    '<rootDir>/jest.setup.js',
  ],
  transformIgnorePatterns: [
    // `immer`'s "react-native" export condition (matched by this preset, same as Metro) points to
    // its ESM build, which Jest can't require unless it's transformed like the RN-ecosystem
    // packages above.
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|@shopify/flash-list|@react-native-vector-icons|immer)/)',
  ],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '\\.(ttf|otf)$': '<rootDir>/jest/fontMock.js',
  },
};
