const fs = require('fs');
const path = require('path');

// Auto copy SLEC official logo to public/images if it exists in parent or root
try {
  const possibleSources = [
    path.resolve(__dirname, '../SLEC logo.jpeg'),
    path.resolve(__dirname, 'SLEC logo.jpeg'),
  ];
  const destDir = path.resolve(__dirname, 'public/images');
  const destPath = path.resolve(destDir, 'slec-logo.jpeg');

  for (const src of possibleSources) {
    if (fs.existsSync(src)) {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(src, destPath);
      break;
    }
  }
} catch (e) {
  console.warn('Could not auto-copy SLEC logo:', e);
}

/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig

