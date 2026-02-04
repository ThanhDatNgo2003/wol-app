#!/usr/bin/env node

/**
 * Generate PWA icons from PNG source
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

try {
  const sharp = require('sharp');

  const sourceLogo = path.join(__dirname, '../public/onoff-high-resolution-logo.png');
  const publicDir = path.join(__dirname, '../public');

  if (!fs.existsSync(sourceLogo)) {
    console.error('❌ onoff-high-resolution-logo.png not found');
    process.exit(1);
  }

  const sizes = [192, 512];

  console.log('🎨 Generating PWA icons from PNG logo...\n');

  Promise.all(
    sizes.map(size =>
      sharp(sourceLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 102, g: 126, b: 234, alpha: 1 } // #667eea background
        })
        .png()
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
    console.log('\n📲 Ready for PWA installation!');
  }).catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

} catch (err) {
  console.error('❌ sharp package not found. Install it with:');
  console.error('   npm install sharp --save-dev');
  process.exit(1);
}
