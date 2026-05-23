'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUMP_TYPES = ['patch', 'minor', 'major'];
const bumpType = process.argv[2];

if (!BUMP_TYPES.includes(bumpType)) {
  console.error('Usage: node release.js <patch|minor|major>');
  process.exit(1);
}

const versionPath = path.join(__dirname, 'VERSION');
const parts = fs.readFileSync(versionPath, 'utf8').trim().split('.').map(Number);
if (bumpType === 'patch') parts[2]++;
if (bumpType === 'minor') { parts[1]++; parts[2] = 0; }
if (bumpType === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0; }

const newVersion = parts.join('.');
console.log(`Bumping to v${newVersion}`);

const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
if (status) {
  console.error('Error: uncommitted changes exist. Commit or stash first.');
  process.exit(1);
}

fs.writeFileSync(versionPath, newVersion + '\n', 'utf8');

const adminJsPath = path.join(__dirname, 'admin', 'admin.js');
const adminJs = fs.readFileSync(adminJsPath, 'utf8');
const updatedJs = adminJs.replace(
  /^\/\* eleventy-cms-admin v[\d.]+ \*\/\n/,
  `/* eleventy-cms-admin v${newVersion} */\n`
);
fs.writeFileSync(adminJsPath, updatedJs, 'utf8');

const pkgPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

const run = cmd => { console.log(`> ${cmd}`); execSync(cmd, { stdio: 'inherit' }); };
run('git add VERSION admin/admin.js package.json');
run(`git commit -m "chore: release v${newVersion}"`);
run('git push origin main');

console.log(`\nReleased v${newVersion}.`);
