# GitHub Explorer

React Native CLI app for exploring public GitHub organizations (Tech Lead home assignment).

Work in progress — see [docs/DESIGN.md](docs/DESIGN.md) for the design and milestones.

## Setup

```
npm install
cd ios && bundle install && bundle exec pod install && cd ..   # iOS only, macOS + Xcode required
```

## Run

```
npm start           # Metro bundler
npm run ios         # iOS simulator
npm run android     # Android emulator
```

## Checks

```
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # Jest
```
