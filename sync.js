#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const pkgSrc = __dirname;
// When installed as a dependency, __dirname is <project>/node_modules/eleventy-cms-admin
// Walk up two levels to reach the project root
const projectRoot = path.resolve(pkgSrc, '../../');

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log('  ' + path.relative(projectRoot, to));
}

function copyDir(fromDir, toDir) {
  fs.mkdirSync(toDir, { recursive: true });
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const from = path.join(fromDir, entry.name);
    const to = path.join(toDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      copyFile(from, to);
    }
  }
}

console.log('eleventy-cms-admin: syncing to ' + projectRoot);
copyDir(path.join(pkgSrc, 'admin'), path.join(projectRoot, 'admin'));
copyFile(
  path.join(pkgSrc, 'functions', 'github-proxy.js'),
  path.join(projectRoot, 'netlify', 'functions', 'github-proxy.js')
);
console.log('done.');
