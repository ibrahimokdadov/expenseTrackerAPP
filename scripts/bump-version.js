#!/usr/bin/env node

/**
 * Version Bump Script for ExpenseTrackerApp
 * 
 * Automatically bumps version in package.json and Android build.gradle
 * based on semantic versioning (major.minor.patch)
 * 
 * Usage:
 *   node scripts/bump-version.js [major|minor|patch]
 * 
 * Examples:
 *   node scripts/bump-version.js patch   # 0.0.1 -> 0.0.2
 *   node scripts/bump-version.js minor    # 0.0.2 -> 0.1.0
 *   node scripts/bump-version.js major   # 0.1.0 -> 1.0.0
 */

const fs = require('fs');
const path = require('path');

const VERSION_TYPE = process.argv[2];

if (!VERSION_TYPE || !['major', 'minor', 'patch'].includes(VERSION_TYPE)) {
  console.error('Usage: node scripts/bump-version.js [major|minor|patch]');
  process.exit(1);
}

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');
const ANDROID_BUILD_GRADLE_PATH = path.join(ROOT_DIR, 'android', 'app', 'build.gradle');

/**
 * Parse version string into components
 */
function parseVersion(version) {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
    original: version
  };
}

/**
 * Bump version based on type
 */
function bumpVersion(version, type) {
  const parsed = parseVersion(version);
  
  switch (type) {
    case 'major':
      parsed.major += 1;
      parsed.minor = 0;
      parsed.patch = 0;
      break;
    case 'minor':
      parsed.minor += 1;
      parsed.patch = 0;
      break;
    case 'patch':
      parsed.patch += 1;
      break;
  }
  
  return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}

/**
 * Read and parse package.json
 */
function readPackageJson() {
  try {
    const content = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading package.json:', error.message);
    process.exit(1);
  }
}

/**
 * Write package.json
 */
function writePackageJson(data) {
  try {
    const content = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(PACKAGE_JSON_PATH, content, 'utf8');
  } catch (error) {
    console.error('Error writing package.json:', error.message);
    process.exit(1);
  }
}

/**
 * Read Android build.gradle
 */
function readBuildGradle() {
  try {
    return fs.readFileSync(ANDROID_BUILD_GRADLE_PATH, 'utf8');
  } catch (error) {
    console.error('Error reading android/app/build.gradle:', error.message);
    process.exit(1);
  }
}

/**
 * Write Android build.gradle
 */
function writeBuildGradle(content) {
  try {
    fs.writeFileSync(ANDROID_BUILD_GRADLE_PATH, content, 'utf8');
  } catch (error) {
    console.error('Error writing android/app/build.gradle:', error.message);
    process.exit(1);
  }
}

/**
 * Extract current versionCode from build.gradle
 */
function getCurrentVersionCode(content) {
  const match = content.match(/versionCode\s+(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Update version in Android build.gradle
 */
function updateBuildGradleVersion(content, newVersion, newVersionCode) {
  // Update versionName
  content = content.replace(
    /versionName\s+"[^"]+"/,
    `versionName "${newVersion}"`
  );
  
  // Update versionCode
  content = content.replace(
    /versionCode\s+\d+/,
    `versionCode ${newVersionCode}`
  );
  
  return content;
}

// Main execution
console.log(`Bumping ${VERSION_TYPE} version...\n`);

// Update package.json
const packageJson = readPackageJson();
const currentVersion = packageJson.version;
const newVersion = bumpVersion(currentVersion, VERSION_TYPE);

console.log(`package.json: ${currentVersion} -> ${newVersion}`);
packageJson.version = newVersion;
writePackageJson(packageJson);

// Update Android build.gradle
const buildGradleContent = readBuildGradle();
const currentVersionCode = getCurrentVersionCode(buildGradleContent);
const newVersionCode = currentVersionCode + 1;

console.log(`Android versionName: ${currentVersion} -> ${newVersion}`);
console.log(`Android versionCode: ${currentVersionCode} -> ${newVersionCode}`);

const updatedBuildGradle = updateBuildGradleVersion(
  buildGradleContent,
  newVersion,
  newVersionCode
);
writeBuildGradle(updatedBuildGradle);

console.log('\n✅ Version bump completed successfully!');
console.log(`\nNew version: ${newVersion}`);
console.log(`New versionCode: ${newVersionCode}`);
console.log('\nNext steps:');
console.log('1. Review the changes in package.json and android/app/build.gradle');
console.log('2. Commit the version bump: git add package.json android/app/build.gradle');
console.log(`3. Commit: git commit -m "chore: bump version to ${newVersion}"`);

