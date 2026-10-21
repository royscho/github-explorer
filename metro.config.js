const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withRozenite } = require('@rozenite/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {};

// Serves installed Rozenite plugin panels (the TanStack Query and Zustand inspectors) into React
// Native DevTools. No explicit `enabled` here, deliberately — `@rozenite/metro`'s own default
// skips itself entirely during a release bundle by checking the actual invoking command
// (`node_modules/@rozenite/metro/dist/index.cjs`'s `isBundling`: the `bundle`/`export` CLI
// subcommand, including the exact `scripts/bundle.js` path Xcode/Gradle invoke for a real release
// build), which `process.env.NODE_ENV` can't do here — `metro.config.js` is `require`d (evaluating
// any `enabled` expression) *before* the CLI sets `NODE_ENV` for the build
// (`@react-native/community-cli-plugin`'s `buildBundle.js`: `loadMetroConfig` on line 22, then
// `process.env.NODE_ENV = ...` only on line 42), so an explicit `NODE_ENV`-based `enabled` value
// is always stale at the moment it's read and wrongly evaluates to "on" for a release build.
// Passing `enabled` explicitly also skips that default check outright, so the safest choice is to
// pass nothing and accept the one-time console warning this version prints as a result (dev-server
// output only, never shipped). Each plugin's own hook is additionally a no-op when `NODE_ENV` is
// `'production'` at app runtime (a different, later point than this file's own evaluation), so the
// in-app wiring has no production effect regardless of this file.
module.exports = withRozenite(mergeConfig(getDefaultConfig(__dirname), config));
