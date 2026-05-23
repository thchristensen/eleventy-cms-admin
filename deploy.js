'use strict';
const fs = require('fs');
const path = require('path');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node deploy.js <path-to-project>');
  console.error('Example: node deploy.js ../my-client-site');
  process.exit(1);
}

const targetRoot = path.resolve(target);
if (!fs.existsSync(targetRoot)) {
  console.error(`Error: target path does not exist: ${targetRoot}`);
  process.exit(1);
}

const version = fs.readFileSync(path.join(__dirname, 'VERSION'), 'utf8').trim();

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log('  ' + path.relative(targetRoot, to));
}

function copyDir(fromDir, toDir) {
  fs.mkdirSync(toDir, { recursive: true });
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const from = path.join(fromDir, entry.name);
    const to = path.join(toDir, entry.name);
    entry.isDirectory() ? copyDir(from, to) : copyFile(from, to);
  }
}

console.log(`Deploying eleventy-cms-admin v${version} to ${targetRoot}`);
copyDir(path.join(__dirname, 'admin'), path.join(targetRoot, 'admin'));
copyFile(
  path.join(__dirname, 'functions', 'github-proxy.js'),
  path.join(targetRoot, 'netlify', 'functions', 'github-proxy.js')
);
console.log('Done.');
