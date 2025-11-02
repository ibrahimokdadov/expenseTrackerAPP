# Version Management Guide

This document describes the version management strategy for ExpenseTrackerApp.

## Semantic Versioning

We use [Semantic Versioning](https://semver.org/) (SemVer) format: `MAJOR.MINOR.PATCH`

- **MAJOR** (X.0.0): Breaking changes, API incompatibilities, major refactoring
- **MINOR** (0.X.0): New features, backward compatible additions
- **PATCH** (0.0.X): Bug fixes, small improvements, backward compatible changes

## Version Sync

The app version is synchronized across multiple files:
- `package.json` - `version` field (single source of truth)
- `android/app/build.gradle` - `versionName` (must match package.json)
- `android/app/build.gradle` - `versionCode` (auto-incremented with each bump)

**Important**: Always use the version bump scripts to maintain version consistency across all files.

## How to Bump Versions

### Using npm scripts (Recommended)

```bash
# For bug fixes and small improvements
npm run version:patch

# For new features (backward compatible)
npm run version:minor

# For breaking changes or major refactoring
npm run version:major
```

### Using the script directly

```bash
# Patch version (0.0.1 -> 0.0.2)
node scripts/bump-version.js patch

# Minor version (0.0.2 -> 0.1.0)
node scripts/bump-version.js minor

# Major version (0.1.0 -> 1.0.0)
node scripts/bump-version.js major
```

## When to Bump Each Version Type

### PATCH (0.0.X) - Bug Fixes
Bump patch version when you make:
- Bug fixes that don't change functionality
- Small UI improvements
- Performance optimizations
- Documentation updates
- Dependency updates (non-breaking)
- Code refactoring without API changes

**Examples:**
- Fix: Loan names showing as "Unknown"
- Fix: Date parsing errors
- Improve: Better error messages
- Optimize: Faster data loading

### MINOR (0.X.0) - New Features
Bump minor version when you add:
- New features that are backward compatible
- New screens or major UI additions
- New functionality that doesn't break existing features
- New API endpoints or services
- Significant improvements to existing features

**Examples:**
- Add: New expense categories
- Add: Chart analytics screen
- Add: Export to CSV functionality
- Add: Dark mode support
- Improve: Enhanced loan management features

### MAJOR (X.0.0) - Breaking Changes
Bump major version when you make:
- Breaking API changes
- Data structure changes that require migrations
- Removing features or functionality
- Major architecture changes
- Incompatible changes to how the app works

**Examples:**
- Change: Database schema migration required
- Remove: Deprecated API endpoints
- Refactor: Complete rewrite of storage system
- Change: Incompatible changes to data format

## Version Code (Android)

The `versionCode` in Android is automatically incremented by 1 each time you bump any version. This is required by Google Play Store and must always increase.

- `versionCode` must be a positive integer
- Each release must have a higher `versionCode` than the previous one
- The script automatically handles this increment

## Workflow Example

```bash
# 1. Make your changes and test them
git checkout -b feature/new-chart-feature
# ... make changes ...

# 2. Commit your changes
git add .
git commit -m "feat: add new expense analytics chart"

# 3. Bump version (minor for new feature)
npm run version:minor

# 4. Review the version changes
git diff package.json android/app/build.gradle

# 5. Commit version bump
git add package.json android/app/build.gradle
git commit -m "chore: bump version to 0.1.0"

# 6. Push and create PR
git push origin feature/new-chart-feature
```

## Current Version

Current version: **0.0.1**

You can check the current version in:
- `package.json` → `version`
- `android/app/build.gradle` → `versionName`

## Version History

All version changes should be documented in:
- Git commit messages
- CHANGELOG.md (if maintained)
- Release notes (for production releases)

## Troubleshooting

### Version Mismatch Error

If you see a version mismatch between `package.json` and `android/app/build.gradle`:

1. Check both files manually
2. Use `npm run version:patch` to sync them (this will bump patch version)
3. Or manually edit both files to match

### Version Bump Script Fails

If the bump script fails:

1. Ensure you're in the project root directory
2. Check that `package.json` and `android/app/build.gradle` exist
3. Verify the files are writable
4. Check for syntax errors in the script: `node scripts/bump-version.js patch`

## Notes

- **Never manually edit versions** - Always use the bump scripts
- **Commit version changes separately** - Makes it easier to track version history
- **Sync before releases** - Ensure versions are synced before building release APK
- **Test after version bump** - Ensure the app still builds and runs correctly

