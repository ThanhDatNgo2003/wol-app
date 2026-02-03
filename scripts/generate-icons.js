#!/usr/bin/env node

/**
 * Generate PWA icons from SVG
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Try to use sharp if available, otherwise use a simple method
try {
  const sharp = require('sharp');

  const svgPath = path.join(__dirname, '../public/icon.svg');
  const publicDir = path.join(__dirname, '../public');

  if (!fs.existsSync(svgPath)) {
    console.error('❌ icon.svg not found');
    process.exit(1);
  }

  const sizes = [192, 512];
  const svgContent = fs.readFileSync(svgPath, 'utf8');

  console.log('🎨 Generating PWA icons...\n');

  Promise.all(
    sizes.map(size =>
      sharp(Buffer.from(svgContent))
        .png()
        .resize(size, size)
        .toFile(path.join(publicDir, `icon-${size}.png`))
        .then(info => {
          console.log(`✅ Generated icon-${size}.png (${info.size} bytes)`);
        })
        .catch(err => {
          console.error(`❌ Error generating icon-${size}.png:`, err.message);
          process.exit(1);
        })
    )
  ).then(() => {
    console.log('\n✨ PWA icons generated successfully!');
    console.log('📦 Files created:');
    console.log('   - public/icon-192.png');
    console.log('   - public/icon-512.png');
  }).catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

} catch (err) {
  console.error('❌ sharp package not found. Install it with:');
  console.error('   npm install sharp --save-dev');
  process.exit(1);
}
